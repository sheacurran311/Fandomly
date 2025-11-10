# Instagram Comment+Nonce Verification Strategy

## Overview

Since Facebook login only supports Business/Professional accounts (not regular fan accounts), we implement a hybrid verification system using Instagram Graph API webhooks for creator accounts and username-based matching for fans.

## Why This Works

✅ **No fan API required** - Fans just provide their @username
✅ **Real-time verification** - Webhook receives comment events instantly
✅ **Fraud-resistant** - Unique nonce codes with expiration
✅ **Scalable** - Automatic matching and verification
✅ **Creator-friendly** - Only creators need Business/Creator accounts

## Verification Methods

### 1. Comment + Nonce Code (Recommended - Primary)

**How it works:**
1. Fan starts task → System generates unique nonce (e.g., `FDY-8K27`)
2. Fan comments the nonce on creator's Instagram post
3. Webhook receives comment event → matches nonce → auto-verifies
4. Task marked complete, points awarded

**Advantages:**
- Unique per user/task (fraud-proof)
- Instant verification via webhook
- No manual review needed

### 2. Story Mention

**How it works:**
1. Fan posts Instagram Story mentioning creator (@creator)
2. Webhook receives mention event
3. System matches fan username → auto-verifies
4. Task marked complete

**Advantages:**
- Great for awareness/reach tasks
- Simple for fans
- Real-time verification

### 3. Keyword Comment (Alternative)

**How it works:**
1. Creator defines keyword/hashtag (e.g., `#Fandomly2025`)
2. Fan comments with keyword
3. Webhook matches keyword → verifies
4. Task marked complete

**Note:** Less unique than nonce (higher fraud risk), but good for mass campaigns

### 4. Manual Proof (Fallback)

**How it works:**
1. If webhook fails or fan has issues
2. Fan uploads screenshot
3. Creator reviews manually

**Only for edge cases/disputes**

## Meta Graph API Requirements

### Creator Requirements

✅ **Instagram Business or Creator account** (required)
✅ **Linked to a Facebook Page** (required)
✅ **Facebook app permissions:**
- `instagram_basic` - Read IG user & media metadata
- `instagram_manage_comments` - Receive comment webhooks
- `pages_show_list` - Enumerate Pages user manages
- `pages_manage_metadata` - Subscribe to Page webhooks
- `instagram_manage_insights` (optional) - Media insights
- `pages_read_engagement` (optional) - Engagement metrics

### Fan Requirements

✅ **Instagram username only** (no API access needed)
✅ **Regular Instagram account** (personal or business)

This avoids the "personal vs professional" pitfall for fans!

## System Architecture

### Database Schema

```sql
-- Instagram creator connections
CREATE TABLE instagram_creator_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES users(id),
  page_id TEXT NOT NULL,
  ig_user_id TEXT NOT NULL,
  ig_username TEXT NOT NULL,
  access_token TEXT NOT NULL,  -- Page access token
  subscribed BOOLEAN NOT NULL DEFAULT true,
  webhook_subscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(creator_id),
  UNIQUE(page_id)
);

-- Fan Instagram usernames (no API access needed)
CREATE TABLE social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  platform TEXT NOT NULL,  -- 'instagram'
  username TEXT NOT NULL,  -- @handle (no @ prefix)
  external_user_id TEXT,   -- ig_user_id if available (optional)
  verified_at TIMESTAMPTZ, -- When username was verified
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(platform, username),
  INDEX idx_social_accounts_user_platform (user_id, platform)
);

-- Instagram-specific tasks
CREATE TABLE tasks_instagram (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES users(id),
  task_id UUID REFERENCES tasks(id), -- Link to main tasks table
  type TEXT NOT NULL,  -- 'comment_code' | 'mention_story' | 'keyword_comment'
  media_id TEXT,       -- Required for comment_code/keyword_comment
  media_url TEXT,      -- Display URL
  reward_points INTEGER NOT NULL,
  keyword TEXT,        -- For keyword_comment type
  require_hashtag TEXT, -- Optional hashtag requirement
  active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  INDEX idx_tasks_instagram_media (media_id, active),
  INDEX idx_tasks_instagram_creator (creator_id, active)
);

-- Task nonces (stored in Redis for performance)
-- Redis key: task_nonce:{taskId}:{userId} = {nonce}
-- TTL: 2 hours

-- Task completions (enhanced)
ALTER TABLE task_completions ADD COLUMN IF NOT EXISTS source_event_id TEXT;
ALTER TABLE task_completions ADD COLUMN IF NOT EXISTS source_media_id TEXT;
ALTER TABLE task_completions ADD COLUMN IF NOT EXISTS matched_username TEXT;
ALTER TABLE task_completions ADD COLUMN IF NOT EXISTS verification_method TEXT;
CREATE INDEX IF NOT EXISTS idx_task_completions_event ON task_completions(source_event_id);
```

### Redis Structure

```
# Nonce codes (TTL: 2 hours)
task_nonce:{taskId}:{userId} = "FDY-8K27"

# Task start tracking (TTL: 24 hours)
task_started:{taskId}:{userId} = {timestamp}

# Rate limiting (mention tasks)
mention_task:{userId}:daily = {count}  # TTL: 24 hours

# Webhook event deduplication (TTL: 7 days)
webhook_event:{comment_id} = "processed"
webhook_event:{mention_id} = "processed"
```

## API Endpoints

### Creator Endpoints

#### Connect Instagram
```
GET /api/social/instagram/creator/connect
→ Redirect to Facebook OAuth with scopes

GET /api/social/instagram/creator/callback?code={code}
→ Exchange code, get Page, get IG Business Account, subscribe webhooks
→ Store instagram_creator_links
```

#### Create Tasks
```
POST /api/tasks/instagram/comment-code
Body: {
  creatorId: string,
  mediaId: string,
  mediaUrl: string,
  rewardPoints: number,
  expiresAt?: timestamp
}
→ Creates task with type='comment_code'

POST /api/tasks/instagram/mention-story
Body: {
  creatorId: string,
  rewardPoints: number,
  requireHashtag?: string,
  expiresAt?: timestamp
}
→ Creates task with type='mention_story'

POST /api/tasks/instagram/keyword-comment
Body: {
  creatorId: string,
  mediaId: string,
  keyword: string,
  rewardPoints: number,
  expiresAt?: timestamp
}
→ Creates task with type='keyword_comment'
```

#### Get Instagram Media
```
GET /api/social/instagram/media
→ Fetches creator's recent posts for task creation
Response: [{ id, media_url, permalink, caption, timestamp }]
```

### Fan Endpoints

#### Save Instagram Username
```
POST /api/social/user/instagram
Body: { username: string }  // Validates ^[A-Za-z0-9._]+$
→ Saves to social_accounts
→ Returns { success: true, username }
```

#### Start Instagram Task
```
POST /api/tasks/instagram/:taskId/start
→ Generates nonce (if comment_code type)
→ Stores in Redis with TTL
→ Returns {
  taskId: string,
  type: 'comment_code' | 'mention_story' | 'keyword_comment',
  nonce?: string,  // For comment_code
  keyword?: string, // For keyword_comment
  mediaUrl: string,
  instructions: string,
  expiresAt: timestamp
}
```

#### Check Task Status
```
GET /api/tasks/instagram/:taskId/status
→ Returns {
  started: boolean,
  completed: boolean,
  verified: boolean,
  expiresAt: timestamp
}
```

### Webhook Endpoints

#### Webhook Verification (GET)
```
GET /api/social/instagram/webhook
Query: { hub.mode, hub.verify_token, hub.challenge }
→ If mode='subscribe' AND token matches → return challenge
→ Else return 403
```

#### Webhook Receiver (POST)
```
POST /api/social/instagram/webhook
Body: {
  object: "instagram",
  entry: [{
    id: string,
    time: number,
    changes: [{
      field: "instagram",
      value: {
        // Comment event
        comment_id?: string,
        media_id?: string,
        text?: string,
        from?: { id: string, username: string },
        
        // Mention event
        mention?: { ... },
        story?: { ... }
      }
    }]
  }]
}
→ Process events asynchronously
→ Return 200 immediately
```

## Verification Worker Logic

### Comment+Nonce Verification

```typescript
async function handleCommentEvent(event: InstagramCommentEvent) {
  const { comment_id, media_id, text, from } = event;
  
  // 1. Deduplicate (check Redis)
  const isDuplicate = await redis.exists(`webhook_event:${comment_id}`);
  if (isDuplicate) return;
  await redis.setex(`webhook_event:${comment_id}`, 7 * 24 * 60 * 60, 'processed');
  
  // 2. Find active tasks for this media
  const tasks = await db.query.tasks_instagram.findMany({
    where: and(
      eq(tasks_instagram.media_id, media_id),
      eq(tasks_instagram.active, true),
      eq(tasks_instagram.type, 'comment_code')
    )
  });
  
  if (!tasks.length) return;
  
  // 3. Extract nonce from comment text (look for FDY-XXXX pattern)
  const nonceMatch = text.match(/FDY-[A-Z0-9]{4}/i);
  if (!nonceMatch) return;
  const nonce = nonceMatch[0].toUpperCase();
  
  // 4. Find matching nonce in Redis
  for (const task of tasks) {
    const userIds = await redis.keys(`task_nonce:${task.id}:*`);
    
    for (const key of userIds) {
      const storedNonce = await redis.get(key);
      if (storedNonce === nonce) {
        const userId = key.split(':')[2];
        
        // 5. Match fan by Instagram username
        const fanAccount = await db.query.social_accounts.findFirst({
          where: and(
            eq(social_accounts.user_id, userId),
            eq(social_accounts.platform, 'instagram'),
            eq(social_accounts.username, from.username)
          )
        });
        
        if (!fanAccount) {
          console.warn('[Instagram] Username mismatch:', {
            expected: from.username,
            userId
          });
          continue;
        }
        
        // 6. Award points (idempotent)
        await awardTaskCompletion({
          taskId: task.task_id,
          userId,
          sourceEventId: comment_id,
          sourceMediaId: media_id,
          matchedUsername: from.username,
          verificationMethod: 'instagram_nonce',
          points: task.reward_points
        });
        
        // 7. Clean up nonce
        await redis.del(key);
        
        console.log('[Instagram] ✅ Task verified via nonce:', {
          taskId: task.id,
          userId,
          username: from.username,
          nonce
        });
        
        return;
      }
    }
  }
}
```

### Story Mention Verification

```typescript
async function handleMentionEvent(event: InstagramMentionEvent) {
  const { mention_id, from, target } = event;
  
  // 1. Deduplicate
  const isDuplicate = await redis.exists(`webhook_event:${mention_id}`);
  if (isDuplicate) return;
  await redis.setex(`webhook_event:${mention_id}`, 7 * 24 * 60 * 60, 'processed');
  
  // 2. Find creator by IG username
  const creatorLink = await db.query.instagram_creator_links.findFirst({
    where: eq(instagram_creator_links.ig_username, target.username)
  });
  
  if (!creatorLink) return;
  
  // 3. Find active mention tasks for this creator
  const tasks = await db.query.tasks_instagram.findMany({
    where: and(
      eq(tasks_instagram.creator_id, creatorLink.creator_id),
      eq(tasks_instagram.active, true),
      eq(tasks_instagram.type, 'mention_story')
    )
  });
  
  if (!tasks.length) return;
  
  // 4. Match fan by username
  const fanAccount = await db.query.social_accounts.findFirst({
    where: and(
      eq(social_accounts.platform, 'instagram'),
      eq(social_accounts.username, from.username)
    )
  });
  
  if (!fanAccount) {
    console.warn('[Instagram] Unknown fan username:', from.username);
    return;
  }
  
  // 5. Rate limiting (max 1 mention task per user per day)
  const dailyKey = `mention_task:${fanAccount.user_id}:daily`;
  const count = await redis.incr(dailyKey);
  if (count === 1) {
    await redis.expire(dailyKey, 24 * 60 * 60);
  }
  if (count > 3) {
    console.warn('[Instagram] Rate limit exceeded:', fanAccount.user_id);
    return;
  }
  
  // 6. Find matching task (check if user has started it)
  for (const task of tasks) {
    const hasStarted = await redis.exists(`task_started:${task.id}:${fanAccount.user_id}`);
    if (!hasStarted) continue;
    
    // Optional: Check hashtag requirement
    if (task.require_hashtag) {
      // Note: Need to fetch story content if available in payload
      // For now, assume webhook provides this data
      const hasHashtag = event.caption?.includes(task.require_hashtag);
      if (!hasHashtag) continue;
    }
    
    // 7. Award points
    await awardTaskCompletion({
      taskId: task.task_id,
      userId: fanAccount.user_id,
      sourceEventId: mention_id,
      matchedUsername: from.username,
      verificationMethod: 'instagram_mention',
      points: task.reward_points
    });
    
    console.log('[Instagram] ✅ Task verified via mention:', {
      taskId: task.id,
      userId: fanAccount.user_id,
      username: from.username
    });
    
    return;
  }
}
```

## Nonce Generation

```typescript
function generateNonce(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous chars
  const length = 4;
  let nonce = 'FDY-';
  
  for (let i = 0; i < length; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return nonce;
}

// Example: FDY-8K27, FDY-N3P9, FDY-7XR4
```

## Fraud Prevention

### 1. Nonce Expiration
- TTL: 2 hours
- Prevents code sharing/reuse

### 2. One Task Per User
- Enforce UNIQUE(task_id, user_id) in task_completions
- Prevent duplicate submissions

### 3. Username Verification
- Match webhook username to saved fan username
- Prevents impersonation

### 4. Event Deduplication
- Store processed comment/mention IDs in Redis (7 days)
- Prevent replay attacks

### 5. Rate Limiting
- Mention tasks: Max 3 per user per day
- Comment tasks: Natural rate limit via unique nonces

### 6. Exact Match
- Nonce must match exactly (case-insensitive)
- Prevent partial matches

## User Flows

### Fan Starting Comment Task

```
1. Fan browses creator's tasks page
2. Sees "Comment on Instagram Post" task
3. Clicks "Start Task"
4. Modal appears:
   - "What's your Instagram username?"
   - Input: @_______
   - [Save & Continue]
5. Username saved to database
6. Nonce generated: FDY-8K27
7. Instructions shown:
   "1. Click the button below to open the Instagram post
    2. Comment exactly: FDY-8K27
    3. Come back here - we'll verify automatically!"
   [Open Instagram Post]
8. Fan comments on Instagram
9. Webhook fires → verification happens
10. Real-time notification: "✅ Task Verified! +50 points"
```

### Fan Starting Mention Task

```
1. Fan sees "Mention in Story" task
2. Clicks "Start Task"
3. If no username saved:
   - Prompt for Instagram username
   - Save to database
4. Instructions shown:
   "1. Create an Instagram Story
    2. Mention @creator_username
    3. Come back here - we'll verify automatically!"
   [Open Instagram]
5. Fan posts story with mention
6. Webhook fires → verification happens
7. Real-time notification: "✅ Task Verified! +100 points"
```

## Implementation Checklist

### Phase 1: Core Infrastructure
- [x] Instagram webhook verification endpoint (GET)
- [x] Instagram webhook receiver endpoint (POST)
- [ ] Enhanced comment event processing with nonce matching
- [ ] Mention event processing
- [ ] Redis integration for nonce storage
- [ ] Event deduplication system

### Phase 2: Creator Tools
- [ ] OAuth flow for Instagram Business/Creator accounts
- [ ] Page subscription automation
- [ ] Media fetching endpoint (get recent posts)
- [ ] Task creation APIs (comment-code, mention-story)
- [ ] Creator dashboard UI for Instagram tasks

### Phase 3: Fan Experience
- [ ] Instagram username capture modal/form
- [ ] Validation (^[A-Za-z0-9._]+$)
- [ ] Task start endpoint with nonce generation
- [ ] Task instructions UI component
- [ ] Real-time verification notifications
- [ ] Instagram deep link generation

### Phase 4: Verification Worker
- [ ] Comment+nonce verification service
- [ ] Mention verification service
- [ ] Keyword matching service
- [ ] Award points helper with idempotency
- [ ] Username matching logic
- [ ] Rate limiting implementation

### Phase 5: Testing & Polish
- [ ] Webhook test events in Meta dashboard
- [ ] End-to-end fan flow testing
- [ ] Fraud scenario testing
- [ ] Error handling & edge cases
- [ ] Performance optimization (Redis caching)
- [ ] Monitoring & alerting

## Meta App Review Requirements

### What to Submit

1. **App Use Case:**
   "Fan engagement and task verification platform. Creators create tasks (comment on post, mention in story), fans complete them, system verifies via webhooks and awards points."

2. **Permissions Needed:**
   - `instagram_basic` - Fetch creator profile and media
   - `instagram_manage_comments` - Receive comment webhooks for verification
   - `pages_show_list` - Find Page linked to IG account
   - `pages_manage_metadata` - Subscribe to webhooks

3. **Test Accounts:**
   - Creator test account (Instagram Business linked to Page)
   - Fan test account (regular Instagram)

4. **Demo Video:**
   - Show creator connecting Instagram
   - Show creator creating comment task
   - Show fan completing task
   - Show auto-verification

### Privacy Policy Requirements

- "We process Instagram comments solely for task verification"
- "We store Instagram usernames to match completions"
- "We don't access DMs, followers, or private data"
- "Comments are processed in real-time and not stored permanently"

## Benefits of This Approach

✅ **Zero friction for fans** - Just provide username once
✅ **Instant verification** - Webhook delivers real-time results
✅ **Fraud-resistant** - Unique nonces with expiration
✅ **Scalable** - No manual review needed
✅ **Cost-effective** - Minimal API calls
✅ **Creator-friendly** - Simple task creation
✅ **Compliant** - Follows Meta's best practices

## Future Enhancements

### Phase 2 Features
- Instagram DM notifications for task completion
- Auto-reply to verified comments ("✅ Points awarded!")
- Instagram media preview in task cards
- Bulk task creation from media feed

### Advanced Features
- Instagram Insights integration (show engagement metrics)
- Story sticker templates for mention tasks
- Collaborative tasks (tag 3 friends)
- Instagram Reels-specific tasks

## Reference Links

- [Instagram Graph API](https://developers.facebook.com/docs/instagram-api)
- [Instagram Webhooks](https://developers.facebook.com/docs/graph-api/webhooks/getting-started/webhooks-for-instagram)
- [Instagram Comments](https://developers.facebook.com/docs/instagram-api/guides/comments)
- [Meta App Review](https://developers.facebook.com/docs/app-review)

