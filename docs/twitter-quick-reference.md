# Twitter Verification Quick Reference

## 🎯 One-Page Cheat Sheet

### API Endpoints (Backend)

```
POST   /api/twitter/verify-task              # Auto-verify & complete task
POST   /api/twitter/verify/follow            # Check follow status
POST   /api/twitter/verify/like              # Check like status
POST   /api/twitter/verify/retweet           # Check retweet status
GET    /api/twitter/creator-tweets/:url      # Get creator's tweets
GET    /api/twitter/tweets/:userId           # Get user's tweets
GET    /api/twitter/tweet/:tweetId           # Get specific tweet
```

### React Hooks (Frontend)

```tsx
import {
  useVerifyTwitterTask,    // Main verification hook
  useVerifyFollow,         // Verify follow
  useVerifyLike,           // Verify like
  useVerifyRetweet,        // Verify retweet
  useCreatorTweets,        // Fetch creator tweets
  useTweet,                // Fetch specific tweet
} from "@/hooks/useTwitterVerification";
```

### Components

```tsx
import TweetEmbedWidget from "@/components/twitter/TweetEmbedWidget";
import CreatorTweetsFeed from "@/components/twitter/CreatorTweetsFeed";
```

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Add Twitter Credentials
```bash
# .env
TWITTER_CLIENT_ID=your_client_id
TWITTER_CLIENT_SECRET=your_client_secret
VITE_TWITTER_CLIENT_ID=your_client_id
```

### Step 2: Use in Your Page
```tsx
import TweetEmbedWidget from "@/components/twitter/TweetEmbedWidget";

<TweetEmbedWidget
  tweetId="1234567890"
  tweetUrl="https://twitter.com/creator/status/1234567890"
  taskId="task-123"
  taskType="twitter_like"
  points={25}
/>
```

### Step 3: Done! 🎉
User clicks → Likes on Twitter → Clicks verify → Gets points instantly!

---

## 📖 X API Endpoints Used

| Feature | Endpoint | Documentation |
|---------|----------|---------------|
| Verify Follow | `GET /2/users/{id}/following` | [Docs](https://docs.x.com/x-api/users/get-following) |
| Verify Like | `GET /2/users/{id}/liked_tweets` | [Docs](https://docs.x.com/x-api/users/get-liked-posts) |
| Verify Retweet | `GET /2/tweets/{id}/retweeted_by` | [Docs](https://docs.x.com/x-api/posts/get-reposted-by) |
| Verify Quote | `GET /2/tweets/{id}/quote_tweets` | [Docs](https://docs.x.com/x-api/posts/get-quoted-posts) |
| Get Tweets | `GET /2/users/{id}/tweets` | [Docs](https://docs.x.com/x-api/users/get-posts) |

---

## 💻 Code Snippets

### Verify Follow
```tsx
const { mutateAsync } = useVerifyFollow();
const result = await mutateAsync({ creatorHandle: 'djartist' });
if (result.verified) { /* Award points */ }
```

### Verify Like
```tsx
const { mutateAsync } = useVerifyLike();
const result = await mutateAsync({ tweetUrl: 'https://twitter.com/...' });
if (result.verified) { /* Award points */ }
```

### Auto-Verify Any Task
```tsx
const { mutateAsync } = useVerifyTwitterTask();
const result = await mutateAsync({
  taskId: 'task-123',
  taskType: 'twitter_like',
  taskSettings: { url: 'https://twitter.com/...' }
});
```

### Display Creator Tweets
```tsx
<CreatorTweetsFeed
  creatorUrl="djartist"
  creatorName="DJ Artist"
  limit={5}
/>
```

---

## 🎨 Component Props

### TweetEmbedWidget
```tsx
interface Props {
  tweetId: string;              // "1234567890"
  tweetUrl: string;             // "https://twitter.com/..."
  taskId: string;               // "task-123"
  taskType: 'twitter_like' | 'twitter_retweet';
  points: number;               // 25
  text?: string;                // Tweet text
  authorName?: string;          // "Creator"
  authorUsername?: string;      // "creator"
  authorImage?: string;         // URL
  createdAt?: string;           // ISO date
  metrics?: {
    likes?: number;
    retweets?: number;
    replies?: number;
  };
}
```

### CreatorTweetsFeed
```tsx
interface Props {
  creatorUrl: string;           // "djartist"
  creatorName: string;          // "DJ Artist"
  limit?: number;               // 5 (default)
}
```

---

## 🔧 Service Methods

### Backend Service
```typescript
import { TwitterVerificationService } from "./twitter-verification-service";

// Verify follow
const result = await TwitterVerificationService.verifyFollow(
  fanUserId,
  'creatorhandle'
);

// Verify like
const result = await TwitterVerificationService.verifyLike(
  fanUserId,
  'tweetId'
);

// Verify retweet
const result = await TwitterVerificationService.verifyRetweet(
  fanUserId,
  'tweetId'
);

// Get user tweets
const tweets = await TwitterVerificationService.getUserTweets(
  userId,
  5 // limit
);
```

---

## ⚡ Common Patterns

### Pattern 1: Follow + Verify
```tsx
<div>
  <Button onClick={() => window.open('https://twitter.com/creator', '_blank')}>
    Follow on Twitter
  </Button>
  <Button onClick={handleVerify}>
    Verify & Earn Points
  </Button>
</div>
```

### Pattern 2: Embedded Tweet Task
```tsx
<TweetEmbedWidget {...tweetProps} />
```

### Pattern 3: Multiple Tasks Campaign
```tsx
<div>
  <FollowTask />
  <TweetEmbedWidget taskType="twitter_like" />
  <TweetEmbedWidget taskType="twitter_retweet" />
</div>
```

---

## 🐛 Troubleshooting

| Error | Solution |
|-------|----------|
| "Twitter account not connected" | User needs to connect via OAuth |
| "Token expired" | System auto-refreshes, or user reconnects |
| "Invalid tweet URL" | Use format: `https://twitter.com/user/status/ID` |
| "Rate limit exceeded" | Wait a few minutes, or implement retry logic |
| "Failed to fetch following" | Check token scopes include `follows.read` |

---

## 📊 Response Types

### VerificationResult
```typescript
{
  verified: boolean;           // true if task completed
  error?: string;              // Error message if failed
  message?: string;            // User-friendly message
  data?: any;                  // Verification data
  completion?: TaskCompletion; // DB record
  rewards?: RewardResult;      // Points awarded
  alreadyCompleted?: boolean;  // If task was already done
}
```

### TwitterTweet
```typescript
{
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
  entities?: {
    hashtags?: Array<{ tag: string }>;
    mentions?: Array<{ username: string }>;
    urls?: Array<{ url: string; expanded_url: string }>;
  };
}
```

---

## 🔗 Important Links

- [Full Documentation](./twitter-verification.md)
- [Integration Examples](./twitter-integration-examples.md)
- [X API Docs](https://docs.x.com/x-api)
- [OAuth 2.0 Guide](https://docs.x.com/x-api/authentication/oauth-2-0)

---

## ✅ Pre-Launch Checklist

- [ ] Twitter app created in Developer Portal
- [ ] OAuth 2.0 enabled with correct callback URL
- [ ] Scopes configured: `users.read`, `tweet.read`, `follows.read`, `like.read`, `offline.access`
- [ ] Environment variables set in `.env`
- [ ] Test OAuth connection flow
- [ ] Test follow verification
- [ ] Test like verification
- [ ] Test retweet verification
- [ ] Test token refresh
- [ ] Test error handling
- [ ] Components render correctly
- [ ] Points awarded correctly

---

## 🎉 You're Ready!

Everything you need is in this one page. For more details, see the full documentation.

**Happy building! 🚀**

