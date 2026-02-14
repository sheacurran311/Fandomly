import { db } from '../../../db';
import { socialConnections } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Twitch Verification Service
 * 
 * Provides T1 (fully API-verified) verification for Twitch tasks.
 * 
 * Supported verifications:
 * - Follow check (is fan following the creator's channel?)
 * - Subscription check (is fan subscribed to the creator's channel?)
 * 
 * Uses Twitch Helix API
 */

export interface TwitchVerificationResult {
  verified: boolean;
  confidence: 'high' | 'medium' | 'low';
  reason?: string;
  metadata?: Record<string, any>;
}

// Twitch API base URL
const TWITCH_API = 'https://api.twitch.tv/helix';

/**
 * Twitch Verification Service
 */
export class TwitchVerificationService {
  private clientId: string;
  private clientSecret: string;
  private appAccessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  
  constructor() {
    this.clientId = process.env.TWITCH_CLIENT_ID || '';
    this.clientSecret = process.env.TWITCH_CLIENT_SECRET || '';
    
    if (!this.clientId || !this.clientSecret) {
      console.warn('[Twitch Verification] TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET not configured');
    }
  }
  
  /**
   * Get app access token for Twitch API
   */
  private async getAppAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.appAccessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.appAccessToken;
    }
    
    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'client_credentials',
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to get Twitch app access token');
    }
    
    const data = await response.json();
    const token = data.access_token ?? null;
    if (!token) throw new Error('No access token in Twitch response');
    this.appAccessToken = token;
    this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);
    
    return token;
  }
  
  /**
   * Make authenticated request to Twitch API
   */
  private async twitchRequest(
    endpoint: string, 
    accessToken?: string,
    method = 'GET'
  ): Promise<any> {
    const token = accessToken || await this.getAppAccessToken();
    
    const response = await fetch(`${TWITCH_API}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Client-Id': this.clientId,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Twitch API error: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Verify if a user follows a Twitch channel
   * 
   * Endpoint: GET /helix/channels/followed?user_id={fan_id}&broadcaster_id={creator_id}
   * 
   * Note: This requires the fan's user access token with user:read:follows scope
   */
  async verifyFollow(params: {
    fanTwitchId: string;
    creatorTwitchId: string;
    fanAccessToken: string;
  }): Promise<TwitchVerificationResult> {
    const { fanTwitchId, creatorTwitchId, fanAccessToken } = params;
    
    try {
      const data = await this.twitchRequest(
        `/channels/followed?user_id=${fanTwitchId}&broadcaster_id=${creatorTwitchId}`,
        fanAccessToken
      );
      
      // If data.data has entries, the user is following
      const isFollowing = data.data && data.data.length > 0;
      
      if (isFollowing) {
        const followData = data.data[0];
        return {
          verified: true,
          confidence: 'high',
          reason: 'User is following the channel',
          metadata: {
            followedAt: followData.followed_at,
            broadcasterName: followData.broadcaster_name,
          },
        };
      }
      
      return {
        verified: false,
        confidence: 'high',
        reason: 'User is not following the channel',
      };
    } catch (error: any) {
      console.error('[Twitch Verification] Follow check failed:', error);
      return {
        verified: false,
        confidence: 'low',
        reason: `Failed to verify follow: ${error.message}`,
      };
    }
  }
  
  /**
   * Verify if a user is subscribed to a Twitch channel
   * 
   * Endpoint: GET /helix/subscriptions/user?broadcaster_id={creator_id}&user_id={fan_id}
   * 
   * Note: This requires the broadcaster's user access token with channel:read:subscriptions scope
   */
  async verifySubscription(params: {
    fanTwitchId: string;
    creatorTwitchId: string;
    creatorAccessToken: string;
  }): Promise<TwitchVerificationResult> {
    const { fanTwitchId, creatorTwitchId, creatorAccessToken } = params;
    
    try {
      const data = await this.twitchRequest(
        `/subscriptions/user?broadcaster_id=${creatorTwitchId}&user_id=${fanTwitchId}`,
        creatorAccessToken
      );
      
      // If data.data has entries, the user is subscribed
      const isSubscribed = data.data && data.data.length > 0;
      
      if (isSubscribed) {
        const subData = data.data[0];
        return {
          verified: true,
          confidence: 'high',
          reason: `User is subscribed at tier ${subData.tier}`,
          metadata: {
            tier: subData.tier,
            isGift: subData.is_gift,
          },
        };
      }
      
      return {
        verified: false,
        confidence: 'high',
        reason: 'User is not subscribed to the channel',
      };
    } catch (error: any) {
      // 404 means not subscribed
      if (error.message?.includes('404')) {
        return {
          verified: false,
          confidence: 'high',
          reason: 'User is not subscribed to the channel',
        };
      }
      
      console.error('[Twitch Verification] Subscription check failed:', error);
      return {
        verified: false,
        confidence: 'low',
        reason: `Failed to verify subscription: ${error.message}`,
      };
    }
  }
  
  /**
   * Get user's Twitch ID and access token from their social connection
   */
  async getFanTwitchData(fanUserId: string): Promise<{
    twitchId: string | null;
    accessToken: string | null;
  }> {
    const connection = await db.query.socialConnections.findFirst({
      where: and(
        eq(socialConnections.userId, fanUserId),
        eq(socialConnections.platform, 'twitch'),
        eq(socialConnections.isActive, true),
      ),
    });
    
    return {
      twitchId: connection?.platformUserId || null,
      accessToken: connection?.accessToken || null,
    };
  }
  
  /**
   * Get creator's Twitch data from their social connection
   */
  async getCreatorTwitchData(creatorUserId: string): Promise<{
    twitchId: string | null;
    accessToken: string | null;
  }> {
    const connection = await db.query.socialConnections.findFirst({
      where: and(
        eq(socialConnections.userId, creatorUserId),
        eq(socialConnections.platform, 'twitch'),
        eq(socialConnections.isActive, true),
      ),
    });
    
    return {
      twitchId: connection?.platformUserId || null,
      accessToken: connection?.accessToken || null,
    };
  }
  
  /**
   * Main verification entry point for Twitch tasks
   */
  async verifyTask(params: {
    fanUserId: string;
    creatorUserId: string;
    taskType: string;
    taskSettings?: {
      channelId?: string;
      tier?: string; // 'tier1' | 'tier2' | 'tier3'
    };
  }): Promise<TwitchVerificationResult> {
    const { fanUserId, creatorUserId, taskType, taskSettings } = params;
    
    // Get fan's Twitch data
    const fanData = await this.getFanTwitchData(fanUserId);
    
    if (!fanData.twitchId || !fanData.accessToken) {
      return {
        verified: false,
        confidence: 'high',
        reason: 'Twitch account not connected. Please connect your Twitch account first.',
      };
    }
    
    // Get creator's Twitch data
    const creatorData = await this.getCreatorTwitchData(creatorUserId);
    
    // Use taskSettings.channelId if provided, otherwise use creator's connected channel
    const creatorTwitchId = taskSettings?.channelId || creatorData.twitchId;
    
    if (!creatorTwitchId) {
      return {
        verified: false,
        confidence: 'low',
        reason: 'Creator Twitch channel not configured',
      };
    }
    
    // Route to appropriate verification
    switch (taskType.toLowerCase()) {
      case 'twitch_follow':
        return this.verifyFollow({
          fanTwitchId: fanData.twitchId,
          creatorTwitchId,
          fanAccessToken: fanData.accessToken,
        });
      
      case 'twitch_subscribe':
      case 'twitch_subscription':
        if (!creatorData.accessToken) {
          return {
            verified: false,
            confidence: 'low',
            reason: 'Creator Twitch access token not available for subscription verification',
          };
        }
        
        const result = await this.verifySubscription({
          fanTwitchId: fanData.twitchId,
          creatorTwitchId,
          creatorAccessToken: creatorData.accessToken,
        });
        
        // Check tier requirement if specified
        if (result.verified && taskSettings?.tier && result.metadata?.tier) {
          const requiredTier = parseInt(taskSettings.tier.replace('tier', ''));
          const actualTier = parseInt(result.metadata.tier) / 1000; // Twitch tiers are 1000, 2000, 3000
          
          if (actualTier < requiredTier) {
            return {
              verified: false,
              confidence: 'high',
              reason: `User subscription tier (${actualTier}) does not meet required tier (${requiredTier})`,
              metadata: result.metadata,
            };
          }
        }
        
        return result;
      
      default:
        return {
          verified: false,
          confidence: 'low',
          reason: `Unknown Twitch task type: ${taskType}`,
        };
    }
  }
}

// Export singleton instance
export const twitchVerification = new TwitchVerificationService();
