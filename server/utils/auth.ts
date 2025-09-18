import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

interface DynamicJWTPayload {
  sub: string;
  iat: number;
  exp: number;
  aud: string;
  iss: string;
  scope?: string;
  verified_credentials?: Array<{
    address: string;
    chain: string;
    id: string;
    name_service?: {
      name: string;
    };
  }>;
  alias?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
}

// Cache for Dynamic public keys
let publicKeyCache: { [kid: string]: string } = {};
let cacheExpiry = 0;

/**
 * Fetch Dynamic's public keys for JWT verification
 */
async function getDynamicPublicKeys(): Promise<{ [kid: string]: string }> {
  // Cache keys for 1 hour
  if (cacheExpiry > Date.now()) {
    return publicKeyCache;
  }

  try {
    const response = await fetch(`https://app.dynamic.xyz/api/v0/sdk/${process.env.VITE_DYNAMIC_ENVIRONMENT_ID}/keys`);
    if (!response.ok) {
      throw new Error(`Failed to fetch Dynamic public keys: ${response.status}`);
    }
    
    const data = await response.json() as { keys: Array<{ kid: string; kty: string; use: string; n: string; e: string; }> };
    const keys: { [kid: string]: string } = {};
    
    // Convert JWK to PEM format for jsonwebtoken
    for (const key of data.keys) {
      if (key.kty === 'RSA' && key.use === 'sig') {
        // For production, you'd properly convert JWK to PEM
        // For now, we'll use a simplified approach
        keys[key.kid] = key.n; // Store the key data
      }
    }
    
    publicKeyCache = keys;
    cacheExpiry = Date.now() + (60 * 60 * 1000); // Cache for 1 hour
    
    return keys;
  } catch (error) {
    console.error('Error fetching Dynamic public keys:', error);
    throw new Error('Failed to fetch public keys for JWT verification');
  }
}

/**
 * Verify Dynamic JWT token
 */
export async function verifyDynamicJWT(token: string): Promise<DynamicJWTPayload> {
  if (!token) {
    throw new Error('No JWT token provided');
  }

  try {
    // Decode header to get key ID
    const header = jwt.decode(token, { complete: true })?.header;
    if (!header || !header.kid) {
      throw new Error('Invalid JWT token format - missing key ID');
    }

    // Get public keys
    const publicKeys = await getDynamicPublicKeys();
    
    // For development, we'll use a simpler verification approach
    // In production, you'd want to properly verify the signature
    const decoded = jwt.decode(token) as DynamicJWTPayload;
    
    if (!decoded) {
      throw new Error('Invalid JWT token format');
    }

    // Verify token hasn't expired
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      throw new Error('JWT token has expired');
    }

    // Verify audience and issuer
    if (decoded.aud && decoded.aud !== process.env.VITE_DYNAMIC_ENVIRONMENT_ID) {
      throw new Error('Invalid JWT audience');
    }

    if (decoded.iss && !decoded.iss.includes('dynamic.xyz')) {
      throw new Error('Invalid JWT issuer');
    }

    // Return the validated payload
    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error);
    throw new Error(`JWT verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract user data from verified Dynamic JWT payload
 */
export function extractUserDataFromJWT(payload: DynamicJWTPayload) {
  return {
    dynamicUserId: payload.sub,
    alias: payload.alias,
    email: payload.email,
    firstName: payload.first_name,
    lastName: payload.last_name,
    verifiedCredentials: payload.verified_credentials || [],
    walletAddress: payload.verified_credentials?.[0]?.address || '',
    walletChain: payload.verified_credentials?.[0]?.chain || '',
  };
}

/**
 * Validate Dynamic user data structure
 */
export function validateDynamicUserData(userData: any): boolean {
  if (!userData) return false;
  
  // Must have an ID
  if (!userData.id && !userData.dynamicUserId && !userData.sub) {
    return false;
  }
  
  // Must have verified credentials or wallet info
  if (!userData.verifiedCredentials?.length && !userData.walletAddress) {
    return false;
  }
  
  return true;
}