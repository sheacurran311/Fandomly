/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Express } from 'express';
import { authenticateUser, requireRole, type AuthenticatedRequest } from '../../middleware/rbac';
import { storage } from '../../core/storage';
import { db } from '../../db';
import { insertFanProgramSchema } from '@shared/schema';

export function registerFanProgramRoutes(app: Express) {
  // ================================================================
  // One-tap join: Follow tenant + Enroll in program in a single call
  // Simplifies fan onboarding and creator card join buttons
  // ================================================================
  app.post(
    '/api/fan-programs/join-creator/:creatorId',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Authentication required' });

        const { creatorId } = req.params;
        const { loyaltyPrograms } = await import('@shared/schema');
        const { eq, desc } = await import('drizzle-orm');

        // Get creator's most recent published (or any) program
        const [program] = await db
          .select()
          .from(loyaltyPrograms)
          .where(eq(loyaltyPrograms.creatorId, creatorId))
          .orderBy(desc(loyaltyPrograms.createdAt))
          .limit(1);

        if (!program) {
          return res.status(404).json({ error: 'Creator has no program yet' });
        }

        // Step 1: Follow tenant (create membership if not exists)
        try {
          await storage.createTenantMembership({
            tenantId: program.tenantId,
            userId: userId,
            role: 'member',
          });
        } catch (err: any) {
          // Ignore duplicate membership errors
          if (!err.message?.includes('duplicate') && !err.message?.includes('already')) {
            console.warn('Follow error:', err.message);
          }
        }

        // Step 2: Enroll in program (if not already enrolled)
        const existing = await storage.getFanProgram(userId, program.id);
        if (existing) {
          return res.json({
            ...existing,
            message: 'Already joined this program',
            program: { id: program.id, name: program.name, slug: program.slug },
          });
        }

        const fanProgram = await storage.createFanProgram({
          fanId: userId,
          tenantId: program.tenantId,
          programId: program.id,
        });

        res.json({
          ...fanProgram,
          program: { id: program.id, name: program.name, slug: program.slug },
        });
      } catch (error) {
        console.error('One-tap join error:', error);
        res
          .status(500)
          .json({ error: error instanceof Error ? error.message : 'Failed to join creator' });
      }
    }
  );

  // Fan program routes
  app.post('/api/fan-programs', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      // Use authenticated user ID as fanId
      const fanProgramData = insertFanProgramSchema.parse({
        ...req.body,
        fanId: userId, // Override any fanId in body with authenticated user ID
      });

      // Check if fan is already enrolled
      const existing = await storage.getFanProgram(fanProgramData.fanId, fanProgramData.programId);
      if (existing) {
        return res.status(400).json({ error: 'Fan already enrolled in this program' });
      }

      const fanProgram = await storage.createFanProgram(fanProgramData);
      res.json(fanProgram);
    } catch (error) {
      res
        .status(400)
        .json({ error: error instanceof Error ? error.message : 'Invalid fan program data' });
    }
  });

  app.get(
    '/api/fan-programs/user/:fanId',
    authenticateUser,
    async (req: AuthenticatedRequest, res) => {
      try {
        if (req.params.fanId !== req.user?.id && req.user?.role !== 'fandomly_admin') {
          return res.status(403).json({ error: "Unauthorized to view this user's programs" });
        }

        const { db } = await import('../../db');
        const { eq } = await import('drizzle-orm');
        const { fanPrograms: fanProgramsTable, loyaltyPrograms } = await import('@shared/schema');

        // Fetch fan programs with program details including creatorId
        const fanProgramsWithDetails = await db
          .select({
            fanProgram: fanProgramsTable,
            program: loyaltyPrograms,
          })
          .from(fanProgramsTable)
          .leftJoin(loyaltyPrograms, eq(fanProgramsTable.programId, loyaltyPrograms.id))
          .where(eq(fanProgramsTable.fanId, req.params.fanId));

        // Transform to include creatorId at top level for easy access
        const enrichedFanPrograms = fanProgramsWithDetails.map(({ fanProgram, program }) => ({
          ...fanProgram,
          creatorId: program?.creatorId,
          programName: program?.name,
          programSlug: program?.slug,
          totalPoints: fanProgram.totalPointsEarned || 0,
          joinedAt: fanProgram.joinedAt,
        }));

        console.log(
          `[API] Returning ${enrichedFanPrograms.length} fan programs for user ${req.params.fanId}`
        );
        res.json(enrichedFanPrograms);
      } catch (error) {
        console.error('Failed to fetch fan programs:', error);
        res.status(500).json({ error: 'Failed to fetch fan programs' });
      }
    }
  );

  // Get all fans enrolled in a specific program (for creator dashboard)
  app.get('/api/fan-programs/program/:programId', async (req, res) => {
    try {
      const { db } = await import('../../db');
      const { eq } = await import('drizzle-orm');
      const { fanPrograms: fanProgramsTable, users } = await import('@shared/schema');

      // Fetch all fans enrolled in this program with user details
      const fansInProgram = await db
        .select({
          fanProgram: fanProgramsTable,
          user: users,
        })
        .from(fanProgramsTable)
        .leftJoin(users, eq(fanProgramsTable.fanId, users.id))
        .where(eq(fanProgramsTable.programId, req.params.programId));

      // Transform to return fan data with enrollment info
      const enrichedFans = fansInProgram.map(({ fanProgram, user }) => ({
        id: fanProgram.id,
        fanId: fanProgram.fanId,
        programId: fanProgram.programId,
        joinedAt: fanProgram.joinedAt,
        currentPoints: fanProgram.currentPoints || 0,
        totalPointsEarned: fanProgram.totalPointsEarned || 0,
        currentTier: fanProgram.currentTier,
        username: user?.username,
        email: user?.email,
        fullName: user?.username,
        avatar: user?.avatar,
      }));

      console.log(
        `[API] Returning ${enrichedFans.length} fans for program ${req.params.programId}`
      );
      res.json(enrichedFans);
    } catch (error) {
      console.error('Failed to fetch fans for program:', error);
      res.status(500).json({ error: 'Failed to fetch fans for program' });
    }
  });

  // Point transaction routes
  app.get('/api/point-transactions/fan-program/:fanProgramId', async (req, res) => {
    try {
      const transactions = await storage.getPointTransactionsByFanProgram(req.params.fanProgramId);
      res.json(transactions);
    } catch {
      res.status(500).json({ error: 'Failed to fetch point transactions' });
    }
  });

  // Reward redemption routes
  app.get('/api/reward-redemptions/user/:fanId', async (req, res) => {
    try {
      const redemptions = await storage.getRewardRedemptionsByUser(req.params.fanId);
      res.json(redemptions);
    } catch {
      res.status(500).json({ error: 'Failed to fetch reward redemptions' });
    }
  });

  app.get('/api/reward-redemptions/program/:programId', async (req, res) => {
    try {
      const redemptions = await storage.getRewardRedemptionsByProgram(req.params.programId);
      res.json(redemptions);
    } catch (error) {
      const err = error as Error;
      console.error('Error fetching reward redemptions for program:', err?.message ?? error);
      res.status(500).json({ error: 'Failed to fetch reward redemptions for program' });
    }
  });

  // Admin routes for user management
  app.get(
    '/api/admin/users',
    authenticateUser,
    requireRole(['fandomly_admin']),
    async (req: AuthenticatedRequest, res) => {
      try {
        // In production, implement pagination and filtering
        const users = await storage.getAllUsers();

        // Filter out PII for GDPR/CCPA compliance
        const sanitizedUsers = users.map((user) => ({
          id: user.id,
          username: user.username,
          userType: user.userType,
          role: user.role,
          customerTier: user.customerTier,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          // Exclude: email, walletAddress, walletChain, profileData (contains PII)
        }));

        res.json(sanitizedUsers);
      } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
      }
    }
  );

  app.put(
    '/api/admin/users/:userId/role',
    authenticateUser,
    requireRole(['fandomly_admin']),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { userId } = req.params;
        const { role, customerTier } = req.body;

        if (!['fandomly_admin', 'customer_admin', 'customer_end_user'].includes(role)) {
          return res.status(400).json({ error: 'Invalid role' });
        }

        const updateData: any = { role };
        if (role === 'customer_end_user' && customerTier) {
          updateData.customerTier = customerTier;
        }

        const updatedUser = await storage.updateUser(userId, updateData);
        if (!updatedUser) {
          return res.status(404).json({ error: 'User not found' });
        }

        res.json(updatedUser);
      } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({ error: 'Failed to update user role' });
      }
    }
  );
}
