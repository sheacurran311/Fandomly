/**
 * Patreon Verification Service
 * 
 * Handles verification of Patreon-related tasks:
 * - T1 (API): Patron status, tier membership, minimum pledge amount
 * - T1 (API): Campaign follower status
 * 
 * All Patreon verifications are API-based (T1) since we have OAuth access.
 */

import { db } from "../../../db";
import { socialConnections } from "../../../../shared/schema";
import { eq, and } from "drizzle-orm";
import { tokenRefreshService } from "../../auth/token-refresh";

const PATREON_API_BASE = 'https://www.patreon.com/api/oauth2/v2';

export interface PatreonVerificationParams {
  taskType: string;
  fanUserId: string;
  taskId: string;
  config?: {
    campaignId?: string;
    creatorPatreonId?: string;
    minimumCents?: number;
    requiredTierId?: string;
    requiredTierTitle?: string;
  };
  creatorUserId?: string;
}

export interface PatreonVerificationResult {
  verified: boolean;
  method: 'api' | 'manual';
  message: string;
  data?: {
    patronStatus?: string;
    pledgeAmountCents?: number;
    lifetimeSupportCents?: number;
    currentTier?: string;
    isFollower?: boolean;
  };
  requiresManualReview?: boolean;
}

interface PatreonMembership {
  campaignId: string;
  patronStatus: 'active_patron' | 'declined_patron' | 'former_patron' | null;
  isFollower: boolean;
  currentlyEntitledAmountCents: number;
  lifetimeSupportCents: number;
  tierId?: string;
  tierTitle?: string;
}

class PatreonVerificationService {
  /**
   * Main verification entry point
   */
  async verifyTask(params: PatreonVerificationParams): Promise<PatreonVerificationResult> {
    const { taskType, fanUserId, config } = params;

    try {
      switch (taskType) {
        case 'patreon_support':
          return await this.verifyPatronStatus(fanUserId, config?.campaignId, config?.minimumCents);
        
        case 'patreon_tier_check':
          return await this.verifyTierMembership(
            fanUserId, 
            config?.campaignId, 
            config?.requiredTierId,
            config?.requiredTierTitle
          );
        
        case 'patreon_follow':
          return await this.verifyFollowerStatus(fanUserId, config?.campaignId);
        
        default:
          return {
            verified: false,
            method: 'manual',
            message: `Unknown Patreon task type: ${taskType}`,
            requiresManualReview: true,
          };
      }
    } catch (error: any) {
      console.error('[PatreonVerification] Error:', error);
      return {
        verified: false,
        method: 'api',
        message: error.message || 'Verification failed',
        requiresManualReview: true,
      };
    }
  }

  /**
   * Verify patron status (T1)
   * Checks if user is an active patron of a campaign, optionally with minimum pledge
   */
  async verifyPatronStatus(
    fanUserId: string,
    campaignId?: string,
    minimumCents?: number
  ): Promise<PatreonVerificationResult> {
    const connection = await this.getConnection(fanUserId);
    if (!connection) {
      return {
        verified: false,
        method: 'api',
        message: 'Patreon account not connected',
      };
    }

    await this.ensureValidToken(connection);

    try {
      const memberships = await this.fetchMemberships(connection.accessToken!);
      
      // Find membership for the specific campaign
      const membership = memberships.find(m => m.campaignId === campaignId);

      if (!membership) {
        return {
          verified: false,
          method: 'api',
          message: 'Not a member of this campaign',
          data: { patronStatus: 'none' },
        };
      }

      const isActivePatron = membership.patronStatus === 'active_patron';
      const meetsMinimum = minimumCents 
        ? membership.currentlyEntitledAmountCents >= minimumCents 
        : true;

      const verified = isActivePatron && meetsMinimum;

      return {
        verified,
        method: 'api',
        message: verified
          ? 'Patron status verified!'
          : !isActivePatron
            ? 'Not currently an active patron'
            : `Pledge amount (${membership.currentlyEntitledAmountCents}¢) below minimum (${minimumCents}¢)`,
        data: {
          patronStatus: membership.patronStatus || 'none',
          pledgeAmountCents: membership.currentlyEntitledAmountCents,
          lifetimeSupportCents: membership.lifetimeSupportCents,
          currentTier: membership.tierTitle,
        },
      };
    } catch (error: any) {
      console.error('[PatreonVerification] Patron status error:', error);
      return {
        verified: false,
        method: 'api',
        message: 'Failed to verify patron status',
        requiresManualReview: true,
      };
    }
  }

  /**
   * Verify tier membership (T1)
   * Checks if user is pledged at a specific tier
   */
  async verifyTierMembership(
    fanUserId: string,
    campaignId?: string,
    requiredTierId?: string,
    requiredTierTitle?: string
  ): Promise<PatreonVerificationResult> {
    const connection = await this.getConnection(fanUserId);
    if (!connection) {
      return {
        verified: false,
        method: 'api',
        message: 'Patreon account not connected',
      };
    }

    await this.ensureValidToken(connection);

    try {
      const memberships = await this.fetchMemberships(connection.accessToken!);
      const membership = memberships.find(m => m.campaignId === campaignId);

      if (!membership || membership.patronStatus !== 'active_patron') {
        return {
          verified: false,
          method: 'api',
          message: 'Not an active patron of this campaign',
        };
      }

      // Check tier match
      const tierMatch = requiredTierId 
        ? membership.tierId === requiredTierId
        : requiredTierTitle
          ? membership.tierTitle?.toLowerCase() === requiredTierTitle.toLowerCase()
          : true; // No specific tier required

      return {
        verified: tierMatch,
        method: 'api',
        message: tierMatch
          ? `Tier membership verified: ${membership.tierTitle}`
          : `Not at required tier. Current: ${membership.tierTitle || 'None'}`,
        data: {
          patronStatus: membership.patronStatus,
          pledgeAmountCents: membership.currentlyEntitledAmountCents,
          currentTier: membership.tierTitle,
        },
      };
    } catch (error: any) {
      console.error('[PatreonVerification] Tier check error:', error);
      return {
        verified: false,
        method: 'api',
        message: 'Failed to verify tier membership',
        requiresManualReview: true,
      };
    }
  }

  /**
   * Verify follower status (T1)
   * Checks if user follows a campaign (free follow, not paid patron)
   */
  async verifyFollowerStatus(
    fanUserId: string,
    campaignId?: string
  ): Promise<PatreonVerificationResult> {
    const connection = await this.getConnection(fanUserId);
    if (!connection) {
      return {
        verified: false,
        method: 'api',
        message: 'Patreon account not connected',
      };
    }

    await this.ensureValidToken(connection);

    try {
      const memberships = await this.fetchMemberships(connection.accessToken!);
      const membership = memberships.find(m => m.campaignId === campaignId);

      if (!membership) {
        return {
          verified: false,
          method: 'api',
          message: 'Not following this campaign',
          data: { isFollower: false },
        };
      }

      return {
        verified: membership.isFollower || membership.patronStatus === 'active_patron',
        method: 'api',
        message: membership.isFollower || membership.patronStatus === 'active_patron'
          ? 'Follower status verified!'
          : 'Not following this campaign',
        data: {
          isFollower: membership.isFollower,
          patronStatus: membership.patronStatus || 'none',
        },
      };
    } catch (error: any) {
      console.error('[PatreonVerification] Follower check error:', error);
      return {
        verified: false,
        method: 'api',
        message: 'Failed to verify follower status',
        requiresManualReview: true,
      };
    }
  }

  /**
   * Fetch user's memberships from Patreon API
   */
  private async fetchMemberships(accessToken: string): Promise<PatreonMembership[]> {
    const fields = [
      'fields[member]=patron_status,is_follower,currently_entitled_amount_cents,lifetime_support_cents',
      'include=campaign,currently_entitled_tiers',
      'fields[campaign]=title',
      'fields[tier]=title',
    ].join('&');

    const response = await fetch(
      `${PATREON_API_BASE}/identity?include=memberships&${fields}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch Patreon memberships');
    }

    const data = await response.json();
    
    // Parse memberships from the response
    const memberships: PatreonMembership[] = [];
    
    if (data.included) {
      for (const item of data.included) {
        if (item.type === 'member') {
          const campaignId = item.relationships?.campaign?.data?.id;
          const tierId = item.relationships?.currently_entitled_tiers?.data?.[0]?.id;
          
          // Find tier details
          const tier = data.included.find(
            (i: any) => i.type === 'tier' && i.id === tierId
          );

          memberships.push({
            campaignId,
            patronStatus: item.attributes.patron_status,
            isFollower: item.attributes.is_follower,
            currentlyEntitledAmountCents: item.attributes.currently_entitled_amount_cents || 0,
            lifetimeSupportCents: item.attributes.lifetime_support_cents || 0,
            tierId,
            tierTitle: tier?.attributes?.title,
          });
        }
      }
    }

    return memberships;
  }

  /**
   * Get user's Patreon connection
   */
  private async getConnection(userId: string) {
    return db.query.socialConnections.findFirst({
      where: and(
        eq(socialConnections.userId, userId),
        eq(socialConnections.platform, 'patreon'),
        eq(socialConnections.isActive, true)
      ),
    });
  }

  /**
   * Ensure access token is valid
   */
  private async ensureValidToken(connection: any): Promise<void> {
    if (tokenRefreshService.isTokenExpired(connection.tokenExpiresAt)) {
      await tokenRefreshService.refreshIfNeeded(connection);
    }
  }
}

export const patreonVerification = new PatreonVerificationService();
