import { db } from '../db';
import { socialConnections, taskCompletions } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Social Media Task Verification Service
 * Handles verification of social media tasks across multiple platforms
 */

export interface VerificationResult {
  verified: boolean;
  message: string;
  proof?: any;
  error?: string;
}

/**
 * Get social connection for a user and platform
 */
async function getSocialConnection(userId: string, platform: string) {
  const [connection] = await db
    .select()
    .from(socialConnections)
    .where(
      and(
        eq(socialConnections.userId, userId),
        eq(socialConnections.platform, platform),
        eq(socialConnections.isActive, true)
      )
    );
  
  return connection;
}

/**
 * Check if access token is expired
 */
function isTokenExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return false;
  return new Date() >= expiresAt;
}

// ===== TWITTER/X VERIFICATION =====

/**
 * Verify if user follows a creator on Twitter/X
 * Uses: GET /2/users/{id}/following
 */
export async function verifyTwitterFollow(
  userId: string,
  creatorTwitterId: string
): Promise<VerificationResult> {
  try {
    const connection = await getSocialConnection(userId, 'twitter');
    
    if (!connection) {
      return {
        verified: false,
        message: 'Twitter account not connected',
        error: 'NO_CONNECTION'
      };
    }
    
    if (!connection.accessToken) {
      return {
        verified: false,
        message: 'Twitter access token not found',
        error: 'NO_TOKEN'
      };
    }
    
    // Check if token is expired
    if (isTokenExpired(connection.tokenExpiresAt)) {
      return {
        verified: false,
        message: 'Twitter token expired. Please reconnect.',
        error: 'TOKEN_EXPIRED'
      };
    }
    
    // Get user's following list
    const response = await fetch(
      `https://api.twitter.com/2/users/${connection.platformUserId}/following`,
      {
        headers: {
          'Authorization': `Bearer ${connection.accessToken}`,
        }
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      console.error('[Twitter Verification] API error:', error);
      return {
        verified: false,
        message: 'Failed to verify Twitter follow',
        error: 'API_ERROR'
      };
    }
    
    const data = await response.json();
    
    // Check if creator is in the following list
    const isFollowing = data.data?.some((user: any) => user.id === creatorTwitterId);
    
    return {
      verified: isFollowing,
      message: isFollowing ? 'Twitter follow verified' : 'Not following creator',
      proof: {
        platform: 'twitter',
        action: 'follow',
        creatorId: creatorTwitterId,
        verifiedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('[Twitter Verification] Error:', error);
    return {
      verified: false,
      message: 'Error verifying Twitter follow',
      error: String(error)
    };
  }
}

/**
 * Verify if user liked a specific tweet
 * Uses: GET /2/users/{id}/liked_tweets
 */
export async function verifyTwitterLike(
  userId: string,
  tweetId: string
): Promise<VerificationResult> {
  try {
    const connection = await getSocialConnection(userId, 'twitter');
    
    if (!connection || !connection.accessToken) {
      return {
        verified: false,
        message: 'Twitter account not connected',
        error: 'NO_CONNECTION'
      };
    }
    
    if (isTokenExpired(connection.tokenExpiresAt)) {
      return {
        verified: false,
        message: 'Twitter token expired. Please reconnect.',
        error: 'TOKEN_EXPIRED'
      };
    }
    
    // Get user's liked tweets
    const response = await fetch(
      `https://api.twitter.com/2/users/${connection.platformUserId}/liked_tweets`,
      {
        headers: {
          'Authorization': `Bearer ${connection.accessToken}`,
        }
      }
    );
    
    if (!response.ok) {
      return {
        verified: false,
        message: 'Failed to verify Twitter like',
        error: 'API_ERROR'
      };
    }
    
    const data = await response.json();
    const hasLiked = data.data?.some((tweet: any) => tweet.id === tweetId);
    
    return {
      verified: hasLiked,
      message: hasLiked ? 'Twitter like verified' : 'Tweet not liked',
      proof: {
        platform: 'twitter',
        action: 'like',
        tweetId,
        verifiedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('[Twitter Verification] Error:', error);
    return {
      verified: false,
      message: 'Error verifying Twitter like',
      error: String(error)
    };
  }
}

/**
 * Verify if user retweeted a specific tweet
 * Uses: GET /2/tweets/{id}/retweeted_by
 */
export async function verifyTwitterRetweet(
  userId: string,
  tweetId: string
): Promise<VerificationResult> {
  try {
    const connection = await getSocialConnection(userId, 'twitter');
    
    if (!connection || !connection.accessToken) {
      return {
        verified: false,
        message: 'Twitter account not connected',
        error: 'NO_CONNECTION'
      };
    }
    
    // Note: Free tier may not have access to retweeted_by endpoint
    // This is a placeholder - actual implementation depends on API tier
    
    return {
      verified: false,
      message: 'Twitter retweet verification requires paid API tier',
      error: 'NOT_AVAILABLE_FREE_TIER'
    };
  } catch (error) {
    console.error('[Twitter Verification] Error:', error);
    return {
      verified: false,
      message: 'Error verifying Twitter retweet',
      error: String(error)
    };
  }
}

// ===== YOUTUBE VERIFICATION =====

/**
 * Verify if user subscribed to a YouTube channel
 * Uses: GET /youtube/v3/subscriptions
 */
export async function verifyYouTubeSubscription(
  userId: string,
  channelId: string
): Promise<VerificationResult> {
  try {
    const connection = await getSocialConnection(userId, 'youtube');
    
    if (!connection || !connection.accessToken) {
      return {
        verified: false,
        message: 'YouTube account not connected',
        error: 'NO_CONNECTION'
      };
    }
    
    // Check user's subscriptions for the specific channel
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&forChannelId=${channelId}`,
      {
        headers: {
          'Authorization': `Bearer ${connection.accessToken}`,
        }
      }
    );
    
    if (!response.ok) {
      return {
        verified: false,
        message: 'Failed to verify YouTube subscription',
        error: 'API_ERROR'
      };
    }
    
    const data = await response.json();
    const isSubscribed = data.items && data.items.length > 0;
    
    return {
      verified: isSubscribed,
      message: isSubscribed ? 'YouTube subscription verified' : 'Not subscribed to channel',
      proof: {
        platform: 'youtube',
        action: 'subscribe',
        channelId,
        verifiedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('[YouTube Verification] Error:', error);
    return {
      verified: false,
      message: 'Error verifying YouTube subscription',
      error: String(error)
    };
  }
}

/**
 * Verify if user liked a YouTube video
 * Uses: GET /youtube/v3/videos/getRating
 */
export async function verifyYouTubeLike(
  userId: string,
  videoId: string
): Promise<VerificationResult> {
  try {
    const connection = await getSocialConnection(userId, 'youtube');
    
    if (!connection || !connection.accessToken) {
      return {
        verified: false,
        message: 'YouTube account not connected',
        error: 'NO_CONNECTION'
      };
    }
    
    // Get user's rating for the video
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos/getRating?id=${videoId}`,
      {
        headers: {
          'Authorization': `Bearer ${connection.accessToken}`,
        }
      }
    );
    
    if (!response.ok) {
      return {
        verified: false,
        message: 'Failed to verify YouTube like',
        error: 'API_ERROR'
      };
    }
    
    const data = await response.json();
    const hasLiked = data.items?.[0]?.rating === 'like';
    
    return {
      verified: hasLiked,
      message: hasLiked ? 'YouTube like verified' : 'Video not liked',
      proof: {
        platform: 'youtube',
        action: 'like',
        videoId,
        verifiedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('[YouTube Verification] Error:', error);
    return {
      verified: false,
      message: 'Error verifying YouTube like',
      error: String(error)
    };
  }
}

/**
 * Verify if user commented on a YouTube video
 * Uses: GET /youtube/v3/commentThreads
 */
export async function verifyYouTubeComment(
  userId: string,
  videoId: string
): Promise<VerificationResult> {
  try {
    const connection = await getSocialConnection(userId, 'youtube');
    
    if (!connection || !connection.accessToken) {
      return {
        verified: false,
        message: 'YouTube account not connected',
        error: 'NO_CONNECTION'
      };
    }
    
    // Get comments on the video
    // Note: This requires the channelId from the social connection
    const channelId = connection.platformUserId;
    
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&searchTerms=${channelId}`,
      {
        headers: {
          'Authorization': `Bearer ${connection.accessToken}`,
        }
      }
    );
    
    if (!response.ok) {
      return {
        verified: false,
        message: 'Failed to verify YouTube comment',
        error: 'API_ERROR'
      };
    }
    
    const data = await response.json();
    // Check if any comments are from this user
    const hasCommented = data.items?.some((item: any) => 
      item.snippet.topLevelComment.snippet.authorChannelId?.value === channelId
    );
    
    return {
      verified: hasCommented,
      message: hasCommented ? 'YouTube comment verified' : 'No comment found',
      proof: {
        platform: 'youtube',
        action: 'comment',
        videoId,
        verifiedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('[YouTube Verification] Error:', error);
    return {
      verified: false,
      message: 'Error verifying YouTube comment',
      error: String(error)
    };
  }
}

// ===== SPOTIFY VERIFICATION =====

/**
 * Verify if user follows an artist on Spotify
 * Uses: GET /v1/me/following/contains
 */
export async function verifySpotifyFollowArtist(
  userId: string,
  artistId: string
): Promise<VerificationResult> {
  try {
    const connection = await getSocialConnection(userId, 'spotify');
    
    if (!connection || !connection.accessToken) {
      return {
        verified: false,
        message: 'Spotify account not connected',
        error: 'NO_CONNECTION'
      };
    }
    
    // Check if user follows the artist
    const response = await fetch(
      `https://api.spotify.com/v1/me/following/contains?type=artist&ids=${artistId}`,
      {
        headers: {
          'Authorization': `Bearer ${connection.accessToken}`,
        }
      }
    );
    
    if (!response.ok) {
      return {
        verified: false,
        message: 'Failed to verify Spotify follow',
        error: 'API_ERROR'
      };
    }
    
    const data = await response.json();
    const isFollowing = data[0] === true;
    
    return {
      verified: isFollowing,
      message: isFollowing ? 'Spotify artist follow verified' : 'Not following artist',
      proof: {
        platform: 'spotify',
        action: 'follow_artist',
        artistId,
        verifiedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('[Spotify Verification] Error:', error);
    return {
      verified: false,
      message: 'Error verifying Spotify follow',
      error: String(error)
    };
  }
}

/**
 * Verify if user follows a playlist on Spotify
 * Uses: GET /v1/playlists/{playlist_id}/followers/contains
 */
export async function verifySpotifyFollowPlaylist(
  userId: string,
  playlistId: string
): Promise<VerificationResult> {
  try {
    const connection = await getSocialConnection(userId, 'spotify');
    
    if (!connection || !connection.accessToken) {
      return {
        verified: false,
        message: 'Spotify account not connected',
        error: 'NO_CONNECTION'
      };
    }
    
    // Need the Spotify user ID to check playlist follow
    const spotifyUserId = connection.platformUserId;
    
    if (!spotifyUserId) {
      return {
        verified: false,
        message: 'Spotify user ID not found',
        error: 'NO_USER_ID'
      };
    }
    
    // Check if user follows the playlist
    const response = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/followers/contains?ids=${spotifyUserId}`,
      {
        headers: {
          'Authorization': `Bearer ${connection.accessToken}`,
        }
      }
    );
    
    if (!response.ok) {
      return {
        verified: false,
        message: 'Failed to verify Spotify playlist follow',
        error: 'API_ERROR'
      };
    }
    
    const data = await response.json();
    const isFollowing = data[0] === true;
    
    return {
      verified: isFollowing,
      message: isFollowing ? 'Spotify playlist follow verified' : 'Not following playlist',
      proof: {
        platform: 'spotify',
        action: 'follow_playlist',
        playlistId,
        verifiedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('[Spotify Verification] Error:', error);
    return {
      verified: false,
      message: 'Error verifying Spotify playlist follow',
      error: String(error)
    };
  }
}

// ===== TIKTOK VERIFICATION =====

/**
 * Verify if user follows a creator on TikTok
 * Uses: TikTok User Info API
 */
export async function verifyTikTokFollow(
  userId: string,
  creatorTikTokId: string
): Promise<VerificationResult> {
  try {
    const connection = await getSocialConnection(userId, 'tiktok');
    
    if (!connection || !connection.accessToken) {
      return {
        verified: false,
        message: 'TikTok account not connected',
        error: 'NO_CONNECTION'
      };
    }
    
    // TikTok API v2 - Get user info
    const response = await fetch(
      `https://open.tiktokapis.com/v2/user/info/?fields=follower_count,following_count`,
      {
        headers: {
          'Authorization': `Bearer ${connection.accessToken}`,
        }
      }
    );
    
    if (!response.ok) {
      return {
        verified: false,
        message: 'Failed to verify TikTok follow',
        error: 'API_ERROR'
      };
    }
    
    // Note: TikTok API may not provide detailed following list in free tier
    // This is a placeholder - actual implementation depends on API access
    
    return {
      verified: false,
      message: 'TikTok follow verification requires additional API access',
      error: 'NOT_AVAILABLE'
    };
  } catch (error) {
    console.error('[TikTok Verification] Error:', error);
    return {
      verified: false,
      message: 'Error verifying TikTok follow',
      error: String(error)
    };
  }
}

/**
 * Verify if user liked a TikTok video
 */
export async function verifyTikTokLike(
  userId: string,
  videoId: string
): Promise<VerificationResult> {
  try {
    const connection = await getSocialConnection(userId, 'tiktok');
    
    if (!connection || !connection.accessToken) {
      return {
        verified: false,
        message: 'TikTok account not connected',
        error: 'NO_CONNECTION'
      };
    }
    
    // TikTok API for likes verification
    // Note: May require specific permissions
    
    return {
      verified: false,
      message: 'TikTok like verification requires additional API access',
      error: 'NOT_AVAILABLE'
    };
  } catch (error) {
    console.error('[TikTok Verification] Error:', error);
    return {
      verified: false,
      message: 'Error verifying TikTok like',
      error: String(error)
    };
  }
}

/**
 * Verify if user commented on a TikTok video
 */
export async function verifyTikTokComment(
  userId: string,
  videoId: string
): Promise<VerificationResult> {
  try {
    const connection = await getSocialConnection(userId, 'tiktok');
    
    if (!connection || !connection.accessToken) {
      return {
        verified: false,
        message: 'TikTok account not connected',
        error: 'NO_CONNECTION'
      };
    }
    
    // TikTok API for comments verification
    // Note: May require specific permissions
    
    return {
      verified: false,
      message: 'TikTok comment verification requires additional API access',
      error: 'NOT_AVAILABLE'
    };
  } catch (error) {
    console.error('[TikTok Verification] Error:', error);
    return {
      verified: false,
      message: 'Error verifying TikTok comment',
      error: String(error)
    };
  }
}

// ===== TASK COMPLETION UPDATE =====

/**
 * Update task completion with verification results
 */
export async function updateTaskCompletion(
  taskCompletionId: string,
  verificationResult: VerificationResult,
  verificationMethod: 'webhook' | 'api_poll' | 'manual'
): Promise<void> {
  try {
    const updates: any = {
      updatedAt: new Date()
    };
    
    if (verificationResult.verified) {
      updates.status = 'completed';
      updates.verifiedAt = new Date();
      updates.verificationMethod = verificationMethod;
      updates.progress = 100;
      
      // Add verification proof to completion data
      const [completion] = await db
        .select()
        .from(taskCompletions)
        .where(eq(taskCompletions.id, taskCompletionId));
      
      if (completion) {
        const completionData = completion.completionData || {};
        updates.completionData = {
          ...completionData,
          verificationProof: verificationResult.proof
        };
      }
    }
    
    await db
      .update(taskCompletions)
      .set(updates)
      .where(eq(taskCompletions.id, taskCompletionId));
    
    console.log(`[Verification Service] Task completion ${taskCompletionId} updated:`, {
      verified: verificationResult.verified,
      method: verificationMethod
    });
  } catch (error) {
    console.error('[Verification Service] Error updating task completion:', error);
    throw error;
  }
}

