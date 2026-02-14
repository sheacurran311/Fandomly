/**
 * Common types and interfaces for platform sync services.
 */

import type { SocialConnection } from '@shared/schema';

export interface AccountMetricsResult {
  success: boolean;
  data?: {
    followers?: number;
    following?: number;
    totalPosts?: number;
    totalViews?: number;
    totalLikes?: number;
    totalComments?: number;
    engagementRate?: number;
    subscribers?: number;
    platformSpecific?: Record<string, any>;
  };
  error?: string;
}

export interface ContentItem {
  platformContentId: string;
  contentType: string; // 'post' | 'video' | 'reel' | 'story' | 'stream' | 'track' | 'short'
  title?: string;
  description?: string;
  url?: string;
  thumbnailUrl?: string;
  publishedAt?: Date;
  rawData?: Record<string, any>;
}

export interface ContentListResult {
  success: boolean;
  items?: ContentItem[];
  error?: string;
}

export interface ContentMetricsData {
  platformContentId: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  impressions?: number;
  reach?: number;
  engagementRate?: number;
  watchTimeMinutes?: number;
  platformSpecific?: Record<string, any>;
}

export interface ContentMetricsResult {
  success: boolean;
  metrics?: ContentMetricsData[];
  error?: string;
}

/**
 * Common interface all platform sync services must implement.
 */
export interface PlatformSyncService {
  /** Platform identifier (e.g., 'twitter', 'instagram') */
  platform: string;

  /** Fetch current account-level metrics (followers, engagement, etc.) */
  syncAccountMetrics(
    userId: string,
    connection: SocialConnection
  ): Promise<AccountMetricsResult>;

  /** Fetch recent content items (posts, videos, etc.) */
  syncContentList(
    userId: string,
    connection: SocialConnection
  ): Promise<ContentListResult>;

  /** Fetch metrics for specific content items */
  syncContentMetrics(
    userId: string,
    connection: SocialConnection,
    contentIds: string[]
  ): Promise<ContentMetricsResult>;
}

/**
 * Type for the SocialConnection with access token available
 */
export type SocialConnectionWithToken = SocialConnection & {
  accessToken: string;
};
