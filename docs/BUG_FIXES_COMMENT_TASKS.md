# Bug Fixes: Comment Task Templates

## Date: November 5, 2025

## Issues Fixed

### Issue 1: Comment Task Templates Not Appearing in Task Builder

**Problem**: The new comment task templates (twitter_quote_tweet, youtube_comment, tiktok_comment, instagram comment tasks, facebook comment tasks) were not selectable in the `/creator-dashboard/tasks/create` task builder interface. When creators tried to select these templates, they would see a "Coming Soon" page instead of the task builder.

**Root Cause**: The `task-builder.tsx` switch statement that routes to the appropriate task builder component was missing cases for the new comment task types. It only had cases for the original task types (e.g., `twitter_follow`, `twitter_like`, `twitter_retweet`) but not the newly added comment variants.

**Fix**: Updated `/home/runner/workspace/client/src/pages/creator-dashboard/task-builder.tsx` to include all new comment task types in the appropriate case statements:

- **Twitter**: Added `'twitter_quote_tweet'` to the Twitter case
- **Facebook**: Added `'facebook_comment_post'` and `'facebook_comment_photo'` to the Facebook case
- **Instagram**: Added `'comment_code'`, `'mention_story'`, and `'keyword_comment'` to the Instagram case
- **YouTube**: Added `'youtube_comment'` to the YouTube case
- **TikTok**: Added `'tiktok_comment'` to the TikTok case

**Files Modified**:
- `/home/runner/workspace/client/src/pages/creator-dashboard/task-builder.tsx`

---

### Issue 2: Points Not Saving Correctly (Defaulting to 50)

**Problem**: When creators created tasks with custom point values (e.g., 150 points for a quote tweet), the tasks were being saved with the default value of 50 points instead of the specified amount. This was happening for all task types, not just comment tasks.

**Root Cause**: There were two `POST /api/tasks` endpoints defined:
1. In `/server/routes.ts` (line 1314) - Correctly mapped `points` to `pointsToReward`
2. In `/server/task-routes.ts` (line 175) - This one was registered LAST and was overriding the first

The problem was that the `createTaskSchema` in `task-routes.ts` only included a limited set of task types (referral, checkIn, followerMilestone, completeProfile, twitter). When creators tried to create tasks for other platforms (Facebook, Instagram, YouTube, TikTok, Spotify), the validation would fail or use incorrect defaults because those task type schemas weren't in the discriminated union.

**Fix**: Added comprehensive task schemas for all social media platforms to `task-routes.ts`:

1. **Updated Twitter schema** to include `'twitter_quote_tweet'` and `requiredText` field
2. **Added Facebook schema** with all task types including comment tasks
3. **Added Instagram schema** with all task types including `comment_code`, `mention_story`, `keyword_comment`
4. **Added YouTube schema** with `youtube_comment` and `requiredText` field
5. **Added TikTok schema** with `tiktok_comment` and `requiredText` field
6. **Added Spotify schema** for completeness

All schemas follow the same pattern:
- Extend `baseTaskSchema` (which includes `name`, `description`, etc.)
- Include `points` field with validation (min: 1, max: 10000)
- Include `platform` literal
- Include `verificationMethod` enum
- Include `settings` object with task-specific fields

**Files Modified**:
- `/home/runner/workspace/server/task-routes.ts`

**Schema Structure** (example for YouTube):
```typescript
const youtubeTaskSchema = baseTaskSchema.extend({
  taskType: z.enum(['youtube_subscribe', 'youtube_like', 'youtube_comment']),
  platform: z.literal('youtube'),
  points: z.number().min(1).max(10000),
  verificationMethod: z.enum(['manual', 'api']).default('manual'),
  settings: z.object({
    channelUrl: z.string().optional(),
    videoUrl: z.string().optional(),
    requiredText: z.string().optional(),
  }),
});
```

---

## Technical Details

### Request Flow

When a creator publishes a task:

1. **Frontend** (`task-builder.tsx`):
   - Task builder component sends data with `points` field
   - Example: `{ name: "Quote Tweet", points: 150, taskType: "twitter_quote_tweet", ... }`

2. **Backend** (`task-routes.ts`):
   - Receives POST request at `/api/tasks`
   - Validates against `createTaskSchema` discriminated union
   - Schema includes `points` field (line 89, 103, 116, 132, 145, 158)
   - Extracts `validatedData.points` (line 308)
   - Maps to `pointsToReward` field (line 307-311)
   - Saves to database with correct points value

3. **Database** (`schema.ts`):
   - `pointsToReward` column has default of 50, but only applies if value is not provided
   - Since we're explicitly providing the value, it saves correctly

### Why Both Endpoints Exist

- **`routes.ts` endpoint**: Legacy endpoint, uses `insertTaskSchema` for validation
- **`task-routes.ts` endpoint**: Newer endpoint with more comprehensive validation using discriminated unions

The `task-routes.ts` endpoint is registered last (in `registerRoutes`), so it overrides the `routes.ts` endpoint. This is intentional - the newer endpoint provides better type safety with platform-specific validation.

---

## Testing Checklist

To verify these fixes:

### Test Comment Tasks Appear in Builder
1. ✅ Log in as creator
2. ✅ Navigate to Create Task
3. ✅ Select Twitter platform
4. ✅ Verify "Quote Tweet" appears as an option
5. ✅ Select quote tweet task type
6. ✅ Verify TwitterTaskBuilder loads (not "Coming Soon" page)
7. ✅ Repeat for all platforms and comment task types

### Test Points Save Correctly
1. ✅ Create a Twitter quote tweet task with 150 points
2. ✅ Publish the task
3. ✅ Query database: `SELECT id, name, pointsToReward FROM tasks WHERE taskType = 'twitter_quote_tweet' ORDER BY createdAt DESC LIMIT 1;`
4. ✅ Verify `pointsToReward` is 150 (not 50)
5. ✅ Repeat for other task types with various point values (25, 30, 75, 100, 200)
6. ✅ Verify all save correctly

### Test All Comment Task Types
- ✅ Twitter Quote Tweet (150 points)
- ✅ Facebook Comment Post (50 points)
- ✅ Facebook Comment Photo (50 points)
- ✅ Instagram Comment Code (30 points)
- ✅ Instagram Mention Story (75 points)
- ✅ Instagram Keyword Comment (30 points)
- ✅ YouTube Comment (50 points)
- ✅ TikTok Comment (50 points)

---

## Related Files

### Frontend
- `/client/src/pages/creator-dashboard/task-builder.tsx` - Main routing switch for task builders

### Backend
- `/server/task-routes.ts` - Task creation endpoint with schema validation
- `/server/routes.ts` - Legacy task creation endpoint (overridden)
- `/shared/schema.ts` - Database schema with `pointsToReward` field
- `/shared/taskTemplates.ts` - Zod schemas for task validation (used by UI, not backend)

### Documentation
- `/docs/SOCIAL_COMMENT_TASKS_IMPLEMENTATION.md` - Implementation summary
- `/docs/COMMENT_TASK_INTEGRATION_GUIDE.md` - Integration guide

---

## Prevention

To prevent similar issues in the future:

1. **When adding new task types**:
   - Add to `shared/taskTemplates.ts` (template definitions)
   - Add to `server/task-routes.ts` createTaskSchema (backend validation)
   - Add to `client/src/pages/creator-dashboard/task-builder.tsx` switch statement (routing)
   - Add to appropriate task builder component (TwitterTaskBuilder, etc.)

2. **Points field handling**:
   - Always use `points` field name in frontend
   - Backend automatically maps `points` → `pointsToReward`
   - Ensure task schema includes `points` with proper validation

3. **Testing checklist**:
   - Test task creation flow end-to-end
   - Verify task appears in builder
   - Verify all fields save correctly
   - Check database directly to confirm values

---

## Notes

- The fix maintains backward compatibility with existing tasks
- No database migration required
- All existing task types continue to work as before
- Comment tasks now fully functional for all 5 platforms

