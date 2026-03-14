/**
 * OAuth Token Encryption/Decryption
 *
 * Encrypts OAuth access and refresh tokens before storing in the database.
 * Uses AES-256-GCM for authenticated encryption.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('TOKEN_ENCRYPTION_KEY is required in production');
    }
    console.warn(
      '[TokenEncryption] TOKEN_ENCRYPTION_KEY not set, using fallback. Set this in production!'
    );
    return Buffer.from('0'.repeat(64), 'hex'); // 32-byte zero key for dev only
  }
  // Key should be a 64-char hex string (32 bytes)
  if (key.length !== 64) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
  }
  return Buffer.from(key, 'hex');
}

/**
 * Encrypt a token string. Returns base64-encoded ciphertext with IV and auth tag prepended.
 * Format: base64(iv + authTag + ciphertext)
 */
export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Prepend IV and auth tag to ciphertext
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString('base64');
}

/**
 * Decrypt a token string. Expects base64-encoded input from encryptToken.
 */
export function decryptToken(ciphertext: string): string {
  const key = getEncryptionKey();
  const combined = Buffer.from(ciphertext, 'base64');

  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  return decrypted.toString('utf8');
}

/**
 * Check if a token looks like it's already encrypted (base64 with expected length).
 * Encrypted tokens are always longer than the original and are base64-encoded.
 */
export function isEncrypted(token: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64');
    // Must be at least IV + AuthTag + 1 byte of data
    return decoded.length > IV_LENGTH + AUTH_TAG_LENGTH;
  } catch {
    return false;
  }
}

/**
 * Safely decrypt a token that may or may not be encrypted.
 * Returns the original string if decryption fails (for backwards compatibility with unencrypted tokens).
 */
export function safeDecryptToken(token: string): string {
  if (!token) return token;
  try {
    return decryptToken(token);
  } catch {
    // Token is likely not encrypted (pre-migration), return as-is
    return token;
  }
}
