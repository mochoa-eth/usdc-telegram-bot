import { BotStatus } from './components/BotStatus'
import { WalletRegistry } from './components/WalletRegistry'
import { TransactionFeed } from './components/TransactionFeed'
import { CommandGuide } from './components/CommandGuide'
import { TokenUSDC } from '@web3icons/react'

export default function App() {
  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-gradient)' }}>
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)] backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-[var(--accent)] flex items-center justify-center">
              <TokenUSDC size={16} className="text-white" />
            </div>
            <span className="display font-semibold text-[var(--ink)] text-sm tracking-tight">
              Telegram USDC Bot
            </span>
            <span className="text-xs text-[var(--muted)] bg-[var(--surface-muted)] border border-[var(--border)] px-2 py-0.5 rounded-full">
              Arc Testnet
            </span>
          </div>
          <a
            href="https://testnet.arcscan.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
          >
            Explorer →
          </a>
        </div>
      </header>

      {/* Main grid */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Top row: status + command guide */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <BotStatus />
          <CommandGuide />
        </div>

        {/* Bottom row: wallets + transactions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <WalletRegistry />
          <TransactionFeed />
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-4 sm:px-6 pb-8">
        <p className="text-xs text-[var(--subtle)] text-center">
          Developer dashboard — testnet only — powered by Circle + Arc
        </p>
      </footer>
    </div>
  )
}
