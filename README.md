# Fandomly

A Web3-native loyalty and engagement platform that empowers creators to build deeper relationships with their communities. Creators launch customizable loyalty programs with tasks, campaigns, rewards, and NFT-powered badges -- all backed by on-chain verification on the Fandomly Chain (Avalanche L1).

## Tech Stack

| Layer      | Technology                                                |
| ---------- | --------------------------------------------------------- |
| Frontend   | React 18, TypeScript, Vite, TailwindCSS, Radix UI, Wouter |
| Backend    | Node.js, Express, TypeScript                              |
| Database   | PostgreSQL (Neon Serverless) with Drizzle ORM             |
| Blockchain | Solidity 0.8.20, Hardhat, viem                            |
| Auth       | Particle Network (wallet), JWT, Passport.js               |
| Testing    | Vitest, Playwright, React Testing Library                 |
| Payments   | Stripe                                                    |

## Fandomly Chain (Avalanche L1)

Fandomly runs its own Avalanche L1 blockchain with the native **FAN** token.

| Property     | Value                  |
| ------------ | ---------------------- |
| Chain ID     | 31111                  |
| Native Token | FAN (18 decimals)      |
| Network      | Avalanche Fuji Testnet |

### Smart Contracts

Six deployed smart contracts power the on-chain layer:

- **ReputationRegistry** -- On-chain reputation oracle (0-1000 score). Gates access to staking (500+) and token creation (750+). Synced from off-chain reputation engine.
- **CreatorTokenFactory + CreatorToken** -- Factory pattern for launching per-creator ERC-20 tokens (1M initial supply). Reputation-gated at 750+.
- **FanStaking** -- Stake creator tokens, earn FAN rewards at 5% base APY. Social multipliers up to 5x based on connected platforms. 7-day minimum with 5% early withdrawal penalty.
- **FandomlyBadge (ERC-1155)** -- Platform and creator badges. Supports both soulbound (non-transferable) and transferable variants. Used for achievements, verification, and community milestones.
- **FandomlyNFT + CreatorCollectionFactory (ERC-721)** -- Platform NFT collections and per-creator collections with EIP-2981 royalty support.

## Project Structure

```
Fandomly/
├── blockchain/           # Smart contracts (Hardhat)
│   ├── contracts/        # Solidity source (6 contracts)
│   ├── scripts/          # Deployment scripts
│   └── test/             # Contract tests
├── client/               # React frontend (Vite)
│   ├── public/           # Static assets
│   └── src/
│       ├── components/   # UI components
│       ├── contexts/     # React contexts
│       ├── hooks/        # Custom hooks
│       ├── lib/          # Utilities
│       └── pages/        # Page components
│           ├── admin-dashboard/
│           ├── creator-dashboard/
│           └── fan-dashboard/
├── server/               # Express backend
│   ├── core/             # Storage layer
│   ├── jobs/             # Background jobs
│   ├── lib/              # Token encryption, utilities
│   ├── middleware/        # Auth (RBAC), rate limiting, uploads
│   ├── routes/           # API routes (20+ modules)
│   ├── services/         # Business logic
│   │   ├── auth/         # Particle, Google, JWT
│   │   ├── campaigns/    # Campaign engine
│   │   ├── nft/          # Blockchain NFT service, IPFS
│   │   ├── points/       # Creator + platform points
│   │   ├── reputation/   # Scoring + on-chain oracle sync
│   │   └── verification/ # 10-platform verification engine
│   └── webhooks/         # Social platform webhooks
├── shared/               # Shared TypeScript code
│   └── schema.ts         # Drizzle database schema
├── migrations/           # Database migrations (Drizzle)
├── scripts/              # Admin and deployment utilities
├── tests/                # Integration and E2E tests
└── docs/                 # Internal documentation
```

## Key Features

### For Creators

- **Loyalty Programs** -- Points, tiers, custom rewards, and multipliers
- **Campaign Builder** -- Multi-task campaigns with sequential unlocking, prerequisite gating, sponsor support, and completion bonuses
- **Task System** -- 15+ task types across social platforms with 3-tier verification
- **NFT Badges** -- Mint soulbound or transferable badges for fan achievements
- **Creator Tokens** -- Launch ERC-20 tokens with one click (reputation-gated)
- **Analytics** -- Participation tracking, reputation scores, community metrics

### For Fans

- **Social Verification** -- Connect accounts and earn points for real engagement
- **Check-In Streaks** -- Daily check-ins with tier progression (Bronze through Diamond)
- **On-Chain Reputation** -- Portable 0-1000 score synced to blockchain
- **Staking** -- Stake creator tokens for FAN rewards with social multipliers
- **Reward Redemption** -- Spend points on creator rewards, NFTs, and raffle entries

### For Brands & Sponsors

- **Campaign Sponsorship** -- Fund creator campaigns to reach verified audiences
- **On-Chain Attestation** -- Transparent engagement metrics backed by blockchain

## Social Platform Integrations

Fandomly verifies real fan engagement across 10 platforms using a 3-tier verification engine:

| Platform  | Verification     | Social Multiplier |
| --------- | ---------------- | ----------------- |
| YouTube   | API (OAuth)      | 2.0x              |
| Twitter/X | API (OAuth)      | 1.5x              |
| Instagram | Code-based       | 1.3x              |
| TikTok    | Code-based       | 1.2x              |
| Discord   | API (OAuth)      | 1.1x              |
| Twitch    | API (OAuth)      | --                |
| Spotify   | API (OAuth)      | --                |
| Kick      | API + Chat codes | --                |
| Patreon   | API (OAuth)      | --                |
| Facebook  | Code-based       | --                |

**Verification Tiers:**

- **T1 (API)** -- Full OAuth access; automatic verification via platform APIs
- **T2 (Code)** -- Fan posts a verification code in comments/captions; system detects it
- **T3 (Manual)** -- Screenshot + proof URL submitted for creator review

## Development

### Prerequisites

- Node.js 18+
- PostgreSQL 16+ (or Neon serverless)
- A `TOKEN_ENCRYPTION_KEY` (any 32+ character string for local dev)

### Setup

```bash
# Install dependencies
npm install

# Start the WebSocket proxy (required for Neon serverless driver)
node dev-ws-proxy.mjs &

# Push database schema
DATABASE_URL="postgresql://user:pass@localhost:5432/fandomly" npx drizzle-kit push --force

# Start dev server
DATABASE_URL="postgresql://user:pass@localhost:5432/fandomly" \
TOKEN_ENCRYPTION_KEY="dev-encryption-key-for-local-testing-only-32chars" \
NODE_OPTIONS="--import ./dev-preload.mjs" \
npm run dev
```

The app runs on `http://localhost:5000`. The Express server serves both the API and the Vite-powered React SPA.

### Environment Variables

| Variable               | Required | Description                                                                                     |
| ---------------------- | -------- | ----------------------------------------------------------------------------------------------- |
| `DATABASE_URL`         | Yes      | PostgreSQL connection string                                                                    |
| `TOKEN_ENCRYPTION_KEY` | Yes      | AES-256-GCM key for encrypting OAuth tokens at rest                                             |
| `SESSION_SECRET`       | Yes      | Express session secret                                                                          |
| `JWT_SECRET`           | Yes      | JWT signing secret                                                                              |
| Third-party API keys   | No       | Stripe, social platform OAuth credentials. App starts without them with degraded functionality. |

### Testing

```bash
npm test              # All Vitest tests
npm run test:unit     # Unit tests only
npm run test:api      # API integration tests
npm run test:e2e      # Playwright E2E tests
npm run test:coverage # Coverage report
npm run lint          # ESLint
npm run build         # Production build
```

### Blockchain

```bash
cd blockchain
npm install
npx hardhat compile
npx hardhat test
```

See `blockchain/.env.example` for required environment variables when deploying contracts.

## Architecture

```
Client (React SPA)
    │
    ▼
Express API Server (port 5000)
    │
    ├── Auth ──────── Particle Network / Google OAuth / JWT
    ├── Routes ────── 20+ API modules (campaigns, tasks, rewards, social, etc.)
    ├── Services ──── Business logic (campaign engine, verification, points, reputation)
    ├── Jobs ──────── Background workers (reputation sync, point expiration, group goals)
    │
    ├── PostgreSQL ── Drizzle ORM, 40+ tables, Neon serverless driver
    │
    └── Fandomly Chain (Avalanche L1)
         ├── ReputationRegistry (oracle sync)
         ├── CreatorTokenFactory + CreatorToken (ERC-20)
         ├── FanStaking (staking + social multipliers)
         ├── FandomlyBadge (ERC-1155)
         └── FandomlyNFT + CreatorCollectionFactory (ERC-721)
```

## License

Proprietary. All rights reserved.
