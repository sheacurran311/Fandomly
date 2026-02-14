/**
 * Instagram Metrics Fetcher
 * 
 * Fetches aggregate metrics from Instagram Graph API for group goals.
 * Requires a Business/Creator account connected via Facebook.
 * 
 * Endpoints used:
 * - GET /{ig-media-id}?fields=like_count,comments_count
 * - GET /{ig-user-id}?fields=followers_count
 */

import type { MetricFetchResult } from '../group-goal-poller';

const INSTAGRAM_API_BASE = 'https://graph.facebook.com/v18.0';

/**
 * Fetch Instagram metrics for a media post or user
 */
export async function fetchInstagramMetrics(
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

    // Build fields based on metric type
    let fields = '';
    switch (metricType) {
      case 'likes':
        fields = 'like_count';
        break;
      case 'comments':
        fields = 'comments_count';
        break;
      case 'followers':
        fields = 'followers_count'; // For user profiles
        break;
      case 'views':
        fields = 'video_views'; // For video posts only
        break;
      default:
        fields = 'like_count,comments_count';
    }

    const url = `${INSTAGRAM_API_BASE}/${contentId}?fields=${fields}&access_token=${accessToken}`;
    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        currentValue: 0,
        error: error.error?.message || 'Failed to fetch Instagram metrics',
      };
    }

    const data = await response.json();

    // Extract the metric value
    let currentValue = 0;
    
    switch (metricType) {
      case 'likes':
        currentValue = data.like_count || 0;
        break;
      case 'comments':
        currentValue = data.comments_count || 0;
        break;
      case 'followers':
        currentValue = data.followers_count || 0;
        break;
      case 'views':
        currentValue = data.video_views || 0;
        break;
      default:
        // Sum likes and comments
        currentValue = (data.like_count || 0) + (data.comments_count || 0);
    }

    return {
      success: true,
      currentValue,
      metadata: {
        rawData: data,
        fetchedAt: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    console.error('[InstagramMetrics] Error:', error);
    return {
      success: false,
      currentValue: 0,
      error: error.message || 'Unknown error',
    };
  }
}
