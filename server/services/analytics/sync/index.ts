/**
 * Platform Sync Services Index
 * 
 * Registry of all platform sync services. Used by the sync scheduler
 * to dispatch sync operations to the correct platform handler.
 */

import type { PlatformSyncService } from './types';
import { twitterSync } from './twitter-sync';
import { instagramSync } from './instagram-sync';
import { youtubeSync } from './youtube-sync';
import { facebookSync } from './facebook-sync';
import { twitchSync } from './twitch-sync';
import { tiktokSync } from './tiktok-sync';
import { spotifySync } from './spotify-sync';
import { discordSync } from './discord-sync';
import { kickSync } from './kick-sync';
import { patreonSync } from './patreon-sync';

export type { PlatformSyncService, AccountMetricsResult, ContentListResult, ContentMetricsResult, ContentItem, ContentMetricsData } from './types';

/**
 * Map of platform name -> sync service instance
 */
export const platformSyncServices: Record<string, PlatformSyncService> = {
  twitter: twitterSync,
  instagram: instagramSync,
  youtube: youtubeSync,
  facebook: facebookSync,
  twitch: twitchSync,
  tiktok: tiktokSync,
  spotify: spotifySync,
  discord: discordSync,
  kick: kickSync,
  patreon: patreonSync,
};

/**
 * Get the sync service for a specific platform
 */
export function getSyncService(platform: string): PlatformSyncService | undefined {
  return platformSyncServices[platform.toLowerCase()];
}

/**
 * Get all supported platform names
 */
export function getSupportedPlatforms(): string[] {
  return Object.keys(platformSyncServices);
}
