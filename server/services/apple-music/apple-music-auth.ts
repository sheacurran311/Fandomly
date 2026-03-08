/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Apple Music Developer Token Service
 *
 * Generates and caches the Apple Music developer JWT required for all
 * Apple Music API calls. Uses ES256 (ECDSA with P-256 and SHA-256).
 *
 * Env vars:
 *   APPLE_MUSIC_KEY_ID      - Key ID from Apple Developer portal
 *   APPLE_MUSIC_TEAM_ID     - Apple Developer Team ID
 *   APPLE_MUSIC_PRIVATE_KEY - ES256 private key (.p8 file contents)
 */

import jwt from 'jsonwebtoken';

const APPLE_MUSIC_API_BASE = 'https://api.music.apple.com/v1';

// Token validity: 180 days max per Apple docs. We use 170 days to allow a buffer.
const TOKEN_LIFETIME_SECONDS = 170 * 24 * 60 * 60;

let cachedToken: string | null = null;
let cachedTokenExpiresAt = 0;

/**
 * Generate (or return cached) Apple Music developer JWT.
 */
export function getAppleMusicDeveloperToken(): string {
  if (cachedToken && Date.now() < cachedTokenExpiresAt) {
    return cachedToken;
  }

  const keyId = process.env.APPLE_MUSIC_KEY_ID;
  const teamId = process.env.APPLE_MUSIC_TEAM_ID;
  const privateKey = process.env.APPLE_MUSIC_PRIVATE_KEY;

  if (!keyId || !teamId || !privateKey) {
    throw new Error(
      'Apple Music credentials not configured. Set APPLE_MUSIC_KEY_ID, APPLE_MUSIC_TEAM_ID, and APPLE_MUSIC_PRIVATE_KEY.'
    );
  }

  // Apple private keys from .p8 files may have escaped newlines when stored
  // in env vars. Restore them so jsonwebtoken can parse the PEM.
  let formattedKey = privateKey.replace(/\\n/g, '\n');

  // Ensure the key has proper PEM headers
  if (!formattedKey.includes('-----BEGIN PRIVATE KEY-----')) {
    formattedKey = `-----BEGIN PRIVATE KEY-----\n${formattedKey}\n-----END PRIVATE KEY-----`;
  }

  let token: string;
  try {
    token = jwt.sign({}, formattedKey, {
      algorithm: 'ES256',
      expiresIn: TOKEN_LIFETIME_SECONDS,
      issuer: teamId,
      header: {
        alg: 'ES256',
        kid: keyId,
      },
    });
  } catch (err: any) {
    console.error('[AppleMusic Auth] JWT signing failed:', err.message);
    console.error('[AppleMusic Auth] Key ID:', keyId, 'Team ID:', teamId);
    console.error('[AppleMusic Auth] Key starts with:', formattedKey.substring(0, 40) + '...');
    throw new Error(`Apple Music JWT signing failed: ${err.message}`);
  }

  cachedToken = token;
  cachedTokenExpiresAt = Date.now() + (TOKEN_LIFETIME_SECONDS - 3600) * 1000; // refresh 1h early

  console.info('[AppleMusic Auth] Developer token generated, expires in ~170 days');
  return token;
}

/**
 * Check if Apple Music is configured (env vars present).
 */
export function isAppleMusicConfigured(): boolean {
  return Boolean(
    process.env.APPLE_MUSIC_KEY_ID &&
    process.env.APPLE_MUSIC_TEAM_ID &&
    process.env.APPLE_MUSIC_PRIVATE_KEY
  );
}

/**
 * Helper: make an Apple Music API request with developer token + optional user token.
 */
export async function appleMusicFetch(
  path: string,
  userToken?: string,
  options?: RequestInit
): Promise<Response> {
  const devToken = getAppleMusicDeveloperToken();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${devToken}`,
    'Content-Type': 'application/json',
    ...((options?.headers as Record<string, string>) || {}),
  };

  if (userToken) {
    headers['Music-User-Token'] = userToken;
  }

  const url = path.startsWith('http') ? path : `${APPLE_MUSIC_API_BASE}${path}`;

  return fetch(url, {
    ...options,
    headers,
  });
}

export { APPLE_MUSIC_API_BASE };
