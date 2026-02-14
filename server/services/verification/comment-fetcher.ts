import { db } from '../../db';
import { socialConnections } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { codeService } from './code-service';

/**
 * Comment Fetcher Service
 * 
 * Fetches comments from various social media platforms and searches for
 * verification codes. Used for code-in-comment task verification.
 * 
 * Supported Platforms:
 * - Instagram (via Creator Graph API)
 * - YouTube (via Data API v3)
 * - Facebook (via Graph API)
 * - TikTok (via Research/Business API)
 * - Twitter/X (via Basic tier API)
 */

export interface Comment {
  id: string;
  text: string;
  authorId: string;
  authorUsername: string;
  createdAt: Date;
  platform: string;
  metadata?: Record<string, any>;
}

export interface CommentFetchResult {
  success: boolean;
  comments: Comment[];
  error?: string;
  hasMore?: boolean;
  nextCursor?: string;
}

export interface CodeVerificationResult {
  verified: boolean;
  code?: string;
  comment?: Comment;
  confidence: 'high' | 'medium' | 'low';
  reason?: string;
}

/**
 * Base interface for platform-specific comment fetchers
 */
export interface PlatformCommentFetcher {
  platform: string;
  fetchComments(contentId: string, accessToken: string, options?: {
    limit?: number;
    cursor?: string;
  }): Promise<CommentFetchResult>;
}

/**
 * Instagram Comment Fetcher
 * Uses Instagram Graph API (Creator/Business account)
 * Endpoint: GET /{ig-media-id}/comments?fields=id,username,text,timestamp
 */
class InstagramCommentFetcher implements PlatformCommentFetcher {
  platform = 'instagram';
  
  async fetchComments(
    mediaId: string, 
    accessToken: string,
    options?: { limit?: number; cursor?: string }
  ): Promise<CommentFetchResult> {
    const limit = options?.limit || 100;
    
    try {
      let url = `https://graph.facebook.com/v18.0/${mediaId}/comments?fields=id,username,text,timestamp&limit=${limit}&access_token=${accessToken}`;
      
      if (options?.cursor) {
        url += `&after=${options.cursor}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const error = await response.json();
        console.error('[Instagram CommentFetcher] API error:', error);
        return {
          success: false,
          comments: [],
          error: error.error?.message || 'Failed to fetch Instagram comments',
        };
      }
      
      const data = await response.json();
      
      const comments: Comment[] = (data.data || []).map((c: any) => ({
        id: c.id,
        text: c.text || '',
        authorId: c.username, // Instagram API doesn't return user ID in comments
        authorUsername: c.username,
        createdAt: new Date(c.timestamp),
        platform: 'instagram',
        metadata: c,
      }));
      
      return {
        success: true,
        comments,
        hasMore: !!data.paging?.next,
        nextCursor: data.paging?.cursors?.after,
      };
    } catch (error) {
      console.error('[Instagram CommentFetcher] Error:', error);
      return {
        success: false,
        comments: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * YouTube Comment Fetcher
 * Uses YouTube Data API v3
 * Endpoint: GET /youtube/v3/commentThreads?part=snippet&videoId={videoId}
 */
class YouTubeCommentFetcher implements PlatformCommentFetcher {
  platform = 'youtube';
  
  async fetchComments(
    videoId: string,
    accessToken: string,
    options?: { limit?: number; cursor?: string }
  ): Promise<CommentFetchResult> {
    const limit = options?.limit || 100;
    
    try {
      let url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=${limit}`;
      
      if (options?.cursor) {
        url += `&pageToken=${options.cursor}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error('[YouTube CommentFetcher] API error:', error);
        return {
          success: false,
          comments: [],
          error: error.error?.message || 'Failed to fetch YouTube comments',
        };
      }
      
      const data = await response.json();
      
      const comments: Comment[] = (data.items || []).map((item: any) => {
        const snippet = item.snippet.topLevelComment.snippet;
        return {
          id: item.id,
          text: snippet.textDisplay || snippet.textOriginal || '',
          authorId: snippet.authorChannelId?.value || '',
          authorUsername: snippet.authorDisplayName,
          createdAt: new Date(snippet.publishedAt),
          platform: 'youtube',
          metadata: {
            channelId: snippet.authorChannelId?.value,
            likeCount: snippet.likeCount,
          },
        };
      });
      
      return {
        success: true,
        comments,
        hasMore: !!data.nextPageToken,
        nextCursor: data.nextPageToken,
      };
    } catch (error) {
      console.error('[YouTube CommentFetcher] Error:', error);
      return {
        success: false,
        comments: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Facebook Comment Fetcher
 * Uses Facebook Graph API
 * Endpoint: GET /{post-id}/comments?fields=from,id,message,created_time
 */
class FacebookCommentFetcher implements PlatformCommentFetcher {
  platform = 'facebook';
  
  async fetchComments(
    postId: string,
    accessToken: string,
    options?: { limit?: number; cursor?: string }
  ): Promise<CommentFetchResult> {
    const limit = options?.limit || 100;
    
    try {
      let url = `https://graph.facebook.com/v18.0/${postId}/comments?fields=from,id,message,created_time&limit=${limit}&access_token=${accessToken}`;
      
      if (options?.cursor) {
        url += `&after=${options.cursor}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const error = await response.json();
        console.error('[Facebook CommentFetcher] API error:', error);
        return {
          success: false,
          comments: [],
          error: error.error?.message || 'Failed to fetch Facebook comments',
        };
      }
      
      const data = await response.json();
      
      const comments: Comment[] = (data.data || []).map((c: any) => ({
        id: c.id,
        text: c.message || '',
        authorId: c.from?.id || '',
        authorUsername: c.from?.name || '',
        createdAt: new Date(c.created_time),
        platform: 'facebook',
        metadata: c,
      }));
      
      return {
        success: true,
        comments,
        hasMore: !!data.paging?.next,
        nextCursor: data.paging?.cursors?.after,
      };
    } catch (error) {
      console.error('[Facebook CommentFetcher] Error:', error);
      return {
        success: false,
        comments: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * TikTok Comment Fetcher
 * Uses TikTok Research/Business API
 * Note: Access may be limited based on API tier
 */
class TikTokCommentFetcher implements PlatformCommentFetcher {
  platform = 'tiktok';
  
  async fetchComments(
    videoId: string,
    accessToken: string,
    options?: { limit?: number; cursor?: string }
  ): Promise<CommentFetchResult> {
    const limit = options?.limit || 100;
    
    try {
      // TikTok Research API endpoint for comments
      // Note: This requires Research API access
      const url = 'https://open.tiktokapis.com/v2/research/video/comment/list/';
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_id: videoId,
          max_count: limit,
          cursor: options?.cursor ? parseInt(options.cursor) : 0,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error('[TikTok CommentFetcher] API error:', error);
        return {
          success: false,
          comments: [],
          error: error.error?.message || 'Failed to fetch TikTok comments',
        };
      }
      
      const data = await response.json();
      
      const comments: Comment[] = (data.data?.comments || []).map((c: any) => ({
        id: c.id,
        text: c.text || '',
        authorId: c.user_id || '',
        authorUsername: c.unique_id || c.nickname || '',
        createdAt: new Date(c.create_time * 1000),
        platform: 'tiktok',
        metadata: c,
      }));
      
      return {
        success: true,
        comments,
        hasMore: data.data?.has_more,
        nextCursor: data.data?.cursor?.toString(),
      };
    } catch (error) {
      console.error('[TikTok CommentFetcher] Error:', error);
      return {
        success: false,
        comments: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Twitter/X Comment (Reply) Fetcher
 * Uses Twitter API v2 (Basic tier)
 * Endpoint: Search for replies to a tweet
 */
class TwitterCommentFetcher implements PlatformCommentFetcher {
  platform = 'twitter';
  
  async fetchComments(
    tweetId: string,
    bearerToken: string,
    options?: { limit?: number; cursor?: string }
  ): Promise<CommentFetchResult> {
    const limit = Math.min(options?.limit || 100, 100);
    
    try {
      // Use conversation_id to find replies
      let url = `https://api.twitter.com/2/tweets/search/recent?query=conversation_id:${tweetId}&tweet.fields=author_id,created_at,text&expansions=author_id&user.fields=username&max_results=${limit}`;
      
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
        console.error('[Twitter CommentFetcher] API error:', error);
        return {
          success: false,
          comments: [],
          error: error.detail || error.title || 'Failed to fetch Twitter replies',
        };
      }
      
      const data = await response.json();
      
      // Build user lookup map
      const userMap = new Map<string, string>();
      for (const user of (data.includes?.users || [])) {
        userMap.set(user.id, user.username);
      }
      
      const comments: Comment[] = (data.data || []).map((tweet: any) => ({
        id: tweet.id,
        text: tweet.text || '',
        authorId: tweet.author_id,
        authorUsername: userMap.get(tweet.author_id) || tweet.author_id,
        createdAt: new Date(tweet.created_at),
        platform: 'twitter',
        metadata: tweet,
      }));
      
      return {
        success: true,
        comments,
        hasMore: !!data.meta?.next_token,
        nextCursor: data.meta?.next_token,
      };
    } catch (error) {
      console.error('[Twitter CommentFetcher] Error:', error);
      return {
        success: false,
        comments: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Main Comment Fetcher Service
 * Routes to platform-specific fetchers
 */
export class CommentFetcherService {
  private fetchers: Map<string, PlatformCommentFetcher>;
  
  constructor() {
    this.fetchers = new Map([
      ['instagram', new InstagramCommentFetcher()],
      ['youtube', new YouTubeCommentFetcher()],
      ['facebook', new FacebookCommentFetcher()],
      ['tiktok', new TikTokCommentFetcher()],
      ['twitter', new TwitterCommentFetcher()],
      ['x', new TwitterCommentFetcher()], // Alias
    ]);
  }
  
  /**
   * Fetch comments from a platform
   */
  async fetchComments(
    platform: string,
    contentId: string,
    accessToken: string,
    options?: { limit?: number; cursor?: string }
  ): Promise<CommentFetchResult> {
    const fetcher = this.fetchers.get(platform.toLowerCase());
    
    if (!fetcher) {
      return {
        success: false,
        comments: [],
        error: `Unsupported platform: ${platform}`,
      };
    }
    
    return fetcher.fetchComments(contentId, accessToken, options);
  }
  
  /**
   * Verify a task by searching for a verification code in comments
   */
  async verifyCodeInComments(params: {
    platform: string;
    contentId: string;
    taskId: string;
    fanId: string;
    creatorAccessToken: string;
  }): Promise<CodeVerificationResult> {
    const { platform, contentId, taskId, fanId, creatorAccessToken } = params;
    
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
    
    // Fetch comments
    const result = await this.fetchComments(platform, contentId, creatorAccessToken, { limit: 100 });
    
    if (!result.success) {
      return {
        verified: false,
        confidence: 'low',
        reason: result.error || 'Failed to fetch comments',
      };
    }
    
    // Get fan's social connection to match author
    const fanConnection = await db.query.socialConnections.findFirst({
      where: and(
        eq(socialConnections.userId, fanId),
        eq(socialConnections.platform, platform),
        eq(socialConnections.isActive, true),
      ),
    });
    
    // Search for the code in comments
    for (const comment of result.comments) {
      const foundCode = codeService.findCodeInText(comment.text);
      
      if (foundCode === codeRecord.code) {
        // Code found! Now verify the author matches the fan
        let authorMatch = false;
        let confidence: 'high' | 'medium' | 'low' = 'medium';
        
        if (fanConnection) {
          // Check if comment author matches fan's connected account
          if (
            comment.authorId === fanConnection.platformUserId ||
            comment.authorUsername.toLowerCase() === fanConnection.platformUsername?.toLowerCase()
          ) {
            authorMatch = true;
            confidence = 'high';
          }
        }
        
        if (!authorMatch) {
          // Code found but author doesn't match - could be someone else using the code
          // Still mark as medium confidence since the code is unique
          confidence = 'medium';
        }
        
        // Mark code as used
        await codeService.markCodeUsed(codeRecord.id, {
          platform,
          contentId,
          authorId: comment.authorId,
          authorUsername: comment.authorUsername,
          commentText: comment.text,
          confidence: confidence === 'high' ? 1.0 : 0.7,
        });
        
        return {
          verified: true,
          code: codeRecord.code,
          comment,
          confidence,
          reason: authorMatch 
            ? 'Code found and author verified' 
            : 'Code found (author could not be verified)',
        };
      }
    }
    
    // Code not found
    return {
      verified: false,
      code: codeRecord.code,
      confidence: 'low',
      reason: 'Verification code not found in comments. Make sure to include your code in your comment.',
    };
  }
  
  /**
   * Search for any verification codes in comments (for debugging/admin)
   */
  async findCodesInComments(
    platform: string,
    contentId: string,
    accessToken: string
  ): Promise<{ code: string; comment: Comment }[]> {
    const result = await this.fetchComments(platform, contentId, accessToken, { limit: 100 });
    
    if (!result.success) {
      return [];
    }
    
    const found: { code: string; comment: Comment }[] = [];
    
    for (const comment of result.comments) {
      const code = codeService.findCodeInText(comment.text);
      if (code) {
        found.push({ code, comment });
      }
    }
    
    return found;
  }
}

// Export singleton instance
export const commentFetcher = new CommentFetcherService();
