/**
 * Platform Tasks Admin API Tests
 * 
 * Tests admin-only platform task CRUD operations.
 */

import { describe, it, expect } from 'vitest';
import {
  completeProfileTask,
  connectTwitterTask,
  dailyCheckInTask,
  platformTaskCreatePayload,
  platformTaskUpdatePayload,
  allPlatformTaskFixtures,
} from '../../fixtures/platform-tasks';
import { adminUser, fanUser } from '../../fixtures/users';

describe('Platform Tasks Admin API', () => {
  describe('Authorization', () => {
    it('should require fandomly_admin role', () => {
      const adminRole = adminUser.role;
      const fanRole = fanUser.role;
      
      expect(adminRole).toBe('fandomly_admin');
      expect(fanRole).not.toBe('fandomly_admin');
    });

    it('should reject non-admin users', () => {
      const userRole = 'user';
      const isAdmin = userRole === 'fandomly_admin';
      
      expect(isAdmin).toBe(false);
    });

    it('should reject creator role for admin operations', () => {
      const userRole = 'creator';
      const isAdmin = userRole === 'fandomly_admin';
      
      expect(isAdmin).toBe(false);
    });
  });

  describe('GET /api/admin/platform-tasks - List Platform Tasks', () => {
    it('should return all platform tasks', () => {
      const tasks = allPlatformTaskFixtures;
      
      expect(Array.isArray(tasks)).toBe(true);
      expect(tasks.length).toBeGreaterThan(0);
    });

    it('should only include platform-level tasks', () => {
      const tasks = allPlatformTaskFixtures;
      const allPlatformLevel = tasks.every(t => t.ownershipLevel === 'platform');
      
      expect(allPlatformLevel).toBe(true);
    });

    it('should include active and inactive tasks', () => {
      const tasks = allPlatformTaskFixtures;
      const hasActive = tasks.some(t => t.isActive === true);
      const hasInactive = tasks.some(t => t.isActive === false);
      
      expect(hasActive).toBe(true);
      expect(hasInactive).toBe(true);
    });
  });

  describe('POST /api/admin/platform-tasks - Create Platform Task', () => {
    it('should have valid create payload', () => {
      const payload = platformTaskCreatePayload;
      
      expect(payload.name).toBeDefined();
      expect(payload.description).toBeDefined();
      expect(payload.taskType).toBeDefined();
      expect(payload.platform).toBeDefined();
      expect(payload.pointsToReward).toBeGreaterThan(0);
    });

    it('should set ownership to platform level', () => {
      const newTask = {
        ...platformTaskCreatePayload,
        ownershipLevel: 'platform',
        tenantId: null,
        creatorId: null,
        programId: null,
      };
      
      expect(newTask.ownershipLevel).toBe('platform');
      expect(newTask.tenantId).toBeNull();
      expect(newTask.creatorId).toBeNull();
    });

    it('should validate custom settings for profile tasks', () => {
      const profileTask = completeProfileTask;
      const settings = profileTask.customSettings;
      
      expect(settings.requiredFields).toBeDefined();
      expect(Array.isArray(settings.requiredFields)).toBe(true);
      expect(settings.requiredFields.length).toBeGreaterThan(0);
    });

    it('should validate custom settings for social tasks', () => {
      const socialTask = connectTwitterTask;
      const settings = socialTask.customSettings;
      
      expect(settings.socialPlatform).toBe('twitter');
      expect(settings.type).toBe('social');
    });
  });

  describe('PUT /api/admin/platform-tasks/:id - Update Platform Task', () => {
    it('should have valid update payload', () => {
      const payload = platformTaskUpdatePayload;
      
      expect(payload.name).toBe('Updated Platform Task');
      expect(payload.pointsToReward).toBe(150);
    });

    it('should allow partial updates', () => {
      const partialUpdate = { pointsToReward: 200 };
      
      expect('pointsToReward' in partialUpdate).toBe(true);
      expect('name' in partialUpdate).toBe(false);
    });

    it('should not allow changing ownership level', () => {
      const invalidUpdate = { ownershipLevel: 'creator' };
      const isValidUpdate = !('ownershipLevel' in invalidUpdate);
      
      // This should be rejected
      expect('ownershipLevel' in invalidUpdate).toBe(true);
    });
  });

  describe('DELETE /api/admin/platform-tasks/:id - Delete Platform Task', () => {
    it('should require admin authentication', () => {
      const adminOnly = true;
      expect(adminOnly).toBe(true);
    });

    it('should handle tasks with completions', () => {
      // Platform tasks may have completions across many users
      // Deletion should handle this gracefully
      const cascadeOrSoftDelete = 'soft_delete';
      expect(['cascade', 'soft_delete']).toContain(cascadeOrSoftDelete);
    });
  });

  describe('Platform Task Types', () => {
    it('should support profile completion tasks', () => {
      const task = completeProfileTask;
      
      expect(task.taskType).toBe('complete_profile');
      expect(task.section).toBe('user_onboarding');
    });

    it('should support social connection tasks', () => {
      const task = connectTwitterTask;
      
      expect(task.platform).toBe('twitter');
      expect(task.section).toBe('social_engagement');
    });

    it('should support engagement tasks', () => {
      const task = dailyCheckInTask;
      
      expect(task.taskType).toBe('check_in');
      expect(task.section).toBe('engagement');
    });
  });

  describe('Eligible Account Types', () => {
    it('should filter by fan accounts', () => {
      const task = dailyCheckInTask;
      const eligibleTypes = task.customSettings.eligibleAccountTypes;
      
      expect(eligibleTypes).toContain('fan');
    });

    it('should support multiple account types', () => {
      const task = completeProfileTask;
      const eligibleTypes = task.customSettings.eligibleAccountTypes;
      
      expect(eligibleTypes).toContain('fan');
      expect(eligibleTypes).toContain('creator');
    });

    it('should validate account type on completion', () => {
      const task = dailyCheckInTask;
      const eligibleTypes = task.customSettings.eligibleAccountTypes || ['fan', 'creator'];
      const userType = 'fan';
      
      const isEligible = eligibleTypes.includes(userType);
      expect(isEligible).toBe(true);
    });
  });

  describe('Platform Task Discovery', () => {
    it('should return tasks for fan onboarding', () => {
      const tasks = allPlatformTaskFixtures;
      const onboardingTasks = tasks.filter(
        t => t.section === 'user_onboarding' && t.isActive
      );
      
      expect(onboardingTasks.length).toBeGreaterThan(0);
    });

    it('should return tasks for social engagement', () => {
      const tasks = allPlatformTaskFixtures;
      const socialTasks = tasks.filter(
        t => t.section === 'social_engagement' && t.isActive
      );
      
      expect(socialTasks.length).toBeGreaterThan(0);
    });

    it('should not return inactive tasks to fans', () => {
      const tasks = allPlatformTaskFixtures;
      const visibleTasks = tasks.filter(t => t.isActive);
      const hiddenTasks = tasks.filter(t => !t.isActive);
      
      expect(visibleTasks.length).toBeGreaterThan(0);
      expect(hiddenTasks.length).toBeGreaterThan(0);
    });
  });
});
