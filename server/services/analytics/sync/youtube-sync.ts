/**
 * YouTube Sync Service
 * 
 * Syncs channel stats and video metrics from YouTube Data API v3
 * and YouTube Analytics API.
 */

import type { SocialConnection } from '@shared/schema';
import type { PlatformSyncService, AccountMetricsResult, ContentListResult, ContentMetricsResult } from './types';

const YT_DATA_API = 'https://www.googleapis.com/youtube/v3';
const YT_ANALYTICS_API = 'https://youtubeanalytics.googleapis.com/v2';

export class YouTubeSyncService implements PlatformSyncService {
  platform = 'youtube';

  async syncAccountMetrics(userId: string, connection: SocialConnection): Promise<AccountMetricsResult> {
    try {
      const accessToken = connection.accessToken;
      if (!accessToken) {
        return { success: false, error: 'No access token' };
      }

      // Get channel statistics
      const response = await fetch(
        `${YT_DATA_API}/channels?part=statistics,snippet&mine=true`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return { success: false, error: err.error?.message || `HTTP ${response.status}` };
      }

      const data = await response.json();
      const channel = data.items?.[0];

      if (!channel) {
        return { success: false, error: 'No channel found' };
      }

      const stats = channel.statistics;

      // Try to get analytics data (last 28 days)
      let analyticsData: any = {};
      try {
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 28 * 86400000).toISOString().split('T')[0];
        const analyticsRes = await fetch(
          `${YT_ANALYTICS_API}/reports?ids=channel==MINE&metrics=views,estimatedMinutesWatched,averageViewDuration,subscribersGained,subscribersLost&startDate=${startDate}&endDate=${endDate}`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );
        if (analyticsRes.ok) {
          const analytics = await analyticsRes.json();
          const row = analytics.rows?.[0];
          if (row) {
            analyticsData = {
              recentViews: row[0],
              watchTimeMinutes: row[1],
              avgViewDuration: row[2],
              subsGained: row[3],
              subsLost: row[4],
            };
          }
        }
      } catch {
        // Analytics API may not be available
      }

      return {
        success: true,
        data: {
          subscribers: parseInt(stats.subscriberCount || '0', 10),
          totalViews: parseInt(stats.viewCount || '0', 10),
          totalPosts: parseInt(stats.videoCount || '0', 10),
          platformSpecific: {
            hiddenSubscriberCount: stats.hiddenSubscriberCount,
            ...analyticsData,
          },
        },
      };
    } catch (error: any) {
      console.error('[YouTubeSync] Account metrics error:', error);
      return { success: false, error: error.message };
    }
  }

  async syncContentList(userId: string, connection: SocialConnection): Promise<ContentListResult> {
    try {
      const accessToken = connection.accessToken;
      if (!accessToken) {
        return { success: false, error: 'No access token' };
      }

      // Get channel's uploads playlist
      const channelRes = await fetch(
        `${YT_DATA_API}/channels?part=contentDetails&mine=true`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (!channelRes.ok) {
        return { success: false, error: 'Failed to get channel' };
      }

      const channelData = await channelRes.json();
      const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

      if (!uploadsPlaylistId) {
        return { success: true, items: [] };
      }

      // Get recent videos from uploads playlist
      const playlistRes = await fetch(
        `${YT_DATA_API}/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=25`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (!playlistRes.ok) {
        return { success: false, error: 'Failed to get videos' };
      }

      const playlistData = await playlistRes.json();
      const items = playlistData.items || [];

      return {
        success: true,
        items: items.map((item: any) => ({
          platformContentId: item.contentDetails?.videoId || item.snippet?.resourceId?.videoId,
          contentType: 'video',
          title: item.snippet?.title,
          description: item.snippet?.description?.substring(0, 500),
          url: `https://www.youtube.com/watch?v=${item.contentDetails?.videoId || item.snippet?.resourceId?.videoId}`,
          thumbnailUrl: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url,
          publishedAt: item.snippet?.publishedAt ? new Date(item.snippet.publishedAt) : undefined,
          rawData: { channelTitle: item.snippet?.channelTitle },
        })),
      };
    } catch (error: any) {
      console.error('[YouTubeSync] Content list error:', error);
      return { success: false, error: error.message };
    }
  }

  async syncContentMetrics(userId: string, connection: SocialConnection, contentIds: string[]): Promise<ContentMetricsResult> {
    try {
      const accessToken = connection.accessToken;
      if (!accessToken) {
        return { success: false, error: 'No access token' };
      }

      if (contentIds.length === 0) {
        return { success: true, metrics: [] };
      }

      const ids = contentIds.slice(0, 50).join(',');
      const response = await fetch(
        `${YT_DATA_API}/videos?part=statistics&id=${ids}`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (!response.ok) {
        return { success: false, error: 'Failed to fetch video stats' };
      }

      const data = await response.json();
      const videos = data.items || [];

      return {
        success: true,
        metrics: videos.map((video: any) => ({
          platformContentId: video.id,
          views: parseInt(video.statistics?.viewCount || '0', 10),
          likes: parseInt(video.statistics?.likeCount || '0', 10),
          comments: parseInt(video.statistics?.commentCount || '0', 10),
          platformSpecific: {
            favoriteCount: parseInt(video.statistics?.favoriteCount || '0', 10),
          },
        })),
      };
    } catch (error: any) {
      console.error('[YouTubeSync] Content metrics error:', error);
      return { success: false, error: error.message };
    }
  }
}

export const youtubeSync = new YouTubeSyncService();
