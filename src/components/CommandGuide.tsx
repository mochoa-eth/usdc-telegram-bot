import { MessageCircle } from 'lucide-react'

const commands = [
  { cmd: '/start', desc: 'Register your wallet and get started' },
  { cmd: '/balance', desc: 'Check your USDC balance' },
  { cmd: '/send 5 to @alice', desc: 'Send $5 USDC to @alice' },
  { cmd: '/request 10 from @bob', desc: 'Ask @bob to pay you $10 USDC' },
  { cmd: '/help', desc: 'Show all commands' },
]

export function CommandGuide() {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <MessageCircle size={16} className="text-[var(--muted)]" />
        <h2 className="display text-base font-semibold text-[var(--ink)]">Bot Commands</h2>
      </div>
      <div className="space-y-2">
        {commands.map(({ cmd, desc }) => (
          <div key={cmd} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[var(--surface-muted)]">
            <code className="mono text-xs font-medium text-[var(--accent)] bg-blue-50 border border-blue-100 px-2 py-1 rounded-lg whitespace-nowrap shrink-0">
              {cmd}
            </code>
            <span className="text-sm text-[var(--ink-2)] pt-0.5">{desc}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-[var(--subtle)] mt-4">
        Recipients must send /start to the bot before you can send them USDC.
      </p>
    </div>
  )
}
