import { Express, Request, Response } from "express";
import { storage } from '../../core/storage';
import { db } from '../../db';
import { authenticateUser, requireFandomlyAdmin, AuthenticatedRequest } from '../../middleware/rbac';

export function registerAdminRoutes(app: Express) {
  // Middleware: All admin routes require Fandomly admin role
  const adminAuth = [authenticateUser, requireFandomlyAdmin];

  /**
   * GET /api/admin/stats
   * Get platform-wide statistics
   */
  app.get("/api/admin/stats", ...adminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Get all users
      const allUsers = await db.query.users.findMany();
      
      // Calculate user stats
      const totalUsers = allUsers.length;
      const fans = allUsers.filter(u => u.userType === 'fan').length;
      const creators = allUsers.filter(u => u.userType === 'creator').length;
      const admins = allUsers.filter(u => u.role === 'fandomly_admin').length;

      // Get creator stats
      const allCreators = await db.query.creators.findMany();
      const activeCreators = allCreators.filter(c => c.isVerified).length;
      
      // Get tenant count
      const allTenants = await db.query.tenants.findMany();
      const activeTenants = allTenants.filter(t => t.status === 'active').length;

      // Get task stats
      const allTasks = await db.query.tasks.findMany();
      const platformTasks = allTasks.filter(t => t.ownershipLevel === 'platform').length;
      
      // Get task completions
      const allCompletions = await db.query.taskCompletions.findMany();
      const totalCompletions = allCompletions.length;

      // Mock data for now (TODO: implement real calculations)
      const stats = {
        users: {
          total: totalUsers,
          fans,
          creators,
          admins,
          growth: 12.5, // TODO: Calculate actual growth
        },
        creators: {
          total: allCreators.length,
          active: activeCreators,
          tenants: activeTenants,
          growth: 8.3,
        },
        revenue: {
          total: 0, // TODO: Calculate from transactions
          thisMonth: 0,
          growth: 0,
        },
        tasks: {
          total: allTasks.length,
          platformTasks,
          completions: totalCompletions,
          growth: 15.2,
        },
        referrals: {
          total: 0, // TODO: Calculate from referral tracking
          pending: 0,
          revenueShared: 0,
        },
        engagement: {
          activeUsers: Math.floor(totalUsers * 0.6), // Mock: 60% active
          avgSessionTime: 12, // Mock: 12 minutes
          dailyActive: Math.floor(totalUsers * 0.3), // Mock: 30% daily active
        },
      };

      res.json(stats);
    } catch (error: any) {
      console.error('Error fetching admin stats:', error);
      res.status(500).json({ error: 'Failed to fetch platform statistics' });
    }
  });

  /**
   * GET /api/admin/users
   * Get all users with filtering
   */
  app.get("/api/admin/users", ...adminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { search, userType, role, status } = req.query;

      // Get all users
      let users = await db.query.users.findMany({
        orderBy: (users, { desc }) => [desc(users.createdAt)],
      });

      // Apply filters
      if (search) {
        const searchLower = (search as string).toLowerCase();
        users = users.filter(u => 
          u.username?.toLowerCase().includes(searchLower) ||
          (u.email ?? '').toLowerCase().includes(searchLower)
        );
      }

      if (userType && userType !== 'all') {
        users = users.filter(u => u.userType === userType);
      }

      if (role && role !== 'all') {
        users = users.filter(u => u.role === role);
      }

      // Map to response format with status
      const usersWithStatus = users.map(u => ({
        id: u.id,
        username: u.username || 'Unknown',
        email: u.email,
        userType: u.userType,
        role: u.role,
        createdAt: u.createdAt,
        lastActive: u.lastActiveAt ?? u.createdAt,
        status: 'active', // TODO: Implement real status tracking
      }));

      // Apply status filter
      let filteredUsers = usersWithStatus;
      if (status && status !== 'all') {
        filteredUsers = usersWithStatus.filter(u => u.status === status);
      }

      res.json(filteredUsers);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  /**
   * GET /api/admin/creators
   * Get all creators with detailed info
   */
  app.get("/api/admin/creators", ...adminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const creators = await db.query.creators.findMany({
        with: {
          user: true,
          tenant: true,
        },
      });

      const creatorsWithDetails = creators.map(c => ({
        id: c.id,
        username: c.user?.username || 'Unknown',
        email: c.user?.email,
        displayName: c.displayName,
        tenantName: c.tenant?.name,
        tenantSlug: c.tenant?.slug,
        isVerified: c.isVerified,
        subscriptionTier: c.tenant?.subscriptionTier,
        status: c.tenant?.status,
        createdAt: c.createdAt,
        // TODO: Add revenue, task count, fan count
      }));

      res.json(creatorsWithDetails);
    } catch (error: any) {
      console.error('Error fetching creators:', error);
      res.status(500).json({ error: 'Failed to fetch creators' });
    }
  });

  /**
   * GET /api/admin/tasks
   * Get all platform tasks
   */
  app.get("/api/admin/tasks", ...adminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tasks = await db.query.tasks.findMany({
        where: (tasks, { eq }) => eq(tasks.ownershipLevel, 'platform'),
        orderBy: (tasks, { desc }) => [desc(tasks.createdAt)],
      });

      res.json(tasks);
    } catch (error: any) {
      console.error('Error fetching platform tasks:', error);
      res.status(500).json({ error: 'Failed to fetch platform tasks' });
    }
  });
}

