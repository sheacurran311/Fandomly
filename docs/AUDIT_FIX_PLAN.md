# Audit Fix Plan - Prioritized Implementation

**Date:** November 21, 2025  
**Total Issues:** 13  
**Estimated Total Time:** 25-33 hours  
**Recommended Timeline:** 1-2 weeks

---

## Phase 1: Critical Fixes (MUST DO IMMEDIATELY)

**Timeline:** 1 day  
**Total Time:** 3-4 hours  
**Risk if Skipped:** Data integrity issues, broken features

### FIX-001: Apply Sprint 2 Migration
**Issue ID:** CRITICAL-001  
**Priority:** CRITICAL  
**Estimated Time:** 30 minutes

**Steps:**
```bash
# 1. Backup database first
pg_dump "$DATABASE_URL" > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Apply migration
psql "$DATABASE_URL" < migrations/0025_add_sprint2_interactive_tasks.sql

# 3. Verify enum values
psql "$DATABASE_URL" -c "SELECT unnest(enum_range(NULL::task_type))::text;"
# Should include: website_visit, poll, quiz

# 4. Verify tables exist
psql "$DATABASE_URL" -c "\dt" | grep -E "website_visit_tracking|poll_quiz_responses"
```

**Validation:**
- All 3 task types exist in enum
- Both new tables created
- Indexes created successfully

---

### FIX-002: Add ON DELETE Constraints to reward_distributions
**Issue ID:** CRITICAL-002  
**Priority:** CRITICAL  
**Estimated Time:** 15 minutes

**SQL Script:**
```sql
-- Fix reward_distributions.task_id foreign key
ALTER TABLE reward_distributions
DROP CONSTRAINT IF EXISTS reward_distributions_task_id_tasks_id_fk;

ALTER TABLE reward_distributions
ADD CONSTRAINT reward_distributions_task_id_tasks_id_fk
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

-- Fix reward_distributions.tenant_id foreign key
ALTER TABLE reward_distributions
DROP CONSTRAINT IF EXISTS reward_distributions_tenant_id_tenants_id_fk;

ALTER TABLE reward_distributions
ADD CONSTRAINT reward_distributions_tenant_id_tenants_id_fk
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;

-- Verify constraints
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name = 'reward_distributions'
  AND tc.constraint_type = 'FOREIGN KEY';
```

**Validation:**
- Constraint shows `CASCADE` for task_id
- Constraint shows `RESTRICT` for tenant_id

---

### FIX-003: Add JSONB Reference Validation
**Issue ID:** CRITICAL-003  
**Priority:** CRITICAL  
**Estimated Time:** 2-3 hours

**Implementation:**

**File:** `server/campaign-routes.ts`
```typescript
// Add validation function
async function validateCampaignReferences(campaignData: any) {
  const errors: string[] = [];

  // Validate prerequisite campaigns
  if (campaignData.prerequisiteCampaigns?.length > 0) {
    const existing = await db.select({ id: campaigns.id })
      .from(campaigns)
      .where(inArray(campaigns.id, campaignData.prerequisiteCampaigns));
    
    const existingIds = new Set(existing.map(c => c.id));
    const invalid = campaignData.prerequisiteCampaigns.filter(id => !existingIds.has(id));
    
    if (invalid.length > 0) {
      errors.push(`Invalid prerequisite campaigns: ${invalid.join(', ')}`);
    }
  }

  // Validate required tasks
  if (campaignData.requiredTaskIds?.length > 0) {
    const existing = await db.select({ id: tasks.id })
      .from(tasks)
      .where(inArray(tasks.id, campaignData.requiredTaskIds));
    
    const existingIds = new Set(existing.map(t => t.id));
    const invalid = campaignData.requiredTaskIds.filter(id => !existingIds.has(id));
    
    if (invalid.length > 0) {
      errors.push(`Invalid required tasks: ${invalid.join(', ')}`);
    }
  }

  // Validate NFT collections (if table exists)
  if (campaignData.requiredNftCollectionIds?.length > 0) {
    const existing = await db.select({ id: nftCollections.id })
      .from(nftCollections)
      .where(inArray(nftCollections.id, campaignData.requiredNftCollectionIds));
    
    const existingIds = new Set(existing.map(c => c.id));
    const invalid = campaignData.requiredNftCollectionIds.filter(id => !existingIds.has(id));
    
    if (invalid.length > 0) {
      errors.push(`Invalid NFT collections: ${invalid.join(', ')}`);
    }
  }

  // Validate badge templates
  if (campaignData.requiredBadgeIds?.length > 0) {
    const existing = await db.select({ id: fandomlyBadgeTemplates.id })
      .from(fandomlyBadgeTemplates)
      .where(inArray(fandomlyBadgeTemplates.id, campaignData.requiredBadgeIds));
    
    const existingIds = new Set(existing.map(b => b.id));
    const invalid = campaignData.requiredBadgeIds.filter(id => !existingIds.has(id));
    
    if (invalid.length > 0) {
      errors.push(`Invalid badge templates: ${invalid.join(', ')}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Campaign reference validation failed: ${errors.join('; ')}`);
  }
}

// Use in campaign create/update routes
app.post('/api/campaigns', async (req, res) => {
  try {
    // Existing validation...
    
    // Add reference validation
    await validateCampaignReferences(req.body);
    
    // Proceed with creation...
  } catch (error) {
    // Handle validation error
  }
});
```

**Validation:**
- Try creating campaign with invalid prerequisite ID → should fail
- Try creating campaign with valid references → should succeed
- Check error messages are clear

---

## Phase 2: High Priority Fixes (BEFORE NEW FEATURES)

**Timeline:** 3-4 days  
**Total Time:** 10-14 hours  
**Risk if Skipped:** Performance degradation, potential data issues

### FIX-004: Fix N+1 Query in Task Completion Enrichment
**Issue ID:** HIGH-002  
**Priority:** HIGH  
**Estimated Time:** 1-2 hours

**File:** `server/storage.ts`
```typescript
async getUserTaskCompletions(userId: string, tenantId?: string): Promise<any[]> {
  const conditions = tenantId 
    ? and(eq(taskCompletions.userId, userId), eq(taskCompletions.tenantId, tenantId))
    : eq(taskCompletions.userId, userId);
  
  const completions = await db.select().from(taskCompletions)
    .where(conditions)
    .orderBy(desc(taskCompletions.lastActivityAt));

  // ✅ Batch fetch all tasks first (NEW)
  const taskIds = [...new Set(completions.map(c => c.taskId))];
  const tasksData = await db.query.tasks.findMany({
    where: inArray(tasks.id, taskIds)
  });
  const tasksMap = new Map(tasksData.map(t => [t.id, t]));

  const { taskFrequencyService } = await import('./services/task-frequency-service');

  // Enrich with cached task data
  const enrichedCompletions = await Promise.all(
    completions.map(async (completion) => {
      if (completion.status !== 'completed') {
        return { ...completion, isAvailableAgain: false };
      }

      // ✅ Get task from cache instead of query
      const task = tasksMap.get(completion.taskId);
      if (!task) {
        return { ...completion, isAvailableAgain: false };
      }

      // Only check eligibility if repeatable frequency
      if (['daily', 'weekly', 'monthly'].includes(task.rewardFrequency || '')) {
        const eligibility = await taskFrequencyService.checkEligibility({
          userId,
          taskId: completion.taskId,
          tenantId: completion.tenantId,
        });

        return {
          ...completion,
          isAvailableAgain: eligibility.isEligible,
          nextAvailableAt: eligibility.nextAvailableAt,
          timeRemaining: eligibility.isEligible ? null : await taskFrequencyService.getTimeUntilAvailable({
            userId,
            taskId: completion.taskId,
            tenantId: completion.tenantId,
          }),
        };
      }

      return { ...completion, isAvailableAgain: false };
    })
  );

  return enrichedCompletions;
}
```

**Performance Improvement:**
- Before: N+1 queries (1 + N task queries)
- After: 2 queries (1 completion + 1 batch task fetch)

---

### FIX-005: Add Missing Indexes
**Issue ID:** HIGH-003  
**Priority:** HIGH  
**Estimated Time:** 30 minutes

**SQL Script:**
```sql
-- Index for frequency date checks
CREATE INDEX IF NOT EXISTS idx_task_completions_completed_at 
ON task_completions(completed_at DESC) 
WHERE status = 'completed';

-- Index for recent activity sorting
CREATE INDEX IF NOT EXISTS idx_task_completions_last_activity 
ON task_completions(last_activity_at DESC);

-- Index for active rewards filtering
CREATE INDEX IF NOT EXISTS idx_rewards_is_active 
ON rewards(is_active) 
WHERE is_active = TRUE;

-- Index for published programs
CREATE INDEX IF NOT EXISTS idx_loyalty_programs_status 
ON loyalty_programs(status) 
WHERE status = 'published';

-- Index for active campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_status 
ON campaigns(status) 
WHERE status IN ('active', 'scheduled');

-- Analyze tables for query planner
ANALYZE task_completions;
ANALYZE rewards;
ANALYZE loyalty_programs;
ANALYZE campaigns;
```

**Validation:**
```sql
-- Check indexes were created
SELECT indexname, tablename, indexdef
FROM pg_indexes
WHERE tablename IN ('task_completions', 'rewards', 'loyalty_programs', 'campaigns')
ORDER BY tablename, indexname;
```

---

### FIX-006: Add Transaction Handling for Point Awards
**Issue ID:** HIGH-004  
**Priority:** HIGH  
**Estimated Time:** 3-4 hours

**File:** `server/task-completion-routes.ts`
```typescript
// Wrap point award in transaction
app.post('/api/task-completions/:id/complete', async (req, res) => {
  try {
    // ... validation ...
    
    // ✅ Use transaction for atomicity
    const result = await db.transaction(async (tx) => {
      // 1. Update task completion
      const [updatedCompletion] = await tx
        .update(taskCompletions)
        .set({
          status: 'completed',
          completedAt: new Date(),
          progress: 100,
        })
        .where(eq(taskCompletions.id, completionId))
        .returning();

      // 2. Calculate points with multipliers
      const finalPoints = await multiplierService.calculateFinalPoints({
        basePoints: task.pointsToReward || 0,
        taskMultiplier: task.baseMultiplier,
        userId: req.user.id,
        tenantId,
      });

      // 3. Create reward distribution
      const [rewardDist] = await tx
        .insert(rewardDistributions)
        .values({
          userId: req.user.id,
          taskId: task.id,
          taskCompletionId: completionId,
          tenantId,
          rewardType: 'points',
          amount: finalPoints,
          reason: 'task_completion',
        })
        .returning();

      // 4. Update fan program points
      const [updatedFanProgram] = await tx
        .update(fanPrograms)
        .set({
          currentPoints: sql`${fanPrograms.currentPoints} + ${finalPoints}`,
          totalPointsEarned: sql`${fanPrograms.totalPointsEarned} + ${finalPoints}`,
        })
        .where(and(
          eq(fanPrograms.fanId, req.user.id),
          eq(fanPrograms.programId, task.programId!)
        ))
        .returning();

      // 5. Create point transaction
      const [pointTx] = await tx
        .insert(pointTransactions)
        .values({
          fanProgramId: updatedFanProgram.id,
          tenantId,
          points: finalPoints,
          type: 'earned',
          source: 'task_completion',
          metadata: {
            taskId: task.id,
            taskName: task.name,
            completionId,
          },
        })
        .returning();

      return {
        completion: updatedCompletion,
        reward: rewardDist,
        pointsAwarded: finalPoints,
      };
    });

    res.json(result);
  } catch (error) {
    // Transaction automatically rolled back on error
    console.error('Task completion failed:', error);
    res.status(500).json({ error: 'Failed to complete task' });
  }
});
```

**Validation:**
- Complete task → all records created
- Simulate error (e.g., invalid fanProgram) → no records created (rollback works)

---

### FIX-007: Document Dual Points Systems
**Issue ID:** HIGH-001  
**Priority:** HIGH  
**Estimated Time:** 4-6 hours (analysis + documentation + validation)

**Create Documentation:**  
**File:** `docs/POINTS_SYSTEM_ARCHITECTURE.md`

```markdown
# Points System Architecture

## Two Separate Points Systems

### 1. Program Points (fanPrograms.currentPoints)
- **Scope:** Program-specific
- **Use:** Points earned within a specific loyalty program
- **Storage:** `fan_programs.current_points`
- **Transactions:** `point_transactions` table
- **Redemption:** Program rewards only

**Example:**
- User joins "Thunder Points" program
- Earns 100 points in that program
- Can redeem for Thunder-specific rewards

### 2. Platform Points (tenantMemberships.balance)
- **Scope:** Platform-wide (cross-tenant)
- **Use:** Fandomly platform currency
- **Storage:** `tenant_memberships.balance`
- **Transactions:** `platform_points_transactions` table
- **Redemption:** Platform-level rewards

**Example:**
- User completes profile → 50 Fandomly Points
- Connects Twitter → 25 Fandomly Points
- Can use across all programs they join

## When Each System is Used

| Action | Program Points | Platform Points |
|--------|----------------|-----------------|
| Complete task | ✅ Yes | Maybe (if platform task) |
| Redeem reward | ✅ Yes | No |
| Referral bonus | ✅ Yes | Maybe |
| Profile completion | No | ✅ Yes |
| Social connection | No | ✅ Yes |

## Atomic Update Requirements

When awarding points:
1. Determine which system (or both)
2. Use database transaction
3. Update balance + create transaction record
4. Ensure both succeed or both fail

## Code Examples

See implementation in:
- `server/task-completion-routes.ts` - Task completion awards
- `server/points-routes.ts` - Platform points
- `server/storage.ts` - Point transaction creation
```

**Add to Codebase:**
- Code comments explaining which system in each function
- Validation to prevent mixing the two systems incorrectly

---

## Phase 3: Medium Priority Fixes (NEXT SPRINT)

**Timeline:** 1 week  
**Total Time:** 7-9 hours

### FIX-008: Add Zod Validation for JSONB Fields
**Issue ID:** MEDIUM-001  
**Priority:** MEDIUM  
**Estimated Time:** 4-6 hours

**Create Validation Schemas:**  
**File:** `shared/validation-schemas.ts`
```typescript
import { z } from 'zod';

export const multiplierConfigSchema = z.object({
  stackingType: z.enum(['additive', 'multiplicative']).optional(),
  maxMultiplier: z.number().min(1).max(100).optional(),
  allowEventMultipliers: z.boolean().optional(),
}).strict();

export const taskCustomSettingsSchema = z.record(z.unknown()); // Better than any

export const campaignVisibilityRulesSchema = z.object({
  segments: z.array(z.string()).optional(),
  tiers: z.array(z.string()).optional(),
  customAttributes: z.record(z.unknown()).optional(),
}).strict();

// Add schemas for all JSONB fields
```

**Use in Routes:**
```typescript
app.post('/api/tasks', async (req, res) => {
  try {
    // Validate JSONB fields
    if (req.body.multiplierConfig) {
      multiplierConfigSchema.parse(req.body.multiplierConfig);
    }
    
    // Proceed with creation
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid data',
        details: error.errors
      });
    }
  }
});
```

---

### FIX-009: Handle Task Campaign Deletion Logic
**Issue ID:** MEDIUM-002  
**Priority:** MEDIUM  
**Estimated Time:** 1-2 hours

**Decision Required:** Should tasks CASCADE delete with campaign or stay with SET NULL?

**Option A:** Keep SET NULL but handle in UI
```typescript
// In TaskCard component
{task.campaignId ? (
  <Badge>Campaign: {campaign?.name}</Badge>
) : (
  <Badge variant="secondary">Independent Task</Badge>
)}
```

**Option B:** Change to CASCADE if tasks are campaign-specific
```sql
ALTER TABLE tasks
DROP CONSTRAINT tasks_campaign_id_campaigns_id_fk;

ALTER TABLE tasks
ADD CONSTRAINT tasks_campaign_id_campaigns_id_fk
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
```

**Recommendation:** Option A (keep SET NULL) - tasks should survive campaign deletion

---

### FIX-010: Add Rate Limiting
**Issue ID:** MEDIUM-003  
**Priority:** MEDIUM  
**Estimated Time:** 2-3 hours

**Install:**
```bash
npm install express-rate-limit
```

**Implementation:**  
**File:** `server/middleware/rate-limit.ts`
```typescript
import rateLimit from 'express-rate-limit';

// General API rate limit
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limit for task completions
export const taskCompletionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 task completions per minute
  message: 'Too many task completions, please slow down',
});

// Stricter limit for authentication
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per 15 minutes
  message: 'Too many login attempts',
});
```

**Apply to Routes:**
```typescript
import { apiLimiter, taskCompletionLimiter } from './middleware/rate-limit';

// Apply to all routes
app.use('/api/', apiLimiter);

// Apply stricter limit to specific routes
app.post('/api/task-completions/start', taskCompletionLimiter, ...);
app.post('/api/auth/login', authLimiter, ...);
```

---

## Phase 4: Low Priority Improvements (BACKLOG)

**Timeline:** As time permits  
**Total Time:** 5-6 hours

### FIX-011: Standardize Error Response Format
**Issue ID:** LOW-001  
**Estimated Time:** 2-3 hours

### FIX-012: Add Input Sanitization
**Issue ID:** LOW-002  
**Estimated Time:** 2 hours

### FIX-013: Add Connection Pool Monitoring
**Issue ID:** LOW-003  
**Estimated Time:** 1 hour

---

## Implementation Checklist

### Before Starting
- [ ] Create backup of production database
- [ ] Set up test environment
- [ ] Review all fixes with team
- [ ] Allocate 1-2 weeks for implementation

### Phase 1 (Critical) - Day 1
- [ ] FIX-001: Apply Sprint 2 migration
- [ ] FIX-002: Add ON DELETE constraints
- [ ] FIX-003: Add JSONB validation
- [ ] Test all three fixes

### Phase 2 (High) - Days 2-5
- [ ] FIX-004: Fix N+1 query
- [ ] FIX-005: Add missing indexes
- [ ] FIX-006: Add transaction handling
- [ ] FIX-007: Document points systems
- [ ] Test critical paths end-to-end

### Phase 3 (Medium) - Days 6-10
- [ ] FIX-008: Add Zod validation
- [ ] FIX-009: Handle campaign deletion
- [ ] FIX-010: Add rate limiting
- [ ] Load test to verify performance improvements

### Phase 4 (Low) - As Time Permits
- [ ] FIX-011: Standardize errors
- [ ] FIX-012: Add sanitization
- [ ] FIX-013: Add monitoring

---

## Success Metrics

### After Phase 1 (Critical)
- ✅ All migrations applied successfully
- ✅ Foreign key constraints verified
- ✅ Campaign validation prevents invalid references
- ✅ No critical data integrity issues

### After Phase 2 (High)
- ✅ Dashboard load time < 2 seconds (50 completions)
- ✅ No N+1 queries in hot paths
- ✅ All point awards atomic
- ✅ Team understands points systems

### After Phase 3 (Medium)
- ✅ All JSONB fields validated
- ✅ Rate limiting prevents abuse
- ✅ Campaign deletion handled gracefully

### Overall Goal
- **Health Score:** 78 → 90+
- **Data Integrity:** 100%
- **Performance:** Acceptable for 1000+ concurrent users
- **Security:** No critical vulnerabilities

---

## Post-Implementation

### Monitoring
- Set up alerts for slow queries
- Monitor rate limit triggers
- Track error rates by endpoint

### Documentation
- Update README with points system explanation
- Document all JSONB field structures
- Create runbook for common issues

### Testing
- Run full integration test suite
- Load test critical paths
- Verify all fixes in production-like environment

---

## Questions / Decisions Needed

1. **FIX-009:** Should tasks CASCADE delete with campaigns or stay independent (SET NULL)?
2. **Rate Limits:** Are the proposed limits (10/min completions, 100/15min API) appropriate?
3. **Platform vs Program Points:** Should we consolidate to single system or keep separate?
4. **JSONB Validation:** Add at create/update time only, or also validate existing data?

**Recommend discussing these with team before implementation.**

