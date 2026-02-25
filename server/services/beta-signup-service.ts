/**
 * Beta Signup Points Service
 * Handles attribution of welcome points for beta signups
 */

import { db } from "../db";
import { betaSignups, platformPointsTransactions } from "@shared/schema";
import { eq, and } from "drizzle-orm";

const BETA_WELCOME_POINTS = 1000;

/**
 * Check if user is eligible for beta welcome points and credit them
 * @param userId - The user's ID
 * @param email - The user's email
 * @returns True if points were credited, false otherwise
 */
export async function claimBetaWelcomePoints(
  userId: string,
  email: string | null
): Promise<{ claimed: boolean; points: number }> {
  if (!email) {
    return { claimed: false, points: 0 };
  }

  try {
    // Check if email exists in beta signups and hasn't been claimed
    const betaSignup = await db.query.betaSignups.findFirst({
      where: and(
        eq(betaSignups.email, email.toLowerCase()),
        eq(betaSignups.claimed, false)
      ),
    });

    if (!betaSignup) {
      // Not a beta signup or already claimed
      return { claimed: false, points: 0 };
    }

    console.log(`[Beta Signup] Found unclaimed beta signup for ${email}, crediting ${BETA_WELCOME_POINTS} points to user ${userId}`);

    // Credit platform points (not tied to any specific program)
    await db.insert(platformPointsTransactions).values({
      userId,
      points: BETA_WELCOME_POINTS,
      type: "earned",
      source: "beta_welcome",
      description: `Welcome to Fandomly! Beta signup bonus`,
      metadata: {
        betaSignupId: betaSignup.id,
        signupDate: betaSignup.createdAt?.toISOString(),
      },
    } as any);

    // Mark the beta signup as claimed
    await db
      .update(betaSignups)
      .set({
        claimed: true,
        claimedAt: new Date(),
        claimedByUserId: userId,
      })
      .where(eq(betaSignups.id, betaSignup.id));

    console.log(`[Beta Signup] ✓ Credited ${BETA_WELCOME_POINTS} points to user ${userId}`);

    return { claimed: true, points: BETA_WELCOME_POINTS };
  } catch (error) {
    console.error("[Beta Signup] Error crediting welcome points:", error);
    // Don't throw - this shouldn't block user registration
    return { claimed: false, points: 0 };
  }
}
