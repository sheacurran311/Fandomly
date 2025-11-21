import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || 'default-key-change-in-production-32-chars';
const ALGORITHM = 'aes-256-gcm';

// Ensure key is proper length for AES-256
function getKey(): Buffer {
  const key = ENCRYPTION_KEY;
  if (key.length === 64) {
    // Hex string - convert to buffer
    return Buffer.from(key, 'hex');
  }
  // String key - hash to get consistent 32 bytes
  return crypto.createHash('sha256').update(key).digest();
}

export function encryptToken(text: string): string {
  if (!text) return text;
  
  try {
    const key = getKey();
    const iv = crypto.randomBytes(12); // 12 bytes for GCM
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    
    // Combine iv + authTag + encrypted
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted.toString('hex');
  } catch (error) {
    console.warn('[Crypto] Encryption failed, storing plaintext:', error);
    return text; // Fallback to plaintext if encryption fails
  }
}

export function decryptToken(encryptedText: string): string {
  if (!encryptedText || !encryptedText.includes(':')) {
    return encryptedText; // Assume plaintext for backward compatibility
  }
  
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return encryptedText;
    
    const key = getKey();
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = Buffer.from(parts[2], 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    console.warn('[Crypto] Decryption failed, returning as-is:', error);
    return encryptedText; // Fallback to return as-is if decryption fails
  }
}
