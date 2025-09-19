import jwt, { JwtPayload } from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';

interface DynamicJWTPayload extends JwtPayload {
  sub: string;
  iat: number;
  exp: number;
  aud: string;
  iss: string;
  environment_id: string;
  scope?: string;
  verified_credentials?: Array<{
    address: string;
    chain: string;
    id: string;
    wallet_name?: string;
    name_service?: {
      name: string;
    };
  }>;
  alias?: string;
  email?: string;
  given_name?: string;
  family_name?: string;
}

// Get environment ID from environment variables
const DYNAMIC_ENV_ID = process.env.VITE_DYNAMIC_ENVIRONMENT_ID;

if (!DYNAMIC_ENV_ID) {
  throw new Error('VITE_DYNAMIC_ENVIRONMENT_ID is required for JWT verification');
}

// JWKS URL for Dynamic Labs
const jwksUrl = `https://app.dynamic.xyz/api/v0/sdk/${DYNAMIC_ENV_ID}/.well-known/jwks`;

// Initialize JWKS client with caching for security and performance
const jwksClient = new JwksClient({
  jwksUri: jwksUrl,
  rateLimit: true,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600000, // 10 minutes cache
  timeout: 30000, // 30 seconds timeout
});

/**
 * Get signing key for JWT verification
 */
async function getSigningKey(kid: string): Promise<string> {
  try {
    const key = await jwksClient.getSigningKey(kid);
    return key.getPublicKey();
  } catch (error) {
    console.error('Error fetching signing key:', error);
    throw new Error('Failed to fetch signing key for JWT verification');
  }
}

/**
 * Verify Dynamic JWT token using their JWKS endpoint
 */
export async function verifyDynamicJWT(token: string): Promise<DynamicJWTPayload> {
  if (!token) {
    throw new Error('No JWT token provided');
  }

  try {
    // Decode header to get key ID
    const decodedHeader = jwt.decode(token, { complete: true });
    if (!decodedHeader || !decodedHeader.header.kid) {
      throw new Error('Invalid JWT token - missing key ID in header');
    }

    // Debug: decode the token without verification to see its claims
    const decodedPayload = jwt.decode(token) as any;
    console.log('Debug JWT payload:', {
      audience: decodedPayload?.aud,
      expectedAudience: DYNAMIC_ENV_ID,
      issuer: decodedPayload?.iss,
      sub: decodedPayload?.sub
    });

    // Get signing key from Dynamic's JWKS endpoint
    const signingKey = await getSigningKey(decodedHeader.header.kid);

    // Verify JWT signature and claims - skip audience verification since it's domain-based
    const decodedToken = jwt.verify(token, signingKey, {
      algorithms: ['RS256'], // Dynamic uses RS256
      issuer: `https://app.dynamic.xyz/${DYNAMIC_ENV_ID}`, // Verify issuer includes our environment
      ignoreExpiration: false,
      // Skip audience verification - it contains the domain, not environment ID
    }) as DynamicJWTPayload;

    // Additional validation for Dynamic-specific requirements
    if (decodedToken.scope && decodedToken.scope.includes('requiresAdditionalAuth')) {
      throw new Error('Token requires additional authentication (MFA)');
    }

    // Validate required claims
    if (!decodedToken.sub) {
      throw new Error('Invalid JWT token - missing subject (user ID)');
    }

    // Validate environment ID matches our environment
    if (decodedToken.environment_id !== DYNAMIC_ENV_ID) {
      throw new Error(`Invalid JWT token - environment ID mismatch. Expected: ${DYNAMIC_ENV_ID}, got: ${decodedToken.environment_id}`);
    }

    return decodedToken;
  } catch (error) {
    console.error('JWT verification failed:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error(`Invalid JWT token: ${error.message}`);
    } else if (error instanceof jwt.TokenExpiredError) {
      throw new Error('JWT token has expired');
    } else if (error instanceof jwt.NotBeforeError) {
      throw new Error('JWT token not active yet');
    } else {
      throw new Error(`JWT verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
    firstName: payload.given_name,
    lastName: payload.family_name,
    verifiedCredentials: payload.verified_credentials || [],
    walletAddress: payload.verified_credentials?.[0]?.address || '',
    walletChain: payload.verified_credentials?.[0]?.chain || '',
  };
}

/**
 * Validate that user data contains required fields
 */
export function validateUserData(userData: any): boolean {
  if (!userData) return false;
  
  // Must have a Dynamic user ID
  if (!userData.dynamicUserId) {
    return false;
  }
  
  // Must have verified credentials (wallet connection)
  if (!userData.verifiedCredentials || userData.verifiedCredentials.length === 0) {
    return false;
  }
  
  return true;
}