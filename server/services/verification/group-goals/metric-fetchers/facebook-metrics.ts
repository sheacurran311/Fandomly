/**
 * Facebook Metrics Fetcher
 * 
 * Fetches aggregate metrics from Facebook Graph API for group goals.
 * 
 * Endpoints used:
 * - GET /{post-id}?fields=likes.summary(true),comments.summary(true),shares
 * - GET /{page-id}?fields=fan_count
 */

import type { MetricFetchResult } from '../group-goal-poller';

const FACEBOOK_API_BASE = 'https://graph.facebook.com/v18.0';

/**
 * Fetch Facebook metrics for a post or page
 */
export async function fetchFacebookMetrics(
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
        fields = 'likes.summary(true)';
        break;
      case 'comments':
        fields = 'comments.summary(true)';
        break;
      case 'shares':
        fields = 'shares';
        break;
      case 'reactions':
        fields = 'reactions.summary(true)';
        break;
      case 'followers':
        fields = 'fan_count'; // For pages
        break;
      default:
        fields = 'likes.summary(true),comments.summary(true),shares';
    }

    const url = `${FACEBOOK_API_BASE}/${contentId}?fields=${fields}&access_token=${accessToken}`;
    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        currentValue: 0,
        error: error.error?.message || 'Failed to fetch Facebook metrics',
      };
    }

    const data = await response.json();

    // Extract the metric value
    let currentValue = 0;
    
    switch (metricType) {
      case 'likes':
        currentValue = data.likes?.summary?.total_count || 0;
        break;
      case 'comments':
        currentValue = data.comments?.summary?.total_count || 0;
        break;
      case 'shares':
        currentValue = data.shares?.count || 0;
        break;
      case 'reactions':
        currentValue = data.reactions?.summary?.total_count || 0;
        break;
      case 'followers':
        currentValue = data.fan_count || 0;
        break;
      default:
        // Sum all metrics
        currentValue = 
          (data.likes?.summary?.total_count || 0) +
          (data.comments?.summary?.total_count || 0) +
          (data.shares?.count || 0);
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
    console.error('[FacebookMetrics] Error:', error);
    return {
      success: false,
      currentValue: 0,
      error: error.message || 'Unknown error',
    };
  }
}
