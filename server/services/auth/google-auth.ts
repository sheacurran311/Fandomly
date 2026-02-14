import { db } from '../../db';
import { users, socialConnections } from '@shared/schema';
import { eq, and, or } from 'drizzle-orm';
import { signAccessToken, signRefreshToken } from './jwt-service';
import { nanoid } from 'nanoid';

// Google OAuth2 configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
  id_token?: string;
}

export interface GoogleUserInfo {
  id: string;           // Google's unique user ID
  email: string;
  verified_email: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
}

export interface AuthResult {
  user: {
    id: string;
    email: string | null;
    username: string;
    userType: string;
    role: string;
    profileData: any;
    onboardingState: any;
  };
  accessToken: string;
  refreshToken: string;
  isNewUser: boolean;
  linkRequired?: boolean;
  existingProviders?: string[];
  pendingLinkId?: string;
}

/**
 * Exchange an authorization code for tokens
 */
export async function exchangeGoogleCode(code: string, redirectUri: string): Promise<GoogleTokenResponse> {
  console.log('[Google Auth] Exchanging code for tokens', {
    hasClientId: !!GOOGLE_CLIENT_ID,
    hasClientSecret: !!GOOGLE_CLIENT_SECRET,
    redirectUri,
    codeLength: code.length
  });

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('Google OAuth credentials not configured');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri
    }).toString()
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Google Auth] Token exchange error:', errorText);
    throw new Error(`Google token exchange failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

/**
 * Get user info from Google using an access token
 */
export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Google Auth] User info error:', errorText);
    throw new Error(`Failed to get Google user info: ${response.status}`);
  }

  return response.json();
}

/**
 * Authenticate or register a user with Google OAuth
 * This is the main entry point for Google sign-in/sign-up
 */
export async function authenticateWithGoogle(
  googleTokens: GoogleTokenResponse,
  _options: Record<string, any> = {}  // options parameter kept for backward compat but userType is ignored
): Promise<AuthResult> {
  // Get user info from Google
  const googleUser = await getGoogleUserInfo(googleTokens.access_token);
  
  console.log('[Google Auth] Processing authentication for:', {
    googleId: googleUser.id,
    email: googleUser.email,
    name: googleUser.name
  });

  // Check if user exists by Google ID
  let existingUser = await db.query.users.findFirst({
    where: eq(users.googleId, googleUser.id)
  });

  // If not found by Google ID, check by email
  if (!existingUser && googleUser.email) {
    existingUser = await db.query.users.findFirst({
      where: eq(users.email, googleUser.email)
    });

    // If found by email but different provider, handle account linking
    if (existingUser && !existingUser.googleId) {
      console.log('[Google Auth] Found user by email with different provider', {
        userId: existingUser.id,
        existingProvider: existingUser.primaryAuthProvider
      });

      // Return link required response
      return {
        user: {
          id: existingUser.id,
          email: existingUser.email,
          username: existingUser.username,
          userType: existingUser.userType,
          role: existingUser.role,
          profileData: existingUser.profileData,
          onboardingState: existingUser.onboardingState,
        },
        accessToken: '',
        refreshToken: '',
        isNewUser: false,
        linkRequired: true,
        existingProviders: existingUser.primaryAuthProvider ? [existingUser.primaryAuthProvider] : [],
        pendingLinkId: await createPendingLink(existingUser.id, googleUser.id, 'google', googleUser.email)
      };
    }
  }

  let isNewUser = false;
  let user: typeof existingUser;

  if (existingUser) {
    // Update existing user with Google ID if not set
    if (!existingUser.googleId) {
      await db.update(users)
        .set({
          googleId: googleUser.id,
          primaryAuthProvider: existingUser.primaryAuthProvider || 'google',
          updatedAt: new Date()
        })
        .where(eq(users.id, existingUser.id));
    }
    user = existingUser;
  } else {
    // Create new user
    isNewUser = true;
    const username = generateUsername(googleUser.name || googleUser.email?.split('@')[0] || 'user');
    
    const [newUser] = await db.insert(users).values({
      email: googleUser.email,
      username,
      googleId: googleUser.id,
      primaryAuthProvider: 'google',
      userType: 'pending',  // ALL new users start as 'pending' — they choose type after auth
      role: 'customer_end_user',
      avatar: googleUser.picture || null,
      profileData: {
        name: googleUser.name,
        firstName: googleUser.given_name,
        lastName: googleUser.family_name,
      },
      onboardingState: {
        currentStep: 0,
        totalSteps: 5,
        completedSteps: [],
        isCompleted: false
      }
    } as any).returning();

    user = newUser;
    console.log('[Google Auth] Created new user:', user.id);
  }

  if (!user) {
    throw new Error('Failed to create or find user');
  }

  // Store Google connection in social_connections table
  await upsertSocialConnection(user.id, 'google', {
    platformUserId: googleUser.id,
    platformUsername: googleUser.email,
    platformDisplayName: googleUser.name || googleUser.email,
    accessToken: googleTokens.access_token,
    refreshToken: googleTokens.refresh_token,
    tokenExpiresAt: googleTokens.expires_in ? 
      new Date(Date.now() + googleTokens.expires_in * 1000) : null,
    profileData: {
      email: googleUser.email,
      verified: googleUser.verified_email,
      picture: googleUser.picture,
      locale: googleUser.locale
    }
  });

  // Generate JWT tokens
  const accessToken = signAccessToken({
    id: user.id,
    email: user.email,
    provider: 'google'
  });
  const refreshToken = signRefreshToken({ id: user.id });

  return {
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      userType: user.userType,
      role: user.role,
      profileData: user.profileData,
      onboardingState: user.onboardingState,
    },
    accessToken,
    refreshToken,
    isNewUser
  };
}

/**
 * Create a pending link request
 */
async function createPendingLink(
  existingUserId: string,
  providerId: string,
  provider: string,
  email: string | null
): Promise<string> {
  // For now, store in a simple way - in production you'd want a proper table
  // Return a unique ID that can be used to confirm the link
  const linkId = nanoid();
  
  // Store the pending link data (you could use Redis or a database table)
  // For now, we'll encode it in the ID itself (in production, use proper storage)
  const pendingLinkData = Buffer.from(JSON.stringify({
    existingUserId,
    providerId,
    provider,
    email,
    createdAt: Date.now(),
    expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
  })).toString('base64url');
  
  // Use '.' as delimiter — safe because nanoid and base64url never contain '.'
  return `${linkId}.${pendingLinkData}`;
}

/**
 * Confirm account linking
 */
export async function confirmAccountLink(
  pendingLinkId: string,
  googleTokens: GoogleTokenResponse
): Promise<AuthResult> {
  // Decode the pending link data — split on first '.' (or last '_' for legacy)
  let delimiterIdx = pendingLinkId.indexOf('.');
  if (delimiterIdx === -1) {
    delimiterIdx = pendingLinkId.lastIndexOf('_');
  }
  if (delimiterIdx === -1) {
    throw new Error('Invalid pending link ID');
  }

  const pendingLinkDataStr = pendingLinkId.substring(delimiterIdx + 1);
  if (!pendingLinkDataStr) {
    throw new Error('Invalid pending link ID');
  }

  let linkData: any;
  try {
    linkData = JSON.parse(Buffer.from(pendingLinkDataStr, 'base64url').toString());
  } catch {
    throw new Error('Invalid pending link data');
  }

  if (linkData.expiresAt < Date.now()) {
    throw new Error('Link request has expired');
  }

  // Get the existing user
  const existingUser = await db.query.users.findFirst({
    where: eq(users.id, linkData.existingUserId)
  });

  if (!existingUser) {
    throw new Error('User not found');
  }

  // Get Google user info
  const googleUser = await getGoogleUserInfo(googleTokens.access_token);

  // Verify the Google ID matches
  if (googleUser.id !== linkData.providerId) {
    throw new Error('Google account mismatch');
  }

  // Update user with Google ID
  await db.update(users)
    .set({
      googleId: googleUser.id,
      linkedAccounts: {
        providers: [
          ...(existingUser.linkedAccounts?.providers || []),
          {
            provider: 'google',
            providerId: googleUser.id,
            email: googleUser.email,
            linkedAt: new Date().toISOString()
          }
        ]
      },
      updatedAt: new Date()
    })
    .where(eq(users.id, existingUser.id));

  // Store Google connection
  await upsertSocialConnection(existingUser.id, 'google', {
    platformUserId: googleUser.id,
    platformUsername: googleUser.email,
    platformDisplayName: googleUser.name || googleUser.email,
    accessToken: googleTokens.access_token,
    refreshToken: googleTokens.refresh_token,
    tokenExpiresAt: googleTokens.expires_in ? 
      new Date(Date.now() + googleTokens.expires_in * 1000) : null,
    profileData: {
      email: googleUser.email,
      verified: googleUser.verified_email,
      picture: googleUser.picture,
      locale: googleUser.locale
    }
  });

  // Generate tokens
  const accessToken = signAccessToken({
    id: existingUser.id,
    email: existingUser.email,
    provider: 'google'
  });
  const refreshToken = signRefreshToken({ id: existingUser.id });

  return {
    user: {
      id: existingUser.id,
      email: existingUser.email,
      username: existingUser.username,
      userType: existingUser.userType,
      role: existingUser.role,
      profileData: existingUser.profileData,
      onboardingState: existingUser.onboardingState,
    },
    accessToken,
    refreshToken,
    isNewUser: false
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshGoogleTokens(refreshToken: string): Promise<GoogleTokenResponse> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('Google OAuth credentials not configured');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    }).toString()
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Google Auth] Token refresh error:', errorText);
    throw new Error(`Google token refresh failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Helper function to upsert social connection
 */
async function upsertSocialConnection(
  userId: string,
  platform: string,
  data: {
    platformUserId: string;
    platformUsername?: string;
    platformDisplayName?: string;
    accessToken?: string;
    refreshToken?: string;
    tokenExpiresAt?: Date | null;
    profileData?: any;
  }
) {
  const existing = await db.query.socialConnections.findFirst({
    where: and(
      eq(socialConnections.userId, userId),
      eq(socialConnections.platform, platform)
    )
  });

  if (existing) {
    await db.update(socialConnections)
      .set({
        ...data,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      })
      .where(eq(socialConnections.id, existing.id));
  } else {
    await db.insert(socialConnections).values({
      userId,
      platform,
      ...data,
      connectedAt: new Date(),
      isActive: true
    } as any);
  }
}

/**
 * Generate a unique username
 */
function generateUsername(base: string): string {
  // Clean the base string
  const cleaned = base.toLowerCase().replace(/[^a-z0-9]/g, '');
  const suffix = nanoid(6).toLowerCase();
  return `${cleaned}_${suffix}`;
}

/**
 * Get OAuth URL for Google sign-in
 */
export function getGoogleAuthUrl(redirectUri: string, state?: string): string {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('Google OAuth credentials not configured');
  }

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    ...(state && { state })
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
