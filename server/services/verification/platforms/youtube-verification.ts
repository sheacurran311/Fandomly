/**
 * YouTube Verification Service
 * 
 * T1 (API) Verification for YouTube tasks:
 * - Subscriptions: GET /youtube/v3/subscriptions?part=snippet&mine=true
 * 
 * T2 (Code) Verification:
 * - Comments with code: GET /youtube/v3/commentThreads?part=snippet&videoId={id}
 * 
 * Note: YouTube likes/shares are T3 (manual) because the API doesn't expose per-user like data
 */

import { db } from '@db';
import { socialConnections, verificationCodes } from '@shared/schema';
import { and, eq } from 'drizzle-orm';

// YouTube API base URL
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

export interface YouTubeVerificationResult {
  verified: boolean;
  requiresManualReview: boolean;
  confidence: 'high' | 'medium' | 'low';
  reason?: string;
  metadata?: Record<string, any>;
}

export interface YouTubeVerificationParams {
  fanUserId: string;
  taskType: string;
  taskSettings: {
    channelId?: string;       // Channel to subscribe to
    videoId?: string;         // Video for comment verification
    creatorUserId?: string;   // Creator's user ID
    taskId?: string;          // Task ID for code verification
  };
}

class YouTubeVerificationService {
  /**
   * Main verification entry point
   */
  async verifyTask(params: YouTubeVerificationParams): Promise<YouTubeVerificationResult> {
    const { fanUserId, taskType, taskSettings } = params;

    try {
      // Get fan's YouTube connection
      const fanConnection = await this.getFanYouTubeConnection(fanUserId);
      
      if (!fanConnection || !fanConnection.accessToken) {
        return {
          verified: false,
          requiresManualReview: false,
          confidence: 'low',
          reason: 'Fan has not connected their YouTube account',
          metadata: { requiresYouTubeConnection: true },
        };
      }

      // Check if token needs refresh
      if (this.isTokenExpired(fanConnection.tokenExpiresAt)) {
        const refreshed = await this.refreshAccessToken(fanConnection);
        if (!refreshed) {
          return {
            verified: false,
            requiresManualReview: false,
            confidence: 'low',
            reason: 'Failed to refresh YouTube access token. Please reconnect your YouTube account.',
            metadata: { tokenRefreshFailed: true },
          };
        }
      }

      // Route to specific verification method
      switch (taskType) {
        case 'youtube_subscribe':
          return await this.verifySubscription(fanConnection.accessToken, taskSettings.channelId);
          
        case 'youtube_comment':
        case 'youtube_comment_code':
          // T2 verification - check for code in comments
          if (taskSettings.taskId && taskSettings.videoId) {
            return await this.verifyCommentCode(
              fanUserId,
              taskSettings.taskId,
              taskSettings.videoId,
              taskSettings.creatorUserId
            );
          }
          return {
            verified: false,
            requiresManualReview: true,
            confidence: 'medium',
            reason: 'YouTube comment verification requires video ID',
            metadata: { verificationTier: 'T2' },
          };
          
        case 'youtube_like':
        case 'youtube_share':
          // T3 - YouTube API doesn't expose per-user like/share data
          return {
            verified: false,
            requiresManualReview: true,
            confidence: 'low',
            reason: 'YouTube likes/shares require manual verification',
            metadata: { 
              verificationTier: 'T3',
              verificationMethod: 'manual',
              note: 'YouTube API does not expose per-user like data',
            },
          };
          
        case 'youtube_watch':
          // Watch time can't be verified per-user via API
          return {
            verified: false,
            requiresManualReview: true,
            confidence: 'low',
            reason: 'YouTube watch verification not available via API',
            metadata: { verificationTier: 'T3' },
          };
          
        default:
          return {
            verified: false,
            requiresManualReview: true,
            confidence: 'low',
            reason: `Unknown YouTube task type: ${taskType}`,
          };
      }
    } catch (error: any) {
      console.error('[YouTubeVerification] Error:', error);
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'low',
        reason: error.message || 'YouTube verification failed',
        metadata: { error: error.message },
      };
    }
  }

  /**
   * Verify channel subscription (T1)
   * API: GET /youtube/v3/subscriptions?part=snippet&mine=true
   */
  async verifySubscription(accessToken: string, channelId?: string): Promise<YouTubeVerificationResult> {
    if (!channelId) {
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'low',
        reason: 'No channel ID provided',
      };
    }

    try {
      // Get user's subscriptions (paginated)
      let isSubscribed = false;
      let pageToken: string | undefined;
      let attempts = 0;
      const maxAttempts = 10; // Limit pagination to prevent infinite loops

      while (attempts < maxAttempts) {
        const url = new URL(`${YOUTUBE_API_BASE}/subscriptions`);
        url.searchParams.set('part', 'snippet');
        url.searchParams.set('mine', 'true');
        url.searchParams.set('maxResults', '50');
        if (pageToken) {
          url.searchParams.set('pageToken', pageToken);
        }

        const response = await fetch(url.toString(), {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          const error = await response.text();
          console.error('[YouTubeVerification] Subscription check failed:', error);
          return {
            verified: false,
            requiresManualReview: false,
            confidence: 'low',
            reason: 'Failed to check subscription status',
            metadata: { apiError: error },
          };
        }

        const data = await response.json();
        
        // Check if the channel is in the subscriptions
        for (const item of data.items || []) {
          if (item.snippet?.resourceId?.channelId === channelId) {
            isSubscribed = true;
            break;
          }
        }

        if (isSubscribed) break;
        
        // Check for more pages
        pageToken = data.nextPageToken;
        if (!pageToken) break;
        
        attempts++;
      }

      return {
        verified: isSubscribed,
        requiresManualReview: false,
        confidence: 'high',
        reason: isSubscribed ? 'Subscription verified via API' : 'Not subscribed to the channel',
        metadata: {
          verificationTier: 'T1',
          verificationMethod: 'api',
          channelId,
          isSubscribed,
        },
      };
    } catch (error: any) {
      console.error('[YouTubeVerification] Subscription check error:', error);
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'low',
        reason: 'Error checking subscription',
        metadata: { error: error.message },
      };
    }
  }

  /**
   * Verify comment with code (T2)
   * API: GET /youtube/v3/commentThreads?part=snippet&videoId={videoId}
   */
  async verifyCommentCode(
    fanUserId: string,
    taskId: string,
    videoId: string,
    creatorUserId?: string
  ): Promise<YouTubeVerificationResult> {
    try {
      // Get the fan's verification code for this task
      const code = await db.query.verificationCodes.findFirst({
        where: and(
          eq(verificationCodes.taskId, taskId),
          eq(verificationCodes.fanId, fanUserId),
          eq(verificationCodes.isUsed, false),
        ),
      });

      if (!code) {
        return {
          verified: false,
          requiresManualReview: false,
          confidence: 'low',
          reason: 'No verification code found for this task',
          metadata: { verificationTier: 'T2' },
        };
      }

      // Get creator's YouTube connection to access comments
      let accessToken: string | null = null;
      
      if (creatorUserId) {
        const creatorConnection = await db.query.socialConnections.findFirst({
          where: and(
            eq(socialConnections.userId, creatorUserId),
            eq(socialConnections.platform, 'youtube'),
            eq(socialConnections.isActive, true),
          ),
        });
        accessToken = creatorConnection?.accessToken || null;
      }

      // Use API key if no creator token available
      const apiKey = process.env.YOUTUBE_API_KEY;
      
      if (!accessToken && !apiKey) {
        return {
          verified: false,
          requiresManualReview: true,
          confidence: 'medium',
          reason: 'Cannot verify comment - no API access available',
          metadata: { verificationTier: 'T2' },
        };
      }

      // Fetch comments and search for the code
      const comments = await this.fetchVideoComments(videoId, accessToken ?? null, apiKey ?? null);
      
      // Search for the verification code in comments
      const matchingComment = comments.find(comment => 
        comment.text.toLowerCase().includes(code.code.toLowerCase())
      );

      if (matchingComment) {
        // Mark code as used
        await db
          .update(verificationCodes)
          .set({
            isUsed: true,
            usedAt: new Date(),
            verificationData: {
              platform: 'youtube',
              contentId: videoId,
              authorId: matchingComment.authorChannelId,
              authorUsername: matchingComment.authorDisplayName,
              commentText: matchingComment.text,
              matchedAt: new Date().toISOString(),
              confidence: 1,
            },
          })
          .where(eq(verificationCodes.id, code.id));

        return {
          verified: true,
          requiresManualReview: false,
          confidence: 'high',
          reason: 'Comment with verification code found',
          metadata: {
            verificationTier: 'T2',
            verificationMethod: 'code_comment',
            code: code.code,
            authorDisplayName: matchingComment.authorDisplayName,
            authorChannelId: matchingComment.authorChannelId,
          },
        };
      }

      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'medium',
        reason: 'Verification code not found in comments yet',
        metadata: {
          verificationTier: 'T2',
          verificationMethod: 'code_comment',
          code: code.code,
          commentsChecked: comments.length,
        },
      };
    } catch (error: any) {
      console.error('[YouTubeVerification] Comment code check error:', error);
      return {
        verified: false,
        requiresManualReview: true,
        confidence: 'low',
        reason: 'Error checking comments',
        metadata: { error: error.message },
      };
    }
  }

  /**
   * Fetch video comments
   */
  private async fetchVideoComments(
    videoId: string,
    accessToken: string | null,
    apiKey: string | null
  ): Promise<Array<{
    text: string;
    authorDisplayName: string;
    authorChannelId: string;
  }>> {
    const url = new URL(`${YOUTUBE_API_BASE}/commentThreads`);
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('videoId', videoId);
    url.searchParams.set('maxResults', '100');
    url.searchParams.set('order', 'time'); // Most recent first

    const headers: HeadersInit = {};
    
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    } else if (apiKey) {
      url.searchParams.set('key', apiKey);
    }

    const response = await fetch(url.toString(), { headers });

    if (!response.ok) {
      const error = await response.text();
      console.error('[YouTubeVerification] Failed to fetch comments:', error);
      return [];
    }

    const data = await response.json();
    
    return (data.items || []).map((item: any) => ({
      text: item.snippet?.topLevelComment?.snippet?.textDisplay || '',
      authorDisplayName: item.snippet?.topLevelComment?.snippet?.authorDisplayName || '',
      authorChannelId: item.snippet?.topLevelComment?.snippet?.authorChannelId?.value || '',
    }));
  }

  /**
   * Get fan's YouTube connection
   */
  private async getFanYouTubeConnection(userId: string) {
    return db.query.socialConnections.findFirst({
      where: and(
        eq(socialConnections.userId, userId),
        eq(socialConnections.platform, 'youtube'),
        eq(socialConnections.isActive, true),
      ),
    });
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(expiresAt: Date | null): boolean {
    if (!expiresAt) return true;
    // Add 5 minute buffer
    return new Date(expiresAt).getTime() < Date.now() + 5 * 60 * 1000;
  }

  /**
   * Refresh access token
   */
  private async refreshAccessToken(connection: any): Promise<boolean> {
    if (!connection.refreshToken) {
      return false;
    }

    try {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        console.error('[YouTubeVerification] Missing Google OAuth credentials');
        return false;
      }

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: connection.refreshToken,
        }),
      });

      if (!response.ok) {
        console.error('[YouTubeVerification] Token refresh failed:', await response.text());
        return false;
      }

      const data = await response.json();
      
      // Update connection with new tokens
      await db
        .update(socialConnections)
        .set({
          accessToken: data.access_token,
          tokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
          updatedAt: new Date(),
        })
        .where(eq(socialConnections.id, connection.id));

      return true;
    } catch (error) {
      console.error('[YouTubeVerification] Token refresh error:', error);
      return false;
    }
  }
}

// Export singleton
export const youtubeVerification = new YouTubeVerificationService();
