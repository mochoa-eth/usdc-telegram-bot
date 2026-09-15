# WhatsApp USDC Bot

> Built with Arc Studio — send USDC to any WhatsApp contact

## What This App Does
A WhatsApp bot that lets users send, receive, and request USDC to any phone number.
Each phone number automatically gets a Circle developer-controlled wallet on Arc Testnet.
The admin dashboard (this React app) shows wallet registry, transaction history, and bot health.

---

## Architecture
- **Frontend**: React + Vite admin dashboard (port 5173)
- **Backend**: Express bot server (port 3001), proxied via Vite `/webhook` and `/api`
- **Chain**: Arc Testnet (chain ID 5042002)
- **Wallets**: Circle developer-controlled wallets, one per phone number
- **Registry**: `wallets.json` (root) — phone → walletId + address
- **Tx log**: `txlog.json` (root) — append-only transfer history

## Server entry point
`server/index.ts` — run with `bun run server:dev`

## Key files
- `server/circle.ts` — Circle SDK wrapper (getOrCreateWallet, getBalance, transferUsdc)
- `server/wallets.ts` — phone-to-wallet registry (file-backed)
- `server/commands.ts` — WhatsApp command parser
- `server/whatsapp.ts` — Meta Cloud API client (send/receive messages)
- `server/txlog.ts` — transaction log
- `src/components/BotStatus.tsx` — config health check card
- `src/components/WalletRegistry.tsx` — wallet list
- `src/components/TransactionFeed.tsx` — live tx feed
- `src/components/CommandGuide.tsx` — bot command reference

## Webhook URL
`https://iz9qn1xddp262k8qst0r2.preview.studio.arc.io/webhook`

## Required .env variables
- `CIRCLE_API_KEY` — Circle developer API key
- `ENTITY_SECRET` — 32-byte hex entity secret (registered with Circle)
- `CIRCLE_WALLET_SET_ID` — set after first run; persists wallet set across restarts
- `WHATSAPP_TOKEN` — Meta WhatsApp Cloud API access token
- `WHATSAPP_PHONE_NUMBER_ID` — Meta phone number ID
- `WHATSAPP_VERIFY_TOKEN` — any string; used for webhook verification

## Deployed contracts
None — uses Circle dev-controlled wallets SDK for all transfers.
