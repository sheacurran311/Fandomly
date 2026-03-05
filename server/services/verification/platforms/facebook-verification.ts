/**
 * Facebook Verification Service
 *
 * T1 (API) Verification for Facebook tasks:
 * - Page likes: GET /me/likes
 * - Group membership: GET /me/groups
 *
 * T3 (Manual) Verification:
 * - Share post, like post, comment post - these require manual review
 *
 * Note: Facebook Graph API has limited verification capabilities
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { db } from '@db';
import { socialConnections } from '@shared/schema';
import { and, eq } from 'drizzle-orm';

// Facebook Graph API base URL
const FACEBOOK_API_BASE = 'https://graph.facebook.com/v18.0';

export interface FacebookVerificationResult {
  verified: boolean;
  requiresManualReview: boolean;
  confidence: 'high' | 'medium' | 'low';
  reason?: string;
  metadata?: Record<string, any>;
}

export interface FacebookVerificationParams {
  fanUserId: string;
  taskType: string;
  taskSettings: {
    pageId?: string;
    groupId?: string;
    postId?: string;
    creatorUserId?: string;
  };
}

class FacebookVerificationService {
  /**
   * Main verification entry point
   */
  async verifyTask(params: FacebookVerificationParams): Promise<FacebookVerificationResult> {
    const { fanUserId, taskType, taskSettings } = params;

    try {
      // Get fan's Facebook connection
      const fanConnection = await this.getFanFacebookConnection(fanUserId);

      if (!fanConnection || !fanConnection.accessToken) {
        return {
          verified: false,
          requiresManualReview: false,
          confidence: 'low',
          reason: 'Fan has not connected their Facebook account',
          metadata: { requiresFacebookConnection: true },
        };
      }

      // Check if token needs refresh (if expiration date is available)
      if (fanConnection.tokenExpiresAt && this.isTokenExpired(fanConnection.tokenExpiresAt)) {
        return {
          verified: false,
          requiresManualReview: false,
          confidence: 'low',
          reason: 'Facebook access token expired. Please reconnect your Facebook account.',
          metadata: { tokenExpired: true },
        };
      }

      // Route to specific verification method
      switch (taskType) {
        case 'facebook_like_page':
          return await this.verifyPageLike(fanConnection.accessToken, taskSettings.pageId);

        case 'facebook_join_group':
          return await this.verifyGroupMembership(fanConnection.accessToken, taskSettings.groupId);

        case 'facebook_share_post':
        case 'facebook_like_post':
        case 'facebook_comment_post':
          // These cannot be reliably verified via API
          return {
            verified: false,
            requiresManualReview: true,
            confidence: 'medium',
            reason: 'Requires manual verification',
            metadata: {
              verificationTier: 'T3',
              verificationMethod: 'manual',
              note: 'Facebook API does not expose per-user share/like/comment data',
            },
          };

        default:
          return {
            verified: false,
            requiresManualReview: true,
            confidence: 'low',
            reason: `Unknown Facebook task type: ${taskType}`,
          };
      }
    } catch (error: any) {
      console.error('[FacebookVerification] Error:', error);
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'low',
        reason: error.message || 'Facebook verification failed',
        metadata: { error: error.message },
      };
    }
  }

  /**
   * Verify page like
   * API: GET /me/likes
   */
  async verifyPageLike(accessToken: string, pageId?: string): Promise<FacebookVerificationResult> {
    if (!pageId) {
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'low',
        reason: 'No page ID provided',
      };
    }

    try {
      // Fetch user's liked pages (paginated)
      let isLiked = false;
      let nextPageUrl: string | null = `${FACEBOOK_API_BASE}/me/likes?fields=id&limit=100`;
      let attempts = 0;
      const maxAttempts = 10; // Limit pagination to prevent infinite loops

      while (nextPageUrl && attempts < maxAttempts) {
        const response: Response = await fetch(nextPageUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          const error = await response.text();
          console.error('[FacebookVerification] Page like check failed:', error);
          return {
            verified: false,
            requiresManualReview: false,
            confidence: 'low',
            reason: 'Failed to check page like status',
            metadata: { apiError: error },
          };
        }

        const data: any = await response.json();

        // Check if the page is in the likes
        if (data.data && Array.isArray(data.data)) {
          for (const page of data.data) {
            if (page.id === pageId) {
              isLiked = true;
              break;
            }
          }
        }

        if (isLiked) break;

        // Check for next page
        nextPageUrl = data.paging?.next || null;
        attempts++;
      }

      return {
        verified: isLiked,
        requiresManualReview: false,
        confidence: 'high',
        reason: isLiked ? 'Page like verified via API' : 'Not liking the page',
        metadata: {
          verificationTier: 'T1',
          verificationMethod: 'api',
          pageId,
          isLiked,
        },
      };
    } catch (error: any) {
      console.error('[FacebookVerification] Page like check error:', error);
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'low',
        reason: 'Error checking page like',
        metadata: { error: error.message },
      };
    }
  }

  /**
   * Verify group membership
   * API: GET /me/groups
   */
  async verifyGroupMembership(
    accessToken: string,
    groupId?: string
  ): Promise<FacebookVerificationResult> {
    if (!groupId) {
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'low',
        reason: 'No group ID provided',
      };
    }

    try {
      // Fetch user's groups (paginated)
      let isMember = false;
      let nextPageUrl: string | null = `${FACEBOOK_API_BASE}/me/groups?fields=id&limit=100`;
      let attempts = 0;
      const maxAttempts = 10; // Limit pagination to prevent infinite loops

      while (nextPageUrl && attempts < maxAttempts) {
        const response: Response = await fetch(nextPageUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          const error = await response.text();
          console.error('[FacebookVerification] Group membership check failed:', error);
          return {
            verified: false,
            requiresManualReview: false,
            confidence: 'low',
            reason: 'Failed to check group membership status',
            metadata: { apiError: error },
          };
        }

        const data: any = await response.json();

        // Check if the group is in the list
        if (data.data && Array.isArray(data.data)) {
          for (const group of data.data) {
            if (group.id === groupId) {
              isMember = true;
              break;
            }
          }
        }

        if (isMember) break;

        // Check for next page
        nextPageUrl = data.paging?.next || null;
        attempts++;
      }

      return {
        verified: isMember,
        requiresManualReview: false,
        confidence: 'high',
        reason: isMember ? 'Group membership verified via API' : 'Not a member of the group',
        metadata: {
          verificationTier: 'T1',
          verificationMethod: 'api',
          groupId,
          isMember,
        },
      };
    } catch (error: any) {
      console.error('[FacebookVerification] Group membership check error:', error);
      return {
        verified: false,
        requiresManualReview: false,
        confidence: 'low',
        reason: 'Error checking group membership',
        metadata: { error: error.message },
      };
    }
  }

  /**
   * Get fan's Facebook connection
   */
  private async getFanFacebookConnection(userId: string) {
    return db.query.socialConnections.findFirst({
      where: and(
        eq(socialConnections.userId, userId),
        eq(socialConnections.platform, 'facebook'),
        eq(socialConnections.isActive, true)
      ),
    });
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(expiresAt: Date | null): boolean {
    if (!expiresAt) return false; // If no expiration date, assume it's valid
    // Add 5 minute buffer
    return new Date(expiresAt).getTime() < Date.now() + 5 * 60 * 1000;
  }
}

// Export singleton
export const facebookVerification = new FacebookVerificationService();
