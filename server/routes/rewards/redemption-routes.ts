/**
 * Redemption Routes
 * Sprint 6: Reward redemption workflow API endpoints
 *
 * Features:
 * - GET /api/rewards/catalog - List available rewards
 * - POST /api/rewards/redeem - Initiate redemption
 * - GET /api/rewards/redemptions - User's redemption history
 * - PUT /api/rewards/redemptions/:id/fulfill - Creator fulfillment
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Express } from 'express';
import { db } from '../../db';
import {
  rewards,
  rewardRedemptions,
  fanPrograms,
  users,
  nftMints,
  nftTemplates,
  fandomlyBadgeTemplates,
} from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { authenticateUser, AuthenticatedRequest } from '../../middleware/rbac';
import { z } from 'zod';
import { storage } from '../../core/storage';
import { tierProgressionService } from '../../services/tier-progression-service';
import { getBlockchainNFTService } from '../../services/nft/blockchain-nft-service';
import type { Address } from 'viem';

// Validation schemas
const redeemRewardSchema = z.object({
  rewardId: z.string().min(1),
  programId: z.string().min(1).optional(), // Optional for platform-wide rewards
  quantity: z.number().min(1).max(10).default(1),
  shippingAddress: z
    .object({
      fullName: z.string().min(1),
      addressLine1: z.string().min(1),
      addressLine2: z.string().optional(),
      city: z.string().min(1),
      stateProvince: z.string().min(1),
      postalCode: z.string().min(1),
      country: z.string().min(1),
    })
    .optional(),
  metadata: z.record(z.any()).optional(),
});

const fulfillRedemptionSchema = z.object({
  status: z.enum(['shipped', 'delivered', 'cancelled', 'refunded']),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

export function registerRedemptionRoutes(app: Express) {
  /**
   * GET /api/rewards/catalog
   * List available rewards for a program or platform-wide
   */
  app.get('/api/rewards/catalog', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const programId = req.query.programId as string | undefined;
      const tenantId = req.query.tenantId as string | undefined;
      const category = req.query.category as string | undefined;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      // Build query conditions
      let conditions = sql`r.is_active = TRUE`;

      if (programId) {
        conditions = sql`${conditions} AND r.program_id = ${programId}`;
      }
      if (tenantId) {
        conditions = sql`${conditions} AND r.tenant_id = ${tenantId}`;
      }
      if (category) {
        conditions = sql`${conditions} AND r.category = ${category}`;
      }

      // Get rewards with stock info (use aliases for camelCase frontend compatibility)
      const rewardsResult = await db.execute(sql`
        SELECT
          r.id,
          r.name,
          r.description,
          r.reward_type as "rewardType",
          r.points_cost as "pointsCost",
          r.image_url as "imageUrl",
          r.stock_quantity as "stockCount",
          r.is_active as "isActive",
          r.program_id as "programId",
          r.tenant_id as "tenantId",
          r.category,
          r.reward_data as "rewardData",
          r.created_at as "createdAt",
          COALESCE(r.stock_quantity, 0) as "stockRemaining",
          CASE WHEN r.stock_quantity IS NULL OR r.stock_quantity > 0 THEN TRUE ELSE FALSE END as "inStock",
          COUNT(rr.id) FILTER (WHERE rr.fan_id = ${userId}) as "userRedemptionCount"
        FROM rewards r
        LEFT JOIN reward_redemptions rr ON rr.reward_id = r.id
        WHERE ${conditions}
        GROUP BY r.id
        ORDER BY r.points_cost ASC, r.created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `);

      // Get user's points balance (auto-resolve program if not specified)
      let userBalance = 0;
      let userTier = null;
      if (programId) {
        const fanProgramResult = await db
          .select()
          .from(fanPrograms)
          .where(and(eq(fanPrograms.fanId, userId), eq(fanPrograms.programId, programId)))
          .limit(1);

        if (fanProgramResult[0]) {
          userBalance = fanProgramResult[0].currentPoints || 0;
          userTier = await tierProgressionService.getCurrentTier(fanProgramResult[0].id);
        }
      } else {
        // Auto-resolve: get the first enrolled fan program to show balance
        const fanProgramResult = await db
          .select()
          .from(fanPrograms)
          .where(eq(fanPrograms.fanId, userId))
          .limit(1);

        if (fanProgramResult[0]) {
          userBalance = fanProgramResult[0].currentPoints || 0;
          userTier = await tierProgressionService.getCurrentTier(fanProgramResult[0].id);
        }
      }

      // Mark which rewards user can afford
      const rewardsWithAffordability = ((rewardsResult as any).rows || []).map((r: any) => ({
        ...r,
        canAfford: userBalance >= (r.points_cost || 0),
        userBalance,
      }));

      res.json({
        rewards: rewardsWithAffordability,
        pagination: { limit, offset },
        userBalance,
        userPoints: userBalance,
        userTier,
      });
    } catch (error) {
      console.error('Error fetching reward catalog:', error);
      res.status(500).json({ error: 'Failed to fetch reward catalog' });
    }
  });

  /**
   * GET /api/rewards/catalog/:rewardId
   * Get detailed info for a specific reward
   */
  app.get(
    '/api/rewards/catalog/:rewardId',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { rewardId } = req.params;
        const userId = req.user!.id;

        const [reward] = await db.select().from(rewards).where(eq(rewards.id, rewardId)).limit(1);

        if (!reward) {
          return res.status(404).json({ error: 'Reward not found' });
        }

        // Get user's redemption count for this reward
        const redemptionCountResult = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM reward_redemptions
        WHERE reward_id = ${rewardId} AND user_id = ${userId}
      `);

        const userRedemptionCount = parseInt(
          (redemptionCountResult as any).rows?.[0]?.count || '0'
        );

        // Check if user can redeem (has points, not exceeded limit)
        let canRedeem = true;
        let redeemBlockReason: string | null = null;
        let userBalance = 0;

        if (reward.programId) {
          const fanProgramResult = await db
            .select()
            .from(fanPrograms)
            .where(and(eq(fanPrograms.fanId, userId), eq(fanPrograms.programId, reward.programId)))
            .limit(1);

          if (fanProgramResult[0]) {
            userBalance = fanProgramResult[0].currentPoints || 0;

            if (userBalance < (reward.pointsCost || 0)) {
              canRedeem = false;
              redeemBlockReason = 'insufficient_points';
            }
          } else {
            canRedeem = false;
            redeemBlockReason = 'not_enrolled_in_program';
          }
        }

        // Check stock
        if (reward.stockQuantity !== null && reward.stockQuantity <= 0) {
          canRedeem = false;
          redeemBlockReason = 'out_of_stock';
        }

        // Check per-user limit
        const maxPerUser = (reward.redemptionRules as any)?.maxPerUser;
        if (maxPerUser && userRedemptionCount >= maxPerUser) {
          canRedeem = false;
          redeemBlockReason = 'redemption_limit_reached';
        }

        res.json({
          reward,
          userBalance,
          userRedemptionCount,
          canRedeem,
          redeemBlockReason,
        });
      } catch (error) {
        console.error('Error fetching reward details:', error);
        res.status(500).json({ error: 'Failed to fetch reward details' });
      }
    }
  );

  /**
   * POST /api/rewards/redeem
   * Initiate a reward redemption
   */
  app.post('/api/rewards/redeem', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;

      // Validate request
      const validation = redeemRewardSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid request data',
          details: validation.error.issues,
        });
      }

      const { rewardId, programId, quantity, shippingAddress, metadata } = validation.data;

      // Get reward
      const [reward] = await db.select().from(rewards).where(eq(rewards.id, rewardId)).limit(1);

      if (!reward || !reward.isActive) {
        return res.status(404).json({ error: 'Reward not found or inactive' });
      }

      const totalPointsCost = (reward.pointsCost || 0) * quantity;
      const effectiveProgramId = programId || reward.programId;

      // Get user's fan program to check balance
      if (!effectiveProgramId) {
        return res.status(400).json({ error: 'Program ID required for redemption' });
      }

      const [fanProgram] = await db
        .select()
        .from(fanPrograms)
        .where(and(eq(fanPrograms.fanId, userId), eq(fanPrograms.programId, effectiveProgramId)))
        .limit(1);

      if (!fanProgram) {
        return res.status(403).json({ error: 'You are not enrolled in this program' });
      }

      // Check sufficient balance
      if ((fanProgram.currentPoints || 0) < totalPointsCost) {
        return res.status(400).json({
          error: 'Insufficient points',
          required: totalPointsCost,
          available: fanProgram.currentPoints || 0,
        });
      }

      // Check stock
      if (reward.stockQuantity !== null && reward.stockQuantity < quantity) {
        return res.status(400).json({
          error: 'Insufficient stock',
          requested: quantity,
          available: reward.stockQuantity,
        });
      }

      // Check per-user redemption limit
      const maxPerUser = (reward.redemptionRules as any)?.maxPerUser;
      if (maxPerUser) {
        const userRedemptionCountResult = await db.execute(sql`
          SELECT COALESCE(SUM(quantity), 0) as total
          FROM reward_redemptions
          WHERE reward_id = ${rewardId} AND fan_id = ${userId}
        `);
        const currentCount = parseInt((userRedemptionCountResult as any).rows?.[0]?.total || '0');

        if (currentCount + quantity > maxPerUser) {
          return res.status(400).json({
            error: 'Redemption limit exceeded',
            maxAllowed: maxPerUser,
            alreadyRedeemed: currentCount,
          });
        }
      }

      // Start transaction: deduct points and create redemption
      const result = await db.transaction(async (tx) => {
        // Deduct points atomically — WHERE ensures no negative balance from concurrent requests
        const deductResult = await tx.execute(sql`
          UPDATE fan_programs
          SET current_points = current_points - ${totalPointsCost}
          WHERE id = ${fanProgram.id} AND current_points >= ${totalPointsCost}
        `);
        if ((deductResult as any).rowCount === 0) {
          throw new Error('Insufficient points (concurrent request)');
        }

        // Record point transaction
        await tx.execute(sql`
          INSERT INTO point_transactions 
            (fan_program_id, tenant_id, points, type, source, metadata, created_at)
          VALUES 
            (${fanProgram.id}, ${reward.tenantId || ''}, ${-totalPointsCost}, 'spent', 'reward_redemption', ${JSON.stringify({ rewardId, rewardName: reward.name })}, NOW())
        `);

        // Reduce stock if tracked (atomic guard against negative stock)
        if (reward.stockQuantity !== null) {
          const stockResult = await tx.execute(sql`
            UPDATE rewards
            SET stock_quantity = stock_quantity - ${quantity}
            WHERE id = ${rewardId} AND stock_quantity >= ${quantity}
          `);
          if ((stockResult as any).rowCount === 0) {
            throw new Error('Insufficient stock (concurrent request)');
          }
        }

        // Create redemption record
        const [redemption] = await tx
          .insert(rewardRedemptions)
          .values({
            userId,
            fanId: userId,
            rewardId,
            programId: effectiveProgramId,
            tenantId: reward.tenantId || '',
            quantity,
            pointsSpent: totalPointsCost,
            status: reward.rewardType === 'digital' ? 'completed' : 'pending',
            shippingAddress: shippingAddress || null,
            metadata: metadata || null,
          } as any)
          .returning();

        return redemption;
      });

      // Check tier progression after points deduction
      await tierProgressionService.checkAndUpdateTier(fanProgram.id, 'reward_redemption');

      // If this is an NFT reward, trigger minting
      if (reward.rewardType === 'nft') {
        const nftData = (reward.rewardData as any)?.nftData;

        if (nftData?.autoMintOnRedeem) {
          // Fetch wallet address before try/catch so it's accessible in the catch block
          const [rewardUser] = await db
            .select({
              avalancheL1Address: users.avalancheL1Address,
              walletAddress: users.walletAddress,
            })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

          const walletAddress = rewardUser?.avalancheL1Address || rewardUser?.walletAddress;

          // Attempt to mint NFT immediately
          try {
            if (!walletAddress) {
              // User doesn't have a wallet - defer minting
              console.log(
                `[Redemption] NFT reward deferred - user ${userId} has no wallet address`
              );

              // Update redemption to indicate pending mint
              await db
                .update(rewardRedemptions)
                .set({
                  metadata: {
                    ...((result.metadata as any) || {}),
                    nftMintStatus: 'pending_wallet',
                    nftMintMessage: 'Connect your wallet to receive your NFT',
                  },
                })
                .where(eq(rewardRedemptions.id, result.id));
            } else {
              // Get blockchain service
              const nftService = getBlockchainNFTService();

              if (!nftService) {
                console.error('[Redemption] Blockchain NFT service not available');
                throw new Error('NFT service unavailable');
              }

              // Determine if this is a badge or regular NFT
              const isBadge = nftData.badgeTemplateId || nftData.badgeTypeId;

              if (isBadge) {
                // Mint as a badge (ERC-1155)
                const badgeTemplateId = nftData.badgeTemplateId;

                if (!badgeTemplateId) {
                  throw new Error('Badge template ID required for badge NFT');
                }

                // Get badge template
                const [badgeTemplate] = await db
                  .select()
                  .from(fandomlyBadgeTemplates)
                  .where(eq(fandomlyBadgeTemplates.id, badgeTemplateId))
                  .limit(1);

                if (!badgeTemplate || !badgeTemplate.onChainBadgeTypeId) {
                  throw new Error('Badge template not found or not deployed on-chain');
                }

                // Mint the badge
                const mintResult = await nftService.mintBadge(
                  walletAddress as Address,
                  badgeTemplate.onChainBadgeTypeId,
                  1
                );

                // Record the mint
                const [nftMint] = await db
                  .insert(nftMints)
                  .values({
                    crossmintActionId: `redemption-badge-${Date.now()}-${userId}`,
                    badgeTemplateId: badgeTemplateId,
                    recipientUserId: userId,
                    recipientWalletAddress: walletAddress,
                    recipientChain: 'fandomly-chain',
                    mintReason: 'reward_redemption',
                    contextData: {
                      rewardId: reward.id,
                      pointsSpent: totalPointsCost,
                    },
                    txHash: mintResult.txHash,
                    status: 'success',
                    completedAt: new Date(),
                  } as any)
                  .returning();

                // Update redemption with mint info
                await db
                  .update(rewardRedemptions)
                  .set({
                    metadata: {
                      ...((result.metadata as any) || {}),
                      nftMintId: nftMint.id,
                      nftMintTxHash: mintResult.txHash,
                      nftMintStatus: 'completed',
                    },
                  })
                  .where(eq(rewardRedemptions.id, result.id));

                console.log(
                  `[Redemption] Badge NFT minted for user ${userId}, tx: ${mintResult.txHash}`
                );
              } else {
                // Mint as regular NFT (ERC-721)
                const collectionId = nftData.collectionId;
                const templateId = nftData.templateId;

                if (!collectionId) {
                  throw new Error('Collection ID required for NFT minting');
                }

                // Get template metadata if available
                let tokenUri = 'ipfs://placeholder'; // Default URI

                if (templateId) {
                  const [template] = await db
                    .select()
                    .from(nftTemplates)
                    .where(eq(nftTemplates.id, templateId))
                    .limit(1);

                  if (template?.metadata) {
                    // Use metadata.image as tokenUri or construct from metadata
                    const metadata = template.metadata as any;
                    tokenUri = metadata.image || 'ipfs://placeholder';
                  }
                }

                // Mint the NFT
                const mintResult = await nftService.mintNFT(
                  walletAddress as Address,
                  parseInt(collectionId),
                  tokenUri
                );

                // Record the mint
                const [nftMint] = await db
                  .insert(nftMints)
                  .values({
                    crossmintActionId: `redemption-nft-${Date.now()}-${userId}`,
                    collectionId: collectionId,
                    templateId: templateId || null,
                    recipientUserId: userId,
                    recipientWalletAddress: walletAddress,
                    recipientChain: 'fandomly-chain',
                    mintReason: 'reward_redemption',
                    contextData: {
                      rewardId: reward.id,
                      pointsSpent: totalPointsCost,
                    },
                    txHash: mintResult.txHash,
                    tokenId: mintResult.tokenId || null,
                    status: 'success',
                    completedAt: new Date(),
                  } as any)
                  .returning();

                // Update redemption with mint info
                await db
                  .update(rewardRedemptions)
                  .set({
                    metadata: {
                      ...((result.metadata as any) || {}),
                      nftMintId: nftMint.id,
                      nftMintTxHash: mintResult.txHash,
                      nftTokenId: mintResult.tokenId,
                      nftMintStatus: 'completed',
                    },
                  })
                  .where(eq(rewardRedemptions.id, result.id));

                console.log(
                  `[Redemption] NFT minted for user ${userId}, tx: ${mintResult.txHash}, tokenId: ${mintResult.tokenId}`
                );
              }
            }
          } catch (mintError) {
            console.error('[Redemption] NFT minting failed:', mintError);

            // Record failed mint in nftMints table so retry logic can pick it up
            try {
              await db.insert(nftMints).values({
                crossmintActionId: `redemption-failed-${Date.now()}-${userId}`,
                recipientUserId: userId,
                recipientWalletAddress: walletAddress || null,
                recipientChain: 'fandomly-chain',
                mintReason: 'reward_redemption',
                contextData: {
                  rewardId: reward.id,
                  redemptionId: result.id,
                  pointsSpent: totalPointsCost,
                  nftData,
                },
                status: 'failed',
              } as any);
            } catch {
              /* best-effort */
            }

            // Update redemption to indicate failed mint
            await db
              .update(rewardRedemptions)
              .set({
                metadata: {
                  ...((result.metadata as any) || {}),
                  nftMintStatus: 'failed',
                  nftMintError: mintError instanceof Error ? mintError.message : 'Unknown error',
                },
              })
              .where(eq(rewardRedemptions.id, result.id));

            // Don't fail the entire redemption - points were already spent
            // Failed mints are recorded in nft_mints with status='failed' for retry
          }
        } else {
          // Auto-mint is disabled - mark for manual fulfillment
          console.log(
            `[Redemption] NFT reward redeemed, manual minting required for user ${userId}`
          );

          await db
            .update(rewardRedemptions)
            .set({
              metadata: {
                ...((result.metadata as any) || {}),
                nftMintStatus: 'pending_manual',
                nftMintMessage: 'NFT will be minted by the creator',
              },
            })
            .where(eq(rewardRedemptions.id, result.id));
        }
      }

      res.status(201).json({
        redemption: result,
        pointsDeducted: totalPointsCost,
        newBalance: (fanProgram.currentPoints || 0) - totalPointsCost,
      });
    } catch (error) {
      console.error('Error processing redemption:', error);
      res.status(500).json({ error: 'Failed to process redemption' });
    }
  });

  /**
   * GET /api/rewards/redemptions
   * Get user's redemption history
   */
  app.get('/api/rewards/redemptions', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const status = req.query.status as string | undefined;
      const programId = req.query.programId as string | undefined;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      let conditions = sql`rr.fan_id = ${userId}`;

      if (status) {
        conditions = sql`${conditions} AND rr.status = ${status}`;
      }
      if (programId) {
        conditions = sql`${conditions} AND rr.program_id = ${programId}`;
      }

      const redemptionsResult = await db.execute(sql`
        SELECT 
          rr.*,
          r.name as reward_name,
          r.description as reward_description,
          r.image_url as reward_image,
          r.reward_type,
          lp.name as program_name
        FROM reward_redemptions rr
        INNER JOIN rewards r ON rr.reward_id = r.id
        LEFT JOIN loyalty_programs lp ON rr.program_id = lp.id
        WHERE ${conditions}
        ORDER BY rr.redeemed_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `);

      const totalResult = await db.execute(sql`
        SELECT COUNT(*) as total
        FROM reward_redemptions rr
        WHERE ${conditions}
      `);

      res.json({
        redemptions: (redemptionsResult as any).rows || [],
        pagination: {
          limit,
          offset,
          total: parseInt((totalResult as any).rows?.[0]?.total || '0'),
        },
      });
    } catch (error) {
      console.error('Error fetching redemptions:', error);
      res.status(500).json({ error: 'Failed to fetch redemptions' });
    }
  });

  /**
   * GET /api/rewards/redemptions/pending
   * Get pending redemptions for creator to fulfill
   * NOTE: Must be registered BEFORE /:redemptionId to avoid route shadowing
   */
  app.get(
    '/api/rewards/redemptions/pending',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user!.id;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        // Get creator's tenant
        const creator = await storage.getCreatorByUserId(userId);
        if (!creator) {
          return res.status(403).json({ error: 'Only creators can access pending redemptions' });
        }

        const redemptionsResult = await db.execute(sql`
        SELECT
          rr.*,
          r.name as reward_name,
          r.image_url as reward_image,
          r.reward_type,
          u.username,
          u.email
        FROM reward_redemptions rr
        INNER JOIN rewards r ON rr.reward_id = r.id
        INNER JOIN users u ON rr.fan_id = u.id
        WHERE r.tenant_id = ${creator.tenantId}
          AND rr.status = 'pending'
        ORDER BY rr.redeemed_at ASC
        LIMIT ${limit}
        OFFSET ${offset}
      `);

        const totalResult = await db.execute(sql`
        SELECT COUNT(*) as total
        FROM reward_redemptions rr
        INNER JOIN rewards r ON rr.reward_id = r.id
        WHERE r.tenant_id = ${creator.tenantId}
          AND rr.status = 'pending'
      `);

        res.json({
          redemptions: (redemptionsResult as any).rows || [],
          pagination: {
            limit,
            offset,
            total: parseInt((totalResult as any).rows?.[0]?.total || '0'),
          },
        });
      } catch (error) {
        console.error('Error fetching pending redemptions:', error);
        res.status(500).json({ error: 'Failed to fetch pending redemptions' });
      }
    }
  );

  /**
   * GET /api/rewards/redemptions/:redemptionId
   * Get specific redemption details
   */
  app.get(
    '/api/rewards/redemptions/:redemptionId',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { redemptionId } = req.params;
        const userId = req.user!.id;

        const redemptionResult = await db.execute(sql`
        SELECT 
          rr.*,
          r.name as reward_name,
          r.description as reward_description,
          r.image_url as reward_image,
          r.reward_type,
          lp.name as program_name
        FROM reward_redemptions rr
        INNER JOIN rewards r ON rr.reward_id = r.id
        LEFT JOIN loyalty_programs lp ON rr.program_id = lp.id
        WHERE rr.id = ${redemptionId}
      `);

        const redemption = (redemptionResult as any).rows?.[0];
        if (!redemption) {
          return res.status(404).json({ error: 'Redemption not found' });
        }

        // Check ownership unless admin
        if (redemption.user_id !== userId && req.user?.userType !== 'admin') {
          return res.status(403).json({ error: 'Not authorized to view this redemption' });
        }

        res.json({ redemption });
      } catch (error) {
        console.error('Error fetching redemption:', error);
        res.status(500).json({ error: 'Failed to fetch redemption' });
      }
    }
  );

  /**
   * PUT /api/rewards/redemptions/:redemptionId/fulfill
   * Creator fulfillment endpoint
   */
  app.put(
    '/api/rewards/redemptions/:redemptionId/fulfill',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { redemptionId } = req.params;
        const userId = req.user!.id;

        // Validate request
        const validation = fulfillRedemptionSchema.safeParse(req.body);
        if (!validation.success) {
          return res.status(400).json({
            error: 'Invalid request data',
            details: validation.error.issues,
          });
        }

        const { status, trackingNumber, trackingUrl, notes } = validation.data;

        // Get redemption with authorization check
        const redemptionResult = await db.execute(sql`
        SELECT 
          rr.*,
          r.tenant_id as reward_tenant_id,
          c.user_id as creator_user_id
        FROM reward_redemptions rr
        INNER JOIN rewards r ON rr.reward_id = r.id
        LEFT JOIN creators c ON c.tenant_id = r.tenant_id
        WHERE rr.id = ${redemptionId}
      `);

        const redemption = (redemptionResult as any).rows?.[0];
        if (!redemption) {
          return res.status(404).json({ error: 'Redemption not found' });
        }

        // Check authorization (creator of the reward or admin)
        const isCreator = redemption.creator_user_id === userId;
        const isAdmin = req.user?.userType === 'admin';

        if (!isCreator && !isAdmin) {
          return res.status(403).json({ error: 'Not authorized to fulfill this redemption' });
        }

        // Update redemption status
        const updateData: any = {
          status,
          updatedAt: new Date(),
        };

        if (trackingNumber) updateData.trackingNumber = trackingNumber;
        if (trackingUrl) updateData.trackingUrl = trackingUrl;
        if (notes) updateData.fulfillmentNotes = notes;

        if (status === 'shipped' || status === 'delivered') {
          updateData.fulfilledAt = new Date();
          updateData.fulfilledBy = userId;
        }

        await db
          .update(rewardRedemptions)
          .set(updateData)
          .where(eq(rewardRedemptions.id, redemptionId));

        // If cancelled/refunded, return points and restore stock
        if (status === 'cancelled' || status === 'refunded') {
          const pointsToReturn = redemption.points_spent || 0;
          const quantityToRestore = redemption.quantity || 1;

          // Get fan program (prefer fan_id, fall back to user_id for old records)
          const fanIdForLookup = redemption.fan_id || redemption.user_id;
          const [fanProgram] = await db
            .select()
            .from(fanPrograms)
            .where(
              and(
                eq(fanPrograms.fanId, fanIdForLookup),
                eq(fanPrograms.programId, redemption.program_id)
              )
            )
            .limit(1);

          if (fanProgram && pointsToReturn > 0) {
            await db.execute(sql`
            UPDATE fan_programs
            SET current_points = current_points + ${pointsToReturn}
            WHERE id = ${fanProgram.id}
          `);

            await db.execute(sql`
            INSERT INTO point_transactions 
              (fan_program_id, tenant_id, points, type, source, metadata, created_at)
            VALUES 
              (${fanProgram.id}, ${redemption.tenant_id || ''}, ${pointsToReturn}, 'refund', 'redemption_cancelled', ${JSON.stringify({ redemptionId, reason: status })}, NOW())
          `);
          }

          // Restore stock quantity on the reward
          if (redemption.reward_id) {
            await db.execute(sql`
            UPDATE rewards
            SET stock_quantity = stock_quantity + ${quantityToRestore}
            WHERE id = ${redemption.reward_id} AND stock_quantity IS NOT NULL
          `);
          }
        }

        res.json({
          message: `Redemption ${status}`,
          redemptionId,
          status,
        });
      } catch (error) {
        console.error('Error fulfilling redemption:', error);
        res.status(500).json({ error: 'Failed to fulfill redemption' });
      }
    }
  );
}
