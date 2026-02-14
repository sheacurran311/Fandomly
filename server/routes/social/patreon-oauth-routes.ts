/**
 * Patreon OAuth Routes
 * 
 * Handles OAuth flow for Patreon integration.
 * Supports both creator and patron use cases.
 */

import { Express, Request, Response } from "express";
import { db } from "../../db";
import { socialConnections, users } from "../../../shared/schema";
import { eq, and } from "drizzle-orm";
import { authenticateUser, AuthenticatedRequest } from "../../middleware/rbac";

// Patreon OAuth configuration
const PATREON_CONFIG = {
  clientId: process.env.PATREON_CLIENT_ID || '',
  clientSecret: process.env.PATREON_CLIENT_SECRET || '',
  redirectUri: process.env.PATREON_REDIRECT_URI || '',
  authUrl: 'https://www.patreon.com/oauth2/authorize',
  tokenUrl: 'https://www.patreon.com/api/oauth2/token',
  apiBase: 'https://www.patreon.com/api/oauth2/v2',
};

interface PatreonTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface PatreonUserResponse {
  data: {
    id: string;
    attributes: {
      email?: string;
      full_name: string;
      vanity?: string;
      image_url?: string;
      url: string;
      is_creator?: boolean;
    };
  };
  included?: Array<{
    type: string;
    id: string;
    attributes: any;
    relationships?: any;
  }>;
}

interface PatreonMembershipsResponse {
  data: Array<{
    id: string;
    type: 'member';
    attributes: {
      patron_status: 'active_patron' | 'declined_patron' | 'former_patron' | null;
      is_follower: boolean;
      currently_entitled_amount_cents: number;
      lifetime_support_cents: number;
      pledge_relationship_start?: string;
    };
    relationships?: {
      campaign?: { data: { id: string; type: string } };
      currently_entitled_tiers?: { data: Array<{ id: string; type: string }> };
    };
  }>;
  included?: Array<{
    type: string;
    id: string;
    attributes: any;
  }>;
}

/**
 * Exchange authorization code for access token
 */
async function exchangeCodeForToken(code: string): Promise<PatreonTokenResponse> {
  const response = await fetch(PATREON_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: PATREON_CONFIG.clientId,
      client_secret: PATREON_CONFIG.clientSecret,
      code,
      redirect_uri: PATREON_CONFIG.redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[Patreon] Token exchange error:', error);
    throw new Error('Failed to exchange code for token');
  }

  return response.json();
}

/**
 * Fetch user profile from Patreon API
 */
async function fetchPatreonProfile(accessToken: string): Promise<PatreonUserResponse> {
  const fields = [
    'fields[user]=email,full_name,vanity,image_url,url,is_creator',
  ].join('&');

  const response = await fetch(`${PATREON_CONFIG.apiBase}/identity?${fields}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[Patreon] Profile fetch error:', error);
    throw new Error('Failed to fetch Patreon profile');
  }

  return response.json();
}

/**
 * Fetch user's memberships (campaigns they support)
 */
async function fetchPatreonMemberships(accessToken: string): Promise<PatreonMembershipsResponse> {
  const fields = [
    'fields[member]=patron_status,is_follower,currently_entitled_amount_cents,lifetime_support_cents,pledge_relationship_start',
    'include=campaign,currently_entitled_tiers',
    'fields[campaign]=title,url',
    'fields[tier]=title,amount_cents',
  ].join('&');

  const response = await fetch(`${PATREON_CONFIG.apiBase}/identity?include=memberships&${fields}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[Patreon] Memberships fetch error:', error);
    throw new Error('Failed to fetch memberships');
  }

  return response.json();
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(refreshToken: string): Promise<PatreonTokenResponse> {
  const response = await fetch(PATREON_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: PATREON_CONFIG.clientId,
      client_secret: PATREON_CONFIG.clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  return response.json();
}

export function registerPatreonOAuthRoutes(app: Express) {
  /**
   * Handle OAuth callback from Patreon
   */
  app.post(
    "/api/social/patreon/callback",
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const { code } = req.body;
        if (!code) {
          return res.status(400).json({ message: "Authorization code required" });
        }

        // Check if Patreon OAuth is configured
        if (!PATREON_CONFIG.clientId || !PATREON_CONFIG.clientSecret) {
          return res.status(503).json({ 
            message: "Patreon OAuth is not configured" 
          });
        }

        // Exchange code for tokens
        const tokenData = await exchangeCodeForToken(code);

        // Fetch user profile
        const profile = await fetchPatreonProfile(tokenData.access_token);
        const userData = profile.data;

        // Try to fetch memberships (may fail if not authorized)
        let memberships: any[] = [];
        try {
          const membershipsData = await fetchPatreonMemberships(tokenData.access_token);
          memberships = membershipsData.data || [];
        } catch (e) {
          console.warn('[Patreon] Could not fetch memberships:', e);
        }

        // Calculate token expiration
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);

        // Check for existing connection
        const existing = await db.query.socialConnections.findFirst({
          where: and(
            eq(socialConnections.userId, userId),
            eq(socialConnections.platform, 'patreon')
          ),
        });

        const connectionData = {
          platform: 'patreon' as const,
          platformUserId: userData.id,
          platformUsername: userData.attributes.vanity || userData.attributes.full_name,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          tokenExpiresAt: expiresAt,
          profileData: {
            fullName: userData.attributes.full_name,
            vanity: userData.attributes.vanity,
            email: userData.attributes.email,
            imageUrl: userData.attributes.image_url,
            url: userData.attributes.url,
            isCreator: userData.attributes.is_creator,
            memberships: memberships.map((m: any) => ({
              campaignId: m.relationships?.campaign?.data?.id,
              patronStatus: m.attributes.patron_status,
              isFollower: m.attributes.is_follower,
              currentlyEntitledAmountCents: m.attributes.currently_entitled_amount_cents,
              lifetimeSupportCents: m.attributes.lifetime_support_cents,
            })),
          },
          isActive: true,
          updatedAt: new Date(),
        };

        if (existing) {
          // Update existing connection
          await db
            .update(socialConnections)
            .set(connectionData)
            .where(eq(socialConnections.id, existing.id));
        } else {
          // Create new connection
          await db.insert(socialConnections).values({
            userId,
            ...connectionData,
          });
        }

        res.json({ 
          success: true, 
          username: userData.attributes.vanity || userData.attributes.full_name,
          isCreator: userData.attributes.is_creator,
        });
      } catch (error: any) {
        console.error('[Patreon] OAuth callback error:', error);
        res.status(500).json({ 
          message: error.message || 'Failed to connect Patreon account' 
        });
      }
    }
  );

  /**
   * Get Patreon connection status
   */
  app.get(
    "/api/social/connections/patreon",
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const connection = await db.query.socialConnections.findFirst({
          where: and(
            eq(socialConnections.userId, userId),
            eq(socialConnections.platform, 'patreon')
          ),
        });

        if (!connection) {
          return res.json({
            isActive: false,
            platformUserId: null,
            platformUsername: null,
            profileData: null,
          });
        }

        res.json({
          isActive: connection.isActive,
          platformUserId: connection.platformUserId,
          platformUsername: connection.platformUsername,
          profileData: connection.profileData,
        });
      } catch (error: any) {
        console.error('[Patreon] Get connection error:', error);
        res.status(500).json({ message: 'Failed to get connection status' });
      }
    }
  );

  /**
   * Disconnect Patreon account
   */
  app.delete(
    "/api/social/connections/patreon",
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        await db
          .update(socialConnections)
          .set({ isActive: false, updatedAt: new Date() })
          .where(
            and(
              eq(socialConnections.userId, userId),
              eq(socialConnections.platform, 'patreon')
            )
          );

        res.json({ success: true });
      } catch (error: any) {
        console.error('[Patreon] Disconnect error:', error);
        res.status(500).json({ message: 'Failed to disconnect account' });
      }
    }
  );

  /**
   * Check patron status for a specific campaign
   */
  app.get(
    "/api/social/patreon/check-patron",
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const { campaignId, minimumCents } = req.query;
        if (!campaignId) {
          return res.status(400).json({ message: "Campaign ID required" });
        }

        const connection = await db.query.socialConnections.findFirst({
          where: and(
            eq(socialConnections.userId, userId),
            eq(socialConnections.platform, 'patreon'),
            eq(socialConnections.isActive, true)
          ),
        });

        if (!connection) {
          return res.status(404).json({ message: "Patreon not connected" });
        }

        // Get fresh membership data
        const membershipsData = await fetchPatreonMemberships(connection.accessToken!);
        
        // Find membership for the specific campaign
        const membership = membershipsData.data?.find(
          (m: any) => m.relationships?.campaign?.data?.id === campaignId
        );

        if (!membership) {
          return res.json({
            isPatron: false,
            message: 'Not a patron of this campaign',
          });
        }

        const isActivePatron = membership.attributes.patron_status === 'active_patron';
        const meetsMinimum = minimumCents 
          ? membership.attributes.currently_entitled_amount_cents >= parseInt(minimumCents as string)
          : true;

        // Get tier info if available
        const tierId = membership.relationships?.currently_entitled_tiers?.data?.[0]?.id;
        const tier = membershipsData.included?.find(
          (i: any) => i.type === 'tier' && i.id === tierId
        );

        res.json({
          isPatron: isActivePatron && meetsMinimum,
          patronStatus: membership.attributes.patron_status,
          amountCents: membership.attributes.currently_entitled_amount_cents,
          lifetimeSupportCents: membership.attributes.lifetime_support_cents,
          tier: tier?.attributes?.title,
          tierAmountCents: tier?.attributes?.amount_cents,
        });
      } catch (error: any) {
        console.error('[Patreon] Check patron error:', error);
        res.status(500).json({ message: 'Failed to check patron status' });
      }
    }
  );

  /**
   * Get campaign members (for creators)
   */
  app.get(
    "/api/social/patreon/campaigns/:campaignId/members",
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const { campaignId } = req.params;

        const connection = await db.query.socialConnections.findFirst({
          where: and(
            eq(socialConnections.userId, userId),
            eq(socialConnections.platform, 'patreon'),
            eq(socialConnections.isActive, true)
          ),
        });

        if (!connection) {
          return res.status(404).json({ message: "Patreon not connected" });
        }

        // Fetch campaign members (requires creator scope)
        const fields = [
          'fields[member]=full_name,email,patron_status,currently_entitled_amount_cents,lifetime_support_cents',
          'include=user',
          'fields[user]=full_name,email',
        ].join('&');

        const response = await fetch(
          `${PATREON_CONFIG.apiBase}/campaigns/${campaignId}/members?${fields}`,
          {
            headers: {
              'Authorization': `Bearer ${connection.accessToken}`,
            },
          }
        );

        if (!response.ok) {
          const error = await response.text();
          console.error('[Patreon] Fetch members error:', error);
          return res.status(response.status).json({ 
            message: 'Failed to fetch campaign members' 
          });
        }

        const data = await response.json();
        
        const members = data.data?.map((member: any) => {
          const userId = member.relationships?.user?.data?.id;
          const user = data.included?.find(
            (i: any) => i.type === 'user' && i.id === userId
          );
          
          return {
            patronId: userId,
            fullName: user?.attributes?.full_name || member.attributes?.full_name,
            email: user?.attributes?.email || member.attributes?.email,
            currentlyEntitledAmountCents: member.attributes?.currently_entitled_amount_cents,
            lifetimeSupportCents: member.attributes?.lifetime_support_cents,
            patronStatus: member.attributes?.patron_status,
          };
        }) || [];

        res.json({ members });
      } catch (error: any) {
        console.error('[Patreon] Campaign members error:', error);
        res.status(500).json({ message: 'Failed to get campaign members' });
      }
    }
  );
}
