import { db } from '../../db';
import { users } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Platform Points Service
 * 
 * Manages Fandomly Points - platform-wide currency separate from creator points.
 * Points are stored in users.profileData.fandomlyPoints for quick access.
 * 
 * Key Differences from Creator Points:
 * - Platform points: Redeemable for Fandomly-issued rewards (NFTs, badges, special offers)
 * - Creator points: Redeemable for creator-specific rewards
 */

interface PointTransaction {
  id: string;
  userId: string;
  points: number;
  source: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export class PlatformPointsService {
  /**
   * Award platform points to a user
   * Updates users.profileData.fandomlyPoints and stores transaction in pointsTransactions array
   */
  async awardPoints(
    userId: string,
    points: number,
    source: string,
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; newBalance: number }> {
    try {
      // Get current user data
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Calculate new balance
      const currentPoints = (user.profileData as any)?.fandomlyPoints || 0;
      const newBalance = currentPoints + points;

      // Create transaction record
      const transaction = {
        id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        points,
        source,
        metadata,
        createdAt: new Date().toISOString(),
      };

      // Get existing transactions (keep last 100 for MVP)
      const existingTransactions = (user.profileData as any)?.pointsTransactions || [];
      const updatedTransactions = [transaction, ...existingTransactions].slice(0, 100);

      // Update user's platform points balance and transactions
      await db
        .update(users)
        .set({
          profileData: sql`jsonb_set(
            jsonb_set(
              COALESCE(profile_data, '{}'::jsonb),
              '{fandomlyPoints}',
              ${newBalance}::text::jsonb
            ),
            '{pointsTransactions}',
            ${JSON.stringify(updatedTransactions)}::jsonb
          )`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      console.log(`[Platform Points] Awarded ${points} points to user ${userId}. New balance: ${newBalance}. Source: ${source}`);

      return {
        success: true,
        newBalance,
      };
    } catch (error) {
      console.error('[Platform Points] Error awarding points:', error);
      throw error;
    }
  }

  /**
   * Get user's platform points balance
   */
  async getBalance(userId: string): Promise<number> {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) {
        return 0;
      }

      const points = (user.profileData as any)?.fandomlyPoints || 0;
      return points;
    } catch (error) {
      console.error('[Platform Points] Error getting balance:', error);
      return 0;
    }
  }

  /**
   * Get platform points transaction history
   * Combines stored transactions in profileData with platformTaskCompletions
   */
  async getTransactionHistory(
    userId: string,
    limit: number = 50
  ): Promise<PointTransaction[]> {
    try {
      // Get stored transactions from user's profileData
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      const storedTransactions: PointTransaction[] = ((user?.profileData as any)?.pointsTransactions || []).map(
        (tx: any) => ({
          id: tx.id,
          userId,
          points: tx.points,
          source: tx.source,
          metadata: tx.metadata,
          createdAt: new Date(tx.createdAt),
        })
      );

      // Also query platformTaskCompletions for task completion rewards
      const completions = await db.query.platformTaskCompletions.findMany({
        where: (completions, { eq }) => eq(completions.userId, userId),
        orderBy: (completions, { desc }) => [desc(completions.createdAt)],
        limit,
        with: {
          task: {
            columns: {
              name: true,
              description: true,
            },
          },
        },
      });

      // Transform completions to transaction format
      const taskTransactions: PointTransaction[] = completions
        .filter(c => c.status === 'completed' || c.status === 'verified')
        .map(completion => ({
          id: `task_${completion.id}`,
          userId: completion.userId,
          points: completion.pointsAwarded,
          source: 'platform_task_completion',
          metadata: {
            taskId: completion.taskId,
            taskName: (completion as any).task?.name,
            completedAt: completion.completedAt,
            verifiedAt: completion.verifiedAt,
          },
          createdAt: completion.createdAt,
        }));

      // Combine and sort all transactions by date
      const allTransactions = [...storedTransactions, ...taskTransactions]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);

      return allTransactions;
    } catch (error) {
      console.error('[Platform Points] Error getting transaction history:', error);
      return [];
    }
  }

  /**
   * Spend platform points (for future rewards redemption)
   */
  async spendPoints(
    userId: string,
    points: number,
    reason: string,
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; newBalance: number }> {
    try {
      // Get current balance
      const currentBalance = await this.getBalance(userId);

      if (currentBalance < points) {
        throw new Error('Insufficient platform points');
      }

      // Deduct points (award negative amount)
      const result = await this.awardPoints(userId, -points, reason, metadata);

      console.log(`[Platform Points] Spent ${points} points for user ${userId}. Reason: ${reason}`);

      return result;
    } catch (error) {
      console.error('[Platform Points] Error spending points:', error);
      throw error;
    }
  }

  /**
   * Get platform points leaderboard (optional - for gamification)
   */
  async getLeaderboard(limit: number = 10): Promise<Array<{
    userId: string;
    username: string;
    points: number;
  }>> {
    try {
      // Query users with highest fandomlyPoints
      const topUsers = await db
        .select({
          userId: users.id,
          username: users.username,
          profileData: users.profileData,
        })
        .from(users)
        .where(sql`(profile_data->>'fandomlyPoints')::int > 0`)
        .orderBy(sql`(profile_data->>'fandomlyPoints')::int DESC`)
        .limit(limit);

      return topUsers.map(user => ({
        userId: user.userId,
        username: user.username,
        points: (user.profileData as any)?.fandomlyPoints || 0,
      }));
    } catch (error) {
      console.error('[Platform Points] Error getting leaderboard:', error);
      return [];
    }
  }
}

// Export singleton instance
export const platformPointsService = new PlatformPointsService();

