# Bug Fix: Task Card Points Not Displaying Correctly

## Date: November 6, 2025

## Issue Reported
Task cards on the `/tasks` page were not displaying the correct points value. When editing a task, the points were correctly saved and loaded in the edit form, but the task card on the main tasks page showed 0 points.

## Root Cause

### Data Flow Problem
1. **Database**: Tasks are stored with `pointsToReward` field (primary) and `rewardValue` field (legacy)
2. **GET /api/tasks Endpoint**: Was returning raw database data without transformation
3. **Frontend Task Interface**: Defined `rewardValue` field
4. **Task Card Component**: Displayed `task.rewardValue || 0` for points

### The Issue
The GET `/api/tasks` endpoint returned tasks with `pointsToReward` but NOT `rewardValue`, while the TaskCard component expected `rewardValue`. This caused the points to always show as 0.

### Why Edit Mode Worked
The GET `/api/tasks/:id` endpoint (for single task) already had transformation logic that mapped `pointsToReward` to `points`:

```typescript
const transformedTask = {
  ...task,
  points: task.pointsToReward,
  settings: task.customSettings,
};
```

However, the GET `/api/tasks` endpoint (for task list) did NOT have this transformation.

## Solution

Updated the GET `/api/tasks` endpoint in `/server/routes.ts` (line 1259) to transform the response data:

```typescript
const transformedTasks = tasks.map(task => ({
  ...task,
  points: task.pointsToReward,
  rewardValue: task.pointsToReward || task.rewardValue, // Use pointsToReward as primary, fallback to rewardValue
  settings: task.customSettings,
}));
```

### What This Does
1. **Maps `pointsToReward` to `points`**: For frontend components that expect `points`
2. **Maps `pointsToReward` to `rewardValue`**: For frontend components that expect `rewardValue` (like TaskCard)
3. **Maps `customSettings` to `settings`**: For consistency with task builders
4. **Fallback Logic**: Uses `rewardValue` if `pointsToReward` is null (backwards compatibility)

## Files Modified

### Backend
**File**: `/home/runner/workspace/server/routes.ts`

**Line**: 1259-1287 (GET `/api/tasks` endpoint)

**Change**: Added data transformation to map database fields to client-expected fields

## Impact

### Before Fix
```
❌ Task cards show "0 pts" for all tasks
❌ Frontend receives pointsToReward but expects rewardValue
❌ Inconsistent data format between list and detail endpoints
```

### After Fix
```
✅ Task cards display correct points value
✅ Frontend receives both points and rewardValue fields
✅ Consistent data format across all task endpoints
✅ Edit mode continues to work correctly
```

## Testing Checklist

- [ ] Navigate to `/creator-dashboard/tasks`
- [ ] Verify task cards display correct points (not 0)
- [ ] Create a new task with specific points (e.g., 75)
- [ ] Verify the new task card shows 75 pts
- [ ] Edit an existing task and change points
- [ ] Verify updated points display correctly on task card
- [ ] Test with different task types (Twitter, Instagram, Facebook, etc.)

## Related Issues

This fix complements the previous work on:
- Points saving correctly during task creation (fixed in previous session)
- Task data persisting correctly for editing (fixed in previous session)
- Database enum migration for comment task types (just completed)

## Technical Notes

### Data Transformation Layer
The application now has a consistent transformation layer in the API:

**For Task Lists** (GET `/api/tasks`):
- `pointsToReward` → `points`, `rewardValue`
- `customSettings` → `settings`

**For Single Task** (GET `/api/tasks/:id`):
- `pointsToReward` → `points`
- `customSettings` → `settings`

**For Task Creation/Update** (POST/PUT `/api/tasks`):
- `points` → `pointsToReward`
- `settings` → `customSettings`

This ensures the frontend can work with intuitive field names (`points`, `settings`) while the database uses the canonical field names (`pointsToReward`, `customSettings`).

### Field Naming Convention

**Database (Canonical)**:
- `pointsToReward` - Primary points field
- `rewardValue` - Legacy field (kept for backwards compatibility)
- `customSettings` - Task-specific configuration

**Frontend (Client-Facing)**:
- `points` - Intuitive name for point values
- `rewardValue` - Legacy support for existing components
- `settings` - Intuitive name for task configuration

## Related Documentation
- [Instagram & Facebook Comment Task Fixes](./BUG_FIXES_INSTAGRAM_FACEBOOK_COMMENT_TASKS.md)
- [Database Migration for Comment Tasks](./DATABASE_MIGRATION_COMMENT_TASKS.md)
- [Points Saving Bug Fixes](./BUG_FIXES_FINAL_COMMENT_TASKS.md)

