/**
 * Twitter Metrics Fetcher
 * 
 * Fetches aggregate metrics from Twitter API v2 for group goals.
 * 
 * Endpoints used:
 * - GET /2/tweets/{id}?tweet.fields=public_metrics
 * - GET /2/users/{id}?user.fields=public_metrics
 */

import type { MetricFetchResult } from '../group-goal-poller';

const TWITTER_API_BASE = 'https://api.twitter.com/2';

/**
 * Fetch Twitter metrics for a tweet or user
 */
export async function fetchTwitterMetrics(
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

    // Determine if this is a tweet or user ID based on length/format
    // Twitter user IDs are typically 10-20 digits, tweet IDs are 19+ digits
    const isTweet = contentId.length >= 19;
    
    let url: string;
    if (isTweet) {
      url = `${TWITTER_API_BASE}/tweets/${contentId}?tweet.fields=public_metrics`;
    } else {
      url = `${TWITTER_API_BASE}/users/${contentId}?user.fields=public_metrics`;
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
        error: error.detail || error.title || 'Failed to fetch Twitter metrics',
      };
    }

    const data = await response.json();
    
    if (!data.data) {
      return {
        success: false,
        currentValue: 0,
        error: 'Tweet or user not found',
      };
    }

    const metrics = data.data.public_metrics;

    // Extract the metric value
    let currentValue = 0;
    
    if (isTweet) {
      switch (metricType) {
        case 'likes':
          currentValue = metrics.like_count || 0;
          break;
        case 'shares':
        case 'retweets':
          currentValue = metrics.retweet_count || 0;
          break;
        case 'comments':
        case 'replies':
          currentValue = metrics.reply_count || 0;
          break;
        case 'views':
          currentValue = metrics.impression_count || 0;
          break;
        case 'reactions':
          // Sum of likes and retweets
          currentValue = (metrics.like_count || 0) + (metrics.retweet_count || 0);
          break;
        default:
          // Default to likes
          currentValue = metrics.like_count || 0;
      }
    } else {
      switch (metricType) {
        case 'followers':
          currentValue = metrics.followers_count || 0;
          break;
        default:
          currentValue = metrics.followers_count || 0;
      }
    }

    return {
      success: true,
      currentValue,
      metadata: {
        rawMetrics: metrics,
        contentType: isTweet ? 'tweet' : 'user',
        fetchedAt: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    console.error('[TwitterMetrics] Error:', error);
    return {
      success: false,
      currentValue: 0,
      error: error.message || 'Unknown error',
    };
  }
}
