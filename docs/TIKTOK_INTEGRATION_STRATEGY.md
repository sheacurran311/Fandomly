# TikTok Integration Strategy

## Problem
TikTok's Research API (which provides follower/following/likes data) is restricted to approved researchers only. We cannot verify fan engagement through API calls.

## Solution: Display API + Embed + Manual Verification

### Phase 1: Creator Profile Display (Available Now)

Use [TikTok Display API](https://developers.tiktok.com/doc/display-api-overview) to show creator content:

**APIs Available:**
1. **`POST /v2/user/info/`** - Get creator profile
   - Returns: `avatar_url`, `display_name`, `bio_description`, `profile_deep_link`
   - Permissions needed: `user.info.basic`

2. **`POST /v2/video/list/`** - Get creator's recent videos
   - Returns: List of video metadata (max 20 videos)
   - Permissions needed: `video.list`

3. **`POST /v2/video/query/`** - Get specific video details
   - Returns: Video metadata by video IDs
   - Permissions needed: `video.list`

### Phase 2: Embed Videos on Creator Profile

Use [TikTok Embed Player](https://developers.tiktok.com/doc/embed-videos) to display videos:

**Implementation:**
```tsx
// Embed TikTok video directly
<iframe
  src={`https://www.tiktok.com/embed/v2/${videoId}`}
  width="325"
  height="575"
  frameBorder="0"
  allow="encrypted-media"
/>
```

**Features:**
- Videos play in-app (fans don't leave your platform)
- Shows TikTok's native like/comment/share buttons
- Automatically tracks engagement on TikTok's side

### Phase 3: Task Verification Strategy

Since we can't access engagement data via API, use these approaches:

#### Option A: Redirect + Manual Verification (Recommended)
```tsx
Task: "Follow @creator on TikTok"
Button: "Go to TikTok" → Opens TikTok app/web
After return: "Click Verify" → Asks fan to upload screenshot
Creator approves screenshot manually
```

#### Option B: Embed + Self-Report
```tsx
Task: "Like this TikTok video"
Display: Embedded video with native TikTok like button
After interaction: "Click Verify" → Fan confirms they completed it
System marks as pending → Creator can audit later
```

#### Option C: External Link Verification
```tsx
Task: "Comment on this TikTok"
Display: Embedded video
Button: "Comment on TikTok" → Deep link to video in TikTok app
Return: "I've commented" → Self-report, requires manual review
```

### Phase 4: Creator Profile Features

**What We Can Build:**

1. **TikTok Video Gallery**
   - Display creator's recent 12-20 videos
   - Use `/v2/video/list/` API
   - Embed videos for in-app viewing

2. **Featured Videos**
   - Let creators select specific videos to showcase
   - Use `/v2/video/query/` API
   - Embed selected videos on program page

3. **Profile Link**
   - Show creator's TikTok profile info
   - "View Full Profile on TikTok" button → `profile_deep_link`

4. **Auto-Updated Content**
   - Fetch latest videos daily via cron job
   - Cache video metadata in database
   - Display fresh content automatically

### Implementation Plan

#### 1. Create TikTok Display Service
```typescript
// server/services/tiktok-display-service.ts

export async function getTikTokUserInfo(accessToken: string) {
  const response = await fetch('https://open.tiktokapis.com/v2/user/info/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  return response.json();
}

export async function getTikTokVideoList(accessToken: string, maxCount = 20) {
  const response = await fetch('https://open.tiktokapis.com/v2/video/list/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      max_count: maxCount
    })
  });
  return response.json();
}

export async function getTikTokVideos(accessToken: string, videoIds: string[]) {
  const response = await fetch('https://open.tiktokapis.com/v2/video/query/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filters: {
        video_ids: videoIds
      }
    })
  });
  return response.json();
}
```

#### 2. Create TikTok Video Embed Component
```tsx
// client/src/components/tiktok/tiktok-video-embed.tsx

interface TikTokEmbedProps {
  videoId: string;
  width?: number;
  height?: number;
}

export function TikTokVideoEmbed({ 
  videoId, 
  width = 325, 
  height = 575 
}: TikTokEmbedProps) {
  return (
    <iframe
      src={`https://www.tiktok.com/embed/v2/${videoId}`}
      width={width}
      height={height}
      frameBorder="0"
      allow="encrypted-media; fullscreen"
      className="rounded-lg"
    />
  );
}
```

#### 3. Create TikTok Video Gallery
```tsx
// client/src/components/tiktok/tiktok-video-gallery.tsx

export function TikTokVideoGallery({ creatorId }: { creatorId: string }) {
  const { data: videos, isLoading } = useQuery({
    queryKey: ['tiktok-videos', creatorId],
    queryFn: async () => {
      const res = await fetch(`/api/creators/${creatorId}/tiktok-videos`);
      return res.json();
    }
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {videos?.map((video: any) => (
        <TikTokVideoEmbed key={video.id} videoId={video.id} />
      ))}
    </div>
  );
}
```

#### 4. Add API Routes
```typescript
// server/routes.ts

// Get creator's TikTok videos
app.get('/api/creators/:creatorId/tiktok-videos', async (req, res) => {
  const creator = await getCreator(req.params.creatorId);
  const tiktokConnection = await getSocialConnection(creator.userId, 'tiktok');
  
  if (!tiktokConnection) {
    return res.json({ videos: [] });
  }
  
  const videos = await getTikTokVideoList(tiktokConnection.accessToken);
  res.json(videos);
});
```

### Task Verification Flow

**For TikTok Tasks:**

1. **Task Creation** (Creator):
   - Type: "Follow on TikTok" or "Like TikTok Video" or "Comment on Video"
   - Include: TikTok profile URL or video ID
   - Points: Set reward amount

2. **Task Display** (Fan):
   - Show embedded video (if video task)
   - Show "Go to TikTok" button with deep link
   - After return: Show "Mark as Complete" button

3. **Verification** (System):
   - Fan clicks "Mark as Complete"
   - System marks as `pending_verification`
   - Creator reviews and manually approves/rejects
   - OR: Auto-approve after 24 hours (honor system)

4. **Alternative** (Future with API access):
   - If TikTok opens up APIs, switch to automatic verification
   - Code is already structured to support it

### Database Schema

```sql
-- Store TikTok video metadata
CREATE TABLE creator_tiktok_videos (
  id VARCHAR PRIMARY KEY,
  creator_id VARCHAR REFERENCES creators(id),
  video_id VARCHAR NOT NULL,
  video_url VARCHAR NOT NULL,
  cover_image_url VARCHAR,
  title TEXT,
  view_count INTEGER,
  like_count INTEGER,
  comment_count INTEGER,
  share_count INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Track which videos to feature
CREATE TABLE featured_tiktok_videos (
  id VARCHAR PRIMARY KEY,
  creator_id VARCHAR REFERENCES creators(id),
  video_id VARCHAR NOT NULL,
  display_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Permissions Needed

Request these scopes during TikTok OAuth:
- `user.info.basic` - Get profile information
- `video.list` - Access user's video list

### Rate Limits

Per [TikTok API docs](https://developers.tiktok.com/doc/server-api-rate-limits):
- 100 requests per day per user access token
- Cache video data to minimize API calls

### Benefits of This Approach

✅ **Works with current TikTok API access**
✅ **Showcases creator content in-app**
✅ **Provides fan engagement surface**
✅ **Easy to upgrade if API access expands**
✅ **Better UX than external redirects**
✅ **Videos auto-update with latest content**

### Limitations

❌ Cannot auto-verify follows/likes/comments
❌ Requires manual verification or honor system
❌ Limited to 20 most recent videos per creator
❌ Cannot access historical engagement data

### Next Steps

1. Implement TikTok Display API service
2. Create video embed component
3. Build video gallery for creator profiles
4. Add manual verification flow for TikTok tasks
5. Consider screenshot upload for verification proof
6. Monitor TikTok API for future access expansion

