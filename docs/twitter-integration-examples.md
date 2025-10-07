# Twitter Verification Integration Examples

## 🎯 Quick Start Guide

This guide shows how to integrate Twitter verification into your creator pages and fan dashboards.

---

## Example 1: Creator Store Page with Tweets

Add a "Latest Tweets" section to your creator's store page:

```tsx
// client/src/pages/creator-store.tsx or similar

import CreatorTweetsFeed from "@/components/twitter/CreatorTweetsFeed";

export default function CreatorStore() {
  const creator = useCreator(); // Your creator data hook

  return (
    <div className="space-y-8">
      {/* ... other sections ... */}
      
      {/* Twitter Feed Section */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">
          Latest Updates
        </h2>
        <CreatorTweetsFeed
          creatorUrl={creator.twitterHandle}
          creatorName={creator.displayName}
          limit={5}
        />
      </section>
    </div>
  );
}
```

---

## Example 2: Embedded Tweet Task

Create a task where fans like a specific tweet:

```tsx
// client/src/pages/fan-dashboard/tasks.tsx or similar

import TweetEmbedWidget from "@/components/twitter/TweetEmbedWidget";

export default function FanTasks() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Complete Tasks</h1>
      
      {/* Embedded Tweet Task */}
      <TweetEmbedWidget
        tweetId="1234567890"
        tweetUrl="https://twitter.com/djartist/status/1234567890"
        taskId="task-123"
        taskType="twitter_like"
        points={25}
        text="🎉 Our new album just dropped! Check it out on Spotify"
        authorName="DJ Artist"
        authorUsername="djartist"
        authorImage="https://pbs.twimg.com/profile_images/..."
        createdAt="2024-01-15T10:30:00Z"
        metrics={{
          likes: 1500,
          retweets: 320,
          replies: 89
        }}
      />

      {/* Retweet Task */}
      <TweetEmbedWidget
        tweetId="9876543210"
        tweetUrl="https://twitter.com/djartist/status/9876543210"
        taskId="task-456"
        taskType="twitter_retweet"
        points={50}
        text="🚀 Announcing our world tour! Tickets on sale Friday"
        authorName="DJ Artist"
        authorUsername="djartist"
        metrics={{
          likes: 2300,
          retweets: 890,
          replies: 145
        }}
      />
    </div>
  );
}
```

---

## Example 3: Follow Task with Verification

Create a "Follow on Twitter" task:

```tsx
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useVerifyFollow } from "@/hooks/useTwitterVerification";
import { useToast } from "@/hooks/use-toast";
import { Twitter, CheckCircle2, Loader2 } from "lucide-react";

function FollowTask({ creatorHandle, taskId, points }: {
  creatorHandle: string;
  taskId: string;
  points: number;
}) {
  const { toast } = useToast();
  const verifyFollow = useVerifyFollow();
  const [isCompleted, setIsCompleted] = useState(false);

  const handleVerify = async () => {
    try {
      const result = await verifyFollow.mutateAsync({ creatorHandle });
      
      if (result.verified) {
        setIsCompleted(true);
        toast({
          title: "✅ Task Completed!",
          description: `You earned ${points} points!`,
        });
      } else {
        toast({
          title: "Not Following Yet",
          description: "Please follow on Twitter first, then try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Verification Failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="p-6 bg-white/5 border-white/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-[#1DA1F2]/20 flex items-center justify-center">
            <Twitter className="h-6 w-6 text-[#1DA1F2]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              Follow @{creatorHandle}
            </h3>
            <p className="text-sm text-gray-400">
              Earn {points} points
            </p>
          </div>
        </div>
        <Badge variant="outline" className="border-brand-primary text-brand-primary">
          +{points} points
        </Badge>
      </div>

      <p className="text-gray-400 mb-4">
        Follow @{creatorHandle} on Twitter to stay updated and earn rewards!
      </p>

      <div className="flex gap-3">
        <Button
          onClick={() => window.open(`https://twitter.com/${creatorHandle}`, '_blank')}
          variant="outline"
          className="flex-1 border-white/20"
        >
          <Twitter className="h-4 w-4 mr-2" />
          Follow on Twitter
        </Button>
        
        <Button
          onClick={handleVerify}
          disabled={verifyFollow.isPending || isCompleted}
          className="flex-1 bg-brand-primary hover:bg-brand-primary/90"
        >
          {verifyFollow.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : isCompleted ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Completed
            </>
          ) : (
            `Verify & Earn ${points}`
          )}
        </Button>
      </div>
    </Card>
  );
}
```

---

## Example 4: Campaign with Multiple Twitter Tasks

Create a campaign with follow + like + retweet tasks:

```tsx
function TwitterCampaign({ creator }: { creator: Creator }) {
  return (
    <div className="space-y-6">
      <Card className="p-6 bg-gradient-to-br from-brand-primary/20 to-purple-600/20 border-brand-primary/50">
        <h2 className="text-2xl font-bold text-white mb-2">
          🚀 Twitter Takeover Campaign
        </h2>
        <p className="text-gray-300 mb-4">
          Complete all tasks to earn <strong>150 points</strong> and unlock exclusive rewards!
        </p>
        <div className="flex gap-2">
          <Badge variant="outline" className="border-brand-primary text-brand-primary">
            Total: 150 points
          </Badge>
          <Badge variant="outline" className="border-purple-500 text-purple-400">
            3 Tasks
          </Badge>
        </div>
      </Card>

      {/* Task 1: Follow */}
      <FollowTask
        creatorHandle={creator.twitterHandle}
        taskId="task-follow-1"
        points={50}
      />

      {/* Task 2: Like Tweet */}
      <TweetEmbedWidget
        tweetId="1234567890"
        tweetUrl={`https://twitter.com/${creator.twitterHandle}/status/1234567890`}
        taskId="task-like-1"
        taskType="twitter_like"
        points={25}
        text="Check out our new release! 🎵"
        authorName={creator.displayName}
        authorUsername={creator.twitterHandle}
      />

      {/* Task 3: Retweet */}
      <TweetEmbedWidget
        tweetId="9876543210"
        tweetUrl={`https://twitter.com/${creator.twitterHandle}/status/9876543210`}
        taskId="task-retweet-1"
        taskType="twitter_retweet"
        points={75}
        text="🎉 Celebrating 100K followers! Thank you all!"
        authorName={creator.displayName}
        authorUsername={creator.twitterHandle}
      />
    </div>
  );
}
```

---

## Example 5: Auto-Verify Button for Any Task

Generic verification button that works with any Twitter task type:

```tsx
import { useVerifyTwitterTask } from "@/hooks/useTwitterVerification";

function TwitterTaskVerifyButton({ task }: { task: Task }) {
  const verifyTask = useVerifyTwitterTask();
  const { toast } = useToast();

  const handleVerify = async () => {
    try {
      const result = await verifyTask.mutateAsync({
        taskId: task.id,
        taskType: task.taskType,
        taskSettings: task.settings,
      });

      if (result.verified) {
        if (result.alreadyCompleted) {
          toast({
            title: "Already Completed",
            description: "You've already completed this task!",
          });
        } else {
          toast({
            title: "✅ Success!",
            description: `You earned ${task.points} points!`,
          });
        }
      } else {
        toast({
          title: "Not Verified",
          description: result.message || "Please complete the task on Twitter first.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to verify task. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      onClick={handleVerify}
      disabled={verifyTask.isPending}
      className="w-full bg-brand-primary hover:bg-brand-primary/90"
    >
      {verifyTask.isPending ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Verifying...
        </>
      ) : (
        `Verify & Earn ${task.points} Points`
      )}
    </Button>
  );
}
```

---

## Example 6: Creator Dashboard - Recent Tweets Preview

Show creator's own tweets in their dashboard:

```tsx
import { useUserTweets } from "@/hooks/useTwitterVerification";

function CreatorDashboardTwitter() {
  const { user } = useAuth();
  const { data: tweets, isLoading } = useUserTweets(user.id, 3);

  if (isLoading) {
    return <div>Loading tweets...</div>;
  }

  return (
    <Card className="p-6 bg-white/5 border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          Your Recent Tweets
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.open('https://twitter.com/compose/tweet', '_blank')}
        >
          <Twitter className="h-4 w-4 mr-2" />
          Post Tweet
        </Button>
      </div>

      {tweets?.length === 0 ? (
        <p className="text-gray-400 text-center py-4">
          No tweets yet. Start sharing!
        </p>
      ) : (
        <div className="space-y-3">
          {tweets?.map((tweet) => (
            <div key={tweet.id} className="p-4 bg-white/5 rounded-lg">
              <p className="text-white text-sm">{tweet.text}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                <span>❤️ {tweet.public_metrics?.like_count || 0}</span>
                <span>🔁 {tweet.public_metrics?.retweet_count || 0}</span>
                <span>💬 {tweet.public_metrics?.reply_count || 0}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
```

---

## Example 7: Task Creation with Tweet Embedding

When creating a task, allow creators to embed a tweet:

```tsx
function CreateTwitterTask() {
  const [tweetUrl, setTweetUrl] = useState('');
  const extractTweetId = useExtractTweetId();

  const handleCreateTask = async () => {
    // Extract tweet ID
    const { tweetId } = await extractTweetId.mutateAsync({ url: tweetUrl });

    // Create task
    await createTask({
      taskType: 'twitter_like',
      platform: 'twitter',
      settings: {
        url: tweetUrl,
        tweetId,
      },
      points: 25,
    });
  };

  return (
    <div className="space-y-4">
      <Label>Tweet URL</Label>
      <Input
        value={tweetUrl}
        onChange={(e) => setTweetUrl(e.target.value)}
        placeholder="https://twitter.com/user/status/1234567890"
      />
      <Button onClick={handleCreateTask}>
        Create Like Task
      </Button>
    </div>
  );
}
```

---

## 🎨 Styling Tips

### Match Your Brand
All components use Tailwind classes and can be customized:

```tsx
<TweetEmbedWidget
  // ... props
  className="border-2 border-purple-500" // Custom border
/>
```

### Dark/Light Mode
Components are designed for dark mode but can be adapted:

```css
/* Add to your global CSS */
.tweet-widget-light {
  @apply bg-white text-gray-900 border-gray-200;
}
```

---

## ⚡ Performance Tips

### 1. Lazy Load Tweets
```tsx
import { lazy, Suspense } from 'react';

const CreatorTweetsFeed = lazy(() => import('@/components/twitter/CreatorTweetsFeed'));

<Suspense fallback={<LoadingSpinner />}>
  <CreatorTweetsFeed creatorUrl="djartist" />
</Suspense>
```

### 2. Cache Verification Results
The hooks automatically cache results using React Query:
```tsx
// Results are cached for 5 minutes by default
const { data: tweets } = useCreatorTweets('djartist', 5); // Cached!
```

### 3. Debounce Verification
Prevent spam clicking:
```tsx
const [lastVerify, setLastVerify] = useState(0);

const handleVerify = async () => {
  const now = Date.now();
  if (now - lastVerify < 3000) { // 3 second cooldown
    toast({ title: "Please wait..." });
    return;
  }
  setLastVerify(now);
  // ... verify logic
};
```

---

## 🐛 Error Handling

### Handle Connection Errors
```tsx
function TwitterTaskWithErrorHandling({ task }: { task: Task }) {
  const verifyTask = useVerifyTwitterTask();

  const handleVerify = async () => {
    try {
      const result = await verifyTask.mutateAsync({...});
      
      if (!result.verified && result.error === 'Twitter account not connected') {
        // Prompt user to connect Twitter
        showConnectTwitterModal();
        return;
      }
      
      // ... handle other cases
    } catch (error) {
      if (error.message.includes('rate limit')) {
        toast({
          title: "Rate Limited",
          description: "Please try again in a few minutes.",
        });
      }
    }
  };

  return <Button onClick={handleVerify}>Verify</Button>;
}
```

---

## 🔗 See Also

- [Twitter Verification Documentation](./twitter-verification.md)
- [Task System Overview](./TASK_TEMPLATE_SYSTEM.md)
- [Rewards Engine](./REWARDS_ENGINE_ROADMAP.md)

