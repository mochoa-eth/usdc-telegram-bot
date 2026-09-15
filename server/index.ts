/**
 * Telegram USDC Bot — Express backend
 *
 * The bot uses long-polling (no webhook needed) — just set TELEGRAM_BOT_TOKEN and start.
 *
 * Routes:
 *   GET  /api/wallets  — Admin dashboard: wallet list
 *   GET  /api/txlog    — Admin dashboard: transaction log
 *   GET  /api/status   — Bot health / config check
 */

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { startPolling, sendMessage, chatKey, displayName, type TgMessage } from './telegram.js'
import { parseCommand, HELP_TEXT } from './commands.js'
import { getOrCreateWallet, getBalance, transferUsdc, waitForTransaction } from './circle.js'
import { getWallet, setUsernameAlias, listWallets } from './wallets.js'
import { appendTx, updateTxState, listTx, type TxEntry } from './txlog.js'
import { v4 as uuidv4 } from 'uuid'

// ─── Telegram bot (lazy start — admin API works without the token) ────────────
function startBot() {
  try {
    startPolling(handleTelegramMessage)
  } catch (err) {
    console.warn('[bot] Telegram bot not started:', (err as Error).message)
    console.warn('[bot] Add TELEGRAM_BOT_TOKEN to .env and restart to enable the bot.')
  }
}

startBot()

async function handleTelegramMessage(msg: TgMessage) {
  const text = msg.text?.trim()
  if (!text) return

  const chatId = msg.chat.id
  const key = chatKey(chatId)
  const name = displayName(msg)

  console.log(`[bot] ${name} (${key}): ${text}`)

  // Register/update the sender's wallet entry and username alias
  const senderWallet = await getOrCreateWalletForUser(chatId, name, msg.from?.username)

  const command = parseCommand(text)

  switch (command.type) {
    case 'help':
    case 'unknown': {
      await sendMessage(chatId, command.type === 'unknown'
        ? `I didn't understand that.\n\n${HELP_TEXT}`
        : HELP_TEXT)
      break
    }

    case 'balance': {
      const bal = await getBalance(senderWallet.walletId)
      await sendMessage(chatId,
        `Your USDC balance: *$${bal.usdc}*\n\nWallet address:\n\`${senderWallet.address}\``
      )
      break
    }

    case 'send': {
      // Resolve recipient — must have already messaged the bot
      const recipientEntry = getWallet(command.to)
      if (!recipientEntry) {
        await sendMessage(chatId,
          `Cannot find *${command.to}*.\n\nThe recipient must message the bot at least once (just send /start) before you can send to them.`
        )
        return
      }

      // Check sender balance
      const bal = await getBalance(senderWallet.walletId)
      const available = parseFloat(bal.usdc)
      if (command.amount > available) {
        await sendMessage(chatId,
          `Insufficient balance. You have *$${bal.usdc} USDC* but tried to send *$${command.amount.toFixed(2)}*.\n\nFund your wallet:\n\`${senderWallet.address}\``
        )
        return
      }

      // Initiate transfer
      let transferResult
      try {
        transferResult = await transferUsdc(
          senderWallet.walletId,
          recipientEntry.address,
          command.amount
        )
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err)
        await sendMessage(chatId, `Transfer failed: ${errMsg}`)
        return
      }

      const entry: TxEntry = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        from: key,
        to: recipientEntry.key,
        amountUsdc: command.amount,
        transactionId: transferResult.transactionId,
        state: transferResult.state,
      }
      appendTx(entry)

      await sendMessage(chatId,
        `Sending *$${command.amount.toFixed(2)} USDC* to ${recipientEntry.displayName}...`
      )

      // Notify recipient
      await sendMessage(recipientEntry.chatId,
        `You received *$${command.amount.toFixed(2)} USDC* from ${name}!\nType /balance to see your updated balance.`
      )

      // Confirm when settled — use real onchain tx hash for explorer link
      waitForTransaction(transferResult.transactionId).then(({ state: finalState, txHash }) => {
        updateTxState(transferResult.transactionId, finalState, txHash)
        const explorerUrl = txHash ? `https://testnet.arcscan.app/tx/${txHash}` : null
        if (finalState === 'COMPLETE') {
          const msg = explorerUrl
            ? `Transfer complete! *$${command.amount.toFixed(2)} USDC* sent to ${recipientEntry.displayName}.\n[View on explorer](${explorerUrl})`
            : `Transfer complete! *$${command.amount.toFixed(2)} USDC* sent to ${recipientEntry.displayName}.`
          sendMessage(chatId, msg).catch(() => {})
        } else if (finalState === 'FAILED' || finalState === 'DENIED') {
          sendMessage(chatId, `Transfer ${finalState.toLowerCase()}. Please try again.`).catch(() => {})
        }
      }).catch(console.error)

      break
    }

    case 'request': {
      const targetEntry = getWallet(command.from)
      if (!targetEntry) {
        await sendMessage(chatId,
          `Cannot find *${command.from}*.\n\nThe person must message the bot first (send /start) before you can request from them.`
        )
        return
      }

      await sendMessage(targetEntry.chatId,
        `${name} is requesting *$${command.amount.toFixed(2)} USDC* from you.\n\nTo pay, reply:\n\`/send ${command.amount.toFixed(2)} to ${key}\``
      )
      await sendMessage(chatId,
        `Payment request sent to ${targetEntry.displayName} for *$${command.amount.toFixed(2)} USDC*.`
      )
      break
    }
  }
}

async function getOrCreateWalletForUser(
  chatId: number,
  name: string,
  username?: string
): Promise<import('./wallets.js').WalletEntry> {
  const key = chatKey(chatId)
  const wallet = await getOrCreateWallet(key, name)
  if (username) {
    setUsernameAlias(key, `@${username}`)
  }
  return wallet
}

// ─── Express admin API ────────────────────────────────────────────────────────
const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/wallets', (_req, res) => {
  res.json(listWallets())
})

app.get('/api/txlog', (_req, res) => {
  res.json(listTx())
})

app.get('/api/status', (_req, res) => {
  const hasCircle = !!(process.env.CIRCLE_API_KEY || process.env.CIRCLE_DEVELOPER_CONTROLLED_API_KEY)
  const hasEntitySecret = !!(process.env.ENTITY_SECRET || process.env.CIRCLE_ENTITY_SECRET)
  const hasTelegram = !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN !== 'your_telegram_bot_token_here')

  res.json({
    ok: hasCircle && hasEntitySecret && hasTelegram,
    circle: hasCircle,
    entitySecret: hasEntitySecret,
    telegram: hasTelegram,
    botUsername: process.env.TELEGRAM_BOT_USERNAME ?? null,
  })
})

const PORT = process.env.PORT ?? 3001
app.listen(PORT, () => {
  console.log(`[server] Telegram USDC Bot running on port ${PORT}`)
})
