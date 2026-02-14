/**
 * YouTube OAuth Service
 * 
 * Handles YouTube-specific OAuth flow for creators connecting their YouTube channels.
 * This is separate from basic Google authentication to ensure minimal scope requests.
 * 
 * Scopes:
 * - youtube.readonly: Read channel data, subscriptions, likes, comments
 * - openid, email, profile: Basic identity (required for OAuth)
 * 
 * Environment Variables:
 * - GOOGLE_YOUTUBE_CLIENT_ID: YouTube OAuth client ID
 * - GOOGLE_YOUTUBE_CLIENT_SECRET: YouTube OAuth client secret
 */

// YouTube OAuth2 configuration
const YOUTUBE_CLIENT_ID = process.env.GOOGLE_YOUTUBE_CLIENT_ID;
const YOUTUBE_CLIENT_SECRET = process.env.GOOGLE_YOUTUBE_CLIENT_SECRET;

export interface YouTubeTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
  id_token?: string;
}

/**
 * Exchange an authorization code for YouTube OAuth tokens
 * 
 * @param code - Authorization code from YouTube OAuth callback
 * @param redirectUri - Must match the redirect URI registered in Google Cloud Console
 * @returns Token response including access_token and refresh_token
 */
export async function exchangeYouTubeCode(
  code: string, 
  redirectUri: string
): Promise<YouTubeTokenResponse> {
  console.log('[YouTube Auth] Exchanging code for tokens', {
    hasClientId: !!YOUTUBE_CLIENT_ID,
    hasClientSecret: !!YOUTUBE_CLIENT_SECRET,
    redirectUri,
    codeLength: code.length
  });

  if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET) {
    throw new Error('YouTube OAuth credentials not configured. Please set GOOGLE_YOUTUBE_CLIENT_ID and GOOGLE_YOUTUBE_CLIENT_SECRET.');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: YOUTUBE_CLIENT_ID,
      client_secret: YOUTUBE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri
    }).toString()
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[YouTube Auth] Token exchange error:', errorText);
    throw new Error(`YouTube token exchange failed: ${response.status} ${errorText}`);
  }

  const tokens = await response.json();
  
  console.log('[YouTube Auth] Token exchange successful', {
    hasAccessToken: !!tokens.access_token,
    hasRefreshToken: !!tokens.refresh_token,
    expiresIn: tokens.expires_in,
    scope: tokens.scope
  });

  return tokens;
}

/**
 * Refresh YouTube access token using refresh token
 * 
 * @param refreshToken - The refresh token obtained during initial authorization
 * @returns New token response with fresh access_token
 */
export async function refreshYouTubeTokens(
  refreshToken: string
): Promise<YouTubeTokenResponse> {
  console.log('[YouTube Auth] Refreshing access token');

  if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET) {
    throw new Error('YouTube OAuth credentials not configured. Please set GOOGLE_YOUTUBE_CLIENT_ID and GOOGLE_YOUTUBE_CLIENT_SECRET.');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: YOUTUBE_CLIENT_ID,
      client_secret: YOUTUBE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    }).toString()
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[YouTube Auth] Token refresh error:', errorText);
    throw new Error(`YouTube token refresh failed: ${response.status} ${errorText}`);
  }

  const tokens = await response.json();
  
  console.log('[YouTube Auth] Token refresh successful', {
    hasAccessToken: !!tokens.access_token,
    expiresIn: tokens.expires_in
  });

  return tokens;
}

/**
 * Get YouTube OAuth URL for initiating the authorization flow
 * 
 * @param redirectUri - Callback URL (should be https://fandomly.ai/youtube-callback)
 * @param state - Optional CSRF state token
 * @returns Authorization URL to redirect the user to
 */
export function getYouTubeAuthUrl(redirectUri: string, state?: string): string {
  if (!YOUTUBE_CLIENT_ID) {
    throw new Error('YouTube OAuth credentials not configured. Please set GOOGLE_YOUTUBE_CLIENT_ID.');
  }

  const params = new URLSearchParams({
    client_id: YOUTUBE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    // Scopes: youtube.readonly for all YouTube API calls + identity scopes
    scope: 'https://www.googleapis.com/auth/youtube.readonly openid email profile',
    access_type: 'offline', // Request refresh token
    prompt: 'consent', // Force consent screen to ensure refresh token
    ...(state && { state })
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Check if YouTube OAuth credentials are configured
 * 
 * @returns Object with configuration status
 */
export function getYouTubeOAuthStatus() {
  return {
    configured: !!(YOUTUBE_CLIENT_ID && YOUTUBE_CLIENT_SECRET),
    hasClientId: !!YOUTUBE_CLIENT_ID,
    hasClientSecret: !!YOUTUBE_CLIENT_SECRET
  };
}
