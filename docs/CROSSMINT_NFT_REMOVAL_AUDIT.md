# Crossmint / NFT / Wallet Removal Audit

> Generated: 2026-02-27
> Scope: ALL references to Crossmint, NFT, and wallet-related code across the Fandomly codebase.

---

## Table of Contents

1. [Files to DELETE entirely](#1-files-to-delete-entirely)
2. [Files requiring partial removal (imports, functions, routes, columns)](#2-files-requiring-partial-removal)
3. [Migration / SQL files (DO NOT DELETE — reference only)](#3-migration--sql-files)
4. [Documentation files to DELETE](#4-documentation-files-to-delete)
5. [Environment variables to remove](#5-environment-variables-to-remove)

---

## 1. Files to DELETE entirely

| #   | File Path                                                | What It Contains                                                                                                                                                                                                                                                                                                                                                                                        | Action          |
| --- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| 1   | `server/services/nft/crossmint-service.ts`               | Full Crossmint API client (`CrossmintService` class): collection creation, NFT minting, batch minting, template management, metadata updates. ~920 lines.                                                                                                                                                                                                                                               | **DELETE_FILE** |
| 2   | `server/routes/nft/crossmint-routes.ts`                  | All `/api/nft/*` routes: create collection, mint NFT, batch mint, mint status, webhook handler (`/api/nft/webhooks/crossmint`). ~830 lines.                                                                                                                                                                                                                                                             | **DELETE_FILE** |
| 3   | `server/services/wallet/wallet-service.ts`               | `WalletService` class for lazy Crossmint wallet creation via `CROSSMINT_SERVER_API_KEY`. Exports `getWalletService()`, `initializeWalletService()`. ~220 lines.                                                                                                                                                                                                                                         | **DELETE_FILE** |
| 4   | `client/src/hooks/useCrossmint.ts`                       | React hooks for all NFT CRUD: `useNftCollections`, `useNftCollection`, `useCreateNftCollection`, `useUpdateNftCollection`, `useNftTemplates`, `useCreateNftTemplate`, `useUpdateNftTemplate`, `useDeleteNftTemplate`, `useMintNft`, `useBatchMintNft`, `useMintStatus`, `useNftDeliveries`, plus helper functions and TypeScript interfaces (`NftCollection`, `NftTemplate`, `NftMint`, `NftDelivery`). | **DELETE_FILE** |
| 5   | `client/src/hooks/useUserNFTs.ts`                        | React hooks: `useUserNFTs(userId)`, `useNFTsByWallet(walletAddress, chain)`, and `UserNFT` interface.                                                                                                                                                                                                                                                                                                   | **DELETE_FILE** |
| 6   | `client/src/components/nft/NFTGallery.tsx`               | Full NFT gallery UI component with grid/list view, filters, detail modal. Imports `useUserNFTs`.                                                                                                                                                                                                                                                                                                        | **DELETE_FILE** |
| 7   | `client/src/components/nft/NFTTemplateBuilder.tsx`       | NFT template creation dialog. Imports `useCreateNftTemplate` from `useCrossmint`.                                                                                                                                                                                                                                                                                                                       | **DELETE_FILE** |
| 8   | `client/src/components/marketplace/nft-card.tsx`         | `NFTCard` component for marketplace display.                                                                                                                                                                                                                                                                                                                                                            | **DELETE_FILE** |
| 9   | `client/src/pages/creator-dashboard/nft-collections.tsx` | Full creator NFT collections page. Imports many hooks from `useCrossmint`.                                                                                                                                                                                                                                                                                                                              | **DELETE_FILE** |
| 10  | `client/src/pages/fan-dashboard/nft-collection.tsx`      | Fan "My NFT Collection" page. Imports `NFTGallery`.                                                                                                                                                                                                                                                                                                                                                     | **DELETE_FILE** |
| 11  | `client/src/pages/admin-dashboard/nft-management.tsx`    | Admin NFT management page (badges + platform NFFTs + distribution tabs). Imports `AdminNftDistribution`.                                                                                                                                                                                                                                                                                                | **DELETE_FILE** |
| 12  | `client/src/components/admin/AdminNftDistribution.tsx`   | Admin component for platform NFT creation and batch distribution.                                                                                                                                                                                                                                                                                                                                       | **DELETE_FILE** |
| 13  | `server/services/rewards/badge-rewards-service.ts`       | `BadgeRewardsService` class that integrates with `CrossmintService` and `WalletService` for minting badge NFTs. ~490 lines.                                                                                                                                                                                                                                                                             | **DELETE_FILE** |

---

## 2. Files requiring partial removal

### 2.1 Server Entry Point

| File              | Line(s) | What                                                                             | Action               |
| ----------------- | ------- | -------------------------------------------------------------------------------- | -------------------- |
| `server/index.ts` | 7       | `import { initializeCrossmintService } from "./services/nft/crossmint-service";` | **REMOVE_IMPORT**    |
| `server/index.ts` | 8       | `import { initializeWalletService } from "./services/wallet/wallet-service";`    | **REMOVE_IMPORT**    |
| `server/index.ts` | 85      | `req.path.startsWith('/api/crossmint/webhook')` in raw body parser condition     | **REMOVE_CONDITION** |
| `server/index.ts` | 141-142 | `initializeCrossmintService();` call                                             | **REMOVE_CALL**      |
| `server/index.ts` | 145     | `initializeWalletService();` call                                                | **REMOVE_CALL**      |

### 2.2 Main Routes

| File                    | Line(s)   | What                                                                              | Action                |
| ----------------------- | --------- | --------------------------------------------------------------------------------- | --------------------- |
| `server/routes/main.ts` | 25        | `import { registerCrossmintRoutes } from "./nft/crossmint-routes";`               | **REMOVE_IMPORT**     |
| `server/routes/main.ts` | 196       | JWKS endpoint comment referencing "Crossmint JWT validation" (comment-only)       | **UPDATE_COMMENT**    |
| `server/routes/main.ts` | 2378-2392 | NFT collection validation block in campaign creation (`requiredNftCollectionIds`) | **REMOVE_CODE_BLOCK** |
| `server/routes/main.ts` | 2513      | `requiredNftCollectionIds` in campaign requirements object                        | **REMOVE_FIELD**      |
| `server/routes/main.ts` | 3994-3995 | `registerCrossmintRoutes(app);` call + comment                                    | **REMOVE_CALL**       |

### 2.3 Leaderboard Routes (Badge awarding)

| File                                           | Line(s)    | What                                                                                                                            | Action                                                  |
| ---------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `server/routes/programs/leaderboard-routes.ts` | 1 (import) | `import { BadgeRewardsService } from "../../services/rewards/badge-rewards-service";`                                           | **REMOVE_IMPORT**                                       |
| `server/routes/programs/leaderboard-routes.ts` | 622-633    | Badge award endpoint: `crossmintApiKey` check + `BadgeRewardsService` usage (4 separate blocks at lines ~625, ~661, ~694, ~726) | **REMOVE_ROUTE_HANDLERS** or **STUB_WITHOUT_CROSSMINT** |

### 2.4 Redemption Routes

| File                                         | Line(s) | What                                                              | Action                |
| -------------------------------------------- | ------- | ----------------------------------------------------------------- | --------------------- |
| `server/routes/rewards/redemption-routes.ts` | 16      | `nftMints` in import from `@shared/schema`                        | **REMOVE_IMPORT**     |
| `server/routes/rewards/redemption-routes.ts` | 349-354 | NFT reward minting block (`if (reward.rewardType === 'nft' ...)`) | **REMOVE_CODE_BLOCK** |

### 2.5 Storage Routes

| File                                      | Line(s) | What                                                     | Action                                       |
| ----------------------------------------- | ------- | -------------------------------------------------------- | -------------------------------------------- |
| `server/routes/storage/storage-routes.ts` | 98      | Comment: `// JWKS endpoint for Crossmint JWT validation` | **UPDATE_COMMENT** (cosmetic — low priority) |

### 2.6 JWT Service

| File                                  | Line(s) | What                                                                                                   | Action                                        |
| ------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| `server/services/auth/jwt-service.ts` | 31      | `const JWT_AUDIENCE = process.env.JWT_AUDIENCE \|\| 'crossmint';` — default value references Crossmint | **CHANGE_DEFAULT** to `'fandomly'` or similar |

### 2.7 Shared Schema (`shared/schema.ts`)

| Line(s)   | What                                                                                                                                                                                                        | Action                                                              |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 674       | `rewardType` includes `"nft"` in comment                                                                                                                                                                    | **REMOVE_NFT_FROM_ENUM_COMMENT**                                    |
| 676-693   | `nftMetadata` and `nftData` fields in reward data type                                                                                                                                                      | **REMOVE_FIELDS**                                                   |
| 787       | `nftTxHash` optional field                                                                                                                                                                                  | **REMOVE_FIELD**                                                    |
| 857       | `rewardTypeEnum` includes `'nft'`                                                                                                                                                                           | **REMOVE_VALUE** (caution: requires migration)                      |
| 962       | `campaignTypes` default includes `'nft'` comment                                                                                                                                                            | **UPDATE_COMMENT**                                                  |
| 966       | type union includes `'nft'`                                                                                                                                                                                 | **REMOVE_VALUE**                                                    |
| 978       | `requiredNftCollectionIds` field on campaigns                                                                                                                                                               | **REMOVE_COLUMN** (requires migration)                              |
| 1042      | `nftContractAddress` optional field                                                                                                                                                                         | **REMOVE_FIELD**                                                    |
| 2150      | `rewardType` includes `"nft"` in comment                                                                                                                                                                    | **UPDATE_COMMENT**                                                  |
| 2423-2720 | **Entire NFT & Crossmint integration section**: `nftTokenTypeEnum`, `nftMintStatusEnum`, `nftCategoryEnum`, `nftCollections`, `nftTemplates`, `nftMints`, `nftDeliveries` tables + all relation definitions | **REMOVE_TABLES_AND_RELATIONS** (requires migration to drop tables) |

### 2.8 Task Rule Schema (`shared/taskRuleSchema.ts`)

| Line(s) | What                                         | Action                       |
| ------- | -------------------------------------------- | ---------------------------- |
| 22      | `"token_activity"` category with NFT comment | **REMOVE_OR_UPDATE_COMMENT** |
| 357     | `"wallet"` in platform enum                  | **REMOVE_VALUE**             |
| 360-363 | `supportedWallets` field (`evm`, `solana`)   | **REMOVE_FIELD**             |
| 490     | `"connect_wallet"` task type                 | **REMOVE_VALUE**             |

### 2.9 Client App Router (`client/src/App.tsx`)

| Line(s) | What                                                                       | Action            |
| ------- | -------------------------------------------------------------------------- | ----------------- |
| 36      | `import NftCollections from "@/pages/creator-dashboard/nft-collections";`  | **REMOVE_IMPORT** |
| 52      | `import FanNftCollection from "@/pages/fan-dashboard/nft-collection";`     | **REMOVE_IMPORT** |
| 92      | `import AdminNftManagement from "@/pages/admin-dashboard/nft-management";` | **REMOVE_IMPORT** |
| 130     | `<Route path="/creator-dashboard/nft-collections" ...>`                    | **REMOVE_ROUTE**  |
| 151     | `<Route path="/fan-dashboard/nfts" ...>`                                   | **REMOVE_ROUTE**  |
| 193     | `<Route path="/admin-dashboard/nft-management" ...>`                       | **REMOVE_ROUTE**  |

### 2.10 Creator Dashboard — Rewards Page

| File                                             | Line(s)  | What                                                                       | Action                     |
| ------------------------------------------------ | -------- | -------------------------------------------------------------------------- | -------------------------- |
| `client/src/pages/creator-dashboard/rewards.tsx` | 26       | Import from `useCrossmint` (`useNftCollections`, `useNftTemplates`, types) | **REMOVE_IMPORT**          |
| Same                                             | 35       | `"nft"` in reward type enum                                                | **REMOVE_VALUE**           |
| Same                                             | 51       | NFT icon case                                                              | **REMOVE_CASE**            |
| Same                                             | 62       | NFT color case                                                             | **REMOVE_CASE**            |
| Same                                             | 389-392  | NFT reward data display block                                              | **REMOVE_CODE_BLOCK**      |
| Same                                             | 404-412  | NFT collection/template state and hooks                                    | **REMOVE_STATE_AND_HOOKS** |
| Same                                             | 452-455  | `nftData` default in form                                                  | **REMOVE_FIELD**           |
| Same                                             | 474      | NFT branch in reward data transform                                        | **REMOVE_BRANCH**          |
| Same                                             | 481-482  | NFT template preview watch                                                 | **REMOVE_CODE**            |
| Same                                             | 498      | NFT placeholder text                                                       | **UPDATE_PLACEHOLDER**     |
| Same                                             | 545      | `"nft"` SelectItem in reward type dropdown                                 | **REMOVE_OPTION**          |
| Same                                             | 939-1069 | Entire NFT reward configuration section (~130 lines)                       | **REMOVE_CODE_BLOCK**      |

### 2.11 Campaign Builder

| File                                    | Line(s) | What                                         | Action                                       |
| --------------------------------------- | ------- | -------------------------------------------- | -------------------------------------------- |
| `client/src/pages/campaign-builder.tsx` | 23      | `Wallet` import from lucide-react            | **REMOVE_IMPORT** (if no other Wallet usage) |
| Same                                    | 25      | `import ConnectWalletButton`                 | **REMOVE_IMPORT**                            |
| Same                                    | 176     | `requiredNftCollectionIds` in state          | **REMOVE_FIELD**                             |
| Same                                    | 189-218 | Wallet connect guard UI section              | **REMOVE_CODE_BLOCK** or **REPLACE**         |
| Same                                    | 603-616 | NFT & Badge Requirements section             | **REMOVE_CODE_BLOCK**                        |
| Same                                    | 771-779 | NFT requirements display in review           | **REMOVE_CODE_BLOCK**                        |
| Same                                    | 918     | `requiredNftCollectionIds` in submit payload | **REMOVE_FIELD**                             |

### 2.12 Admin Sidebar

| File                                           | Line(s) | What                    | Action              |
| ---------------------------------------------- | ------- | ----------------------- | ------------------- |
| `client/src/components/admin/AdminSidebar.tsx` | 84-88   | NFT Management nav item | **REMOVE_NAV_ITEM** |

### 2.13 Admin Badge Manager

| File                                                | Line(s) | What                  | Action                            |
| --------------------------------------------------- | ------- | --------------------- | --------------------------------- |
| `client/src/components/admin/AdminBadgeManager.tsx` | 172     | `Solana (cNFT)` label | **UPDATE_LABEL** to just `Solana` |

### 2.14 Creator Type Selection

| File                                          | Line(s) | What                                              | Action                                                          |
| --------------------------------------------- | ------- | ------------------------------------------------- | --------------------------------------------------------------- |
| `client/src/pages/creator-type-selection.tsx` | 30      | `'Physical & NFT / Digital Collectibles Support'` | **UPDATE_STRING** → `'Physical & Digital Collectibles Support'` |
| Same                                          | 48      | `'Physical & NFT / Digital Collectibles'`         | **UPDATE_STRING** → `'Physical & Digital Collectibles'`         |

### 2.15 Connect Wallet Button Component

| File                                                   | What                                       | Action                                                          |
| ------------------------------------------------------ | ------------------------------------------ | --------------------------------------------------------------- |
| `client/src/components/auth/connect-wallet-button.tsx` | Standalone wallet connect button component | **DELETE_FILE** (only used in campaign-builder NFT/wallet flow) |

### 2.16 Dynamic Wallets Hook

| File                                    | What                                                                                 | Action          |
| --------------------------------------- | ------------------------------------------------------------------------------------ | --------------- |
| `client/src/hooks/useDynamicWallets.ts` | Stub for Dynamic wallet functionality (already notes "Dynamic SDK has been removed") | **DELETE_FILE** |

### 2.17 Admin Analytics (Wallet Analytics)

| File                                             | Line(s)                                                                  | What                                                                                                                                | Action                          |
| ------------------------------------------------ | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `client/src/pages/admin-dashboard/analytics.tsx` | 5, 10, 15, 68, 73, 77-81, 86-90, 129, 174-204, 288-347, 452-489, 542-580 | Wallet analytics tab, `useDynamicWalletAnalytics`, `useDynamicWalletBreakdown` hooks, wallet distribution chart, wallet tab content | **REMOVE_WALLET_TAB_AND_HOOKS** |

### 2.18 Dynamic Analytics Hook

| File                                      | Line(s)        | What                                                                  | Action               |
| ----------------------------------------- | -------------- | --------------------------------------------------------------------- | -------------------- |
| `client/src/hooks/useDynamicAnalytics.ts` | 18-35, 113-130 | `useDynamicWalletAnalytics` and `useDynamicWalletBreakdown` functions | **REMOVE_FUNCTIONS** |

### 2.19 Admin User Role Manager

| File                                                | Line(s)                 | What                                  | Action                       |
| --------------------------------------------------- | ----------------------- | ------------------------------------- | ---------------------------- |
| `client/src/components/admin/user-role-manager.tsx` | 30, 41, 50, 58, 194-195 | `walletAddress` mock data and display | **REMOVE_FIELD_AND_DISPLAY** |

### 2.20 Fan Dashboard Pages (Wallet connect prompts)

| File                                               | Line(s) | What                              | Action          |
| -------------------------------------------------- | ------- | --------------------------------- | --------------- |
| `client/src/pages/fan-dashboard/campaigns.tsx`     | 229     | "Please connect your wallet" text | **UPDATE_TEXT** |
| `client/src/pages/creator-dashboard/campaigns.tsx` | 56      | "Please connect your wallet" text | **UPDATE_TEXT** |
| `client/src/pages/creator-dashboard/social.tsx`    | 255     | "Please connect your wallet" text | **UPDATE_TEXT** |
| `client/src/pages/creator-dashboard/settings.tsx`  | 71      | "Please connect your wallet" text | **UPDATE_TEXT** |
| `client/src/pages/creator-dashboard.tsx`           | 621     | "Please connect your wallet" text | **UPDATE_TEXT** |

### 2.21 Users Table Schema (`shared/schema.ts`)

| Line(s) | What                                                     | Action                                  |
| ------- | -------------------------------------------------------- | --------------------------------------- |
| 171-172 | `walletAddress` and `walletChain` columns on users table | **REMOVE_COLUMNS** (requires migration) |

### 2.22 NFT Collections Table Column (`shared/schema.ts`)

| Line(s) | What                                               | Action                            |
| ------- | -------------------------------------------------- | --------------------------------- |
| 2461    | `crossmintCollectionId` column on `nftCollections` | Covered by table deletion in §2.7 |
| 2577    | `crossmintActionId` column on `nftMints`           | Covered by table deletion in §2.7 |

### 2.23 Admin Layout

| File                                          | Line(s) | What                              | Action                     |
| --------------------------------------------- | ------- | --------------------------------- | -------------------------- |
| `client/src/components/admin/AdminLayout.tsx` | 7       | `Wallet` import from lucide-react | **REMOVE_IMPORT**          |
| Same                                          | 67      | `<Wallet>` icon usage             | **REMOVE_OR_REPLACE_ICON** |

### 2.24 Creator Revenue Page

| File                                             | Line(s) | What                           | Action                                                                 |
| ------------------------------------------------ | ------- | ------------------------------ | ---------------------------------------------------------------------- |
| `client/src/pages/creator-dashboard/revenue.tsx` | 11, 287 | `Wallet` import and icon usage | **REVIEW** — may be used for general revenue display, not NFT-specific |

---

## 3. Migration / SQL files (DO NOT DELETE — reference only)

These files **should NOT be deleted** as they represent the migration history. A **new migration** should be created to drop the NFT tables and remove NFT-related columns.

| File                                              | NFT-related content                                                                                                                                                                                                   |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `migrations/0002_crazy_moondragon.sql`            | Creates `reward_type` enum with `'nft'` value                                                                                                                                                                         |
| `migrations/0004_worthless_iron_fist.sql`         | Creates `nft_category`, `nft_mint_status`, `nft_token_type` enums; creates `nft_collections`, `nft_deliveries`, `nft_mints`, `nft_templates` tables; adds `crossmint_collection_id` and `crossmint_action_id` columns |
| `migrations/0010_add_critical_indexes.sql`        | Adds indexes on `nft_collections`, `nft_mints`, `nft_deliveries` tables                                                                                                                                               |
| `migrations/0011_fix_enum_mismatches.sql`         | Comments on `nft_mint_status`, `nft_token_type`, `nft_category` enums                                                                                                                                                 |
| `migrations/0012_add_data_constraints.sql`        | Adds supply/count constraints on `nft_templates`, `nft_mints`                                                                                                                                                         |
| `migrations/0013_update_foreign_key_cascades.sql` | Updates FK cascades for `nft_collections`, `nft_templates`, `nft_mints`, `nft_deliveries`                                                                                                                             |
| `migrations/0014_add_soft_delete.sql`             | Adds soft-delete columns to `nft_collections`, `nft_templates`, `nft_mints`                                                                                                                                           |
| `migrations/0015_add_updated_at_columns.sql`      | Adds `updated_at` to `nft_collections`, `nft_templates`, `nft_mints`, `nft_deliveries`                                                                                                                                |
| `migrations/0016_add_timestamp_triggers.sql`      | Adds update triggers for NFT tables                                                                                                                                                                                   |
| `migrations/0017_add_materialized_views.sql`      | References `nft_collections`, `nft_mints` in materialized views                                                                                                                                                       |
| `migrations/0018_add_audit_trail.sql`             | Adds audit triggers for `nft_collections`, `nft_mints`                                                                                                                                                                |
| `migrations/0021_fix_reserved_username.sql`       | Reserved username list includes `'nft'`, `'nfts'`                                                                                                                                                                     |
| `migrations/meta/0002_snapshot.json`              | Snapshot includes `reward_type` with `'nft'`                                                                                                                                                                          |
| `migrations/meta/0003_snapshot.json`              | Snapshot includes NFT content                                                                                                                                                                                         |
| `migrations/meta/0004_snapshot.json`              | Full snapshot of NFT tables, `crossmint_collection_id`, `crossmint_action_id`                                                                                                                                         |

### New migration needed:

```sql
-- Drop NFT tables (in dependency order)
DROP TABLE IF EXISTS nft_deliveries CASCADE;
DROP TABLE IF EXISTS nft_mints CASCADE;
DROP TABLE IF EXISTS nft_templates CASCADE;
DROP TABLE IF EXISTS nft_collections CASCADE;

-- Drop NFT enums
DROP TYPE IF EXISTS nft_category;
DROP TYPE IF EXISTS nft_mint_status;
DROP TYPE IF EXISTS nft_token_type;

-- Remove 'nft' from reward_type enum (ALTER TYPE ... requires recreation)
-- Remove walletAddress, walletChain from users table
ALTER TABLE users DROP COLUMN IF EXISTS wallet_address;
ALTER TABLE users DROP COLUMN IF EXISTS wallet_chain;

-- Remove requiredNftCollectionIds from campaigns (if stored as column)
-- Note: This is a JSONB field, so it may just need schema-level removal

-- Update materialized views that reference NFT tables
-- (migrations/0017 views will need to be recreated without NFT joins)
```

---

## 4. Documentation files to DELETE

| File                                       | What                                                                                                                 | Action                                        |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `docs/NFT_QUICKSTART.md`                   | NFT quickstart guide                                                                                                 | **DELETE_FILE**                               |
| `docs/NFT_AUTHENTICATION.md`               | NFT auth flow documentation                                                                                          | **DELETE_FILE**                               |
| `docs/NFT_FRONTEND_COMPONENTS.md`          | NFT frontend component docs                                                                                          | **DELETE_FILE**                               |
| `docs/CROSSMINT_IMPLEMENTATION_SUMMARY.md` | Crossmint implementation summary                                                                                     | **DELETE_FILE**                               |
| `docs/CROSSMINT_NFT_INTEGRATION.md`        | Crossmint NFT integration guide                                                                                      | **DELETE_FILE**                               |
| `docs/TASK_VERIFICATION_AUDIT_REPORT.md`   | Contains Crossmint/NFT references (lines 25, 85-103, 258-270, 317-318, 384, 409-410, 494-510, 563-565, 632-634, 683) | **EDIT_FILE** — remove Crossmint/NFT sections |

---

## 5. Environment variables to remove

| Variable                   | Used In                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| `CROSSMINT_API_KEY`        | `server/services/nft/crossmint-service.ts`, `server/routes/programs/leaderboard-routes.ts` |
| `CROSSMINT_PROJECT_ID`     | `server/services/nft/crossmint-service.ts`                                                 |
| `CROSSMINT_SERVER_API_KEY` | `server/services/wallet/wallet-service.ts`                                                 |
| `CROSSMINT_ENV`            | `server/services/wallet/wallet-service.ts`                                                 |
| `CROSSMINT_ENVIRONMENT`    | `server/services/nft/crossmint-service.ts`                                                 |
| `CROSSMINT_WEBHOOK_SECRET` | Referenced in docs but not yet in code                                                     |
| `DEFAULT_WALLET_CHAIN`     | `server/services/wallet/wallet-service.ts`                                                 |

Remove from: `.env`, `.env.example`, any deployment configs, CI/CD secrets.

---

## Summary Statistics

| Category                        | Count                                                                                                                  |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Files to DELETE entirely        | 18 (13 code + 5 docs)                                                                                                  |
| Files requiring partial edits   | ~25                                                                                                                    |
| Database tables to drop         | 4 (`nft_collections`, `nft_templates`, `nft_mints`, `nft_deliveries`)                                                  |
| Database enums to drop          | 3 (`nft_category`, `nft_mint_status`, `nft_token_type`)                                                                |
| Database columns to remove      | 4 (`wallet_address`, `wallet_chain` on users; `crossmint_collection_id`, `crossmint_action_id` covered by table drops) |
| Environment variables to remove | 7                                                                                                                      |
| Migration files to write        | 1 (to drop tables/columns/enums)                                                                                       |

---

## Recommended Removal Order

1. **Client hooks** (`useCrossmint.ts`, `useUserNFTs.ts`, `useDynamicWallets.ts`) — removes foundation
2. **Client components** (`nft/` dir, `nft-card.tsx`, `AdminNftDistribution.tsx`, `connect-wallet-button.tsx`)
3. **Client pages** (nft-collections, nft-collection, nft-management)
4. **Client router** (`App.tsx` route removals)
5. **Client page edits** (rewards.tsx, campaign-builder.tsx, analytics.tsx, etc.)
6. **Server services** (`crossmint-service.ts`, `wallet-service.ts`, `badge-rewards-service.ts`)
7. **Server routes** (`crossmint-routes.ts`, then partial edits to `main.ts`, `leaderboard-routes.ts`, `redemption-routes.ts`)
8. **Server entry** (`index.ts` import/init removal)
9. **Shared schema** (remove NFT tables, enums, relations, fields)
10. **New migration** (drop tables, columns, enums)
11. **Documentation** (delete NFT/Crossmint docs, edit audit report)
12. **Environment** (remove env vars from all configs)
