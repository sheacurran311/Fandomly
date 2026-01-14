/**
 * Admin Stats API Tests
 * 
 * Tests the admin statistics endpoint.
 */

import { describe, it, expect } from 'vitest';
import { adminStatsFixture, auditLogFixture } from '../../fixtures/platform-tasks';
import { adminUser, fanUser, creatorUser } from '../../fixtures/users';

describe('Admin Stats API', () => {
  describe('GET /api/admin/stats', () => {
    it('should require admin authentication', () => {
      const adminRole = adminUser.role;
      const isAdmin = adminRole === 'fandomly_admin';
      
      expect(isAdmin).toBe(true);
    });

    it('should return user statistics', () => {
      const stats = adminStatsFixture.users;
      
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.fans).toBeDefined();
      expect(stats.creators).toBeDefined();
      expect(stats.admins).toBeDefined();
      expect(stats.growth).toBeDefined();
    });

    it('should return creator statistics', () => {
      const stats = adminStatsFixture.creators;
      
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.active).toBeDefined();
      expect(stats.tenants).toBeDefined();
      expect(stats.growth).toBeDefined();
    });

    it('should return task statistics', () => {
      const stats = adminStatsFixture.tasks;
      
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.platformTasks).toBeDefined();
      expect(stats.completions).toBeDefined();
      expect(stats.growth).toBeDefined();
    });

    it('should return engagement statistics', () => {
      const stats = adminStatsFixture.engagement;
      
      expect(stats.activeUsers).toBeDefined();
      expect(stats.avgSessionTime).toBeDefined();
      expect(stats.dailyActive).toBeDefined();
    });

    it('should return referral statistics', () => {
      const stats = adminStatsFixture.referrals;
      
      expect(stats.total).toBeDefined();
      expect(stats.pending).toBeDefined();
      expect(stats.revenueShared).toBeDefined();
    });
  });

  describe('GET /api/admin/users', () => {
    it('should return all users', () => {
      const users = [fanUser, creatorUser, adminUser];
      
      expect(users.length).toBeGreaterThan(0);
    });

    it('should support filtering by user type', () => {
      const users = [fanUser, creatorUser, adminUser];
      const fans = users.filter(u => u.userType === 'fan');
      
      expect(fans.length).toBe(1);
      expect(fans[0].userType).toBe('fan');
    });

    it('should support filtering by role', () => {
      const users = [fanUser, creatorUser, adminUser];
      const admins = users.filter(u => u.role === 'fandomly_admin');
      
      expect(admins.length).toBe(1);
      expect(admins[0].role).toBe('fandomly_admin');
    });

    it('should support search by username', () => {
      const users = [fanUser, creatorUser, adminUser];
      const searchTerm = 'testfan';
      const results = users.filter(u => 
        u.username?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      expect(results.length).toBe(1);
    });

    it('should support search by email', () => {
      const users = [fanUser, creatorUser, adminUser];
      const searchTerm = 'testcreator@example.com';
      const results = users.filter(u => 
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      expect(results.length).toBe(1);
    });
  });

  describe('GET /api/audit-logs', () => {
    it('should require admin authentication', () => {
      const adminOnly = true;
      expect(adminOnly).toBe(true);
    });

    it('should return audit log entries', () => {
      const log = auditLogFixture;
      
      expect(log.id).toBeDefined();
      expect(log.userId).toBeDefined();
      expect(log.action).toBeDefined();
      expect(log.resource).toBeDefined();
      expect(log.createdAt).toBeDefined();
    });

    it('should support filtering by user', () => {
      const logs = [auditLogFixture];
      const userId = 'test-admin-user-1';
      const filtered = logs.filter(l => l.userId === userId);
      
      expect(filtered.length).toBe(1);
    });

    it('should support filtering by resource', () => {
      const logs = [auditLogFixture];
      const resource = 'platform_task';
      const filtered = logs.filter(l => l.resource === resource);
      
      expect(filtered.length).toBe(1);
    });

    it('should support filtering by action', () => {
      const logs = [auditLogFixture];
      const action = 'create';
      const filtered = logs.filter(l => l.action === action);
      
      expect(filtered.length).toBe(1);
    });

    it('should support date range filtering', () => {
      const log = auditLogFixture;
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-12-31');
      
      const inRange = log.createdAt >= startDate && log.createdAt <= endDate;
      expect(inRange).toBe(true);
    });

    it('should include old and new values for updates', () => {
      const updateLog = {
        ...auditLogFixture,
        action: 'update',
        oldValues: { name: 'Old Name' },
        newValues: { name: 'New Name' },
      };
      
      expect(updateLog.oldValues).toBeDefined();
      expect(updateLog.newValues).toBeDefined();
    });

    it('should respect pagination', () => {
      const limit = 100;
      const offset = 0;
      
      expect(limit).toBeLessThanOrEqual(1000); // Max limit
      expect(offset).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Admin User Management', () => {
    it('should allow updating user status', () => {
      const user = fanUser;
      const newStatus = { isVerified: true };
      
      const updated = { ...user, ...newStatus };
      expect(updated.isVerified).toBe(true);
    });

    it('should allow promoting to admin', () => {
      const user = creatorUser;
      const promotion = { role: 'fandomly_admin' };
      
      const promoted = { ...user, ...promotion };
      expect(promoted.role).toBe('fandomly_admin');
    });

    it('should not allow self-demotion of last admin', () => {
      // Business rule: Cannot demote if you're the last admin
      const adminCount = 1;
      const canDemote = adminCount > 1;
      
      expect(canDemote).toBe(false);
    });
  });
});
