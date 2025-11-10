/**
 * Storage Layer Validation Helpers
 *
 * This file provides helper functions for validating JSONB data before
 * saving to the database. It uses the Zod schemas defined in shared/jsonbSchemas.ts
 *
 * Usage:
 * - Import the helper functions in your storage.ts or routes files
 * - Call validateJsonbField() before db.insert() or db.update()
 * - Catch ZodErrors and return appropriate error responses
 */

import { z, ZodError } from 'zod';
import * as schemas from '../shared/jsonbSchemas';

// ============================================================================
// VALIDATION RESULT TYPE
// ============================================================================

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: Array<{ path: string; message: string }> };

// ============================================================================
// CORE VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate JSONB data against a schema
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validated and typed data
 * @throws ZodError if validation fails
 */
export function validateJsonbField<T>(
  schema: z.ZodType<T>,
  data: unknown
): T {
  return schema.parse(data);
}

/**
 * Safely validate JSONB data, returning a result object instead of throwing
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns ValidationResult with success/failure and data/errors
 */
export function safeValidateJsonbField<T>(
  schema: z.ZodType<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return {
      success: false,
      errors: result.error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
      })),
    };
  }
}

/**
 * Format Zod errors for API responses
 * @param error - ZodError to format
 * @returns User-friendly error message
 */
export function formatValidationError(error: ZodError): string {
  return error.errors
    .map(err => `${err.path.join('.')}: ${err.message}`)
    .join(', ');
}

// ============================================================================
// SPECIFIC FIELD VALIDATORS
// ============================================================================

/**
 * Validate user profile data
 */
export function validateUserProfileData(data: unknown) {
  return validateJsonbField(schemas.userProfileDataSchema, data);
}

/**
 * Validate tenant branding
 */
export function validateTenantBranding(data: unknown) {
  return validateJsonbField(schemas.tenantBrandingSchema, data);
}

/**
 * Validate creator brand colors
 */
export function validateBrandColors(data: unknown) {
  return validateJsonbField(schemas.brandColorsSchema, data);
}

/**
 * Validate social links
 */
export function validateSocialLinks(data: unknown) {
  return validateJsonbField(schemas.socialLinksSchema, data);
}

/**
 * Validate task custom settings
 */
export function validateTaskCustomSettings(data: unknown) {
  return validateJsonbField(schemas.taskCustomSettingsSchema, data);
}

/**
 * Validate campaign visibility rules
 */
export function validateCampaignVisibilityRules(data: unknown) {
  return validateJsonbField(schemas.campaignVisibilityRulesSchema, data);
}

/**
 * Validate loyalty program tiers
 */
export function validateLoyaltyProgramTiers(data: unknown) {
  return validateJsonbField(schemas.loyaltyProgramTiersSchema, data);
}

/**
 * Validate reward data
 */
export function validateRewardData(data: unknown) {
  return validateJsonbField(schemas.rewardDataSchema, data);
}

/**
 * Validate point transaction metadata
 */
export function validatePointTransactionMetadata(data: unknown) {
  return validateJsonbField(schemas.pointTransactionMetadataSchema, data);
}

/**
 * Validate notification metadata
 */
export function validateNotificationMetadata(data: unknown) {
  return validateJsonbField(schemas.notificationMetadataSchema, data);
}

// ============================================================================
// SAFE VALIDATORS (return ValidationResult)
// ============================================================================

export function safeValidateUserProfileData(data: unknown) {
  return safeValidateJsonbField(schemas.userProfileDataSchema, data);
}

export function safeValidateTenantBranding(data: unknown) {
  return safeValidateJsonbField(schemas.tenantBrandingSchema, data);
}

export function safeValidateBrandColors(data: unknown) {
  return safeValidateJsonbField(schemas.brandColorsSchema, data);
}

export function safeValidateSocialLinks(data: unknown) {
  return safeValidateJsonbField(schemas.socialLinksSchema, data);
}

export function safeValidateTaskCustomSettings(data: unknown) {
  return safeValidateJsonbField(schemas.taskCustomSettingsSchema, data);
}

// ============================================================================
// PARTIAL VALIDATION (for updates)
// ============================================================================

/**
 * Validate partial user profile data (for PATCH/PUT operations)
 * Allows updating only some fields without requiring all fields
 */
export function validatePartialUserProfileData(data: unknown) {
  return validateJsonbField(schemas.userProfileDataSchema.partial(), data);
}

/**
 * Validate partial tenant branding
 */
export function validatePartialTenantBranding(data: unknown) {
  return validateJsonbField(schemas.tenantBrandingSchema.partial(), data);
}

/**
 * Validate partial brand colors
 */
export function validatePartialBrandColors(data: unknown) {
  return validateJsonbField(schemas.brandColorsSchema.partial(), data);
}

// ============================================================================
// SANITIZATION HELPERS
// ============================================================================

/**
 * Sanitize hex color code (ensures # prefix and 6 digits)
 */
export function sanitizeHexColor(color: string): string {
  // Remove # if present
  const cleaned = color.replace('#', '');

  // Ensure 6 characters
  if (cleaned.length === 3) {
    // Expand shorthand (e.g., #abc -> #aabbcc)
    return `#${cleaned[0]}${cleaned[0]}${cleaned[1]}${cleaned[1]}${cleaned[2]}${cleaned[2]}`;
  }

  if (cleaned.length === 6) {
    return `#${cleaned}`;
  }

  throw new Error('Invalid hex color format');
}

/**
 * Sanitize phone number to E.164 format
 */
export function sanitizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Add + prefix if not present
  if (!phone.startsWith('+')) {
    return `+${digits}`;
  }

  return `+${digits}`;
}

/**
 * Sanitize URL (ensures protocol)
 */
export function sanitizeUrl(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
}

// ============================================================================
// MERGE HELPERS (for partial updates)
// ============================================================================

/**
 * Merge user profile data (combines existing + updates)
 */
export function mergeUserProfileData(
  existing: Record<string, any>,
  updates: Record<string, any>
): Record<string, any> {
  // Deep merge for nested objects like preferences, education
  return {
    ...existing,
    ...updates,
    preferences: {
      ...existing.preferences,
      ...updates.preferences,
    },
    education: updates.education
      ? {
          ...existing.education,
          ...updates.education,
        }
      : existing.education,
    interestSubcategories: updates.interestSubcategories
      ? {
          ...existing.interestSubcategories,
          ...updates.interestSubcategories,
        }
      : existing.interestSubcategories,
  };
}

/**
 * Merge social links (combines existing + updates)
 */
export function mergeSocialLinks(
  existing: Record<string, any>,
  updates: Record<string, any>
): Record<string, any> {
  return {
    ...existing,
    ...updates,
  };
}

// ============================================================================
// VALIDATION MIDDLEWARE (for Express routes)
// ============================================================================

import type { Request, Response, NextFunction } from 'express';

/**
 * Express middleware to validate JSONB field in request body
 * @param field - Field name in request body
 * @param schema - Zod schema to validate against
 */
export function validateJsonbMiddleware<T>(
  field: string,
  schema: z.ZodType<T>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const data = req.body[field];

    if (!data) {
      // Field not provided - skip validation
      return next();
    }

    const result = safeValidateJsonbField(schema, data);

    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        field,
        details: result.errors,
      });
    }

    // Replace with validated data
    req.body[field] = result.data;
    next();
  };
}

/**
 * Validate multiple JSONB fields in request body
 */
export function validateMultipleJsonbFields(
  validations: Array<{ field: string; schema: z.ZodType<any> }>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const { field, schema } of validations) {
      const data = req.body[field];

      if (!data) continue; // Skip if field not provided

      const result = safeValidateJsonbField(schema, data);

      if (!result.success) {
        return res.status(400).json({
          error: 'Validation failed',
          field,
          details: result.errors,
        });
      }

      // Replace with validated data
      req.body[field] = result.data;
    }

    next();
  };
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*
// Example 1: Validate in storage layer
import { validateUserProfileData } from './validation-helpers';

export async function updateUserProfile(userId: string, profileData: unknown) {
  try {
    // Validate before saving
    const validatedData = validateUserProfileData(profileData);

    // Save to database
    return await db.update(users)
      .set({ profileData: validatedData })
      .where(eq(users.id, userId));
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(`Invalid profile data: ${formatValidationError(error)}`);
    }
    throw error;
  }
}

// Example 2: Use middleware in route
import { validateJsonbMiddleware } from './validation-helpers';
import { userProfileDataSchema } from '../shared/jsonbSchemas';

app.put('/api/users/:id/profile',
  validateJsonbMiddleware('profileData', userProfileDataSchema),
  async (req, res) => {
    // profileData is now validated and typed
    const { profileData } = req.body;

    // Save to database
    await updateUserProfile(req.params.id, profileData);

    res.json({ success: true });
  }
);

// Example 3: Safe validation with custom error handling
import { safeValidateUserProfileData } from './validation-helpers';

export async function updateUserProfileSafe(userId: string, profileData: unknown) {
  const result = safeValidateUserProfileData(profileData);

  if (!result.success) {
    return {
      success: false,
      errors: result.errors,
    };
  }

  // Save validated data
  await db.update(users)
    .set({ profileData: result.data })
    .where(eq(users.id, userId));

  return { success: true };
}

// Example 4: Partial update with merge
import { mergeUserProfileData, validatePartialUserProfileData } from './validation-helpers';

export async function patchUserProfile(userId: string, updates: unknown) {
  // Get existing profile
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user[0]) throw new Error('User not found');

  // Validate partial updates
  const validatedUpdates = validatePartialUserProfileData(updates);

  // Merge with existing data
  const merged = mergeUserProfileData(user[0].profileData || {}, validatedUpdates);

  // Save merged data
  return await db.update(users)
    .set({ profileData: merged })
    .where(eq(users.id, userId));
}
*/

export default {
  // Validation functions
  validateJsonbField,
  safeValidateJsonbField,
  formatValidationError,

  // Specific validators
  validateUserProfileData,
  validateTenantBranding,
  validateBrandColors,
  validateSocialLinks,
  validateTaskCustomSettings,
  validateCampaignVisibilityRules,
  validateLoyaltyProgramTiers,
  validateRewardData,
  validatePointTransactionMetadata,
  validateNotificationMetadata,

  // Safe validators
  safeValidateUserProfileData,
  safeValidateTenantBranding,
  safeValidateBrandColors,
  safeValidateSocialLinks,
  safeValidateTaskCustomSettings,

  // Partial validators
  validatePartialUserProfileData,
  validatePartialTenantBranding,
  validatePartialBrandColors,

  // Sanitization
  sanitizeHexColor,
  sanitizePhoneNumber,
  sanitizeUrl,

  // Merge helpers
  mergeUserProfileData,
  mergeSocialLinks,

  // Middleware
  validateJsonbMiddleware,
  validateMultipleJsonbFields,
};
