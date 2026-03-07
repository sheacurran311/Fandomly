/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * GDPR Compliance Routes
 * Sprint 9: Data export, account deletion, and consent management
 *
 * Implements:
 * - Article 15: Right of access
 * - Article 17: Right to erasure
 * - Article 20: Right to data portability
 */

import type { Express } from 'express';
import { db } from '../../db';
import { sql } from 'drizzle-orm';
import { authenticateUser, AuthenticatedRequest } from '../../middleware/rbac';
import { z } from 'zod';

// Validation schemas
const exportRequestSchema = z.object({
  dataTypes: z
    .array(
      z.enum(['profile', 'transactions', 'completions', 'social_connections', 'consents', 'all'])
    )
    .default(['all']),
  format: z.enum(['json', 'csv']).default('json'),
});

const deletionRequestSchema = z.object({
  type: z.enum(['full_deletion', 'anonymization']),
  reason: z.string().max(500).optional(),
});

const consentUpdateSchema = z.object({
  consentType: z.string().min(1),
  isGranted: z.boolean(),
  version: z.string().default('1.0'),
});

export function registerGdprRoutes(app: Express) {
  /**
   * POST /api/gdpr/export
   * Request a data export (Article 20 - Data Portability)
   */
  app.post('/api/gdpr/export', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;

      // Validate request
      const validation = exportRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid request data',
          details: validation.error.issues,
        });
      }

      const { dataTypes, format } = validation.data;

      // Check for pending export requests
      const pendingResult = await db.execute(sql`
        SELECT id FROM data_export_requests
        WHERE user_id = ${userId}
          AND status IN ('pending', 'processing')
          AND requested_at > NOW() - INTERVAL '24 hours'
        LIMIT 1
      `);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((pendingResult as any).rows?.length > 0) {
        return res.status(429).json({
          error: 'Export request already pending',
          message: 'Please wait for your current export to complete before requesting another.',
        });
      }

      // Create export request
      const result = await db.execute(sql`
        INSERT INTO data_export_requests 
          (user_id, request_type, requested_data_types, export_format, status)
        VALUES 
          (${userId}, 'full_export', ${dataTypes}, ${format}, 'pending')
        RETURNING id, status, requested_at
      `);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const exportRequest = (result as any).rows?.[0];

      // Process export in the background — don't block the response
      processExportRequest(exportRequest.id, userId).catch((err) => {
        console.error(`[GDPR] Background export processing failed for ${exportRequest.id}:`, err);
      });

      res.status(202).json({
        message: 'Data export request submitted',
        requestId: exportRequest.id,
        status: 'processing',
        estimatedTime: 'Your export will be ready within 24 hours',
        downloadUrl: `/api/gdpr/export/${exportRequest.id}/download`,
      });
    } catch (error) {
      console.error('Error creating export request:', error);
      res.status(500).json({ error: 'Failed to create export request' });
    }
  });

  /**
   * GET /api/gdpr/export/:requestId
   * Check export request status
   */
  app.get(
    '/api/gdpr/export/:requestId',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user!.id;
        const { requestId } = req.params;

        const result = await db.execute(sql`
        SELECT
          id, status, download_url, download_expires_at,
          requested_at, completed_at, error_message
        FROM data_export_requests
        WHERE id = ${requestId} AND user_id = ${userId}
      `);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const request = (result as any).rows?.[0];
        if (!request) {
          return res.status(404).json({ error: 'Export request not found' });
        }

        res.json({
          request,
          isReady: request.status === 'completed' && request.download_url,
          isExpired:
            request.download_expires_at && new Date(request.download_expires_at) < new Date(),
        });
      } catch (error) {
        console.error('Error fetching export status:', error);
        res.status(500).json({ error: 'Failed to fetch export status' });
      }
    }
  );

  /**
   * GET /api/gdpr/export/:requestId/download
   * Download the exported data
   */
  app.get(
    '/api/gdpr/export/:requestId/download',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user!.id;
        const { requestId } = req.params;

        const result = await db.execute(sql`
        SELECT * FROM data_export_requests
        WHERE id = ${requestId} AND user_id = ${userId}
      `);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const request = (result as any).rows?.[0];
        if (!request) {
          return res.status(404).json({ error: 'Export request not found' });
        }

        if (request.status !== 'completed') {
          return res.status(400).json({ error: 'Export not yet ready' });
        }

        if (request.download_expires_at && new Date(request.download_expires_at) < new Date()) {
          return res
            .status(410)
            .json({ error: 'Download link has expired. Please request a new export.' });
        }

        // Generate export data on-the-fly
        const exportData = await db.execute(sql`
        SELECT get_user_export_data(${userId}) as data
      `);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = (exportData as any).rows?.[0]?.data;

        if (request.export_format === 'json') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader(
            'Content-Disposition',
            `attachment; filename="fandomly-data-export-${userId}.json"`
          );
          res.json(data);
        } else {
          // CSV export would require flattening the JSON structure
          res.setHeader('Content-Type', 'application/json');
          res.setHeader(
            'Content-Disposition',
            `attachment; filename="fandomly-data-export-${userId}.json"`
          );
          res.json(data);
        }
      } catch (error) {
        console.error('Error downloading export:', error);
        res.status(500).json({ error: 'Failed to download export' });
      }
    }
  );

  /**
   * POST /api/gdpr/delete
   * Request account deletion or anonymization (Article 17 - Right to Erasure)
   */
  app.post('/api/gdpr/delete', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;

      // Validate request
      const validation = deletionRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid request data',
          details: validation.error.issues,
        });
      }

      const { type, reason } = validation.data;

      // Check for pending deletion requests
      const pendingResult = await db.execute(sql`
        SELECT id FROM account_deletion_requests
        WHERE user_id = ${userId}
          AND status IN ('pending', 'confirmed', 'processing')
        LIMIT 1
      `);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((pendingResult as any).rows?.length > 0) {
        return res.status(429).json({
          error: 'Deletion request already pending',
          message: 'You already have a pending account deletion request.',
        });
      }

      // Generate confirmation token
      const confirmationToken = require('crypto').randomBytes(32).toString('hex');

      // Schedule deletion for 30 days from now (grace period)
      const scheduledDeletion = new Date();
      scheduledDeletion.setDate(scheduledDeletion.getDate() + 30);

      // Create deletion request
      const result = await db.execute(sql`
        INSERT INTO account_deletion_requests 
          (user_id, request_type, reason, confirmation_token, scheduled_deletion_at, status)
        VALUES 
          (${userId}, ${type}, ${reason || null}, ${confirmationToken}, ${scheduledDeletion.toISOString()}, 'pending')
        RETURNING id, status, scheduled_deletion_at
      `);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const deletionRequest = (result as any).rows?.[0];

      // In production, send confirmation email with token

      res.status(202).json({
        message: 'Account deletion request submitted',
        requestId: deletionRequest.id,
        type,
        scheduledDeletion: deletionRequest.scheduled_deletion_at,
        confirmationRequired: true,
        confirmationInstructions:
          'Please check your email to confirm this request. You have 30 days to cancel.',
      });
    } catch (error) {
      console.error('Error creating deletion request:', error);
      res.status(500).json({ error: 'Failed to create deletion request' });
    }
  });

  /**
   * POST /api/gdpr/delete/:requestId/confirm
   * Confirm account deletion request
   */
  app.post(
    '/api/gdpr/delete/:requestId/confirm',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user!.id;
        const { requestId } = req.params;
        const { token } = req.body;

        if (!token) {
          return res.status(400).json({ error: 'Confirmation token required' });
        }

        // Verify and update request
        const result = await db.execute(sql`
        UPDATE account_deletion_requests
        SET status = 'confirmed', confirmed_at = NOW()
        WHERE id = ${requestId} 
          AND user_id = ${userId}
          AND confirmation_token = ${token}
          AND status = 'pending'
        RETURNING id, status, scheduled_deletion_at
      `);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((result as any).rowCount === 0) {
          return res.status(404).json({ error: 'Invalid or expired confirmation token' });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const request = (result as any).rows?.[0];

        res.json({
          message: 'Deletion request confirmed',
          scheduledDeletion: request.scheduled_deletion_at,
          note: 'Your account will be deleted on the scheduled date. You can cancel this request before then.',
        });
      } catch (error) {
        console.error('Error confirming deletion:', error);
        res.status(500).json({ error: 'Failed to confirm deletion request' });
      }
    }
  );

  /**
   * POST /api/gdpr/delete/:requestId/cancel
   * Cancel account deletion request
   */
  app.post(
    '/api/gdpr/delete/:requestId/cancel',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user!.id;
        const { requestId } = req.params;

        const result = await db.execute(sql`
        UPDATE account_deletion_requests
        SET status = 'cancelled'
        WHERE id = ${requestId} 
          AND user_id = ${userId}
          AND status IN ('pending', 'confirmed')
        RETURNING id
      `);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((result as any).rowCount === 0) {
          return res.status(404).json({ error: 'Deletion request not found or already processed' });
        }

        res.json({
          message: 'Deletion request cancelled successfully',
        });
      } catch (error) {
        console.error('Error cancelling deletion:', error);
        res.status(500).json({ error: 'Failed to cancel deletion request' });
      }
    }
  );

  /**
   * GET /api/gdpr/consents
   * Get user's consent records
   */
  app.get('/api/gdpr/consents', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;

      const result = await db.execute(sql`
        SELECT 
          consent_type,
          consent_version,
          is_granted,
          granted_at,
          revoked_at,
          created_at
        FROM user_consents
        WHERE user_id = ${userId}
        ORDER BY consent_type
      `);

      res.json({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        consents: (result as any).rows || [],
      });
    } catch (error) {
      console.error('Error fetching consents:', error);
      res.status(500).json({ error: 'Failed to fetch consent records' });
    }
  });

  /**
   * PUT /api/gdpr/consents
   * Update consent preference
   */
  app.put('/api/gdpr/consents', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;

      // Validate request
      const validation = consentUpdateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid request data',
          details: validation.error.issues,
        });
      }

      const { consentType, isGranted, version } = validation.data;
      const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';

      // Upsert consent record
      await db.execute(sql`
        INSERT INTO user_consents 
          (user_id, consent_type, consent_version, is_granted, granted_at, revoked_at, ip_address, user_agent)
        VALUES 
          (${userId}, ${consentType}, ${version}, ${isGranted}, 
           ${isGranted ? new Date().toISOString() : null},
           ${!isGranted ? new Date().toISOString() : null},
           ${ipAddress}, ${userAgent})
        ON CONFLICT (user_id, consent_type) DO UPDATE SET
          consent_version = ${version},
          is_granted = ${isGranted},
          granted_at = CASE WHEN ${isGranted} THEN NOW() ELSE user_consents.granted_at END,
          revoked_at = CASE WHEN NOT ${isGranted} THEN NOW() ELSE NULL END,
          ip_address = ${ipAddress},
          user_agent = ${userAgent}
      `);

      res.json({
        message: `Consent ${isGranted ? 'granted' : 'revoked'} successfully`,
        consentType,
        isGranted,
      });
    } catch (error) {
      console.error('Error updating consent:', error);
      res.status(500).json({ error: 'Failed to update consent' });
    }
  });
}

/**
 * Process export request (would be a background job in production)
 */
async function processExportRequest(requestId: string, userId: string): Promise<void> {
  try {
    // Update status to processing
    await db.execute(sql`
      UPDATE data_export_requests
      SET status = 'processing', processed_at = NOW()
      WHERE id = ${requestId}
    `);

    // Generate export (in production, would write to file storage)
    // For now, just mark as completed
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 day download window

    await db.execute(sql`
      UPDATE data_export_requests
      SET 
        status = 'completed',
        completed_at = NOW(),
        download_url = ${`/api/gdpr/export/${requestId}/download`},
        download_expires_at = ${expiresAt.toISOString()}
      WHERE id = ${requestId}
    `);

    console.log(`[GDPR] Export request ${requestId} completed for user ${userId}`);
  } catch (error) {
    console.error(`[GDPR] Export request ${requestId} failed:`, error);

    await db.execute(sql`
      UPDATE data_export_requests
      SET status = 'failed', error_message = ${String(error)}
      WHERE id = ${requestId}
    `);
  }
}
