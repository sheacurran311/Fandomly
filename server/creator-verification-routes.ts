import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { creators } from '@shared/schema';
import { authenticateUser, requireFandomlyAdmin, AuthenticatedRequest } from './middleware/rbac';
import { calculateCreatorVerification, getMissingFieldsDisplay } from '@shared/creatorVerificationSchema';

const router = Router();

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
    const verificationData = calculateCreatorVerification(creator, creatorType);

    res.json({
      creator: {
        id: creator.id,
        displayName: creator.displayName,
        category: creator.category,
        isVerified: creator.isVerified,
      },
      verificationData,
      missingFieldsDisplay: verificationData.missingFields 
        ? getMissingFieldsDisplay(verificationData.missingFields)
        : []
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
    const verificationData = calculateCreatorVerification(creator, creatorType);

    // Update verification data in database
    const updateData: any = {
      verificationData: verificationData,
    };

    // If profile is complete and not yet verified, auto-verify
    if (verificationData.profileComplete && !creator.isVerified) {
      updateData.isVerified = true;
      console.log(`✅ Auto-verifying creator: ${creator.displayName} (${creator.id})`);
    }

    // If profile is incomplete but was verified, remove verification
    if (!verificationData.profileComplete && creator.isVerified) {
      updateData.isVerified = false;
      console.log(`⚠️  Removing verification from creator: ${creator.displayName} (${creator.id})`);
    }

    // Update database
    await db.update(creators)
      .set(updateData)
      .where(eq(creators.id, creator.id));

    res.json({
      success: true,
      verificationData,
      isVerified: updateData.isVerified !== undefined ? updateData.isVerified : creator.isVerified,
      autoVerified: verificationData.profileComplete && !creator.isVerified,
      message: verificationData.profileComplete
        ? 'Profile verified successfully!'
        : `Profile ${verificationData.completionPercentage}% complete. ${verificationData.missingFields?.length || 0} fields remaining.`
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
router.post('/manual-verify/:creatorId', authenticateUser, requireFandomlyAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { creatorId } = req.params;
    const userId = req.user?.id;

    const creator = await db.query.creators.findFirst({
      where: eq(creators.id, creatorId),
    });

    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }

    // Calculate current verification data
    const creatorType = creator.category as 'athlete' | 'musician' | 'content_creator';
    const verificationData = calculateCreatorVerification(creator, creatorType);

    // Update with manual verification
    await db.update(creators)
      .set({
        isVerified: true,
        verificationData: {
          ...verificationData,
          verificationMethod: 'manual',
          verifiedAt: new Date().toISOString(),
        }
      })
      .where(eq(creators.id, creatorId));

    console.log(`✅ Manually verified creator: ${creator.displayName} (${creatorId}) by admin`);

    res.json({
      success: true,
      message: 'Creator verified manually by admin',
    });
  } catch (error) {
    console.error('Error manually verifying creator:', error);
    res.status(500).json({ error: 'Failed to verify creator' });
  }
});

/**
 * POST /api/creator-verification/remove-verification/:creatorId
 * Remove verification from a creator (admin only - future feature)
 */
router.post('/remove-verification/:creatorId', authenticateUser, requireFandomlyAdmin, async (req: AuthenticatedRequest, res) => {
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
    const verificationData = calculateCreatorVerification(creator, creatorType);

    await db.update(creators)
      .set({
        isVerified: false,
        verificationData: {
          ...verificationData,
          verificationMethod: undefined,
          verifiedAt: undefined,
        }
      })
      .where(eq(creators.id, creatorId));

    console.log(`⚠️  Removed verification from creator: ${creator.displayName} (${creatorId}) by admin`);

    res.json({
      success: true,
      message: 'Verification removed by admin',
    });
  } catch (error) {
    console.error('Error removing verification:', error);
    res.status(500).json({ error: 'Failed to remove verification' });
  }
});

export default router;

