/**
 * Command parser — turns raw Telegram message text into structured bot commands.
 *
 * Supported:
 *   balance
 *   send <amount> to @username or tg:<id>
 *   request <amount> from @username or tg:<id>
 *   help / start
 */

export type BotCommand =
  | { type: 'balance' }
  | { type: 'send'; amount: number; to: string }
  | { type: 'request'; amount: number; from: string }
  | { type: 'help' }
  | { type: 'unknown'; raw: string }

/** Normalise a recipient token:
 *  - @username  → "@username" (lowercase)
 *  - tg:123456  → "tg:123456"
 *  - bare number → "tg:<number>"
 */
export function normaliseRecipient(raw: string): string {
  const t = raw.trim()
  if (t.startsWith('@')) return t.toLowerCase()
  if (t.startsWith('tg:')) return t
  if (/^\d+$/.test(t)) return `tg:${t}`
  return t.toLowerCase()
}

export function parseCommand(text: string): BotCommand {
  const t = text.trim().toLowerCase()

  // /start or /help or bare "help"
  if (/^(\/start|\/help|help)$/.test(t)) return { type: 'help' }

  // /balance or bare "balance"
  if (/^(\/balance|balance)$/.test(t)) return { type: 'balance' }

  // send <amount> to <recipient>
  // e.g. "send 5 to @alice"  "send 5.50 usdc to tg:123456"
  const sendMatch = t.match(/^(?:\/send\s+|send\s+)([\d.]+)\s+(?:usdc\s+)?to\s+(\S+)$/)
  if (sendMatch) {
    const amount = parseFloat(sendMatch[1])
    const to = normaliseRecipient(sendMatch[2])
    if (!isNaN(amount) && amount > 0) return { type: 'send', amount, to }
  }

  // request <amount> from <recipient>
  const requestMatch = t.match(/^(?:\/request\s+|request\s+)([\d.]+)\s+(?:usdc\s+)?from\s+(\S+)$/)
  if (requestMatch) {
    const amount = parseFloat(requestMatch[1])
    const from = normaliseRecipient(requestMatch[2])
    if (!isNaN(amount) && amount > 0) return { type: 'request', amount, from }
  }

  return { type: 'unknown', raw: text }
}

export const HELP_TEXT = `*USDC Pay Bot* 💸

Commands:
• /balance — check your USDC balance
• /send <amount> to @username — send USDC
  e.g. \`/send 5 to @alice\`
• /request <amount> from @username — request USDC
  e.g. \`/request 10 from @alice\`
• /help — show this message

Both sender and recipient must message the bot at least once before you can send to them.

Powered by Circle + Arc Testnet`
