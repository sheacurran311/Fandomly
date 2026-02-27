# Fandomly Database Schema Audit Report

**File:** `shared/schema.ts` (~3,289 lines)  
**Total tables:** 42 pgTable definitions  
**Total enums:** 22 pgEnum definitions  

---

## Comprehensive Table Audit

| # | Table | Description | Status | Reason | Overlaps With |
|---|-------|-------------|--------|--------|---------------|
| 1 | `tenants` | Multi-tenant stores — one per creator/brand | **Active** | Core entity, 7+ server files | — |
| 2 | `social_connections` | OAuth tokens & platform connections for users | **Active** | 34+ server refs; auth & verification core | — |
| 3 | `users` | All user accounts (fans, creators, admins) | **Active** | Core entity, 50+ server refs | — |
| 4 | `tenant_memberships` | User↔Tenant many-to-many (role, points, tier) | **Active** | 3 server files; stores member `points` & `tier` in `memberData` JSONB | **Overlaps `fan_programs`** — both track user-in-program points/tiers |
| 5 | `creators` | Creator profiles linked to users & tenants | **Active** | 15+ server files | — |
| 6 | `creator_facebook_pages` | Facebook page tokens & metrics per creator | **Active** | Only `storage.ts` (2 refs); low traffic | — |
| 7 | `agencies` | Multi-brand agency management | **Active** | `agency-routes.ts` (16 refs) | — |
| 8 | `agency_tenants` | Agency↔Tenant junction table | **Active** | `agency-routes.ts` (12 refs) | — |
| 9 | `loyalty_programs` | Top-level program container (one per creator) — "Program Page" | **Active** | 45+ refs in program-routes alone; core entity | Schema comment says "Previously called loyalty_programs" but DB table name **is still** `loyalty_programs` |
| 10 | `rewards` | Redeemable rewards (NFT, physical, raffle, etc.) | **Active** | 21+ refs across rewards/redemption routes | — |
| 11 | `fan_programs` | Fan↔Program enrollment with points & tier | **Active** | 15+ refs in points-service, program-routes | **Overlaps `tenant_memberships`** — both track user points/tier per creator |
| 12 | `point_transactions` | Point earn/spend ledger per fan_program | **Active** | 10+ refs in points-service | — |
| 13 | `reward_redemptions` | Reward redemption records | **Active** | 12+ refs in redemption-routes | — |
| 14 | `notifications` | In-app notification system | **Active** | 43+ refs in notification-routes | — |
| 15 | `campaigns` | Campaign containers under programs | **Active** | 20+ refs across campaign/task routes | — |
| 16 | `campaign_rules` | Campaign condition→effect rules | **Investigate** | Only referenced in `storage.ts` (3 refs); imported but no route-level usage | — |
| 17 | `social_campaign_tasks` | Campaign-specific social tasks (legacy) | **Investigate** | Only `storage.ts` CRUD (8 refs); **superseded by `tasks` table** which has `campaignId` FK | **Overlaps `tasks`** — duplicate task-in-campaign model |
| 18 | `tasks` | Independent tasks (creator & platform) — main task system | **Active** | 32+ refs; core entity for entire task workflow | — |
| 19 | `platform_tasks` | Platform-wide tasks awarding Fandomly Points | **Active** | 28+ refs in platform-task-routes, admin-platform-tasks | Conceptually similar to `tasks` with `ownershipLevel='platform'` but stored separately |
| 20 | `task_templates` | DB-stored task templates (platform & custom) | **Active** | 16+ refs in storage.ts; unified-verification | **Overlaps `CORE_TASK_TEMPLATES`** (in-memory in `shared/taskTemplates.ts`) — dual template source |
| 21 | `task_assignments` | Task↔Campaign many-to-many junction | **Active** | 15 refs in storage.ts | — |
| 22 | `campaign_participations` | User participation tracking per campaign | **Active** | 6 refs in storage.ts | — |
| 23 | `task_completions` | Fan progress/completion on creator tasks | **Active** | 23+ refs; core to verification engine | — |
| 24 | `platform_task_completions` | Completions for platform-wide tasks | **Active** | 13+ refs in platform-task-routes, fan-dashboard | Mirrors `task_completions` but for `platform_tasks` |
| 25 | `manual_review_queue` | Tasks requiring creator manual review | **Active** | 10+ refs in unified-verification, review-routes | **FK type mismatch** (see issues below) |
| 26 | `verification_attempts` | Audit log of all verification attempts | **Active** | 3+ refs in unified-verification, health, analytics | **No FK references declared** despite using `varchar` IDs |
| 27 | `platform_points_transactions` | Platform-wide Fandomly Points ledger | **Active** | 8+ refs in platform-points-service, dashboard | **Overlaps `point_transactions`** — parallel points ledger for platform vs creator |
| 28 | `reward_distributions` | Point award audit log per task completion | **Active** | 6 refs in storage.ts | — |
| 29 | `program_announcements` | Creator posts/updates on program page | **Active** | 13 refs in announcement-routes | — |
| 30 | `active_multipliers` | System-wide & event point multipliers | **Active** | 11 refs in multiplier-service | — |
| 31 | `check_in_streaks` | User streak tracking for check-in tasks | **Active** | 15+ refs in check-in-service, multiplier-service | — |
| 32 | `website_visit_tracking` | Click/visit tracking for website_visit tasks | **Active** | 23 refs in website-visit-verification | — |
| 33 | `poll_quiz_responses` | User responses to poll/quiz tasks | **Active** | 11 refs in poll-quiz-verification | — |
| 34 | `achievements` | Achievement definitions (badges, milestones) | **Active** | 5 refs in fan-dashboard; queried via raw SQL | — |
| 35 | `user_achievements` | User↔Achievement progress & completion | **Investigate** | **0 server refs** (only `schema.ts` types); client has 23 refs but server uses raw SQL on `achievements` only | Possibly dead server-side |
| 36 | `user_levels` | User level/XP progression | **Investigate** | **0 server refs, 0 client refs** outside schema | Likely dead / never implemented |
| 37 | `creator_referrals` | Creator→Creator referral tracking (revenue share) | **Active** | 28+ refs in referral-service | — |
| 38 | `fan_referrals` | Fan→Fan referral tracking (platform rewards) | **Active** | 29+ refs in referral-service | — |
| 39 | `creator_task_referrals` | Creator task/campaign referrals | **Active** | 35+ refs in referral-service | — |
| 40 | `nft_collections` | Creator/platform NFT collections | **Keep — repurpose** | Crossmint integration removed, but table will be repurposed for Fandomly L1 blockchain NFT/token system | Part of NFT subsystem → L1 |
| 41 | `fandomly_badge_templates` | Platform badge credential templates | **Keep — repurpose** | Crossmint removed; badge system will be rebuilt on Fandomly L1 ReputationRegistry contract | Part of NFT subsystem → L1 |
| 42 | `nft_templates` | Creator NFT templates per collection | **Keep — repurpose** | Crossmint removed; will be repurposed for Fandomly L1 token/NFT system | Part of NFT subsystem → L1 |
| 43 | `nft_mints` | NFT minting operation log | **Keep — repurpose** | Crossmint removed; will be repurposed for Fandomly L1 mint tracking | Part of NFT subsystem → L1 |
| 44 | `nft_deliveries` | NFT delivery tracking to users | **Keep — repurpose** | Crossmint removed; will be repurposed for Fandomly L1 delivery tracking | Part of NFT subsystem → L1 |
| 45 | `audit_log` | Comprehensive audit trail | **Active** | 11+ refs in storage.ts, audit-logging middleware | — |
| 46 | `verification_codes` | Unique per-fan-per-task verification codes | **Active** | 23+ refs in code-service, youtube/kick verification | — |
| 47 | `group_goals` | Community group goals with collective rewards | **Active** | 26+ refs in group-goal-poller, group-goal-service | — |
| 48 | `group_goal_participants` | Fans enrolled in group goals | **Active** | 22+ refs in group-goal-service, poller | — |
| 49 | `starter_pack_completions` | One-time starter pack completions per platform/tenant | **Active** | 19 refs in starter-pack-service | — |
| 50 | `fan_platform_handles` | Fan-claimed platform handles (T3 manual verification) | **Active** | 24+ refs in handle-routes, review-routes | — |
| 51 | `beta_signups` | Email capture for beta program | **Active** | 5 refs in beta-signup-routes | — |
| 52 | `sync_preferences` | Creator sync toggles per platform | **Active** | 18+ refs in sync-scheduler, sync-preferences-routes | — |
| 53 | `platform_account_metrics_daily` | Daily account metric snapshots | **Active** | 33+ refs in insights-engine, creator-analytics | — |
| 54 | `platform_content` | Individual content items (posts, videos, etc.) | **Active** | 44+ refs in insights-engine, creator-analytics | — |
| 55 | `platform_content_metrics` | Time-series metrics per content item | **Active** | 20+ refs in insights-engine, creator-analytics | — |
| 56 | `sync_log` | Audit trail for all sync operations | **Active** | 6+ refs in sync-scheduler, creator-analytics | — |

---

## Key Overlap / Duplicate Analysis

### 1. `loyalty_programs` vs "programs"
- **No separate `programs` table exists.** The code aliases `Program = LoyaltyProgram` at the type level (line 2074).
- The DB table is still named `loyalty_programs`. The comment on line 559 says "Previously called loyalty_programs" which is confusing — it IS still `loyalty_programs`.
- **Recommendation:** Rename the DB table to `programs` or at minimum fix the misleading comment.

### 2. `task_templates` (DB) vs `CORE_TASK_TEMPLATES` (in-memory)
- `task_templates` is a DB table with 16+ refs in `storage.ts` and `unified-verification.ts`.
- `CORE_TASK_TEMPLATES` is a hardcoded array in `shared/taskTemplates.ts` (~850 entries) used by `server/routes/main.ts`, client components, and test files.
- **Dual source of truth.** The DB table supports custom/tenant-specific templates; the in-memory array provides global defaults.
- **Risk:** Templates can drift. DB templates may not be seeded from `CORE_TASK_TEMPLATES`.
- **Recommendation:** Seed `task_templates` from `CORE_TASK_TEMPLATES` on startup, or consolidate to one source.

### 3. `task_assignments` vs `task_completions`
- **Not duplicates.** Different concerns:
  - `task_assignments`: Task↔Campaign junction (which tasks belong to which campaigns).
  - `task_completions`: User↔Task progress tracking (who completed what).
- No overlap.

### 4. `fan_programs` vs `tenant_memberships`
- **Significant overlap:**
  - `fan_programs`: Tracks fan enrollment in a loyalty program (points, tier, program-specific).
  - `tenant_memberships`: Tracks user membership in a tenant (has `memberData` JSONB with `points` and `tier` fields).
- Both store points and tier per user per creator/tenant.
- `fan_programs` is program-specific (FK to `loyalty_programs`); `tenant_memberships` is tenant-scoped.
- Since each creator typically has one program, these are effectively duplicate point/tier stores.
- **Recommendation:** Consolidate points/tier into one canonical location. Use `fan_programs` for program-specific data and remove `points`/`tier` from `tenant_memberships.memberData` or vice versa.

### 5. NFT/Crossmint Tables (5 tables — being removed)
| Table | Status |
|-------|--------|
| `nft_collections` | Deprecated |
| `nft_templates` | Deprecated |
| `nft_mints` | Deprecated |
| `nft_deliveries` | Deprecated |
| `fandomly_badge_templates` | Deprecated (depends on `nft_collections` FK) |

All 5 tables depend on Crossmint integration. Related enums: `nft_token_type`, `nft_mint_status`, `nft_category`.

### 6. Dynamic Labs-specific Tables
- **No Dynamic Labs-specific tables found.** The `dynamic_user_id` column has been fully removed from the `users` table (no longer in schema).
- Migration `0010_add_critical_indexes.sql` still references `CREATE INDEX ... ON users(dynamic_user_id)` — this is a **dangling index on a non-existent column** (will error if migration runs fresh).

### 7. `social_campaign_tasks` vs `tasks`
- `social_campaign_tasks`: Legacy table for campaign-specific social tasks. Only used in `storage.ts` CRUD operations.
- `tasks`: New unified task table with optional `campaignId` FK. All verification, completion, and route logic uses this table.
- **`social_campaign_tasks` is effectively superseded** by `tasks`.
- **Recommendation:** Migrate any remaining data and drop `social_campaign_tasks`.

### 8. `platform_tasks` / `platform_task_completions` vs `tasks` / `task_completions`
- `tasks` has `ownershipLevel` enum (`platform` | `creator`) that could serve both.
- But `platform_tasks` has a simpler schema (no campaign/program association) and its own completion table.
- **Recommendation:** Consider merging into `tasks` with `ownershipLevel='platform'` to reduce schema duplication.

### 9. `point_transactions` vs `platform_points_transactions`
- `point_transactions`: Creator-program-specific point ledger (FK to `fan_programs`).
- `platform_points_transactions`: Platform-wide Fandomly Points ledger (FK to `users`).
- These serve different scopes but identical purposes.
- **Recommendation:** Consider a single `point_transactions` table with an `is_platform` flag or `scope` column.

---

## Foreign Key Consistency Issues

### Critical: `manual_review_queue` FK Type Mismatch
```
manual_review_queue:
  id: serial (integer PK)
  taskCompletionId: integer  ← should be varchar (task_completions.id is UUID varchar)
  tenantId: integer          ← should be varchar (tenants.id is UUID varchar)
  creatorId: integer         ← should be varchar (creators.id is UUID varchar)
  fanId: integer             ← should be varchar (users.id is UUID varchar)
  taskId: integer            ← should be varchar (tasks.id is UUID varchar)
```
**All 5 FK columns use `integer` type but reference tables that use `varchar` UUID PKs.** No actual FK constraints are declared either — the `.references()` calls are missing. This means:
- No referential integrity enforcement
- Type mismatch would prevent FK constraints from working even if added
- Likely a code bug — queries may silently fail or produce incorrect results

### `verification_attempts` Missing FK References
```
verification_attempts:
  id: serial (integer PK)
  taskCompletionId: varchar — no .references() declared
  userId: varchar — no .references() declared
```
Missing FK constraints to `task_completions` and `users`.

### Migration Index on Deleted Column
- `migrations/0010_add_critical_indexes.sql` line 19: `CREATE INDEX ... ON users(dynamic_user_id)` — column no longer exists in schema.

---

## Missing Index Analysis

Tables **without indexes** in `0010_add_critical_indexes.sql` or the schema:

| Table | Missing Indexes | Impact |
|-------|----------------|--------|
| `program_announcements` | `program_id`, `creator_id` | Slow announcement feeds |
| `active_multipliers` | `tenant_id`, `type`, `is_active` | Slow multiplier lookups during point calculations |
| `check_in_streaks` | `user_id + task_id`, `tenant_id` | Slow streak lookups |
| `website_visit_tracking` | `user_id + task_id`, `unique_token` (has unique constraint) | Slow visit lookups |
| `poll_quiz_responses` | `user_id`, `task_id`, `tenant_id` | Slow response lookups |
| `achievements` | `tenant_id`, `category`, `type` | Slow achievement queries |
| `user_achievements` | `user_id`, `achievement_id`, `completed` | Slow progress queries — **critical if table is actually used** |
| `user_levels` | `user_id` (has unique constraint), `tenant_id` | Redundant if table is unused |
| `verification_codes` | `task_id + fan_id`, `tenant_id`, `code` (has unique constraint) | Slow code lookups during verification |
| `group_goals` | `task_id`, `tenant_id`, `creator_id`, `status` | Slow goal queries |
| `group_goal_participants` | `group_goal_id + fan_id` | Slow participant lookups |
| `starter_pack_completions` | `fan_id + tenant_id + platform` | Slow duplicate-check queries |
| `fan_platform_handles` | `user_id + platform` | Slow handle lookups |
| `beta_signups` | `email` (has unique constraint), `created_at` | Minimal impact |
| `sync_preferences` | `user_id + platform` | Slow sync preference lookups |
| `platform_account_metrics_daily` | `user_id + platform + date` | **Critical** — slow analytics queries |
| `platform_content` | `user_id + platform`, `platform_content_id` | **Critical** — slow content sync |
| `platform_content_metrics` | `content_id + date` | **Critical** — slow metric queries |
| `sync_log` | `user_id + platform`, `status` | Slow sync audit queries |
| `campaign_rules` | `campaign_id` | Slow rule lookups |
| `task_assignments` | `task_id`, `campaign_id`, `tenant_id` | Slow assignment lookups |
| `campaign_participations` | `campaign_id + member_id`, `tenant_id` | Slow participation checks |
| `manual_review_queue` | `status`, `tenant_id`, `creator_id` | Slow review queue queries |
| `verification_attempts` | `task_completion_id`, `user_id` | Slow audit queries |
| `reward_distributions` (additional) | `task_completion_id` | Slow join queries |

---

## JSONB Column Type Documentation

| Table | Column | Has `$type<>` | Shape Documented? |
|-------|--------|---------------|-------------------|
| `tenants` | `branding` | ✅ Yes | Full interface |
| `tenants` | `businessInfo` | ✅ Yes | Full interface |
| `tenants` | `limits` | ✅ Yes | Full interface |
| `tenants` | `usage` | ✅ Yes | Full interface + default |
| `tenants` | `billingInfo` | ✅ Yes | Full interface |
| `tenants` | `settings` | ✅ Yes | Full interface + default |
| `social_connections` | `profileData` | ✅ Yes | Has `[key: string]: any` escape hatch |
| `users` | `profileData` | ✅ Yes | **Very large** — 60+ fields, nested objects |
| `users` | `linkedAccounts` | ✅ Yes | Structured |
| `users` | `onboardingState` | ✅ Yes | Full interface + default |
| `users` | `adminPermissions` | ✅ Yes | Structured |
| `users` | `customerAdminData` | ✅ Yes | Structured |
| `users` | `notificationPreferences` | ✅ Yes | Full interface + default |
| `tenant_memberships` | `memberData` | ✅ Yes | Has `customAttributes?: Record<string, any>` escape hatch |
| `creators` | `typeSpecificData` | ✅ Yes | Full discriminated union |
| `creators` | `brandColors` | ✅ Yes | Structured |
| `creators` | `socialLinks` | ✅ Yes | Structured |
| `creators` | `verificationData` | ✅ Yes | Structured + default |
| `creators` | `publicPageSettings` | ✅ Yes | Structured + default |
| `loyalty_programs` | `pageConfig` | ✅ Yes | **Very large** — deeply nested theme system |
| `loyalty_programs` | `tiers` | ✅ Yes | Array of tier objects |
| `rewards` | `rewardData` | ✅ Yes | Complex union of reward types |
| `campaigns` | `visibilityRules` | ✅ Yes | Structured |
| `campaigns` | `transactionFilters` | ✅ Yes | Structured |
| `campaigns` | `perMemberLimit` | ✅ Yes | Structured |
| `campaigns` | `rewardStructure` | ✅ Yes | Structured |
| `tasks` | `customSettings` | ⚠️ `Record<string, any>` | **Untyped catch-all** |
| `tasks` | `groupGoalConfig` | ✅ Yes | Structured |
| `tasks` | `multiplierConfig` | ✅ Yes | Structured |
| `social_campaign_tasks` | `rewardMetadata` | ✅ Yes | Structured |
| `campaign_rules` | `conditions` | ✅ Yes | Complex discriminated array |
| `campaign_rules` | `effects` | ✅ Yes | Complex discriminated array |
| `task_completions` | `completionData` | ✅ Yes | Multi-purpose union |
| `manual_review_queue` | `autoCheckResult` | ⚠️ `Record<string, any>` | **Untyped** |
| `verification_attempts` | `verificationData` | ⚠️ `Record<string, any>` | **Untyped** |
| `active_multipliers` | `conditions` | ✅ Yes | Complex structured |
| `verification_codes` | `verificationData` | ✅ Yes | Structured |
| `group_goal_participants` | `contributionData` | ✅ Yes | Structured |
| `nft_collections` | `metadata` | ✅ Yes | Structured |
| `nft_templates` | `metadata` | ✅ Yes | Structured |
| `nft_mints` | `contextData` | ✅ Yes | Structured |
| `nft_deliveries` | `metadataSnapshot` | ✅ Yes | Structured |
| `fandomly_badge_templates` | `requirementData` | ✅ Yes | Structured |
| `fandomly_badge_templates` | `nftMetadata` | ✅ Yes | Structured |
| `audit_log` | `changes` | ✅ Yes | before/after pattern |
| `audit_log` | `metadata` | ⚠️ Has `[key: string]: any` | Partially typed |
| `beta_signups` | `metadata` | ✅ Yes | UTM tracking |
| `platform_account_metrics_daily` | `platformSpecific` | ⚠️ `Record<string, any>` | **Untyped** |
| `platform_content` | `rawData` | ⚠️ `Record<string, any>` | **Untyped** |
| `platform_content_metrics` | `platformSpecific` | ⚠️ `Record<string, any>` | **Untyped** |

---

## Naming Convention Issues

| Issue | Details |
|-------|---------|
| **DB table name vs export name mismatch** | `loyaltyPrograms` exports → DB table `loyalty_programs`. Comment says "previously called loyalty_programs" but it still IS `loyalty_programs`. Confusing. |
| **Inconsistent PK types** | Most tables use `varchar` UUID PKs, but `manual_review_queue` and `verification_attempts` use `serial` (auto-increment integer). |
| **Inconsistent FK type** | `manual_review_queue` uses `integer` for FK columns that should be `varchar` UUIDs (see FK issues above). |
| **`social_campaign_tasks`** | Mixes older naming pattern (`social_` prefix) with newer `tasks` table. |
| **`fandomly_badge_templates`** | Platform name in table name is non-standard; should just be `badge_templates`. |
| **`platformTasks` vs `tasks`** | Two separate task tables for different scopes; naming doesn't clarify the distinction well. |
| **`platformPointsTransactions` vs `pointTransactions`** | Naming implies parallel but separate systems; unclear without docs. |
| **`fan_programs`** | Name is ambiguous — could mean "programs for fans" or "fan-program enrollments". It's actually the latter (junction table). |
| **Timestamp columns** | Some tables have `createdAt` + `updatedAt`, some only `createdAt`, some add domain-specific timestamps (`joinedAt`, `connectedAt`, etc.) — mostly consistent but `rewards` table lacks `updatedAt`. |
| **`sync_preferences`** uses `uuid` PK | While all other tables use `varchar` UUID. Same for `platform_account_metrics_daily`, `platform_content`, `platform_content_metrics`, `sync_log` — these 5 newer analytics tables use native `uuid()` while the rest use `varchar + gen_random_uuid()`. |
| **Table `audit_log` (singular)** | While all other tables use plural names (`users`, `tasks`, `campaigns`). |

---

## Summary of Issues by Priority

### P0 — Data Integrity Bugs
1. **`manual_review_queue` FK type mismatch**: 5 columns use `integer` but reference `varchar` UUID PKs. No FK constraints declared.
2. **`verification_attempts` missing FK references**: No constraints on `taskCompletionId` or `userId`.
3. **Dangling index migration**: `idx_users_dynamic_user_id` references non-existent `dynamic_user_id` column.

### P1 — Schema Cleanup (Deprecated Tables)
4. **5 NFT/Crossmint tables** to be removed: `nft_collections`, `nft_templates`, `nft_mints`, `nft_deliveries`, `fandomly_badge_templates`.
5. **`social_campaign_tasks`** superseded by `tasks` table.
6. **`user_levels`** appears completely unused (0 references outside schema).
7. **`user_achievements`** has 0 server references (only queried via raw SQL on `achievements` table).

### P2 — Overlap Consolidation
8. **`fan_programs` vs `tenant_memberships`**: Duplicate points/tier tracking.
9. **`task_templates` vs `CORE_TASK_TEMPLATES`**: Dual source of truth for templates.
10. **`platform_tasks` vs `tasks`**: Parallel task systems for platform vs creator.
11. **`platform_points_transactions` vs `point_transactions`**: Parallel points ledgers.

### P3 — Missing Indexes
12. **Social analytics tables** (`platform_account_metrics_daily`, `platform_content`, `platform_content_metrics`) lack composite indexes for the most common query patterns.
13. **13+ other tables** lack indexes on frequently queried columns (see index table above).

### P4 — Naming/Consistency
14. **Mixed PK strategies**: `serial` vs `varchar UUID` vs native `uuid`.
15. **`loyalty_programs`** table name is legacy but still used — misleading comment.
16. **`audit_log`** singular vs all other tables plural.
17. **6 JSONB columns** using `Record<string, any>` without proper type definitions.
