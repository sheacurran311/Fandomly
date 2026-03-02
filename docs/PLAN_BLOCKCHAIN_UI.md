# Blockchain UI Build Plan

## Overview

Build three UI pages for the Fandomly L1 smart contracts (deployed on Fandomly Chain testnet, Chain ID 31111). All contract addresses are in `shared/blockchain-config.ts`. Wallet connection uses Particle Network (already integrated).

**Prerequisites:**

- Particle Network auth is already integrated (`client/src/contexts/particle-provider.tsx`)
- Contract addresses are in `shared/blockchain-config.ts`
- Contract ABIs need to be extracted from `blockchain/contracts/*.sol` via Hardhat compilation
- User's L1 wallet address is stored in `users.avalancheL1Address`

---

## Shared Infrastructure (Build First)

### 1. Contract ABI exports

**File:** `shared/blockchain-abis.ts`

Export the ABI arrays for each contract. Generate via `cd blockchain && npx hardhat compile` then extract from `blockchain/artifacts/contracts/`. Alternatively, manually define the ABI from the Solidity interfaces (cleaner, smaller).

Key ABIs needed:

- `ReputationRegistryABI`: `getScore(address)`, `meetsThreshold(address,uint256)`
- `CreatorTokenFactoryABI`: `createToken(string,string,address,string)`, `creatorToToken(address)`, `getTenantTokens(string)`, `getTenantTokenCount(string)`, `isCreatorToken(address)`, `totalTokensCreated()`
- `FanStakingABI`: `stake(address,uint256)`, `unstake(address,uint256)`, `claimRewards(address)`, `stakes(address,address)`, `userMultipliers(address)`, `totalStaked(address)`, `pendingRewards(address,address)`, `MIN_STAKE_DURATION()`, `BASE_APY_BPS()`, `EARLY_WITHDRAWAL_PENALTY_BPS()`
- `CreatorTokenABI` (ERC-20): `balanceOf(address)`, `approve(address,uint256)`, `allowance(address,address)`, `symbol()`, `name()`, `totalSupply()`, `decimals()`

### 2. Blockchain hooks

**File:** `client/src/hooks/use-blockchain.ts`

Shared hook providing:

- `useChainConnection()` — checks if wallet is connected to Fandomly Chain, prompts switch if not
- `useContractRead(address, abi, functionName, args)` — generic read wrapper
- `useContractWrite(address, abi, functionName)` — generic write wrapper with tx status
- `useReputationScore(userAddress)` — reads from ReputationRegistry
- `useWalletBalance(userAddress, tokenAddress?)` — native FAN balance or ERC-20 balance

Use `viem` or `ethers.js` (whichever is already in the Particle Network SDK dependency tree) for contract interactions. Particle's `usePublicClient()` and `useWalletClient()` hooks provide the provider/signer.

### 3. Server-side blockchain service (optional, for indexing)

**File:** `server/services/blockchain/blockchain-service.ts`

Server-side read-only contract calls for:

- Indexing reputation scores into the database for fast queries
- Caching token metadata
- Syncing staking positions for dashboard stats

Use `viem` with Fandomly Chain RPC URL. No private key needed for read-only.

---

## Page 1: ReputationRegistry UI

### Route

`/reputation` (fan + creator)

### File

`client/src/pages/reputation.tsx`

### Components

1. **ReputationScoreCard** — hero card showing user's current score (0-1000), a visual gauge/ring, tier label (Bronze <250, Silver <500, Gold <750, Platinum >=750)
2. **ReputationHistory** — timeline of score changes (from on-chain `ScoreUpdated` events via `getLogs`)
3. **ReputationGates** — shows what each threshold unlocks:
   - 500+: Staking eligibility (link to staking page)
   - 750+: Token creation eligibility (link to token factory)
4. **ReputationBreakdown** — shows which off-chain actions contributed (task completions, social verification, referrals — this data comes from the existing DB, not on-chain)

### Data Flow

- On-chain: `ReputationRegistry.getScore(userAddress)` for current score
- On-chain: `ReputationRegistry` `ScoreUpdated` events for history
- Off-chain: existing task completion, social verification, and referral data from DB for breakdown

### API Endpoints (new)

- `GET /api/reputation/:userId` — returns score, tier, breakdown from DB + on-chain
- `GET /api/reputation/:userId/history` — returns on-chain event history (cached)

---

## Page 2: Token Factory UI (Creator-facing)

### Route

`/creator-dashboard/token` (creator only)

### File

`client/src/pages/creator-dashboard/token.tsx`

### Components

1. **TokenLaunchCard** — if creator has no token yet:
   - Shows reputation gate (need 750+, display current score)
   - Form: token name, symbol (auto-suggest from creator name)
   - "Launch Token" button → calls backend which calls `CreatorTokenFactory.createToken()`
   - Note: `createToken` is `onlyOwner` (backend deployer wallet), so the frontend sends a request to the server which executes the tx
2. **TokenDashboardCard** — if creator already has a token:
   - Token name, symbol, contract address (copyable)
   - Total supply, circulating supply
   - Number of holders (from on-chain `Transfer` events or backend indexing)
   - Distribution controls (airdrop to fans, set as task reward)
3. **TokenHoldersTable** — top token holders with amounts
4. **TokenActivityFeed** — recent transfers, staking activity

### Data Flow

- On-chain: `CreatorTokenFactory.creatorToToken(creatorAddress)` to check if token exists
- On-chain: Token ERC-20 `balanceOf`, `totalSupply` for stats
- Server: `POST /api/blockchain/create-token` — backend executes the `onlyOwner` tx
- Server: Token holder indexing via Transfer events

### API Endpoints (new)

- `POST /api/blockchain/create-token` — body: `{ name, symbol }`, server creates via Factory contract using deployer wallet
- `GET /api/blockchain/token/:creatorId` — returns token address, supply, holder count
- `GET /api/blockchain/token/:tokenAddress/holders` — returns holder list with balances

---

## Page 3: Fan Staking UI

### Route

`/staking` (fan, requires wallet connection)

### File

`client/src/pages/staking.tsx`

### Components

1. **StakingOverview** — hero stats:
   - Total value staked (across all tokens)
   - Current APY (base 5% × social multiplier)
   - Pending rewards (FAN tokens claimable)
   - Social multiplier badge (e.g., "2.0x YouTube verified")
2. **StakeTokenCard** (per creator token) — repeating card for each token the fan holds:
   - Token name/symbol, current balance
   - Amount staked, amount available
   - Stake input + "Stake" button
   - Unstake input + "Unstake" button (with 7-day minimum warning, 5% early penalty display)
   - "Claim Rewards" button
   - Time staked (countdown if under 7 days)
3. **StakingRewardsHistory** — table of reward claims
4. **AvailableTokensList** — browse creator tokens available to stake (from CreatorTokenFactory)
5. **ReputationGate** — if user score < 500, show prompt to increase reputation

### User Flows

**Stake flow:**

1. User selects creator token and amount
2. Frontend calls `token.approve(FanStaking.address, amount)` (ERC-20 approval)
3. Frontend calls `FanStaking.stake(tokenAddress, amount)`
4. Wait for tx confirmation, refresh balances

**Unstake flow:**

1. User selects amount to unstake
2. If staked < 7 days, show penalty warning (5% slash)
3. Frontend calls `FanStaking.unstake(tokenAddress, amount)`
4. Wait for tx confirmation, refresh balances

**Claim flow:**

1. Show pending rewards from `FanStaking.pendingRewards(user, token)`
2. Frontend calls `FanStaking.claimRewards(tokenAddress)`
3. Wait for tx, refresh FAN balance

### Data Flow

- On-chain: `FanStaking.stakes(user, token)` for position
- On-chain: `FanStaking.pendingRewards(user, token)` for claimable
- On-chain: `FanStaking.userMultipliers(user)` for social bonus
- On-chain: `FanStaking.totalStaked(token)` for TVL
- On-chain: ERC-20 `balanceOf` for token balance
- Server: `GET /api/blockchain/staking/:userId` for aggregated stats

### API Endpoints (new)

- `GET /api/blockchain/staking/:userId` — returns all staking positions, pending rewards, multiplier
- `POST /api/blockchain/staking/set-multiplier` — backend sets social multiplier (onlyOwner) after verifying social connections
- `GET /api/blockchain/tokens` — returns all creator tokens from the factory

---

## Navigation Integration

Add to sidebar (`client/src/components/dashboard/sidebar-navigation.tsx`):

- Fan sidebar: "Staking" (icon: Coins), "Reputation" (icon: Shield)
- Creator sidebar: "My Token" (icon: Coins), "Reputation" (icon: Shield)

Add routes to `client/src/App.tsx`:

- `/staking` → StakingPage
- `/reputation` → ReputationPage
- `/creator-dashboard/token` → TokenFactoryPage

---

## Implementation Order

1. `shared/blockchain-abis.ts` — extract ABIs
2. `client/src/hooks/use-blockchain.ts` — shared hooks
3. `/reputation` page — simplest, read-only
4. `/creator-dashboard/token` page — involves server-side tx
5. Server endpoints for token creation and reputation
6. `/staking` page — most complex, involves approve + stake + claim flows
7. Server endpoints for staking stats and multiplier management
8. Navigation integration and route registration
