import { useEffect, useState } from 'react'
import { ExternalLink, ArrowRight, Activity } from 'lucide-react'

interface TxEntry {
  id: string
  timestamp: string
  from: string
  to: string
  amountUsdc: number
  transactionId: string
  state: string
  txHash?: string
}

function stateColor(state: string) {
  switch (state) {
    case 'COMPLETE': return 'text-[var(--success)] bg-emerald-50 border-emerald-200'
    case 'FAILED':
    case 'DENIED':   return 'text-[var(--danger)] bg-red-50 border-red-200'
    case 'SENT':
    case 'CONFIRMED': return 'text-blue-700 bg-blue-50 border-blue-200'
    default:          return 'text-[var(--muted)] bg-[var(--surface-muted)] border-[var(--border)]'
  }
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  const hrs = Math.floor(mins / 60)
  if (hrs > 0) return `${hrs}h ago`
  if (mins > 0) return `${mins}m ago`
  return 'just now'
}

export function TransactionFeed() {
  const [txs, setTxs] = useState<TxEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = () => fetch('/api/txlog').then(r => r.json() as Promise<TxEntry[]>).then(setTxs).catch(() => {})
    void load().finally(() => setLoading(false))
    const iv = setInterval(() => { void load() }, 8_000)
    return () => clearInterval(iv)
  }, [])

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="display text-base font-semibold text-[var(--ink)]">Transactions</h2>
        <span className="text-xs font-medium text-[var(--muted)] bg-[var(--surface-muted)] px-2.5 py-1 rounded-full">
          {txs.length} total
        </span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-[var(--surface-muted)] rounded-xl animate-pulse" />)}
        </div>
      ) : txs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Activity size={32} className="text-[var(--border-strong)] mb-3" />
          <p className="text-sm text-[var(--muted)]">No transactions yet</p>
          <p className="text-xs text-[var(--subtle)] mt-1">Transfers will appear here when users send USDC via WhatsApp</p>
        </div>
      ) : (
        <div className="space-y-2">
          {txs.map((tx) => (
            <div key={tx.id} className="flex items-start justify-between gap-4 px-4 py-3 rounded-xl bg-[var(--surface-muted)]">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="mono text-xs text-[var(--ink-2)] truncate max-w-[120px]">{tx.from}</span>
                  <ArrowRight size={12} className="text-[var(--muted)] shrink-0" />
                  <span className="mono text-xs text-[var(--ink-2)] truncate max-w-[120px]">{tx.to}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--ink)] tabular-nums">
                    ${tx.amountUsdc.toFixed(2)} USDC
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${stateColor(tx.state)}`}>
                    {tx.state}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                <span className="text-xs text-[var(--subtle)]">{timeAgo(tx.timestamp)}</span>
                {tx.txHash && (
                  <a
                    href={`https://testnet.arcscan.app/tx/${tx.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg hover:bg-[var(--border)] transition-colors"
                  >
                    <ExternalLink size={13} className="text-[var(--muted)]" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
