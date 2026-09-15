import { useEffect, useState } from 'react'
import { ExternalLink, Users } from 'lucide-react'

interface WalletEntry {
  key: string
  displayName: string
  chatId: string
  walletId: string
  address: string
  createdAt: string
}

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  const hrs = Math.floor(mins / 60)
  const days = Math.floor(hrs / 24)
  if (days > 0) return `${days}d ago`
  if (hrs > 0) return `${hrs}h ago`
  if (mins > 0) return `${mins}m ago`
  return 'just now'
}

export function WalletRegistry() {
  const [wallets, setWallets] = useState<WalletEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = () => fetch('/api/wallets').then(r => r.json() as Promise<WalletEntry[]>).then(setWallets).catch(() => {})
    void load().finally(() => setLoading(false))
    const iv = setInterval(() => { void load() }, 15_000)
    return () => clearInterval(iv)
  }, [])

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="display text-base font-semibold text-[var(--ink)]">Wallets</h2>
        <span className="text-xs font-medium text-[var(--muted)] bg-[var(--surface-muted)] px-2.5 py-1 rounded-full">
          {wallets.length} registered
        </span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="h-14 bg-[var(--surface-muted)] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : wallets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Users size={32} className="text-[var(--border-strong)] mb-3" />
          <p className="text-sm text-[var(--muted)]">No wallets yet</p>
          <p className="text-xs text-[var(--subtle)] mt-1">
            Wallets are created when users send /start to your Telegram bot
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {wallets.map((w) => (
            <div
              key={w.key}
              className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-[var(--surface-muted)] hover:bg-[var(--border)] transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--ink)]">{w.displayName}</p>
                <p className="text-xs text-[var(--muted)] mono mt-0.5">{shortAddress(w.address)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-[var(--subtle)]">{timeAgo(w.createdAt)}</span>
                <a
                  href={`https://testnet.arcscan.app/address/${w.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg hover:bg-[var(--border)] transition-colors"
                >
                  <ExternalLink size={13} className="text-[var(--muted)]" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
