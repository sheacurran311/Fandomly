# Fandomly Code Audit Report — Post-Commit Analysis

**Scope:** All code in commits since the environment setup work (PR #38 merge through PR #42 merge).  
**Files analyzed:** ~49 changed files, ~34K lines added.  
**Areas covered:** Particle Network auth, Campaign V2, Kick/Patreon OAuth, schema changes, main.ts monolith, token refresh service, frontend pages/components.

---

## Critical Issues (fix immediately)

| #   | Area      | File                                               | Issue                                                                                                                                                                   |
| --- | --------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Auth      | `particle-auth-service.ts:115-118`                 | **No wallet address validation** — client-supplied `walletAddress` stored directly without format check or proof-of-ownership. Attacker can claim any wallet.           |
| C2  | Auth      | `particle-auth-service.ts:149-160`                 | **Account takeover via email matching** — Particle login with a matching email silently takes over existing accounts without confirming email ownership.                |
| C3  | Campaigns | `campaign-routes-v2.ts:288-342`                    | **Missing authorization on sponsor CRUD** — any authenticated user can add/edit/delete sponsors on any campaign.                                                        |
| C4  | Campaigns | `campaign-routes-v2.ts:352-422`                    | **Missing authorization on task assignment update/reorder** — any authenticated user can modify any campaign's tasks.                                                   |
| C5  | Campaigns | `campaign-engine.ts:459-504`                       | **Double completion bonus** — race condition allows claiming the bonus twice via concurrent requests.                                                                   |
| C6  | OAuth     | `kick-oauth-routes.ts:101-120`                     | **Unauthenticated token exchange** — `POST /api/social/kick/token` returns raw access/refresh tokens to any caller.                                                     |
| C7  | OAuth     | `kick-oauth-routes.ts` + `patreon-oauth-routes.ts` | **No CSRF state validation** — OAuth flows don't validate the `state` parameter server-side, enabling CSRF-based account linking attacks.                               |
| C8  | OAuth     | `patreon-oauth-routes.ts:156-175`                  | **Unauthenticated token exchange** — same as C6 for Patreon.                                                                                                            |
| C9  | Routes    | `main.ts:1252,1335,1383`                           | **Unauthenticated user mutation endpoints** — `switch-user-type`, `update-onboarding`, and `PATCH user/:userId/switch-type` allow any caller to change any user's role. |
| C10 | Routes    | `main.ts:4062`                                     | **Unauthenticated Stripe payment intent** — `POST /api/create-payment-intent` has no auth, allowing unlimited Stripe API abuse.                                         |

---

## High Priority Issues

| #   | Area      | File                               | Issue                                                                                                          |
| --- | --------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| H1  | Auth      | `particle-auth-service.ts:120-127` | Wallet address not cross-validated against Particle's response `wallets` array.                                |
| H2  | Auth      | `particle-routes.ts:31-79`         | No rate limiting on auth callback endpoint.                                                                    |
| H3  | Auth      | `auth-context.tsx:512-534`         | Logout doesn't disconnect Particle — `ParticleAuthListener` immediately re-logs in.                            |
| H4  | Auth      | `auth-modal.tsx:631-632`           | `require()` in ESM/Vite environment — will fail at runtime in production builds.                               |
| H5  | Campaigns | `campaign-engine.ts:558-585`       | Race condition on concurrent task completion — lost updates on JSONB array.                                    |
| H6  | Campaigns | `campaign-engine.ts:599-608`       | Badge ownership check is a no-op — returns true for any user with any NFT delivery.                            |
| H7  | Campaigns | `campaign-verification.ts:155-178` | Deferred verification auto-approves all tasks without actual verification.                                     |
| H8  | Campaigns | `campaign-routes-v2.ts:various`    | Internal error messages leaked to client in all catch blocks.                                                  |
| H9  | OAuth     | `kick-oauth-routes.ts:125-140`     | Unauthenticated API proxy — anyone can use the server to hit Kick's API.                                       |
| H10 | OAuth     | `patreon-oauth-routes.ts:180-205`  | Unauthenticated API proxy — same for Patreon.                                                                  |
| H11 | OAuth     | `patreon-oauth-routes.ts:421-423`  | No token expiry check or refresh logic for stored Patreon tokens.                                              |
| H12 | OAuth     | `kick.ts:102,208`                  | PKCE code verifier stored in localStorage (XSS accessible).                                                    |
| H13 | OAuth     | `patreon.ts:60-78`                 | No PKCE on Patreon OAuth flow.                                                                                 |
| H14 | Schema    | Entire `schema.ts`                 | Zero custom database indexes defined — all FK columns use sequential scans.                                    |
| H15 | Routes    | `main.ts:2660-2721`                | 5 routes reference dropped `social_campaign_tasks` table — will crash at runtime.                              |
| H16 | Routes    | `main.ts`                          | Duplicate route registrations: `GET /api/task-templates` (2x), `POST /api/rewards` (2x, one unauthenticated).  |
| H17 | Routes    | `main.ts`                          | 8+ additional routes missing authentication (program creation, campaign tasks CRUD, Facebook import, rewards). |
| H18 | Routes    | `main.ts`                          | Zero rate limiting on any endpoint in the entire file.                                                         |
| H19 | Token     | `token-refresh.ts:88-98`           | Race condition on concurrent token refresh — can corrupt refresh tokens.                                       |
| H20 | Frontend  | `creator-dashboard.tsx:223`        | React hooks rules violation — conditional hook call that will break unpredictably.                             |
| H21 | Frontend  | `creator-dashboard.tsx`            | 37 `console.log` statements shipping to production.                                                            |

---

## Medium Priority Issues

| #   | Area      | File                                   | Issue                                                                                                         |
| --- | --------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| M1  | Auth      | `particle-auth-service.ts:193-195`     | Username collision risk — 4-char random suffix only ~1.6M combinations.                                       |
| M2  | Auth      | `particle-auth-service.ts:145-147`     | Swallowed DB errors — catches all exceptions checking for `particleUserId` column.                            |
| M3  | Auth      | `particle-auth-listener.tsx:70-74`     | Particle disconnect logs out non-Particle sessions.                                                           |
| M4  | Auth      | `particle-provider.tsx:54`             | Suspense fallback renders children without ConnectKit context.                                                |
| M5  | Auth      | `particle-config.ts:31-32`             | Hardcoded production RPC URL as fallback.                                                                     |
| M6  | Auth      | `auth-modal.tsx:466-508`               | Legacy social providers shown alongside Particle — confusing dual-auth UX.                                    |
| M7  | Campaigns | `campaign-engine.ts:247-287`           | No unique constraint on `(campaignId, memberId)` — duplicate participation possible.                          |
| M8  | Campaigns | `campaign-engine.ts:339-340`           | Completion percentage conflates required and optional tasks.                                                  |
| M9  | Campaigns | `campaign-verification.ts:128-195`     | Stale read in verification loop — earlier task approvals overwritten.                                         |
| M10 | Campaigns | `campaign-verification.ts:67-98`       | No idempotency guard on batch verification job processing.                                                    |
| M11 | Campaigns | `useCampaignBuilder.ts:237-251`        | Client sends wrong payload shape for reorder — will always fail.                                              |
| M12 | Campaigns | `useCampaignParticipation.ts:100-110`  | POST in useQuery — re-fetches pollute access logs.                                                            |
| M13 | OAuth     | `kick-oauth-routes.ts:46,107`          | Client-provided `redirect_uri` accepted without server-side validation.                                       |
| M14 | OAuth     | `patreon-oauth-routes.ts:465-552`      | Campaign members endpoint lacks campaign ownership verification.                                              |
| M15 | OAuth     | `kick.ts:99,131` + `patreon.ts:84,114` | OAuth state not validated on popup return (both platforms).                                                   |
| M16 | Schema    | `schema.ts:1295-1326`                  | Missing indexes on new FK columns (`campaign_sponsors.campaignId`, `campaign_access_logs.campaignId+userId`). |
| M17 | Schema    | `schema.ts:415-417`                    | `avalancheL1Address` has no unique constraint — multiple users can claim same wallet.                         |
| M18 | Schema    | `manual_review_queue`                  | Integer PKs/FKs for varchar UUID columns — broken table (migration 0043 partially fixes).                     |
| M19 | Routes    | `main.ts:3516-3517`                    | `user?.fullName` / `user?.avatarUrl` — fields don't exist on schema.                                          |
| M20 | Routes    | `main.ts`                              | Tenant creation boilerplate copy-pasted 4 times (~120 lines each).                                            |
| M21 | Routes    | `main.ts`                              | 4,917-line monolith with 59 inline handlers — unmaintainable.                                                 |
| M22 | Frontend  | `program-builder.tsx`                  | 2,481 lines — needs splitting into mode-specific components.                                                  |
| M23 | Frontend  | `social.tsx` + `profile.tsx`           | ~770 lines of duplicated platform UI across both files.                                                       |
| M24 | Frontend  | `campaign-builder-new.tsx`             | No error handling on save/publish — silent failures.                                                          |
| M25 | Frontend  | `new-auth-router.tsx:131-327`          | 200-line useEffect with cascading if/else — hard to follow, potential redirect loops.                         |
| M26 | Frontend  | `social.tsx:631`                       | CSS typo: `hover:bg_white/10` (underscore instead of hyphen).                                                 |
| M27 | Frontend  | `creator-dashboard.tsx:243-547`        | 300-line Instagram OAuth handler embedded in dashboard render.                                                |

---

## Low Priority Issues

| #   | Area     | File                            | Issue                                                                                                   |
| --- | -------- | ------------------------------- | ------------------------------------------------------------------------------------------------------- |
| L1  | Auth     | `use-particle-auth.ts:37-62`    | Entire hook is dead code (no-op implementation).                                                        |
| L2  | Auth     | `auth-modal.tsx:595-608`        | Dead `handleClick` function — never wired to any click handler.                                         |
| L3  | Auth     | `particle-config.ts:118`        | Empty icon string in wallet metadata — broken icon in wallet UIs.                                       |
| L4  | Schema   | Various tables                  | Missing `updatedAt` on `pointTransactions`, `rewardRedemptions`, `campaignRules`, `campaignAccessLogs`. |
| L5  | Schema   | Throughout                      | Inconsistent PK generation — mix of `varchar+gen_random_uuid`, `uuid+defaultRandom`, `serial`.          |
| L6  | Routes   | `main.ts:3776`                  | `parseInt(limit)` on query params without bounds — unbounded queries possible.                          |
| L7  | Routes   | `main.ts:1`                     | ESLint disabled for entire file — hides real issues.                                                    |
| L8  | Frontend | `home.tsx:1377`                 | Footer social links all `href="#"` — placeholder links.                                                 |
| L9  | Frontend | `home.tsx`                      | No `aria-label` on close button, form inputs lack label association.                                    |
| L10 | Frontend | `new-auth-router.tsx:149`       | User type exposed on `window` object.                                                                   |
| L11 | Frontend | `sidebar-navigation.tsx`        | Collapsed sidebar shows only icons — no tooltips or screen reader text.                                 |
| L12 | Frontend | `creator-dashboard.tsx:558-571` | `useQuery` called after early return — hooks ordering violation.                                        |

---

## Recommended Fix Priority

### Sprint 1 — Security (1-2 days)

1. Add wallet address validation + cross-check against Particle response (C1, H1)
2. Fix email-based account takeover — require explicit linking (C2)
3. Add authentication to sponsor/task-assignment routes (C3, C4)
4. Fix double-completion race condition with atomic SQL (C5)
5. Add authentication to Kick/Patreon token exchange endpoints (C6, C8)
6. Implement server-side OAuth state validation (C7)
7. Add authentication to user mutation routes in main.ts (C9)
8. Add authentication to payment intent route (C10)
9. Add rate limiting to auth endpoints (H2, H18)

### Sprint 2 — Data Integrity (1-2 days)

1. Add unique constraint on campaign participation (M7)
2. Fix dead routes referencing dropped table (H15)
3. Remove duplicate route registrations (H16)
4. Add missing DB indexes on FK columns (H14, M16)
5. Add unique constraint on `avalancheL1Address` (M17)
6. Fix campaign reorder payload mismatch (M11)

### Sprint 3 — Code Quality (2-3 days)

1. Remove 37 console.log statements from creator-dashboard (H21)
2. Fix conditional hook call (H20)
3. Fix Particle logout loop (H3)
4. Extract platform UI into shared component (M23)
5. Split program-builder.tsx (M22)
6. Add error handling to campaign builder save/publish (M24)
7. Begin extracting route groups from main.ts monolith (M21)

### Sprint 4 — OAuth Hardening

1. Move token exchange fully server-side for both Kick and Patreon
2. Implement PKCE for Patreon (H13)
3. Move PKCE verifier to sessionStorage (H12)
4. Validate redirect_uri server-side (M13)
5. Implement Patreon token refresh logic (H11)
6. Encrypt stored OAuth tokens (H14 in schema review)
