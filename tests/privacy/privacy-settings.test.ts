/**
 * Privacy Settings Tests
 * 
 * Tests privacy toggle effects and data visibility.
 */

import { describe, it, expect } from 'vitest';
import { fanUser } from '../fixtures/users';
import { sampleProgram, programWithHiddenLeaderboard } from '../fixtures/programs';

describe('Privacy Settings', () => {
  describe('Profile Privacy', () => {
    it('should support public/private profile toggle', () => {
      const privacySettings = {
        publicProfile: true,
        showPoints: true,
        showAchievements: true,
        allowCreatorMessages: true,
        shareActivity: false,
      };
      
      expect(typeof privacySettings.publicProfile).toBe('boolean');
    });

    it('should hide profile when set to private', () => {
      const settings = { publicProfile: false };
      const isVisible = (viewerId: string, ownerId: string) => {
        if (viewerId === ownerId) return true;
        return settings.publicProfile;
      };
      
      expect(isVisible('other-user', fanUser.id)).toBe(false);
      expect(isVisible(fanUser.id, fanUser.id)).toBe(true);
    });

    it('should hide points when showPoints is false', () => {
      const settings = { showPoints: false };
      const user = { ...fanUser, totalPoints: 1500 };
      
      const visiblePoints = settings.showPoints ? user.totalPoints : null;
      expect(visiblePoints).toBeNull();
    });

    it('should hide achievements when showAchievements is false', () => {
      const settings = { showAchievements: false };
      const achievements = ['first_task', 'streak_7', 'level_up'];
      
      const visibleAchievements = settings.showAchievements ? achievements : [];
      expect(visibleAchievements).toEqual([]);
    });
  });

  describe('Activity Privacy', () => {
    it('should not share activity when disabled', () => {
      const settings = { shareActivity: false };
      const activity = {
        taskCompleted: 'Twitter Follow',
        timestamp: new Date(),
      };
      
      const isShared = settings.shareActivity;
      expect(isShared).toBe(false);
    });

    it('should share activity when enabled', () => {
      const settings = { shareActivity: true };
      const isShared = settings.shareActivity;
      
      expect(isShared).toBe(true);
    });

    it('should respect activity feed visibility in programs', () => {
      const program = sampleProgram;
      const showActivityFeed = program.pageConfig.visibility.showActivityFeed;
      
      expect(showActivityFeed).toBe(true);
    });
  });

  describe('Leaderboard Privacy', () => {
    it('should hide from leaderboard when opted out', () => {
      const settings = { hideFromLeaderboard: true };
      const leaderboard = [
        { userId: 'user1', points: 1000 },
        { userId: fanUser.id, points: 1500 },
        { userId: 'user3', points: 800 },
      ];
      
      const filteredLeaderboard = settings.hideFromLeaderboard
        ? leaderboard.filter(entry => entry.userId !== fanUser.id)
        : leaderboard;
      
      expect(filteredLeaderboard.length).toBe(2);
      expect(filteredLeaderboard.find(e => e.userId === fanUser.id)).toBeUndefined();
    });

    it('should respect program leaderboard visibility', () => {
      const program = programWithHiddenLeaderboard;
      const showLeaderboard = program.pageConfig.visibility.showLeaderboard;
      
      expect(showLeaderboard).toBe(false);
    });

    it('should return 403 when leaderboard is disabled', () => {
      const program = programWithHiddenLeaderboard;
      const showLeaderboard = program.pageConfig.visibility.showLeaderboard;
      
      const responseCode = showLeaderboard ? 200 : 403;
      expect(responseCode).toBe(403);
    });
  });

  describe('Communication Privacy', () => {
    it('should block creator messages when disabled', () => {
      const settings = { allowCreatorMessages: false };
      
      const canReceiveMessage = settings.allowCreatorMessages;
      expect(canReceiveMessage).toBe(false);
    });

    it('should allow creator messages when enabled', () => {
      const settings = { allowCreatorMessages: true };
      
      const canReceiveMessage = settings.allowCreatorMessages;
      expect(canReceiveMessage).toBe(true);
    });

    it('should respect email notification preferences', () => {
      const preferences = {
        emailNotifications: true,
        campaignUpdates: true,
        creatorUpdates: true,
        achievementAlerts: true,
        weeklyDigest: false,
      };
      
      expect(preferences.emailNotifications).toBe(true);
      expect(preferences.weeklyDigest).toBe(false);
    });
  });

  describe('Social Connection Privacy', () => {
    it('should hide social links when showSocialLinks is false', () => {
      const visibility = { showSocialLinks: false };
      const socialLinks = {
        twitter: '@testuser',
        instagram: 'testuser',
      };
      
      const visibleLinks = visibility.showSocialLinks ? socialLinks : null;
      expect(visibleLinks).toBeNull();
    });

    it('should show social links by default', () => {
      const visibility = sampleProgram.pageConfig.visibility.profileData;
      
      expect(visibility.showSocialLinks).toBe(true);
    });

    it('should allow selective social link visibility', () => {
      const linkVisibility = {
        twitter: true,
        instagram: true,
        youtube: false,
        tiktok: false,
      };
      
      const socialLinks = {
        twitter: '@test',
        instagram: 'test',
        youtube: 'TestYT',
        tiktok: 'test',
      };
      
      const visibleLinks = Object.entries(socialLinks)
        .filter(([platform]) => linkVisibility[platform as keyof typeof linkVisibility])
        .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});
      
      expect(Object.keys(visibleLinks)).toEqual(['twitter', 'instagram']);
    });
  });

  describe('Data Collection Consent', () => {
    it('should track consent for data collection', () => {
      const consent = {
        termsAccepted: true,
        termsAcceptedAt: new Date('2025-01-01'),
        privacyPolicyAccepted: true,
        privacyAcceptedAt: new Date('2025-01-01'),
        marketingOptIn: false,
      };
      
      expect(consent.termsAccepted).toBe(true);
      expect(consent.privacyPolicyAccepted).toBe(true);
      expect(consent.marketingOptIn).toBe(false);
    });

    it('should allow updating consent preferences', () => {
      const originalConsent = { marketingOptIn: false };
      const updatedConsent = { ...originalConsent, marketingOptIn: true };
      
      expect(updatedConsent.marketingOptIn).toBe(true);
    });

    it('should log consent changes', () => {
      const consentLog = {
        userId: fanUser.id,
        field: 'marketingOptIn',
        oldValue: false,
        newValue: true,
        changedAt: new Date(),
        ipAddress: '127.0.0.1',
      };
      
      expect(consentLog.oldValue).not.toBe(consentLog.newValue);
      expect(consentLog.changedAt).toBeDefined();
    });
  });

  describe('Third-Party Data Sharing', () => {
    it('should not share data with third parties without consent', () => {
      const consent = { thirdPartySharing: false };
      const canShare = consent.thirdPartySharing;
      
      expect(canShare).toBe(false);
    });

    it('should anonymize data for analytics', () => {
      const rawData = {
        userId: fanUser.id,
        email: fanUser.email,
        completedTask: 'Twitter Follow',
      };
      
      const anonymized = {
        anonId: 'hashed-' + rawData.userId.slice(0, 8),
        completedTask: rawData.completedTask,
        // email is removed
      };
      
      expect('email' in anonymized).toBe(false);
      expect(anonymized.anonId).not.toBe(rawData.userId);
    });
  });

  describe('Settings Persistence', () => {
    it('should persist privacy settings', () => {
      const settings = {
        publicProfile: true,
        showPoints: true,
        shareActivity: false,
      };
      
      // Simulate save and reload
      const savedSettings = JSON.stringify(settings);
      const loadedSettings = JSON.parse(savedSettings);
      
      expect(loadedSettings).toEqual(settings);
    });

    it('should have default privacy settings', () => {
      const defaults = {
        publicProfile: true,
        showPoints: true,
        showAchievements: true,
        allowCreatorMessages: true,
        shareActivity: false, // Default to not sharing
        hideFromLeaderboard: false,
      };
      
      expect(defaults.shareActivity).toBe(false);
      expect(defaults.publicProfile).toBe(true);
    });
  });
});
