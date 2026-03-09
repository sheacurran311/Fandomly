/**
 * NFT Routes — On-chain NFT + Badge minting via Fandomly Chain L1.
 *
 * Replaces the Crossmint-based routes with direct contract interaction.
 * All transactions are sent by the deployer wallet (backend-managed).
 *
 * Endpoints:
 *   POST   /api/nft/upload/image          — Upload image to IPFS
 *   POST   /api/nft/upload/video          — Upload video + thumbnail to IPFS
 *   POST   /api/nft/collections           — Create on-chain NFT collection
 *   GET    /api/nft/collections            — List user's collections
 *   GET    /api/nft/collections/:id        — Get collection details
 *   POST   /api/nft/mint                   — Mint a single NFT
 *   GET    /api/nft/tokens/:address        — Get tokens owned by address
 *   POST   /api/nft/badges/types           — Create badge type (platform or creator)
 *   POST   /api/nft/badges/mint            — Mint badge to user
 *   POST   /api/nft/badges/batch-mint      — Batch mint badges
 *   GET    /api/nft/badges/types/:id       — Get badge type info
 *   GET    /api/nft/badges/user/:address   — Get user's badge balances
 *   POST   /api/nft/creator-collections    — Deploy creator NFT collection via factory
 *   GET    /api/nft/creator-collections/:address — Get creator's collections
 *   GET    /api/nft/stats                  — Platform NFT statistics
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Express } from 'express';
import { eq, desc } from 'drizzle-orm';
import multer from 'multer';
import { getBlockchainNFTService } from '../../services/nft/blockchain-nft-service';
import { getIPFSService } from '../../services/nft/ipfs-service';
import { storage } from '../../core/storage';
import { db } from '../../db';
import { authenticateUser, requireRole, type AuthenticatedRequest } from '../../middleware/rbac';
import {
  nftCollections,
  nftMints,
  nftDeliveries,
  fandomlyBadgeTemplates,
  type InsertNftCollection,
  type InsertNftMint,
  type InsertNftDelivery,
} from '@shared/schema';
import { CONTRACTS } from '@shared/blockchain-config';
import type { Address } from 'viem';

// ── Multer config for in-memory buffers ─────────────────────────────────

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB (video support)
    files: 2, // image + thumbnail OR video + thumbnail
  },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'video/mp4',
      'video/webm',
      'video/quicktime',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

// ── Route Registration ──────────────────────────────────────────────────

export function registerNFTRoutes(app: Express) {
  // ====================================================================
  // IPFS UPLOAD ROUTES
  // ====================================================================

  /**
   * POST /api/nft/upload/image
   * Upload an image to IPFS and return the URI.
   */
  app.post(
    '/api/nft/upload/image',
    authenticateUser,
    upload.single('image'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const ipfs = getIPFSService();
        if (!ipfs) return res.status(503).json({ error: 'IPFS service not available' });

        const file = req.file;
        if (!file) return res.status(400).json({ error: 'No image file provided' });

        const result = await ipfs.uploadImage(file.buffer, file.originalname, file.mimetype);

        res.json({
          success: true,
          ipfsHash: result.ipfsHash,
          ipfsUri: result.ipfsUri,
          gatewayUrl: result.gatewayUrl,
          size: result.size,
        });
      } catch (error: unknown) {
        console.error('Upload image error:', error);
        res.status(500).json({
          error: 'Failed to upload image',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );

  /**
   * POST /api/nft/upload/video
   * Upload a video + thumbnail to IPFS. Expects multipart fields: video, thumbnail.
   */
  app.post(
    '/api/nft/upload/video',
    authenticateUser,
    upload.fields([
      { name: 'video', maxCount: 1 },
      { name: 'thumbnail', maxCount: 1 },
    ]),
    async (req: AuthenticatedRequest, res) => {
      try {
        const ipfs = getIPFSService();
        if (!ipfs) return res.status(503).json({ error: 'IPFS service not available' });

        const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
        const videoFile = files?.video?.[0];
        const thumbnailFile = files?.thumbnail?.[0];

        if (!videoFile) return res.status(400).json({ error: 'No video file provided' });
        if (!thumbnailFile) return res.status(400).json({ error: 'No thumbnail file provided' });

        const [videoResult, thumbnailResult] = await Promise.all([
          ipfs.uploadVideo(videoFile.buffer, videoFile.originalname, videoFile.mimetype),
          ipfs.uploadImage(
            thumbnailFile.buffer,
            thumbnailFile.originalname,
            thumbnailFile.mimetype
          ),
        ]);

        res.json({
          success: true,
          video: {
            ipfsHash: videoResult.ipfsHash,
            ipfsUri: videoResult.ipfsUri,
            gatewayUrl: videoResult.gatewayUrl,
            size: videoResult.size,
          },
          thumbnail: {
            ipfsHash: thumbnailResult.ipfsHash,
            ipfsUri: thumbnailResult.ipfsUri,
            gatewayUrl: thumbnailResult.gatewayUrl,
            size: thumbnailResult.size,
          },
        });
      } catch (error: unknown) {
        console.error('Upload video error:', error);
        res.status(500).json({
          error: 'Failed to upload video',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );

  // ====================================================================
  // NFT COLLECTION ROUTES (FandomlyNFT — ERC-721)
  // ====================================================================

  /**
   * POST /api/nft/collections
   * Create an on-chain NFT collection in FandomlyNFT contract.
   */
  app.post('/api/nft/collections', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const blockchain = getBlockchainNFTService();
      if (!blockchain) return res.status(503).json({ error: 'Blockchain service not available' });

      const { name, description, maxSupply, pointsCost, imageUrl } = req.body;

      if (!name || !maxSupply) {
        return res.status(400).json({ error: 'Name and maxSupply are required' });
      }

      const user = await storage.getUser(req.user!.id);
      if (!user?.currentTenantId) {
        return res.status(400).json({ error: 'No active tenant found' });
      }

      const creator = await storage.getCreatorByUserId(req.user!.id);

      // Create on-chain
      const { txHash, receipt } = await blockchain.createNFTCollection(
        name,
        maxSupply,
        pointsCost || 0
      );

      // Get the new collection ID from on-chain state
      const nextId = await blockchain.getNextCollectionId();
      const onChainCollectionId = Number(nextId) - 1;

      const newCollection: InsertNftCollection = {
        creatorId: creator?.id,
        tenantId: user.currentTenantId,
        name,
        description: description || '',
        chain: 'fandomly-chain',
        contractAddress: CONTRACTS.FandomlyNFT,
        tokenType: 'ERC721',
        isCreatorOwned: !!creator,
        metadata: {
          totalSupply: 0,
          maxSupply,
          collectionImageUrl: imageUrl,
          onChainCollectionId,
        } as any,
        isActive: true,
        deployedAt: new Date(),
      };

      const [saved] = await db.insert(nftCollections).values(newCollection).returning();

      res.json({
        success: true,
        collection: saved,
        onChain: {
          txHash,
          collectionId: onChainCollectionId,
          gasUsed: receipt.gasUsed.toString(),
        },
      });
    } catch (error: unknown) {
      console.error('Create collection error:', error);
      res.status(500).json({
        error: 'Failed to create collection',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * GET /api/nft/collections
   * List collections for the authenticated user.
   */
  app.get('/api/nft/collections', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const creator = await storage.getCreatorByUserId(req.user!.id);

      let collections: (typeof nftCollections.$inferSelect)[] = [];
      if (req.user?.role === 'fandomly_admin') {
        collections = await db
          .select()
          .from(nftCollections)
          .orderBy(desc(nftCollections.createdAt));
      } else if (creator) {
        collections = await db
          .select()
          .from(nftCollections)
          .where(eq(nftCollections.creatorId, creator.id))
          .orderBy(desc(nftCollections.createdAt));
      }

      res.json({ collections });
    } catch (error: unknown) {
      console.error('Get collections error:', error);
      res.status(500).json({
        error: 'Failed to fetch collections',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * GET /api/nft/collections/:id
   * Get collection details (on-chain + DB).
   */
  app.get('/api/nft/collections/:id', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;

      const [collection] = await db
        .select()
        .from(nftCollections)
        .where(eq(nftCollections.id, id))
        .limit(1);

      if (!collection) return res.status(404).json({ error: 'Collection not found' });

      let onChainData;
      const blockchain = getBlockchainNFTService();
      if (
        blockchain &&
        (collection.metadata as Record<string, unknown>)?.onChainCollectionId !== undefined
      ) {
        try {
          const onChainId = (collection.metadata as Record<string, unknown>).onChainCollectionId;
          if (typeof onChainId === 'number') {
            onChainData = await blockchain.getNFTCollection(onChainId);
          }
        } catch {
          // On-chain data fetch is best-effort
        }
      }

      res.json({ collection, onChainData });
    } catch (error: unknown) {
      console.error('Get collection error:', error);
      res.status(500).json({
        error: 'Failed to fetch collection',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // ====================================================================
  // MINTING ROUTES
  // ====================================================================

  /**
   * POST /api/nft/mint
   * Mint a single NFT. Uploads metadata to IPFS first if provided inline.
   */
  app.post('/api/nft/mint', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const blockchain = getBlockchainNFTService();
      if (!blockchain) return res.status(503).json({ error: 'Blockchain service not available' });

      const ipfs = getIPFSService();

      const {
        collectionId, // DB collection ID
        recipientAddress,
        recipientUserId,
        tokenUri, // Pre-uploaded IPFS URI
        metadata, // OR inline metadata to upload
        mintReason,
        contextData,
      } = req.body;

      if (!collectionId || !recipientAddress) {
        return res.status(400).json({ error: 'collectionId and recipientAddress are required' });
      }

      // Resolve collection
      const [collection] = await db
        .select()
        .from(nftCollections)
        .where(eq(nftCollections.id, collectionId))
        .limit(1);

      if (!collection) return res.status(404).json({ error: 'Collection not found' });

      const onChainCollectionId = (collection.metadata as Record<string, unknown>)
        ?.onChainCollectionId;
      if (onChainCollectionId === undefined || typeof onChainCollectionId !== 'number') {
        return res.status(400).json({ error: 'Collection has no valid on-chain ID' });
      }

      let finalTokenUri = tokenUri;
      if (!finalTokenUri && metadata && ipfs) {
        const uploaded = await ipfs.uploadMetadata(metadata, metadata.name);
        finalTokenUri = uploaded.ipfsUri;
      }
      if (!finalTokenUri) {
        return res.status(400).json({ error: 'tokenUri or metadata is required' });
      }

      const mintResult = await blockchain.mintNFT(
        recipientAddress as Address,
        onChainCollectionId,
        finalTokenUri
      );

      // Save mint record
      const actionId = `fandomly-${mintResult.txHash}`;
      const newMint: InsertNftMint = {
        crossmintActionId: actionId,
        collectionId: collection.id,
        recipientUserId: recipientUserId || req.user!.id,
        recipientWalletAddress: recipientAddress,
        recipientChain: 'fandomly-chain',
        mintReason: mintReason || 'direct_mint',
        contextData,
        tokenId: mintResult.tokenId,
        txHash: mintResult.txHash,
        contractAddress: CONTRACTS.FandomlyNFT,
        status: mintResult.receipt.status === 'success' ? 'success' : 'failed',
        completedAt: new Date(),
      };

      const [savedMint] = await db.insert(nftMints).values(newMint).returning();

      // Create delivery record if successful
      if (mintResult.receipt.status === 'success') {
        const deliveryRecord: InsertNftDelivery = {
          mintId: savedMint.id,
          userId: recipientUserId || req.user!.id,
          collectionId: collection.id,
          tokenId: mintResult.tokenId || '0',
          txHash: mintResult.txHash,
          chain: 'fandomly-chain',
          contractAddress: CONTRACTS.FandomlyNFT,
          metadataSnapshot: metadata || { name: 'NFT', image: finalTokenUri },
        };
        await db.insert(nftDeliveries).values(deliveryRecord);
      }

      res.json({
        success: true,
        mint: savedMint,
        onChain: {
          txHash: mintResult.txHash,
          tokenId: mintResult.tokenId,
          gasUsed: mintResult.receipt.gasUsed.toString(),
        },
      });
    } catch (error: unknown) {
      console.error('Mint NFT error:', error);
      res.status(500).json({
        error: 'Failed to mint NFT',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * GET /api/nft/tokens/:address
   * Get all NFT tokens owned by an address (on-chain query).
   */
  app.get('/api/nft/tokens/:address', async (req, res) => {
    try {
      const blockchain = getBlockchainNFTService();
      if (!blockchain) return res.status(503).json({ error: 'Blockchain service not available' });

      const { address } = req.params;
      const tokenIds = await blockchain.getTokensOfOwner(address as Address);

      // Fetch token URIs for each token
      const tokens = await Promise.all(
        tokenIds.map(async (tokenId) => {
          let uri = '';
          try {
            uri = await blockchain.getTokenURI(Number(tokenId));
          } catch {
            /* token may be burned */
          }
          return { tokenId: tokenId.toString(), uri };
        })
      );

      res.json({ address, tokens, total: tokens.length });
    } catch (error: unknown) {
      console.error('Get tokens error:', error);
      res.status(500).json({
        error: 'Failed to fetch tokens',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // ====================================================================
  // BADGE ROUTES (FandomlyBadge — ERC-1155)
  // ====================================================================

  /**
   * POST /api/nft/badges/types
   * Create a new badge type (platform or creator).
   * Uploads badge image + metadata to IPFS, then creates on-chain.
   */
  app.post(
    '/api/nft/badges/types',
    authenticateUser,
    upload.single('image'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const blockchain = getBlockchainNFTService();
        if (!blockchain) return res.status(503).json({ error: 'Blockchain service not available' });

        const ipfs = getIPFSService();
        if (!ipfs) return res.status(503).json({ error: 'IPFS service not available' });

        const {
          name,
          description,
          category,
          soulbound: soulboundStr,
          maxSupply: maxSupplyStr,
          creatorAddress,
          metadataUri, // Pre-uploaded metadata URI (optional)
        } = req.body;

        if (!name || !description) {
          return res.status(400).json({ error: 'name and description are required' });
        }

        const soulbound = soulboundStr === 'true' || soulboundStr === true;
        const maxSupply = parseInt(maxSupplyStr || '0', 10);

        let finalMetadataUri = metadataUri;

        // If image file is provided, upload to IPFS and build metadata
        if (req.file && !finalMetadataUri) {
          const result = await ipfs.buildAndUploadBadge({
            name,
            description,
            imageBuffer: req.file.buffer,
            imageFilename: req.file.originalname,
            imageMimeType: req.file.mimetype,
            category: category || 'achievement',
            soulbound,
          });
          finalMetadataUri = result.metadata.ipfsUri;
        }

        if (!finalMetadataUri) {
          return res.status(400).json({ error: 'image file or metadataUri is required' });
        }

        // Create on-chain
        let txResult;
        if (creatorAddress && creatorAddress !== '0x0000000000000000000000000000000000000000') {
          txResult = await blockchain.createCreatorBadgeType(
            finalMetadataUri,
            creatorAddress as Address,
            soulbound,
            maxSupply
          );
        } else {
          txResult = await blockchain.createPlatformBadgeType(
            finalMetadataUri,
            soulbound,
            maxSupply
          );
        }

        // Get the on-chain badge type ID
        const nextId = await blockchain.getNextBadgeTypeId();
        const onChainBadgeTypeId = Number(nextId) - 1;

        const [savedBadge] = await db
          .insert(fandomlyBadgeTemplates)
          .values({
            name,
            description,
            category: category || 'achievement',
            requirementType: 'manual',
            imageUrl: finalMetadataUri,
            nftMetadata: {
              attributes: [
                { trait_type: 'Category', value: category || 'achievement' },
                { trait_type: 'Soulbound', value: soulbound ? 'Yes' : 'No' },
              ],
              onChainBadgeTypeId,
            } as any,
            isActive: true,
            totalIssued: 0,
          })
          .returning();

        res.json({
          success: true,
          badge: savedBadge,
          onChain: {
            txHash: txResult.txHash,
            badgeTypeId: onChainBadgeTypeId,
            gasUsed: txResult.receipt.gasUsed.toString(),
          },
        });
      } catch (error: unknown) {
        console.error('Create badge type error:', error);
        res.status(500).json({
          error: 'Failed to create badge type',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );

  /**
   * POST /api/nft/badges/mint
   * Mint a badge to a single user.
   */
  app.post('/api/nft/badges/mint', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const blockchain = getBlockchainNFTService();
      if (!blockchain) return res.status(503).json({ error: 'Blockchain service not available' });

      const {
        badgeTemplateId,
        recipientAddress,
        recipientUserId,
        amount,
        mintReason,
        contextData,
      } = req.body;

      if (!badgeTemplateId || !recipientAddress) {
        return res.status(400).json({ error: 'badgeTemplateId and recipientAddress are required' });
      }

      // Resolve badge template
      const [badge] = await db
        .select()
        .from(fandomlyBadgeTemplates)
        .where(eq(fandomlyBadgeTemplates.id, badgeTemplateId))
        .limit(1);

      if (!badge) return res.status(404).json({ error: 'Badge template not found' });

      const onChainBadgeTypeId = (badge.nftMetadata as Record<string, unknown>)?.onChainBadgeTypeId;
      if (onChainBadgeTypeId === undefined || typeof onChainBadgeTypeId !== 'number') {
        return res.status(400).json({ error: 'Badge has no valid on-chain type ID' });
      }

      const mintResult = await blockchain.mintBadge(
        recipientAddress as Address,
        onChainBadgeTypeId,
        amount || 1
      );

      // Save mint record
      const actionId = `badge-${mintResult.txHash}`;
      const newMint: InsertNftMint = {
        crossmintActionId: actionId,
        collectionId: badge.collectionId || 'badge-collection',
        badgeTemplateId: badge.id,
        recipientUserId: recipientUserId || req.user!.id,
        recipientWalletAddress: recipientAddress,
        recipientChain: 'fandomly-chain',
        mintReason: mintReason || 'badge_achievement',
        contextData,
        txHash: mintResult.txHash,
        contractAddress: CONTRACTS.FandomlyBadge,
        status: mintResult.receipt.status === 'success' ? 'success' : 'failed',
        completedAt: new Date(),
      };

      const [savedMint] = await db.insert(nftMints).values(newMint).returning();

      // Update badge issued count
      if (mintResult.receipt.status === 'success') {
        await db
          .update(fandomlyBadgeTemplates)
          .set({ totalIssued: (badge.totalIssued || 0) + (amount || 1) })
          .where(eq(fandomlyBadgeTemplates.id, badgeTemplateId));
      }

      res.json({
        success: true,
        mint: savedMint,
        onChain: {
          txHash: mintResult.txHash,
          gasUsed: mintResult.receipt.gasUsed.toString(),
        },
      });
    } catch (error: unknown) {
      console.error('Mint badge error:', error);
      res.status(500).json({
        error: 'Failed to mint badge',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * POST /api/nft/badges/batch-mint
   * Batch mint badges to multiple recipients.
   */
  app.post(
    '/api/nft/badges/batch-mint',
    authenticateUser,
    requireRole(['fandomly_admin', 'customer_admin']),
    async (req: AuthenticatedRequest, res) => {
      try {
        const blockchain = getBlockchainNFTService();
        if (!blockchain) return res.status(503).json({ error: 'Blockchain service not available' });

        const { badgeTemplateId, recipients, amountEach } = req.body;

        if (
          !badgeTemplateId ||
          !recipients ||
          !Array.isArray(recipients) ||
          recipients.length === 0
        ) {
          return res
            .status(400)
            .json({ error: 'badgeTemplateId and recipients array are required' });
        }

        if (recipients.length > 500) {
          return res.status(400).json({ error: 'Max 500 recipients per batch' });
        }

        const [badge] = await db
          .select()
          .from(fandomlyBadgeTemplates)
          .where(eq(fandomlyBadgeTemplates.id, badgeTemplateId))
          .limit(1);

        if (!badge) return res.status(404).json({ error: 'Badge template not found' });

        const onChainBadgeTypeId = (badge.nftMetadata as Record<string, unknown>)
          ?.onChainBadgeTypeId;
        if (onChainBadgeTypeId === undefined || typeof onChainBadgeTypeId !== 'number') {
          return res.status(400).json({ error: 'Badge has no valid on-chain type ID' });
        }

        const addresses = recipients.map((r: string | { walletAddress: string }) =>
          typeof r === 'string' ? r : r.walletAddress
        ) as Address[];
        const mintResult = await blockchain.batchMintBadge(
          addresses,
          onChainBadgeTypeId,
          amountEach || 1
        );

        res.json({
          success: true,
          onChain: {
            txHash: mintResult.txHash,
            recipients: addresses.length,
            gasUsed: mintResult.receipt.gasUsed.toString(),
          },
        });
      } catch (error: unknown) {
        console.error('Batch mint badge error:', error);
        res.status(500).json({
          error: 'Failed to batch mint badges',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );

  /**
   * GET /api/nft/badges/types/:id
   * Get badge type info (on-chain + DB).
   */
  app.get('/api/nft/badges/types/:id', async (req, res) => {
    try {
      const { id } = req.params;

      // Try DB first
      const [badge] = await db
        .select()
        .from(fandomlyBadgeTemplates)
        .where(eq(fandomlyBadgeTemplates.id, id))
        .limit(1);

      let onChainData;
      const blockchain = getBlockchainNFTService();
      if (
        blockchain &&
        badge &&
        (badge.nftMetadata as Record<string, unknown>)?.onChainBadgeTypeId !== undefined
      ) {
        try {
          const badgeTypeId = (badge.nftMetadata as Record<string, unknown>).onChainBadgeTypeId;
          if (typeof badgeTypeId === 'number') {
            onChainData = await blockchain.getBadgeType(badgeTypeId);
            onChainData = {
              ...onChainData,
              maxSupply: onChainData.maxSupply.toString(),
            };
          }
        } catch {
          /* best effort */
        }
      }

      if (!badge && !onChainData) {
        return res.status(404).json({ error: 'Badge type not found' });
      }

      res.json({ badge, onChainData });
    } catch (error: unknown) {
      console.error('Get badge type error:', error);
      res.status(500).json({
        error: 'Failed to fetch badge type',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * GET /api/nft/badges/user/:address
   * Get badge balances for a wallet address (checks all known badge types).
   */
  app.get('/api/nft/badges/user/:address', async (req, res) => {
    try {
      const blockchain = getBlockchainNFTService();
      if (!blockchain) return res.status(503).json({ error: 'Blockchain service not available' });

      const { address } = req.params;

      // Get all badge templates from DB
      const badges = await db
        .select()
        .from(fandomlyBadgeTemplates)
        .where(eq(fandomlyBadgeTemplates.isActive, true));

      const userBadges = await Promise.all(
        badges
          .filter(
            (b) => (b.nftMetadata as Record<string, unknown>)?.onChainBadgeTypeId !== undefined
          )
          .map(async (badge) => {
            const badgeTypeId = (badge.nftMetadata as Record<string, unknown>).onChainBadgeTypeId;
            if (typeof badgeTypeId !== 'number') {
              return { badge, badgeTypeId, balance: '0', owned: false };
            }
            try {
              const balance = await blockchain.getBadgeBalance(address as Address, badgeTypeId);
              return {
                badge,
                badgeTypeId,
                balance: balance.toString(),
                owned: balance > BigInt(0),
              };
            } catch {
              return { badge, badgeTypeId, balance: '0', owned: false };
            }
          })
      );

      res.json({
        address,
        badges: userBadges.filter((b) => b.owned),
        total: userBadges.filter((b) => b.owned).length,
      });
    } catch (error: unknown) {
      console.error('Get user badges error:', error);
      res.status(500).json({
        error: 'Failed to fetch user badges',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // ====================================================================
  // CREATOR COLLECTION ROUTES (CreatorCollectionFactory)
  // ====================================================================

  /**
   * POST /api/nft/creator-collections
   * Deploy a new per-creator NFT collection via the factory.
   */
  app.post(
    '/api/nft/creator-collections',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const blockchain = getBlockchainNFTService();
        if (!blockchain) return res.status(503).json({ error: 'Blockchain service not available' });

        const { name, symbol, creatorAddress, maxSupply, royaltyBps, description } = req.body;

        if (!name || !symbol || !creatorAddress || !maxSupply) {
          return res
            .status(400)
            .json({ error: 'name, symbol, creatorAddress, and maxSupply are required' });
        }

        const user = await storage.getUser(req.user!.id);
        if (!user?.currentTenantId) {
          return res.status(400).json({ error: 'No active tenant found' });
        }

        const creator = await storage.getCreatorByUserId(req.user!.id);

        const result = await blockchain.createCreatorCollection(
          name,
          symbol,
          creatorAddress as Address,
          user.currentTenantId,
          maxSupply,
          royaltyBps || 500 // Default 5%
        );

        const newCollection: InsertNftCollection = {
          creatorId: creator?.id,
          tenantId: user.currentTenantId,
          name,
          description: description || '',
          symbol,
          chain: 'fandomly-chain',
          contractAddress: result.collectionAddress || '',
          tokenType: 'ERC721',
          isCreatorOwned: true,
          ownerWalletAddress: creatorAddress,
          metadata: {
            royaltyPercentage: (royaltyBps || 500) / 100,
            maxSupply,
            factoryAddress: CONTRACTS.CreatorCollectionFactory,
          } as any,
          isActive: true,
          deployedAt: new Date(),
        };

        const [saved] = await db.insert(nftCollections).values(newCollection).returning();

        res.json({
          success: true,
          collection: saved,
          onChain: {
            txHash: result.txHash,
            collectionAddress: result.collectionAddress,
            gasUsed: result.receipt.gasUsed.toString(),
          },
        });
      } catch (error: unknown) {
        console.error('Create creator collection error:', error);
        res.status(500).json({
          error: 'Failed to create creator collection',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );

  /**
   * GET /api/nft/creator-collections/:address
   * Get all creator collections for a wallet address (on-chain query).
   */
  app.get('/api/nft/creator-collections/:address', async (req, res) => {
    try {
      const blockchain = getBlockchainNFTService();
      if (!blockchain) return res.status(503).json({ error: 'Blockchain service not available' });

      const { address } = req.params;
      const collections = await blockchain.getCreatorCollections(address as Address);

      res.json({
        address,
        collections: collections.map((addr) => addr.toString()),
        total: collections.length,
      });
    } catch (error: unknown) {
      console.error('Get creator collections error:', error);
      res.status(500).json({
        error: 'Failed to fetch creator collections',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // ====================================================================
  // STATS
  // ====================================================================

  /**
   * GET /api/nft/stats
   * Platform-wide NFT statistics.
   */
  app.get('/api/nft/stats', async (_req, res) => {
    try {
      const blockchain = getBlockchainNFTService();

      let onChainStats;
      if (blockchain) {
        const [totalMinted, nextCollectionId, nextBadgeTypeId, totalCreatorCollections] =
          await Promise.all([
            blockchain.getTotalMinted(),
            blockchain.getNextCollectionId(),
            blockchain.getNextBadgeTypeId(),
            blockchain.getTotalCollectionsCreated(),
          ]);

        onChainStats = {
          totalNFTsMinted: totalMinted.toString(),
          totalCollections: nextCollectionId.toString(),
          totalBadgeTypes: nextBadgeTypeId.toString(),
          totalCreatorCollections: totalCreatorCollections.toString(),
        };
      }

      res.json({
        success: true,
        stats: onChainStats || {},
        contracts: {
          FandomlyNFT: CONTRACTS.FandomlyNFT,
          FandomlyBadge: CONTRACTS.FandomlyBadge,
          CreatorCollectionFactory: CONTRACTS.CreatorCollectionFactory,
        },
        chain: {
          id: 89197,
          name: 'Fandomly Chain',
        },
      });
    } catch (error: unknown) {
      console.error('Get NFT stats error:', error);
      res.status(500).json({
        error: 'Failed to fetch NFT stats',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * GET /api/nft/deliveries
   * Get user's NFT deliveries (both NFTs and badges).
   */
  app.get('/api/nft/deliveries', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const deliveries = await db
        .select()
        .from(nftDeliveries)
        .where(eq(nftDeliveries.userId, req.user!.id))
        .orderBy(desc(nftDeliveries.deliveredAt));

      res.json({ deliveries });
    } catch (error: unknown) {
      console.error('Get deliveries error:', error);
      res.status(500).json({
        error: 'Failed to fetch deliveries',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  console.log('NFT routes registered (Fandomly Chain L1)');
}
