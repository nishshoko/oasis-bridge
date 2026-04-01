# OASIS Bridge — Pocket Teleporter

Cross-chain bridge Solana <> Base, built as a **Base Mini App** with wagmi + viem + SIWE.

## Stack

- **Next.js 15** (App Router)
- **wagmi v2** + **viem** — wallet connection & transactions
- **Coinbase Smart Wallet** (Base Account) — primary connector
- **SIWE** — Sign-In with Ethereum authentication
- **Relay Protocol** — cross-chain quotes & bridging

## Quick Start

```bash
npm install
npm run dev
```

Opens at `http://localhost:3000`

## Project Structure

```
app/
  layout.jsx       — root layout, OG meta tags, fonts
  page.jsx         — home page
  providers.jsx    — WagmiProvider + QueryClientProvider
lib/
  wagmi.js         — wagmi config with Coinbase Smart Wallet
components/
  OasisBridge.jsx  — main bridge UI (OASIS / Ready Player One theme)
  ConnectWallet.jsx — wallet connect/disconnect button
  SignIn.jsx       — SIWE authentication
```

## Base Mini App Compliance

- Wallet auth via wagmi + viem (no Farcaster SDK)
- SIWE authentication
- Base Account (Coinbase Smart Wallet) as primary connector
- OG meta tags for Base.dev registration
- Standard web app architecture

## Build

```bash
npm run build
```

## Registration

Register on [base.dev](https://base.dev) with:
- App name, icon, description
- Screenshots
- Primary URL
- Builder code
