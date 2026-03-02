/**
 * Creator Verification Badge Service
 *
 * Mints a soulbound ERC-1155 badge NFT on Fandomly Chain when a creator is verified.
 * Uses the FandomlyBadge contract via blockchain-nft-service.ts.
 *
 * Badge lifecycle:
 * - Auto-verification (profile complete) -> mint badge
 * - Manual admin verification -> mint badge
 * - De-verification -> mark badge as revoked in DB (soulbound NFT cannot be burned)
 */

import { db } from '../../db';
import { eq } from 'drizzle-orm';
import { fandomlyBadgeTemplates, creators, users } from '@shared/schema';
import { getBlockchainNFTService } from './blockchain-nft-service';
import type { Address } from 'viem';

const VERIFIED_BADGE_TEMPLATE_ID = 'verified-creator-badge-v1';

// ============================================================================
// BADGE TEMPLATE MANAGEMENT
// ============================================================================

/**
 * Ensure the Verified Creator badge template exists in DB and on-chain.
 * Idempotent — safe to call multiple times.
 */
async function ensureVerifiedCreatorBadgeTemplate() {
  // Check if template already exists
  const existing = await db.query.fandomlyBadgeTemplates.findFirst({
    where: eq(fandomlyBadgeTemplates.id, VERIFIED_BADGE_TEMPLATE_ID),
  });

  if (existing) return existing;

  // Create on-chain badge type
  const nftService = getBlockchainNFTService();
  if (!nftService) {
    throw new Error('Blockchain NFT service not available (DEPLOYER_PRIVATE_KEY not set)');
  }

  const metadataUri = 'ipfs://verified-creator-badge'; // Placeholder URI
  await nftService.createPlatformBadgeType(metadataUri, true, 0); // soulbound, unlimited

  // Get the badge type ID that was just created
  const nextId = await nftService.getNextBadgeTypeId();
  const badgeTypeId = Number(nextId) - 1; // Last created ID

  // Insert template in DB
  const [template] = await db
    .insert(fandomlyBadgeTemplates)
    .values({
      id: VERIFIED_BADGE_TEMPLATE_ID,
      name: 'Verified Creator',
      description: 'Awarded to verified creators on Fandomly. Soulbound and non-transferable.',
      category: 'achievement',
      requirementType: 'manual',
      requirementData: {
        customCriteria: 'Profile 100% complete OR admin manual verification',
      },
      imageUrl: '/assets/badges/verified-creator.png',
      badgeColor: '#8B5CF6',
      nftMetadata: {
        attributes: [
          { trait_type: 'Badge Type', value: 'Verification' },
          { trait_type: 'Soulbound', value: 'Yes' },
        ],
        rarity: 'uncommon',
      },
      onChainBadgeTypeId: badgeTypeId,
      isActive: true,
    })
    .returning();

  console.log(`[VerificationBadge] Created badge template, on-chain ID: ${badgeTypeId}`);

  return template;
}

// ============================================================================
// BADGE MINTING
// ============================================================================

/**
 * Mint a Verified Creator badge NFT to the creator's wallet.
 *
 * - Idempotent: won't mint twice for the same creator
 * - Non-blocking: caller should .catch() errors — badge failure must not block verification
 * - Requires creator to have a wallet address
 */
export async function mintVerifiedCreatorBadge(
  creatorId: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    // Get creator record
    const creator = await db.query.creators.findFirst({
      where: eq(creators.id, creatorId),
    });
    if (!creator) {
      return { success: false, error: 'Creator not found' };
    }

    // Check if badge was already minted
    const existingBadge = (creator.verificationData as Record<string, unknown>)?.badgeNFT;
    if (existingBadge) {
      console.log(`[VerificationBadge] Badge already minted for creator ${creatorId}`);
      return { success: true, txHash: (existingBadge as Record<string, string>).txHash };
    }

    // Get creator's wallet address
    const user = await db.query.users.findFirst({
      where: eq(users.id, creator.userId),
    });
    const walletAddress = user?.walletAddress;
    if (!walletAddress) {
      return { success: false, error: 'Creator has no wallet address — badge deferred' };
    }

    // Ensure badge template exists
    const template = await ensureVerifiedCreatorBadgeTemplate();

    // Get NFT service
    const nftService = getBlockchainNFTService();
    if (!nftService) {
      return { success: false, error: 'Blockchain NFT service not available' };
    }

    // Mint on-chain
    const result = await nftService.mintBadge(
      walletAddress as Address,
      template.onChainBadgeTypeId!,
      1
    );

    // Store badge data in creator's verificationData
    const currentData = creator.verificationData ?? {
      profileComplete: false,
      requiredFieldsFilled: [],
      completionPercentage: 0,
    };
    await db
      .update(creators)
      .set({
        verificationData: {
          ...currentData,
          badgeNFT: {
            onChainBadgeTypeId: template.onChainBadgeTypeId!,
            txHash: result.txHash,
            mintedAt: new Date().toISOString(),
            recipientWallet: walletAddress,
          },
        },
      })
      .where(eq(creators.id, creatorId));

    // Increment issued count
    await db
      .update(fandomlyBadgeTemplates)
      .set({ totalIssued: (template.totalIssued ?? 0) + 1 })
      .where(eq(fandomlyBadgeTemplates.id, template.id));

    console.log(`[VerificationBadge] Minted badge for creator ${creatorId}, tx: ${result.txHash}`);

    return { success: true, txHash: result.txHash };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[VerificationBadge] Mint failed for creator ${creatorId}:`, message);
    return { success: false, error: message };
  }
}

// ============================================================================
// DE-VERIFICATION HANDLING
// ============================================================================

/**
 * Handle badge when a creator is de-verified.
 *
 * Soulbound NFTs cannot be burned on-chain, so we:
 * - Clear the badgeNFT reference from verificationData
 * - Log that the badge is no longer recognized by the platform
 */
export async function handleCreatorDeVerification(creatorId: string): Promise<void> {
  try {
    const creator = await db.query.creators.findFirst({
      where: eq(creators.id, creatorId),
    });
    if (!creator) return;

    const currentData = creator.verificationData ?? {
      profileComplete: false,
      requiredFieldsFilled: [],
      completionPercentage: 0,
    };
    if (!currentData.badgeNFT) return; // No badge to clear

    await db
      .update(creators)
      .set({
        verificationData: {
          ...currentData,
          badgeNFT: undefined,
          badgeRevoked: true,
          badgeRevokedAt: new Date().toISOString(),
        },
      })
      .where(eq(creators.id, creatorId));

    console.log(
      `[VerificationBadge] Cleared badge data for de-verified creator ${creatorId}. Soulbound NFT remains in wallet.`
    );
  } catch (error) {
    console.error(
      `[VerificationBadge] Error handling de-verification for creator ${creatorId}:`,
      error
    );
  }
}
