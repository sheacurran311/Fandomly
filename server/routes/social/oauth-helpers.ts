/* eslint-disable @typescript-eslint/no-explicit-any, no-empty */
import crypto from 'crypto';
import { URLSearchParams } from 'url';

// Server-side code idempotency
export const usedCodeCache = new Map<string, number>(); // code -> expiryMillis
export const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function pruneUsedCodes() {
  const now = Date.now();
  for (const [k, v] of Array.from(usedCodeCache.entries())) {
    if (v < now) usedCodeCache.delete(k);
  }
}
setInterval(pruneUsedCodes, 60 * 1000).unref();

// Instagram Business Login token exchange
export async function exchangeInstagramToken(
  code: string,
  redirectUri: string,
  userType: string = 'creator'
) {
  const clientId =
    userType === 'creator' ? process.env.INSTAGRAM_CREATOR_APP_ID : process.env.INSTAGRAM_CLIENT_ID;
  const clientSecret =
    userType === 'creator' ? process.env.INSTAGRAM_APP_SECRET : process.env.INSTAGRAM_CLIENT_SECRET;

  console.log('[Instagram Token Exchange] Request details:', {
    userType,
    clientId,
    hasClientSecret: !!clientSecret,
    redirectUri,
    codeLength: code.length,
  });

  if (!clientSecret) {
    throw new Error(`Instagram client secret not configured for ${userType}`);
  }

  const requestBody = {
    client_id: clientId!,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    code,
  };

  console.log('[Instagram Token Exchange] Making request to Instagram API...');
  const response = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(requestBody).toString(),
  });

  console.log('[Instagram Token Exchange] Instagram API response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Instagram Token Exchange] Instagram API error:', errorText);
    throw new Error(`Instagram token exchange failed: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  console.log('[Instagram Token Exchange] Success, received token data:', {
    hasAccessToken: !!result.access_token,
    hasData: !!result.data,
    dataLength: result.data?.length,
  });

  return result;
}

// TikTok Login Kit token exchange
export async function exchangeTikTokToken(code: string, redirectUri?: string) {
  console.log('[TikTok Token Exchange] Request details:', {
    hasClientKey: !!process.env.TIKTOK_CLIENT_KEY,
    clientKeyPrefix: process.env.TIKTOK_CLIENT_KEY?.substring(0, 5) + '...',
    clientKeyLength: process.env.TIKTOK_CLIENT_KEY?.length,
    hasClientSecret: !!process.env.TIKTOK_CLIENT_SECRET,
    clientSecretLength: process.env.TIKTOK_CLIENT_SECRET?.length,
    redirectUri,
    codeLength: code.length,
  });

  if (!process.env.TIKTOK_CLIENT_KEY || !process.env.TIKTOK_CLIENT_SECRET) {
    throw new Error('TikTok client credentials not configured');
  }

  if (!redirectUri) {
    throw new Error('redirect_uri is required for TikTok token exchange');
  }

  // TikTok API v2 requires these exact parameters
  const requestBody = {
    client_key: process.env.TIKTOK_CLIENT_KEY,
    client_secret: process.env.TIKTOK_CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  };

  console.log('[TikTok Token Exchange] Request body:', {
    client_key: requestBody.client_key,
    hasClientSecret: !!requestBody.client_secret,
    code: requestBody.code.substring(0, 20) + '...',
    grant_type: requestBody.grant_type,
    redirect_uri: requestBody.redirect_uri,
  });

  console.log('[TikTok Token Exchange] Making request to TikTok API v2...');
  // TikTok API v2 uses /v2/oauth/token/ endpoint
  const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cache-Control': 'no-cache',
    },
    body: new URLSearchParams(requestBody).toString(),
  });

  console.log('[TikTok Token Exchange] TikTok API response status:', response.status);

  const result = await response.json();

  console.log('[TikTok Token Exchange] Raw response:', JSON.stringify(result));

  // TikTok API v2 response structure (per official docs):
  // Success: { access_token, open_id, refresh_token, expires_in, ... } (flat structure)
  // Error: { error, error_description, log_id }

  if (result.error) {
    const errorMessage = result.error_description || result.error;
    console.error('[TikTok Token Exchange] TikTok API error:', {
      error: result.error,
      error_description: result.error_description,
      log_id: result.log_id,
    });
    throw new Error(`TikTok token exchange failed: ${errorMessage}`);
  }

  if (!result.access_token) {
    console.error('[TikTok Token Exchange] No access_token in response:', result);
    throw new Error('TikTok API did not return access_token');
  }

  console.log('[TikTok Token Exchange] Success! Token data:', {
    hasAccessToken: !!result.access_token,
    hasOpenId: !!result.open_id,
    hasRefreshToken: !!result.refresh_token,
    expiresIn: result.expires_in,
    scope: result.scope,
  });

  // Return the result directly (access_token, open_id, refresh_token are at root level)
  return result;
}

// Twitter API v2 token exchange (PKCE + confidential client)
export async function exchangeTwitterToken(
  code: string,
  redirectUri: string,
  codeVerifier: string
) {
  const clientId = process.env.TWITTER_CLIENT_ID!;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET!;

  try {
    console.log(
      '[Twitter Server] CLIENT_ID fingerprint:',
      clientId.slice(0, 6),
      '...',
      clientId.slice(-6)
    );
    console.log('[Twitter Server] Using redirect_uri for exchange:', redirectUri);
    console.log('[Twitter Server] Auth mode: PKCE + confidential (Basic auth)');
  } catch {}

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
    // Using Basic auth instead of client_id/client_secret in body
  }).toString();

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  // Add Basic auth for confidential client
  if (clientId && clientSecret) {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    headers.Authorization = `Basic ${basic}`;
  }

  const response = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers,
    body: params,
  });

  const text = await response.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return {
    ok: response.ok,
    status: response.status,
    body: json ?? { error: 'invalid_response', error_description: text },
  };
}

// YouTube Data API token exchange
// Now uses dedicated YouTube OAuth client (GOOGLE_YOUTUBE_CLIENT_ID)
export async function exchangeYouTubeToken(code: string, redirectUri: string) {
  const { exchangeYouTubeCode } = await import('../../services/auth/youtube-auth');
  return exchangeYouTubeCode(code, redirectUri);
}

// YouTube token refresh
// Now uses dedicated YouTube OAuth client (GOOGLE_YOUTUBE_CLIENT_ID)
export async function refreshYouTubeToken(refreshToken: string) {
  const { refreshYouTubeTokens } = await import('../../services/auth/youtube-auth');
  return refreshYouTubeTokens(refreshToken);
}

// Spotify Web API token exchange
export async function exchangeSpotifyToken(code: string, redirectUri: string) {
  console.log('[Spotify Token Exchange] Request details:', {
    hasClientId: !!process.env.SPOTIFY_CLIENT_ID,
    hasClientSecret: !!process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri,
    codeLength: code.length,
  });

  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    throw new Error('Spotify client credentials not configured');
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }).toString(),
  });

  console.log('[Spotify Token Exchange] Response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Spotify Token Exchange] Error:', errorText);
    throw new Error(`Spotify token exchange failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

// Spotify token refresh
export async function refreshSpotifyToken(refreshToken: string) {
  console.log('[Spotify Token Refresh] Refreshing token...');

  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    throw new Error('Spotify client credentials not configured');
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
  });

  console.log('[Spotify Token Refresh] Response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Spotify Token Refresh] Error:', errorText);
    throw new Error(`Spotify token refresh failed: ${response.status}`);
  }

  return response.json();
}

// Discord OAuth token exchange
export async function exchangeDiscordToken(code: string, redirectUri: string) {
  console.log('[Discord Token Exchange] Request details:', {
    hasClientId: !!process.env.DISCORD_CLIENT_ID,
    hasClientSecret: !!process.env.DISCORD_CLIENT_SECRET,
    redirectUri,
    codeLength: code.length,
  });

  if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET) {
    throw new Error(
      'Discord client credentials not configured. Required: DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET'
    );
  }

  const response = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }).toString(),
  });

  console.log('[Discord Token Exchange] Response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Discord Token Exchange] Error:', errorText);
    throw new Error(`Discord token exchange failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

// Get Discord user info
export async function getDiscordUser(accessToken: string) {
  console.log('[Discord User Info] Fetching user data...');

  const response = await fetch('https://discord.com/api/users/@me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Discord User Info] Error:', errorText);
    throw new Error(`Failed to fetch Discord user info: ${response.status}`);
  }

  return response.json();
}

// Twitch OAuth token exchange
export async function exchangeTwitchToken(code: string, redirectUri: string) {
  console.log('[Twitch Token Exchange] Request details:', {
    hasClientId: !!process.env.TWITCH_CLIENT_ID,
    hasClientSecret: !!process.env.TWITCH_CLIENT_SECRET,
    redirectUri,
    codeLength: code.length,
  });

  if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
    throw new Error('Twitch client credentials not configured');
  }

  const response = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }).toString(),
  });

  console.log('[Twitch Token Exchange] Response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Twitch Token Exchange] Error:', errorText);
    throw new Error(`Twitch token exchange failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

// Get Twitch user info
export async function getTwitchUser(accessToken: string) {
  console.log('[Twitch User Info] Fetching user data...');

  const response = await fetch('https://api.twitch.tv/helix/users', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Client-Id': process.env.TWITCH_CLIENT_ID!,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Twitch User Info] Error:', errorText);
    throw new Error(`Failed to fetch Twitch user info: ${response.status}`);
  }

  const data = await response.json();
  return data.data && data.data.length > 0 ? data.data[0] : null;
}

// Get TikTok user info
export async function getTikTokUser(accessToken: string) {
  console.log('[TikTok User Info] Fetching user data...');

  // TikTok API v2 uses GET request with query parameters
  const fields = [
    'open_id',
    'union_id',
    'avatar_url',
    'display_name',
    'follower_count',
    'following_count',
    'likes_count',
    'video_count',
  ];
  const url = `https://open.tiktokapis.com/v2/user/info/?fields=${fields.join(',')}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  console.log('[TikTok User Info] Response status:', response.status);

  const result = await response.json();

  console.log('[TikTok User Info] Raw response:', JSON.stringify(result));

  // TikTok Display API v2 response structure:
  // Success: { data: { user: { ... } }, error: { code: "ok", message: "", log_id: "..." } }
  // Error: { error: { code: "error_code", message: "...", log_id: "..." } }
  // Note: TikTok ALWAYS returns an "error" object, but code "ok" means success!

  if (result.error && result.error.code !== 'ok') {
    const errorMessage = result.error.message || result.error.code || JSON.stringify(result.error);
    console.error('[TikTok User Info] TikTok API error:', result.error);
    throw new Error(`TikTok user info failed: ${errorMessage}`);
  }

  // Display API actually does use nested structure
  if (!result.data || !result.data.user) {
    console.error('[TikTok User Info] Missing user data in response:', result);
    throw new Error('TikTok API did not return user data');
  }

  console.log('[TikTok User Info] Success! User data:', {
    open_id: result.data.user.open_id,
    display_name: result.data.user.display_name,
    follower_count: result.data.user.follower_count,
  });

  // Return the full result (keeps data.user structure for callback)
  return result;
}

// Get Twitter user info
export async function getTwitterUser(accessToken: string) {
  const response = await fetch(
    'https://api.twitter.com/2/users/me?user.fields=id,name,username,public_metrics,profile_image_url,verified',
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  return response.json();
}

// Refresh Twitter tokens (PKCE + confidential client - rotation aware)
export async function refreshTwitterToken(refreshToken: string) {
  const clientId = process.env.TWITTER_CLIENT_ID!;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET!;

  try {
    console.log('[Twitter Server] Refresh with auth mode: PKCE + confidential (Basic auth)');
  } catch {}

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    // Using Basic auth instead of client_id/client_secret in body
  }).toString();

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  // Add Basic auth for confidential client (consistent with exchange)
  if (clientId && clientSecret) {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    headers.Authorization = `Basic ${basic}`;
  }

  const response = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers,
    body: params,
  });

  const text = await response.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return {
    ok: response.ok,
    status: response.status,
    body: json ?? { error: 'invalid_response', error_description: text },
  };
}

// Verify webhook signature
// Note: This requires access to the raw body buffer, which needs special middleware
export function verifyWebhookSignature(body: any, signature: string, rawBody?: Buffer): boolean {
  const appSecret = process.env.INSTAGRAM_APP_SECRET;

  if (!signature || !appSecret) {
    console.log(
      '[Instagram Webhooks] Signature verification skipped - missing signature or app secret:',
      {
        hasSignature: !!signature,
        hasAppSecret: !!appSecret,
      }
    );
    return false;
  }

  // Use raw body if available, otherwise stringify (less reliable)
  const bodyString = rawBody
    ? rawBody.toString('utf8')
    : typeof body === 'string'
      ? body
      : JSON.stringify(body);

  const expectedSignature = crypto.createHmac('sha256', appSecret).update(bodyString).digest('hex');

  const receivedSignature = signature.replace('sha256=', '');

  console.log('[Instagram Webhooks] Signature comparison:', {
    expected: expectedSignature.substring(0, 10) + '...',
    received: receivedSignature.substring(0, 10) + '...',
    bodyType: rawBody ? 'buffer' : typeof body,
    bodyLength: bodyString.length,
  });

  try {
    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    );

    console.log('[Instagram Webhooks] Signature verification:', isValid ? 'VALID' : 'INVALID');
    return isValid;
  } catch (error) {
    console.error('[Instagram Webhooks] Signature verification error:', error);
    return false;
  }
}
