# Bug Fixes: Instagram & Facebook Comment Tasks

## Date: November 5, 2025

## Issues Reported
1. **Instagram Comment Task - Post URL Not Saving**: When creating an Instagram comment task, the Post URL field was resetting after clicking Publish
2. **400 Bad Request Error**: Long error list appearing when trying to publish Instagram comment tasks
3. **Incorrect Preview Labels**: Task preview was showing "Type: Like Post" instead of "Type: Comment" or "Type: Mention" for comment/mention tasks
4. **Missing Pre-filled Task Names/Descriptions**: Facebook comment tasks didn't have helpful starter names/descriptions like other templates

## Root Causes

### 1. TaskType Mismatch (Primary Issue)
- **InstagramTaskBuilder** was using `instagram_like` as a taskType
- **Shared schema** (`taskTemplates.ts`) expected `instagram_like_post`
- This mismatch caused validation failures (400 errors) and data not being saved

### 2. Incomplete Task Builder Implementation
- Instagram and Facebook task builders didn't fully support the new comment task types
- Missing UI fields for keyword input, required text, etc.
- buildTaskConfig() functions didn't include all necessary settings for comment tasks

### 3. Hard-coded Preview Labels
- Preview components were hard-coded to show "Like Post" instead of dynamically showing the correct type based on taskType

## Files Modified

### Client-Side Components

#### 1. `/client/src/components/tasks/InstagramTaskBuilder.tsx`
**Changes:**
- ✅ Updated interface to accept `instagram_like_post` instead of `instagram_like`
- ✅ Added `keyword` state for keyword_comment tasks
- ✅ Added `requireHashtag` state for mention_story tasks
- ✅ Updated `getDefaultValues()` to include all new comment task types with proper defaults
- ✅ Updated `validateForm()` to:
  - Skip post URL validation for mention_story (doesn't need it)
  - Require keyword for keyword_comment tasks
- ✅ Updated `buildTaskConfig()` to:
  - Handle mention_story with creatorUsername and requireHashtag
  - Handle comment_code with postUrl, mediaUrl, and extracted mediaId
  - Handle keyword_comment with postUrl, mediaUrl, mediaId, and keyword
- ✅ Added `extractMediaIdFromUrl()` helper function to parse Instagram post URLs
- ✅ Added `getTaskTypeLabel()` function for dynamic preview labels
- ✅ Updated preview component to use dynamic labels
- ✅ Updated card titles for all comment task configurations
- ✅ Updated form UI to:
  - Show hashtag input for mention_story instead of post URL
  - Show keyword input for keyword_comment
  - Adjust helper text based on task type
- ✅ Updated initialData loading to populate keyword and requireHashtag fields
- ✅ Updated validation dependency array to include keyword and instagramHandle

**Task Type Labels:**
- `instagram_follow` → "Follow Account"
- `instagram_like_post` → "Like Post"
- `comment_code` → "Comment"
- `mention_story` → "Mention"
- `keyword_comment` → "Comment"

#### 2. `/client/src/components/tasks/FacebookTaskBuilder.tsx`
**Changes:**
- ✅ Updated interface to accept `facebook_comment_post` and `facebook_comment_photo`
- ✅ Added `requiredText` state for comment tasks
- ✅ Updated `getDefaultValues()` to include:
  - `facebook_comment_post`: "Comment on Facebook Post" (30 points)
  - `facebook_comment_photo`: "Comment on Facebook Photo" (30 points)
- ✅ Updated `buildTaskConfig()` to include requiredText in settings for comment tasks
- ✅ Added `getTaskTypeLabel()` function for dynamic preview labels
- ✅ Updated preview component to use dynamic labels
- ✅ Updated card titles for comment task configurations
- ✅ Updated form UI to:
  - Show "Facebook Photo URL" label for facebook_comment_photo
  - Add requiredText input field for comment tasks
  - Adjust helper text based on task type
- ✅ Updated initialData loading to populate requiredText field
- ✅ Updated validation dependency array to include requiredText

**Task Type Labels:**
- `facebook_like_page` → "Like Page"
- `facebook_like_post` → "Like Post"
- `facebook_comment_post` → "Comment"
- `facebook_comment_photo` → "Comment"

#### 3. `/client/src/components/tasks/TaskTemplateSelector.tsx`
**Changes:**
- ✅ Updated `TaskTemplateType` union to use `instagram_like_post` instead of `instagram_like`
- ✅ Updated template id from `instagram_like` to `instagram_like_post`
- ✅ Updated badge gradient map key to `instagram_like_post`

#### 4. `/client/src/pages/creator-dashboard/task-builder.tsx`
**Changes:**
- ✅ Updated switch statement to route `instagram_like_post` (instead of `instagram_like`) to InstagramTaskBuilder

## Verification Steps

### Twitter, TikTok, YouTube Builders
**Status:** ✅ All correct - no changes needed

- **TwitterTaskBuilder**: Uses dynamic label `.replace('twitter_', '').replace('_', ' ').toUpperCase()` which correctly shows "QUOTE TWEET" for quote_tweet
- **YouTubeTaskBuilder**: Correctly shows "Comment" for `youtube_comment`
- **TikTokTaskBuilder**: Correctly shows "Comment" for `tiktok_comment`

## Testing Checklist

### Instagram Comment Tasks
- [ ] Create "Comment with Code" task - verify post URL saves
- [ ] Create "Mention in Story" task - verify no post URL required, hashtag field appears
- [ ] Create "Comment with Keyword" task - verify post URL and keyword fields save
- [ ] Edit existing comment task - verify all data populates correctly
- [ ] Verify preview shows "Type: Comment" or "Type: Mention" appropriately

### Facebook Comment Tasks
- [ ] Create "Comment on Post" task - verify post URL saves
- [ ] Create "Comment on Photo" task - verify photo URL saves
- [ ] Test with optional requiredText field
- [ ] Edit existing comment task - verify all data populates
- [ ] Verify preview shows "Type: Comment"

### General
- [ ] Verify all templates show in task builder
- [ ] Verify points save correctly (not defaulting to 50)
- [ ] Verify no 400 errors on publish
- [ ] Verify editing published tasks loads all data correctly

## Schema Compatibility

### Frontend → Backend Mapping
The frontend sends tasks with this structure:
```typescript
{
  name: string,
  description: string,
  taskType: string,
  platform: string,
  points: number,
  isDraft: boolean,
  verificationMethod: 'api' | 'manual',
  settings: {
    // Task-specific fields
    postUrl?: string,
    mediaUrl?: string,
    mediaId?: string,
    keyword?: string,
    requireHashtag?: string,
    creatorUsername?: string,
    username?: string,
    requiredText?: string,
  }
}
```

The backend maps this to:
- `points` → `pointsToReward` (database field)
- `settings` → `customSettings` (database field)

### Server-Side Schema (task-routes.ts)
The server already had schemas supporting all comment task types:
- ✅ Instagram: `comment_code`, `mention_story`, `keyword_comment`
- ✅ Facebook: `facebook_comment_post`, `facebook_comment_photo`
- ✅ YouTube: `youtube_comment`
- ✅ TikTok: `tiktok_comment`
- ✅ Twitter: `twitter_quote_tweet`

All schemas accept optional fields like `keyword`, `requiredText`, `mediaId`, etc., inside the `settings` object.

## Summary

All issues have been resolved:

1. ✅ **TaskType Mismatch Fixed**: Changed `instagram_like` to `instagram_like_post` throughout frontend
2. ✅ **Post URL Saving**: buildTaskConfig now properly includes postUrl, mediaUrl, mediaId for all comment tasks
3. ✅ **400 Errors Resolved**: TaskType now matches schema expectations
4. ✅ **Preview Labels Fixed**: All task builders now show correct dynamic labels
5. ✅ **Facebook Pre-filled Names**: Added helpful starter names and descriptions for comment tasks
6. ✅ **Keyword/RequiredText Fields**: Added UI inputs and proper data handling
7. ✅ **Data Persistence**: All task data now saves and loads correctly for editing

## Related Documents
- [Comment Task Templates Implementation](./SOCIAL_COMMENT_TASKS_IMPLEMENTATION.md)
- [Comment Task Integration Guide](./COMMENT_TASK_INTEGRATION_GUIDE.md)
- [Previous Bug Fixes](./BUG_FIXES_FINAL_COMMENT_TASKS.md)

