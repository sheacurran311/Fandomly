# Particle Embedded Wallet Fix

This note captures the exact failure chain and the fixes required to keep Fandomly's embedded Particle wallet working after the migration from Particle-as-auth to Fandomly social auth + Particle wallet provisioning.

## Intended Architecture

- Fandomly social auth is the primary login flow.
- Duplicate-account checks complete before wallet provisioning.
- After `isAuthenticated === true`, `particle-auth-listener.tsx` calls Particle `connectAsync()` with the Fandomly JWT.
- Particle creates or reconnects the embedded wallet.
- Wallet UI is exposed only after a real Particle connection exists.

## Exact Particle Dashboard Contract

- JWT provider validation:
  - `iss = https://fandomly.com`
  - `aud = fandomly`
- Unique key id: `sub`
- JWKS URI:
  - `/.well-known/jwks.json`

Important: the JWT issuer must match the Particle dashboard exactly. Moving app branding/runtime URLs to `fandomly.ai` is separate from the wallet JWT contract.

## Root Causes We Hit

### 1. JWT issuer drift

Symptom:
- `Invalid jwt: iss is not valid`

Cause:
- App code temporarily signed JWTs with `https://fandomly.ai` while Particle still validated `https://fandomly.com`.

Fix:
- Keep `server/services/auth/jwt-service.ts` aligned with the Particle dashboard:
  - `JWT_ISSUER = https://fandomly.com`
  - `JWT_AUDIENCE = fandomly`

### 2. Vite/browser polyfill regressions

Symptoms:
- `Cannot read properties of undefined (reading 'slice')`
- AWS/Smithy runtime crashes involving `process.version`, `process.versions.deno`, etc.

Cause:
- Browser bundles were pulling Node-oriented runtime code paths and/or missing `process` shape expected by legacy browserified dependencies.

Fixes:
- Restore `client/src/polyfills.ts` and import it first in `client/src/main.tsx`.
- Ensure `Buffer`, `process`, `process.version`, and `process.browser` exist early.
- In `vite.config.ts`, keep browser-safe polyfill setup and avoid broad aliases that produce missing exports.
- Patch Cognito/browser runtime behavior in Vite instead of forcing incompatible Node packages into the browser bundle.

### 3. Particle `thresh-sig` WASM failing silently

Symptoms:
- `Cannot read properties of undefined (reading '__wbindgen_malloc')`
- repeated "wallet not ready" retries
- wallet creation never finishes

Cause:
- `@particle-network/thresh-sig` uses a relative WASM URL:
  - `new URL("../wasm/thresh_sig_wasm_bg.wasm", import.meta.url)`
- After Vite optimization, the bundle requested a legacy path that returned app HTML instead of WASM.
- The package swallowed init errors, so the real failure was hidden and later manifested as `__wbindgen_malloc`.

Fixes:
- `server/vite.ts` now serves the WASM file from all relevant paths:
  - `/particle-wasm/thresh_sig_wasm_bg.wasm`
  - `/node_modules/.vite/wasm/thresh_sig_wasm_bg.wasm`
  - `/node_modules/@particle-network/thresh-sig/wasm/thresh_sig_wasm_bg.wasm`
- `node_modules/@particle-network/thresh-sig/esm/index.js` was patched so:
  - the default WASM URL becomes `/particle-wasm/thresh_sig_wasm_bg.wasm`
  - init errors are logged and rethrown instead of swallowed

Important:
- This direct `node_modules` patch can be overwritten by reinstalling dependencies.
- If dependencies are refreshed, preserve the same behavior either by reapplying the patch or moving it into a durable package-patch workflow.

### 4. Wallet modal blocked by CSP

Symptom:
- browser CSP error blocking `https://wallet.particle.network/`

Cause:
- `frame-src` allowed Google/Facebook only.

Fix:
- `server/index.ts` must include:
  - `https://wallet.particle.network`
  in the `frameSrc` CSP directive.

### 5. UI exposing wallet too early

Symptoms:
- wallet button visible when chain was not actually connected
- `openWallet()` failures due to missing iframe/plugin readiness

Cause:
- UI used "Particle is configured" as a proxy for "wallet is connected."

Fixes:
- Require a real Particle connection plus `embeddedWallet.isCanOpen`.
- Keep `wallet({ visible: true, preload: true })` in `client/src/lib/particle-config.ts`.
- Hide the floating entry in CSS if desired, but do not disable wallet creation.

### 6. Wallet modal partially rendering on custom chain

Symptoms:
- wallet modal opens but only shows the address
- most actions are non-interactive
- iframe console reports `TypeError: Cannot read properties of undefined (reading 'id')`

Cause:
- `@particle-network/wallet-plugin` was only forwarding `supportChains` as `{ id, chainType }`.
- For the Fandomly custom chain, the wallet UI also needs the chain `name` so the modal can fully resolve the selected network metadata.

Fix:
- Patch `node_modules/@particle-network/wallet-plugin/dist/esm/index.mjs` so `supportChains` forwards:
  - `id`
  - `name`
  - `chainType`

### 7. Direct package fixes needed a durable workflow

Cause:
- Both the `thresh-sig` WASM fix and the wallet-plugin custom-chain fix lived in `node_modules`, so a reinstall could silently remove them.

Fix:
- Add `patch-package` as a dev dependency.
- Add `"postinstall": "patch-package"` to `package.json`.
- Commit the generated patch files:
  - `patches/@particle-network+thresh-sig+0.7.8.patch`
  - `patches/@particle-network+wallet-plugin+2.1.1.patch`

## Files Touched For The Fix

- `client/src/components/auth/particle-auth-listener.tsx`
- `client/src/lib/particle-config.ts`
- `client/src/components/layout/navigation.tsx`
- `client/src/components/dashboard/sidebar-navigation.tsx`
- `client/src/main.tsx`
- `client/src/polyfills.ts`
- `server/index.ts`
- `server/vite.ts`
- `server/services/auth/jwt-service.ts`
- `vite.config.ts`
- `package.json`
- `patches/@particle-network+thresh-sig+0.7.8.patch`
- `patches/@particle-network+wallet-plugin+2.1.1.patch`
- `node_modules/@particle-network/thresh-sig/esm/index.js`
- `node_modules/@particle-network/wallet-plugin/dist/esm/index.mjs`

## Non-Obvious Operational Notes

- If the wallet starts failing again after dependency reinstall, inspect:
  - `patch-package` output during install
  - `patches/@particle-network+thresh-sig+0.7.8.patch`
  - `patches/@particle-network+wallet-plugin+2.1.1.patch`
  - `node_modules/@particle-network/thresh-sig/esm/index.js`
  - `node_modules/@particle-network/wallet-plugin/dist/esm/index.mjs`
  - the legacy WASM URLs above
  - CSP `frame-src`
  - JWT `iss` / `aud`
- If testing in dev, restart the canonical launcher after Vite/server changes:
  - `node ./dev-start.mjs`
- When debugging, treat these warnings differently:
  - `WalletConnect Core is already initialized` is usually noise
  - `__wbindgen_malloc` is the real WASM/bootstrap problem
  - CSP frame errors indicate wallet iframe blocking
  - `iss is not valid` indicates JWT contract mismatch
