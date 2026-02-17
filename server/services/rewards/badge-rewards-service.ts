/**
 * Sprint 8: Badge Rewards Service
 * Automatically awards badges to top leaderboard performers
 * Integrates with Crossmint for NFT badge minting
 */

import { db } from '../../db';
import { sql, eq, and, isNull } from "drizzle-orm";
import { nftMints, fandomlyBadgeTemplates, users } from "@shared/schema";
import { CrossmintService } from "../nft/crossmint-service";
import { getWalletService } from "../wallet/wallet-service";
import { getSafeLeaderboardView } from "../../utils/safe-sql";

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

/** Raw SQL leaderboard row (snake_case from views) */
interface LeaderboardRow {
  user_id?: string;
  username?: string;
  rank?: number;
  total_points?: number;
  points?: number;
  total_points_earned?: number;
  campaign_id?: string;
  program_id?: string;
}

export class BadgeRewardsService {
  private crossmint: CrossmintService;

  constructor(crossmintApiKey: string) {
    this.crossmint = new CrossmintService({ apiKey: crossmintApiKey, environment: 'staging' });
  }

  /**
   * Award badges to top platform leaders
   * Badges: #1 Global Champion, Top 3 Platform, Top 10 Platform
   */
  async awardPlatformBadges(period: 'week' | 'month' | 'all-time' = 'week'): Promise<BadgeReward[]> {
    console.log(`🏆 Awarding platform badges for period: ${period}`);

    // Get top 10 performers using safe view name
    const viewName = getSafeLeaderboardView('platform', period);

    const topPerformers = await db.execute(sql`
      SELECT * FROM ${sql.raw(viewName)}
      WHERE rank <= 10
      ORDER BY rank
    `);

    const rewards: BadgeReward[] = [];

    const rows = topPerformers.rows as LeaderboardRow[];
    for (const performer of rows) {
      let badgeTemplateId: string | null = null;
      let badgeName: string = '';

      // Determine which badge to award
      const rank = performer.rank ?? 0;
      if (rank === 1) {
        badgeTemplateId = await this.getOrCreateBadgeTemplate('platform_champion', period);
        badgeName = `${period === 'all-time' ? 'All-Time' : period === 'week' ? 'Weekly' : 'Monthly'} Global Champion`;
      } else if (rank <= 3) {
        badgeTemplateId = await this.getOrCreateBadgeTemplate('platform_top3', period);
        badgeName = `Top 3 Platform Leader (${period})`;
      } else if (rank <= 10) {
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
          // Get or create user wallet (lazy wallet creation)
          const walletService = getWalletService();
          const walletResult = await walletService.ensureUserHasWallet(performer.user_id);

          if (walletResult.success && walletResult.wallet) {
            rewards.push({
              badgeTemplateId,
              userId: performer.user_id,
              username: performer.username ?? '',
              walletAddress: walletResult.wallet.address,
              chain: walletResult.wallet.chain,
              reason: `Achieved rank #${rank} on ${period} platform leaderboard`,
              contextData: {
                leaderboardType: 'platform',
                rank,
                points: performer.total_points ?? 0,
                period
              }
            });
            
            if (walletResult.isNew) {
              console.log(`[Badge] Created wallet for user ${performer.user_id} to receive badge`);
            }
          } else {
            console.warn(`[Badge] Could not get/create wallet for user ${performer.user_id}: ${walletResult.error}`);
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

    // Use safe view name lookup
    const viewName = getSafeLeaderboardView('campaign', period);

    const topPerformers = await db.execute(sql`
      SELECT * FROM ${sql.raw(viewName)}
      WHERE campaign_id = ${campaignId} AND rank <= 3
      ORDER BY rank
    `);

    const rewards: BadgeReward[] = [];
    const campaignRows = topPerformers.rows as LeaderboardRow[];

    for (const performer of campaignRows) {
      let badgeTemplateId: string | null = null;
      let badgeName: string = '';
      const rank = performer.rank ?? 0;

      if (rank === 1) {
        badgeTemplateId = await this.getOrCreateBadgeTemplate('campaign_winner', period);
        badgeName = 'Campaign Winner';
      } else if (rank <= 3) {
        badgeTemplateId = await this.getOrCreateBadgeTemplate('campaign_top3', period);
        badgeName = 'Top 3 Campaign Finisher';
      }

      if (badgeTemplateId && performer.user_id && performer.username) {
        // Check if user already has this badge for this campaign
        const existingBadge = await this.checkExistingBadge(
          performer.user_id,
          badgeTemplateId,
          'campaign',
          campaignId,
          period
        );

        if (!existingBadge) {
          // Get or create user wallet (lazy wallet creation)
          const walletService = getWalletService();
          const walletResult = await walletService.ensureUserHasWallet(performer.user_id);

          if (walletResult.success && walletResult.wallet) {
            rewards.push({
              badgeTemplateId,
              userId: performer.user_id,
              username: performer.username ?? '',
              walletAddress: walletResult.wallet.address,
              chain: walletResult.wallet.chain,
              reason: `Achieved rank #${rank} in campaign`,
              contextData: {
                leaderboardType: 'campaign',
                scopeId: campaignId,
                rank,
                points: performer.points ?? 0,
                period
              }
            });
            
            if (walletResult.isNew) {
              console.log(`[Badge] Created wallet for user ${performer.user_id} to receive campaign badge`);
            }
          } else {
            console.warn(`[Badge] Could not get/create wallet for user ${performer.user_id}: ${walletResult.error}`);
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
    const programRows = topPerformers.rows as LeaderboardRow[];

    for (const performer of programRows) {
      let badgeTemplateId: string | null = null;
      const rank = performer.rank ?? 0;

      if (rank === 1) {
        badgeTemplateId = await this.getOrCreateBadgeTemplate('program_mvp', 'all-time');
      } else if (rank <= 3) {
        badgeTemplateId = await this.getOrCreateBadgeTemplate('program_top3', 'all-time');
      } else if (rank <= 10) {
        badgeTemplateId = await this.getOrCreateBadgeTemplate('program_top10', 'all-time');
      }

      if (badgeTemplateId && performer.user_id && performer.username) {
        const existingBadge = await this.checkExistingBadge(
          performer.user_id,
          badgeTemplateId,
          'program',
          programId,
          'all-time'
        );

        if (!existingBadge) {
          // Get or create user wallet (lazy wallet creation)
          const walletService = getWalletService();
          const walletResult = await walletService.ensureUserHasWallet(performer.user_id);

          if (walletResult.success && walletResult.wallet) {
            rewards.push({
              badgeTemplateId,
              userId: performer.user_id,
              username: performer.username ?? '',
              walletAddress: walletResult.wallet.address,
              chain: walletResult.wallet.chain,
              reason: `Achieved rank #${rank} in program`,
              contextData: {
                leaderboardType: 'program',
                scopeId: programId,
                rank,
                points: performer.total_points_earned ?? 0
              }
            });
            
            if (walletResult.isNew) {
              console.log(`[Badge] Created wallet for user ${performer.user_id} to receive program badge`);
            }
          } else {
            console.warn(`[Badge] Could not get/create wallet for user ${performer.user_id}: ${walletResult.error}`);
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
      return String((existing.rows[0] as { id: unknown }).id);
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

    return String((result.rows[0] as { id: unknown }).id);
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

        const badgeRow = badgeResult.rows[0] as { name?: string; description?: string; image_url?: string; category?: string } | undefined;
        if (!badgeRow) {
          console.error(`❌ Badge template not found: ${reward.badgeTemplateId}`);
          continue;
        }

        // Mint badge using Crossmint
        const mintId = `badge-${reward.badgeTemplateId}-${reward.userId}-${Date.now()}`;
        const collectionId = `fandomly-badges-${badgeRow.category ?? 'default'}`;

        // Use Crossmint service to mint badge
        const mintResult = await this.crossmint.createAndMintBadge({
          collectionId,
          collectionName: 'Fandomly Achievement Badges',
          collectionDescription: 'Exclusive badges for top performers on Fandomly',
          collectionImageUrl: 'https://fandomly.io/badges/collection-icon.png',
          badgeTemplateId: reward.badgeTemplateId,
          badgeName: badgeRow.name ?? 'Badge',
          badgeDescription: badgeRow.description ?? '',
          badgeImageUrl: badgeRow.image_url ?? '',
          badgeCategory: badgeRow.category ?? 'default',
          badgeCriteria: reward.reason,
          badgeRequirements: [`Rank #${reward.contextData.rank}`, `${reward.contextData.points} points`],
          recipientAddress: reward.walletAddress,
          mintId,
          chain: reward.chain
        });

        // Record mint in database
        const actionId = String((mintResult as { mint?: { actionId?: unknown } }).mint?.actionId ?? '');
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
            ${actionId},
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
    for (const campaign of campaigns.rows as { id: unknown }[]) {
      const badges = await this.awardCampaignBadges(String(campaign.id));
      campaignBadges.push(...badges);
    }

    // Get all programs and award badges
    const programs = await db.execute(sql`
      SELECT id FROM loyalty_programs WHERE is_active = true
    `);

    const programBadges: BadgeReward[] = [];
    for (const program of programs.rows as { id: unknown }[]) {
      const badges = await this.awardProgramBadges(String(program.id));
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
