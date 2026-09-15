/**
 * Wallet registry — maps user keys to Circle wallet IDs and addresses.
 *
 * Key format:
 *   tg:<chatId>    — Telegram chat/user ID (primary, always available)
 *   @<username>    — Telegram username alias (optional, added when seen)
 *
 * Persisted to wallets.json in the project root.
 */

import fs from 'fs'
import path from 'path'

const REGISTRY_PATH = path.resolve(process.cwd(), 'wallets.json')

export interface WalletEntry {
  key: string          // primary key: "tg:<chatId>"
  displayName: string  // human-readable: "@alice" or "First Last"
  username?: string    // "@alice" if known
  chatId: string       // raw Telegram chat ID
  walletId: string     // Circle wallet ID
  address: string      // EVM address
  walletSetId: string
  createdAt: string    // ISO timestamp
}

export type WalletRegistry = Record<string, WalletEntry>

function load(): WalletRegistry {
  try {
    if (fs.existsSync(REGISTRY_PATH)) {
      return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8')) as WalletRegistry
    }
  } catch { /* start fresh */ }
  return {}
}

function save(registry: WalletRegistry): void {
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2), 'utf8')
}

export function getWallet(key: string): WalletEntry | undefined {
  return load()[key]
}

export function setWallet(entry: WalletEntry): void {
  const registry = load()
  // Store under primary key
  registry[entry.key] = entry
  // Also index under @username if available
  if (entry.username) {
    registry[entry.username.toLowerCase()] = entry
  }
  save(registry)
}

/** Update the username alias for an existing wallet. */
export function setUsernameAlias(chatKey: string, username: string): void {
  const registry = load()
  const entry = registry[chatKey]
  if (!entry) return
  entry.username = username
  entry.displayName = username
  registry[chatKey] = entry
  registry[username.toLowerCase()] = entry
  save(registry)
}

export function listWallets(): WalletEntry[] {
  const registry = load()
  // Return only primary entries (tg:...) to avoid duplicates
  return Object.values(registry).filter((e) => e.key.startsWith('tg:'))
}
