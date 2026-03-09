/**
 * Badge Routes — Badge claiming and viewing operations
 *
 * Features:
 * - GET /api/badges/types - List all available badge types
 * - GET /api/badges/my-badges - Get current user's badges
 * - GET /api/badges/user/:userId - Get a specific user's badges (public)
 * - POST /api/badges/claim/:badgeTypeId - Claim an eligible badge
 * - GET /api/badges/check-eligibility/:badgeTypeId - Check if user can claim a badge
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import crypto from 'crypto';
import type { Express } from 'express';
import { db } from '../../db';
import {
  fandomlyBadgeTemplates,
  nftMints,
  users,
  userAchievements,
  fanPrograms,
} from '@shared/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { authenticateUser, AuthenticatedRequest } from '../../middleware/rbac';
import { getBlockchainNFTService } from '../../services/nft/blockchain-nft-service';
import type { Address } from 'viem';

export function registerBadgeRoutes(app: Express) {
  /**
   * GET /api/badges/types
   * List all available badge types from the fandomlyBadgeTemplates table
   */
  app.get('/api/badges/types', async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const isActive = req.query.isActive !== 'false'; // Default to true
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const conditions = [];
      if (isActive) {
        conditions.push(eq(fandomlyBadgeTemplates.isActive, true));
      }
      if (category) {
        conditions.push(eq(fandomlyBadgeTemplates.category, category));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const badgeTypes = await db
        .select({
          id: fandomlyBadgeTemplates.id,
          name: fandomlyBadgeTemplates.name,
          description: fandomlyBadgeTemplates.description,
          category: fandomlyBadgeTemplates.category,
          imageUrl: fandomlyBadgeTemplates.imageUrl,
          badgeColor: fandomlyBadgeTemplates.badgeColor,
          requirementType: fandomlyBadgeTemplates.requirementType,
          requirementData: fandomlyBadgeTemplates.requirementData,
          totalIssued: fandomlyBadgeTemplates.totalIssued,
          onChainBadgeTypeId: fandomlyBadgeTemplates.onChainBadgeTypeId,
          nftMetadata: fandomlyBadgeTemplates.nftMetadata,
        })
        .from(fandomlyBadgeTemplates)
        .where(whereClause)
        .orderBy(desc(fandomlyBadgeTemplates.createdAt))
        .limit(limit)
        .offset(offset);

      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(fandomlyBadgeTemplates)
        .where(whereClause);

      res.json({
        badgeTypes,
        pagination: {
          limit,
          offset,
          total: totalResult[0]?.count || 0,
        },
      });
    } catch (error) {
      console.error('[BadgeRoutes] Error fetching badge types:', error);
      res.status(500).json({ error: 'Failed to fetch badge types' });
    }
  });

  /**
   * GET /api/badges/my-badges
   * Get current user's badges from nftMints where badgeTemplateId is set
   */
  app.get('/api/badges/my-badges', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;

      // Get user's wallet address (Fandomly Chain / Avalanche L1)
      const [user] = await db
        .select({ avalancheL1Address: users.avalancheL1Address })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user?.avalancheL1Address) {
        return res.json({
          badges: [],
          message: 'No wallet address connected. Connect wallet to see your badges.',
        });
      }

      // Query badges minted to this user
      const userBadgesResult = await db.execute(sql`
        SELECT
          nm.id as mint_id,
          nm.badge_template_id,
          nm.tx_hash,
          nm.token_id,
          nm.mint_reason,
          nm.completed_at,
          bt.name as badge_name,
          bt.description as badge_description,
          bt.category,
          bt.image_url,
          bt.badge_color,
          bt.nft_metadata,
          bt.on_chain_badge_type_id
        FROM nft_mints nm
        INNER JOIN fandomly_badge_templates bt ON nm.badge_template_id = bt.id
        WHERE nm.recipient_user_id = ${userId}
          AND nm.badge_template_id IS NOT NULL
          AND nm.status = 'success'
        ORDER BY nm.completed_at DESC
      `);

      const badges = (userBadgesResult as any).rows || [];

      // Also check on-chain balance if blockchain service is available
      const nftService = getBlockchainNFTService();
      const onChainBalances: Record<number, string> = {};

      if (nftService && badges.length > 0) {
        try {
          const uniqueBadgeTypeIds = [
            ...new Set(badges.map((b: any) => b.on_chain_badge_type_id).filter(Boolean)),
          ];

          for (const badgeTypeId of uniqueBadgeTypeIds) {
            const balance = await nftService.getBadgeBalance(
              user.avalancheL1Address as Address,
              badgeTypeId as number
            );
            onChainBalances[badgeTypeId as number] = balance.toString();
          }
        } catch (error) {
          console.error('[BadgeRoutes] Error fetching on-chain balances:', error);
        }
      }

      // Enhance badges with on-chain balance
      const badgesWithBalance = badges.map((badge: any) => ({
        ...badge,
        onChainBalance: badge.on_chain_badge_type_id
          ? onChainBalances[badge.on_chain_badge_type_id] || '0'
          : null,
      }));

      res.json({
        badges: badgesWithBalance,
        walletAddress: user.avalancheL1Address,
        totalBadges: badges.length,
      });
    } catch (error) {
      console.error('[BadgeRoutes] Error fetching user badges:', error);
      res.status(500).json({ error: 'Failed to fetch user badges' });
    }
  });

  /**
   * GET /api/badges/user/:userId
   * Get a specific user's badges (public endpoint)
   */
  app.get('/api/badges/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;

      // Get user info
      const [user] = await db
        .select({
          id: users.id,
          username: users.username,
          avatar: users.avatar,
          avalancheL1Address: users.avalancheL1Address,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Query badges
      const userBadgesResult = await db.execute(sql`
        SELECT
          nm.id as mint_id,
          nm.badge_template_id,
          nm.token_id,
          nm.completed_at,
          bt.name as badge_name,
          bt.description as badge_description,
          bt.category,
          bt.image_url,
          bt.badge_color,
          bt.on_chain_badge_type_id
        FROM nft_mints nm
        INNER JOIN fandomly_badge_templates bt ON nm.badge_template_id = bt.id
        WHERE nm.recipient_user_id = ${userId}
          AND nm.badge_template_id IS NOT NULL
          AND nm.status = 'success'
        ORDER BY nm.completed_at DESC
      `);

      const badges = (userBadgesResult as any).rows || [];

      res.json({
        user: {
          id: user.id,
          username: user.username,
          avatar: user.avatar,
        },
        badges,
        totalBadges: badges.length,
      });
    } catch (error) {
      console.error('[BadgeRoutes] Error fetching user badges:', error);
      res.status(500).json({ error: 'Failed to fetch user badges' });
    }
  });

  /**
   * GET /api/badges/check-eligibility/:badgeTypeId
   * Check if the current user is eligible to claim a badge
   */
  app.get(
    '/api/badges/check-eligibility/:badgeTypeId',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { badgeTypeId } = req.params;
        const userId = req.user!.id;

        // Get badge template
        const [badgeTemplate] = await db
          .select()
          .from(fandomlyBadgeTemplates)
          .where(eq(fandomlyBadgeTemplates.id, badgeTypeId))
          .limit(1);

        if (!badgeTemplate || !badgeTemplate.isActive) {
          return res.status(404).json({ error: 'Badge type not found or inactive' });
        }

        // Check if already claimed
        const existingMintResult = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM nft_mints
        WHERE recipient_user_id = ${userId}
          AND badge_template_id = ${badgeTypeId}
          AND status = 'success'
      `);

        const alreadyClaimed = parseInt((existingMintResult as any).rows?.[0]?.count || '0') > 0;

        if (alreadyClaimed) {
          return res.json({
            eligible: false,
            reason: 'already_claimed',
            message: 'You have already claimed this badge',
            badgeTemplate,
          });
        }

        // Check requirements based on requirementType
        let eligible = false;
        let reason = '';
        let requirementDetails: any = null;

        const reqType = badgeTemplate.requirementType;
        const reqData = badgeTemplate.requirementData as any;

        switch (reqType) {
          case 'achievement': {
            // Check if user has earned the required achievement
            const achievementId = reqData?.achievementId;
            if (!achievementId) {
              eligible = false;
              reason = 'invalid_configuration';
              break;
            }

            const [userAchievement] = await db
              .select()
              .from(userAchievements)
              .where(
                and(
                  eq(userAchievements.userId, userId),
                  eq(userAchievements.achievementId, achievementId),
                  eq(userAchievements.completed, true)
                )
              )
              .limit(1);

            eligible = !!userAchievement;
            reason = eligible ? 'meets_requirements' : 'achievement_not_completed';
            requirementDetails = { achievementId, completed: !!userAchievement };
            break;
          }

          case 'points_milestone': {
            // Check if user has reached the required points
            const requiredPoints = reqData?.pointsRequired || 0;
            const programId = reqData?.programId;

            if (!programId) {
              eligible = false;
              reason = 'invalid_configuration';
              break;
            }

            const [fanProgram] = await db
              .select()
              .from(fanPrograms)
              .where(and(eq(fanPrograms.fanId, userId), eq(fanPrograms.programId, programId)))
              .limit(1);

            const currentPoints = fanProgram?.currentPoints || 0;
            eligible = currentPoints >= requiredPoints;
            reason = eligible ? 'meets_requirements' : 'insufficient_points';
            requirementDetails = {
              requiredPoints,
              currentPoints,
              programId,
            };
            break;
          }

          case 'manual': {
            // Manual badges require admin approval or specific verification
            eligible = false;
            reason = 'manual_approval_required';
            requirementDetails = reqData?.customCriteria || null;
            break;
          }

          case 'event_participation': {
            // Check event participation (custom logic needed)
            eligible = false;
            reason = 'event_check_not_implemented';
            break;
          }

          default: {
            eligible = false;
            reason = 'unknown_requirement_type';
          }
        }

        res.json({
          eligible,
          reason,
          message: eligible
            ? 'You are eligible to claim this badge'
            : 'You do not meet the requirements for this badge',
          badgeTemplate,
          requirementDetails,
        });
      } catch (error) {
        console.error('[BadgeRoutes] Error checking eligibility:', error);
        res.status(500).json({ error: 'Failed to check eligibility' });
      }
    }
  );

  /**
   * POST /api/badges/claim/:badgeTypeId
   * Claim an eligible badge and mint it to the user's wallet
   */
  app.post(
    '/api/badges/claim/:badgeTypeId',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { badgeTypeId } = req.params;
        const userId = req.user!.id;

        // Get badge template
        const [badgeTemplate] = await db
          .select()
          .from(fandomlyBadgeTemplates)
          .where(eq(fandomlyBadgeTemplates.id, badgeTypeId))
          .limit(1);

        if (!badgeTemplate || !badgeTemplate.isActive) {
          return res.status(404).json({ error: 'Badge type not found or inactive' });
        }

        // Check if already claimed
        const existingMintResult = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM nft_mints
        WHERE recipient_user_id = ${userId}
          AND badge_template_id = ${badgeTypeId}
          AND status = 'success'
      `);

        const alreadyClaimed = parseInt((existingMintResult as any).rows?.[0]?.count || '0') > 0;

        if (alreadyClaimed) {
          return res.status(400).json({ error: 'Badge already claimed' });
        }

        // Get user's wallet address (Fandomly Chain / Avalanche L1)
        const [user] = await db
          .select({ avalancheL1Address: users.avalancheL1Address })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (!user?.avalancheL1Address) {
          return res.status(400).json({
            error: 'No wallet address found. Connect your wallet first.',
            requiresWallet: true,
          });
        }

        // Check eligibility (re-validate on claim)
        const reqType = badgeTemplate.requirementType;
        const reqData = badgeTemplate.requirementData as any;

        let eligible = false;

        switch (reqType) {
          case 'achievement': {
            const achievementId = reqData?.achievementId;
            if (achievementId) {
              const [userAchievement] = await db
                .select()
                .from(userAchievements)
                .where(
                  and(
                    eq(userAchievements.userId, userId),
                    eq(userAchievements.achievementId, achievementId),
                    eq(userAchievements.completed, true)
                  )
                )
                .limit(1);
              eligible = !!userAchievement;
            }
            break;
          }

          case 'points_milestone': {
            const requiredPoints = reqData?.pointsRequired || 0;
            const programId = reqData?.programId;

            if (programId) {
              const [fanProgram] = await db
                .select()
                .from(fanPrograms)
                .where(and(eq(fanPrograms.fanId, userId), eq(fanPrograms.programId, programId)))
                .limit(1);

              eligible = (fanProgram?.currentPoints || 0) >= requiredPoints;
            }
            break;
          }

          case 'manual': {
            // Manual badges cannot be self-claimed
            return res.status(403).json({
              error: 'This badge requires manual approval and cannot be self-claimed',
            });
          }

          default: {
            return res.status(400).json({ error: 'Unknown badge requirement type' });
          }
        }

        if (!eligible) {
          return res.status(403).json({ error: 'You do not meet the requirements for this badge' });
        }

        // Get blockchain service
        const nftService = getBlockchainNFTService();
        if (!nftService) {
          return res.status(503).json({
            error: 'Blockchain service not available. Please try again later.',
          });
        }

        // Check if badge type is deployed on-chain
        if (!badgeTemplate.onChainBadgeTypeId) {
          return res.status(500).json({
            error: 'Badge not deployed on-chain. Contact support.',
          });
        }

        // Mint the badge on-chain
        const mintResult = await nftService.mintBadge(
          user.avalancheL1Address as Address,
          badgeTemplate.onChainBadgeTypeId,
          1
        );

        // Record the mint in the database
        const [nftMint] = await db
          .insert(nftMints)
          .values({
            crossmintActionId: crypto.randomUUID(),
            badgeTemplateId: badgeTypeId,
            recipientUserId: userId,
            recipientWalletAddress: user.avalancheL1Address,
            recipientChain: 'avalanche-fuji',
            mintReason: 'badge_achievement',
            txHash: mintResult.txHash,
            status: 'success',
            completedAt: new Date(),
          } as any)
          .returning();

        // Increment issued count atomically to avoid race conditions
        await db
          .update(fandomlyBadgeTemplates)
          .set({
            totalIssued: sql`COALESCE(${fandomlyBadgeTemplates.totalIssued}, 0) + 1`,
          })
          .where(eq(fandomlyBadgeTemplates.id, badgeTypeId));

        console.log(
          `[BadgeRoutes] Badge claimed: ${badgeTemplate.name} by user ${userId}, tx: ${mintResult.txHash}`
        );

        res.status(201).json({
          success: true,
          message: 'Badge claimed successfully',
          badge: {
            name: badgeTemplate.name,
            description: badgeTemplate.description,
            imageUrl: badgeTemplate.imageUrl,
          },
          mint: {
            id: nftMint.id,
            txHash: mintResult.txHash,
            mintedAt: nftMint.completedAt,
          },
        });
      } catch (error) {
        console.error('[BadgeRoutes] Error claiming badge:', error);
        const message = error instanceof Error ? error.message : 'Failed to claim badge';
        res.status(500).json({ error: message });
      }
    }
  );
}
