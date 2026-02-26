/**
 * Particle Network Authentication Service
 *
 * Validates Particle Connect sessions and bridges them to Fandomly's JWT system.
 * When a user logs in via Particle Connect (social login or wallet), this service:
 *   1. Validates the Particle session token against Particle's API
 *   2. Extracts user identity (email, social provider, wallet address)
 *   3. Finds or creates the Fandomly user
 *   4. Issues a Fandomly JWT (preserving our RBAC, user types, etc.)
 *
 * This ensures all 376+ API endpoints continue using our existing auth middleware.
 */

import { db } from '../../db';
import { users } from '@shared/schema';
import { eq, or } from 'drizzle-orm';
import { signAccessToken, signRefreshToken } from './jwt-service';

// Particle Network API configuration
const PARTICLE_PROJECT_ID = process.env.PARTICLE_PROJECT_ID;
const PARTICLE_SERVER_KEY = process.env.PARTICLE_SERVER_KEY;

interface ParticleUserInfo {
  uuid: string;           // Particle's unique user ID
  email?: string;
  name?: string;
  avatar?: string;
  phone?: string;
  provider?: string;      // 'google', 'twitter', 'apple', 'email', etc.
  thirdparty_user_info?: {
    provider_id?: string;
    provider_user_id?: string;
  };
  wallets?: Array<{
    chain_name: string;
    public_address: string;
  }>;
}

interface ParticleAuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string | null;
    username: string;
    userType: string;
    role: string;
    profileData: any;
    onboardingState: any;
    avatar?: string;
    avalancheL1Address?: string;
  };
  accessToken?: string;
  isNewUser?: boolean;
  error?: string;
}

/**
 * Validate a Particle session token by calling Particle's server API.
 * Returns the Particle user info if valid.
 */
export async function validateParticleToken(
  token: string,
  projectId?: string,
  serverKey?: string
): Promise<ParticleUserInfo | null> {
  const pId = projectId || PARTICLE_PROJECT_ID;
  const sKey = serverKey || PARTICLE_SERVER_KEY;

  if (!pId || !sKey) {
    console.error('[Particle Auth] Missing PARTICLE_PROJECT_ID or PARTICLE_SERVER_KEY');
    return null;
  }

  try {
    // Particle's server-side token validation endpoint
    const response = await fetch('https://api.particle.network/server/rpc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Basic auth with project credentials
        'Authorization': `Basic ${Buffer.from(`${pId}:${sKey}`).toString('base64')}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getUserInfo',
        params: [token],
      }),
    });

    if (!response.ok) {
      console.error('[Particle Auth] API returned', response.status);
      return null;
    }

    const data = await response.json();

    if (data.error) {
      console.error('[Particle Auth] API error:', data.error);
      return null;
    }

    return data.result as ParticleUserInfo;
  } catch (error) {
    console.error('[Particle Auth] Validation error:', error);
    return null;
  }
}

/**
 * Handle a Particle Connect login callback.
 * Validates the token, finds/creates the user, and issues a Fandomly JWT.
 */
export async function handleParticleCallback(
  particleToken: string,
  walletAddress: string
): Promise<ParticleAuthResult> {
  // 1. Validate the Particle token
  const particleUser = await validateParticleToken(particleToken);
  if (!particleUser) {
    return { success: false, error: 'Invalid Particle session token' };
  }

  const email = particleUser.email || null;
  const provider = particleUser.provider || 'particle';
  const particleUuid = particleUser.uuid;

  // 2. Find existing user by:
  //    a) Particle UUID (returning user via Particle)
  //    b) Email match (migrating user from legacy auth)
  let existingUser = null;

  // Try Particle UUID first
  try {
    const [byParticleId] = await db
      .select()
      .from(users)
      .where(eq(users.particleUserId as any, particleUuid))
      .limit(1);

    if (byParticleId) {
      existingUser = byParticleId;
    }
  } catch {
    // particleUserId column may not exist yet (pre-migration)
  }

  // Try email match if no Particle match found
  if (!existingUser && email) {
    const [byEmail] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (byEmail) {
      existingUser = byEmail;
    }
  }

  let isNewUser = false;
  let userId: string;

  if (existingUser) {
    // 3a. Existing user -- update with Particle + wallet info
    userId = existingUser.id;

    const updateData: Record<string, any> = {};

    // Set Particle UUID if not already set
    if (!existingUser.particleUserId) {
      updateData.particleUserId = particleUuid;
    }

    // Set wallet address if provided and not already set
    if (walletAddress && !existingUser.avalancheL1Address) {
      updateData.avalancheL1Address = walletAddress;
    }

    // Enable blockchain features
    if (!existingUser.blockchainEnabled) {
      updateData.blockchainEnabled = true;
    }

    if (Object.keys(updateData).length > 0) {
      await db.update(users).set(updateData).where(eq(users.id, userId));
    }
  } else {
    // 3b. New user -- create with Particle + wallet info
    isNewUser = true;

    const username = email
      ? email.split('@')[0] + '_' + Math.random().toString(36).slice(2, 6)
      : `user_${particleUuid.slice(0, 8)}`;

    const [newUser] = await db
      .insert(users)
      .values({
        email,
        username,
        userType: 'pending',
        role: 'customer_end_user',
        particleUserId: particleUuid,
        avalancheL1Address: walletAddress || null,
        blockchainEnabled: true,
        profileData: {
          name: particleUser.name || null,
          avatar: particleUser.avatar || null,
          authProvider: provider,
        },
        onboardingState: { step: 'user_type_selection' },
      } as any)
      .returning();

    userId = newUser.id;
  }

  // 4. Fetch the full user record for the response
  const [fullUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!fullUser) {
    return { success: false, error: 'Failed to fetch user after creation' };
  }

  // 5. Issue Fandomly JWT
  const accessToken = signAccessToken({
    id: fullUser.id,
    email: fullUser.email,
    provider: 'particle',
  });

  return {
    success: true,
    user: {
      id: fullUser.id,
      email: fullUser.email,
      username: fullUser.username,
      userType: fullUser.userType,
      role: fullUser.role,
      profileData: fullUser.profileData,
      onboardingState: fullUser.onboardingState,
      avatar: (fullUser.profileData as any)?.avatar,
      avalancheL1Address: walletAddress || (fullUser as any).avalancheL1Address,
    },
    accessToken,
    isNewUser,
  };
}
