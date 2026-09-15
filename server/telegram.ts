/**
 * Telegram Bot client — direct HTTP API calls via axios.
 * No third-party bot library; avoids AbortSignal compat issues under Bun.
 * Docs: https://core.telegram.org/bots/api
 */

import axios from 'axios'

function getToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token || token === 'your_telegram_bot_token_here') {
    throw new Error('TELEGRAM_BOT_TOKEN is not set in .env — get one from @BotFather on Telegram')
  }
  return token
}

function apiUrl(method: string): string {
  return `https://api.telegram.org/bot${getToken()}/${method}`
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TgUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
}

export interface TgMessage {
  message_id: number
  chat: { id: number; type: string }
  from?: TgUser
  text?: string
}

interface TgUpdate {
  update_id: number
  message?: TgMessage
}

// ─── Send ─────────────────────────────────────────────────────────────────────

export async function sendMessage(chatId: number | string, text: string): Promise<void> {
  await axios.post(apiUrl('sendMessage'), {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
  })
}

// ─── Long-polling loop ────────────────────────────────────────────────────────

let _offset = 0
let _polling = false

export type MessageHandler = (msg: TgMessage) => Promise<void>

export function startPolling(onMessage: MessageHandler): void {
  if (_polling) return
  _polling = true
  console.log('[telegram] Polling started')
  void poll(onMessage)
}

async function poll(onMessage: MessageHandler): Promise<void> {
  while (_polling) {
    try {
      const res = await axios.get<{ ok: boolean; result: TgUpdate[] }>(
        apiUrl('getUpdates'),
        { params: { offset: _offset, timeout: 30, allowed_updates: ['message'] }, timeout: 35_000 }
      )

      for (const update of res.data.result) {
        _offset = update.update_id + 1
        if (update.message) {
          void onMessage(update.message).catch((err: unknown) => {
            console.error('[bot] Handler error:', err)
          })
        }
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.code === 'ECONNABORTED') {
        // long-poll timeout — normal, just retry
      } else {
        console.error('[telegram] Poll error:', err instanceof Error ? err.message : err)
        await new Promise((r) => setTimeout(r, 3000))
      }
    }
  }
}

export function stopPolling(): void {
  _polling = false
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Stable wallet key: "tg:<chatId>" */
export function chatKey(chatId: number | string): string {
  return `tg:${chatId}`
}

/** Human-readable display name from a Telegram message. */
export function displayName(msg: TgMessage): string {
  const u = msg.from
  if (!u) return `tg:${msg.chat.id}`
  if (u.username) return `@${u.username}`
  const name = [u.first_name, u.last_name].filter(Boolean).join(' ')
  return name || `tg:${u.id}`
}
