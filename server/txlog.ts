/**
 * In-memory + file-backed transaction log for the admin dashboard.
 */

import fs from 'fs'
import path from 'path'

const LOG_PATH = path.resolve(process.cwd(), 'txlog.json')
const MAX_ENTRIES = 200

export interface TxEntry {
  id: string
  timestamp: string
  from: string        // "tg:<chatId>"
  to: string          // "tg:<chatId>"
  amountUsdc: number
  transactionId: string  // Circle transaction ID
  state: string
  txHash?: string        // onchain 0x... hash (set once COMPLETE)
}

function load(): TxEntry[] {
  try {
    if (fs.existsSync(LOG_PATH)) {
      return JSON.parse(fs.readFileSync(LOG_PATH, 'utf8')) as TxEntry[]
    }
  } catch { /* start fresh */ }
  return []
}

function save(entries: TxEntry[]): void {
  fs.writeFileSync(LOG_PATH, JSON.stringify(entries.slice(-MAX_ENTRIES), null, 2), 'utf8')
}

export function appendTx(entry: TxEntry): void {
  const entries = load()
  entries.push(entry)
  save(entries)
}

export function updateTxState(transactionId: string, state: string, txHash?: string): void {
  const entries = load()
  const idx = entries.findIndex((e) => e.transactionId === transactionId)
  if (idx >= 0) {
    entries[idx].state = state
    if (txHash) entries[idx].txHash = txHash
    save(entries)
  }
}

export function listTx(): TxEntry[] {
  return load().slice().reverse() // newest first
}
