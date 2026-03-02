/**
 * Patreon OAuth Routes
 *
 * Handles OAuth flow for Patreon integration.
 * Supports both creator and patron use cases.
 */

import { Express, Response } from 'express';
import { db } from '../../db';
import { socialConnections } from '../../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { authenticateUser, AuthenticatedRequest } from '../../middleware/rbac';
import { encryptToken, safeDecryptToken } from '../../lib/token-encryption';

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
    attributes: Record<string, unknown>;
    relationships?: Record<string, unknown>;
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
    attributes: Record<string, unknown>;
  }>;
}

/**
 * Exchange authorization code for access token
 */
async function exchangeCodeForToken(
  code: string,
  codeVerifier?: string,
  redirectUri?: string
): Promise<PatreonTokenResponse> {
  const body: Record<string, string> = {
    grant_type: 'authorization_code',
    client_id: PATREON_CONFIG.clientId,
    client_secret: PATREON_CONFIG.clientSecret,
    code,
    redirect_uri: redirectUri || PATREON_CONFIG.redirectUri,
  };

  // PKCE: include code_verifier if provided
  if (codeVerifier) {
    body.code_verifier = codeVerifier;
  }

  const response = await fetch(PATREON_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body),
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
  const fields = ['fields[user]=email,full_name,vanity,image_url,url,is_creator'].join('&');

  const response = await fetch(`${PATREON_CONFIG.apiBase}/identity?${fields}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
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
      Authorization: `Bearer ${accessToken}`,
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
 * Refresh an expired Patreon access token
 */
async function refreshPatreonToken(refreshToken: string): Promise<PatreonTokenResponse> {
  const response = await fetch(PATREON_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: PATREON_CONFIG.clientId,
      client_secret: PATREON_CONFIG.clientSecret,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[Patreon] Token refresh error:', error);
    throw new Error('Failed to refresh Patreon token');
  }

  return response.json();
}

export function registerPatreonOAuthRoutes(app: Express) {
  // Allowed redirect URIs for validation (M13)
  const ALLOWED_PATREON_REDIRECT_URIS = [
    PATREON_CONFIG.redirectUri,
    // Allow any same-origin callback path
  ].filter(Boolean);

  /**
   * Validate redirect_uri against allowed list
   */
  function validateRedirectUri(uri: string | undefined, allowed: string[]): boolean {
    if (!uri) return true; // Will use default
    return allowed.some((a) => a === uri);
  }

  /**
   * Exchange authorization code for token (popup flow)
   */
  app.post(
    '/api/social/patreon/token',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: 'Unauthorized' });
        }

        if (!PATREON_CONFIG.clientId || !PATREON_CONFIG.clientSecret) {
          return res.status(503).json({ message: 'Patreon OAuth is not configured' });
        }

        const { code, code_verifier, redirect_uri } = req.body;
        if (!code) {
          return res.status(400).json({ message: 'Authorization code required' });
        }

        // Validate redirect_uri (M13)
        if (redirect_uri && !validateRedirectUri(redirect_uri, ALLOWED_PATREON_REDIRECT_URIS)) {
          return res.status(400).json({ message: 'Invalid redirect_uri' });
        }

        const tokenData = await exchangeCodeForToken(code, code_verifier, redirect_uri);
        res.json(tokenData);
      } catch (error) {
        console.error('[Patreon] Token exchange error:', error);
        res
          .status(500)
          .json({ message: error instanceof Error ? error.message : 'Token exchange failed' });
      }
    }
  );

  /**
   * Get authenticated user profile from Patreon API
   * Uses stored access token from socialConnections instead of client-provided header
   */
  app.get(
    '/api/social/patreon/me',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: 'Unauthorized' });
        }

        // Use stored token from socialConnections instead of client-provided header
        const connection = await db.query.socialConnections.findFirst({
          where: and(
            eq(socialConnections.userId, userId),
            eq(socialConnections.platform, 'patreon'),
            eq(socialConnections.isActive, true)
          ),
        });

        if (!connection?.accessToken) {
          return res
            .status(404)
            .json({ message: 'Patreon not connected. Please connect via OAuth first.' });
        }

        const profile = await fetchPatreonProfile(safeDecryptToken(connection.accessToken));
        const userData = profile.data;

        res.json({
          id: userData.id,
          full_name: userData.attributes.full_name,
          vanity: userData.attributes.vanity,
          email: userData.attributes.email,
          image_url: userData.attributes.image_url,
          url: userData.attributes.url,
          is_creator: userData.attributes.is_creator,
        });
      } catch (error) {
        console.error('[Patreon] Profile fetch error:', error);
        res
          .status(500)
          .json({ message: error instanceof Error ? error.message : 'Failed to fetch profile' });
      }
    }
  );

  /**
   * Handle OAuth callback from Patreon (legacy redirect flow)
   */
  app.post(
    '/api/social/patreon/callback',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: 'Unauthorized' });
        }

        const { code, code_verifier, redirect_uri } = req.body;
        if (!code) {
          return res.status(400).json({ message: 'Authorization code required' });
        }

        // Check if Patreon OAuth is configured
        if (!PATREON_CONFIG.clientId || !PATREON_CONFIG.clientSecret) {
          return res.status(503).json({
            message: 'Patreon OAuth is not configured',
          });
        }

        // Validate redirect_uri (M13)
        if (redirect_uri && !validateRedirectUri(redirect_uri, ALLOWED_PATREON_REDIRECT_URIS)) {
          return res.status(400).json({ message: 'Invalid redirect_uri' });
        }

        // Exchange code for tokens
        const tokenData = await exchangeCodeForToken(code, code_verifier, redirect_uri);

        // Fetch user profile
        const profile = await fetchPatreonProfile(tokenData.access_token);
        const userData = profile.data;

        // Try to fetch memberships (may fail if not authorized)
        let memberships: Array<{
          relationships?: { campaign?: { data?: { id: string } } };
          attributes: {
            patron_status: string | null;
            is_follower: boolean;
            currently_entitled_amount_cents: number;
            lifetime_support_cents: number;
          };
        }> = [];
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
          accessToken: encryptToken(tokenData.access_token),
          refreshToken: encryptToken(tokenData.refresh_token),
          tokenExpiresAt: expiresAt,
          profileData: {
            fullName: userData.attributes.full_name,
            vanity: userData.attributes.vanity,
            email: userData.attributes.email,
            imageUrl: userData.attributes.image_url,
            url: userData.attributes.url,
            isCreator: userData.attributes.is_creator,
            memberships: memberships.map((m) => ({
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
      } catch (error) {
        console.error('[Patreon] OAuth callback error:', error);
        res.status(500).json({
          message: error instanceof Error ? error.message : 'Failed to connect Patreon account',
        });
      }
    }
  );

  /**
   * Get Patreon connection status
   */
  app.get(
    '/api/social/connections/patreon',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: 'Unauthorized' });
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
      } catch (error) {
        console.error('[Patreon] Get connection error:', error);
        res.status(500).json({ message: 'Failed to get connection status' });
      }
    }
  );

  /**
   * Disconnect Patreon account
   */
  app.delete(
    '/api/social/connections/patreon',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: 'Unauthorized' });
        }

        await db
          .update(socialConnections)
          .set({ isActive: false, updatedAt: new Date() })
          .where(
            and(eq(socialConnections.userId, userId), eq(socialConnections.platform, 'patreon'))
          );

        res.json({ success: true });
      } catch (error) {
        console.error('[Patreon] Disconnect error:', error);
        res.status(500).json({ message: 'Failed to disconnect account' });
      }
    }
  );

  /**
   * Refresh Patreon access token
   */
  app.post(
    '/api/social/patreon/refresh',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: 'Unauthorized' });
        }

        // Get stored connection with refresh token
        const connection = await db.query.socialConnections.findFirst({
          where: and(
            eq(socialConnections.userId, userId),
            eq(socialConnections.platform, 'patreon'),
            eq(socialConnections.isActive, true)
          ),
        });

        if (!connection?.refreshToken) {
          return res.status(404).json({ message: 'No Patreon connection or refresh token found' });
        }

        // Refresh the token
        const tokenData = await refreshPatreonToken(safeDecryptToken(connection.refreshToken));

        // Calculate new expiration
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);

        // Update stored tokens
        await db
          .update(socialConnections)
          .set({
            accessToken: encryptToken(tokenData.access_token),
            refreshToken: tokenData.refresh_token
              ? encryptToken(tokenData.refresh_token)
              : connection.refreshToken,
            tokenExpiresAt: expiresAt,
            updatedAt: new Date(),
          })
          .where(eq(socialConnections.id, connection.id));

        res.json({
          success: true,
          expiresAt: expiresAt.toISOString(),
        });
      } catch (error) {
        console.error('[Patreon] Token refresh error:', error);
        res.status(500).json({
          message: error instanceof Error ? error.message : 'Failed to refresh token',
        });
      }
    }
  );

  /**
   * Check patron status for a specific campaign
   */
  app.get(
    '/api/social/patreon/check-patron',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: 'Unauthorized' });
        }

        const { campaignId, minimumCents } = req.query;
        if (!campaignId) {
          return res.status(400).json({ message: 'Campaign ID required' });
        }

        const connection = await db.query.socialConnections.findFirst({
          where: and(
            eq(socialConnections.userId, userId),
            eq(socialConnections.platform, 'patreon'),
            eq(socialConnections.isActive, true)
          ),
        });

        if (!connection) {
          return res.status(404).json({ message: 'Patreon not connected' });
        }

        // Get fresh membership data
        const membershipsData = await fetchPatreonMemberships(
          safeDecryptToken(connection.accessToken!)
        );

        // Find membership for the specific campaign
        const membership = membershipsData.data?.find(
          (m) => m.relationships?.campaign?.data?.id === campaignId
        );

        if (!membership) {
          return res.json({
            isPatron: false,
            message: 'Not a patron of this campaign',
          });
        }

        const isActivePatron = membership.attributes.patron_status === 'active_patron';
        const meetsMinimum = minimumCents
          ? membership.attributes.currently_entitled_amount_cents >=
            parseInt(minimumCents as string)
          : true;

        // Get tier info if available
        const tierId = membership.relationships?.currently_entitled_tiers?.data?.[0]?.id;
        const tier = membershipsData.included?.find((i) => i.type === 'tier' && i.id === tierId);

        res.json({
          isPatron: isActivePatron && meetsMinimum,
          patronStatus: membership.attributes.patron_status,
          amountCents: membership.attributes.currently_entitled_amount_cents,
          lifetimeSupportCents: membership.attributes.lifetime_support_cents,
          tier: tier?.attributes?.title,
          tierAmountCents: tier?.attributes?.amount_cents,
        });
      } catch (error) {
        console.error('[Patreon] Check patron error:', error);
        res.status(500).json({ message: 'Failed to check patron status' });
      }
    }
  );

  /**
   * Get campaign members (for creators)
   */
  app.get(
    '/api/social/patreon/campaigns/:campaignId/members',
    authenticateUser,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: 'Unauthorized' });
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
          return res.status(404).json({ message: 'Patreon not connected' });
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
              Authorization: `Bearer ${safeDecryptToken(connection.accessToken!)}`,
            },
          }
        );

        if (!response.ok) {
          const error = await response.text();
          console.error('[Patreon] Fetch members error:', error);
          return res.status(response.status).json({
            message: 'Failed to fetch campaign members',
          });
        }

        const data = (await response.json()) as {
          data?: Array<{
            relationships?: { user?: { data?: { id: string } } };
            attributes?: Record<string, unknown>;
          }>;
          included?: Array<{
            type: string;
            id: string;
            attributes?: Record<string, unknown>;
          }>;
        };

        const members =
          data.data?.map((member) => {
            const userId = member.relationships?.user?.data?.id;
            const user = data.included?.find((i) => i.type === 'user' && i.id === userId);

            return {
              patronId: userId,
              fullName:
                (user?.attributes?.full_name as string | undefined) ||
                (member.attributes?.full_name as string | undefined),
              email:
                (user?.attributes?.email as string | undefined) ||
                (member.attributes?.email as string | undefined),
              currentlyEntitledAmountCents: member.attributes?.currently_entitled_amount_cents as
                | number
                | undefined,
              lifetimeSupportCents: member.attributes?.lifetime_support_cents as number | undefined,
              patronStatus: member.attributes?.patron_status as string | undefined,
            };
          }) || [];

        res.json({ members });
      } catch (error) {
        console.error('[Patreon] Campaign members error:', error);
        res.status(500).json({ message: 'Failed to get campaign members' });
      }
    }
  );
}
