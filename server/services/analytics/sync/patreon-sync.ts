/**
 * Patreon Sync Service
 * 
 * Syncs campaign data and patron metrics from Patreon API v2.
 */

import type { SocialConnection } from '@shared/schema';
import type { PlatformSyncService, AccountMetricsResult, ContentListResult, ContentMetricsResult } from './types';

const PATREON_API_BASE = 'https://www.patreon.com/api/oauth2/v2';

export class PatreonSyncService implements PlatformSyncService {
  platform = 'patreon';

  async syncAccountMetrics(userId: string, connection: SocialConnection): Promise<AccountMetricsResult> {
    try {
      const accessToken = connection.accessToken;
      if (!accessToken) {
        return { success: false, error: 'No access token' };
      }

      // Get campaigns
      const campaignRes = await fetch(
        `${PATREON_API_BASE}/campaigns?fields[campaign]=created_at,patron_count,pledge_sum,creation_name,image_url,is_monthly`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (!campaignRes.ok) {
        return { success: false, error: `HTTP ${campaignRes.status}` };
      }

      const campaignData = await campaignRes.json();
      const campaigns = campaignData.data || [];

      let totalPatrons = 0;
      let totalPledgeSumCents = 0;
      const campaignDetails: any[] = [];

      for (const campaign of campaigns) {
        const attrs = campaign.attributes || {};
        totalPatrons += attrs.patron_count || 0;
        totalPledgeSumCents += attrs.pledge_sum || 0;
        campaignDetails.push({
          id: campaign.id,
          name: attrs.creation_name,
          patrons: attrs.patron_count || 0,
          pledgeSumCents: attrs.pledge_sum || 0,
          isMonthly: attrs.is_monthly,
        });
      }

      return {
        success: true,
        data: {
          followers: totalPatrons,
          subscribers: totalPatrons,
          platformSpecific: {
            totalPledgeSumCents,
            totalRevenueDollars: totalPledgeSumCents / 100,
            campaigns: campaignDetails,
          },
        },
      };
    } catch (error: any) {
      console.error('[PatreonSync] Account metrics error:', error);
      return { success: false, error: error.message };
    }
  }

  async syncContentList(userId: string, connection: SocialConnection): Promise<ContentListResult> {
    try {
      const accessToken = connection.accessToken;
      if (!accessToken) {
        return { success: false, error: 'No access token' };
      }

      // Get campaigns first to get campaign IDs
      const campaignRes = await fetch(
        `${PATREON_API_BASE}/campaigns`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (!campaignRes.ok) {
        return { success: true, items: [] };
      }

      const campaignData = await campaignRes.json();
      const campaigns = campaignData.data || [];

      if (campaigns.length === 0) {
        return { success: true, items: [] };
      }

      // Get posts from the first campaign
      const campaignId = campaigns[0].id;
      const postsRes = await fetch(
        `${PATREON_API_BASE}/campaigns/${campaignId}/posts?fields[post]=title,content,published_at,url,like_count,comment_count&page[count]=20`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (!postsRes.ok) {
        return { success: true, items: [] };
      }

      const postsData = await postsRes.json();
      const posts = postsData.data || [];

      return {
        success: true,
        items: posts.map((post: any) => ({
          platformContentId: post.id,
          contentType: 'post',
          title: post.attributes?.title || 'Patreon post',
          description: post.attributes?.content?.substring(0, 500),
          url: post.attributes?.url,
          publishedAt: post.attributes?.published_at ? new Date(post.attributes.published_at) : undefined,
          rawData: {
            like_count: post.attributes?.like_count || 0,
            comment_count: post.attributes?.comment_count || 0,
          },
        })),
      };
    } catch (error: any) {
      console.error('[PatreonSync] Content list error:', error);
      return { success: false, error: error.message };
    }
  }

  async syncContentMetrics(_userId: string, _connection: SocialConnection, _contentIds: string[]): Promise<ContentMetricsResult> {
    // Patreon doesn't provide per-post engagement analytics via API
    return { success: true, metrics: [] };
  }
}

export const patreonSync = new PatreonSyncService();
