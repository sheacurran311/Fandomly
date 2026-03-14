/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Express } from 'express';
import express from 'express';
import { createServer, type Server } from 'http';
import { storage } from '../core/storage';
import path from 'path';

// Route registrations — existing modules
import { registerSocialRoutes } from './social/social-routes';
import { registerKickOAuthRoutes } from './social/kick-oauth-routes';
import { registerPatreonOAuthRoutes } from './social/patreon-oauth-routes';
import { registerTenantRoutes } from './user/tenant-routes';
import { registerGoogleAuthRoutes } from './auth/google-routes';
import { registerAuthRoutes } from './auth/auth-routes';
import { registerAdminRoutes } from './admin/admin-routes';
import { registerAdminAnalyticsRoutes } from './admin/admin-analytics-routes';
import { registerMultiplierRoutes } from './admin/multiplier-routes';
import { registerTwitterVerificationRoutes } from './social/twitter-verification-routes';
import { registerReferralRoutes } from './points/referral-routes';
import { registerPointsRoutes } from './points/points-routes';
import { registerAdminPlatformTasksRoutes } from './tasks/admin-platform-tasks-routes';
import { registerPlatformPointsRoutes } from './points/platform-points-routes';
import { registerPlatformTaskRoutes } from './tasks/platform-task-routes';
import { registerFanDashboardRoutes } from './user/fan-dashboard-routes';
import { registerDashboardStatsRoutes } from './user/dashboard-stats-routes';
import { registerNotificationRoutes } from './user/notification-routes';
import { registerRedemptionRoutes } from './rewards/redemption-routes';
import { registerRewardManagementRoutes } from './rewards/reward-management-routes';
import { registerGdprRoutes } from './user/gdpr-routes';
import { registerProgramRoutes } from './programs/program-routes';
import { registerAnnouncementRoutes } from './media/announcement-routes';
import { registerAgencyRoutes } from './admin/agency-routes';
import { registerFacebookWebhooks } from '../webhooks/facebook-webhooks';
import { registerInstagramWebhooks } from '../webhooks/instagram-webhooks';
import { registerInstagramTaskRoutes } from './tasks/instagram-task-routes';
import { registerTwitterTaskRoutes } from './tasks/twitter-task-routes';
import { registerYouTubeTaskRoutes } from './tasks/youtube-task-routes';
import { registerSpotifyTaskRoutes } from './tasks/spotify-task-routes';
import { registerTikTokTaskRoutes } from './tasks/tiktok-task-routes';
import { registerQuizRoutes } from './tasks/quiz-routes';
import { registerReviewRoutes } from './tasks/review-routes';
import { registerVisitTrackingRoutes } from './tasks/visit-tracking-routes';
import { registerLeaderboardRoutes } from './programs/leaderboard-routes';
import { registerBetaSignupRoutes } from './beta-signup-routes';
import { registerVerificationAnalyticsRoutes } from './analytics/verification-analytics-routes';
import { registerSyncPreferencesRoutes } from './analytics/sync-preferences-routes';
import { registerCreatorAnalyticsRoutes } from './analytics/creator-analytics-routes';
import { registerCreatorActivityRoutes } from './analytics/creator-activity-routes';
import { registerHealthRoutes } from './health/health-routes';
import { registerParticleAuthRoutes } from './auth/particle-routes';
import { registerCampaignV2Routes } from './campaigns/campaign-routes-v2';
import { registerReputationRoutes } from './reputation/reputation-routes';
import { registerBlockchainRoutes } from './blockchain/blockchain-routes';
import { registerBadgeRoutes } from './blockchain/badge-routes';
import { registerNFTRoutes } from './nft/nft-routes';
import { registerStripeWebhookRoutes } from './stripe/stripe-webhook-routes';
import { errorHandler } from '../lib/api-errors';

// Route registrations — newly extracted modules
import { registerProfileRoutes } from './auth/profile-routes';
import { registerStripeRoutes } from './stripe/stripe-routes';
import { registerFanProgramRoutes } from './programs/fan-program-routes';
import { registerTaskTemplateRoutes } from './tasks/task-template-routes';
import { registerCampaignDraftRoutes } from './campaigns/campaign-draft-routes';
import { registerStoreRoutes } from './store/store-routes';
import { registerCreatorRoutes } from './creators/creator-routes';

// Upload route modules
import uploadRoutes from './media/upload-routes';
import videoUploadRoutes from './media/video-upload-routes';
import socialConnectionRoutes from './social/social-connection-routes';
import creatorVerificationRoutes from './social/creator-verification-routes';
import { createAuditRoutes } from './admin/audit-routes';
import { getJWKS } from '../services/auth/jwt-service';

// Loyalty program routes use these
import { authenticateUser, AuthenticatedRequest } from '../middleware/rbac';
import { insertLoyaltyProgramSchema } from '@shared/schema';

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve static files for uploads
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Proxy images from Replit Object Storage
  app.get('/api/storage/*', async (req, res) => {
    try {
      const filename = (req.params as any)[0];
      const { getStorageClient } = await import('../core/storage-client');
      const client = await getStorageClient();

      const result = await client.downloadAsBytes(filename);

      if (!result.ok || !result.value) {
        console.error('Image not found:', filename, result.error);
        return res.status(404).json({ error: 'Image not found' });
      }

      const resultValue: any = result.value;
      const imageBuffer = Array.isArray(resultValue) ? resultValue[0] : resultValue;

      if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
        console.error('Invalid buffer format for:', filename);
        return res.status(500).json({ error: 'Invalid image data' });
      }

      const ext = filename.split('.').pop()?.toLowerCase();
      const contentTypes: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
      };

      res.setHeader('Content-Type', contentTypes[ext || 'jpg'] || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.send(imageBuffer);
    } catch (error) {
      console.error('Error serving image from storage:', error);
      res.status(500).json({ error: 'Failed to load image' });
    }
  });

  // Proxy videos from Replit Object Storage
  app.get('/api/storage/videos/*', async (req, res) => {
    try {
      const filename = (req.params as any)[0];
      const { getStorageClient } = await import('../core/storage-client');
      const client = await getStorageClient();

      const result = await client.downloadAsBytes(filename);

      if (!result.ok || !result.value) {
        console.error('Video not found:', filename, result.error);
        return res.status(404).json({ error: 'Video not found' });
      }

      const resultValue: any = result.value;
      const videoBuffer = Array.isArray(resultValue) ? resultValue[0] : resultValue;

      if (!videoBuffer || !Buffer.isBuffer(videoBuffer)) {
        console.error('Invalid buffer format for:', filename);
        return res.status(500).json({ error: 'Invalid video data' });
      }

      const ext = filename.split('.').pop()?.toLowerCase();
      const contentTypes: Record<string, string> = {
        mp4: 'video/mp4',
        webm: 'video/webm',
        mov: 'video/quicktime',
        avi: 'video/x-msvideo',
      };

      res.setHeader('Content-Type', contentTypes[ext || 'mp4'] || 'video/mp4');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.send(videoBuffer);
    } catch (error) {
      console.error('Error serving video from storage:', error);
      res.status(500).json({ error: 'Failed to load video' });
    }
  });

  // JWKS endpoint for JWT validation
  app.get('/.well-known/jwks.json', (req, res) => {
    try {
      const jwks = getJWKS();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.json(jwks);
    } catch (error) {
      console.error('Error serving JWKS:', error);
      res.status(500).json({ error: 'Failed to generate JWKS' });
    }
  });

  // Register upload and middleware routes
  app.use('/api/upload', uploadRoutes);
  app.use('/api/upload', videoUploadRoutes);
  app.use('/api/social-connections', socialConnectionRoutes);
  app.use('/api/creator-verification', creatorVerificationRoutes);
  app.use('/api/audit-logs', createAuditRoutes(storage as any));

  // ── Loyalty program routes (small, kept inline) ────────────────
  app.post('/api/loyalty-programs', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const programData = insertLoyaltyProgramSchema.parse(req.body);
      const program = await storage.createLoyaltyProgram(programData);
      res.json(program);
    } catch (error) {
      console.error('Loyalty program creation error:', error);
      res
        .status(400)
        .json({ error: error instanceof Error ? error.message : 'Invalid program data' });
    }
  });

  app.get('/api/loyalty-programs/creator/:creatorId', async (req, res) => {
    try {
      const programs = await storage.getLoyaltyProgramsByCreator(req.params.creatorId);
      res.json(programs);
    } catch (error: any) {
      console.error('[Loyalty Programs] Error fetching by creator:', error);
      res.status(500).json({ error: error?.message || 'Failed to fetch loyalty programs' });
    }
  });

  app.get('/api/loyalty-programs/:id', async (req, res) => {
    try {
      const program = await storage.getLoyaltyProgram(req.params.id);
      if (!program) {
        return res.status(404).json({ error: 'Loyalty program not found' });
      }
      res.json(program);
    } catch {
      res.status(500).json({ error: 'Failed to fetch loyalty program' });
    }
  });

  // ── Register all route modules ─────────────────────────────────

  // Authentication & profile
  registerGoogleAuthRoutes(app);
  registerAuthRoutes(app);
  registerParticleAuthRoutes(app);
  registerProfileRoutes(app);

  // Social media
  registerSocialRoutes(app);
  registerKickOAuthRoutes(app);
  registerPatreonOAuthRoutes(app);

  // Webhooks
  registerFacebookWebhooks(app);
  registerInstagramWebhooks(app);

  // Task verification routes
  registerInstagramTaskRoutes(app);
  registerTwitterTaskRoutes(app);
  registerYouTubeTaskRoutes(app);
  registerSpotifyTaskRoutes(app);
  registerTikTokTaskRoutes(app);

  // Tasks & templates
  registerQuizRoutes(app);
  registerReviewRoutes(app);
  registerVisitTrackingRoutes(app);
  registerTaskTemplateRoutes(app);

  // Tenant & admin
  registerTenantRoutes(app);
  registerAdminRoutes(app);
  registerAdminAnalyticsRoutes(app);
  registerMultiplierRoutes(app);

  // Social verification
  registerTwitterVerificationRoutes(app);

  // Points & referrals
  registerReferralRoutes(app);
  registerPointsRoutes(app);

  // Notifications
  registerNotificationRoutes(app);

  // Platform tasks & points
  registerAdminPlatformTasksRoutes(app);
  registerPlatformPointsRoutes(app);
  registerPlatformTaskRoutes(app);

  // Fan dashboard
  registerFanDashboardRoutes(app);
  registerDashboardStatsRoutes(app);

  // Programs & fan enrollment
  registerProgramRoutes(app);
  registerFanProgramRoutes(app);
  registerAnnouncementRoutes(app);

  // Admin & agencies
  registerAgencyRoutes(app);

  // Leaderboards & store
  registerLeaderboardRoutes(app);
  registerStoreRoutes(app);

  // Rewards
  registerRedemptionRoutes(app);
  registerRewardManagementRoutes(app, storage);

  // GDPR & compliance
  registerGdprRoutes(app);

  // Beta & analytics
  registerBetaSignupRoutes(app);
  registerVerificationAnalyticsRoutes(app);
  registerSyncPreferencesRoutes(app);
  registerCreatorAnalyticsRoutes(app);
  registerCreatorActivityRoutes(app);

  // NFT & blockchain
  registerNFTRoutes(app);
  registerBlockchainRoutes(app);
  registerBadgeRoutes(app);
  registerReputationRoutes(app);

  // Stripe payments & webhooks
  registerStripeRoutes(app);
  registerStripeWebhookRoutes(app);

  // Health checks
  registerHealthRoutes(app);

  // Task routes (dynamic imports)
  const { registerTaskRoutes } = await import('./tasks/task-routes');
  registerTaskRoutes(app);

  const { createTaskCompletionRoutes } = await import('./tasks/task-completion-routes');
  app.use('/api/task-completions', createTaskCompletionRoutes(storage as any));

  // Creators
  registerCreatorRoutes(app);

  // Campaign builder (drafts & task assignments)
  registerCampaignDraftRoutes(app);
  registerCampaignV2Routes(app);

  // Register global error handler (must be last middleware)
  app.use(errorHandler);

  const httpServer = createServer(app);
  return httpServer;
}
