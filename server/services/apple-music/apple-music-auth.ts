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
import crypto from 'crypto';

const APPLE_MUSIC_API_BASE = 'https://api.music.apple.com/v1';

// Token validity: 180 days max per Apple docs. We use 170 days to allow a buffer.
const TOKEN_LIFETIME_SECONDS = 170 * 24 * 60 * 60;

let cachedToken: string | null = null;
let cachedTokenExpiresAt = 0;

/**
 * Normalize an Apple .p8 private key string from an environment variable
 * into a proper PEM that Node's crypto (and jsonwebtoken) will accept.
 *
 * Handles all common env-var storage formats:
 *   - Literal "\n" (escaped newlines from .env parsers / Replit Secrets)
 *   - Actual newline characters
 *   - Key pasted as a single Base64 blob (no PEM headers)
 *   - Key with headers already present
 */
function normalizeApplePrivateKey(raw: string): string {
  // 1. Replace literal escaped newlines with real newlines
  let key = raw.replace(/\\n/g, '\n');

  // 2. Strip any existing PEM headers/footers so we work with raw base64
  key = key
    .replace(/-----BEGIN (EC )?PRIVATE KEY-----/g, '')
    .replace(/-----END (EC )?PRIVATE KEY-----/g, '')
    .replace(/\s+/g, ''); // remove all whitespace

  // 3. Re-wrap into 64-char lines with PKCS#8 PEM headers
  const lines: string[] = [];
  for (let i = 0; i < key.length; i += 64) {
    lines.push(key.substring(i, i + 64));
  }

  return `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----`;
}

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

  const formattedKey = normalizeApplePrivateKey(privateKey);

  // Sanity check: verify Node's crypto can parse it as an EC key
  try {
    const keyObj = crypto.createPrivateKey(formattedKey);
    if (keyObj.asymmetricKeyType !== 'ec') {
      throw new Error(`Expected EC key, got ${keyObj.asymmetricKeyType}`);
    }
  } catch (parseErr: any) {
    console.error('[AppleMusic Auth] Private key parse failed:', parseErr.message);
    console.error(
      '[AppleMusic Auth] Formatted key preview:',
      formattedKey.substring(0, 60) + '...'
    );
    throw new Error(
      `Apple Music private key is invalid. Ensure APPLE_MUSIC_PRIVATE_KEY contains the full .p8 file content. ` +
        `Parse error: ${parseErr.message}`
    );
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
