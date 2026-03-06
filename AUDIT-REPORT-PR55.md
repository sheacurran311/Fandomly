# PR #55 "Feat/platform features" — Post-Merge Audit Report

**Date:** March 5, 2026
**Scope:** Audit of fixes in PR #55 against all CRITICAL/HIGH/MEDIUM issues from the original audit
**Method:** Static analysis of current codebase after merge, cross-referenced with original findings

---

## Executive Summary

PR #55 addressed **18 files** with ~2500 additions and ~2100 deletions. The fix pass successfully resolved the majority of CRITICAL issues but introduced **2 new CRITICAL issues** and **1 regression**. Several MEDIUM-severity issues were not addressed.

| Original Severity | Fixed | Partially Fixed | Not Fixed | Regressed |
| ----------------- | ----- | --------------- | --------- | --------- |
| **CRITICAL (18)** | 16    | 1               | 1         | 0         |
| **HIGH (30)**     | 17    | 4               | 9         | 0         |
| **MEDIUM (38)**   | 5     | 2               | 31        | 1         |

**New issues introduced by PR:** 2 CRITICAL, 2 HIGH, 4 MEDIUM, 2 LOW

---

## ORIGINAL CRITICAL ISSUES — Status After PR

### FIXED (16 of 18)

| #   | Issue                               | File                             | Evidence                                                                               |
| --- | ----------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------- |
| 1   | Zod 'checkin' vs DB 'check_in'      | task-routes.ts:117               | Now uses `z.literal('check_in')`                                                       |
| 2   | 'twitter_reply' not in DB enum      | task-routes.ts:169               | Removed from Zod enum. Residual refs in taskFieldSchemas.ts (non-blocking)             |
| 3   | rejectManualReview sets 'completed' | unified-verification.ts:913-918  | Now sets `status: 'rejected'` on both review queue and task completion                 |
| 4   | Direct approval missing points      | review-routes.ts:271-277         | Now calls `unifiedVerification.awardPoints(completionId, completion.taskId)`           |
| 5   | manualReviewQueue integer columns   | shared/schema.ts:1959-2007       | All 6 ID columns migrated to `varchar` with proper `.references()` FK constraints      |
| 6   | useState never imported             | campaign-builder-new.tsx:2       | Now imports `{ useEffect, useState }`                                                  |
| 7   | rewardRedemptions missing fanId     | redemption-routes.ts:352-354     | Insert now sets both `userId` and `fanId: userId`                                      |
| 8   | /pending route unreachable          | redemption-routes.ts:663 vs 723  | `/pending` now registered BEFORE `/:redemptionId`                                      |
| 9   | userPoints vs userBalance mismatch  | redemption-routes.ts:152         | Backend now returns both `userBalance` and `userPoints: userBalance`                   |
| 10  | Catalog called without programId    | redemption-routes.ts:127-139     | Backend auto-resolves when programId omitted                                           |
| 11  | Badge status 'completed' vs enum    | badge-routes.ts                  | All queries now use `'success'` matching the enum                                      |
| 12  | Badge uses walletAddress            | badge-routes.ts                  | All references now use `avalancheL1Address`                                            |
| 13  | Badge minted_at doesn't exist       | badge-routes.ts                  | All references now use `completed_at`                                                  |
| 14  | Particle auth bypass                | particle-auth-service.ts:126-143 | Retry-then-reject pattern: retries once after 2s delay, blocks login on second failure |
| 15  | Social connect missing tokens       | social-routes.ts:1643-1653       | Tokens encrypted via `encryptToken()` and stored                                       |
| 16  | taskCompletions zero indexes        | shared/schema.ts:1916-1919       | Three indexes added: `(userId, taskId)`, `(tenantId)`, `(campaignId)`                  |

### PARTIALLY FIXED (1 of 18)

```
SEVERITY: CRITICAL (downgraded to MEDIUM after fix)
FEATURE: Social Connections
FILE: server/routes/social/social-routes.ts:662-673
ISSUE: Instagram webhook signature verification — now enforced (missing → 400, invalid → 403), but verifyWebhookSignature receives parsed req.body instead of raw body buffer. JSON re-serialization may not match Meta's signature.
IMPACT: Legitimate webhooks could be falsely rejected in production if JSON key ordering or whitespace differs.
FIX: Use express raw body middleware to capture the original request buffer and pass it to verifyWebhookSignature.
```

### NOT FIXED (1 of 18)

```
SEVERITY: CRITICAL
FEATURE: Program Builder
FILE: client/src/pages/creator-dashboard/program-builder.tsx:109
ISSUE: fetchApi().json() double-parse bug was reported but the file I'm checking shows this WAS actually fixed — the current code no longer chains .json(). Marking as FIXED.
```

**Correction after re-verification:** All 18 original CRITICAL issues are either FIXED (16) or PARTIALLY FIXED (2). None remain fully NOT FIXED.

---

## ORIGINAL HIGH ISSUES — Status After PR

### FIXED (17 of 30)

| #   | Issue                                            | Evidence                                                     |
| --- | ------------------------------------------------ | ------------------------------------------------------------ |
| 1   | createManualReview UUID→number casts             | String IDs passed directly; schema now varchar               |
| 2   | Missing Drizzle relations for manualReviewQueue  | `manualReviewQueueRelations` defined with all 5 relations    |
| 3   | Review queue integer-to-text cast                | Schema now varchar, `::text` casts are harmless no-ops       |
| 4   | No pointTransactions on direct completion        | Now creates `rewardDistributions` record in same transaction |
| 5   | Catalog r.deleted_at IS NULL                     | Changed to `r.is_active = TRUE`                              |
| 6   | Shipping address field name mismatch             | Zod schema and frontend now aligned                          |
| 7   | User history filters by user_id                  | Now uses `rr.fan_id`                                         |
| 8   | r.redemption_instructions doesn't exist          | Reference removed                                            |
| 9   | addCompletedTask TOCTOU race                     | Atomic JSONB append with dedup WHERE guard                   |
| 10  | claimRewards double-claim                        | Atomic `WHERE rewardsClaimedAt IS NULL` pattern              |
| 11  | loyaltyPrograms phantom taskCompletions relation | Removed from loyaltyProgramsRelations                        |
| 12  | Particle callback no rate limiting               | `authRateLimiter` middleware added                           |
| 13  | Reputation uses walletAddress                    | Now uses `avalancheL1Address` with fallback                  |
| 14  | Multiplier privilege escalation                  | Requires `fandomly_admin` for platform-wide multipliers      |
| 15  | fetchApi().json() double-parse                   | Fixed — no longer chains .json()                             |
| 16  | Reward management bare catch {} (2 of 3)         | 2 catch blocks now log errors                                |
| 17  | Badge uses walletAddress (badge-routes)          | All references now use `avalancheL1Address`                  |

### PARTIALLY FIXED (4 of 30)

```
SEVERITY: HIGH (downgraded to MEDIUM)
FEATURE: Task Completion
FILE: server/services/verification/unified-verification.ts:582-586
ISSUE: 'rejected'/'pending_review' statuses used but schema comment still documents only 'in_progress'|'completed'|'claimed'. No enum enforcement.
STATUS: PARTIALLY FIXED — values work at runtime (text column), but documentation/contract is outdated.
FIX: Update schema comment or add pgEnum.
```

```
SEVERITY: HIGH (downgraded to MEDIUM)
FEATURE: Schema Integrity
FILE: shared/schema.ts:2319 vs 2296
ISSUE: users ↔ tenants relationName disambiguation. usersRelations.ownedTenants has relationName: 'ownedTenants', but tenantsRelations.owner does NOT declare matching relationName. Drizzle requires both sides.
STATUS: PARTIALLY FIXED — one side has the name, other side missing it.
FIX: Add relationName: 'ownedTenants' to tenantsRelations.owner.
```

```
SEVERITY: HIGH (downgraded to MEDIUM)
FEATURE: Rewards
FILE: server/routes/rewards/redemption-routes.ts:310
ISSUE: Per-user limit check still queries user_id, missing records from old redeemRewardAtomic path that only set fanId.
STATUS: PARTIALLY FIXED — new path sets both fields, but query still uses user_id.
FIX: Change to fan_id in the per-user limit query.
```

```
SEVERITY: HIGH (downgraded to MEDIUM)
FEATURE: Auth / Token Refresh
FILE: server/services/auth/token-refresh.ts:37
ISSUE: YouTube background refresh still uses GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET. Interactive path fixed via youtube-auth.ts but TokenRefreshService._doRefreshToken still uses wrong env vars.
STATUS: PARTIALLY FIXED — interactive path works, background refresh broken.
FIX: Update PLATFORM_CONFIGS.youtube to use GOOGLE_YOUTUBE_CLIENT_ID/SECRET.
```

### NOT FIXED (9 of 30)

```
SEVERITY: HIGH
FEATURE: Task Verification
FILE: server/services/verification/unified-verification.ts:330-341
ISSUE: twitter_quote_tweet tasks always return verified: false with requiresManualReview: false. Tasks immediately rejected with no verification mechanism.
IMPACT: Fans who attempt twitter_quote_tweet tasks always get rejected. Task type is effectively impossible.
FIX: Route to Twitter verifier or set requiresManualReview: true.
```

```
SEVERITY: HIGH
FEATURE: Task Completion
FILE: server/routes/tasks/task-completion-routes.ts:554-564
ISSUE: Fan program lookup by fanId + tenantId but NOT programId. Updates ALL matching fan programs under the tenant.
IMPACT: Points awarded to all programs a fan joined under the tenant, not just the relevant one.
FIX: Add eq(fanPrograms.programId, task.programId) to WHERE clause.
```

```
SEVERITY: HIGH
FEATURE: Campaign Creation
FILE: client/src/pages/creator-dashboard/campaign-builder-new.tsx:414-424
ISSUE: Gating requirements nested under 'requirements' wrapper, server expects top-level. requiredPreviousCampaigns vs prerequisiteCampaigns field name mismatch.
IMPACT: All gating requirements silently dropped. Campaign gating non-functional.
FIX: Send as top-level fields, rename to prerequisiteCampaigns.
```

```
SEVERITY: HIGH
FEATURE: Campaign Sponsors
FILE: client/src/hooks/useCampaignBuilder.ts:138-143
ISSUE: GET /api/campaigns/:campaignId/sponsors returns { sponsors: [...] } but hook expects flat array.
IMPACT: Builder always shows 0 sponsors when loading existing data.
FIX: Change route to return flat array or hook to extract .sponsors.
```

```
SEVERITY: HIGH
FEATURE: Campaign Task Assignment
FILE: server/services/campaigns/campaign-engine.ts
ISSUE: enforceSequentialTasks flag stored but never used server-side. Builder never populates dependsOnTaskIds.
IMPACT: Sequential order toggle non-functional.
FIX: Auto-generate dependsOnTaskIds at publish time.
```

```
SEVERITY: HIGH
FEATURE: NFT Redemption
FILE: server/routes/rewards/redemption-routes.ts:298-340
ISSUE: NFT minting happens outside transaction. Points spent but user gets no NFT if minting fails. No retry mechanism.
IMPACT: Users can lose points with no NFT delivered.
FIX: Implement retry queue or set status to 'pending_nft'.
```

```
SEVERITY: HIGH
FEATURE: Dual Redemption Endpoints
FILE: redemption-routes.ts vs reward-management-routes.ts
ISSUE: Two separate redemption endpoints with different logic, point stores, and validation.
IMPACT: Data integrity issues depending on which endpoint frontend uses.
FIX: Deprecate old endpoint, route all through new one.
```

```
SEVERITY: HIGH
FEATURE: Auth
FILE: server/services/auth/particle-auth-service.ts vs google-auth.ts
ISSUE: Inconsistent onboardingState shapes between Particle and Google auth.
IMPACT: Frontend can't reliably read onboarding state across auth providers.
FIX: Standardize shape.
```

```
SEVERITY: HIGH
FEATURE: Schema Integrity
FILE: shared/schema.ts:2334
ISSUE: users ↔ agencies missing relationName disambiguation. Both agency (one) and ownedAgencies (many) defined without names.
IMPACT: Drizzle ambiguous relation error on relational queries involving agencies.
FIX: Add relationName to both sides.
```

---

## NEW ISSUES INTRODUCED BY PR #55

### NEW CRITICAL (2)

```
SEVERITY: CRITICAL
FEATURE: Manual Review (task-routes.ts)
FILE: server/routes/tasks/task-routes.ts:1317,1332,1367,1382
ISSUE: Number(reviewId) converts UUID string to NaN, then queries manualReviewQueue.id (varchar PK). eq(manualReviewQueue.id, NaN) never matches. Same bug at lines 1332 and 1382 for approve/reject calls.
IMPACT: /api/manual-review/:reviewId/approve and /api/manual-review/:reviewId/reject in task-routes.ts are COMPLETELY NON-FUNCTIONAL — always return "Review not found". (The equivalent endpoints in review-routes.ts work correctly.)
FIX: Remove Number() casts. Pass reviewId as string directly. Also remove "as unknown as number" casts on userId.
```

```
SEVERITY: CRITICAL
FEATURE: NFT Rewards (Redemption)
FILE: server/routes/rewards/redemption-routes.ts:457,528
ISSUE: nftMints insert uses status: 'completed' but nftMintStatusEnum only allows ['pending', 'processing', 'success', 'failed']. The 'as any' cast bypasses TypeScript, but PostgreSQL CHECK constraint rejects the value at runtime.
IMPACT: All NFT and badge reward redemptions that successfully mint will crash on the DB insert, losing the mint record. Points already deducted. User has the NFT on-chain but no DB record — orphaned mint.
FIX: Change status: 'completed' to status: 'success' at both lines.
```

### NEW HIGH (2)

```
SEVERITY: HIGH
FEATURE: NFT Rewards (Redemption)
FILE: server/routes/rewards/redemption-routes.ts:380-385
ISSUE: NFT minting during reward redemption reads users.walletAddress (old Dynamic Labs) instead of users.avalancheL1Address. badge-routes.ts was migrated to avalancheL1Address, but redemption-routes.ts was NOT.
IMPACT: Users with only avalancheL1Address (Particle Network) see "no wallet" and NFT is deferred. Users with old walletAddress get NFT minted to wrong chain address.
FIX: Change users.walletAddress to users.avalancheL1Address (with walletAddress fallback) at line 380.
```

```
SEVERITY: HIGH
FEATURE: Token Refresh (Regression)
FILE: server/services/auth/token-refresh.ts:136
ISSUE: PR #55 fixed token storage by encrypting via encryptToken() before DB insert (social-routes.ts:1652). But TokenRefreshService._doRefreshToken reads connection.refreshToken raw from DB (line 136) and sends encrypted blob to OAuth providers without decrypting.
IMPACT: All background token refreshes for platforms using the encrypted socialConnections table will fail. Tokens expire and are never refreshed — social verification and sync break silently after token expiry.
FIX: Add safeDecryptToken(connection.refreshToken) call before using the token in the refresh request.
```

### NEW MEDIUM (4)

```
SEVERITY: MEDIUM
FEATURE: Manual Review
FILE: server/routes/tasks/review-routes.ts:66,164,249
ISSUE: Stale SQL ::text casts and comments saying "integer in legacy schema" — columns are now varchar. Casts are harmless no-ops but misleading.
FIX: Replace raw SQL with eq() calls and remove legacy comments.
```

```
SEVERITY: MEDIUM
FEATURE: Task Status Contract
FILE: shared/schema.ts:1845
ISSUE: taskCompletions.status comment still documents 'in_progress'|'completed'|'claimed' but code uses 'rejected' and 'pending_review'. No pgEnum enforcement.
FIX: Update comment to include all used statuses, or add pgEnum.
```

```
SEVERITY: MEDIUM
FEATURE: Duplicate API Endpoints
FILE: server/routes/tasks/task-routes.ts:1260-1396
ISSUE: Duplicate manual review endpoints exist in both task-routes.ts and review-routes.ts. The task-routes versions have the Number() casting bug (NEW CRITICAL above). Creates confusion about which to use.
FIX: Remove broken duplicates from task-routes.ts or fix the Number() casts.
```

```
SEVERITY: MEDIUM
FEATURE: Campaign Engine
FILE: server/services/campaigns/campaign-engine.ts:648,686
ISSUE: Wallet fallback in campaign rewards prefers deprecated walletAddress over avalancheL1Address.
FIX: Prefer avalancheL1Address, fall back to walletAddress.
```

### NEW LOW (2)

```
SEVERITY: LOW
FEATURE: Task Completion
FILE: server/routes/tasks/task-completion-routes.ts:605-606
ISSUE: Stale comment says 'check_in' is not in the task type enum — it now is (schema.ts:1213). No type check on the check-in endpoint.
FIX: Add task type validation and remove stale comment.
```

```
SEVERITY: LOW
FEATURE: Schema
FILE: shared/schema.ts:2563
ISSUE: Comment still says "programId and campaignId don't exist on task_completions table" — campaignId DOES exist (line 2906).
FIX: Correct the comment.
```

---

## ORIGINAL MEDIUM ISSUES — Status After PR

### FIXED (5 of 38)

| Issue                                            | Evidence                             |
| ------------------------------------------------ | ------------------------------------ |
| fetchApi().json() double-parse                   | Fixed — no longer chains .json()     |
| manualReviewQueue relations missing              | manualReviewQueueRelations defined   |
| Shipping address mismatch (also counted as HIGH) | Aligned between frontend and backend |
| loyaltyPrograms phantom taskCompletions relation | Removed                              |
| Program builder fetchApi double-parse            | Fixed                                |

### NOT FIXED (31 of 38)

The following MEDIUM issues from the original audit were **not addressed** in PR #55:

- Task verification: getVerificationMethod returns 'manual' for API-verified platforms
- Task verification: awardPoints finds program by tenantId not programId
- Dual points awarding paths (unified-verification vs task-completion-routes)
- Campaign: joinCampaign concurrent 500 (no UNIQUE violation handling)
- Campaign: checkBadgeOwnership stub always passes
- Campaign: completionPercentage uses total tasks not required
- Campaign: completionBonusRewards type mismatches
- Campaign: Active campaigns allow rule modification
- Campaign: No unique constraint on (campaignId, taskId) for task assignments
- Campaign: dependsOnTaskIds not validated (cycles, invalid IDs)
- Campaign: Deferred verification auto-approves without checking
- Redemption: No conditional point deduction (WHERE >= cost)
- Redemption: Stock not restored on cancel/refund
- Redemption: canAfford computed against stale balance
- Badge: totalIssued read-then-write race condition
- Badge: requirementType schema comment vs handler mismatch
- Platform points: read-then-write race condition
- Platform points: spendPoints double-counts
- Creator points: getBalance re-sums transactions
- Multipliers: stackingType/canStackWithOthers ignored
- Social: Debug endpoints expose tokens in production
- Social: Webhook test leaks verify token
- Social: No TikTok token refresh flow
- Social: No Facebook OAuth flow
- Social: Kick/Patreon soft-delete not filtered in GET
- Auth: Google open redirect on redirect_uri
- Auth: Google tokens stored in plaintext
- Auth: Forgeable pending link IDs (base64url)
- Auth: JWT_AUDIENCE defaults to 'crossmint'
- Program builder: Publish without save
- Schema: rewardRedemptions.programId no FK
- Schema: campaigns → taskCompletions missing inverse one() relation
- Schema: Incorrect comment re campaignId

### REGRESSED (1)

```
SEVERITY: MEDIUM → HIGH (escalated due to regression)
FEATURE: Token Refresh
FILE: server/services/auth/token-refresh.ts:136
ISSUE: PR #55 added token encryption on storage (fixing original CRITICAL #15) but did NOT add corresponding decryption in TokenRefreshService. Background refresh now sends encrypted blobs to OAuth providers.
IMPACT: All platform token refreshes fail after the fix. Social verification and sync break silently after token expiry.
STATUS: REGRESSED — was "not working" before (missing tokens), now "actively broken" (encrypted garbage sent to OAuth providers).
```

---

## Summary Scorecard

### Fix Coverage by Severity

| Original Severity | Total  | Fixed  | Partial | Not Fixed | Regressed |
| ----------------- | ------ | ------ | ------- | --------- | --------- |
| CRITICAL          | 18     | 16     | 2       | 0         | 0         |
| HIGH              | 30     | 17     | 4       | 9         | 0         |
| MEDIUM            | 38     | 5      | 2       | 30        | 1         |
| **Total**         | **86** | **38** | **8**   | **39**    | **1**     |

### New Issues Introduced

| Severity  | Count  |
| --------- | ------ |
| CRITICAL  | 2      |
| HIGH      | 2      |
| MEDIUM    | 4      |
| LOW       | 2      |
| **Total** | **10** |

### Remaining Risk Profile

| Severity | Still Open (Not Fixed + Partial + New)                         |
| -------- | -------------------------------------------------------------- |
| CRITICAL | 4 (2 original partial + 2 new)                                 |
| HIGH     | 15 (9 original + 4 partial→medium + 2 new)                     |
| MEDIUM   | 38 (30 original + 4 new + 2 partial + 1 regressed + 1 new low) |

---

## Recommended Immediate Fixes (Before Human Testing)

### Patch 1 — New CRITICALs (30 min)

1. **`task-routes.ts:1317,1332,1367,1382`** — Remove `Number()` casts on reviewId and `as unknown as number` on userId. Pass strings directly.
2. **`redemption-routes.ts:457,528`** — Change `status: 'completed'` to `status: 'success'` for nft_mints inserts.

### Patch 2 — New HIGHs (1 hr)

3. **`redemption-routes.ts:380`** — Change `users.walletAddress` to `users.avalancheL1Address` for NFT minting.
4. **`token-refresh.ts:136`** — Add `safeDecryptToken()` call before using `connection.refreshToken` in refresh requests. Also add `safeDecryptToken()` for `connection.accessToken`.

### Patch 3 — Remaining Original HIGHs (2 hr)

5. **`task-completion-routes.ts:554-564`** — Add `eq(fanPrograms.programId, task.programId)` to WHERE clause.
6. **`unified-verification.ts:330-341`** — Route twitter_quote_tweet to manual review or Twitter verifier.
7. **`campaign-builder-new.tsx:414-424`** — Fix gating requirements: send as top-level, rename to prerequisiteCampaigns.
