/**
 * Beta Signup Routes
 * 
 * Handles email capture for the beta program waitlist.
 * Public endpoint - no authentication required.
 */

import type { Express, Request, Response } from "express";
import { db } from "../db";
import { betaSignups } from "@shared/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

// Validation schema for beta signup
const betaSignupSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  userType: z.enum(["creator", "fan", "brand", "unknown"]).optional().default("unknown"),
  source: z.string().optional().default("landing_page"),
  metadata: z.object({
    referrer: z.string().optional(),
    utmSource: z.string().optional(),
    utmMedium: z.string().optional(),
    utmCampaign: z.string().optional(),
  }).optional(),
});

export function registerBetaSignupRoutes(app: Express) {
  /**
   * POST /api/beta-signup
   * Register a new email for the beta waitlist
   */
  app.post("/api/beta-signup", async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validationResult = betaSignupSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: validationResult.error.errors[0]?.message || "Invalid input",
        });
      }

      const { email, userType, source, metadata } = validationResult.data;

      // Check if email already exists
      const existingSignup = await db
        .select()
        .from(betaSignups)
        .where(eq(betaSignups.email, email.toLowerCase()))
        .limit(1);

      if (existingSignup.length > 0) {
        return res.status(200).json({
          success: true,
          message: "You're already on the list! We'll be in touch soon.",
          alreadyRegistered: true,
        });
      }

      // Insert new signup
      const [newSignup] = await db
        .insert(betaSignups)
        .values({
          email: email.toLowerCase(),
          userType,
          source,
          metadata,
        })
        .returning();

      return res.status(201).json({
        success: true,
        message: "Welcome to the beta! We'll notify you when access is available.",
        alreadyRegistered: false,
        id: newSignup.id,
      });

    } catch (error) {
      console.error("Beta signup error:", error);
      return res.status(500).json({
        success: false,
        error: "Something went wrong. Please try again.",
      });
    }
  });

  /**
   * GET /api/beta-signup/count
   * Get count of beta signups (for display purposes)
   */
  app.get("/api/beta-signup/count", async (_req: Request, res: Response) => {
    try {
      const result = await db.select().from(betaSignups);
      const count = result.length;

      return res.status(200).json({
        success: true,
        count,
      });
    } catch (error) {
      console.error("Beta signup count error:", error);
      return res.status(500).json({
        success: false,
        error: "Could not fetch count",
      });
    }
  });
}
