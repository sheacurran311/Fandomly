# Fandomly Full-Stack Connectivity & Runtime Audit Report

**Date:** March 5, 2026
**Scope:** Static analysis + logical trace across all user-facing flows
**Method:** End-to-end path tracing: UI component → API call → route handler → service/storage → DB query → schema column

---

## Executive Summary

| Severity     | Count   |
| ------------ | ------- |
| **CRITICAL** | 18      |
| **HIGH**     | 30      |
| **MEDIUM**   | 38      |
| **LOW**      | 21      |
| **Total**    | **107** |

The audit found **18 critical issues** that will cause immediate runtime failures, data corruption, or security bypasses when users interact with the platform. The most dangerous clusters are:

1. **Manual Review Queue** — entirely non-functional due to integer/varchar schema mismatch
2. **Rewards Store** — broken at multiple layers (missing `fanId`, unreachable routes, field name mismatches)
3. **Badge System** — all badge claims fail due to wrong enum values and missing columns
4. **Auth** — Particle verification bypass allows unauthenticated account creation
5. **Race Conditions** — multiple financial operations (redemptions, points) vulnerable to concurrent exploitation

---

## CRITICAL Issues (18)

### Task Lifecycle

```
SEVERITY: CRITICAL
FEATURE: Task Building
FILE: server/routes/tasks/task-routes.ts:99
ISSUE: Zod schema uses taskType 'checkin' but DB enum (shared/schema.ts:1205) uses 'check_in'. The discriminated union validates 'checkin', which passes Zod but fails on DB insert with PostgreSQL enum violation.
IMPACT: Creators cannot create check-in tasks — POST /api/tasks returns 500 on every attempt.
FIX: Change z.literal('checkin') to z.literal('check_in') on line 99. Also update the selfManagedTypes array on line 290 from 'checkin' to 'check_in'.
```

```
SEVERITY: CRITICAL
FEATURE: Task Building
FILE: server/routes/tasks/task-routes.ts:143
ISSUE: The Twitter task Zod schema includes 'twitter_reply' as valid, but this value does not exist in taskTypeEnum in shared/schema.ts. Passes Zod but fails on DB insert.
IMPACT: Creators selecting Twitter Reply task type get a 500 error on save.
FIX: Either add 'twitter_reply' to taskTypeEnum in shared/schema.ts, or remove it from the Zod enum.
```

```
SEVERITY: CRITICAL
FEATURE: Task Review
FILE: server/services/verification/unified-verification.ts:914-920
ISSUE: rejectManualReview sets taskCompletions.status to 'completed' and verifiedAt to new Date() — identical to the approve logic. Rejected tasks are marked as successfully completed.
IMPACT: When a creator rejects a fan's submission, the fan sees it as "completed" and "verified". No way to distinguish approved from rejected.
FIX: Change line 917 from status: 'completed' to status: 'rejected' and remove verifiedAt: new Date().
```

```
SEVERITY: CRITICAL
FEATURE: Task Review
FILE: server/routes/tasks/review-routes.ts:267
ISSUE: Direct approval path (when no review queue entry exists) has a "// TODO: Award points" comment. Points are NEVER awarded in this code path.
IMPACT: Fans get zero points on some approvals despite task showing as "completed". Silent data loss.
FIX: Call unifiedVerification.awardPoints() or replicate the CreatorPointsService logic in this code path.
```

```
SEVERITY: CRITICAL
FEATURE: Task Review / Schema Integrity
FILE: shared/schema.ts:1941-1977
ISSUE: manualReviewQueue table uses integer types for taskCompletionId, tenantId, creatorId, fanId, taskId, and reviewedBy — but all referenced tables use varchar (UUID) primary keys. No FK constraints defined.
IMPACT: The entire manual review system is broken at the data layer. UUID strings cast to integers produce garbage/errors. JOINs never match.
FIX: Migrate all six columns from integer to varchar and add proper .references() calls.
```

### Campaign System

```
SEVERITY: CRITICAL
FEATURE: Campaign Creation
FILE: client/src/pages/creator-dashboard/campaign-builder-new.tsx:2
ISSUE: useState is never imported — line 2 imports only useEffect from 'react', but useState is used 15+ times. Confirmed by TypeScript compiler: "Cannot find name 'useState'" (15+ errors).
IMPACT: The campaign builder component fails to compile. Creators cannot create or edit campaigns.
FIX: Change line 2 to: import { useEffect, useState } from 'react';
```

### Rewards & Redemption

```
SEVERITY: CRITICAL
FEATURE: Redemption Flow
FILE: server/routes/rewards/redemption-routes.ts:324-336
ISSUE: Insert into rewardRedemptions sets userId but NOT the required fanId column. Schema declares fanId as .notNull() (shared/schema.ts:974-976). Insert uses 'as any' bypassing TypeScript.
IMPACT: Every call to POST /api/rewards/redeem throws NOT NULL constraint violation on fan_id. Transaction rolls back — no data corruption, but the entire redemption endpoint is non-functional.
FIX: Add fanId: userId to the .values({...}) object at line 326.
```

```
SEVERITY: CRITICAL
FEATURE: Redemption Flow
FILE: server/routes/rewards/redemption-routes.ts:793-848
ISSUE: GET /api/rewards/redemptions/pending is registered AFTER GET /api/rewards/redemptions/:redemptionId (line 635). Express matches in registration order, so "pending" is captured as :redemptionId.
IMPACT: Creators can never see their pending redemptions queue. Returns "Redemption not found" (404).
FIX: Move the /pending route registration BEFORE the /:redemptionId route.
```

```
SEVERITY: CRITICAL
FEATURE: Reward Store
FILE: client/src/pages/fan-dashboard/rewards-store.tsx:74-76 vs server/routes/rewards/redemption-routes.ts:126
ISSUE: Frontend reads catalogData?.userPoints but backend returns userBalance. Field name mismatch.
IMPACT: Fan's point balance always shows 0 in the Rewards Store, even with thousands of points. All canAfford checks fail.
FIX: Rename backend field from userBalance to userPoints, or update frontend to read userBalance.
```

```
SEVERITY: CRITICAL
FEATURE: Reward Store
FILE: client/src/pages/fan-dashboard/rewards-store.tsx:125-131
ISSUE: Frontend calls GET /api/rewards/catalog without passing programId. Backend only fetches user's point balance when programId is provided. Without it, userBalance stays 0.
IMPACT: All rewards show as unaffordable. The entire reward store is non-functional from the fan's perspective.
FIX: Frontend must pass programId as a query parameter, or backend should auto-resolve it.
```

### NFT & Badge System

```
SEVERITY: CRITICAL
FEATURE: Badge Templates
FILE: server/routes/blockchain/badge-routes.ts:130,218,268,412,526
ISSUE: Raw SQL queries filter by nm.status = 'completed' and insert sets status: 'completed', but nftMintStatusEnum (shared/schema.ts:3050) only allows ['pending', 'processing', 'success', 'failed']. 'completed' is not in the enum.
IMPACT: All badge claims fail with a DB CHECK constraint violation. Badge listing queries always return zero rows.
FIX: Change all occurrences of 'completed' to 'success'.
```

```
SEVERITY: CRITICAL
FEATURE: Badge Templates
FILE: server/routes/blockchain/badge-routes.ts:98,423
ISSUE: Badge routes read users.walletAddress (old Dynamic Labs wallet) while blockchain-routes.ts correctly uses users.avalancheL1Address (Fandomly Chain). Per architecture notes, Dynamic Labs is replaced with Particle Network.
IMPACT: Users with only avalancheL1Address see "No wallet address connected" and cannot claim badges. Users with old walletAddress get badges minted to the wrong chain.
FIX: Change users.walletAddress to users.avalancheL1Address at lines 98 and 423.
```

```
SEVERITY: CRITICAL
FEATURE: Badge Templates
FILE: server/routes/blockchain/badge-routes.ts:118,131,207,219
ISSUE: Raw SQL queries reference nm.minted_at but nftMints table has no minted_at column. Available columns: started_at, completed_at, created_at.
IMPACT: GET /api/badges/my-badges and GET /api/badges/user/:userId throw PostgreSQL error: "column nm.minted_at does not exist". These endpoints are completely broken.
FIX: Replace nm.minted_at with nm.completed_at (or nm.created_at) in all four queries.
```

### Auth

```
SEVERITY: CRITICAL
FEATURE: Auth
FILE: server/services/auth/particle-auth-service.ts:126-137
ISSUE: When verifyWalletIsProjectUser returns false, the service logs a warning but ALLOWS login anyway. The particleUuid comes from the client and can be fabricated.
IMPACT: Complete auth bypass. An attacker can POST to /api/auth/particle/callback with any walletAddress and fake particleUuid to receive a valid Fandomly JWT.
FIX: Return { success: false } when isProjectUser is false. If race conditions with Particle propagation exist, implement a short retry loop.
```

### Social Connections

```
SEVERITY: CRITICAL
FEATURE: Social Connections
FILE: server/routes/social/social-routes.ts:1546
ISSUE: POST /api/social/connect does NOT store accessToken or refreshToken in the socialConnections table. The connectionData only writes platformUserId, platformUsername, platformDisplayName, profileData — tokens are omitted.
IMPACT: For 8 of 10 platforms connected through this endpoint, the DB has NULL tokens. Downstream verification and sync features silently fail.
FIX: Pass accessToken/refreshToken (encrypted via encryptToken()) into connectionData.
```

```
SEVERITY: CRITICAL
FEATURE: Social Connections
FILE: server/routes/social/social-routes.ts:634-649
ISSUE: Instagram webhook signature verification is disabled. Invalid/missing signatures are logged but processed.
IMPACT: Attacker can POST forged webhook payloads to /webhooks/instagram, falsely completing fan tasks or manipulating verification state.
FIX: Enforce signature verification: return 403 on invalid, 400 on missing. Remove "temporarily disabled" bypasses.
```

### Program Builder

```
SEVERITY: CRITICAL
FEATURE: Program Builder
FILE: client/src/pages/creator-dashboard/program-builder.tsx:109
ISSUE: fetchApi() already returns parsed JSON, but .json() is called again. Throws "response.json is not a function" at runtime.
IMPACT: Campaigns and tasks lists in the Program Builder never load. Same bug exists on line 121.
FIX: Replace await (response as any).json() with just response.
```

### Schema Integrity

```
SEVERITY: CRITICAL
FEATURE: Schema Integrity
FILE: shared/schema.ts:1820-1905
ISSUE: taskCompletions table has ZERO indexes defined. This table is queried on every task verification by userId + taskId, by tenantId, and by campaignId.
IMPACT: Every "has this user completed this task?" lookup does a full sequential scan. At scale, task verification takes 100ms+ instead of <1ms.
FIX: Add indexes: (userId, taskId) compound index, plus tenantId and campaignId individual indexes.
```

---

## HIGH Issues (30)

### Task Lifecycle

```
SEVERITY: HIGH
FEATURE: Task Building
FILE: client/src/components/tasks/TaskTemplateSelector.tsx:123-130
ISSUE: TaskTemplateType union includes social_follow, social_like, social_share, social_comment, stream_code_verify, custom_event — none exist in DB taskTypeEnum or Zod validation. stream_code_verify renders a full builder form but always fails submission.
IMPACT: Selecting these task types fails at server validation. The stream_code_verify builder is misleading.
FIX: Add Zod schemas and DB enum values, or mark as 'coming_soon' and remove the builder.
```

```
SEVERITY: HIGH
FEATURE: Task Completion
FILE: server/services/verification/unified-verification.ts:643-659
ISSUE: createManualReview casts varchar/UUID IDs to number via 'as unknown as number'. manualReviewQueue defines these columns as integer. Inserting UUID strings into integer columns fails.
IMPACT: Any task requiring manual review crashes with a database type error. The fan sees a 500.
FIX: Fix the schema (integer → varchar) first, then remove the casts.
```

```
SEVERITY: HIGH
FEATURE: Task Completion
FILE: server/services/verification/unified-verification.ts:582-586
ISSUE: Task completion status set to 'rejected' or 'pending_review' — neither is documented in schema's status comment ('in_progress' | 'completed' | 'claimed'). Column is text (no enum enforcement).
IMPACT: Client code may not handle these undocumented statuses, showing incorrect UI states.
FIX: Add 'rejected' and 'pending_review' to documented values or use a pgEnum.
```

```
SEVERITY: HIGH
FEATURE: Task Verification
FILE: server/services/verification/twitter-verification.ts:44-51
ISSUE: Twitter verification requires TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_BEARER_TOKEN. When not set, creates TwitterApi with empty bearer — causes cryptic 401 errors.
IMPACT: Twitter verification silently fails with unhelpful errors when API keys not configured.
FIX: Check this.isConfigured() at start of verify() and return { verified: false, requiresManualReview: true, reason: 'Twitter API not configured' }.
```

```
SEVERITY: HIGH
FEATURE: Task Verification
FILE: server/services/verification/unified-verification.ts:330-341
ISSUE: Tasks with 'quote' in taskType always return verified: false with "Quote tweet verification pending" — no follow-up mechanism.
IMPACT: twitter_quote_tweet tasks are permanently stuck as unverified.
FIX: Route twitter_quote_tweet to the Twitter platform verifier which already handles it.
```

```
SEVERITY: HIGH
FEATURE: Task Review
FILE: server/routes/tasks/review-routes.ts:63-72
ISSUE: GET endpoint uses with: { task: true, taskCompletion: true } for eager loading, but no Drizzle relations are defined for manualReviewQueue in schema.ts.
IMPACT: GET /api/creators/:creatorId/review-queue crashes with "Relation not found", making creator review UI non-functional.
FIX: Define Drizzle relations for manualReviewQueue in shared/schema.ts.
```

```
SEVERITY: HIGH
FEATURE: Task Review
FILE: server/routes/tasks/review-routes.ts:244-246
ISSUE: Review queue lookup casts integer taskCompletionId to text and compares with UUID string. If UUIDs were stored corrupted, this comparison never matches.
IMPACT: Review queue lookup silently fails, falling through to the direct approval path (which doesn't award points).
FIX: Fix the underlying schema mismatch first.
```

### Campaign System

```
SEVERITY: HIGH
FEATURE: Campaign Creation
FILE: client/src/pages/creator-dashboard/campaign-builder-new.tsx:414-424
ISSUE: Gating requirements nested under requirements wrapper object, but server reads them as top-level fields. Client uses requiredPreviousCampaigns, server expects prerequisiteCampaigns.
IMPACT: All gating requirements silently dropped. Campaign gating is completely non-functional.
FIX: Send prerequisiteCampaigns, requiredBadgeIds, requiredNftCollectionIds as top-level fields.
```

```
SEVERITY: HIGH
FEATURE: Campaign Join
FILE: client/src/hooks/useCampaignBuilder.ts:138-143
ISSUE: GET /api/campaigns/:campaignId/sponsors returns { sponsors: [...] } (object wrapper), but useCampaignSponsors expects flat CampaignSponsor[] array.
IMPACT: Builder always shows 0 sponsors when loading existing campaign data.
FIX: Change route to res.json(sponsors) or change hook to extract .sponsors.
```

```
SEVERITY: HIGH
FEATURE: Campaign Task Assignment
FILE: server/services/campaigns/campaign-engine.ts:821-848
ISSUE: addCompletedTask has TOCTOU race condition — reads tasksCompleted array, checks, writes. Two concurrent completions can overwrite each other.
IMPACT: Under concurrent requests, a task completion can be silently lost from the tasksCompleted array.
FIX: Use atomic SQL operation: UPDATE with array_append and WHERE guard.
```

```
SEVERITY: HIGH
FEATURE: Campaign Task Assignment
FILE: server/services/campaigns/campaign-engine.ts + campaign-builder-new.tsx:166-168
ISSUE: enforceSequentialTasks flag is stored but NEVER used server-side. Builder never populates dependsOnTaskIds when toggle is enabled.
IMPACT: "Enforce Sequential Order" toggle is completely non-functional.
FIX: Auto-generate sequential dependsOnTaskIds at publish time when enforceSequentialTasks is true.
```

```
SEVERITY: HIGH
FEATURE: Campaign Completion Bonus
FILE: server/services/campaigns/campaign-engine.ts:567-767
ISSUE: claimRewards reads rewardsClaimedAt, processes rewards, then sets it. No atomic guard. Two concurrent calls both pass the null-check.
IMPACT: Rewards (NFTs, raffle entries, bonus points) can be double-claimed. Financial loss for creator.
FIX: Use atomic UPDATE: UPDATE campaign_participations SET rewards_claimed_at = NOW() WHERE id = $1 AND rewards_claimed_at IS NULL RETURNING id.
```

### Rewards & Redemption

```
SEVERITY: HIGH
FEATURE: Reward Store
FILE: server/routes/rewards/redemption-routes.ts:72
ISSUE: Catalog query references r.deleted_at IS NULL, but rewards table has no deleted_at column (only isActive).
IMPACT: After drizzle-kit push, catalog endpoint throws "column r.deleted_at does not exist" — returns 500 for all users.
FIX: Change condition to only check r.is_active = TRUE.
```

```
SEVERITY: HIGH
FEATURE: Redemption Flow
FILE: server/routes/rewards/redemption-routes.ts:37-46
ISSUE: Shipping address field names mismatch: frontend sends fullName/addressLine1/stateProvince, backend Zod validates name/street/state.
IMPACT: Physical reward redemptions always fail with 400 "Invalid request data".
FIX: Align field names between frontend and backend.
```

```
SEVERITY: HIGH
FEATURE: Redemption Flow
FILE: server/routes/rewards/redemption-routes.ts:90 vs shared/schema.ts:977
ISSUE: Catalog raw SQL uses rr.user_id to count redemptions, but redeemRewardAtomic in storage.ts populates fanId but NOT userId. Redemption count/history queries miss records.
IMPACT: Per-user redemption limits don't work reliably — users could exceed maxPerUser limit.
FIX: All queries should use fan_id consistently.
```

```
SEVERITY: HIGH
FEATURE: Redemption Flow
FILE: server/routes/rewards/redemption-routes.ts:583-585
ISSUE: GET /api/rewards/redemptions (user history) filters by rr.user_id, but some records only have fanId set.
IMPACT: Incomplete or empty redemption history for users.
FIX: Use rr.fan_id in the query, or ensure both columns are always populated.
```

```
SEVERITY: HIGH
FEATURE: Redemption Flow
FILE: server/routes/rewards/redemption-routes.ts:298-340 (NFT section)
ISSUE: NFT minting at lines 346-560 happens OUTSIDE the transaction. If transaction succeeds but NFT mint fails, points are spent but user has no NFT. No retry mechanism.
IMPACT: Users can lose points with no NFT delivered and no path to resolution.
FIX: Implement NFT mint retry queue, or set status to 'pending_nft' on mint failure.
```

```
SEVERITY: HIGH
FEATURE: Reward Store
FILE: server/routes/rewards/redemption-routes.ts:649-650
ISSUE: Raw SQL references r.redemption_instructions — column does not exist in rewards table schema.
IMPACT: Single-redemption detail endpoint returns 500 after schema push.
FIX: Remove r.redemption_instructions from SELECT clause or add column to schema.
```

```
SEVERITY: HIGH
FEATURE: Redemption Flow
FILE: server/routes/rewards/redemption-routes.ts vs server/routes/rewards/reward-management-routes.ts
ISSUE: TWO separate redemption endpoints exist that don't share logic — different point stores, validation, insert schemas, NFT handling, and user ID columns.
IMPACT: Completely different behavior depending on which endpoint the frontend hits. Data integrity issues.
FIX: Deprecate one endpoint; route all redemptions through a single code path.
```

### NFT & Badge System

```
SEVERITY: HIGH
FEATURE: Badge Templates
FILE: server/routes/blockchain/badge-routes.ts:519
ISSUE: nftMints requires crossmintActionId as .unique().notNull(). Badge claim generates fake value: fandomly-badge-${Date.now()}-${userId}. Crossmint was removed.
IMPACT: Unique constraint could collide in same-millisecond claims. Semantic debt — column name misleading.
FIX: Use crypto.randomUUID() for uniqueness. Consider making column nullable for non-Crossmint mints.
```

### Points & Reputation

```
SEVERITY: HIGH
FEATURE: Platform Points
FILE: server/services/points/platform-points-service.ts:66-90
ISSUE: PlatformPointsService writes to TWO locations: users.profileData.fandomlyPoints AND platformPointsTransactions. FandomlyPointsService only writes to transactions. Different callers see different balances.
IMPACT: Balance inconsistency — different code paths show different point balances for the same user.
FIX: Pick one source of truth. Prefer deriving balance from transactions table.
```

```
SEVERITY: HIGH
FEATURE: Multipliers
FILE: server/routes/admin/multiplier-routes.ts:61-83
ISSUE: Custom isAdmin() checks if user has 'admin' or 'owner' role in ANY tenant membership. Any tenant admin can create platform-wide multipliers.
IMPACT: Privilege escalation — any tenant admin can affect ALL users across all tenants.
FIX: Use requireFandomlyAdmin middleware for platform-wide multipliers (tenantId=null).
```

```
SEVERITY: HIGH
FEATURE: Reputation
FILE: server/routes/reputation/reputation-routes.ts:341
ISSUE: POST /api/reputation/sync/:userId reads userRecord.walletAddress (old Dynamic Labs) instead of avalancheL1Address.
IMPACT: Reputation sync pushes scores to wrong address or fails entirely for Particle Network users.
FIX: Change to userRecord.avalancheL1Address.
```

### Auth

```
SEVERITY: HIGH
FEATURE: Auth
FILE: server/services/auth/particle-auth-service.ts:229 vs server/services/auth/google-auth.ts:191-196
ISSUE: Inconsistent onboardingState shapes. Particle: { step: 'user_type_selection' }. Google: { currentStep: 0, totalSteps: 5, ... }.
IMPACT: Client code reading onboardingState fields gets undefined for the other auth provider. Incorrect onboarding routing.
FIX: Standardize to one shape across both auth services.
```

```
SEVERITY: HIGH
FEATURE: Auth
FILE: server/routes/auth/particle-routes.ts:32
ISSUE: POST /api/auth/particle/callback has no rate limiting and is unauthenticated.
IMPACT: Combined with the verification bypass, attackers can create unlimited accounts.
FIX: Apply authRateLimiter middleware.
```

```
SEVERITY: HIGH
FEATURE: Auth
FILE: server/services/auth/google-auth.ts:251-273
ISSUE: Pending link IDs encode all data as base64url — no server-side storage or HMAC. Attacker who knows target userId can forge a link ID for account takeover.
IMPACT: Account takeover via forged pending link ID.
FIX: Store pending link data server-side and return only an opaque token.
```

### Social Connections

```
SEVERITY: HIGH
FEATURE: Social Connections
FILE: server/routes/social/social-routes.ts (multiple token endpoints)
ISSUE: Token exchange endpoints (/api/social/twitter/token, tiktok/token, discord/token, etc.) have no authenticateUser middleware.
IMPACT: Anyone who intercepts an OAuth code can exchange it without being authenticated.
FIX: Add authenticateUser middleware to token exchange endpoints.
```

```
SEVERITY: HIGH
FEATURE: Social Connections
FILE: server/routes/social/kick-oauth-routes.ts:329-332 + patreon-oauth-routes.ts:465-469
ISSUE: Kick and Patreon disconnect uses soft-delete (isActive=false), while others use hard-delete. GET /api/social-connections does NOT filter by isActive.
IMPACT: Disconnected Kick/Patreon still appear connected in the UI.
FIX: Add isActive filtering to all GET endpoints, or use hard-delete for all platforms.
```

### Program Builder & Public Page

```
SEVERITY: HIGH
FEATURE: Public Program Page
FILE: server/routes/programs/program-routes.ts:801
ISSUE: loyaltyPrograms.slug has no unique constraint. Publish endpoint does not check for slug collisions.
IMPACT: Two programs with same slug — one becomes unreachable on its public page.
FIX: Add unique index on slug or uniqueness check at publish time.
```

```
SEVERITY: HIGH
FEATURE: Public Program Page
FILE: client/src/pages/program-public.tsx:71
ISSUE: "Enroll" button toggles local state (isEnrolled) but never calls any API. No fanPrograms record created.
IMPACT: Fans think they've enrolled, but enrollment is lost on page refresh. Stats, leaderboard, and point tracking don't work.
FIX: Wire Enroll button to POST /api/programs/:id/enroll that creates a fanPrograms record.
```

### Schema Integrity

```
SEVERITY: HIGH
FEATURE: Schema Integrity
FILE: shared/schema.ts:2375
ISSUE: loyaltyProgramsRelations declares taskCompletions: many(taskCompletions) but taskCompletions has NO programId column and no inverse one() relation.
IMPACT: Drizzle relational query db.query.loyaltyPrograms.findMany({ with: { taskCompletions: true } }) throws runtime error.
FIX: Remove taskCompletions: many(taskCompletions) from loyaltyProgramsRelations. Access via tasks → taskCompletions chain instead.
```

### Cross-Cutting: Race Conditions

```
SEVERITY: HIGH
FEATURE: Race Conditions
FILE: server/routes/rewards/redemption-routes.ts:744-776
ISSUE: Refund operation (status update + point return + transaction record) is NOT in a transaction. Server crash between operations leaves inconsistent state.
IMPACT: Users can permanently lose points or have incomplete audit trail.
FIX: Wrap entire refund in db.transaction().
```

```
SEVERITY: HIGH
FEATURE: Race Conditions
FILE: server/routes/tasks/task-completion-routes.ts:495-546
ISSUE: POST /:completionId/complete performs three critical operations WITHOUT a transaction: status update, reward distribution, points update.
IMPACT: Partial state corruption and potential double-award. Task completes but points never awarded on crash.
FIX: Wrap in db.transaction(). Use conditional updates for idempotency.
```

```
SEVERITY: HIGH
FEATURE: Race Conditions
FILE: server/services/points/platform-points-service.ts:38-80
ISSUE: awardPoints() reads balance, computes new value, then writes back — classic read-then-write race. Two concurrent awards both read same balance.
IMPACT: Platform points silently LOST. Two 500-point awards both read 0, both write 500 instead of 1000.
FIX: Use atomic SQL increment: jsonb_set with inline computation.
```

```
SEVERITY: HIGH
FEATURE: Race Conditions
FILE: server/services/points/points-service.ts:215-239
ISSUE: spendPoints() reads balance, checks sufficient, then decrements. Between read and write, concurrent spend also passes.
IMPACT: Users can spend more creator points than they have. GREATEST(0, ...) prevents negative but means free points.
FIX: Single conditional UPDATE: WHERE current_points >= amount, check row count.
```

### Cross-Cutting: Error Handling

```
SEVERITY: HIGH
FEATURE: Error Handling
FILE: server/routes/rewards/reward-management-routes.ts:39,60,252
ISSUE: Three catch blocks use bare catch {} with no error variable and no console.error.
IMPACT: 500 errors with ZERO server-side logging. Impossible to diagnose production failures.
FIX: Change catch {} to catch (error) { console.error('...', error); }.
```

### Cross-Cutting: Authentication

```
SEVERITY: HIGH
FEATURE: Authentication
FILE: server/routes/rewards/reward-management-routes.ts:241
ISSUE: GET /api/rewards/program/:programId has NO authenticateUser middleware.
IMPACT: Anyone can enumerate all rewards for any program, exposing names, costs, stock levels.
FIX: Add authenticateUser middleware.
```

---

## MEDIUM Issues (38)

### Task Lifecycle

```
SEVERITY: MEDIUM
FEATURE: Task Completion
FILE: server/routes/tasks/task-completion-routes.ts:527-546
ISSUE: Direct completion route updates fanPrograms balance but doesn't insert a pointTransactions record. No audit trail.
IMPACT: Points awarded via direct completion have no transaction history. Breaks audit/expiration/refund logic.
FIX: Insert a pointTransactions record, or delegate to CreatorPointsService.awardPoints().
```

```
SEVERITY: MEDIUM
FEATURE: Task Completion
FILE: server/routes/tasks/task-completion-routes.ts:530-533
ISSUE: Fan program lookup uses fanId + tenantId but NOT programId. Picks first result non-deterministically.
IMPACT: Points credited to wrong program if creator has multiple programs.
FIX: Filter by eq(fanPrograms.programId, task.programId).
```

```
SEVERITY: MEDIUM
FEATURE: Task Verification
FILE: server/services/verification/unified-verification.ts:312-325
ISSUE: Tasks with comment_code or keyword_comment always return verified: false without attempting verification. Separate verify-code endpoint must be called.
IMPACT: Initial completion attempt always fails for code-based comment tasks.
FIX: Document the two-step flow clearly or combine endpoints.
```

```
SEVERITY: MEDIUM
FEATURE: Task Verification
FILE: server/services/verification/unified-verification.ts:818-819
ISSUE: getVerificationMethod returns 'manual' for facebook, spotify, twitch, discord — but all four have dedicated API verification services.
IMPACT: Verification audit logs record incorrect methods.
FIX: Return 'api' for platforms with API verification.
```

```
SEVERITY: MEDIUM
FEATURE: Task Verification
FILE: server/services/verification/unified-verification.ts:760-762
ISSUE: awardPoints finds program using tenantId, takes first result. Wrong program possible in multi-program tenants.
IMPACT: Points attributed to wrong creator/program.
FIX: Use eq(loyaltyPrograms.id, task.programId).
```

```
SEVERITY: MEDIUM
FEATURE: Task Completion (Dual Points)
FILE: unified-verification.ts vs task-completion-routes.ts
ISSUE: Two independent points awarding paths: one inserts transactions + updates balance, the other only updates balance. Both can fire for same completion.
IMPACT: Inconsistent points tracking, incomplete audit trail.
FIX: Consolidate all points through CreatorPointsService.awardPoints().
```

```
SEVERITY: MEDIUM
FEATURE: Task Review
FILE: server/routes/tasks/task-routes.ts:1225-1228
ISSUE: POST /api/manual-review/:reviewId/approve casts userId to number. reviewedBy is integer column. UUID string → integer = garbage data.
IMPACT: "Reviewed by" audit trail contains corrupt reviewer IDs.
FIX: Fix schema (integer → varchar) or change method signature.
```

```
SEVERITY: MEDIUM
FEATURE: Task Types
FILE: shared/schema.ts vs TaskTemplateSelector.tsx
ISSUE: Several DB enum task types (tiktok_duet, tiktok_stitch, youtube_watch, etc.) have no builders or Zod schemas.
IMPACT: Types exist in enum but have no UI creation path.
FIX: Add builders or remove from Zod schemas.
```

### Campaign System

```
SEVERITY: MEDIUM
FEATURE: Campaign Creation
FILE: shared/schema.ts:1330-1336
ISSUE: completionBonusRewards type includes 'points'|'badge'|'nft'|'raffle_entry' but builder sends 'reward'. Types are disjoint.
IMPACT: False sense of type safety.
FIX: Unify type union across schema, builder, and engine.
```

```
SEVERITY: MEDIUM
FEATURE: Campaign Creation
FILE: server/routes/campaigns/campaign-routes-v2.ts:151-222
ISSUE: Campaign update allows modifying ANY field regardless of status. Active campaigns with participants can have rules changed mid-campaign.
IMPACT: Creator can change rewards or gating while fans are participating, affecting fairness.
FIX: Restrict modifiable fields when status === 'active'.
```

```
SEVERITY: MEDIUM
FEATURE: Campaign Join
FILE: server/services/campaigns/campaign-engine.ts:259-307
ISSUE: joinCampaign checks then inserts without handling UNIQUE violation gracefully. Concurrent requests yield raw 500.
IMPACT: Double-click returns "Unknown error" instead of "already joined".
FIX: Catch UNIQUE violation (code 23505) and return friendly response.
```

```
SEVERITY: MEDIUM
FEATURE: Campaign Join
FILE: server/services/campaigns/campaign-engine.ts:862-871
ISSUE: checkBadgeOwnership is a stub — returns true if user has ANY nftDeliveries record, never checks specific badges.
IMPACT: Badge gating completely bypassed.
FIX: Implement actual badge-specific lookup.
```

```
SEVERITY: MEDIUM
FEATURE: Campaign Task Assignment
FILE: server/core/storage.ts:1192-1208
ISSUE: assignTaskToCampaign inserts without unique constraint on (campaignId, taskId). Rapid clicks create duplicates.
IMPACT: Duplicate task assignments inflate counts, confuse progress tracker.
FIX: Add unique index on (campaignId, taskId).
```

```
SEVERITY: MEDIUM
FEATURE: Campaign Task Assignment
FILE: server/routes/campaigns/campaign-routes-v2.ts:401-456
ISSUE: dependsOnTaskIds not validated — referenced IDs may not exist or create circular dependencies.
IMPACT: Invalid dependencies permanently lock tasks.
FIX: Validate IDs exist as active assignments and run cycle detection.
```

```
SEVERITY: MEDIUM
FEATURE: Campaign Completion
FILE: server/services/campaigns/campaign-engine.ts:356-359
ISSUE: completionPercentage divides by total assignments (including optional). 3 required + 2 optional shows 60% max.
IMPACT: Misleading "60% complete" when all required work is done.
FIX: Use requiredAssignments.length as denominator.
```

```
SEVERITY: MEDIUM
FEATURE: Campaign Completion
FILE: server/services/campaigns/campaign-verification.ts:155-178
ISSUE: Deferred verification batch job auto-approves ALL pending tasks without actual API verification.
IMPACT: Zero actual verification in deferred mode.
FIX: Implement platform API calls or flag for manual creator review.
```

### Rewards & Redemption

```
SEVERITY: MEDIUM
FEATURE: Reward Store
FILE: client/src/pages/fan-dashboard/rewards-store.tsx:41-72
ISSUE: Backend catalog returns snake_case column names from raw SQL, but frontend expects camelCase.
IMPACT: Reward cards show missing data — pointsCost, rewardType, imageUrl, stockRemaining all undefined.
FIX: Add column aliases in raw SQL or transform response to camelCase.
```

```
SEVERITY: MEDIUM
FEATURE: Reward Fulfillment
FILE: server/routes/rewards/redemption-routes.ts:744-775
ISSUE: Cancellation/refund refunds points to fanPrograms.currentPoints, but old endpoint deducted from tenantMemberships.memberData.points.
IMPACT: Refund goes to wrong point store, creating phantom points.
FIX: Track which point store was used in metadata; refund to same store.
```

```
SEVERITY: MEDIUM
FEATURE: Reward Fulfillment
FILE: server/routes/rewards/redemption-routes.ts:744-775
ISSUE: Stock NOT restored on cancellation/refund. Only points are returned.
IMPACT: Cancelled redemptions permanently reduce available stock. Premature "out of stock".
FIX: Add stock restoration: UPDATE rewards SET stock_quantity = stock_quantity + quantity.
```

```
SEVERITY: MEDIUM
FEATURE: Redemption Flow
FILE: server/routes/rewards/redemption-routes.ts:419
ISSUE: crossmintActionId uses Date.now()-based ID — potential collision in same-millisecond claims.
IMPACT: Unique constraint violation crashes NFT mint.
FIX: Use crypto.randomUUID().
```

```
SEVERITY: MEDIUM
FEATURE: Redemption Flow
FILE: server/routes/rewards/redemption-routes.ts:297-340
ISSUE: Transaction doesn't use conditional point deduction (WHERE current_points >= cost). Blind subtraction.
IMPACT: Concurrent redemptions can drive balance negative.
FIX: Add conditional check to UPDATE statement.
```

### NFT & Badge System

```
SEVERITY: MEDIUM
FEATURE: Badge Templates
FILE: server/routes/blockchain/badge-routes.ts:534-535
ISSUE: totalIssued counter read-then-write pattern: (badgeTemplate.totalIssued || 0) + 1. Concurrent claims lose increments.
IMPACT: totalIssued count incorrect under concurrent claims.
FIX: Use atomic SQL increment: sql`COALESCE(total_issued, 0) + 1`.
```

```
SEVERITY: MEDIUM
FEATURE: Badge Templates
FILE: shared/schema.ts:3126 / badge-routes.ts:290
ISSUE: Schema documents requirement types as "task_completion", "points_threshold", etc. Handler switches on "achievement", "points_milestone", etc. Only "manual" matches.
IMPACT: Badges created with documented types are ineligible.
FIX: Align schema comments with handler values. Add pgEnum.
```

### Points & Reputation

```
SEVERITY: MEDIUM
FEATURE: Platform Points
FILE: server/services/points/platform-points-service.ts:69-77
ISSUE: jsonb_set update calculates newBalance from stale read, not atomically in SQL. Two concurrent awards overwrite each other.
IMPACT: Platform points silently lost under concurrency.
FIX: Use atomic SQL expression with inline computation.
```

```
SEVERITY: MEDIUM
FEATURE: Platform Points
FILE: server/services/points/platform-points-service.ts:215
ISSUE: spendPoints calls awardPoints(-amount), creating dual entries in both profileData and transactions table.
IMPACT: Transaction history may show duplicates.
FIX: Deprecate embedded profileData.pointsTransactions array.
```

```
SEVERITY: MEDIUM
FEATURE: Points Flow
FILE: server/services/points/points-service.ts:250-259
ISSUE: getBalance() re-sums all pointTransactions instead of reading pre-aggregated currentPoints column. Performance degrades with volume.
IMPACT: Balance reads do full table scan of transactions.
FIX: Read from fanPrograms.currentPoints directly.
```

```
SEVERITY: MEDIUM
FEATURE: Multipliers
FILE: server/services/points/multiplier-service.ts:73-77
ISSUE: getActiveEventMultipliers blindly multiplies all multipliers together, ignoring stackingType, priority, and canStackWithOthers config.
IMPACT: Admins configure stacking rules that have no effect.
FIX: Implement stacking logic per configuration.
```

### Social Connections

```
SEVERITY: MEDIUM
FEATURE: Social Connections
FILE: server/services/auth/token-refresh.ts:39
ISSUE: YouTube refresh config uses GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET, but YouTube OAuth uses separate GOOGLE_YOUTUBE_CLIENT_ID.
IMPACT: YouTube token refresh fails with invalid_client.
FIX: Use correct env var names.
```

```
SEVERITY: MEDIUM
FEATURE: Social Connections
FILE: server/routes/social/social-routes.ts:1232-1261
ISSUE: Debug endpoints expose raw tokens and metadata in production.
IMPACT: Authenticated users can retrieve raw Twitter access tokens.
FIX: Gate behind requireFandomlyAdmin or NODE_ENV !== 'production'.
```

```
SEVERITY: MEDIUM
FEATURE: Social Connections
FILE: server/routes/social/social-routes.ts:561-571
ISSUE: Webhook test endpoint leaks first 10 characters of INSTAGRAM_WEBHOOK_VERIFY_TOKEN.
IMPACT: Partial secret exposure aids brute-force attacks.
FIX: Return only hasVerifyToken boolean.
```

```
SEVERITY: MEDIUM
FEATURE: Social Connections
FILE: server/services/auth/token-refresh.ts:88-98
ISSUE: TokenRefreshService reads accessToken/refreshToken as plaintext, but Kick/Patreon store them encrypted.
IMPACT: Refresh for Kick/Patreon sends garbled encrypted strings, always failing.
FIX: Call safeDecryptToken() on token values.
```

### Auth

```
SEVERITY: MEDIUM
FEATURE: Auth
FILE: server/routes/auth/google-routes.ts:29-33
ISSUE: GET /api/auth/google accepts redirect_uri from query params without validation.
IMPACT: Open redirect — attacker captures OAuth codes via evil.com redirect.
FIX: Validate redirect_uri against allowlist.
```

```
SEVERITY: MEDIUM
FEATURE: Auth
FILE: server/services/auth/google-auth.ts:207-222
ISSUE: Google OAuth tokens stored in plaintext. Kick/Patreon use encryptToken().
IMPACT: Database compromise exposes Google tokens.
FIX: Apply encryptToken() before storing.
```

```
SEVERITY: MEDIUM
FEATURE: Auth
FILE: server/services/auth/jwt-service.ts:31
ISSUE: JWT_AUDIENCE defaults to 'crossmint' — a removed integration.
IMPACT: Confusing vestigial value.
FIX: Change to 'fandomly'.
```

### Program Builder & Public Page

```
SEVERITY: MEDIUM
FEATURE: Program Builder
FILE: client/src/pages/creator-dashboard/program-builder.tsx:1678-1680
ISSUE: Publish button calls onPublish() without first saving current customizeData. Server validates DB state, not client state.
IMPACT: Creator fills all fields, clicks Publish without Save → confusing "please complete all requirements" error.
FIX: Chain save before publish — call updateProgramMutation.mutateAsync() first.
```

```
SEVERITY: MEDIUM
FEATURE: Public Program Page
FILE: client/src/pages/program-public.tsx:1030-1088
ISSUE: CampaignsTab uses hardcoded dark-theme Tailwind classes instead of dynamic themeColors/brandColors.
IMPACT: Light theme campaigns render with white text on near-transparent background — invisible.
FIX: Pass themeColors/brandColors to CampaignsTab like TasksTab.
```

```
SEVERITY: MEDIUM
FEATURE: Public Program Page
FILE: client/src/pages/program-public.tsx:1162-1175
ISSUE: RewardsTab is entirely a placeholder ("Coming Soon") even if rewards exist.
IMPACT: Rewards tab is misleadingly shown in navigation.
FIX: Implement reward display or hide tab until built.
```

### Schema Integrity

```
SEVERITY: MEDIUM
FEATURE: Schema Integrity
FILE: shared/schema.ts:2445
ISSUE: campaigns → taskCompletions many() declared but inverse one() not defined in taskCompletionsRelations. Comment incorrectly says campaignId doesn't exist (it does).
IMPACT: Drizzle relational queries traversing campaigns → taskCompletions fail.
FIX: Add inverse relation. Fix misleading comment.
```

```
SEVERITY: MEDIUM
FEATURE: Schema Integrity
FILE: shared/schema.ts:2289-2290
ISSUE: users ↔ tenants has two relations (currentTenantId and ownerId) without matching relationName disambiguation.
IMPACT: Drizzle throws ambiguous relation error at runtime.
FIX: Add relationName: 'ownedTenants' to both sides.
```

```
SEVERITY: MEDIUM
FEATURE: Schema Integrity
FILE: shared/schema.ts:2300-2304
ISSUE: users ↔ agencies has two relations without relationName disambiguation.
IMPACT: Same ambiguous relation error — breaks agency management features.
FIX: Add relationName to both pairs.
```

### Cross-Cutting: Race Conditions

```
SEVERITY: MEDIUM
FEATURE: Race Conditions
FILE: server/routes/rewards/redemption-routes.ts:250-295
ISSUE: Balance, stock, and per-user limit checks happen OUTSIDE the transaction. Concurrent requests exploit this.
IMPACT: Users can redeem rewards they can't afford or exceed stock/per-user limits.
FIX: Move all checks INTO the transaction with conditional UPDATEs.
```

```
SEVERITY: MEDIUM
FEATURE: Race Conditions
FILE: server/core/storage.ts:559-564
ISSUE: redeemRewardAtomic uses transaction (good) but SELECT without FOR UPDATE. Stale reads possible.
IMPACT: Theoretically exploitable under extreme concurrency.
FIX: Add SELECT ... FOR UPDATE or SERIALIZABLE isolation.
```

### Cross-Cutting: Authentication

```
SEVERITY: MEDIUM
FEATURE: Authentication
FILE: server/routes/tasks/task-routes.ts:427,883
ISSUE: GET /api/tasks/creator/:creatorId and GET /api/tasks/available/:creatorId have no authenticateUser middleware.
IMPACT: Full task configurations including custom settings exposed without auth.
FIX: Add authenticateUser or strip sensitive fields.
```

```
SEVERITY: MEDIUM
FEATURE: Authentication
FILE: server/routes/social/social-routes.ts:1171,1461,1497
ISSUE: GET /api/social/twitter/user, /discord/me, /twitch/me have no authenticateUser — act as open API proxies.
IMPACT: Any caller can use as proxy for Twitter/Discord/Twitch APIs.
FIX: Add authenticateUser middleware.
```

---

## LOW Issues (21)

### Task Lifecycle

```
SEVERITY: LOW
FEATURE: Task Building
FILE: server/routes/tasks/task-routes.ts:567-568
ISSUE: Stream code verification tasks stored with platform='system' instead of actual platform.
FIX: Include platform field from StreamCodeTaskBuilder.
```

```
SEVERITY: LOW
FEATURE: Task Building
FILE: server/routes/tasks/task-routes.ts:611-613
ISSUE: Double-mapping settings -> customSettings confusing for developers.
FIX: Document clearly or rename for consistency.
```

```
SEVERITY: LOW
FEATURE: Task Verification
FILE: server/services/verification/instagram-verification.ts:43-49
ISSUE: No-proof submissions return requiresManualReview: false instead of true — immediately rejected.
FIX: Return requiresManualReview: true for screenshot-only scenarios.
```

```
SEVERITY: LOW
FEATURE: Task Verification
FILE: server/services/verification/tiktok-verification.ts:56-63
ISSUE: Same as Instagram — contradictory: message says "needs manual verification" but flag says it doesn't.
FIX: Set requiresManualReview: true.
```

```
SEVERITY: LOW
FEATURE: Task Types
FILE: shared/schema.ts:1186-1188
ISSUE: Multiple DB enum task types have no UI builders or Zod schemas (tiktok_duet, youtube_watch, discord_react, etc.).
FIX: Add builders or remove from enum.
```

### Campaign System

```
SEVERITY: LOW
FEATURE: Campaign Join
FILE: shared/schema.ts:1319
ISSUE: accessCode stored as plain text in database.
FIX: Consider hashing, or accept risk given non-sensitive nature.
```

```
SEVERITY: LOW
FEATURE: Campaign Task Assignment
FILE: server/routes/campaigns/campaign-routes-v2.ts:487-494
ISSUE: Task reorder issues individual UPDATEs without a DB transaction. Crash mid-loop leaves inconsistent ordering.
FIX: Wrap in db.transaction().
```

```
SEVERITY: LOW
FEATURE: Campaign Completion
FILE: server/services/campaigns/campaign-engine.ts:520-534
ISSUE: If awardPoints fails after atomic completionBonusAwarded flag is set, flag stays true but points lost. No recovery.
FIX: Include in same transaction or implement retry queue.
```

### Rewards & Redemption

```
SEVERITY: LOW
FEATURE: Reward Store
FILE: client/src/pages/fan-dashboard/rewards-store.tsx:45
ISSUE: Frontend rewardTypeConfig missing 'traditional', 'token', 'experience' types. Accessing config.icon for unknown type throws.
FIX: Add fallback handling for unknown types.
```

```
SEVERITY: LOW
FEATURE: Redemption Flow
FILE: server/routes/rewards/redemption-routes.ts:331-333
ISSUE: Status set to 'completed' for 'digital' rewardType, but 'digital' doesn't exist in schema.
FIX: Update condition to match actual instant-delivery types.
```

```
SEVERITY: LOW
FEATURE: Reward Fulfillment
FILE: server/routes/rewards/redemption-routes.ts:51
ISSUE: fulfillRedemptionSchema accepts statuses not documented in schema comment.
FIX: Update schema comment to list all valid statuses.
```

```
SEVERITY: LOW
FEATURE: Reward Fulfillment
FILE: server/routes/rewards/redemption-routes.ts:734-736
ISSUE: fulfilledAt/fulfilledBy overwritten on each status change — loses original ship date.
FIX: Only set if not already set, or add separate shippedAt/deliveredAt.
```

### NFT & Badge System

```
SEVERITY: LOW
FEATURE: Badge Templates
FILE: server/routes/blockchain/badge-routes.ts:354-358
ISSUE: event_participation badge type permanently ineligible — claim returns "Unknown badge requirement type".
FIX: Implement logic or return 501 "Not Implemented".
```

```
SEVERITY: LOW
FEATURE: NFT Collections
FILE: shared/schema.ts:3038,3079-3080,3211
ISSUE: Section header still says "CROSSMINT INTEGRATION". crossmintActionId/.notNull() forces fake IDs.
FIX: Make nullable, update header.
```

### Points & Reputation

```
SEVERITY: LOW
FEATURE: Points Flow
FILE: shared/schema.ts:1511
ISSUE: pointCurrency field on tasks but never used in points service. All points treated as single currency.
FIX: Implement currency-aware awarding or remove field.
```

```
SEVERITY: LOW
FEATURE: Reputation / Staking
FILE: client/src/pages/staking.tsx:350
ISSUE: avalancheL1Address accessed via (user as any) — fragile typing.
FIX: Type user object properly.
```

### Social Connections

```
SEVERITY: LOW
FEATURE: Social Connections
FILE: server/routes/social/social-connection-routes.ts:96-112
ISSUE: POST /api/social-connections accepts accessToken/refreshToken from client body.
FIX: Store tokens only during server-side OAuth callback.
```

```
SEVERITY: LOW
FEATURE: Social Connections
FILE: server/routes/social/social-routes.ts:32-38,106-112
ISSUE: OAuth exchanges log client ID and authorization code fragments.
FIX: Reduce logging verbosity for sensitive values.
```

### Auth

```
SEVERITY: LOW
FEATURE: Auth
FILE: server/services/auth/jwt-service.ts:46-66
ISSUE: Dev RSA keys regenerated on every restart; private key logged to console.
FIX: Persist dev keys to file; remove console.log of private key.
```

```
SEVERITY: LOW
FEATURE: Auth
FILE: server/services/auth/particle-auth-service.ts:161-163
ISSUE: Catch block silently swallows ALL errors, not just "column doesn't exist".
FIX: Check for specific error code; log unexpected errors.
```

### Program Builder

```
SEVERITY: LOW
FEATURE: Program Builder
FILE: client/src/pages/creator-dashboard/program-builder.tsx:1666
ISSUE: &apos; in JSX renders as literal text instead of apostrophe.
FIX: Replace with ' (straight quote).
```

### Schema Integrity

```
SEVERITY: LOW
FEATURE: Schema Integrity
FILE: shared/schema.ts:2764,1690
ISSUE: userAchievements.userId and taskAssignments.userId have no .references() FK constraints.
FIX: Add proper FK references.
```

### Cross-Cutting: Error Handling

```
SEVERITY: LOW
FEATURE: Error Handling
FILE: server/routes/tasks/task-completion-routes.ts:381-386,928-931
ISSUE: Error responses leak stack traces and internal error details to client.
FIX: Return generic messages; log full errors server-side only.
```

---

## Recommended Fix Order

### Phase 1 — Blockers (CRITICAL, prevents core functionality)

| #   | Feature             | Issue                                                | Effort |
| --- | ------------------- | ---------------------------------------------------- | ------ |
| 1   | Campaign Builder    | Add missing `useState` import                        | 1 min  |
| 2   | Manual Review Queue | Migrate integer columns to varchar + add FKs         | 30 min |
| 3   | Task Building       | Fix 'checkin' → 'check_in' enum mismatch             | 5 min  |
| 4   | Task Review         | Fix rejectManualReview setting status to 'completed' | 5 min  |
| 5   | Redemption          | Add fanId to rewardRedemptions insert                | 5 min  |
| 6   | Redemption          | Fix route ordering for /pending                      | 5 min  |
| 7   | Reward Store        | Fix userPoints vs userBalance field name             | 5 min  |
| 8   | Reward Store        | Pass programId to catalog endpoint                   | 10 min |
| 9   | Reward Store        | Remove deleted_at reference from catalog query       | 5 min  |
| 10  | Badge System        | Fix 'completed' → 'success' enum values              | 10 min |
| 11  | Badge System        | Fix minted_at → completed_at column refs             | 10 min |
| 12  | Badge System        | Fix walletAddress → avalancheL1Address               | 5 min  |
| 13  | Program Builder     | Fix fetchApi().json() double-parse                   | 5 min  |
| 14  | Social              | Store accessToken/refreshToken in connect endpoint   | 20 min |
| 15  | Schema              | Add indexes to taskCompletions table                 | 10 min |

### Phase 2 — Security (CRITICAL + HIGH security issues)

| #   | Feature | Issue                                            | Effort |
| --- | ------- | ------------------------------------------------ | ------ |
| 1   | Auth    | Fix Particle verification bypass                 | 30 min |
| 2   | Auth    | Add rate limiting to /api/auth/particle/callback | 10 min |
| 3   | Auth    | Fix forgeable pending link IDs                   | 1 hr   |
| 4   | Auth    | Fix open redirect on Google auth                 | 15 min |
| 5   | Social  | Enforce Instagram webhook signature verification | 15 min |
| 6   | Admin   | Fix multiplier admin privilege escalation        | 20 min |
| 7   | Social  | Add auth to token exchange endpoints             | 30 min |
| 8   | Social  | Remove/gate debug token endpoints                | 15 min |

### Phase 3 — Data Integrity (HIGH race conditions + consistency)

| #   | Feature    | Issue                                            | Effort |
| --- | ---------- | ------------------------------------------------ | ------ |
| 1   | Redemption | Move balance/stock checks inside transaction     | 1 hr   |
| 2   | Points     | Fix read-then-write race in platform points      | 30 min |
| 3   | Points     | Fix read-then-write race in creator points spend | 30 min |
| 4   | Campaign   | Fix claimRewards double-claim race               | 30 min |
| 5   | Campaign   | Fix addCompletedTask TOCTOU race                 | 30 min |
| 6   | Task       | Wrap task completion in transaction              | 30 min |
| 7   | Redemption | Unify dual redemption endpoints                  | 2 hr   |
| 8   | Points     | Consolidate dual points awarding paths           | 1 hr   |

### Phase 4 — Feature Fixes (HIGH functional issues)

Remaining HIGH and MEDIUM issues in priority order: shipping address mismatch, campaign gating, Enroll button, slug uniqueness, missing relations, etc.

---

## Summary Table

| Area                          | CRITICAL | HIGH   | MEDIUM | LOW    | Total   |
| ----------------------------- | -------- | ------ | ------ | ------ | ------- |
| Task Lifecycle                | 4        | 7      | 7      | 4      | 22      |
| Campaign System               | 1        | 5      | 6      | 3      | 15      |
| Rewards & Redemption          | 4        | 7      | 5      | 4      | 20      |
| NFT & Badge System            | 3        | 1      | 2      | 2      | 8       |
| Points & Reputation           | 0        | 3      | 5      | 2      | 10      |
| Social Connections            | 2        | 3      | 4      | 2      | 11      |
| Program Builder & Public Page | 1        | 2      | 3      | 1      | 7       |
| Auth                          | 1        | 3      | 3      | 2      | 9       |
| Schema Integrity              | 2        | 0      | 3      | 1      | 6       |
| **Total**                     | **18**   | **31** | **38** | **21** | **108** |
