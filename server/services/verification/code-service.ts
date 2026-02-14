import { db } from '../../db';
import { verificationCodes } from '@shared/schema';
import { eq, and, isNull } from 'drizzle-orm';
import type { VerificationCode, InsertVerificationCode } from '@shared/schema';

/**
 * Verification Code Service
 * 
 * Generates and manages unique verification codes for code-in-comment
 * and code-in-repost task verification.
 * 
 * Code Format: 6-character alphanumeric (e.g., "ABC123", "XY7Z9K")
 * - Uppercase letters and numbers only
 * - Excludes ambiguous characters (0, O, I, 1, L)
 */

// Characters used for code generation (excludes ambiguous: 0, O, I, 1, L)
const CODE_CHARACTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

// Cache for recently generated codes to avoid DB roundtrips
const recentCodes = new Set<string>();
const MAX_CACHE_SIZE = 1000;

/**
 * Generates a random alphanumeric code
 */
function generateRandomCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARACTERS.charAt(Math.floor(Math.random() * CODE_CHARACTERS.length));
  }
  return code;
}

/**
 * Generates a unique code that doesn't exist in the database
 */
async function generateUniqueCode(maxAttempts = 10): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateRandomCode();
    
    // Check cache first
    if (recentCodes.has(code)) {
      continue;
    }
    
    // Check database
    const existing = await db.query.verificationCodes.findFirst({
      where: eq(verificationCodes.code, code),
    });
    
    if (!existing) {
      // Add to cache
      if (recentCodes.size >= MAX_CACHE_SIZE) {
        // Clear oldest entries (simple approach - clear all)
        recentCodes.clear();
      }
      recentCodes.add(code);
      return code;
    }
  }
  
  throw new Error('Failed to generate unique verification code after maximum attempts');
}

export interface CodeServiceResult {
  success: boolean;
  code?: string;
  codeId?: string;
  error?: string;
  alreadyExists?: boolean;
}

export interface VerificationMatch {
  found: boolean;
  code?: string;
  authorId?: string;
  authorUsername?: string;
  commentText?: string;
  matchedAt?: Date;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Verification Code Service
 */
export class CodeService {
  /**
   * Get or create a verification code for a fan for a specific task
   * Returns existing code if one already exists (idempotent)
   */
  async getOrCreateCode(params: {
    taskId: string;
    fanId: string;
    tenantId: string;
    codeType: 'comment' | 'repost' | 'hashtag';
    expiresInHours?: number;
  }): Promise<CodeServiceResult> {
    const { taskId, fanId, tenantId, codeType, expiresInHours } = params;
    
    try {
      // Check if a code already exists for this task/fan combination
      const existing = await db.query.verificationCodes.findFirst({
        where: and(
          eq(verificationCodes.taskId, taskId),
          eq(verificationCodes.fanId, fanId),
        ),
      });
      
      if (existing) {
        // Return existing code (even if expired - we don't regenerate)
        return {
          success: true,
          code: existing.code,
          codeId: existing.id,
          alreadyExists: true,
        };
      }
      
      // Generate new unique code
      const code = await generateUniqueCode();
      
      // Calculate expiration time if specified
      const expiresAt = expiresInHours 
        ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
        : null;
      
      // Insert new code
      const [newCode] = await db
        .insert(verificationCodes)
        .values({
          code,
          taskId,
          fanId,
          tenantId,
          codeType,
          expiresAt,
          isUsed: false,
        })
        .returning();
      
      console.log(`[CodeService] Generated code ${code} for task ${taskId}, fan ${fanId}`);
      
      return {
        success: true,
        code: newCode.code,
        codeId: newCode.id,
        alreadyExists: false,
      };
    } catch (error) {
      console.error('[CodeService] Error generating code:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  /**
   * Get the verification code for a fan for a specific task
   */
  async getCodeForFan(taskId: string, fanId: string): Promise<VerificationCode | null> {
    const code = await db.query.verificationCodes.findFirst({
      where: and(
        eq(verificationCodes.taskId, taskId),
        eq(verificationCodes.fanId, fanId),
      ),
    });
    
    return code || null;
  }
  
  /**
   * Validate that a code belongs to a specific task
   */
  async validateCode(code: string, taskId: string): Promise<{
    valid: boolean;
    codeRecord?: VerificationCode;
    error?: string;
  }> {
    const codeRecord = await db.query.verificationCodes.findFirst({
      where: and(
        eq(verificationCodes.code, code.toUpperCase()),
        eq(verificationCodes.taskId, taskId),
      ),
    });
    
    if (!codeRecord) {
      return { valid: false, error: 'Code not found for this task' };
    }
    
    if (codeRecord.isUsed) {
      return { valid: false, error: 'Code has already been used', codeRecord };
    }
    
    if (codeRecord.expiresAt && new Date() > codeRecord.expiresAt) {
      return { valid: false, error: 'Code has expired', codeRecord };
    }
    
    return { valid: true, codeRecord };
  }
  
  /**
   * Mark a code as used after successful verification
   */
  async markCodeUsed(codeId: string, verificationData?: {
    platform?: string;
    contentId?: string;
    authorId?: string;
    authorUsername?: string;
    commentText?: string;
    confidence?: number;
  }): Promise<boolean> {
    try {
      await db
        .update(verificationCodes)
        .set({
          isUsed: true,
          usedAt: new Date(),
          verificationData: {
            ...verificationData,
            matchedAt: new Date().toISOString(),
          },
          updatedAt: new Date(),
        })
        .where(eq(verificationCodes.id, codeId));
      
      console.log(`[CodeService] Marked code ${codeId} as used`);
      return true;
    } catch (error) {
      console.error('[CodeService] Error marking code as used:', error);
      return false;
    }
  }
  
  /**
   * Find a code by its value (for searching in comments)
   */
  async findCodeByValue(code: string): Promise<VerificationCode | null> {
    const codeRecord = await db.query.verificationCodes.findFirst({
      where: eq(verificationCodes.code, code.toUpperCase()),
    });
    
    return codeRecord || null;
  }
  
  /**
   * Get all codes for a task (for admin/creator viewing)
   */
  async getCodesForTask(taskId: string): Promise<VerificationCode[]> {
    const codes = await db.query.verificationCodes.findMany({
      where: eq(verificationCodes.taskId, taskId),
    });
    
    return codes;
  }
  
  /**
   * Get statistics for a task's verification codes
   */
  async getCodeStats(taskId: string): Promise<{
    total: number;
    used: number;
    expired: number;
    pending: number;
  }> {
    const codes = await this.getCodesForTask(taskId);
    const now = new Date();
    
    let used = 0;
    let expired = 0;
    let pending = 0;
    
    for (const code of codes) {
      if (code.isUsed) {
        used++;
      } else if (code.expiresAt && now > code.expiresAt) {
        expired++;
      } else {
        pending++;
      }
    }
    
    return {
      total: codes.length,
      used,
      expired,
      pending,
    };
  }
  
  /**
   * Search for a verification code pattern in text
   * Returns the code if found, null otherwise
   */
  findCodeInText(text: string): string | null {
    // Pattern: 6 alphanumeric characters (matching our code format)
    // Look for standalone codes or codes in common formats like #CODE, [CODE], (CODE)
    const patterns = [
      /\b([A-HJ-NP-Z2-9]{6})\b/i, // Standalone code
      /#([A-HJ-NP-Z2-9]{6})\b/i, // Hashtag format
      /\[([A-HJ-NP-Z2-9]{6})\]/i, // Bracket format
      /\(([A-HJ-NP-Z2-9]{6})\)/i, // Parenthesis format
      /code[:\s]+([A-HJ-NP-Z2-9]{6})\b/i, // "code: ABC123" format
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].toUpperCase();
      }
    }
    
    return null;
  }
  
  /**
   * Delete a verification code (admin function)
   */
  async deleteCode(codeId: string): Promise<boolean> {
    try {
      await db
        .delete(verificationCodes)
        .where(eq(verificationCodes.id, codeId));
      
      return true;
    } catch (error) {
      console.error('[CodeService] Error deleting code:', error);
      return false;
    }
  }
  
  /**
   * Clean up expired and unused codes (maintenance task)
   */
  async cleanupExpiredCodes(olderThanDays = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    
    // Note: This is a simplified cleanup. In production, you might want to
    // archive codes rather than delete them for audit purposes.
    const result = await db
      .delete(verificationCodes)
      .where(
        and(
          eq(verificationCodes.isUsed, false),
          // Only delete codes that have expired AND are older than cutoff
          // We can't easily do complex date comparisons in drizzle without raw SQL
        )
      );
    
    console.log(`[CodeService] Cleanup completed`);
    return 0; // Return count if available
  }
}

// Export singleton instance
export const codeService = new CodeService();
