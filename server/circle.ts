/**
 * Circle developer-controlled wallets wrapper for Arc Testnet.
 *
 * One wallet set for the whole bot. Each Telegram user gets one wallet.
 * USDC is the native gas token on Arc, so no separate gas top-up is needed.
 */

import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets'
import { v4 as uuidv4 } from 'uuid'
import { getWallet, setWallet, type WalletEntry } from './wallets.js'

const BLOCKCHAIN = 'ARC-TESTNET'
const USDC_TOKEN_ADDRESS = '0x3600000000000000000000000000000000000000'

let _client: ReturnType<typeof initiateDeveloperControlledWalletsClient> | null = null
let _walletSetId: string | null = null

function getClient() {
  if (!_client) {
    const apiKey = process.env.CIRCLE_API_KEY || process.env.CIRCLE_DEVELOPER_CONTROLLED_API_KEY
    const entitySecret = process.env.ENTITY_SECRET || process.env.CIRCLE_ENTITY_SECRET
    if (!apiKey || !entitySecret) {
      throw new Error('CIRCLE_API_KEY and ENTITY_SECRET must be set in .env')
    }
    _client = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret })
  }
  return _client
}

async function getWalletSetId(): Promise<string> {
  if (_walletSetId) return _walletSetId

  const fromEnv = process.env.CIRCLE_WALLET_SET_ID
  if (fromEnv) {
    _walletSetId = fromEnv
    return _walletSetId
  }

  const client = getClient()
  const res = await client.createWalletSet({
    idempotencyKey: uuidv4(),
    name: 'Telegram USDC Bot',
  })
  const id = res.data?.walletSet?.id
  if (!id) throw new Error('Failed to create wallet set')
  _walletSetId = id
  console.log(`[circle] Created wallet set: ${id}`)
  console.log(`[circle] Add CIRCLE_WALLET_SET_ID=${id} to .env to persist across restarts`)
  return _walletSetId
}

/** Get or create a Circle wallet for a user key (e.g. "tg:123456"). */
export async function getOrCreateWallet(key: string, displayName: string): Promise<WalletEntry> {
  const existing = getWallet(key)
  if (existing) return existing

  const client = getClient()
  const walletSetId = await getWalletSetId()

  const res = await client.createWallets({
    idempotencyKey: uuidv4(),
    blockchains: [BLOCKCHAIN],
    count: 1,
    walletSetId,
    metadata: [{ name: displayName, refId: key }],
  })

  const wallet = res.data?.wallets?.[0]
  if (!wallet?.id || !wallet.address) {
    throw new Error(`Failed to create wallet for ${key}`)
  }

  const [, rawChatId] = key.split(':')
  const entry: WalletEntry = {
    key,
    displayName,
    chatId: rawChatId ?? key,
    walletId: wallet.id,
    address: wallet.address,
    walletSetId,
    createdAt: new Date().toISOString(),
  }
  setWallet(entry)
  console.log(`[circle] Created wallet for ${key}: ${wallet.address}`)
  return entry
}

export interface BalanceResult {
  usdc: string
  raw: string
}

export async function getBalance(walletId: string): Promise<BalanceResult> {
  const client = getClient()
  const res = await client.getWalletTokenBalance({ id: walletId })
  const tokenBalances = res.data?.tokenBalances ?? []
  const usdcBalance = tokenBalances.find(
    (b) => b.token?.address?.toLowerCase() === USDC_TOKEN_ADDRESS.toLowerCase()
      || b.token?.symbol === 'USDC'
  )
  const raw = usdcBalance?.amount ?? '0'
  const numeric = parseFloat(raw)
  return { raw, usdc: isNaN(numeric) ? '0.00' : numeric.toFixed(2) }
}

export interface TransferResult {
  transactionId: string
  state: string
}

export async function transferUsdc(
  fromWalletId: string,
  toAddress: string,
  amountUsdc: number
): Promise<TransferResult> {
  const client = getClient()
  const res = await client.createTransaction({
    idempotencyKey: uuidv4(),
    walletId: fromWalletId,
    blockchain: BLOCKCHAIN,
    tokenAddress: USDC_TOKEN_ADDRESS,
    destinationAddress: toAddress,
    amounts: [amountUsdc.toFixed(6)],
    fee: { type: 'level', config: { feeLevel: 'MEDIUM' } },
  })

  // SDK v10+: transaction may be at res.data.transaction or directly at res.data
  const tx = res.data?.transaction ?? res.data
  if (!tx?.id) {
    console.error('[circle] createTransaction full response:', JSON.stringify(res.data ?? res))
    throw new Error('Failed to initiate transfer — no transaction ID returned')
  }
  return { transactionId: tx.id as string, state: (tx.state as string) ?? 'INITIATED' }
}

export interface FinalTransaction {
  state: string
  txHash?: string  // onchain 0x... hash, available once SENT or COMPLETE
}

export async function waitForTransaction(transactionId: string, timeoutMs = 60_000): Promise<FinalTransaction> {
  const client = getClient()
  const TERMINAL = new Set(['COMPLETE', 'FAILED', 'DENIED', 'CANCELLED'])
  const deadline = Date.now() + timeoutMs
  let state = 'INITIATED'
  let txHash: string | undefined

  while (!TERMINAL.has(state) && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000))
    const res = await client.getTransaction({ id: transactionId })
    const tx = res.data?.transaction ?? res.data as Record<string, unknown>
    state = (tx as Record<string, unknown>)?.state as string ?? state
    const hash = (tx as Record<string, unknown>)?.txHash as string | undefined
    if (hash) txHash = hash
  }
  return { state, txHash }
}
