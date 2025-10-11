import { z } from "zod";

// Notification Channel Types
export const NotificationChannelSchema = z.object({
  push: z.boolean().default(true),    // In-app/browser push notifications
  email: z.boolean().default(true),   // Email notifications
  sms: z.boolean().default(false),    // SMS notifications (requires phone setup)
});

export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;

// Complete Notification Preferences Schema
export const NotificationPreferencesSchema = z.object({
  // Marketing Notifications
  marketing: NotificationChannelSchema.default({
    push: true,
    email: true,
    sms: false,
  }),
  
  // Creator/Campaign Notifications
  campaignUpdates: NotificationChannelSchema.default({
    push: true,
    email: true,
    sms: false,
  }),
  
  creatorUpdates: NotificationChannelSchema.default({
    push: true,
    email: false,
    sms: false,
  }),
  
  newTasks: NotificationChannelSchema.default({
    push: true,
    email: true,
    sms: false,
  }),
  
  newRewards: NotificationChannelSchema.default({
    push: true,
    email: true,
    sms: false,
  }),
  
  // Achievement Alerts
  achievementAlerts: NotificationChannelSchema.default({
    push: true,
    email: false,
    sms: false,
  }),
  
  // Additional preferences
  weeklyDigest: z.boolean().default(false),
  monthlyReport: z.boolean().default(false),
});

export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;

// Default notification preferences
export const defaultNotificationPreferences: NotificationPreferences = {
  marketing: {
    push: true,
    email: true,
    sms: false,
  },
  campaignUpdates: {
    push: true,
    email: true,
    sms: false,
  },
  creatorUpdates: {
    push: true,
    email: false,
    sms: false,
  },
  newTasks: {
    push: true,
    email: true,
    sms: false,
  },
  newRewards: {
    push: true,
    email: true,
    sms: false,
  },
  achievementAlerts: {
    push: true,
    email: false,
    sms: false,
  },
  weeklyDigest: false,
  monthlyReport: false,
};

// Helper function to check if user has phone number for SMS
export function canEnableSMS(phoneNumber?: string | null): boolean {
  return !!phoneNumber && phoneNumber.length > 0;
}

// Notification categories for UI grouping
export const notificationCategories = {
  marketing: {
    label: "Marketing",
    description: "Promotional content and platform updates",
    icon: "megaphone",
  },
  creator: {
    label: "Creator Updates",
    description: "Updates from creators you follow",
    categories: [
      {
        key: "campaignUpdates",
        label: "Campaign Updates",
        description: "New campaigns and campaign status changes",
      },
      {
        key: "creatorUpdates",
        label: "Creator Posts",
        description: "New posts and updates from creators",
      },
      {
        key: "newTasks",
        label: "New Tasks",
        description: "New tasks available to complete",
      },
      {
        key: "newRewards",
        label: "New Rewards",
        description: "New rewards available to claim",
      },
    ],
  },
  achievements: {
    label: "Achievement Alerts",
    description: "Level ups, badges, and milestones",
    icon: "trophy",
  },
} as const;

