import { Express } from 'express';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { getCrossmintService } from './crossmint-service';
import { storage } from './storage';
import { db } from './db';
import { authenticateUser, requireRole, type AuthenticatedRequest } from './middleware/rbac';
import {
  nftCollections,
  nftTemplates,
  nftMints,
  nftDeliveries,
  fandomlyBadgeTemplates,
  type NftCollection,
  type NftTemplate,
  type NftMint,
  type InsertNftCollection,
  type InsertNftTemplate,
  type InsertNftMint,
  type InsertNftDelivery,
} from '@shared/schema';

// ============================================================================
// CROSSMINT ROUTES REGISTRATION
// ============================================================================

export function registerCrossmintRoutes(app: Express) {

  // ========================================================================
  // COLLECTION MANAGEMENT ROUTES
  // ========================================================================

  /**
   * POST /api/nft/collections
   * Create a new NFT collection
   */
  app.post('/api/nft/collections', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const crossmint = getCrossmintService();
      if (!crossmint) {
        return res.status(503).json({ error: 'Crossmint service not available' });
      }

      const { name, description, symbol, chain, tokenType, isCreatorOwned, metadata } = req.body;

      if (!name || !chain) {
        return res.status(400).json({ error: 'Name and chain are required' });
      }

      // Get user's creator profile
      const user = await storage.getUser(req.user!.id);
      if (!user?.currentTenantId) {
        return res.status(400).json({ error: 'No active tenant found' });
      }

      const creator = await storage.getCreatorByUserId(req.user!.id);
      if (!creator) {
        return res.status(403).json({ error: 'Creator profile required' });
      }

      // Create collection via Crossmint
      const crossmintCollection = await crossmint.createCollection({
        chain,
        metadata: {
          name,
          description,
          symbol,
          imageUrl: metadata?.collectionImageUrl,
        },
        fungibility: tokenType === 'ERC1155' ? 'semi-fungible' : 'non-fungible',
        supplyLimit: metadata?.maxSupply,
      });

      // Save to database
      const newCollection: InsertNftCollection = {
        creatorId: creator.id,
        tenantId: user.currentTenantId,
        crossmintCollectionId: crossmintCollection.id,
        name,
        description,
        symbol,
        chain,
        contractAddress: crossmintCollection.onChain.contractAddress,
        tokenType: tokenType || 'ERC721',
        isCreatorOwned: isCreatorOwned !== undefined ? isCreatorOwned : true,
        metadata: {
          totalSupply: 0,
          maxSupply: metadata?.maxSupply,
          royaltyPercentage: metadata?.royaltyPercentage || 5,
          collectionImageUrl: metadata?.collectionImageUrl,
          externalUrl: metadata?.externalUrl,
        },
        isActive: true,
      };

      const [savedCollection] = await db.insert(nftCollections).values(newCollection).returning();

      res.json({
        success: true,
        collection: savedCollection,
        crossmint: {
          actionId: crossmintCollection.actionId,
          collectionId: crossmintCollection.id,
        },
      });
    } catch (error: any) {
      console.error('❌ Create collection error:', error);
      res.status(500).json({ error: 'Failed to create collection', message: error.message });
    }
  });

  /**
   * GET /api/nft/collections
   * Get all collections for current user
   */
  app.get('/api/nft/collections', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const creator = await storage.getCreatorByUserId(req.user!.id);
      if (!creator) {
        return res.json({ collections: [] });
      }

      const collections = await db
        .select()
        .from(nftCollections)
        .where(eq(nftCollections.creatorId, creator.id))
        .orderBy(desc(nftCollections.createdAt));

      res.json({ collections });
    } catch (error: any) {
      console.error('❌ Get collections error:', error);
      res.status(500).json({ error: 'Failed to fetch collections', message: error.message });
    }
  });

  /**
   * GET /api/nft/collections/:id
   * Get collection details
   */
  app.get('/api/nft/collections/:id', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;

      const [collection] = await db
        .select()
        .from(nftCollections)
        .where(eq(nftCollections.id, id))
        .limit(1);

      if (!collection) {
        return res.status(404).json({ error: 'Collection not found' });
      }

      // Verify ownership
      const creator = await storage.getCreatorByUserId(req.user!.id);
      if (collection.creatorId !== creator?.id && req.user?.role !== 'fandomly_admin') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Get templates for this collection
      const templates = await db
        .select()
        .from(nftTemplates)
        .where(eq(nftTemplates.collectionId, id))
        .orderBy(desc(nftTemplates.createdAt));

      res.json({ collection, templates });
    } catch (error: any) {
      console.error('❌ Get collection error:', error);
      res.status(500).json({ error: 'Failed to fetch collection', message: error.message });
    }
  });

  /**
   * PUT /api/nft/collections/:id
   * Update collection metadata
   */
  app.put('/api/nft/collections/:id', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { name, description, isActive, metadata } = req.body;

      const [collection] = await db
        .select()
        .from(nftCollections)
        .where(eq(nftCollections.id, id))
        .limit(1);

      if (!collection) {
        return res.status(404).json({ error: 'Collection not found' });
      }

      // Verify ownership
      const creator = await storage.getCreatorByUserId(req.user!.id);
      if (collection.creatorId !== creator?.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const [updated] = await db
        .update(nftCollections)
        .set({
          name: name || collection.name,
          description: description || collection.description,
          isActive: isActive !== undefined ? isActive : collection.isActive,
          metadata: metadata ? { ...collection.metadata, ...metadata } : collection.metadata,
          updatedAt: new Date(),
        })
        .where(eq(nftCollections.id, id))
        .returning();

      res.json({ success: true, collection: updated });
    } catch (error: any) {
      console.error('❌ Update collection error:', error);
      res.status(500).json({ error: 'Failed to update collection', message: error.message });
    }
  });

  // ========================================================================
  // NFT TEMPLATE MANAGEMENT ROUTES
  // ========================================================================

  /**
   * POST /api/nft/templates
   * Create NFT template
   */
  app.post('/api/nft/templates', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { collectionId, name, description, category, metadata, mintPrice, maxSupply, isDraft } = req.body;

      if (!collectionId || !name || !metadata) {
        return res.status(400).json({ error: 'Collection ID, name, and metadata are required' });
      }

      // Verify collection ownership
      const [collection] = await db
        .select()
        .from(nftCollections)
        .where(eq(nftCollections.id, collectionId))
        .limit(1);

      if (!collection) {
        return res.status(404).json({ error: 'Collection not found' });
      }

      const creator = await storage.getCreatorByUserId(req.user!.id);
      if (collection.creatorId !== creator?.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const newTemplate: InsertNftTemplate = {
        collectionId,
        tenantId: collection.tenantId,
        name,
        description,
        category: category || 'custom',
        metadata,
        mintPrice: mintPrice || 0,
        maxSupply,
        currentSupply: 0,
        isActive: true,
        isDraft: isDraft !== undefined ? isDraft : true,
      };

      const [savedTemplate] = await db.insert(nftTemplates).values(newTemplate).returning();

      res.json({ success: true, template: savedTemplate });
    } catch (error: any) {
      console.error('❌ Create template error:', error);
      res.status(500).json({ error: 'Failed to create template', message: error.message });
    }
  });

  /**
   * GET /api/nft/templates
   * Get templates (optionally filtered by collection)
   */
  app.get('/api/nft/templates', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { collectionId } = req.query;

      if (collectionId) {
        // Get templates for specific collection
        const templates = await db
          .select()
          .from(nftTemplates)
          .where(eq(nftTemplates.collectionId, collectionId as string))
          .orderBy(desc(nftTemplates.createdAt));
        
        return res.json({ templates });
      }

      // Get all templates for user's collections
      const creator = await storage.getCreatorByUserId(req.user!.id);
      if (!creator) {
        return res.json({ templates: [] });
      }

      const userCollections = await db
        .select()
        .from(nftCollections)
        .where(eq(nftCollections.creatorId, creator.id));

      const collectionIds = userCollections.map((c) => c.id);
      if (collectionIds.length === 0) {
        return res.json({ templates: [] });
      }

      // Get all templates for these collections
      const templates = await db
        .select()
        .from(nftTemplates)
        .where(inArray(nftTemplates.collectionId, collectionIds))
        .orderBy(desc(nftTemplates.createdAt));

      res.json({ templates });
    } catch (error: any) {
      console.error('❌ Get templates error:', error);
      res.status(500).json({ error: 'Failed to fetch templates', message: error.message });
    }
  });

  /**
   * PUT /api/nft/templates/:id
   * Update template
   */
  app.put('/api/nft/templates/:id', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { name, description, metadata, isActive, isDraft, mintPrice, maxSupply } = req.body;

      const [template] = await db.select().from(nftTemplates).where(eq(nftTemplates.id, id)).limit(1);

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      // Verify ownership via collection
      const [collection] = await db
        .select()
        .from(nftCollections)
        .where(eq(nftCollections.id, template.collectionId))
        .limit(1);

      const creator = await storage.getCreatorByUserId(req.user!.id);
      if (collection?.creatorId !== creator?.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const [updated] = await db
        .update(nftTemplates)
        .set({
          name: name || template.name,
          description: description !== undefined ? description : template.description,
          metadata: metadata || template.metadata,
          isActive: isActive !== undefined ? isActive : template.isActive,
          isDraft: isDraft !== undefined ? isDraft : template.isDraft,
          mintPrice: mintPrice !== undefined ? mintPrice : template.mintPrice,
          maxSupply: maxSupply !== undefined ? maxSupply : template.maxSupply,
          publishedAt: !isDraft && !template.publishedAt ? new Date() : template.publishedAt,
          updatedAt: new Date(),
        })
        .where(eq(nftTemplates.id, id))
        .returning();

      res.json({ success: true, template: updated });
    } catch (error: any) {
      console.error('❌ Update template error:', error);
      res.status(500).json({ error: 'Failed to update template', message: error.message });
    }
  });

  /**
   * DELETE /api/nft/templates/:id
   * Archive template
   */
  app.delete('/api/nft/templates/:id', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;

      const [template] = await db.select().from(nftTemplates).where(eq(nftTemplates.id, id)).limit(1);

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      // Verify ownership
      const [collection] = await db
        .select()
        .from(nftCollections)
        .where(eq(nftCollections.id, template.collectionId))
        .limit(1);

      const creator = await storage.getCreatorByUserId(req.user!.id);
      if (collection?.creatorId !== creator?.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Soft delete by marking inactive
      await db.update(nftTemplates).set({ isActive: false }).where(eq(nftTemplates.id, id));

      res.json({ success: true, message: 'Template archived' });
    } catch (error: any) {
      console.error('❌ Delete template error:', error);
      res.status(500).json({ error: 'Failed to delete template', message: error.message });
    }
  });

  // ========================================================================
  // MINTING OPERATION ROUTES
  // ========================================================================

  /**
   * POST /api/nft/mint
   * Mint a single NFT
   */
  app.post('/api/nft/mint', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const crossmint = getCrossmintService();
      if (!crossmint) {
        return res.status(503).json({ error: 'Crossmint service not available' });
      }

      const { templateId, recipientUserId, recipientWalletAddress, mintReason, contextData } = req.body;

      if (!templateId || !recipientUserId || !recipientWalletAddress) {
        return res.status(400).json({ error: 'Template ID, recipient user ID, and wallet address are required' });
      }

      // Get template and collection
      const [template] = await db.select().from(nftTemplates).where(eq(nftTemplates.id, templateId)).limit(1);

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      const [collection] = await db
        .select()
        .from(nftCollections)
        .where(eq(nftCollections.id, template.collectionId))
        .limit(1);

      if (!collection) {
        return res.status(404).json({ error: 'Collection not found' });
      }

      // Check supply limits
      const currentSupply = template.currentSupply || 0;
      if (template.maxSupply && currentSupply >= template.maxSupply) {
        return res.status(400).json({ error: 'Template supply limit reached' });
      }

      // Mint via Crossmint
      const mintResult = await crossmint.mintNFT({
        collectionId: collection.crossmintCollectionId!,
        recipient: recipientWalletAddress,
        metadata: {
          name: template.name,
          description: template.description || undefined,
          ...template.metadata,
        },
        compressed: collection.tokenType === 'SOLANA_COMPRESSED',
      });

      // Save mint record
      const newMint: InsertNftMint = {
        crossmintActionId: mintResult.actionId,
        collectionId: collection.id,
        templateId: template.id,
        recipientUserId,
        recipientWalletAddress,
        recipientChain: collection.chain,
        mintReason: mintReason || 'direct_mint',
        contextData,
        status: 'pending',
      };

      const [savedMint] = await db.insert(nftMints).values(newMint).returning();

      // Update template supply
      await db
        .update(nftTemplates)
        .set({ currentSupply: currentSupply + 1 })
        .where(eq(nftTemplates.id, templateId));

      res.json({ success: true, mint: savedMint, crossmint: mintResult });
    } catch (error: any) {
      console.error('❌ Mint NFT error:', error);
      res.status(500).json({ error: 'Failed to mint NFT', message: error.message });
    }
  });

  /**
   * POST /api/nft/mint/batch
   * Batch mint NFTs
   */
  app.post('/api/nft/mint/batch', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const crossmint = getCrossmintService();
      if (!crossmint) {
        return res.status(503).json({ error: 'Crossmint service not available' });
      }

      const { templateId, recipients, mintReason, contextData } = req.body;

      if (!templateId || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ error: 'Template ID and recipients array are required' });
      }

      // Get template and collection
      const [template] = await db.select().from(nftTemplates).where(eq(nftTemplates.id, templateId)).limit(1);

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      const [collection] = await db
        .select()
        .from(nftCollections)
        .where(eq(nftCollections.id, template.collectionId))
        .limit(1);

      if (!collection) {
        return res.status(404).json({ error: 'Collection not found' });
      }

      // Check supply limits
      const currentSupply = template.currentSupply || 0;
      const remainingSupply = template.maxSupply ? template.maxSupply - currentSupply : Infinity;
      if (recipients.length > remainingSupply) {
        return res.status(400).json({
          error: `Insufficient supply. Remaining: ${remainingSupply}, Requested: ${recipients.length}`,
        });
      }

      // Batch mint via Crossmint
      const batchRecipients = recipients.map((r: any) => ({
        wallet: r.walletAddress,
        metadata: {
          name: template.name,
          description: template.description || undefined,
          ...template.metadata,
        },
      }));

      const mintResults = await crossmint.mintBatch({
        collectionId: collection.crossmintCollectionId!,
        recipients: batchRecipients,
        compressed: collection.tokenType === 'SOLANA_COMPRESSED',
      });

      // Save all mint records
      const mintRecords = mintResults.map((result, index) => ({
        crossmintActionId: result.actionId,
        collectionId: collection.id,
        templateId: template.id,
        recipientUserId: recipients[index].userId,
        recipientWalletAddress: recipients[index].walletAddress,
        recipientChain: collection.chain,
        mintReason: mintReason || 'batch_mint',
        contextData,
        status: 'pending' as const,
      }));

      const savedMints = await db.insert(nftMints).values(mintRecords).returning();

      // Update template supply
      await db
        .update(nftTemplates)
        .set({ currentSupply: currentSupply + mintResults.length })
        .where(eq(nftTemplates.id, templateId));

      res.json({ success: true, mints: savedMints, total: mintResults.length });
    } catch (error: any) {
      console.error('❌ Batch mint error:', error);
      res.status(500).json({ error: 'Failed to batch mint NFTs', message: error.message });
    }
  });

  /**
   * GET /api/nft/mint/:actionId/status
   * Get mint operation status
   */
  app.get('/api/nft/mint/:actionId/status', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const crossmint = getCrossmintService();
      if (!crossmint) {
        return res.status(503).json({ error: 'Crossmint service not available' });
      }

      const { actionId } = req.params;

      // Get from database first
      const [mint] = await db.select().from(nftMints).where(eq(nftMints.crossmintActionId, actionId)).limit(1);

      if (!mint) {
        return res.status(404).json({ error: 'Mint operation not found' });
      }

      // If already completed, return cached result
      if (mint.status === 'success' || mint.status === 'failed') {
        return res.json({ mint, cached: true });
      }

      // Otherwise, fetch from Crossmint
      const status = await crossmint.getMintStatus(actionId);

      // Update database if status changed
      if (status.status !== mint.status) {
        const updateData: any = {
          status: status.status,
        };

        if (status.status === 'success') {
          updateData.tokenId = status.data?.token?.tokenId;
          updateData.txHash = status.data?.txId;
          updateData.contractAddress = status.data?.token?.contractAddress;
          updateData.completedAt = new Date();
        } else if (status.status === 'failed') {
          updateData.errorMessage = 'Mint failed';
          updateData.completedAt = new Date();
        }

        const [updatedMint] = await db
          .update(nftMints)
          .set(updateData)
          .where(eq(nftMints.crossmintActionId, actionId))
          .returning();

        // If successful, create delivery record
        if (status.status === 'success' && updatedMint.tokenId) {
          const [template] = await db
            .select()
            .from(nftTemplates)
            .where(eq(nftTemplates.id, updatedMint.templateId!))
            .limit(1);

          const deliveryRecord: InsertNftDelivery = {
            mintId: updatedMint.id,
            userId: updatedMint.recipientUserId,
            collectionId: updatedMint.collectionId,
            tokenId: updatedMint.tokenId,
            txHash: updatedMint.txHash!,
            chain: updatedMint.recipientChain,
            contractAddress: updatedMint.contractAddress!,
            metadataSnapshot: {
              name: template?.name || 'NFT',
              description: template?.description || undefined,
              image: template?.metadata.image || '',
              attributes: template?.metadata.attributes,
            },
          };

          await db.insert(nftDeliveries).values(deliveryRecord);
        }

        return res.json({ mint: updatedMint, crossmint: status });
      }

      res.json({ mint, crossmint: status });
    } catch (error: any) {
      console.error('❌ Get mint status error:', error);
      res.status(500).json({ error: 'Failed to get mint status', message: error.message });
    }
  });

  /**
   * GET /api/nft/deliveries
   * Get user's NFT deliveries
   */
  app.get('/api/nft/deliveries', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const deliveries = await db
        .select()
        .from(nftDeliveries)
        .where(eq(nftDeliveries.userId, req.user!.id))
        .orderBy(desc(nftDeliveries.deliveredAt));

      res.json({ deliveries });
    } catch (error: any) {
      console.error('❌ Get deliveries error:', error);
      res.status(500).json({ error: 'Failed to fetch deliveries', message: error.message });
    }
  });

  // ========================================================================
  // WEBHOOK RECEIVER
  // ========================================================================

  /**
   * POST /api/nft/webhooks/crossmint
   * Receive webhooks from Crossmint
   */
  app.post('/api/nft/webhooks/crossmint', async (req, res) => {
    try {
      // TODO: Verify webhook signature using CROSSMINT_WEBHOOK_SECRET

      const { actionId, type, status, data } = req.body;

      console.log('📨 Crossmint webhook received:', { actionId, type, status });

      if (type === 'nfts.create' || type === 'nfts.mint') {
        // Find mint record
        const [mint] = await db.select().from(nftMints).where(eq(nftMints.crossmintActionId, actionId)).limit(1);

        if (!mint) {
          console.warn(`⚠️ Webhook for unknown mint: ${actionId}`);
          return res.status(200).json({ received: true });
        }

        // Update mint status
        const updateData: any = { status };

        if (status === 'success') {
          updateData.tokenId = data?.token?.tokenId;
          updateData.txHash = data?.txId;
          updateData.contractAddress = data?.token?.contractAddress;
          updateData.completedAt = new Date();
        } else if (status === 'failed') {
          updateData.errorMessage = data?.error || 'Mint failed';
          updateData.completedAt = new Date();
        }

        await db.update(nftMints).set(updateData).where(eq(nftMints.crossmintActionId, actionId));

        console.log(`✅ Mint ${actionId} updated to ${status}`);
      }

      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('❌ Webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // ========================================================================
  // ADMIN BADGE ROUTES
  // ========================================================================

  /**
   * POST /api/admin/badges/templates
   * Create Fandomly badge template
   */
  app.post('/api/admin/badges/templates', authenticateUser, requireRole(['fandomly_admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const {
        name,
        description,
        category,
        requirementType,
        requirementData,
        imageUrl,
        badgeColor,
        nftMetadata,
        collectionId,
      } = req.body;

      if (!name || !description || !requirementType || !imageUrl) {
        return res.status(400).json({ error: 'Required fields missing' });
      }

      const [badge] = await db
        .insert(fandomlyBadgeTemplates)
        .values({
          name,
          description,
          category: category || 'achievement',
          requirementType,
          requirementData,
          imageUrl,
          badgeColor,
          nftMetadata,
          collectionId,
          isActive: true,
          totalIssued: 0,
        })
        .returning();

      res.json({ success: true, badge });
    } catch (error: any) {
      console.error('❌ Create badge template error:', error);
      res.status(500).json({ error: 'Failed to create badge template', message: error.message });
    }
  });

  /**
   * GET /api/admin/badges/templates
   * Get all badge templates
   */
  app.get('/api/admin/badges/templates', authenticateUser, requireRole(['fandomly_admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const badges = await db.select().from(fandomlyBadgeTemplates).orderBy(desc(fandomlyBadgeTemplates.createdAt));

      res.json({ badges });
    } catch (error: any) {
      console.error('❌ Get badge templates error:', error);
      res.status(500).json({ error: 'Failed to fetch badge templates', message: error.message });
    }
  });

  /**
   * GET /api/users/:id/badges
   * Get user's earned badges
   */
  app.get('/api/users/:userId/badges', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { userId } = req.params;

      // Get all badge mints for user
      const badges = await db
        .select({
          mint: nftMints,
          badge: fandomlyBadgeTemplates,
          delivery: nftDeliveries,
        })
        .from(nftMints)
        .leftJoin(fandomlyBadgeTemplates, eq(nftMints.badgeTemplateId, fandomlyBadgeTemplates.id))
        .leftJoin(nftDeliveries, eq(nftMints.id, nftDeliveries.mintId))
        .where(and(eq(nftMints.recipientUserId, userId), eq(nftMints.status, 'success')))
        .orderBy(desc(nftMints.completedAt));

      res.json({ badges });
    } catch (error: any) {
      console.error('❌ Get user badges error:', error);
      res.status(500).json({ error: 'Failed to fetch user badges', message: error.message });
    }
  });

  console.log('✅ Crossmint NFT routes registered');
}

