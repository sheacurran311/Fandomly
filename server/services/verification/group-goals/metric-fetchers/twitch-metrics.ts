/**
 * Twitch Metrics Fetcher
 * 
 * Fetches aggregate metrics from Twitch Helix API for group goals.
 * 
 * Endpoints used:
 * - GET /helix/streams?user_id={userId} - Current viewers
 * - GET /helix/channels/followers?broadcaster_id={userId} - Follower count
 * - GET /helix/subscriptions?broadcaster_id={userId} - Subscriber count
 */

import type { MetricFetchResult } from '../group-goal-poller';

const TWITCH_API_BASE = 'https://api.twitch.tv/helix';

/**
 * Fetch Twitch metrics for a channel
 */
export async function fetchTwitchMetrics(
  contentId: string, // Channel/broadcaster ID
  metricType: string,
  accessToken: string
): Promise<MetricFetchResult> {
  try {
    if (!contentId) {
      return {
        success: false,
        currentValue: 0,
        error: 'No channel ID provided',
      };
    }

    const clientId = process.env.TWITCH_CLIENT_ID;
    if (!clientId) {
      return {
        success: false,
        currentValue: 0,
        error: 'Twitch client ID not configured',
      };
    }

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Client-Id': clientId,
    };

    let currentValue = 0;
    let metadata: Record<string, any> = {};

    switch (metricType) {
      case 'concurrent_viewers':
      case 'viewers': {
        // Get current stream info
        const streamResponse = await fetch(
          `${TWITCH_API_BASE}/streams?user_id=${contentId}`,
          { headers }
        );

        if (!streamResponse.ok) {
          const error = await streamResponse.json();
          return {
            success: false,
            currentValue: 0,
            error: error.message || 'Failed to fetch stream info',
          };
        }

        const streamData = await streamResponse.json();
        
        if (streamData.data && streamData.data.length > 0) {
          currentValue = streamData.data[0].viewer_count || 0;
          metadata = {
            isLive: true,
            streamTitle: streamData.data[0].title,
            gameName: streamData.data[0].game_name,
          };
        } else {
          // Channel is not live
          currentValue = 0;
          metadata = { isLive: false };
        }
        break;
      }

      case 'followers': {
        // Get follower count
        const followerResponse = await fetch(
          `${TWITCH_API_BASE}/channels/followers?broadcaster_id=${contentId}&first=1`,
          { headers }
        );

        if (!followerResponse.ok) {
          const error = await followerResponse.json();
          return {
            success: false,
            currentValue: 0,
            error: error.message || 'Failed to fetch follower count',
          };
        }

        const followerData = await followerResponse.json();
        currentValue = followerData.total || 0;
        break;
      }

      case 'subscribers': {
        // Get subscriber count (requires broadcaster auth)
        const subResponse = await fetch(
          `${TWITCH_API_BASE}/subscriptions?broadcaster_id=${contentId}&first=1`,
          { headers }
        );

        if (!subResponse.ok) {
          const error = await subResponse.json();
          // This endpoint requires broadcaster token, may fail
          return {
            success: false,
            currentValue: 0,
            error: error.message || 'Failed to fetch subscriber count (requires broadcaster auth)',
          };
        }

        const subData = await subResponse.json();
        currentValue = subData.total || 0;
        break;
      }

      default:
        return {
          success: false,
          currentValue: 0,
          error: `Unsupported metric type: ${metricType}`,
        };
    }

    return {
      success: true,
      currentValue,
      metadata: {
        ...metadata,
        fetchedAt: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    console.error('[TwitchMetrics] Error:', error);
    return {
      success: false,
      currentValue: 0,
      error: error.message || 'Unknown error',
    };
  }
}
