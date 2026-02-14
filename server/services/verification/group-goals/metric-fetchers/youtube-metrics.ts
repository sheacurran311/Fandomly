/**
 * YouTube Metrics Fetcher
 * 
 * Fetches aggregate metrics from YouTube Data API v3 for group goals.
 * 
 * Endpoints used:
 * - GET /youtube/v3/videos?part=statistics&id={videoId}
 * - GET /youtube/v3/channels?part=statistics&id={channelId}
 */

import type { MetricFetchResult } from '../group-goal-poller';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

/**
 * Fetch YouTube metrics for a video or channel
 */
export async function fetchYouTubeMetrics(
  contentId: string,
  metricType: string,
  accessToken: string
): Promise<MetricFetchResult> {
  try {
    if (!contentId) {
      return {
        success: false,
        currentValue: 0,
        error: 'No content ID provided',
      };
    }

    // Determine if this is a video or channel ID
    const isChannel = contentId.startsWith('UC') && contentId.length === 24;
    
    let url: string;
    if (isChannel) {
      url = `${YOUTUBE_API_BASE}/channels?part=statistics&id=${contentId}`;
    } else {
      url = `${YOUTUBE_API_BASE}/videos?part=statistics&id=${contentId}`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        currentValue: 0,
        error: error.error?.message || 'Failed to fetch YouTube metrics',
      };
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      return {
        success: false,
        currentValue: 0,
        error: 'Video or channel not found',
      };
    }

    const stats = data.items[0].statistics;

    // Extract the metric value
    let currentValue = 0;
    
    switch (metricType) {
      case 'likes':
        currentValue = parseInt(stats.likeCount || '0', 10);
        break;
      case 'views':
        currentValue = parseInt(stats.viewCount || '0', 10);
        break;
      case 'comments':
        currentValue = parseInt(stats.commentCount || '0', 10);
        break;
      case 'subscribers':
      case 'followers':
        currentValue = parseInt(stats.subscriberCount || '0', 10);
        break;
      case 'reactions':
        // YouTube doesn't have a "reactions" metric, use likes
        currentValue = parseInt(stats.likeCount || '0', 10);
        break;
      default:
        // Default to views for videos
        currentValue = parseInt(stats.viewCount || '0', 10);
    }

    return {
      success: true,
      currentValue,
      metadata: {
        rawStats: stats,
        contentType: isChannel ? 'channel' : 'video',
        fetchedAt: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    console.error('[YouTubeMetrics] Error:', error);
    return {
      success: false,
      currentValue: 0,
      error: error.message || 'Unknown error',
    };
  }
}
