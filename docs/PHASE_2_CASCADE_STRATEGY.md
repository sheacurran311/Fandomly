# Phase 2: Foreign Key Cascade Strategy

**Purpose:** Define proper cascade behaviors to prevent orphaned records and ensure data integrity
**Date:** November 10, 2025

---

## 🎯 Cascade Behavior Types

### CASCADE
**When to use:** Parent deletion should automatically delete children
**Example:** Delete user → delete their social connections

### RESTRICT
**When to use:** Prevent parent deletion if children exist
**Example:** Prevent tenant deletion if creators exist (must clean up first)

### SET NULL
**When to use:** Optional relationships that can exist without parent
**Example:** Delete campaign → set tasks.campaign_id to NULL

### NO ACTION (Current Default)
**Problem:** Causes database errors, orphaned records
**Solution:** Replace with one of the above

---

## 📋 Current State Analysis

### ✅ Already Has Proper Cascades:
```typescript
// Good examples:
socialConnections.userId → users.id (CASCADE) ✅
taskCompletions.taskId → tasks.id (CASCADE) ✅
taskCompletions.userId → users.id (CASCADE) ✅
campaignRules.campaignId → campaigns.id (CASCADE) ✅
notifications.userId → users.id (CASCADE) ✅
```

### ❌ Missing Cascade Behaviors:

#### **High Priority - Data Integrity**

**1. Creators Table**
```typescript
// Current (NO ACTION - BAD!)
creators.userId → users.id

// Should be (CASCADE)
// When user deleted → delete their creator profile
creators.userId → users.id (CASCADE)

// Current (NO ACTION - BAD!)
creators.tenantId → tenants.id

// Should be (RESTRICT)
// Prevent tenant deletion if creators exist
creators.tenantId → tenants.id (RESTRICT)
```

**2. Tasks Table**
```typescript
// Current (NO ACTION - BAD!)
tasks.creatorId → creators.id
tasks.tenantId → tenants.id
tasks.programId → loyaltyPrograms.id

// Should be:
tasks.creatorId → creators.id (CASCADE)
tasks.tenantId → tenants.id (RESTRICT)
tasks.programId → loyaltyPrograms.id (CASCADE)
tasks.campaignId → campaigns.id (SET NULL) // Optional relationship
```

**3. Campaigns Table**
```typescript
// Current (NO ACTION - BAD!)
campaigns.creatorId → creators.id
campaigns.tenantId → tenants.id
campaigns.programId → loyaltyPrograms.id

// Should be:
campaigns.creatorId → creators.id (CASCADE)
campaigns.tenantId → tenants.id (RESTRICT)
campaigns.programId → loyaltyPrograms.id (RESTRICT) // Don't delete program if campaigns exist
```

**4. Loyalty Programs Table**
```typescript
// Current (NO ACTION - BAD!)
loyaltyPrograms.tenantId → tenants.id
loyaltyPrograms.creatorId → creators.id

// Should be:
loyaltyPrograms.tenantId → tenants.id (RESTRICT) // Prevent tenant deletion
loyaltyPrograms.creatorId → creators.id (CASCADE) // Delete program when creator deleted
```

**5. Rewards Table**
```typescript
// Current (NO ACTION - BAD!)
rewards.tenantId → tenants.id
rewards.programId → loyaltyPrograms.id

// Should be:
rewards.tenantId → tenants.id (RESTRICT)
rewards.programId → loyaltyPrograms.id (CASCADE) // Delete rewards when program deleted
```

**6. Fan Programs Table**
```typescript
// Current (NO ACTION - BAD!)
fanPrograms.tenantId → tenants.id
fanPrograms.fanId → users.id
fanPrograms.programId → loyaltyPrograms.id

// Should be:
fanPrograms.tenantId → tenants.id (RESTRICT)
fanPrograms.fanId → users.id (CASCADE) // Delete fan membership when user deleted
fanPrograms.programId → loyaltyPrograms.id (CASCADE) // Delete fan membership when program deleted
```

**7. Point Transactions Table**
```typescript
// Current (NO ACTION - BAD!)
pointTransactions.tenantId → tenants.id
pointTransactions.fanProgramId → fanPrograms.id

// Should be:
pointTransactions.tenantId → tenants.id (RESTRICT) // Financial data - keep for audit
pointTransactions.fanProgramId → fanPrograms.id (CASCADE) // Delete transactions when membership deleted
```

**8. Reward Redemptions Table**
```typescript
// Current (NO ACTION - BAD!)
rewardRedemptions.tenantId → tenants.id
rewardRedemptions.fanId → users.id
rewardRedemptions.rewardId → rewards.id

// Should be:
rewardRedemptions.tenantId → tenants.id (RESTRICT) // Financial data - keep for audit
rewardRedemptions.fanId → users.id (CASCADE)
rewardRedemptions.rewardId → rewards.id (RESTRICT) // Prevent reward deletion if redemptions exist
```

**9. Tenant Memberships Table**
```typescript
// Current (NO ACTION - BAD!)
tenantMemberships.tenantId → tenants.id
tenantMemberships.userId → users.id

// Should be:
tenantMemberships.tenantId → tenants.id (CASCADE) // Delete memberships when tenant deleted
tenantMemberships.userId → users.id (CASCADE) // Delete memberships when user deleted
```

**10. NFT Collections Table**
```typescript
// Current (NO ACTION - BAD!)
nftCollections.creatorId → creators.id
nftCollections.tenantId → tenants.id

// Should be:
nftCollections.creatorId → creators.id (CASCADE) // Delete collections when creator deleted
nftCollections.tenantId → tenants.id (RESTRICT)
```

**11. NFT Mints Table**
```typescript
// Current (NO ACTION - BAD!)
nftMints.collectionId → nftCollections.id
nftMints.recipientUserId → users.id

// Should be:
nftMints.collectionId → nftCollections.id (CASCADE)
nftMints.recipientUserId → users.id (RESTRICT) // Don't delete user if they have NFTs
```

**12. Referral Tables**
```typescript
// Current (NO ACTION - BAD!)
fanReferrals.referringFanId → users.id
fanReferrals.referredFanId → users.id
creatorReferrals.referringCreatorId → creators.id
creatorReferrals.referredCreatorId → creators.id

// Should be:
fanReferrals.referringFanId → users.id (CASCADE)
fanReferrals.referredFanId → users.id (SET NULL) // Keep referral record for analytics
creatorReferrals.referringCreatorId → creators.id (CASCADE)
creatorReferrals.referredCreatorId → creators.id (SET NULL)
```

---

## 🎯 Cascade Strategy Summary

### CASCADE (Auto-delete children)
Use when child data is meaningless without parent:
- `users → socialConnections` (social accounts belong to user)
- `users → creators` (creator profile belongs to user)
- `creators → campaigns` (campaigns belong to creator)
- `creators → tasks` (tasks belong to creator)
- `creators → loyaltyPrograms` (programs belong to creator)
- `loyaltyPrograms → rewards` (rewards belong to program)
- `loyaltyPrograms → fanPrograms` (memberships belong to program)
- `fanPrograms → pointTransactions` (transactions belong to membership)
- `tasks → taskCompletions` (completions belong to task)
- `users → taskCompletions` (completions belong to user)
- `campaigns → campaignRules` (rules belong to campaign)
- `users → notifications` (notifications belong to user)
- `tenants → tenantMemberships` (memberships belong to tenant)
- `users → tenantMemberships` (memberships belong to user)

### RESTRICT (Prevent deletion)
Use for important parent data:
- `tenants → creators` (must delete creators first)
- `tenants → campaigns` (must delete campaigns first)
- `tenants → loyaltyPrograms` (must delete programs first)
- `tenants → rewards` (must delete rewards first)
- `tenants → pointTransactions` (financial data - audit trail)
- `tenants → rewardRedemptions` (financial data - audit trail)
- `rewards → rewardRedemptions` (must handle redemptions first)
- `campaigns → loyaltyPrograms` (must delete campaigns first)
- `users → nftMints` (don't delete user if they have NFTs)

### SET NULL (Optional relationships)
Use when relationship can be broken without losing child data:
- `tasks.campaignId → campaigns` (task can exist without campaign)
- `fanReferrals.referredFanId → users` (keep referral record for analytics)
- `creatorReferrals.referredCreatorId → creators` (keep referral record for analytics)

---

## 🔄 Migration Strategy

### Step 1: Identify All Existing Foreign Keys
```sql
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.update_rule,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;
```

### Step 2: Drop and Recreate with Correct Cascades
```sql
-- Example pattern:
ALTER TABLE creators DROP CONSTRAINT IF EXISTS creators_user_id_users_id_fk;
ALTER TABLE creators ADD CONSTRAINT creators_user_id_users_id_fk
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE creators DROP CONSTRAINT IF EXISTS creators_tenant_id_tenants_id_fk;
ALTER TABLE creators ADD CONSTRAINT creators_tenant_id_tenants_id_fk
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
```

### Step 3: Update Schema.ts
Update Drizzle schema definitions to match:
```typescript
export const creators = pgTable("creators", {
  // ...
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: 'restrict' }).notNull(),
  // ...
});
```

---

## 📊 Impact Analysis

### Before Cascade Fix:
```
❌ Delete user → Creator profile remains (orphaned)
❌ Delete tenant → All data remains (orphaned)
❌ Delete creator → Campaigns remain (orphaned)
❌ Delete task → Completions remain (orphaned)
❌ Database errors on constraint violations
```

### After Cascade Fix:
```
✅ Delete user → Creator profile deleted automatically
✅ Delete user → Social connections deleted automatically
✅ Delete user → Task completions deleted automatically
✅ Delete creator → Campaigns deleted automatically
✅ Delete tenant → RESTRICTED (must clean up first) - prevents accidents
✅ Delete task → Completions deleted automatically
✅ Clean, consistent data relationships
```

---

## ⚠️ Important Considerations

### Financial Data (RESTRICT)
Keep RESTRICT on financial/audit tables:
- `pointTransactions` - Audit trail required
- `rewardRedemptions` - Financial records
- Keep historical data even if user deleted

### Soft Delete Alternative
For important data, consider soft delete instead:
- Add `deleted_at` column
- Query with `WHERE deleted_at IS NULL`
- Recoverable data
- Maintains referential integrity

---

## 🎯 Next Steps

1. ✅ Create migration 0013_update_foreign_key_cascades.sql
2. ✅ Update schema.ts with proper cascade behaviors
3. ✅ Test in staging environment
4. ✅ Verify no orphaned records after deployment
5. ✅ Monitor for constraint violation errors (should be zero)

---

**Status:** Ready for implementation
**Risk:** Low - Only changes cascade behavior, doesn't modify data
**Rollback:** Can revert to NO ACTION if needed

