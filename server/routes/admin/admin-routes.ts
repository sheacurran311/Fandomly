import { type Express, type Response } from 'express';
import { db } from '../../db';
import { sql, eq, and, desc, ilike, or, count, asc } from 'drizzle-orm';
import {
  users,
  creators,
  tenants,
  tasks,
  taskCompletions,
  fanPrograms,
  socialConnections,
} from '@shared/schema';
import {
  authenticateUser,
  requireFandomlyAdmin,
  type AuthenticatedRequest,
} from '../../middleware/rbac';

function parsePeriodDays(period: string | undefined): number {
  switch (period) {
    case '90d':
      return 90;
    case '365d':
      return 365;
    default:
      return 30;
  }
}

function growthPct(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function registerAdminRoutes(app: Express) {
  const adminAuth = [authenticateUser, requireFandomlyAdmin];

  // ===========================================================================
  // STATS OVERVIEW
  // ===========================================================================

  /**
   * GET /api/admin/stats
   * Aggregated platform statistics using SQL COUNT (not findMany + .length).
   */
  app.get('/api/admin/stats', ...adminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      // Run all counts in parallel
      const [
        userCounts,
        creatorCounts,
        tenantCount,
        taskCounts,
        completionCount,
        referralCounts,
        recentUsers,
        prevPeriodUsers,
        recentCreators,
        prevPeriodCreators,
        recentCompletions,
        prevPeriodCompletions,
      ] = await Promise.all([
        // User breakdown
        db.execute(sql`
          SELECT
            COUNT(*) as total,
            COUNT(CASE WHEN user_type = 'fan' THEN 1 END) as fans,
            COUNT(CASE WHEN user_type = 'creator' THEN 1 END) as creators,
            COUNT(CASE WHEN role = 'fandomly_admin' THEN 1 END) as admins
          FROM users
        `),
        // Creator breakdown
        db.execute(sql`
          SELECT
            COUNT(*) as total,
            COUNT(CASE WHEN is_verified = true THEN 1 END) as verified
          FROM creators WHERE deleted_at IS NULL
        `),
        // Active tenants
        db.execute(sql`
          SELECT COUNT(*) as total FROM tenants
          WHERE status = 'active' AND deleted_at IS NULL
        `),
        // Task breakdown
        db.execute(sql`
          SELECT
            COUNT(*) as total,
            COUNT(CASE WHEN ownership_level = 'platform' THEN 1 END) as platform_tasks
          FROM tasks WHERE deleted_at IS NULL
        `),
        // Total completions
        db.execute(sql`
          SELECT COUNT(*) as total FROM task_completions
          WHERE status = 'completed'
        `),
        // Referral counts
        db.execute(sql`
          SELECT
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
          FROM fan_referrals WHERE deleted_at IS NULL
        `),
        // Users created in last 30 days
        db.execute(sql`
          SELECT COUNT(*) as total FROM users
          WHERE created_at >= ${thirtyDaysAgo}
        `),
        // Users created in previous 30 days (30-60 days ago)
        db.execute(sql`
          SELECT COUNT(*) as total FROM users
          WHERE created_at >= ${sixtyDaysAgo} AND created_at < ${thirtyDaysAgo}
        `),
        // Creators created in last 30 days
        db.execute(sql`
          SELECT COUNT(*) as total FROM creators
          WHERE created_at >= ${thirtyDaysAgo} AND deleted_at IS NULL
        `),
        // Creators created in previous 30 days
        db.execute(sql`
          SELECT COUNT(*) as total FROM creators
          WHERE created_at >= ${sixtyDaysAgo} AND created_at < ${thirtyDaysAgo} AND deleted_at IS NULL
        `),
        // Completions in last 30 days
        db.execute(sql`
          SELECT COUNT(*) as total FROM task_completions
          WHERE status = 'completed' AND completed_at >= ${thirtyDaysAgo}
        `),
        // Completions in previous 30 days
        db.execute(sql`
          SELECT COUNT(*) as total FROM task_completions
          WHERE status = 'completed' AND completed_at >= ${sixtyDaysAgo} AND completed_at < ${thirtyDaysAgo}
        `),
      ]);

      const row = (r: unknown) => (r as { rows: Record<string, unknown>[] }).rows?.[0] || {};

      const uRow = row(userCounts);
      const cRow = row(creatorCounts);
      const tRow = row(tenantCount);
      const tkRow = row(taskCounts);
      const compRow = row(completionCount);
      const refRow = row(referralCounts);

      const recentUserCount = Number(row(recentUsers).total) || 0;
      const prevUserCount = Number(row(prevPeriodUsers).total) || 0;
      const recentCreatorCount = Number(row(recentCreators).total) || 0;
      const prevCreatorCount = Number(row(prevPeriodCreators).total) || 0;
      const recentCompletionCount = Number(row(recentCompletions).total) || 0;
      const prevCompletionCount = Number(row(prevPeriodCompletions).total) || 0;

      const stats = {
        users: {
          total: Number(uRow.total) || 0,
          fans: Number(uRow.fans) || 0,
          creators: Number(uRow.creators) || 0,
          admins: Number(uRow.admins) || 0,
          growth: growthPct(recentUserCount, prevUserCount),
        },
        creators: {
          total: Number(cRow.total) || 0,
          active: Number(cRow.verified) || 0,
          tenants: Number(tRow.total) || 0,
          growth: growthPct(recentCreatorCount, prevCreatorCount),
        },
        revenue: {
          total: 0,
          thisMonth: 0,
          growth: 0,
        },
        tasks: {
          total: Number(tkRow.total) || 0,
          platformTasks: Number(tkRow.platform_tasks) || 0,
          completions: Number(compRow.total) || 0,
          growth: growthPct(recentCompletionCount, prevCompletionCount),
        },
        referrals: {
          total: Number(refRow.total) || 0,
          pending: Number(refRow.pending) || 0,
          revenueShared: 0,
        },
      };

      res.json(stats);
    } catch (error: unknown) {
      console.error('Error fetching admin stats:', error);
      res.status(500).json({ error: 'Failed to fetch platform statistics' });
    }
  });

  /**
   * GET /api/admin/stats/growth?period=30d|90d|365d
   * Time-series user growth data.
   */
  app.get(
    '/api/admin/stats/growth',
    ...adminAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const days = parsePeriodDays(req.query.period as string);
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const result = await db.execute(sql`
        SELECT
          date_trunc('day', created_at)::date as date,
          COUNT(*) as users,
          COUNT(CASE WHEN user_type = 'creator' THEN 1 END) as creators
        FROM users
        WHERE created_at >= ${since}
        GROUP BY 1
        ORDER BY 1
      `);

        const data = ((result as { rows: Record<string, unknown>[] }).rows || []).map((r) => ({
          date: String(r.date),
          users: Number(r.users) || 0,
          creators: Number(r.creators) || 0,
        }));

        res.json({ data });
      } catch (error: unknown) {
        console.error('Error fetching growth stats:', error);
        res.status(500).json({ error: 'Failed to fetch growth data' });
      }
    }
  );

  /**
   * GET /api/admin/stats/completions?period=30d|90d|365d
   * Time-series task completion data.
   */
  app.get(
    '/api/admin/stats/completions',
    ...adminAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const days = parsePeriodDays(req.query.period as string);
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const result = await db.execute(sql`
        SELECT
          date_trunc('day', completed_at)::date as date,
          COUNT(*) as completions
        FROM task_completions
        WHERE status = 'completed' AND completed_at >= ${since}
        GROUP BY 1
        ORDER BY 1
      `);

        const data = ((result as { rows: Record<string, unknown>[] }).rows || []).map((r) => ({
          date: String(r.date),
          completions: Number(r.completions) || 0,
        }));

        res.json({ data });
      } catch (error: unknown) {
        console.error('Error fetching completion stats:', error);
        res.status(500).json({ error: 'Failed to fetch completion data' });
      }
    }
  );

  /**
   * GET /api/admin/users/recent?limit=20
   * Most recent user signups.
   */
  app.get(
    '/api/admin/users/recent',
    ...adminAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

        const recent = await db
          .select({
            id: users.id,
            username: users.username,
            email: users.email,
            userType: users.userType,
            createdAt: users.createdAt,
          })
          .from(users)
          .orderBy(desc(users.createdAt))
          .limit(limit);

        res.json(recent);
      } catch (error: unknown) {
        console.error('Error fetching recent users:', error);
        res.status(500).json({ error: 'Failed to fetch recent users' });
      }
    }
  );

  // ===========================================================================
  // USER MANAGEMENT (server-side pagination)
  // ===========================================================================

  /**
   * GET /api/admin/users?search=&role=&userType=&page=0&pageSize=25&sortBy=createdAt&sortDir=desc
   * Paginated user list with server-side filtering.
   */
  app.get('/api/admin/users', ...adminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const search = req.query.search as string | undefined;
      const userType = req.query.userType as string | undefined;
      const role = req.query.role as string | undefined;
      const page = Math.max(0, parseInt(req.query.page as string) || 0);
      const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 25));
      const sortDir = req.query.sortDir === 'asc' ? 'asc' : 'desc';

      // Build WHERE conditions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const conditions: any[] = [];
      if (search) {
        conditions.push(
          or(ilike(users.username, `%${search}%`), ilike(users.email, `%${search}%`))
        );
      }
      if (userType && userType !== 'all') {
        conditions.push(eq(users.userType, userType));
      }
      if (role && role !== 'all') {
        conditions.push(sql`${users.role} = ${role}`);
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const orderClause = sortDir === 'asc' ? asc(users.createdAt) : desc(users.createdAt);

      // Run count + data in parallel
      const [countResult, data] = await Promise.all([
        db.select({ total: count() }).from(users).where(whereClause),
        db
          .select({
            id: users.id,
            username: users.username,
            email: users.email,
            userType: users.userType,
            role: users.role,
            createdAt: users.createdAt,
            lastActive: users.lastActiveAt,
          })
          .from(users)
          .where(whereClause)
          .orderBy(orderClause)
          .limit(pageSize)
          .offset(page * pageSize),
      ]);

      const totalCount = countResult[0]?.total || 0;

      res.json({
        data: data.map((u) => ({
          ...u,
          username: u.username || 'Unknown',
          lastActive: u.lastActive ?? u.createdAt,
          status: 'active',
        })),
        totalCount,
        page,
        pageSize,
      });
    } catch (error: unknown) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  /**
   * GET /api/admin/users/:id/details
   * Full user detail with social connections, points, task completions.
   */
  app.get(
    '/api/admin/users/:id/details',
    ...adminAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.params.id;

        const [user, socials, completionCount, pointSummary] = await Promise.all([
          db.query.users.findFirst({ where: eq(users.id, userId) }),
          db
            .select({
              platform: socialConnections.platform,
              platformUsername: socialConnections.platformUsername,
              createdAt: socialConnections.createdAt,
            })
            .from(socialConnections)
            .where(eq(socialConnections.userId, userId)),
          db
            .select({ total: count() })
            .from(taskCompletions)
            .where(
              and(eq(taskCompletions.userId, userId), eq(taskCompletions.status, 'completed'))
            ),
          db.execute(sql`
          SELECT COALESCE(SUM(fp.current_points), 0) as current_points,
                 COALESCE(SUM(fp.total_points_earned), 0) as total_earned
          FROM fan_programs fp WHERE fp.fan_id = ${userId} AND fp.deleted_at IS NULL
        `),
        ]);

        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        const pointRow = (pointSummary as { rows: Record<string, unknown>[] }).rows?.[0] || {};

        res.json({
          ...user,
          socialConnections: socials,
          taskCompletionsCount: completionCount[0]?.total || 0,
          currentPoints: Number(pointRow.current_points) || 0,
          totalPointsEarned: Number(pointRow.total_earned) || 0,
        });
      } catch (error: unknown) {
        console.error('Error fetching user details:', error);
        res.status(500).json({ error: 'Failed to fetch user details' });
      }
    }
  );

  /**
   * PATCH /api/admin/users/:id/role
   * Change user role.
   */
  app.patch(
    '/api/admin/users/:id/role',
    ...adminAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.params.id;
        const { role: newRole } = req.body;

        const validRoles = ['customer_end_user', 'fandomly_admin'];
        if (!validRoles.includes(newRole)) {
          return res
            .status(400)
            .json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
        }

        await db.update(users).set({ role: newRole }).where(eq(users.id, userId));
        res.json({ success: true, role: newRole });
      } catch (error: unknown) {
        console.error('Error updating user role:', error);
        res.status(500).json({ error: 'Failed to update role' });
      }
    }
  );

  /**
   * PATCH /api/admin/users/:id/status
   * Suspend or unsuspend user (sets userType to 'suspended' or restores).
   */
  app.patch(
    '/api/admin/users/:id/status',
    ...adminAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.params.id;
        const { suspended } = req.body;

        if (suspended) {
          // Store previous userType in profileData before suspending
          const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
          if (!user) return res.status(404).json({ error: 'User not found' });

          const profileData = (user.profileData as Record<string, unknown>) || {};
          profileData._previousUserType = user.userType;

          await db
            .update(users)
            .set({
              userType: 'suspended',
              profileData,
            })
            .where(eq(users.id, userId));
        } else {
          // Restore previous userType
          const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
          if (!user) return res.status(404).json({ error: 'User not found' });

          const profileData = (user.profileData as Record<string, unknown>) || {};
          const previousType = (profileData._previousUserType as string) || 'fan';
          delete profileData._previousUserType;

          await db
            .update(users)
            .set({
              userType: previousType,
              profileData,
            })
            .where(eq(users.id, userId));
        }

        res.json({ success: true, suspended: !!suspended });
      } catch (error: unknown) {
        console.error('Error updating user status:', error);
        res.status(500).json({ error: 'Failed to update status' });
      }
    }
  );

  // ===========================================================================
  // CREATOR MANAGEMENT (server-side pagination)
  // ===========================================================================

  /**
   * GET /api/admin/creators?search=&tier=&verified=&page=0&pageSize=25
   * Paginated creator list with fan counts.
   */
  app.get('/api/admin/creators', ...adminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const search = req.query.search as string | undefined;
      const tier = req.query.tier as string | undefined;
      const verified = req.query.verified as string | undefined;
      const page = Math.max(0, parseInt(req.query.page as string) || 0);
      const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 25));

      // Use raw SQL for the join + aggregation + pagination
      const conditions: string[] = ['c.deleted_at IS NULL'];
      const params: unknown[] = [];
      let paramIdx = 0;

      if (search) {
        paramIdx++;
        conditions.push(
          `(c.display_name ILIKE $${paramIdx} OR u.username ILIKE $${paramIdx} OR u.email ILIKE $${paramIdx})`
        );
        params.push(`%${search}%`);
      }
      if (tier && tier !== 'all') {
        paramIdx++;
        conditions.push(`t.subscription_tier = $${paramIdx}`);
        params.push(tier);
      }
      if (verified === 'true') {
        conditions.push('c.is_verified = true');
      } else if (verified === 'false') {
        conditions.push('c.is_verified = false');
      }

      const whereStr = conditions.join(' AND ');

      const countResult = await db.execute(
        sql.raw(`
        SELECT COUNT(*) as total
        FROM creators c
        LEFT JOIN users u ON u.id = c.user_id
        LEFT JOIN tenants t ON t.id = c.tenant_id
        WHERE ${whereStr}
      `)
      );

      const dataResult = await db.execute(
        sql.raw(`
        SELECT
          c.id,
          c.display_name,
          c.is_verified,
          c.category,
          c.created_at,
          u.id as user_id,
          u.username,
          u.email,
          t.name as tenant_name,
          t.slug as tenant_slug,
          t.subscription_tier,
          t.status as tenant_status,
          (SELECT COUNT(*) FROM fan_programs fp WHERE fp.tenant_id = c.tenant_id AND fp.deleted_at IS NULL) as fan_count
        FROM creators c
        LEFT JOIN users u ON u.id = c.user_id
        LEFT JOIN tenants t ON t.id = c.tenant_id
        WHERE ${whereStr}
        ORDER BY c.created_at DESC
        LIMIT ${pageSize} OFFSET ${page * pageSize}
      `)
      );

      const totalCount =
        Number(
          (
            (countResult as { rows: Record<string, unknown>[] }).rows?.[0] as Record<
              string,
              unknown
            >
          )?.total
        ) || 0;
      const data = ((dataResult as { rows: Record<string, unknown>[] }).rows || []).map((r) => ({
        id: r.id,
        userId: r.user_id,
        username: r.username || 'Unknown',
        email: r.email,
        displayName: r.display_name,
        tenantName: r.tenant_name,
        tenantSlug: r.tenant_slug,
        isVerified: r.is_verified,
        category: r.category,
        subscriptionTier: r.subscription_tier,
        tenantStatus: r.tenant_status,
        fanCount: Number(r.fan_count) || 0,
        createdAt: r.created_at,
      }));

      res.json({ data, totalCount, page, pageSize });
    } catch (error: unknown) {
      console.error('Error fetching creators:', error);
      res.status(500).json({ error: 'Failed to fetch creators' });
    }
  });

  /**
   * GET /api/admin/creators/:id/details
   * Full creator detail with social connections, program stats, fan count.
   */
  app.get(
    '/api/admin/creators/:id/details',
    ...adminAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const creatorId = req.params.id;

        const creator = await db.query.creators.findFirst({
          where: eq(creators.id, creatorId),
          with: { user: true, tenant: true },
        });

        if (!creator) {
          return res.status(404).json({ error: 'Creator not found' });
        }

        const [socials, fanCountResult, taskCount] = await Promise.all([
          db
            .select({
              platform: socialConnections.platform,
              platformUsername: socialConnections.platformUsername,
            })
            .from(socialConnections)
            .where(eq(socialConnections.userId, creator.userId)),
          db
            .select({ total: count() })
            .from(fanPrograms)
            .where(
              and(eq(fanPrograms.tenantId, creator.tenantId), sql`${fanPrograms.deletedAt} IS NULL`)
            ),
          db
            .select({ total: count() })
            .from(tasks)
            .where(and(eq(tasks.creatorId, creatorId), sql`${tasks.deletedAt} IS NULL`)),
        ]);

        res.json({
          ...creator,
          socialConnections: socials,
          fanCount: fanCountResult[0]?.total || 0,
          taskCount: taskCount[0]?.total || 0,
        });
      } catch (error: unknown) {
        console.error('Error fetching creator details:', error);
        res.status(500).json({ error: 'Failed to fetch creator details' });
      }
    }
  );

  /**
   * PATCH /api/admin/creators/:id/verify
   * Approve or reject creator verification.
   */
  app.patch(
    '/api/admin/creators/:id/verify',
    ...adminAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const creatorId = req.params.id;
        const { approved, notes } = req.body;

        const creator = await db.query.creators.findFirst({ where: eq(creators.id, creatorId) });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const existingVerificationData = (creator?.verificationData as any) || {};

        await db
          .update(creators)
          .set({
            isVerified: !!approved,
            verificationData: {
              ...existingVerificationData,
              verifiedAt: new Date().toISOString(),
              verificationMethod: 'manual' as const,
              adminVerification: {
                verifiedBy: req.user?.id,
                approved: !!approved,
                notes: notes || null,
                verifiedAt: new Date().toISOString(),
              },
            },
          })
          .where(eq(creators.id, creatorId));

        res.json({ success: true, isVerified: !!approved });
      } catch (error: unknown) {
        console.error('Error updating verification:', error);
        res.status(500).json({ error: 'Failed to update verification' });
      }
    }
  );

  /**
   * PATCH /api/admin/creators/:id/tier
   * Change creator subscription tier.
   */
  app.patch(
    '/api/admin/creators/:id/tier',
    ...adminAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const creatorId = req.params.id;
        const { tier } = req.body;

        const validTiers = ['free', 'beginner', 'rising', 'allstar', 'enterprise'];
        if (!validTiers.includes(tier)) {
          return res
            .status(400)
            .json({ error: `Invalid tier. Must be one of: ${validTiers.join(', ')}` });
        }

        const creator = await db.query.creators.findFirst({ where: eq(creators.id, creatorId) });
        if (!creator) return res.status(404).json({ error: 'Creator not found' });

        await db
          .update(tenants)
          .set({
            subscriptionTier: tier,
          })
          .where(eq(tenants.id, creator.tenantId));

        res.json({ success: true, tier });
      } catch (error: unknown) {
        console.error('Error updating tier:', error);
        res.status(500).json({ error: 'Failed to update tier' });
      }
    }
  );

  // ===========================================================================
  // PLATFORM TASKS
  // ===========================================================================

  /**
   * GET /api/admin/tasks
   * Get all platform tasks.
   */
  app.get('/api/admin/tasks', ...adminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await db.query.tasks.findMany({
        where: (tasks, { eq }) => eq(tasks.ownershipLevel, 'platform'),
        orderBy: (tasks, { desc }) => [desc(tasks.createdAt)],
      });

      res.json(result);
    } catch (error: unknown) {
      console.error('Error fetching platform tasks:', error);
      res.status(500).json({ error: 'Failed to fetch platform tasks' });
    }
  });

  // ===========================================================================
  // REVIEW QUEUE
  // ===========================================================================

  /**
   * GET /api/admin/reviews?status=pending&platform=&page=0&pageSize=25
   * Paginated manual review queue.
   */
  app.get('/api/admin/reviews', ...adminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const status = (req.query.status as string) || 'pending';
      const platform = req.query.platform as string | undefined;
      const page = Math.max(0, parseInt(req.query.page as string) || 0);
      const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 25));

      const conditions: string[] = [];
      if (status && status !== 'all') {
        conditions.push(`mrq.status = '${status.replace(/'/g, "''")}'`);
      }
      if (platform && platform !== 'all') {
        conditions.push(`mrq.platform = '${platform.replace(/'/g, "''")}'`);
      }

      const whereStr = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const [countRes, dataRes] = await Promise.all([
        db.execute(sql.raw(`SELECT COUNT(*) as total FROM manual_review_queue mrq ${whereStr}`)),
        db.execute(
          sql.raw(`
          SELECT mrq.*
          FROM manual_review_queue mrq
          ${whereStr}
          ORDER BY
            CASE mrq.priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 WHEN 'low' THEN 2 ELSE 3 END,
            mrq.submitted_at ASC
          LIMIT ${pageSize} OFFSET ${page * pageSize}
        `)
        ),
      ]);

      const totalCount =
        Number(
          ((countRes as { rows: Record<string, unknown>[] }).rows?.[0] as Record<string, unknown>)
            ?.total
        ) || 0;
      const data = (dataRes as { rows: Record<string, unknown>[] }).rows || [];

      res.json({ data, totalCount, page, pageSize });
    } catch (error: unknown) {
      console.error('Error fetching review queue:', error);
      res.status(500).json({ error: 'Failed to fetch review queue' });
    }
  });

  /**
   * PATCH /api/admin/reviews/:id/approve
   */
  app.patch(
    '/api/admin/reviews/:id/approve',
    ...adminAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const reviewId = req.params.id;
        const { notes } = req.body;

        await db.execute(sql`
        UPDATE manual_review_queue
        SET status = 'approved',
            reviewed_at = NOW(),
            reviewed_by = ${req.user?.id ? parseInt(req.user.id) : null},
            review_notes = ${notes || null}
        WHERE id = ${parseInt(reviewId)}
      `);

        res.json({ success: true });
      } catch (error: unknown) {
        console.error('Error approving review:', error);
        res.status(500).json({ error: 'Failed to approve review' });
      }
    }
  );

  /**
   * PATCH /api/admin/reviews/:id/reject
   */
  app.patch(
    '/api/admin/reviews/:id/reject',
    ...adminAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const reviewId = req.params.id;
        const { notes } = req.body;

        if (!notes) {
          return res.status(400).json({ error: 'Notes are required when rejecting' });
        }

        await db.execute(sql`
        UPDATE manual_review_queue
        SET status = 'rejected',
            reviewed_at = NOW(),
            reviewed_by = ${req.user?.id ? parseInt(req.user.id) : null},
            review_notes = ${notes}
        WHERE id = ${parseInt(reviewId)}
      `);

        res.json({ success: true });
      } catch (error: unknown) {
        console.error('Error rejecting review:', error);
        res.status(500).json({ error: 'Failed to reject review' });
      }
    }
  );

  /**
   * POST /api/admin/reviews/bulk-action
   */
  app.post(
    '/api/admin/reviews/bulk-action',
    ...adminAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { ids, action, notes } = req.body as {
          ids: number[];
          action: 'approve' | 'reject';
          notes?: string;
        };

        if (!ids?.length || !action) {
          return res.status(400).json({ error: 'ids and action are required' });
        }
        if (action === 'reject' && !notes) {
          return res.status(400).json({ error: 'Notes are required for bulk rejection' });
        }

        const idList = ids.map(Number).filter((n) => !isNaN(n));

        await db.execute(sql`
        UPDATE manual_review_queue
        SET status = ${action === 'approve' ? 'approved' : 'rejected'},
            reviewed_at = NOW(),
            reviewed_by = ${req.user?.id ? parseInt(req.user.id) : null},
            review_notes = ${notes || null}
        WHERE id = ANY(${idList})
      `);

        res.json({ success: true, updated: idList.length });
      } catch (error: unknown) {
        console.error('Error in bulk action:', error);
        res.status(500).json({ error: 'Failed to process bulk action' });
      }
    }
  );
}
