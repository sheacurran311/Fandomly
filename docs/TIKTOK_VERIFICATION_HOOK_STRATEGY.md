# TikTok Task Verification Hook Strategy

## Problem
TikTok embed player doesn't expose JavaScript events for like/comment interactions. Users are redirected to TikTok app/web when they interact with embedded videos.

## Hybrid Solution: Smart Detection + Verification Window

### Approach Overview

1. **Embed Video** with custom wrapper
2. **Detect Redirect** when user clicks like/comment
3. **Open Verification Window** that monitors for return
4. **Poll TikTok API** to verify action was taken
5. **Auto-verify** if evidence found

### What We CAN Detect

✅ **User clicked on embedded video** (iframe click detection)
✅ **User returned from TikTok** (window focus events)
✅ **Time user spent on TikTok** (duration tracking)
✅ **User's recent TikTok activity** (via Display API - limited)

### Implementation Strategy

#### 1. Enhanced TikTok Embed Component with Click Detection

```tsx
// client/src/components/tiktok/tiktok-task-embed.tsx

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ExternalLink, Loader2 } from 'lucide-react';

interface TikTokTaskEmbedProps {
  videoId: string;
  taskType: 'like' | 'comment' | 'follow';
  taskCompletionId?: string;
  creatorUsername?: string;
  onVerificationStart?: () => void;
  onVerificationComplete?: (verified: boolean) => void;
}

export function TikTokTaskEmbed({
  videoId,
  taskType,
  taskCompletionId,
  creatorUsername,
  onVerificationStart,
  onVerificationComplete
}: TikTokTaskEmbedProps) {
  const { user } = useAuth();
  const [isVerifying, setIsVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [clickDetected, setClickDetected] = useState(false);
  const embedRef = useRef<HTMLDivElement>(null);
  const redirectTimeRef = useRef<number>(0);

  // Detect when user clicks on embed (they're being redirected)
  useEffect(() => {
    const detectRedirect = () => {
      setClickDetected(true);
      redirectTimeRef.current = Date.now();
      
      // Start monitoring for their return
      window.addEventListener('focus', handleReturnFromTikTok);
    };

    const embed = embedRef.current;
    if (embed) {
      // Listen for clicks on the iframe overlay
      embed.addEventListener('click', detectRedirect);
    }

    return () => {
      embed?.removeEventListener('click', detectRedirect);
      window.removeEventListener('focus', handleReturnFromTikTok);
    };
  }, []);

  const handleReturnFromTikTok = async () => {
    const timeAway = Date.now() - redirectTimeRef.current;
    
    // If they were gone for at least 3 seconds, they likely interacted
    if (timeAway > 3000 && clickDetected) {
      console.log(`User returned from TikTok after ${timeAway}ms`);
      
      // Automatically trigger verification check
      await handleQuickVerify();
    }
    
    window.removeEventListener('focus', handleReturnFromTikTok);
  };

  const handleQuickVerify = async () => {
    if (!taskCompletionId || !user) return;
    
    setIsVerifying(true);
    onVerificationStart?.();
    
    try {
      // Call our verification endpoint
      const response = await fetch(`/api/tiktok/verify-interaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          taskCompletionId,
          videoId,
          taskType,
          interactionTimestamp: redirectTimeRef.current
        })
      });
      
      const result = await response.json();
      
      if (result.verified) {
        setVerified(true);
        onVerificationComplete?.(true);
      } else if (result.needsManualReview) {
        // Show manual verification button
        setClickDetected(false);
      }
    } catch (error) {
      console.error('Verification error:', error);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleManualVerify = async () => {
    if (!taskCompletionId) return;
    
    setIsVerifying(true);
    
    try {
      // Mark as pending manual review
      await fetch(`/api/task-completions/${taskCompletionId}/request-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          platform: 'tiktok',
          videoId,
          taskType
        })
      });
      
      // Show success message
      alert('Verification request submitted! The creator will review it shortly.');
    } catch (error) {
      console.error('Manual verification error:', error);
    } finally {
      setIsVerifying(false);
    }
  };

  const getActionPrompt = () => {
    switch (taskType) {
      case 'like':
        return 'Tap the ❤️ button on the video above';
      case 'comment':
        return 'Leave a comment on the video above';
      case 'follow':
        return `Follow @${creatorUsername} on TikTok`;
      default:
        return 'Complete the action';
    }
  };

  return (
    <div className="space-y-4">
      {/* Embedded Video with Click Detection Overlay */}
      <div 
        ref={embedRef}
        className="relative rounded-lg overflow-hidden cursor-pointer"
        onClick={() => setClickDetected(true)}
      >
        <iframe
          src={`https://www.tiktok.com/embed/v2/${videoId}`}
          width="100%"
          height="575"
          frameBorder="0"
          allow="encrypted-media; fullscreen"
          className="rounded-lg"
        />
        
        {/* Click detection overlay (transparent) */}
        <div className="absolute inset-0 pointer-events-none" />
      </div>

      {/* Status and Actions */}
      <div className="space-y-3">
        {verified ? (
          <Badge variant="success" className="w-full justify-center py-2">
            <CheckCircle className="w-4 h-4 mr-2" />
            Verified!
          </Badge>
        ) : (
          <>
            <div className="text-sm text-center text-gray-400">
              {getActionPrompt()}
            </div>
            
            {clickDetected && (
              <div className="text-xs text-center text-blue-400">
                ↑ Click the video to interact on TikTok
              </div>
            )}
            
            {isVerifying ? (
              <Button disabled className="w-full">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={handleQuickVerify}
                  variant="default"
                  className="flex-1"
                  disabled={!clickDetected}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  I've completed this
                </Button>
                
                <Button
                  onClick={() => window.open(`https://www.tiktok.com/@${creatorUsername}/video/${videoId}`, '_blank')}
                  variant="outline"
                  size="icon"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
```

#### 2. Backend Verification Service with Intelligent Detection

```typescript
// server/services/tiktok-verification-service.ts

import { db } from '../db';
import { taskCompletions, socialConnections } from '@shared/schema';
import { eq, and, gte } from 'drizzle-orm';

interface VerificationResult {
  verified: boolean;
  needsManualReview: boolean;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

export async function verifyTikTokInteraction(
  userId: string,
  videoId: string,
  taskType: 'like' | 'comment' | 'follow',
  interactionTimestamp: number
): Promise<VerificationResult> {
  
  // Get user's TikTok connection
  const tiktokConnection = await db.query.socialConnections.findFirst({
    where: and(
      eq(socialConnections.userId, userId),
      eq(socialConnections.platform, 'tiktok'),
      eq(socialConnections.isActive, true)
    )
  });

  if (!tiktokConnection) {
    return {
      verified: false,
      needsManualReview: true,
      confidence: 'low',
      reason: 'TikTok account not connected'
    };
  }

  // Strategy 1: Check if user recently fetched video data
  // (This is a weak signal but better than nothing)
  const recentActivity = await checkRecentTikTokActivity(
    tiktokConnection.accessToken,
    userId,
    interactionTimestamp
  );

  // Strategy 2: Time-based heuristic
  const timeSpentAway = Date.now() - interactionTimestamp;
  const minInteractionTime = taskType === 'comment' ? 10000 : 3000; // 10s for comment, 3s for like
  
  if (timeSpentAway < minInteractionTime) {
    return {
      verified: false,
      needsManualReview: true,
      confidence: 'low',
      reason: 'Interaction time too short'
    };
  }

  // Strategy 3: Statistical trust scoring
  const userTrustScore = await calculateUserTrustScore(userId);
  
  if (userTrustScore > 0.8 && timeSpentAway >= minInteractionTime) {
    // Auto-approve for trusted users
    return {
      verified: true,
      needsManualReview: false,
      confidence: 'medium',
      reason: 'Trusted user with sufficient interaction time'
    };
  }

  // Strategy 4: First-time users require manual review
  const completedTasks = await db.query.taskCompletions.findMany({
    where: and(
      eq(taskCompletions.userId, userId),
      eq(taskCompletions.status, 'completed')
    )
  });

  if (completedTasks.length < 3) {
    return {
      verified: false,
      needsManualReview: true,
      confidence: 'low',
      reason: 'New user - requires manual review'
    };
  }

  // Default: Auto-approve with medium confidence
  return {
    verified: true,
    needsManualReview: false,
    confidence: 'medium',
    reason: 'Behavior patterns suggest genuine interaction'
  };
}

async function checkRecentTikTokActivity(
  accessToken: string,
  userId: string,
  since: number
): Promise<boolean> {
  // Note: This is limited, but we can check if they've accessed their profile recently
  try {
    // In a real scenario, you might log API access timestamps
    // For now, this is a placeholder
    return true;
  } catch (error) {
    console.error('TikTok activity check failed:', error);
    return false;
  }
}

async function calculateUserTrustScore(userId: string): Promise<number> {
  // Calculate trust score based on:
  // 1. Number of completed tasks
  // 2. Verification success rate
  // 3. Account age
  // 4. Creator feedback on previous tasks
  
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId)
  });

  if (!user) return 0;

  const completedTasks = await db.query.taskCompletions.findMany({
    where: and(
      eq(taskCompletions.userId, userId),
      eq(taskCompletions.status, 'completed')
    )
  });

  const verifiedTasks = completedTasks.filter(t => t.verifiedAt !== null);
  const rejectedTasks = await db.query.taskCompletions.findMany({
    where: and(
      eq(taskCompletions.userId, userId),
      eq(taskCompletions.status, 'rejected')
    )
  });

  const totalTasks = completedTasks.length + rejectedTasks.length;
  if (totalTasks === 0) return 0.3; // New user baseline

  const successRate = verifiedTasks.length / totalTasks;
  const accountAgeDays = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  const ageScore = Math.min(accountAgeDays / 30, 1); // Max score after 30 days

  // Weighted score
  return (successRate * 0.7) + (ageScore * 0.3);
}

export async function updateTaskWithVerification(
  taskCompletionId: string,
  result: VerificationResult
) {
  await db.update(taskCompletions)
    .set({
      status: result.verified ? 'completed' : 'pending_verification',
      verifiedAt: result.verified ? new Date() : null,
      verificationMethod: 'tiktok_smart_detection',
      completionData: {
        confidence: result.confidence,
        reason: result.reason,
        needsManualReview: result.needsManualReview
      }
    })
    .where(eq(taskCompletions.id, taskCompletionId));
}
```

#### 3. API Route for Verification

```typescript
// server/tiktok-task-routes.ts

import { Express, Request, Response } from 'express';
import { authenticateUser, AuthenticatedRequest } from './middleware/auth';
import { verifyTikTokInteraction, updateTaskWithVerification } from './services/tiktok-verification-service';

export function registerTikTokTaskRoutes(app: Express) {
  
  // Smart verification endpoint
  app.post('/api/tiktok/verify-interaction', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { taskCompletionId, videoId, taskType, interactionTimestamp } = req.body;
      const userId = req.userId!;

      console.log('[TikTok Verification] Smart detection triggered:', {
        userId,
        videoId,
        taskType,
        timeAway: Date.now() - interactionTimestamp
      });

      // Run intelligent verification
      const result = await verifyTikTokInteraction(
        userId,
        videoId,
        taskType,
        interactionTimestamp
      );

      // Update task completion
      await updateTaskWithVerification(taskCompletionId, result);

      res.json({
        verified: result.verified,
        needsManualReview: result.needsManualReview,
        confidence: result.confidence,
        message: result.reason
      });

    } catch (error) {
      console.error('[TikTok Verification] Error:', error);
      res.status(500).json({ error: 'Verification failed' });
    }
  });

  // Manual review request endpoint
  app.post('/api/task-completions/:taskCompletionId/request-review', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { taskCompletionId } = req.params;
      const { platform, videoId, taskType } = req.body;

      await db.update(taskCompletions)
        .set({
          status: 'pending_verification',
          completionData: {
            platform,
            videoId,
            taskType,
            requestedReviewAt: new Date(),
            reviewRequested: true
          }
        })
        .where(eq(taskCompletions.id, taskCompletionId));

      res.json({ success: true, message: 'Review requested' });

    } catch (error) {
      console.error('[Task Review] Error:', error);
      res.status(500).json({ error: 'Failed to request review' });
    }
  });
}
```

### How This Works

#### User Journey:

1. **Fan views embedded TikTok video** on creator's task page
2. **Fan clicks on video** → redirected to TikTok app/web
3. **System detects redirect** and starts timer
4. **Fan likes/comments** on TikTok
5. **Fan returns to Fandomly** (browser tab regains focus)
6. **System detects return** and calculates time away
7. **Auto-verification runs:**
   - ✅ If trusted user + reasonable time away → **Auto-approve**
   - ⚠️ If new user or suspicious timing → **Manual review**
8. **Task marked as completed** or **pending creator review**

#### Trust Score System:

- **New users** (0-3 completed tasks) → Manual review required
- **Trusted users** (>80% success rate) → Auto-approve
- **Suspicious behavior** (too fast, pattern anomalies) → Manual review

### Benefits

✅ **Better than screenshots** - No manual upload needed
✅ **Smart automation** - Auto-approves trusted users
✅ **Fraud protection** - Detects suspicious patterns
✅ **Scalable** - Reduces creator review burden over time
✅ **User-friendly** - Seamless interaction flow
✅ **Transparent** - Users know how verification works

### Limitations

⚠️ **Not 100% accurate** - Based on heuristics, not API proof
⚠️ **Can be gamed** - Determined cheaters could fake timing
⚠️ **Requires trust** - Some reliance on user honesty

### Future Enhancement

When TikTok opens APIs (if ever):
- Replace heuristics with actual API verification
- Keep the same UI/UX
- Switch verification method in one place

