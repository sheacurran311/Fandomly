import { db } from '../../db';
import { socialConnections } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { codeService } from './code-service';

/**
 * Repost Verifier Service
 * 
 * Verifies code-in-repost tasks (quote tweets, Instagram story shares, TikTok duets/stitches)
 * 
 * Primary use case: Twitter/X Quote Tweets with verification code
 */

export interface Repost {
  id: string;
  text: string;
  authorId: string;
  authorUsername: string;
  createdAt: Date;
  originalPostId: string;
  platform: string;
  metadata?: Record<string, any>;
}

export interface RepostFetchResult {
  success: boolean;
  reposts: Repost[];
  error?: string;
  hasMore?: boolean;
  nextCursor?: string;
}

export interface RepostVerificationResult {
  verified: boolean;
  code?: string;
  repost?: Repost;
  confidence: 'high' | 'medium' | 'low';
  reason?: string;
}

/**
 * Twitter Quote Tweet Fetcher
 * Uses Twitter API v2 (Basic tier)
 * Endpoint: GET /2/tweets/{id}/quote_tweets
 */
async function fetchTwitterQuoteTweets(
  tweetId: string,
  bearerToken: string,
  options?: { limit?: number; cursor?: string }
): Promise<RepostFetchResult> {
  const limit = Math.min(options?.limit || 100, 100);
  
  try {
    let url = `https://api.twitter.com/2/tweets/${tweetId}/quote_tweets?tweet.fields=author_id,created_at,text&expansions=author_id&user.fields=username&max_results=${limit}`;
    
    if (options?.cursor) {
      url += `&pagination_token=${options.cursor}`;
    }
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('[RepostVerifier] Twitter API error:', error);
      return {
        success: false,
        reposts: [],
        error: error.detail || error.title || 'Failed to fetch quote tweets',
      };
    }
    
    const data = await response.json();
    
    // Build user lookup map
    const userMap = new Map<string, string>();
    for (const user of (data.includes?.users || [])) {
      userMap.set(user.id, user.username);
    }
    
    const reposts: Repost[] = (data.data || []).map((tweet: any) => ({
      id: tweet.id,
      text: tweet.text || '',
      authorId: tweet.author_id,
      authorUsername: userMap.get(tweet.author_id) || tweet.author_id,
      createdAt: new Date(tweet.created_at),
      originalPostId: tweetId,
      platform: 'twitter',
      metadata: tweet,
    }));
    
    return {
      success: true,
      reposts,
      hasMore: !!data.meta?.next_token,
      nextCursor: data.meta?.next_token,
    };
  } catch (error) {
    console.error('[RepostVerifier] Error:', error);
    return {
      success: false,
      reposts: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Repost Verifier Service
 */
export class RepostVerifierService {
  /**
   * Fetch reposts/quotes from a platform
   */
  async fetchReposts(
    platform: string,
    contentId: string,
    accessToken: string,
    options?: { limit?: number; cursor?: string }
  ): Promise<RepostFetchResult> {
    switch (platform.toLowerCase()) {
      case 'twitter':
      case 'x':
        return fetchTwitterQuoteTweets(contentId, accessToken, options);
      
      case 'instagram':
        // Instagram doesn't provide an API for story shares
        return {
          success: false,
          reposts: [],
          error: 'Instagram story share verification requires manual review',
        };
      
      case 'tiktok':
        // TikTok duets/stitches would need Research API
        return {
          success: false,
          reposts: [],
          error: 'TikTok duet/stitch verification not yet implemented',
        };
      
      default:
        return {
          success: false,
          reposts: [],
          error: `Repost verification not supported for platform: ${platform}`,
        };
    }
  }
  
  /**
   * Verify a task by searching for a verification code in reposts
   */
  async verifyCodeInReposts(params: {
    platform: string;
    contentId: string;
    taskId: string;
    fanId: string;
    bearerToken: string;
  }): Promise<RepostVerificationResult> {
    const { platform, contentId, taskId, fanId, bearerToken } = params;
    
    // Get the fan's verification code
    const codeRecord = await codeService.getCodeForFan(taskId, fanId);
    
    if (!codeRecord) {
      return {
        verified: false,
        confidence: 'low',
        reason: 'No verification code found for this task',
      };
    }
    
    if (codeRecord.isUsed) {
      return {
        verified: true,
        code: codeRecord.code,
        confidence: 'high',
        reason: 'Code was already verified',
      };
    }
    
    // Fetch reposts
    const result = await this.fetchReposts(platform, contentId, bearerToken, { limit: 100 });
    
    if (!result.success) {
      return {
        verified: false,
        confidence: 'low',
        reason: result.error || 'Failed to fetch reposts',
      };
    }
    
    // Get fan's social connection to match author
    const fanConnection = await db.query.socialConnections.findFirst({
      where: and(
        eq(socialConnections.userId, fanId),
        eq(socialConnections.platform, platform === 'x' ? 'twitter' : platform),
        eq(socialConnections.isActive, true),
      ),
    });
    
    // Search for the code in reposts
    for (const repost of result.reposts) {
      const foundCode = codeService.findCodeInText(repost.text);
      
      if (foundCode === codeRecord.code) {
        // Code found! Now verify the author matches the fan
        let authorMatch = false;
        let confidence: 'high' | 'medium' | 'low' = 'medium';
        
        if (fanConnection) {
          // Check if repost author matches fan's connected account
          if (
            repost.authorId === fanConnection.platformUserId ||
            repost.authorUsername.toLowerCase() === fanConnection.platformUsername?.toLowerCase()
          ) {
            authorMatch = true;
            confidence = 'high';
          }
        }
        
        if (!authorMatch) {
          confidence = 'medium';
        }
        
        // Mark code as used
        await codeService.markCodeUsed(codeRecord.id, {
          platform,
          contentId,
          authorId: repost.authorId,
          authorUsername: repost.authorUsername,
          commentText: repost.text,
          confidence: confidence === 'high' ? 1.0 : 0.7,
        });
        
        return {
          verified: true,
          code: codeRecord.code,
          repost,
          confidence,
          reason: authorMatch 
            ? 'Code found in quote tweet and author verified' 
            : 'Code found in quote tweet (author could not be verified)',
        };
      }
    }
    
    // Code not found
    return {
      verified: false,
      code: codeRecord.code,
      confidence: 'low',
      reason: 'Verification code not found in quote tweets. Make sure to include your code in your quote tweet.',
    };
  }
}

// Export singleton instance
export const repostVerifier = new RepostVerifierService();
