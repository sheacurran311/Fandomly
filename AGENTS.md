# Fandomly — Agent Instructions

## CRITICAL: Protected Files — DO NOT MODIFY

The following files contain hard-won Particle Network embedded wallet fixes that took
hours of debugging across multiple agents. **DO NOT rewrite, replace, or significantly
restructure these files** without explicit human approval. Small, additive changes are OK
but wholesale rewrites or "cleanup" refactors are NOT.

### Protected Particle Network files:
- `vite.config.ts` — Contains WASM patching, AWS browser runtime redirection, node: builtin stubs, and EVM provider patches. Every plugin exists to solve a specific Particle SDK compatibility issue.
- `client/src/lib/particle-config.ts` — Chain definition, ConnectKit config, wallet plugin setup. The `chains`, `walletConnectors`, and `plugins` arrays are calibrated precisely.
- `client/src/components/auth/particle-auth-listener.tsx` — JWT-based wallet connect flow with retry logic, session guards, and reconnection handling.
- `client/src/contexts/particle-provider.tsx` — Thin wrapper; do NOT add error boundaries that swallow ConnectKitProvider errors.
- `client/src/polyfills.ts` — Buffer/process polyfills that must run before Particle SDK loads.
- `client/src/main.tsx` — Polyfill import order and EIP-1193 patches are load-order sensitive.
- `server/vite.ts` — WASM file serving routes for Particle thresh-sig.
- `server/index.ts` — CSP `frame-src` includes `wallet.particle.network`.
- `server/services/auth/jwt-service.ts` — JWT issuer/audience must match Particle Dashboard exactly (`iss=https://fandomly.com`, `aud=fandomly`).
- `patches/@particle-network+thresh-sig+0.7.8.patch` — WASM URL fix + error visibility.
- `patches/@particle-network+wallet-plugin+2.1.1.patch` — Chain name forwarding for custom chains.
- `package.json` — `postinstall: "patch-package"` and `patch-package` devDependency are required.

### What breaks if you ignore this:
- Removing/changing vite plugins → `fromCognitoIdentity is not a function`, `__wbindgen_malloc`, or `No matching export` build errors
- Changing JWT issuer/audience → `Invalid jwt: iss is not valid` from Particle
- Removing polyfills.ts or changing import order → `Cannot read properties of undefined (reading 'slice')` at runtime
- Removing patch-package → wallet modal partially renders, WASM init fails silently
- Adding error boundaries around ConnectKitProvider → wallet errors silently swallowed, wallet appears broken with no diagnostics

See `docs/PARTICLE_WALLET_EMBEDDED_FIX.md` for the full debugging history.

---

## Cursor Cloud specific instructions

### Overview

Fandomly is a full-stack TypeScript Web3 loyalty/fan engagement platform. Express backend (port 5000) serves both the API and the Vite-powered React SPA. See `package.json` `scripts` for all available commands.

### Running the dev server

The app uses `@neondatabase/serverless` which connects to PostgreSQL via WebSocket. For local development with a local PostgreSQL instance, you need:

1. **PostgreSQL running locally** on port 5432 with a database and user created:

   ```
   sudo pg_ctlcluster 16 main start
   sudo -u postgres psql -c "CREATE USER devuser WITH PASSWORD 'devpass' SUPERUSER;"
   sudo -u postgres psql -c "CREATE DATABASE fandomly OWNER devuser;"
   ```

2. **WebSocket proxy** — the Neon serverless driver requires WebSocket-to-TCP bridging. Start the proxy first:

   ```
   node dev-ws-proxy.mjs &
   ```

3. **Push the database schema** (uses drizzle-kit, which connects via TCP — no proxy needed):

   ```
   DATABASE_URL="postgresql://devuser:devpass@localhost:5432/fandomly" npx drizzle-kit push --force
   ```

4. **Start the dev server** with the preload module that patches Neon config for local WS proxy:
   ```
   DATABASE_URL="postgresql://devuser:devpass@localhost:5432/fandomly" \
   TOKEN_ENCRYPTION_KEY="dev-encryption-key-for-local-testing-only-32chars" \
   NODE_OPTIONS="--import ./dev-preload.mjs" \
   npm run dev
   ```

### Key environment variables

- `DATABASE_URL` — **required**. PostgreSQL connection string.
- `TOKEN_ENCRYPTION_KEY` — **required** for auth crypto. Any 32+ char string works for local dev.
- Third-party API keys (Stripe, Crossmint, Twitter, etc.) are optional; the app starts without them with degraded functionality.

### Testing

- `npm test` — runs all Vitest tests (unit, API, integration, privacy, components). All tests pass without external services.
- `npm run lint` — ESLint check. The codebase has pre-existing warnings (263 errors, 2009 warnings with `--max-warnings 0`). This is the existing state.
- `npm run build` — production build (Vite frontend + esbuild server bundle).
- `npm run check` — TypeScript type checking.

### Architecture notes

- **NFT/Marketplace → own L1 blockchain**: Crossmint integration was removed, but the NFT DB tables (`nft_collections`, `nft_templates`, `nft_mints`, `nft_deliveries`) and reward type `"nft"` are being kept — they'll be repurposed for the Fandomly L1 blockchain with three smart contracts: Staking, Token Factory (creators), and ReputationRegistry. See `feat/landing-page-redesign` PR for contract details.
- **Auth migration**: Dynamic Labs wallet auth is being replaced with Particle Network. The JWT auth system (`jwt-service.ts`, `rbac.ts`) stays unchanged — only the wallet connection provider changes.

### Social Network Auth — Single Source of Truth

**CRITICAL**: Each social network has ONE authoritative file that defines its OAuth configuration (scopes, redirect URIs, popup flow). See `.cursor/rules/social-auth-single-source.mdc` for the full rule and file mapping. **Never** duplicate OAuth logic, popup handling, or URL construction outside the designated source file. All consumer files (auth-modal.tsx, auth-context.tsx, callback pages) import from the source — fix bugs in the source, not the consumer.

Quick reference:

- **Twitter/X** → `client/src/lib/twitter.ts` (`TwitterSDKManager`)
- **Facebook/Instagram** → `client/src/lib/facebook.ts` (`FacebookSDKManager`)
- **TikTok, YouTube, Spotify, Discord, Twitch** → `client/src/lib/social-integrations.ts`
- **Google** → `server/services/auth/google-auth.ts` + `server/routes/auth/google-routes.ts`

### Gotchas

- The Neon serverless driver connects via WebSocket, not TCP. Without `dev-ws-proxy.mjs` + `dev-preload.mjs`, database queries will fail with `ECONNREFUSED` on `wss://localhost/v2`.
- Background jobs (GroupGoalPoller, PointExpirationJob, SyncScheduler) start automatically and log errors if the database schema is incomplete or columns are missing — this is non-blocking for development.
- `drizzle-kit push` uses the standard `pg` driver (TCP), so it works directly with local PostgreSQL without the WebSocket proxy.
- Husky pre-commit hook runs `npx lint-staged` (ESLint + Prettier on staged files).
- `npm run dev` already starts `dev-ws-proxy.mjs` in the background (via `node dev-ws-proxy.mjs &` in the script), so you do not need to start it separately.
- Two test suites (`tests/api/platform-e2e.test.ts`, `tests/api/task-templates-api.test.ts`) fetch `http://localhost:5000/api/csrf-token` and require a running dev server to pass. All other suites pass without a server.
- `npm run build` has a pre-existing Vite/Rollup failure (`@aws-sdk/util-user-agent-node` tries to import `versions` from `node:process` which Rollup's node polyfills don't export). This does not affect development (`npm run dev` works fine).
- PostgreSQL 16 is a system dependency that must be installed (`sudo apt-get install -y postgresql postgresql-client`) and started (`sudo pg_ctlcluster 16 main start`) before running the dev server or schema push.
