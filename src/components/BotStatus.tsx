import { useEffect, useState } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'

interface StatusData {
  ok: boolean
  circle: boolean
  entitySecret: boolean
  telegram: boolean
  botUsername: string | null
}

export function BotStatus() {
  const [status, setStatus] = useState<StatusData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void fetch('/api/status')
      .then((r) => r.json() as Promise<StatusData>)
      .then((d) => { setStatus(d); setLoading(false) })
      .catch(() => setLoading(false))

    const iv = setInterval(() => {
      void fetch('/api/status').then((r) => r.json() as Promise<StatusData>).then(setStatus).catch(() => {})
    }, 10_000)
    return () => clearInterval(iv)
  }, [])

  const checks: { label: string; key: keyof StatusData; hint?: string }[] = [
    { label: 'Circle API Key', key: 'circle' },
    { label: 'Entity Secret', key: 'entitySecret' },
    { label: 'Telegram Bot Token', key: 'telegram', hint: 'Get from @BotFather on Telegram' },
  ]

  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-sm p-6 animate-pulse">
        <div className="h-5 bg-[var(--surface-muted)] rounded w-1/3 mb-4" />
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-4 bg-[var(--surface-muted)] rounded w-2/3" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="display text-base font-semibold text-[var(--ink)]">Bot Status</h2>
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
          status?.ok
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-amber-50 text-amber-700 border-amber-200'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status?.ok ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          {status?.ok ? 'Ready' : 'Setup needed'}
        </span>
      </div>

      <div className="space-y-3 mb-5">
        {checks.map(({ label, key, hint }) => {
          const ok = !!status?.[key]
          return (
            <div key={key} className="flex items-start gap-3">
              {ok
                ? <CheckCircle size={16} className="text-[var(--success)] shrink-0 mt-0.5" />
                : <XCircle size={16} className="text-[var(--danger)] shrink-0 mt-0.5" />}
              <div>
                <p className={`text-sm ${ok ? 'text-[var(--ink-2)]' : 'text-[var(--muted)]'}`}>{label}</p>
                {!ok && hint && <p className="text-xs text-[var(--subtle)] mt-0.5">{hint}</p>}
              </div>
            </div>
          )
        })}
      </div>

      {status?.botUsername && (
        <div className="p-3 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)]">
          <p className="text-xs text-[var(--muted)] mb-1">Bot link</p>
          <a
            href={`https://t.me/${status.botUsername.replace('@', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mono text-sm font-medium text-[var(--accent)] hover:underline"
          >
            t.me/{status.botUsername.replace('@', '')}
          </a>
        </div>
      )}

      {!status?.telegram && (
        <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
          <p className="text-xs text-amber-800 font-medium mb-2">To get your bot token:</p>
          <ol className="text-xs text-amber-900 space-y-1 list-decimal list-inside">
            <li>Open Telegram and search for <strong>@BotFather</strong></li>
            <li>Send <code>/newbot</code> and follow the prompts</li>
            <li>Copy the token and add to <code>.env</code>:</li>
          </ol>
          <pre className="mono text-xs text-amber-900 mt-2 bg-amber-100 rounded p-2">TELEGRAM_BOT_TOKEN=123456:ABC...</pre>
          <p className="text-xs text-amber-800 mt-2">Then restart the bot server.</p>
        </div>
      )}
    </div>
  )
}
