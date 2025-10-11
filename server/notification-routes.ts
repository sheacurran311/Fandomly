import type { Express, Response } from "express";
import { db } from "./db";
import { notifications, users } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { authenticateUser, type AuthenticatedRequest } from "./middleware/rbac";
import { defaultNotificationPreferences, type NotificationPreferences } from "@shared/notificationPreferences";

export function registerNotificationRoutes(app: Express) {
  
  /**
   * GET /api/notifications
   * Get user's notifications
   */
  app.get("/api/notifications", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { limit = 50, unreadOnly } = req.query;
      
      let query = db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(Number(limit));

      const userNotifications = await query;
      
      // Filter unread only if requested
      const filteredNotifications = unreadOnly === 'true' 
        ? userNotifications.filter(n => !n.read)
        : userNotifications;

      res.json(filteredNotifications);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });

  /**
   * POST /api/notifications/:id/mark-read
   * Mark a single notification as read
   */
  app.post("/api/notifications/:id/mark-read", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Verify notification belongs to user
      const [notification] = await db
        .select()
        .from(notifications)
        .where(and(
          eq(notifications.id, id),
          eq(notifications.userId, userId)
        ));

      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }

      // Mark as read
      const [updated] = await db
        .update(notifications)
        .set({ 
          read: true,
          readAt: new Date()
        })
        .where(eq(notifications.id, id))
        .returning();

      res.json(updated);
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  });

  /**
   * POST /api/notifications/mark-all-read
   * Mark all user's notifications as read
   */
  app.post("/api/notifications/mark-all-read", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      await db
        .update(notifications)
        .set({ 
          read: true,
          readAt: new Date()
        })
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.read, false)
        ));

      res.json({ success: true, message: "All notifications marked as read" });
    } catch (error: any) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
  });

  /**
   * GET /api/notifications/preferences
   * Get user's notification preferences
   */
  app.get("/api/notifications/preferences", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Return preferences or defaults
      const preferences = user.notificationPreferences || defaultNotificationPreferences;
      
      res.json(preferences);
    } catch (error: any) {
      console.error('Error fetching notification preferences:', error);
      res.status(500).json({ error: 'Failed to fetch notification preferences' });
    }
  });

  /**
   * POST /api/notifications/preferences
   * Update user's notification preferences
   */
  app.post("/api/notifications/preferences", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const preferences = req.body as NotificationPreferences;
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Update user's notification preferences
      const [updated] = await db
        .update(users)
        .set({ 
          notificationPreferences: preferences 
        })
        .where(eq(users.id, userId))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ 
        success: true, 
        preferences: updated.notificationPreferences 
      });
    } catch (error: any) {
      console.error('Error updating notification preferences:', error);
      res.status(500).json({ error: 'Failed to update notification preferences' });
    }
  });

  /**
   * POST /api/notifications
   * Create a new notification (internal API for system use)
   */
  app.post("/api/notifications", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId, tenantId, type, title, message, metadata, sentVia } = req.body;

      if (!userId || !type || !title || !message) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const [notification] = await db
        .insert(notifications)
        .values({
          userId,
          tenantId: tenantId || null,
          type,
          title,
          message,
          metadata: metadata || {},
          sentVia: sentVia || { push: true, email: false, sms: false },
          read: false,
          createdAt: new Date(),
        })
        .returning();

      res.json(notification);
    } catch (error: any) {
      console.error('Error creating notification:', error);
      res.status(500).json({ error: 'Failed to create notification' });
    }
  });

  /**
   * DELETE /api/notifications/:id
   * Delete a notification
   */
  app.delete("/api/notifications/:id", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Verify notification belongs to user before deleting
      await db
        .delete(notifications)
        .where(and(
          eq(notifications.id, id),
          eq(notifications.userId, userId)
        ));

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ error: 'Failed to delete notification' });
    }
  });

  /**
   * GET /api/notifications/unread-count
   * Get count of unread notifications
   */
  app.get("/api/notifications/unread-count", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const unreadNotifications = await db
        .select()
        .from(notifications)
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.read, false)
        ));

      res.json({ count: unreadNotifications.length });
    } catch (error: any) {
      console.error('Error fetching unread count:', error);
      res.status(500).json({ error: 'Failed to fetch unread count' });
    }
  });
}

