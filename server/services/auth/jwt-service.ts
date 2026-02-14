import jwt from 'jsonwebtoken';
import type { JwtPayload, SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';

export interface JWTUserPayload extends JwtPayload {
  sub: string;           // User ID
  email: string | null;
  provider?: string;     // Auth provider used (google, twitter, etc.)
  iat?: number;
  exp?: number;
}

export interface JWK {
  kty: string;
  n: string;
  e: string;
  alg: string;
  use: string;
  kid: string;
}

export interface JWKS {
  keys: JWK[];
}

// Key ID for the current signing key
const KEY_ID = 'fandomly-auth-key-1';

// JWT configuration
const JWT_ISSUER = process.env.JWT_ISSUER || 'https://fandomly.com';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'crossmint';
const JWT_EXPIRY_SECONDS = parseInt(process.env.JWT_EXPIRY_SECONDS || '86400', 10); // 24 hours default
const REFRESH_TOKEN_EXPIRY_SECONDS = parseInt(process.env.REFRESH_TOKEN_EXPIRY_SECONDS || '604800', 10); // 7 days default

// Get keys from environment or generate for development
let privateKey: string;
let publicKey: string;

function initializeKeys() {
  if (process.env.AUTH_PRIVATE_KEY && process.env.AUTH_PUBLIC_KEY) {
    // Use keys from environment (production)
    privateKey = process.env.AUTH_PRIVATE_KEY.replace(/\\n/g, '\n');
    publicKey = process.env.AUTH_PUBLIC_KEY.replace(/\\n/g, '\n');
    console.log('[JWT Service] Using keys from environment variables');
  } else {
    // Generate keys for development
    console.log('[JWT Service] Generating development RSA keypair...');
    const { privateKey: privKey, publicKey: pubKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });
    privateKey = privKey;
    publicKey = pubKey;
    
    // Log the keys so they can be saved for development
    console.log('[JWT Service] Development keys generated. Set these in .env for persistence:');
    console.log('AUTH_PRIVATE_KEY=' + JSON.stringify(privKey));
    console.log('AUTH_PUBLIC_KEY=' + JSON.stringify(pubKey));
  }
}

// Initialize keys on module load
initializeKeys();

/**
 * Sign an access token for a user
 */
export function signAccessToken(user: { id: string; email: string | null; provider?: string }): string {
  const payload: JWTUserPayload = {
    sub: user.id,
    email: user.email,
    provider: user.provider,
  };

  const options: SignOptions = {
    algorithm: 'RS256',
    expiresIn: JWT_EXPIRY_SECONDS,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    keyid: KEY_ID,
  };

  return jwt.sign(payload, privateKey, options);
}

/**
 * Sign a refresh token for a user
 */
export function signRefreshToken(user: { id: string }): string {
  const payload = {
    sub: user.id,
    type: 'refresh',
  };

  const options: SignOptions = {
    algorithm: 'RS256',
    expiresIn: REFRESH_TOKEN_EXPIRY_SECONDS,
    issuer: JWT_ISSUER,
    keyid: KEY_ID,
  };

  return jwt.sign(payload, privateKey, options);
}

/**
 * Verify an access token and return the payload
 */
export function verifyAccessToken(token: string): JWTUserPayload {
  try {
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as JWTUserPayload;
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error(`Invalid token: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Verify a refresh token and return the payload
 */
export function verifyRefreshToken(token: string): { sub: string; type: string } {
  try {
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: JWT_ISSUER,
    }) as { sub: string; type: string };
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error(`Invalid refresh token: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Decode a token without verification (for debugging)
 */
export function decodeToken(token: string): JWTUserPayload | null {
  return jwt.decode(token) as JWTUserPayload | null;
}

/**
 * Convert public key to JWK format for JWKS endpoint
 */
export function getJWKS(): JWKS {
  // Parse the PEM public key to extract modulus and exponent
  const keyObject = crypto.createPublicKey(publicKey);
  const jwk = keyObject.export({ format: 'jwk' });
  
  return {
    keys: [
      {
        kty: 'RSA',
        n: jwk.n as string,
        e: jwk.e as string,
        alg: 'RS256',
        use: 'sig',
        kid: KEY_ID,
      }
    ]
  };
}

/**
 * Get the public key in PEM format
 */
export function getPublicKey(): string {
  return publicKey;
}

/**
 * Check if a token is close to expiry (within 5 minutes)
 */
export function isTokenExpiringSoon(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as JWTUserPayload;
    if (!decoded || !decoded.exp) return true;
    
    const expiresAt = decoded.exp * 1000; // Convert to milliseconds
    const fiveMinutes = 5 * 60 * 1000;
    
    return Date.now() > expiresAt - fiveMinutes;
  } catch {
    return true;
  }
}
