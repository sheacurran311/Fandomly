import { Router } from 'express';
import { eq, and, count } from 'drizzle-orm';
import { db } from '../../db';
import { creators, loyaltyPrograms, tasks } from '@shared/schema';
import {
  authenticateUser,
  requireFandomlyAdmin,
  AuthenticatedRequest,
} from '../../middleware/rbac';
import {
  calculateCreatorVerification,
  getMissingFieldsDisplay,
} from '@shared/creatorVerificationSchema';
import type { PlatformActivityContext } from '@shared/creatorVerificationSchema';
import {
  mintVerifiedCreatorBadge,
  handleCreatorDeVerification,
} from '../../services/nft/creator-verification-badge-service';

const router = Router();

/**
 * Query platform activity counts for a creator (programs + tasks).
 */
async function getPlatformActivity(creatorId: string): Promise<PlatformActivityContext> {
  const [programResult, taskResult, publishedPrograms] = await Promise.all([
    db
      .select({ total: count() })
      .from(loyaltyPrograms)
      .where(and(eq(loyaltyPrograms.creatorId, creatorId), eq(loyaltyPrograms.isActive, true))),
    db
      .select({ total: count() })
      .from(tasks)
      .where(and(eq(tasks.creatorId, creatorId), eq(tasks.ownershipLevel, 'creator'))),
    db
      .select({
        description: loyaltyPrograms.description,
        pageConfig: loyaltyPrograms.pageConfig,
      })
      .from(loyaltyPrograms)
      .where(and(eq(loyaltyPrograms.creatorId, creatorId), eq(loyaltyPrograms.status, 'published')))
      .limit(1),
  ]);

  const program = publishedPrograms[0];
  const pageConfig = (program?.pageConfig as Record<string, unknown>) || {};

  return {
    activeProgramCount: Number(programResult[0]?.total) || 0,
    publishedTaskCount: Number(taskResult[0]?.total) || 0,
    hasPublishedProgram: !!program,
    programDescription: program?.description || null,
    programLogo: (pageConfig.logo as string) || null,
  };
}

/**
 * GET /api/creator-verification/status
 * Get verification status for the authenticated creator
 */
router.get('/status', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    // Get creator for this user
    const creator = await db.query.creators.findFirst({
      where: eq(creators.userId, userId),
    });

    if (!creator) {
      return res.status(404).json({ error: 'Creator profile not found' });
    }

    // Calculate current verification status
    const creatorType = creator.category as 'athlete' | 'musician' | 'content_creator';
    const platformActivity = await getPlatformActivity(creator.id);
    const verificationData = calculateCreatorVerification(creator, creatorType, platformActivity);

    res.json({
      creator: {
        id: creator.id,
        displayName: creator.displayName,
        category: creator.category,
        isVerified: creator.isVerified,
      },
      verificationData,
      platformActivity,
      missingFieldsDisplay: verificationData.missingFields
        ? getMissingFieldsDisplay(verificationData.missingFields)
        : [],
    });
  } catch (error) {
    console.error('Error fetching verification status:', error);
    res.status(500).json({ error: 'Failed to fetch verification status' });
  }
});

/**
 * POST /api/creator-verification/check
 * Check and update verification status (triggers auto-verification if complete)
 */
router.post('/check', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    // Get creator for this user
    const creator = await db.query.creators.findFirst({
      where: eq(creators.userId, userId),
    });

    if (!creator) {
      return res.status(404).json({ error: 'Creator profile not found' });
    }

    // Calculate verification status
    const creatorType = creator.category as 'athlete' | 'musician' | 'content_creator';
    const platformActivity = await getPlatformActivity(creator.id);
    const verificationData = calculateCreatorVerification(creator, creatorType, platformActivity);

    // Update verification data in database
    const updateData: Record<string, unknown> = {
      verificationData: verificationData,
    };

    // If profile is complete and not yet verified, auto-verify
    if (verificationData.profileComplete && !creator.isVerified) {
      updateData.isVerified = true;
      console.log(`✅ Auto-verifying creator: ${creator.displayName} (${creator.id})`);

      // Mint verification badge NFT (async, non-blocking)
      mintVerifiedCreatorBadge(creator.id).catch((err) =>
        console.error(`[Verification] Badge mint failed for ${creator.id}:`, err)
      );
    }

    // If profile is incomplete but was verified, remove verification
    if (!verificationData.profileComplete && creator.isVerified) {
      updateData.isVerified = false;
      console.log(`⚠️  Removing verification from creator: ${creator.displayName} (${creator.id})`);

      // Handle badge de-verification (async, non-blocking)
      handleCreatorDeVerification(creator.id).catch((err) =>
        console.error(`[Verification] Badge removal failed for ${creator.id}:`, err)
      );
    }

    // Update database
    await db.update(creators).set(updateData).where(eq(creators.id, creator.id));

    res.json({
      success: true,
      verificationData,
      isVerified: updateData.isVerified !== undefined ? updateData.isVerified : creator.isVerified,
      autoVerified: verificationData.profileComplete && !creator.isVerified,
      message: verificationData.profileComplete
        ? 'Profile verified successfully!'
        : `Profile ${verificationData.completionPercentage}% complete. ${verificationData.missingFields?.length || 0} fields remaining.`,
    });
  } catch (error) {
    console.error('Error checking verification status:', error);
    res.status(500).json({ error: 'Failed to check verification status' });
  }
});

/**
 * POST /api/creator-verification/manual-verify
 * Manually verify a creator (admin only - future feature)
 */
router.post(
  '/manual-verify/:creatorId',
  authenticateUser,
  requireFandomlyAdmin,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { creatorId } = req.params;
      const _userId = req.user?.id;

      const creator = await db.query.creators.findFirst({
        where: eq(creators.id, creatorId),
      });

      if (!creator) {
        return res.status(404).json({ error: 'Creator not found' });
      }

      // Calculate current verification data
      const creatorType = creator.category as 'athlete' | 'musician' | 'content_creator';
      const platformActivity = await getPlatformActivity(creator.id);
      const verificationData = calculateCreatorVerification(creator, creatorType, platformActivity);

      // Update with manual verification
      await db
        .update(creators)
        .set({
          isVerified: true,
          verificationData: {
            ...verificationData,
            verificationMethod: 'manual',
            verifiedAt: new Date().toISOString(),
          },
        })
        .where(eq(creators.id, creatorId));

      console.log(`✅ Manually verified creator: ${creator.displayName} (${creatorId}) by admin`);

      // Mint verification badge NFT (async, non-blocking)
      mintVerifiedCreatorBadge(creatorId).catch((err) =>
        console.error(`[Verification] Badge mint failed for ${creatorId}:`, err)
      );

      res.json({
        success: true,
        message: 'Creator verified manually by admin',
      });
    } catch (error) {
      console.error('Error manually verifying creator:', error);
      res.status(500).json({ error: 'Failed to verify creator' });
    }
  }
);

/**
 * POST /api/creator-verification/remove-verification/:creatorId
 * Remove verification from a creator (admin only - future feature)
 */
router.post(
  '/remove-verification/:creatorId',
  authenticateUser,
  requireFandomlyAdmin,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { creatorId } = req.params;

      const creator = await db.query.creators.findFirst({
        where: eq(creators.id, creatorId),
      });

      if (!creator) {
        return res.status(404).json({ error: 'Creator not found' });
      }

      // Recalculate verification data and remove verification
      const creatorType = creator.category as 'athlete' | 'musician' | 'content_creator';
      const platformActivity = await getPlatformActivity(creator.id);
      const verificationData = calculateCreatorVerification(creator, creatorType, platformActivity);

      await db
        .update(creators)
        .set({
          isVerified: false,
          verificationData: {
            ...verificationData,
            verificationMethod: undefined,
            verifiedAt: undefined,
          },
        })
        .where(eq(creators.id, creatorId));

      console.log(
        `⚠️  Removed verification from creator: ${creator.displayName} (${creatorId}) by admin`
      );

      // Handle badge de-verification (async, non-blocking)
      handleCreatorDeVerification(creatorId).catch((err) =>
        console.error(`[Verification] Badge removal failed for ${creatorId}:`, err)
      );

      res.json({
        success: true,
        message: 'Verification removed by admin',
      });
    } catch (error) {
      console.error('Error removing verification:', error);
      res.status(500).json({ error: 'Failed to remove verification' });
    }
  }
);

export default router;
