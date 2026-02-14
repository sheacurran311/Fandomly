/**
 * Task Filter Types for Cross-Network Verification System
 * 
 * Provides types and utilities for filtering tasks by:
 * - Verification status (automatic, code_required, manual)
 * - Verification tier (T1, T2, T3)
 * - Platform
 * - Task category
 */

// ============================================================================
// VERIFICATION STATUS TYPES
// ============================================================================

/**
 * UI-friendly verification status
 * Maps from technical verification methods to user-understandable categories
 */
export type VerificationStatus = 'automatic' | 'code_required' | 'manual';

/**
 * Verification tiers from the cross-network spec
 */
export type VerificationTier = 'T1' | 'T2' | 'T3';

/**
 * Verification methods
 */
export type VerificationMethod = 
  | 'api'           // T1: Direct API verification
  | 'code_comment'  // T2: Code in comment
  | 'code_repost'   // T2: Code in quote/repost
  | 'hashtag'       // Group goals: Hashtag tracking
  | 'starter_pack'  // T3: Honor system starter pack
  | 'manual';       // T3: Manual creator review

// ============================================================================
// FILTER OPTIONS
// ============================================================================

/**
 * Task filter options for querying/filtering tasks
 */
export interface TaskFilterOptions {
  /** Filter by platform(s) */
  platform?: string[];
  
  /** Filter by verification tier(s) */
  verificationTier?: VerificationTier[];
  
  /** Filter by UI-friendly verification status */
  verificationStatus?: VerificationStatus[];
  
  /** Filter by task category */
  taskCategory?: ('social' | 'trust_anchor' | 'code_verification' | 'starter_pack' | 'group_goal')[];
  
  /** Filter for starter pack tasks only */
  isStarterPack?: boolean;
  
  /** Filter for group goal tasks only */
  isGroupGoal?: boolean;
  
  /** Search query for task name/description */
  searchQuery?: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert verification method and tier to UI-friendly status
 */
export function getVerificationStatus(method: string, tier: string): VerificationStatus {
  // T1 with API method = automatic
  if (tier === 'T1' && method === 'api') {
    return 'automatic';
  }
  
  // T2 with code methods = code_required
  if (tier === 'T2' && (method === 'code_comment' || method === 'code_repost')) {
    return 'code_required';
  }
  
  // Group goals with hashtag method = automatic (T1 aggregate)
  if (method === 'hashtag') {
    return 'automatic';
  }
  
  // Everything else is manual
  return 'manual';
}

/**
 * Get display info for a verification status
 */
export function getVerificationStatusInfo(status: VerificationStatus): {
  label: string;
  description: string;
  color: 'green' | 'blue' | 'amber';
  icon: 'CheckCircle' | 'Code' | 'Eye';
} {
  switch (status) {
    case 'automatic':
      return {
        label: 'Auto-Verified',
        description: 'Verified automatically via API when fan connects their account',
        color: 'green',
        icon: 'CheckCircle',
      };
    case 'code_required':
      return {
        label: 'Code Verified',
        description: 'Fan receives a unique code to include in their comment or post',
        color: 'blue',
        icon: 'Code',
      };
    case 'manual':
      return {
        label: 'Manual Review',
        description: 'You verify this task by checking the fan\'s profile directly',
        color: 'amber',
        icon: 'Eye',
      };
  }
}

/**
 * Get display info for a verification tier
 */
export function getVerificationTierInfo(tier: VerificationTier): {
  label: string;
  trustLevel: string;
  pointsRange: string;
  recommendedPoints: number;
} {
  switch (tier) {
    case 'T1':
      return {
        label: 'API Verified',
        trustLevel: 'High Trust (100%)',
        pointsRange: '50-200 points recommended',
        recommendedPoints: 75,
      };
    case 'T2':
      return {
        label: 'Code Verified',
        trustLevel: 'Medium Trust (85%)',
        pointsRange: '30-85 points recommended',
        recommendedPoints: 40,
      };
    case 'T3':
      return {
        label: 'Honor System',
        trustLevel: 'Lower Trust (50%)',
        pointsRange: '15-25 points recommended',
        recommendedPoints: 20,
      };
  }
}

// ============================================================================
// PLATFORM GROUPINGS
// ============================================================================

/**
 * Platform groups for UI organization
 */
export const PLATFORM_GROUPS = {
  'Social Media': ['twitter', 'instagram', 'facebook', 'tiktok'],
  'Video & Streaming': ['youtube', 'twitch', 'kick'],
  'Music': ['spotify', 'apple_music'],
  'Community': ['discord', 'telegram'],
  'Support': ['patreon'],
} as const;

/**
 * Get the group a platform belongs to
 */
export function getPlatformGroup(platform: string): string | undefined {
  for (const [group, platforms] of Object.entries(PLATFORM_GROUPS)) {
    if ((platforms as readonly string[]).includes(platform)) {
      return group;
    }
  }
  return undefined;
}

/**
 * Platform display info
 */
export const PLATFORM_INFO: Record<string, {
  name: string;
  icon: string;
  color: string;
  tier1Available: boolean;
}> = {
  twitter: { name: 'X (Twitter)', icon: 'Twitter', color: '#1DA1F2', tier1Available: true },
  instagram: { name: 'Instagram', icon: 'Instagram', color: '#E4405F', tier1Available: false },
  facebook: { name: 'Facebook', icon: 'Facebook', color: '#1877F2', tier1Available: false },
  tiktok: { name: 'TikTok', icon: 'Music2', color: '#000000', tier1Available: false },
  youtube: { name: 'YouTube', icon: 'Youtube', color: '#FF0000', tier1Available: true },
  spotify: { name: 'Spotify', icon: 'Music', color: '#1DB954', tier1Available: true },
  discord: { name: 'Discord', icon: 'MessageCircle', color: '#5865F2', tier1Available: true },
  twitch: { name: 'Twitch', icon: 'Twitch', color: '#9146FF', tier1Available: true },
  kick: { name: 'Kick', icon: 'Video', color: '#53FC18', tier1Available: true },
  patreon: { name: 'Patreon', icon: 'Heart', color: '#FF424D', tier1Available: true },
  telegram: { name: 'Telegram', icon: 'Send', color: '#0088CC', tier1Available: false },
  apple_music: { name: 'Apple Music', icon: 'Music', color: '#FA243C', tier1Available: false },
};

// ============================================================================
// FILTER HELPERS
// ============================================================================

/**
 * Check if a task matches the given filters
 */
export function taskMatchesFilters(
  task: {
    platform?: string;
    verificationTier?: string;
    verificationMethod?: string;
    category?: string;
    isStarterPack?: boolean;
    isGroupGoal?: boolean;
    name?: string;
    description?: string;
  },
  filters: TaskFilterOptions
): boolean {
  // Platform filter
  if (filters.platform?.length && task.platform) {
    if (!filters.platform.includes(task.platform)) {
      return false;
    }
  }
  
  // Verification tier filter
  if (filters.verificationTier?.length && task.verificationTier) {
    if (!filters.verificationTier.includes(task.verificationTier as VerificationTier)) {
      return false;
    }
  }
  
  // Verification status filter
  if (filters.verificationStatus?.length && task.verificationMethod && task.verificationTier) {
    const status = getVerificationStatus(task.verificationMethod, task.verificationTier);
    if (!filters.verificationStatus.includes(status)) {
      return false;
    }
  }
  
  // Category filter
  if (filters.taskCategory?.length && task.category) {
    if (!filters.taskCategory.includes(task.category as any)) {
      return false;
    }
  }
  
  // Starter pack filter
  if (filters.isStarterPack !== undefined) {
    if (task.isStarterPack !== filters.isStarterPack) {
      return false;
    }
  }
  
  // Group goal filter
  if (filters.isGroupGoal !== undefined) {
    if (task.isGroupGoal !== filters.isGroupGoal) {
      return false;
    }
  }
  
  // Search query filter
  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    const nameMatch = task.name?.toLowerCase().includes(query);
    const descMatch = task.description?.toLowerCase().includes(query);
    if (!nameMatch && !descMatch) {
      return false;
    }
  }
  
  return true;
}

/**
 * Group tasks by verification status
 */
export function groupTasksByVerificationStatus<T extends { verificationMethod?: string; verificationTier?: string }>(
  tasks: T[]
): Record<VerificationStatus, T[]> {
  const grouped: Record<VerificationStatus, T[]> = {
    automatic: [],
    code_required: [],
    manual: [],
  };
  
  for (const task of tasks) {
    if (task.verificationMethod && task.verificationTier) {
      const status = getVerificationStatus(task.verificationMethod, task.verificationTier);
      grouped[status].push(task);
    } else {
      grouped.manual.push(task);
    }
  }
  
  return grouped;
}

/**
 * Group tasks by platform
 */
export function groupTasksByPlatform<T extends { platform?: string }>(
  tasks: T[]
): Record<string, T[]> {
  const grouped: Record<string, T[]> = {};
  
  for (const task of tasks) {
    const platform = task.platform || 'other';
    if (!grouped[platform]) {
      grouped[platform] = [];
    }
    grouped[platform].push(task);
  }
  
  return grouped;
}
