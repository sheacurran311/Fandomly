# Dynamic Labs Auth Code Audit Report

**Date:** 2026-02-27  
**Scope:** All `.ts`, `.tsx`, config, docs, and script files in the Fandomly codebase  
**Purpose:** Identify all references to Dynamic Labs auth code for deprecation/removal

---

## Executive Summary

Dynamic Labs SDK was previously used for wallet authentication but has been **fully removed** from the client-side SDK integration. What remains are:

1. **Dynamic Analytics API integration** — a server-side + client-side analytics dashboard that calls `app.dynamic.xyz` API endpoints. This is a standalone integration (no SDK dependency) that should be **REMOVED** since it depends on Dynamic credentials.
2. **Stub hooks** — empty/no-op client hooks that replaced the original Dynamic wallet functionality. Should be **REMOVED**.
3. **Text references** — mentions of "Dynamic Labs" in legal pages, comments, docs, and UI strings. Should be **REMOVED** or updated.
4. **Generic auth code (JWT/JWKS/RBAC)** — the new auth system that replaced Dynamic. Should be **KEPT**.

---

## Classification Legend

| Tag                | Meaning                                                      |
| ------------------ | ------------------------------------------------------------ |
| **REMOVE**         | Clearly deprecated Dynamic-specific code — safe to delete    |
| **KEEP**           | Generic auth code that works regardless of provider          |
| **INVESTIGATE**    | Unclear whether it's Dynamic-specific or generic             |
| **FALSE POSITIVE** | Contains the word "dynamic" but is unrelated to Dynamic Labs |

---

## Detailed Findings

### 1. REMOVE — Dynamic Analytics Service (Server)

**File:** `server/services/analytics/dynamic-analytics-service.ts` (entire file, 288 lines)

| Lines   | Context                                                                                    | Classification |
| ------- | ------------------------------------------------------------------------------------------ | -------------- |
| 1-288   | Full `DynamicAnalyticsService` class that calls `https://app.dynamic.xyz/api/v0` endpoints | **REMOVE**     |
| 12      | `const DYNAMIC_API_BASE = 'https://app.dynamic.xyz/api/v0'`                                | **REMOVE**     |
| 265-266 | Reads `DYNAMIC_ENVIRONMENT_ID` and `DYNAMIC_API_KEY` env vars                              | **REMOVE**     |

**Rationale:** This is a dedicated Dynamic Labs API integration service. The entire file should be removed.

---

### 2. REMOVE — Dynamic Analytics Routes (Server)

**File:** `server/routes/media/dynamic-analytics-routes.ts` (entire file, 262 lines)

| Lines | Context                                                                                                 | Classification |
| ----- | ------------------------------------------------------------------------------------------------------- | -------------- |
| 1-262 | Seven Express routes under `/api/admin/dynamic-analytics/*` that proxy to the Dynamic Analytics service | **REMOVE**     |

**Rationale:** These routes only serve data from the Dynamic Analytics service. Remove the entire file.

---

### 3. REMOVE — Dynamic Analytics Route Registration (Server)

**File:** `server/routes/main.ts`

| Lines     | Context                                                                             | Classification |
| --------- | ----------------------------------------------------------------------------------- | -------------- |
| 13        | `import { registerDynamicAnalyticsRoutes } from "./media/dynamic-analytics-routes"` | **REMOVE**     |
| 3982-3983 | `// Register Dynamic Analytics routes` + `registerDynamicAnalyticsRoutes(app)`      | **REMOVE**     |

**Rationale:** Import and registration call for the Dynamic analytics routes. Remove both lines.

---

### 4. REMOVE — Dynamic Analytics Client Hooks

**File:** `client/src/hooks/useDynamicAnalytics.ts` (entire file, 149 lines)

| Lines | Context                                                                            | Classification |
| ----- | ---------------------------------------------------------------------------------- | -------------- |
| 1-149 | Seven React Query hooks that fetch from `/api/admin/dynamic-analytics/*` endpoints | **REMOVE**     |

Comments already say "stub - Dynamic analytics removed" but the hooks still make real API calls to the Dynamic analytics routes.

---

### 5. REMOVE — Dynamic Wallets Stub Hook

**File:** `client/src/hooks/useDynamicWallets.ts` (entire file, 17 lines)

| Lines | Context                                                                 | Classification |
| ----- | ----------------------------------------------------------------------- | -------------- |
| 1-17  | Stub hook that returns null/empty data for Dynamic wallet functionality | **REMOVE**     |

**Rationale:** Comment explicitly says "Dynamic SDK has been removed - wallet features will need alternative implementation". This is dead code returning empty stubs.

---

### 6. REMOVE — Admin Analytics Dashboard (Dynamic-dependent sections)

**File:** `client/src/pages/admin-dashboard/analytics.tsx`

| Lines   | Context                                                                        | Classification                                                                                                               |
| ------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| 9-17    | Imports all `useDynamic*` hooks from `useDynamicAnalytics`                     | **REMOVE**                                                                                                                   |
| 67-74   | Calls to all Dynamic analytics hooks                                           | **REMOVE**                                                                                                                   |
| 77      | `const isDynamicConfigured = walletAnalytics.data?.configured ?? false`        | **REMOVE**                                                                                                                   |
| 81-97   | Extracts data from Dynamic analytics responses + console.log                   | **REMOVE**                                                                                                                   |
| 102     | Description text: "powered by Dynamic and Google Analytics"                    | **REMOVE**                                                                                                                   |
| 105-123 | Configuration status alerts ("Dynamic Analytics Not Configured" / "Connected") | **REMOVE**                                                                                                                   |
| 110     | References `DYNAMIC_ENVIRONMENT_ID` env var in UI text                         | **REMOVE**                                                                                                                   |
| 137-286 | Overview tab cards showing Dynamic data (Users, Wallets, Visits, Engagement)   | **INVESTIGATE** — These render Dynamic-specific data but the card structure could be reused for a different analytics source |
| 289-351 | Wallet Distribution Chart using Dynamic wallet data                            | **REMOVE**                                                                                                                   |
| 353-438 | Visit Analytics Chart using Dynamic visit data                                 | **REMOVE**                                                                                                                   |
| 440-539 | Raw Dynamic API Response Data debug section                                    | **REMOVE**                                                                                                                   |
| 543-616 | Wallets tab referencing Dynamic API endpoints                                  | **REMOVE**                                                                                                                   |
| 643-648 | Engagement tab mentions "Dynamic Analytics API"                                | **REMOVE**                                                                                                                   |

**Rationale:** This page is almost entirely a Dynamic Analytics dashboard. The Verification and Traffic tabs are independent of Dynamic and should be **KEPT**, but the Dynamic-specific tabs/cards should be removed or refactored.

---

### 7. REMOVE — Script Reference in package.json

**File:** `package.json`

| Line | Context                                                | Classification |
| ---- | ------------------------------------------------------ | -------------- |
| 26   | `"link-admin": "tsx scripts/link-dynamic-to-admin.ts"` | **REMOVE**     |

**Rationale:** References a script `scripts/link-dynamic-to-admin.ts` that **does not exist** (file not found). Dead script reference.

---

### 8. REMOVE — Legal/Marketing Text References

**File:** `client/src/pages/privacy-policy.tsx`

| Line | Context                                           | Classification                                       |
| ---- | ------------------------------------------------- | ---------------------------------------------------- |
| 81   | `<li>Dynamic Labs for wallet authentication</li>` | **REMOVE** — Update to reflect current auth provider |

**File:** `client/src/pages/terms-of-service.tsx`

| Line | Context                                           | Classification                                       |
| ---- | ------------------------------------------------- | ---------------------------------------------------- |
| 145  | `<li>Dynamic Labs for wallet authentication</li>` | **REMOVE** — Update to reflect current auth provider |

**File:** `client/src/pages/campaign-builder.tsx`

| Line | Context                                       | Classification                                       |
| ---- | --------------------------------------------- | ---------------------------------------------------- |
| 218  | `Secure wallet connection powered by Dynamic` | **REMOVE** — Update text to remove Dynamic reference |

---

### 9. REMOVE — Comment References in Source Code

**File:** `shared/schema.ts`

| Line | Context                                                 | Classification                                                        |
| ---- | ------------------------------------------------------- | --------------------------------------------------------------------- |
| 174  | `// Authentication Provider Fields (replacing Dynamic)` | **INVESTIGATE** — Comment only, not harmful, but should be cleaned up |
| 2586 | `// Actual wallet address from Dynamic`                 | **REMOVE** — Outdated comment, wallets now come from Crossmint        |

**File:** `server/services/nft/crossmint-service.ts`

| Line | Context                                                               | Classification                |
| ---- | --------------------------------------------------------------------- | ----------------------------- |
| 648  | `// For Dynamic embedded wallets, we use the wallet address directly` | **REMOVE** — Outdated comment |

**File:** `client/src/components/auth/auth-provider.tsx`

| Line | Context                                                         | Classification                                                            |
| ---- | --------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 10   | `* Replaces DynamicProvider with our own JWT-based auth system` | **INVESTIGATE** — Historical comment, not harmful but could be cleaned up |

**File:** `client/src/components/ui/image-upload.tsx`

| Line | Context                                                              | Classification                                            |
| ---- | -------------------------------------------------------------------- | --------------------------------------------------------- |
| 108  | `// Get auth headers (supports both JWT and legacy Dynamic user ID)` | **REMOVE** — Outdated comment; the code now uses JWT only |

---

### 10. REMOVE — Documentation Files

**File:** `docs/dynamic-analytics.md` (entire file, 182 lines)

| Lines | Context                                                            | Classification |
| ----- | ------------------------------------------------------------------ | -------------- |
| 1-182 | Full documentation for Dynamic Analytics integration setup and API | **REMOVE**     |

**File:** `docs/TECH_DEBT_REMEDIATION.md`

| Lines | Context                                   | Classification                                                                                |
| ----- | ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| 47-52 | Section "Remove Legacy Dynamic Labs Code" | **INVESTIGATE** — Keep the doc but update to mark this item as completed once removal is done |

**File:** `docs/FANDOMLY_COMPREHENSIVE_ANALYSIS.md`

| Lines         | Context                                                             | Classification                                                  |
| ------------- | ------------------------------------------------------------------- | --------------------------------------------------------------- |
| 135-136       | "Critical Finding: Dynamic Labs Status" section                     | **INVESTIGATE** — Historical analysis doc, update after cleanup |
| 250           | `@dynamic-labs/* HIGH Multiple vulnerabilities` in dependency table | **INVESTIGATE** — Will be resolved by removal                   |
| 264, 280, 289 | References to updating/removing Dynamic Labs packages               | **INVESTIGATE** — Will be resolved by removal                   |

**File:** `docs/FANDOMLY_FRONTEND_CODE_REVIEW.md`

| Lines   | Context                                              | Classification                         |
| ------- | ---------------------------------------------------- | -------------------------------------- |
| 506-513 | "Legacy Dynamic Labs code should be removed" finding | **INVESTIGATE** — Update after cleanup |

**File:** `docs/NFT_QUICKSTART.md`

| Lines           | Context                                                                | Classification                                   |
| --------------- | ---------------------------------------------------------------------- | ------------------------------------------------ |
| 66, 90, 93, 257 | References `useDynamicWallets.ts` hook and Dynamic Labs Dashboard link | **REMOVE** — Update to remove Dynamic references |

**File:** `docs/CROSSMINT_NFT_INTEGRATION.md`

| Lines   | Context                           | Classification                                         |
| ------- | --------------------------------- | ------------------------------------------------------ |
| 61, 286 | References `useDynamicWallets.ts` | **REMOVE** — Update to reflect current wallet approach |

**File:** `docs/CROSSMINT_IMPLEMENTATION_SUMMARY.md`

| Line | Context                                       | Classification          |
| ---- | --------------------------------------------- | ----------------------- |
| 107  | References `useDynamicWallets.ts` (120 lines) | **REMOVE** — Update doc |

**File:** `docs/ADMIN_PLATFORM_SECURITY_AUDIT.md`

| Line | Context                                                        | Classification                                                                |
| ---- | -------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 193  | "Any JWT from Dynamic Labs automatically creates user account" | **INVESTIGATE** — Historical audit finding; verify this is no longer the case |

**File:** `docs/CONSOLE-LOGS-EXPLANATION.md`

| Line | Context                                                                | Classification        |
| ---- | ---------------------------------------------------------------------- | --------------------- |
| 108  | "Dynamic SDK loads Algorand wallet support (`@dynamic-labs/algorand`)" | **REMOVE** — Outdated |

**File:** `replit.md`

| Lines  | Context                                                                        | Classification                                 |
| ------ | ------------------------------------------------------------------------------ | ---------------------------------------------- |
| 65, 69 | References to "Clean Dynamic Integration" and "Programmatic Wallet Connection" | **INVESTIGATE** — Historical changelog entries |
| 128    | "Dynamic Labs: Multi-chain wallet authentication"                              | **REMOVE** — Outdated technology description   |

---

### 11. KEEP — JWT Auth System

**File:** `server/services/auth/jwt-service.ts` (entire file, 211 lines)

| Lines | Context                                                    | Classification |
| ----- | ---------------------------------------------------------- | -------------- |
| 1-211 | RSA256 JWT signing, verification, JWKS endpoint generation | **KEEP**       |

**Rationale:** This is the replacement for Dynamic Labs auth. It's a fully generic JWT implementation with no Dynamic dependencies.

---

### 12. KEEP — JWKS Endpoints

**File:** `server/routes/main.ts`

| Lines        | Context                                                   | Classification |
| ------------ | --------------------------------------------------------- | -------------- |
| 106, 196-205 | Import `getJWKS` + JWKS endpoint `/.well-known/jwks.json` | **KEEP**       |

**File:** `server/routes/storage/storage-routes.ts`

| Lines     | Context                                   | Classification                        |
| --------- | ----------------------------------------- | ------------------------------------- |
| 9, 98-109 | Duplicate JWKS endpoint (same as main.ts) | **KEEP** (but consider deduplication) |

**Rationale:** These serve the app's own JWKS for Crossmint JWT validation. No Dynamic dependency.

---

### 13. KEEP — RBAC Middleware

The RBAC middleware (`server/middleware/rbac.ts`) uses the JWT service for authentication. It has no Dynamic-specific code.

---

### 14. FALSE POSITIVES — Unrelated "dynamic" References

These files contain the word "dynamic" in a context completely unrelated to Dynamic Labs:

| File                                                        | Line        | Context                                        | Why False Positive                                        |
| ----------------------------------------------------------- | ----------- | ---------------------------------------------- | --------------------------------------------------------- |
| `client/src/components/branding/dynamic-theme-injector.tsx` | All         | Dynamic CSS theme injection                    | "Dynamic" refers to runtime CSS theming, not Dynamic Labs |
| `client/src/components/branding/branding-customizer.tsx`    | 16, 125-126 | Imports `DynamicThemeInjector`                 | Same — CSS theming component                              |
| `client/src/components/fan/fan-profile-edit-modal.tsx`      | 659         | `{/* Dynamic Subcategories */}`                | UI comment about dynamically rendered subcategories       |
| `server/routes/tasks/task-completion-routes.ts`             | 686         | "Import verification functions dynamically"    | Code comment about JS dynamic imports                     |
| `server/utils/safe-sql.ts`                                  | 3           | "strict whitelists for dynamic SQL components" | Comment about SQL parameterization                        |
| `client/src/pages/billing.tsx`                              | 308, 361    | "dynamic Elements setup"                       | Stripe Elements dynamic configuration                     |
| `scripts/validate-imports.ts`                               | 32, 136-137 | `DYNAMIC_IMPORT_REGEX`                         | Regex for JavaScript `import()` expressions               |
| `scripts/social-api-test.ts`                                | 284         | "Dynamic import of verification service"       | JS dynamic import                                         |
| `shared/theme-templates.ts`                                 | 706, 711    | "Dynamic, colorful gaming aesthetic"           | Theme description text                                    |
| `client/src/hooks/use-social-connection.ts`                 | 372         | "Generic hook for dynamic platform selection"  | Generic programming term                                  |
| `client/src/pages/creator-dashboard/social.tsx`             | N/A         | No Dynamic Labs references                     | False positive in initial search                          |
| `client/src/pages/creator-dashboard/rewards.tsx`            | N/A         | No Dynamic Labs references                     | False positive in initial search                          |
| `client/src/pages/creator-dashboard/growth.tsx`             | N/A         | No Dynamic Labs references                     | False positive in initial search                          |

---

### 15. ALREADY CLEANED — Previously Removed Dynamic Code

| Item                                                           | Status                                                                        |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `getDynamicUserId()` in `queryClient.ts`                       | Already removed (referenced in tech debt doc as still present, but it's gone) |
| `@dynamic-labs/*` packages in `package.json`                   | Already removed (no `@dynamic-labs` in current `package.json` dependencies)   |
| `DynamicProvider` / `DynamicContextProvider` client components | Already removed (replaced by `AuthProvider` in `auth-provider.tsx`)           |
| `window.__dynamicUserId` global                                | Already removed                                                               |

---

## Attached Assets (Historical, No Action Needed)

The `attached_assets/` directory contains several pasted text files with Dynamic Labs stack traces and documentation. These are historical debugging artifacts and are **not part of the running codebase**. No action is required for these files, though they could be cleaned up as part of general housekeeping.

---

## Summary Table

### Files to REMOVE (entire file)

| #   | File Path                                                | Lines | Description                      |
| --- | -------------------------------------------------------- | ----- | -------------------------------- |
| 1   | `server/services/analytics/dynamic-analytics-service.ts` | 288   | Dynamic Analytics API service    |
| 2   | `server/routes/media/dynamic-analytics-routes.ts`        | 262   | Dynamic Analytics Express routes |
| 3   | `client/src/hooks/useDynamicAnalytics.ts`                | 149   | Dynamic Analytics React hooks    |
| 4   | `client/src/hooks/useDynamicWallets.ts`                  | 17    | Stub wallet hook                 |
| 5   | `docs/dynamic-analytics.md`                              | 182   | Dynamic Analytics documentation  |

### Files to EDIT (remove Dynamic-specific sections/lines)

| #   | File Path                                        | What to Change                                                                         |
| --- | ------------------------------------------------ | -------------------------------------------------------------------------------------- |
| 6   | `server/routes/main.ts`                          | Remove import (line 13) and registration (lines 3982-3983) of Dynamic analytics routes |
| 7   | `client/src/pages/admin-dashboard/analytics.tsx` | Remove all Dynamic analytics hook imports, calls, and Dynamic-dependent UI sections    |
| 8   | `package.json`                                   | Remove `"link-admin"` script (line 26) — references nonexistent file                   |
| 9   | `client/src/pages/privacy-policy.tsx`            | Update line 81 — remove "Dynamic Labs for wallet authentication"                       |
| 10  | `client/src/pages/terms-of-service.tsx`          | Update line 145 — remove "Dynamic Labs for wallet authentication"                      |
| 11  | `client/src/pages/campaign-builder.tsx`          | Update line 218 — remove "powered by Dynamic" text                                     |
| 12  | `shared/schema.ts`                               | Update comments at lines 174 and 2586                                                  |
| 13  | `server/services/nft/crossmint-service.ts`       | Update comment at line 648                                                             |
| 14  | `client/src/components/ui/image-upload.tsx`      | Update comment at line 108                                                             |
| 15  | `client/src/components/auth/auth-provider.tsx`   | Optionally update comment at line 10                                                   |

### Files to KEEP (no changes)

| #   | File Path                                                        | Reason                                          |
| --- | ---------------------------------------------------------------- | ----------------------------------------------- |
| 16  | `server/services/auth/jwt-service.ts`                            | Generic JWT auth — no Dynamic dependency        |
| 17  | `server/middleware/rbac.ts`                                      | Generic RBAC — no Dynamic dependency            |
| 18  | `server/routes/main.ts` (JWKS endpoint)                          | Own JWKS for Crossmint — no Dynamic dependency  |
| 19  | `server/routes/storage/storage-routes.ts` (JWKS endpoint)        | Own JWKS for Crossmint — no Dynamic dependency  |
| 20  | `client/src/components/auth/auth-provider.tsx` (component logic) | JWT-based auth provider — no Dynamic dependency |
| 21  | `client/src/lib/queryClient.ts`                                  | Already cleaned of Dynamic code                 |

### Documentation to UPDATE after code removal

| #   | File Path                                  | What to Update                                      |
| --- | ------------------------------------------ | --------------------------------------------------- |
| 22  | `docs/TECH_DEBT_REMEDIATION.md`            | Mark "Remove Legacy Dynamic Labs Code" as completed |
| 23  | `docs/FANDOMLY_COMPREHENSIVE_ANALYSIS.md`  | Update Dynamic Labs status section                  |
| 24  | `docs/FANDOMLY_FRONTEND_CODE_REVIEW.md`    | Mark finding #14 as resolved                        |
| 25  | `docs/NFT_QUICKSTART.md`                   | Remove `useDynamicWallets` references               |
| 26  | `docs/CROSSMINT_NFT_INTEGRATION.md`        | Remove `useDynamicWallets` references               |
| 27  | `docs/CROSSMINT_IMPLEMENTATION_SUMMARY.md` | Remove `useDynamicWallets` references               |
| 28  | `docs/CONSOLE-LOGS-EXPLANATION.md`         | Remove Dynamic SDK log explanation                  |
| 29  | `replit.md`                                | Update technology description                       |
