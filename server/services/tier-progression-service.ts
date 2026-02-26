/**
 * Tier Progression Service
 * Sprint 5: Handles automatic tier upgrades/downgrades based on points
 * 
 * Features:
 * - Auto-upgrade users when point thresholds are crossed
 * - Auto-downgrade users when points drop (if configured)
 * - Track tier progression history
 * - Enforce tier-gated benefits
 */

import { db } from '../db';
import { sql, eq, and, desc, gte, lte, asc } from 'drizzle-orm';

interface TierConfig {
  id: string;
  programId: string;
  name: string;
  minPoints: number;
  maxPoints: number | null;
  tierOrder: number;
  benefits: TierBenefit[];
  badgeImageUrl?: string;
}

interface TierBenefit {
  type: 'discount' | 'early_access' | 'exclusive_content' | 'bonus_points' | 'custom';
  name: string;
  description: string;
  value?: string | number;
  metadata?: Record<string, any>;
}

interface TierProgressionResult {
  changed: boolean;
  previousTier?: TierConfig;
  newTier?: TierConfig;
  progressionType?: 'upgrade' | 'downgrade' | 'initial';
}

class TierProgressionService {
  /**
   * Check and update user tier after points change
   * Call this after any points award or deduction
   */
  async checkAndUpdateTier(
    fanProgramId: string,
    triggerReason: string = 'points_change'
  ): Promise<TierProgressionResult> {
    // Get current fan program state
    const [fanProgram] = await db.execute(sql`
      SELECT 
        fp.id,
        fp.program_id,
        fp.points_balance,
        fp.lifetime_points,
        fp.current_tier_id,
        lpt.name as current_tier_name,
        lpt.tier_order as current_tier_order
      FROM fan_programs fp
      LEFT JOIN loyalty_program_tiers lpt ON fp.current_tier_id = lpt.id
      WHERE fp.id = ${fanProgramId}
    `);

    if (!(fanProgram as any).rows?.[0]) {
      console.warn(`[TierProgression] Fan program not found: ${fanProgramId}`);
      return { changed: false };
    }

    const program = (fanProgram as any).rows[0];
    const currentPoints = program.lifetime_points || program.points_balance || 0;

    // Get all tiers for this loyalty program, ordered by min_points
    const tiersResult = await db.execute(sql`
      SELECT 
        id, 
        program_id, 
        name, 
        min_points, 
        max_points, 
        tier_order, 
        benefits,
        badge_image_url
      FROM loyalty_program_tiers
      WHERE program_id = ${program.program_id}
        AND is_active = TRUE
      ORDER BY min_points ASC
    `);

    const tiers: TierConfig[] = ((tiersResult as any).rows || []).map((t: any) => ({
      id: t.id,
      programId: t.program_id,
      name: t.name,
      minPoints: t.min_points,
      maxPoints: t.max_points,
      tierOrder: t.tier_order,
      benefits: t.benefits || [],
      badgeImageUrl: t.badge_image_url,
    }));

    if (tiers.length === 0) {
      // No tiers configured for this program
      return { changed: false };
    }

    // Find the appropriate tier based on current points
    let newTier: TierConfig | undefined;
    for (let i = tiers.length - 1; i >= 0; i--) {
      if (currentPoints >= tiers[i].minPoints) {
        newTier = tiers[i];
        break;
      }
    }

    // If no tier qualifies, use the first (lowest) tier
    if (!newTier) {
      newTier = tiers[0];
    }

    const currentTierId = program.current_tier_id;
    const currentTier = currentTierId 
      ? tiers.find(t => t.id === currentTierId) 
      : undefined;

    // Check if tier changed
    if (currentTierId === newTier.id) {
      return { changed: false };
    }

    // Determine progression type
    let progressionType: 'upgrade' | 'downgrade' | 'initial';
    if (!currentTierId) {
      progressionType = 'initial';
    } else if (newTier.tierOrder > (currentTier?.tierOrder || 0)) {
      progressionType = 'upgrade';
    } else {
      progressionType = 'downgrade';
    }

    // Update fan program with new tier
    await db.execute(sql`
      UPDATE fan_programs
      SET current_tier_id = ${newTier.id}
      WHERE id = ${fanProgramId}
    `);

    // Record tier progression history
    await db.execute(sql`
      INSERT INTO tier_progression_history 
        (fan_program_id, from_tier_id, to_tier_id, progression_type, trigger_reason, points_at_change)
      VALUES 
        (${fanProgramId}, ${currentTierId || null}, ${newTier.id}, ${progressionType}, ${triggerReason}, ${currentPoints})
    `);

    console.log(`[TierProgression] User ${progressionType}: ${currentTier?.name || 'None'} -> ${newTier.name}`);

    return {
      changed: true,
      previousTier: currentTier,
      newTier,
      progressionType,
    };
  }

  /**
   * Get current tier for a user in a program
   */
  async getCurrentTier(fanProgramId: string): Promise<TierConfig | null> {
    const result = await db.execute(sql`
      SELECT 
        lpt.id, 
        lpt.program_id, 
        lpt.name, 
        lpt.min_points, 
        lpt.max_points, 
        lpt.tier_order, 
        lpt.benefits,
        lpt.badge_image_url
      FROM fan_programs fp
      INNER JOIN loyalty_program_tiers lpt ON fp.current_tier_id = lpt.id
      WHERE fp.id = ${fanProgramId}
    `);

    const row = (result as any).rows?.[0];
    if (!row) return null;

    return {
      id: row.id,
      programId: row.program_id,
      name: row.name,
      minPoints: row.min_points,
      maxPoints: row.max_points,
      tierOrder: row.tier_order,
      benefits: row.benefits || [],
      badgeImageUrl: row.badge_image_url,
    };
  }

  /**
   * Get tier progression history for a user
   */
  async getTierHistory(fanProgramId: string, limit: number = 10): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT 
        tph.id,
        tph.progression_type,
        tph.trigger_reason,
        tph.points_at_change,
        tph.changed_at,
        from_tier.name as from_tier_name,
        to_tier.name as to_tier_name
      FROM tier_progression_history tph
      LEFT JOIN loyalty_program_tiers from_tier ON tph.from_tier_id = from_tier.id
      LEFT JOIN loyalty_program_tiers to_tier ON tph.to_tier_id = to_tier.id
      WHERE tph.fan_program_id = ${fanProgramId}
      ORDER BY tph.changed_at DESC
      LIMIT ${limit}
    `);

    return (result as any).rows || [];
  }

  /**
   * Get next tier and points needed
   */
  async getNextTier(fanProgramId: string): Promise<{
    nextTier: TierConfig | null;
    pointsNeeded: number;
    currentPoints: number;
  }> {
    const [fanProgram] = await db.execute(sql`
      SELECT 
        fp.program_id,
        fp.points_balance,
        fp.lifetime_points,
        fp.current_tier_id
      FROM fan_programs fp
      WHERE fp.id = ${fanProgramId}
    `);

    if (!(fanProgram as any).rows?.[0]) {
      return { nextTier: null, pointsNeeded: 0, currentPoints: 0 };
    }

    const program = (fanProgram as any).rows[0];
    const currentPoints = program.lifetime_points || program.points_balance || 0;

    // Get all tiers ordered by min_points
    const tiersResult = await db.execute(sql`
      SELECT 
        id, program_id, name, min_points, max_points, tier_order, benefits, badge_image_url
      FROM loyalty_program_tiers
      WHERE program_id = ${program.program_id}
        AND is_active = TRUE
        AND min_points > ${currentPoints}
      ORDER BY min_points ASC
      LIMIT 1
    `);

    const nextTierRow = (tiersResult as any).rows?.[0];
    if (!nextTierRow) {
      return { nextTier: null, pointsNeeded: 0, currentPoints };
    }

    const nextTier: TierConfig = {
      id: nextTierRow.id,
      programId: nextTierRow.program_id,
      name: nextTierRow.name,
      minPoints: nextTierRow.min_points,
      maxPoints: nextTierRow.max_points,
      tierOrder: nextTierRow.tier_order,
      benefits: nextTierRow.benefits || [],
      badgeImageUrl: nextTierRow.badge_image_url,
    };

    return {
      nextTier,
      pointsNeeded: nextTier.minPoints - currentPoints,
      currentPoints,
    };
  }

  /**
   * Check if user has a specific benefit at their current tier
   */
  async hasTierBenefit(
    fanProgramId: string, 
    benefitType: TierBenefit['type']
  ): Promise<boolean> {
    const currentTier = await this.getCurrentTier(fanProgramId);
    if (!currentTier) return false;

    return currentTier.benefits.some(b => b.type === benefitType);
  }

  /**
   * Get all benefits for user's current tier
   */
  async getTierBenefits(fanProgramId: string): Promise<TierBenefit[]> {
    const currentTier = await this.getCurrentTier(fanProgramId);
    return currentTier?.benefits || [];
  }

  /**
   * Create default tiers for a loyalty program
   */
  async createDefaultTiers(programId: string): Promise<TierConfig[]> {
    const defaultTiers = [
      {
        name: 'Bronze',
        minPoints: 0,
        maxPoints: 999,
        tierOrder: 1,
        benefits: [
          { type: 'custom' as const, name: 'Welcome Reward', description: 'A special welcome gift for joining' }
        ],
      },
      {
        name: 'Silver',
        minPoints: 1000,
        maxPoints: 4999,
        tierOrder: 2,
        benefits: [
          { type: 'bonus_points' as const, name: 'Points Bonus', description: '10% bonus points on all tasks', value: 10 },
          { type: 'early_access' as const, name: 'Early Access', description: 'Early access to new content' }
        ],
      },
      {
        name: 'Gold',
        minPoints: 5000,
        maxPoints: 14999,
        tierOrder: 3,
        benefits: [
          { type: 'bonus_points' as const, name: 'Points Bonus', description: '25% bonus points on all tasks', value: 25 },
          { type: 'early_access' as const, name: 'Priority Access', description: 'Priority access to events and content' },
          { type: 'exclusive_content' as const, name: 'Exclusive Content', description: 'Access to Gold-tier exclusive content' }
        ],
      },
      {
        name: 'Platinum',
        minPoints: 15000,
        maxPoints: null,
        tierOrder: 4,
        benefits: [
          { type: 'bonus_points' as const, name: 'Points Bonus', description: '50% bonus points on all tasks', value: 50 },
          { type: 'early_access' as const, name: 'VIP Access', description: 'VIP access to all events and content' },
          { type: 'exclusive_content' as const, name: 'Premium Content', description: 'Access to all exclusive content' },
          { type: 'custom' as const, name: 'Personal Perks', description: 'Special personalized perks and recognition' }
        ],
      },
    ];

    const createdTiers: TierConfig[] = [];

    for (const tier of defaultTiers) {
      const result = await db.execute(sql`
        INSERT INTO loyalty_program_tiers 
          (program_id, name, min_points, max_points, tier_order, benefits)
        VALUES 
          (${programId}, ${tier.name}, ${tier.minPoints}, ${tier.maxPoints}, ${tier.tierOrder}, ${JSON.stringify(tier.benefits)})
        RETURNING id, program_id, name, min_points, max_points, tier_order, benefits, badge_image_url
      `);

      const row = (result as any).rows?.[0];
      if (row) {
        createdTiers.push({
          id: row.id,
          programId: row.program_id,
          name: row.name,
          minPoints: row.min_points,
          maxPoints: row.max_points,
          tierOrder: row.tier_order,
          benefits: row.benefits || [],
          badgeImageUrl: row.badge_image_url,
        });
      }
    }

    console.log(`[TierProgression] Created ${createdTiers.length} default tiers for program ${programId}`);
    return createdTiers;
  }
}

export const tierProgressionService = new TierProgressionService();
