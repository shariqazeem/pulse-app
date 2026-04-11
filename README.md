# Pulse

Live tipping for Starknet. Real-time, gasless, social.

**[onpulse.vercel.app](https://onpulse.vercel.app)**

---

## What it does

Host creates a session. Gets a QR code. Audience scans with their phone, signs in with Google, taps an amount, and tips. The tip appears on the host's screen instantly with sound, confetti, and a leaderboard update.

8 seconds. No wallet download. No gas fees. No crypto knowledge needed.

---

## Who it's for

- Streamers (Twitch, YouTube, X Spaces)
- Conference speakers
- Podcasters doing live recordings
- Musicians, comedians, performers
- Anyone doing anything live on Starknet

---

## Features

**For Hosts**
- One-click session creation with cinematic "card reveal" onboarding
- Live dashboard with QR code, total raised, top tippers leaderboard, recent tips feed
- Pin QR as a draggable floating widget anywhere on screen
- Pop out QR via browser Picture-in-Picture (stays visible across all tabs)
- OBS browser source overlay for streamers (`/embed/[id]`)
- Dashboard with wallet balance, session history, send funds, Vesu yield stash, AVNU token swap

**For Tippers**
- Scan QR → tip page opens on phone
- Custom numpad with haptic audio feedback
- Sign in with Google (Cartridge Controller) — no wallet setup
- Gasless transactions via AVNU Paymaster
- Optional display name and message
- Fund wallet helper with on-ramp links if balance is empty

**Real-time**
- Tips appear on host screen within 1-2 seconds via Server-Sent Events
- Sound chime on every tip
- Animated tip burst overlay for big tips
- Leaderboard reshuffles with spring physics

---

## Starkzap v2 Integrations

| # | Feature | Starkzap Primitive |
|---|---|---|
| 1 | Social login for tippers | Cartridge Controller |
| 2 | Server-managed host wallets | Privy (Argent SNIP-9) |
| 3 | Gasless tipping | AVNU Paymaster |
| 4 | Token transfers | TxBuilder |
| 5 | Balance reading | Erc20 |
| 6 | Yield on idle tips | Vesu Lending |
| 7 | Token conversion | AVNU Swap |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16, TypeScript |
| Styling | Tailwind CSS 4 |
| Animations | Framer Motion |
| Icons | Lucide React |
| Starknet SDK | Starkzap v2 (`npm install starkzap`) |
| Auth (tippers) | Cartridge Controller |
| Auth (hosts) | Username + password → Privy wallet |
| Gasless | AVNU Paymaster |
| Real-time | Server-Sent Events |
| Database | PostgreSQL |
| QR Codes | qrcode.react |
| Audio | Web Audio API (synthesized, no assets) |
| Deployment | Vercel |
| Network | Starknet Mainnet |

---

## Architecture

```
Tipper (phone)                    Host (laptop)
    │                                 │
    │ Scan QR                         │ /live/[id]
    │ ──────► /tip/[id]               │ connects SSE
    │                                 │ /api/sessions/[id]/feed
    │ Connect Cartridge               │
    │ Sign with Google                │
    │                                 │
    │ TxBuilder.transfer()            │
    │ ──── STRK on mainnet ────►      │
    │ (gasless via AVNU)              │
    │                                 │
    │ POST /api/sessions/[id]/tip     │
    │ ──── log to DB ──────────►      │ SSE picks up new tip
    │                                 │ ──► Animation + Sound
    │ Success                         │ ──► Leaderboard update
```

---

## Pages

| Route | What |
|---|---|
| `/` | Landing page |
| `/create` | Onboarding + session creation |
| `/live/[id]` | Host's live dashboard |
| `/tip/[id]` | Tipper's payment page |
| `/embed/[id]` | OBS browser source overlay |
| `/dashboard` | Host's fund management |

---

## API Routes

| Endpoint | Purpose |
|---|---|
| `POST /api/sessions` | Create session |
| `GET /api/sessions/[id]` | Get session info |
| `PATCH /api/sessions/[id]` | End session |
| `POST /api/sessions/[id]/tip` | Log a tip |
| `GET /api/sessions/[id]/feed` | SSE stream of new tips |
| `GET /api/sessions/[id]/tips` | Get existing tips |
| `GET /api/sessions/[id]/leaderboard` | Top tippers |
| `GET /api/balance` | Wallet balances |
| `POST /api/withdraw` | Send funds out |
| `POST /api/vesu/deposit` | Deposit to Vesu lending |
| `POST /api/vesu/withdraw` | Withdraw from Vesu |
| `GET /api/vesu/markets` | Vesu market data |
| `GET /api/vesu/positions` | Vesu positions |
| `POST /api/swap/execute` | Execute AVNU swap |
| `POST /api/swap/quote` | Get swap quote |

---

## Run Locally

```bash
git clone https://github.com/shariqazeem/pulse-app.git
cd pulse-app
npm install
```

Create `.env.local`:
```
PRIVY_APP_ID=your_privy_app_id
PRIVY_APP_SECRET=your_privy_secret
NEXT_PUBLIC_PAYMASTER_API_KEY=your_avnu_key
```

```bash
npm run dev
```

---

## Related

- [StarkPay](https://github.com/shariqazeem/starkpay) — Payment links, Telegram bot, Agent API. Week 1 Starkzap Bounty winner.
- Built by [@shariqshkt](https://x.com/shariqshkt)

---

Built on Starknet with Starkzap v2.
