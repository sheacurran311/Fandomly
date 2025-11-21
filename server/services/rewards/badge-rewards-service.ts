/**
 * Sprint 8: Badge Rewards Service
 * Automatically awards badges to top leaderboard performers
 * Integrates with Crossmint for NFT badge minting
 */

import { db } from '../../db';
import { sql, eq, and, isNull } from "drizzle-orm";
import { nftMints, fandomlyBadgeTemplates, users } from "@shared/schema";
import { CrossmintService } from "../nft/crossmint-service";

interface BadgeReward {
  badgeTemplateId: string;
  userId: string;
  username: string;
  walletAddress: string;
  chain: string;
  reason: string;
  contextData: {
    leaderboardType: 'platform' | 'campaign' | 'program';
    scopeId?: string;
    rank: number;
    points: number;
    period?: string;
  };
}

export class BadgeRewardsService {
  private crossmint: CrossmintService;

  constructor(crossmintApiKey: string) {
    this.crossmint = new CrossmintService(crossmintApiKey);
  }

  /**
   * Award badges to top platform leaders
   * Badges: #1 Global Champion, Top 3 Platform, Top 10 Platform
   */
  async awardPlatformBadges(period: 'week' | 'month' | 'all-time' = 'week'): Promise<BadgeReward[]> {
    console.log(`🏆 Awarding platform badges for period: ${period}`);

    // Get top 10 performers
    let viewName = 'platform_leaderboard';
    if (period === 'week') viewName = 'platform_leaderboard_week';
    else if (period === 'month') viewName = 'platform_leaderboard_month';

    const topPerformers = await db.execute(sql`
      SELECT * FROM ${sql.raw(viewName)}
      WHERE rank <= 10
      ORDER BY rank
    `);

    const rewards: BadgeReward[] = [];

    for (const performer of topPerformers.rows) {
      let badgeTemplateId: string | null = null;
      let badgeName: string = '';

      // Determine which badge to award
      if (performer.rank === 1) {
        badgeTemplateId = await this.getOrCreateBadgeTemplate('platform_champion', period);
        badgeName = `${period === 'all-time' ? 'All-Time' : period === 'week' ? 'Weekly' : 'Monthly'} Global Champion`;
      } else if (performer.rank <= 3) {
        badgeTemplateId = await this.getOrCreateBadgeTemplate('platform_top3', period);
        badgeName = `Top 3 Platform Leader (${period})`;
      } else if (performer.rank <= 10) {
        badgeTemplateId = await this.getOrCreateBadgeTemplate('platform_top10', period);
        badgeName = `Top 10 Platform Leader (${period})`;
      }

      if (badgeTemplateId && performer.user_id) {
        // Check if user already has this badge for this period
        const existingBadge = await this.checkExistingBadge(
          performer.user_id,
          badgeTemplateId,
          'platform',
          null,
          period
        );

        if (!existingBadge) {
          // Get user wallet info
          const userResult = await db.execute(sql`
            SELECT wallet_address, wallet_chain FROM users WHERE id = ${performer.user_id}
          `);

          const user = userResult.rows[0];
          if (user?.wallet_address) {
            rewards.push({
              badgeTemplateId,
              userId: performer.user_id,
              username: performer.username,
              walletAddress: user.wallet_address,
              chain: user.wallet_chain || 'polygon',
              reason: `Achieved rank #${performer.rank} on ${period} platform leaderboard`,
              contextData: {
                leaderboardType: 'platform',
                rank: performer.rank,
                points: performer.total_points,
                period
              }
            });
          }
        }
      }
    }

    // Mint badges for all rewards
    await this.mintBadges(rewards);

    console.log(`✅ Awarded ${rewards.length} platform badges for ${period}`);
    return rewards;
  }

  /**
   * Award badges to top campaign performers
   * Badge: Top 3 Campaign Finisher
   */
  async awardCampaignBadges(campaignId: string, period: 'week' | 'month' | 'all-time' = 'all-time'): Promise<BadgeReward[]> {
    console.log(`🏆 Awarding campaign badges for campaign: ${campaignId}, period: ${period}`);

    let viewName = 'campaign_leaderboard';
    if (period === 'week') viewName = 'campaign_leaderboard_week';
    else if (period === 'month') viewName = 'campaign_leaderboard_month';

    const topPerformers = await db.execute(sql`
      SELECT * FROM ${sql.raw(viewName)}
      WHERE campaign_id = ${campaignId} AND rank <= 3
      ORDER BY rank
    `);

    const rewards: BadgeReward[] = [];

    for (const performer of topPerformers.rows) {
      let badgeTemplateId: string | null = null;
      let badgeName: string = '';

      if (performer.rank === 1) {
        badgeTemplateId = await this.getOrCreateBadgeTemplate('campaign_winner', period);
        badgeName = 'Campaign Winner';
      } else if (performer.rank <= 3) {
        badgeTemplateId = await this.getOrCreateBadgeTemplate('campaign_top3', period);
        badgeName = 'Top 3 Campaign Finisher';
      }

      if (badgeTemplateId && performer.user_id) {
        // Check if user already has this badge for this campaign
        const existingBadge = await this.checkExistingBadge(
          performer.user_id,
          badgeTemplateId,
          'campaign',
          campaignId,
          period
        );

        if (!existingBadge) {
          const userResult = await db.execute(sql`
            SELECT wallet_address, wallet_chain FROM users WHERE id = ${performer.user_id}
          `);

          const user = userResult.rows[0];
          if (user?.wallet_address) {
            rewards.push({
              badgeTemplateId,
              userId: performer.user_id,
              username: performer.username,
              walletAddress: user.wallet_address,
              chain: user.wallet_chain || 'polygon',
              reason: `Achieved rank #${performer.rank} in campaign`,
              contextData: {
                leaderboardType: 'campaign',
                scopeId: campaignId,
                rank: performer.rank,
                points: performer.points,
                period
              }
            });
          }
        }
      }
    }

    await this.mintBadges(rewards);

    console.log(`✅ Awarded ${rewards.length} campaign badges for ${campaignId}`);
    return rewards;
  }

  /**
   * Award badges to top program performers
   * Badge: Top Program Fan
   */
  async awardProgramBadges(programId: string): Promise<BadgeReward[]> {
    console.log(`🏆 Awarding program badges for program: ${programId}`);

    const topPerformers = await db.execute(sql`
      SELECT * FROM program_leaderboard
      WHERE program_id = ${programId} AND rank <= 10
      ORDER BY rank
    `);

    const rewards: BadgeReward[] = [];

    for (const performer of topPerformers.rows) {
      let badgeTemplateId: string | null = null;

      if (performer.rank === 1) {
        badgeTemplateId = await this.getOrCreateBadgeTemplate('program_mvp', 'all-time');
      } else if (performer.rank <= 3) {
        badgeTemplateId = await this.getOrCreateBadgeTemplate('program_top3', 'all-time');
      } else if (performer.rank <= 10) {
        badgeTemplateId = await this.getOrCreateBadgeTemplate('program_top10', 'all-time');
      }

      if (badgeTemplateId && performer.user_id) {
        const existingBadge = await this.checkExistingBadge(
          performer.user_id,
          badgeTemplateId,
          'program',
          programId,
          'all-time'
        );

        if (!existingBadge) {
          const userResult = await db.execute(sql`
            SELECT wallet_address, wallet_chain FROM users WHERE id = ${performer.user_id}
          `);

          const user = userResult.rows[0];
          if (user?.wallet_address) {
            rewards.push({
              badgeTemplateId,
              userId: performer.user_id,
              username: performer.username,
              walletAddress: user.wallet_address,
              chain: user.wallet_chain || 'polygon',
              reason: `Achieved rank #${performer.rank} in program`,
              contextData: {
                leaderboardType: 'program',
                scopeId: programId,
                rank: performer.rank,
                points: performer.total_points_earned
              }
            });
          }
        }
      }
    }

    await this.mintBadges(rewards);

    console.log(`✅ Awarded ${rewards.length} program badges for ${programId}`);
    return rewards;
  }

  /**
   * Get or create badge template for specific achievement
   */
  private async getOrCreateBadgeTemplate(
    badgeType: string,
    period: string
  ): Promise<string> {
    // Define badge metadata
    const badgeDefinitions: Record<string, any> = {
      platform_champion: {
        name: `${period === 'all-time' ? 'All-Time' : period === 'week' ? 'Weekly' : 'Monthly'} Global Champion`,
        description: `Achieved #1 rank on the ${period} platform leaderboard`,
        category: 'achievement',
        imageUrl: 'https://fandomly.io/badges/platform-champion.png',
        badgeColor: '#FFD700',
        tierLevel: 5
      },
      platform_top3: {
        name: `Top 3 Platform Leader (${period})`,
        description: `Achieved top 3 rank on the ${period} platform leaderboard`,
        category: 'achievement',
        imageUrl: 'https://fandomly.io/badges/platform-top3.png',
        badgeColor: '#C0C0C0',
        tierLevel: 4
      },
      platform_top10: {
        name: `Top 10 Platform Leader (${period})`,
        description: `Achieved top 10 rank on the ${period} platform leaderboard`,
        category: 'achievement',
        imageUrl: 'https://fandomly.io/badges/platform-top10.png',
        badgeColor: '#CD7F32',
        tierLevel: 3
      },
      campaign_winner: {
        name: 'Campaign Winner',
        description: 'Won 1st place in a campaign',
        category: 'achievement',
        imageUrl: 'https://fandomly.io/badges/campaign-winner.png',
        badgeColor: '#FFD700',
        tierLevel: 5
      },
      campaign_top3: {
        name: 'Top 3 Campaign Finisher',
        description: 'Achieved top 3 rank in a campaign',
        category: 'achievement',
        imageUrl: 'https://fandomly.io/badges/campaign-top3.png',
        badgeColor: '#C0C0C0',
        tierLevel: 3
      },
      program_mvp: {
        name: 'Program MVP',
        description: '#1 fan in loyalty program',
        category: 'achievement',
        imageUrl: 'https://fandomly.io/badges/program-mvp.png',
        badgeColor: '#FFD700',
        tierLevel: 5
      },
      program_top3: {
        name: 'Top 3 Program Fan',
        description: 'Top 3 fan in loyalty program',
        category: 'achievement',
        imageUrl: 'https://fandomly.io/badges/program-top3.png',
        badgeColor: '#C0C0C0',
        tierLevel: 4
      },
      program_top10: {
        name: 'Top 10 Program Fan',
        description: 'Top 10 fan in loyalty program',
        category: 'achievement',
        imageUrl: 'https://fandomly.io/badges/program-top10.png',
        badgeColor: '#CD7F32',
        tierLevel: 3
      }
    };

    const badgeDef = badgeDefinitions[badgeType];
    if (!badgeDef) {
      throw new Error(`Unknown badge type: ${badgeType}`);
    }

    // Check if template exists
    const existing = await db.execute(sql`
      SELECT id FROM fandomly_badge_templates
      WHERE name = ${badgeDef.name}
      LIMIT 1
    `);

    if (existing.rows.length > 0) {
      return existing.rows[0].id;
    }

    // Create new template
    const result = await db.execute(sql`
      INSERT INTO fandomly_badge_templates (
        name, description, category, requirement_type, requirement_data,
        image_url, badge_color, tier_level, is_active, is_platform_badge
      ) VALUES (
        ${badgeDef.name},
        ${badgeDef.description},
        ${badgeDef.category},
        'leaderboard_achievement',
        ${JSON.stringify({ badgeType, period })}::jsonb,
        ${badgeDef.imageUrl},
        ${badgeDef.badgeColor},
        ${badgeDef.tierLevel},
        true,
        true
      )
      RETURNING id
    `);

    return result.rows[0].id;
  }

  /**
   * Check if user already has this badge
   */
  private async checkExistingBadge(
    userId: string,
    badgeTemplateId: string,
    leaderboardType: string,
    scopeId: string | null,
    period: string
  ): Promise<boolean> {
    const result = await db.execute(sql`
      SELECT id FROM nft_mints
      WHERE recipient_user_id = ${userId}
        AND badge_template_id = ${badgeTemplateId}
        AND mint_reason = 'badge_achievement'
        AND context_data->>'leaderboardType' = ${leaderboardType}
        AND context_data->>'period' = ${period}
        ${scopeId ? sql`AND context_data->>'scopeId' = ${scopeId}` : sql``}
      LIMIT 1
    `);

    return result.rows.length > 0;
  }

  /**
   * Mint badges using Crossmint
   */
  private async mintBadges(rewards: BadgeReward[]): Promise<void> {
    for (const reward of rewards) {
      try {
        console.log(`🎖️ Minting badge for ${reward.username} (rank #${reward.contextData.rank})`);

        // Get badge template details
        const badgeResult = await db.execute(sql`
          SELECT * FROM fandomly_badge_templates WHERE id = ${reward.badgeTemplateId}
        `);

        const badge = badgeResult.rows[0];
        if (!badge) {
          console.error(`❌ Badge template not found: ${reward.badgeTemplateId}`);
          continue;
        }

        // Mint badge using Crossmint
        const mintId = `badge-${reward.badgeTemplateId}-${reward.userId}-${Date.now()}`;
        const collectionId = `fandomly-badges-${badge.category}`;

        // Use Crossmint service to mint badge
        const mintResult = await this.crossmint.createAndMintBadge({
          collectionId,
          collectionName: 'Fandomly Achievement Badges',
          collectionDescription: 'Exclusive badges for top performers on Fandomly',
          collectionImageUrl: 'https://fandomly.io/badges/collection-icon.png',
          badgeTemplateId: reward.badgeTemplateId,
          badgeName: badge.name,
          badgeDescription: badge.description,
          badgeImageUrl: badge.image_url,
          badgeCategory: badge.category,
          badgeCriteria: reward.reason,
          badgeRequirements: [`Rank #${reward.contextData.rank}`, `${reward.contextData.points} points`],
          recipientAddress: reward.walletAddress,
          mintId,
          chain: reward.chain
        });

        // Record mint in database
        await db.execute(sql`
          INSERT INTO nft_mints (
            crossmint_action_id,
            collection_id,
            badge_template_id,
            recipient_user_id,
            recipient_wallet_address,
            recipient_chain,
            mint_reason,
            context_data,
            status
          ) VALUES (
            ${mintResult.mint.actionId},
            ${collectionId},
            ${reward.badgeTemplateId},
            ${reward.userId},
            ${reward.walletAddress},
            ${reward.chain},
            'badge_achievement',
            ${JSON.stringify(reward.contextData)}::jsonb,
            'pending'
          )
        `);

        console.log(`✅ Badge minted successfully for ${reward.username}`);
      } catch (error: any) {
        console.error(`❌ Failed to mint badge for ${reward.username}:`, error.message);
      }
    }
  }

  /**
   * Award all badges (platform, campaigns, programs)
   * This can be called by a cron job
   */
  async awardAllBadges(): Promise<{
    platformBadges: BadgeReward[];
    campaignBadges: BadgeReward[];
    programBadges: BadgeReward[];
  }> {
    console.log('🏆 Starting automatic badge rewards...');

    // Award platform badges for all time periods
    const platformBadgesWeek = await this.awardPlatformBadges('week');
    const platformBadgesMonth = await this.awardPlatformBadges('month');
    const platformBadgesAllTime = await this.awardPlatformBadges('all-time');

    // Get all active campaigns and award badges
    const campaigns = await db.execute(sql`
      SELECT id FROM campaigns WHERE status = 'active' OR status = 'completed'
    `);

    const campaignBadges: BadgeReward[] = [];
    for (const campaign of campaigns.rows) {
      const badges = await this.awardCampaignBadges(campaign.id);
      campaignBadges.push(...badges);
    }

    // Get all programs and award badges
    const programs = await db.execute(sql`
      SELECT id FROM loyalty_programs WHERE is_active = true
    `);

    const programBadges: BadgeReward[] = [];
    for (const program of programs.rows) {
      const badges = await this.awardProgramBadges(program.id);
      programBadges.push(...badges);
    }

    const totalPlatformBadges = platformBadgesWeek.length + platformBadgesMonth.length + platformBadgesAllTime.length;

    console.log(`✅ Badge rewards complete: ${totalPlatformBadges} platform, ${campaignBadges.length} campaign, ${programBadges.length} program`);

    return {
      platformBadges: [...platformBadgesWeek, ...platformBadgesMonth, ...platformBadgesAllTime],
      campaignBadges,
      programBadges
    };
  }
}
