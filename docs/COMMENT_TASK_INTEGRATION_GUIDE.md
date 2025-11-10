# Comment Task Integration Guide

## For Developers: How to Use the New Comment Task Templates

This guide explains how the newly implemented comment task templates integrate with the existing Fandomly platform.

## Task Template Registration

All comment task types are now registered in `shared/taskTemplates.ts` and will automatically appear in the creator dashboard task template picker.

### Available Comment Task Types by Platform

#### Twitter
- **Task Type ID**: `twitter_quote_tweet`
- **Template ID**: `twitter-quote-tweet`
- **Default Points**: 150
- **Verification**: Manual (can be enhanced with API)
- **Required Fields**: Tweet URL
- **Optional Fields**: Required text to include in quote tweet

#### Facebook
- **Task Type IDs**: `facebook_comment_post`, `facebook_comment_photo`
- **Template IDs**: `facebook-comment-post`, `facebook-comment-photo`
- **Default Points**: 50
- **Verification**: Manual (webhook auto-verify can be added)
- **Required Fields**: Post/Photo URL
- **Optional Fields**: None

#### Instagram
- **Task Type IDs**: `comment_code`, `mention_story`, `keyword_comment`
- **Template IDs**: `instagram-comment-code`, `instagram-mention-story`, `instagram-keyword-comment`
- **Default Points**: 30-75
- **Verification**: **AUTOMATIC** via webhook
- **Required Fields**: 
  - `comment_code` & `keyword_comment`: Instagram post URL/mediaId
  - `mention_story`: Creator Instagram username (auto-populated)
  - `keyword_comment`: Keyword/hashtag to match
- **Optional Fields**: Hashtag for mention story tasks

#### YouTube
- **Task Type ID**: `youtube_comment`
- **Template ID**: `youtube-comment`
- **Default Points**: 50
- **Verification**: Manual (can be enhanced with API)
- **Required Fields**: Video URL
- **Optional Fields**: Required text to include in comment

#### TikTok
- **Task Type ID**: `tiktok_comment`
- **Template ID**: `tiktok-comment`
- **Default Points**: 50
- **Verification**: Manual (smart hooks documented for future)
- **Required Fields**: Video URL
- **Optional Fields**: Required text to include in comment

## Creator Workflow

### Creating a Comment Task

1. **Navigate to Task Creation**
   - Go to Creator Dashboard → Tasks → Create New Task
   - Select platform (Twitter, Facebook, Instagram, YouTube, or TikTok)
   - Select comment task type from the task type dropdown

2. **Fill in Task Details**
   - **Task Name**: Give the task a descriptive name
   - **Description**: Explain what fans need to do
   - **Points**: Set the reward (defaults provided based on difficulty)
   - **Platform-Specific Fields**:
     - **Twitter Quote Tweet**: Paste tweet URL, optionally add required text
     - **Facebook Comment**: Paste post/photo URL
     - **Instagram Comment Code**: Paste Instagram post URL (nonce auto-generated for fans)
     - **Instagram Mention Story**: No URL needed (your username auto-populated)
     - **Instagram Keyword Comment**: Paste post URL and enter required keyword
     - **YouTube Comment**: Paste video URL, optionally add required text
     - **TikTok Comment**: Paste video URL, optionally add required text

3. **Verification Method**
   - **Instagram**: Always automatic (webhook-based)
   - **Other Platforms**: Manual verification (API polling can be added later)

4. **Publish or Save as Draft**
   - Click "Publish Task" to make it live
   - Click "Save as Draft" to finish later

## Fan Workflow

### For Instagram Comment Tasks (Automatic Verification)

1. **Fan Views Task**
   - Task card shows as Instagram task with special UI
   - If fan hasn't connected Instagram username, they'll be prompted

2. **Fan Starts Task**
   - Click "Start Task"
   - If task is `comment_code`: System generates unique nonce (e.g., `FDY-8K27`)
   - If task is `keyword_comment`: System shows required keyword
   - If task is `mention_story`: System shows creator's Instagram handle

3. **Fan Completes Action**
   - **Comment Code**: Fan comments nonce on Instagram post
   - **Keyword Comment**: Fan comments keyword on Instagram post
   - **Mention Story**: Fan posts Story mentioning creator

4. **Automatic Verification**
   - Webhook receives Instagram event
   - Backend matches event to task
   - Task auto-verifies and awards points
   - Fan sees "Verified ✓" badge

### For Other Platform Comment Tasks (Manual Verification)

1. **Fan Views Task**
   - Standard task card displayed
   - Shows platform, action, and points

2. **Fan Clicks Task**
   - Redirected to platform (Twitter, Facebook, YouTube, TikTok)
   - Fan performs action (comment/quote tweet)

3. **Manual Verification**
   - Fan clicks "Request Verification"
   - Creator reviews and approves
   - Points awarded upon approval

## Backend Integration Points

### Instagram Automatic Verification

The Instagram verification system is already fully implemented:

**Webhook Handler**: `/server/social-routes.ts`
```typescript
// Receives Instagram webhooks
app.post('/webhooks/instagram', async (req, res) => {
  // Processes comment and mention events
  // Calls instagram-verification-service
});
```

**Verification Service**: `/server/services/instagram-verification-service.ts`
```typescript
export async function handleInstagramCommentEvent(event) {
  // Extracts nonce or keyword from comment
  // Matches to pending task
  // Awards points if verified
}

export async function handleInstagramMentionEvent(event) {
  // Validates mention
  // Matches to pending task
  // Awards points if verified
}
```

**Task Routes**: `/server/instagram-task-routes.ts`
```typescript
// POST /api/tasks/instagram/comment-code
// POST /api/tasks/instagram/mention-story
// POST /api/tasks/instagram/keyword-comment
// POST /api/tasks/instagram/:taskId/start (generates nonce)
// GET /api/tasks/instagram/:taskId/status (checks verification)
```

### Manual Verification Endpoint

For non-Instagram platforms:

**Endpoint**: `POST /api/task-completions/:taskCompletionId/verify`

Located in `/server/task-completion-routes.ts`, this endpoint:
- Accepts a task completion ID
- Dynamically calls platform-specific verification function
- Awards points if verification succeeds

## Frontend Component Integration

### Instagram Tasks

When rendering fan tasks, check if task is Instagram comment task:

```typescript
import { InstagramTaskCard } from '@/components/instagram/instagram-task-card';

// In your task list component:
{task.platform === 'instagram' && 
 ['comment_code', 'mention_story', 'keyword_comment'].includes(task.taskType) ? (
  <InstagramTaskCard 
    task={task} 
    completion={completion} 
    onComplete={handleComplete} 
  />
) : (
  <FanTaskCard task={task} completion={completion} />
)}
```

The `InstagramTaskCard` handles:
- Username capture modal
- Nonce generation and display
- Instagram deep linking
- Real-time verification polling

### Other Platform Tasks

Use the standard `FanTaskCard` component with manual verification support:

```typescript
import { FanTaskCard } from '@/components/tasks/FanTaskCard';

<FanTaskCard 
  task={task} 
  completion={completion} 
  onVerify={handleManualVerify}
/>
```

## API Endpoints Summary

### Instagram (Automatic Verification)
- `POST /api/tasks/instagram/comment-code` - Creator creates comment code task
- `POST /api/tasks/instagram/mention-story` - Creator creates mention story task
- `POST /api/tasks/instagram/keyword-comment` - Creator creates keyword comment task
- `POST /api/social/user/instagram` - Fan saves Instagram username
- `POST /api/tasks/instagram/:taskId/start` - Fan starts task (generates nonce)
- `GET /api/tasks/instagram/:taskId/status` - Fan checks verification status
- `POST /webhooks/instagram` - Instagram webhook receiver

### All Platforms (Manual Verification)
- `POST /api/task-completions/:taskCompletionId/verify` - Trigger on-demand verification

## Database Schema

### Tasks Table
Comment tasks are stored in the `tasks` table with:
- `platform`: 'twitter' | 'facebook' | 'instagram' | 'youtube' | 'tiktok'
- `taskType`: One of the comment task types listed above
- `requirements`: JSON object with task-specific data (URL, keyword, etc.)
- `verificationMethod`: 'automatic' (Instagram only) or 'manual'

### Task Completions Table
Fan progress tracked in `task_completions` table:
- `status`: 'not_started' | 'in_progress' | 'completed'
- `verifiedAt`: Timestamp when verification occurred (null until verified)
- `metadata`: JSON object with verification data (nonce, comment ID, etc.)

### Social Accounts Table
For Instagram verification, fan's Instagram username stored in `social_accounts`:
- `userId`: Link to user
- `platform`: 'instagram'
- `username`: Instagram handle (without @)
- `platformUserId`: Instagram user ID (from webhook if available)

### Redis Storage (Instagram Only)
Nonces stored temporarily in Redis:
- Key: `task_nonce:{taskId}:{userId}`
- Value: Generated nonce (e.g., "FDY-8K27")
- TTL: 2 hours

## Testing Your Integration

### 1. Verify Template Registration
```bash
# Check that new templates appear in database
SELECT id, name, platform, taskType FROM task_templates WHERE platform IN ('twitter', 'facebook', 'instagram', 'youtube', 'tiktok');
```

### 2. Create Test Tasks
- Log in as a creator
- Create one task of each comment type
- Verify all fields save correctly

### 3. Test Fan Workflow (Instagram)
- Log in as a fan
- Start an Instagram comment code task
- Verify nonce is generated
- Comment nonce on Instagram post
- Verify task auto-completes within ~5 seconds

### 4. Test Fan Workflow (Other Platforms)
- Log in as a fan
- Start a comment task
- Complete action on platform
- Request manual verification
- Creator approves
- Verify points awarded

## Troubleshooting

### Instagram Tasks Not Auto-Verifying
1. Check Instagram webhook is connected in Meta Developer Dashboard
2. Verify `INSTAGRAM_APP_SECRET` environment variable is set
3. Check webhook signature verification in logs
4. Ensure fan has saved Instagram username
5. Check Redis is running and accessible
6. Verify nonce matches exactly (case-sensitive)

### Manual Verification Not Working
1. Verify task completion exists in database
2. Check task completion status is 'in_progress'
3. Ensure verification endpoint is accessible
4. Check logs for verification errors

### Template Not Showing in UI
1. Verify template added to `CORE_TASK_TEMPLATES` array
2. Check `PLATFORM_TASK_TYPES` mapping includes task type
3. Clear cache and restart dev server
4. Check browser console for errors

## Future Enhancements

### Planned Improvements
1. **Twitter API Integration**: Auto-verify quote tweets using Twitter API v2
2. **Facebook Webhook Enhancement**: Auto-verify comments using existing Facebook webhooks
3. **YouTube API Integration**: Poll YouTube API to verify comments
4. **TikTok Smart Hooks**: Implement embedded video + interaction tracking (see `/docs/TIKTOK_VERIFICATION_HOOK_STRATEGY.md`)
5. **Comment Content Validation**: Filter profanity and spam
6. **Rich Previews**: Show embedded posts/videos in task builder

### How to Add API-Based Verification

To upgrade manual verification to automatic API-based verification:

1. Create a verification function in `/server/services/social-verification-service.ts`:
```typescript
export async function verifyTwitterQuoteTweet(taskId: string, userId: string, tweetUrl: string): Promise<boolean> {
  // Call Twitter API
  // Check if user quoted the tweet
  // Validate required text if specified
  // Return true if verified
}
```

2. Add polling or webhook handler to call verification function

3. Update task template `verificationMethod` to 'automatic'

4. Update UI to show automatic verification status

## Questions?

For technical questions or issues, refer to:
- `/docs/SOCIAL_VERIFICATION_IMPLEMENTATION.md` - Overall architecture
- `/docs/INSTAGRAM_NONCE_VERIFICATION_STRATEGY.md` - Instagram-specific details
- `/server/services/instagram-verification-service.ts` - Reference implementation

