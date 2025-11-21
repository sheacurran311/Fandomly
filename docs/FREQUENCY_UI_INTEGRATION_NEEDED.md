# Frequency UI Integration - What's Missing

**Status:** ⚠️ **CRITICAL GAP IDENTIFIED**  
**Date:** November 20, 2025

---

## 🚨 Problem Statement

**Backend:** Frequency enforcement is fully implemented ✅  
**Database:** Points can be awarded multiple times ✅  
**UI:** Does NOT show tasks as available again after frequency period ❌

---

## Current UI Behavior (WRONG)

### **What Happens Now:**

1. User completes daily task → completion record created (`status: 'completed'`)
2. UI shows task as "Completed" with green checkmark
3. **Next day:** Task completion record STILL exists with `status: 'completed'`
4. UI filter: `if (filterType === 'available' && completion?.status === 'completed') return false;`
5. **Result:** Task is HIDDEN from available tasks ❌

### **What SHOULD Happen:**

1. User completes daily task → completion record created
2. UI shows task as "Completed" with green checkmark
3. **Next day:** UI checks frequency eligibility via API
4. API returns: `{ isEligible: true }` (new day!)
5. **Result:** Task shows as AVAILABLE again with "Complete Again" button ✅

---

## Required Frontend Changes

### **1. Add Eligibility Checking Hook**

**Create:** `client/src/hooks/useTaskEligibility.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export interface TaskEligibility {
  isEligible: boolean;
  reason?: string;
  nextAvailableAt?: string;
  lastCompletedAt?: string;
  completionsCount?: number;
  timeRemaining?: {
    hours: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
  };
}

export function useTaskEligibility(taskId: string, tenantId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['task-eligibility', taskId, tenantId],
    queryFn: async (): Promise<TaskEligibility> => {
      const response = await apiRequest(
        'GET',
        `/api/task-completions/check-eligibility/${taskId}?tenantId=${tenantId}`
      );
      return response.json();
    },
    enabled,
    // Refetch every minute for countdown timers
    refetchInterval: 60 * 1000,
    // Keep previous data while refetching
    placeholderData: (prev) => prev,
  });
}
```

### **2. Update FanTaskCard.tsx**

**Add eligibility checking:**

```typescript
export function FanTaskCard({ task, completion, tenantId, ... }: FanTaskCardProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  // EXISTING CODE
  const completed = isTaskCompleted(completion);
  const inProgress = isTaskInProgress(completion);

  // NEW: Check frequency eligibility
  const { data: eligibility } = useTaskEligibility(
    task.id,
    tenantId,
    completed // Only check if task was completed
  );

  // NEW: Determine if task can be started again
  const canStartAgain = completed && eligibility?.isEligible;

  // NEW: Determine actual availability status
  const taskStatus = canStartAgain ? 'available' : 
                     completed ? 'completed' :
                     inProgress ? 'in_progress' : 
                     'available';

  // Update button rendering
  const renderActionButton = () => {
    if (canStartAgain) {
      return (
        <Button onClick={handleStart}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Complete Again
        </Button>
      );
    }

    if (completed && !eligibility?.isEligible) {
      return (
        <div className="space-y-2">
          <Button disabled className="w-full bg-green-500/20">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Completed
          </Button>
          {eligibility?.nextAvailableAt && (
            <p className="text-xs text-gray-500 text-center">
              Available again in {eligibility.timeRemaining?.hours}h {eligibility.timeRemaining?.minutes}m
            </p>
          )}
        </div>
      );
    }

    // ... rest of button logic
  };

  return (
    <Card className={`... ${canStartAgain ? 'border-blue-500 animate-pulse' : ''}`}>
      {/* ... */}
    </Card>
  );
}
```

### **3. Update fan-dashboard/tasks.tsx Filtering**

**Fix the filter logic:**

```typescript
// CURRENT (WRONG):
const filteredTasks = tasks.filter((task: Task) => {
  if (filterType === 'available' && completion?.status === 'completed') {
    return false; // ❌ This hides daily tasks permanently!
  }
  // ...
});

// NEW (CORRECT):
const filteredTasks = tasks.filter((task: Task) => {
  const completion = completionMap.get(task.id);
  
  if (filterType === 'available') {
    // Show task if:
    // 1. Never started, OR
    // 2. Completed BUT eligible again (need to check!)
    
    // Problem: We can't do eligibility check in filter loop (too many API calls)
    // Solution: Filter AFTER fetching eligibilities
    
    if (completion?.status === 'completed') {
      // For now, show all repeatable frequency tasks
      // Later: Check eligibility state
      const isRepeatable = ['daily', 'weekly', 'monthly'].includes(task.rewardFrequency || '');
      if (!isRepeatable) {
        return false; // Hide one-time completed tasks
      }
      // Show repeatable tasks even if completed (they might be eligible again)
    }
  }
  // ...
});
```

### **4. Update program-public.tsx**

**Same changes needed for public program pages:**

```typescript
function TasksTab({ tasks, ... }) {
  const { data: completionsData } = useUserTaskCompletions();
  const completions = completionsData?.completions || [];
  
  const completionMap = new Map(completions.map(c => [c.taskId, c]));

  // Render tasks with eligibility checking
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {activeTasks.map((task) => {
        const completion = completionMap.get(task.id);
        
        return (
          <FanTaskCard
            key={task.id}
            task={task}
            completion={completion}
            tenantId={task.tenantId}
            // ... other props
          />
        );
      })}
    </div>
  );
}
```

---

## Database Behavior (Already Correct)

### **Multiple Completions Are Allowed:**

The database **does NOT prevent** multiple completion records:

```sql
-- User completes daily task Monday
INSERT INTO task_completions (user_id, task_id, status, completed_at, points_earned)
VALUES ('user-1', 'task-daily', 'completed', '2025-11-20', 50);

-- User completes same task Tuesday (backend frequency check passes)
INSERT INTO task_completions (user_id, task_id, status, completed_at, points_earned)
VALUES ('user-1', 'task-daily', 'completed', '2025-11-21', 50);
-- ✅ This works! Two separate completion records
```

The frequency service queries:
```sql
SELECT * FROM task_completions
WHERE user_id = 'user-1'
  AND task_id = 'task-daily'
  AND status = 'completed'
ORDER BY completed_at DESC
LIMIT 1;
```

Then checks: "Was last completion today? If yes → not eligible. If no → eligible!"

### **Points Are Awarded Multiple Times:**

```sql
-- Reward distributions table
SELECT * FROM reward_distributions WHERE user_id = 'user-1' AND task_id = 'task-daily';

-- Result:
-- Monday:  +50 points
-- Tuesday: +50 points
-- Wednesday: +50 points
-- ✅ User earns 150 points total from daily task
```

---

## Testing Scenarios

### **Scenario 1: Daily Check-In Task**

**Expected Behavior:**
1. Monday 10am: User completes check-in → Shows "Completed" ✅
2. Monday 11pm: Still shows "Completed" (same day) ✅
3. Tuesday 12:01am: Shows "Complete Again" button ✅
4. Tuesday 10am: User completes again → +50 points ✅
5. User's total points: 100 (50 + 50) ✅

**Current Behavior:**
1. Monday 10am: User completes check-in → Shows "Completed" ✅
2. Tuesday 12:01am: Still shows "Completed" ❌ (Wrong! Should show "Complete Again")
3. User cannot earn points again ❌

### **Scenario 2: Weekly Quiz Task**

**Expected Behavior:**
1. Week 1 Monday: Complete quiz → +100 points ✅
2. Week 1 Friday: Shows "Completed" (same week) ✅
3. Week 2 Monday 12:01am: Shows "Complete Again" ✅
4. Week 2 Monday 10am: Complete again → +100 points ✅
5. Total: 200 points ✅

**Current Behavior:**
1. Week 1 Monday: Complete quiz → +100 points ✅
2. Week 2 Monday: Still shows "Completed" ❌ (Cannot retake)

### **Scenario 3: One-Time Profile Completion**

**Expected Behavior:**
1. User completes profile → +500 points ✅
2. Forever after: Shows "Completed" ✅
3. Never shows "Complete Again" ✅

**Current Behavior:**
1. User completes profile → +500 points ✅
2. Forever: Shows "Completed" ✅ (Correct for one-time tasks!)

---

## Quick Fix Options

### **Option A: Full Implementation** (Recommended)
- Create `useTaskEligibility` hook
- Update `FanTaskCard` to check eligibility
- Update filter logic to show repeatable tasks
- Add countdown timers
- **Timeline:** 4-6 hours

### **Option B: Simple Logic** (Faster)
- Don't create new completion records for repeatable tasks
- Instead: Update `completed_at` timestamp on existing record
- Check timestamp on frontend
- **Pros:** Simpler, no API calls
- **Cons:** Loses completion history
- **Timeline:** 2-3 hours

### **Option C: Backend-Driven** (Cleanest)
- Add `is_available_again` field to completion response
- Backend calculates eligibility when fetching completions
- Frontend just reads the flag
- **Pros:** Single source of truth
- **Cons:** More backend changes
- **Timeline:** 3-4 hours

---

## Recommended Approach: **Option C**

### **Why Option C is Best:**

1. **Single Source of Truth** - Backend knows frequency rules
2. **No Extra API Calls** - Calculated during completion fetch
3. **Consistent Logic** - Same eligibility calculation everywhere
4. **Better Performance** - No per-task API calls

### **Implementation:**

**Backend Changes:**
```typescript
// server/storage.ts or task-completion-routes.ts
export async function getUserTaskCompletions(userId: string, tenantId?: string) {
  const completions = await db.query.taskCompletions.findMany({
    where: { userId, tenantId },
  });

  // Enrich with eligibility
  const enrichedCompletions = await Promise.all(
    completions.map(async (completion) => {
      const task = await getTask(completion.taskId);
      
      // Check if task is eligible again based on frequency
      const eligibility = await taskFrequencyService.checkEligibility({
        userId,
        taskId: completion.taskId,
        tenantId,
      });

      return {
        ...completion,
        isAvailableAgain: eligibility.isEligible,
        nextAvailableAt: eligibility.nextAvailableAt,
        rewardFrequency: task.rewardFrequency,
      };
    })
  );

  return { completions: enrichedCompletions };
}
```

**Frontend Changes:**
```typescript
// FanTaskCard.tsx
const canStartAgain = completion?.isAvailableAgain === true;

// fan-dashboard/tasks.tsx
const filteredTasks = tasks.filter((task: Task) => {
  const completion = completionMap.get(task.id);
  
  if (filterType === 'available') {
    // Hide one-time completed tasks, show repeatable if available again
    if (completion?.status === 'completed' && !completion.isAvailableAgain) {
      return false;
    }
  }
  // ...
});
```

---

## Summary

### **What's Working:**
- ✅ Backend frequency enforcement
- ✅ Database allows multiple completions
- ✅ Points awarded correctly multiple times

### **What's Broken:**
- ❌ UI doesn't check eligibility
- ❌ Completed tasks stay "completed" forever in UI
- ❌ Users can't see tasks become available again
- ❌ No "Complete Again" button

### **Fix Required:**
Implement **Option C** (backend-driven eligibility) to enrich completion data with `isAvailableAgain` flag.

**Timeline:** 3-4 hours  
**Priority:** HIGH (system appears broken to users without this)

---

**Last Updated:** November 20, 2025  
**Status:** ⚠️ Backend complete, Frontend incomplete  
**Action Required:** Implement Option C for production readiness

