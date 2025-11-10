/**
 * Nonce generation utilities for task verification
 * 
 * Generates unique, short codes for Instagram comment verification
 */

/**
 * Generate a unique nonce code
 * Format: FDY-XXXX (e.g., FDY-8K27, FDY-N3P9)
 * 
 * Uses non-ambiguous characters only:
 * - No 0/O, 1/I/L to avoid confusion
 * - No lowercase to keep it simple
 */
export function generateNonce(): string {
  // Characters that are easy to distinguish
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const length = 4;
  let code = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    code += chars.charAt(randomIndex);
  }
  
  return `FDY-${code}`;
}

/**
 * Validate nonce format
 */
export function isValidNonce(nonce: string): boolean {
  return /^FDY-[A-Z0-9]{4}$/i.test(nonce);
}

/**
 * Extract nonce from text
 * Finds FDY-XXXX pattern in comment text
 */
export function extractNonceFromText(text: string): string | null {
  const match = text.match(/FDY-[A-Z0-9]{4}/i);
  return match ? match[0].toUpperCase() : null;
}

/**
 * Generate a short task code for display
 * Used in URLs or shortened references
 */
export function generateTaskCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const length = 6;
  let code = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    code += chars.charAt(randomIndex);
  }
  
  return code;
}

/**
 * Validate Instagram username format
 * @param username - Username without @ symbol
 */
export function isValidInstagramUsername(username: string): boolean {
  // Instagram usernames: 
  // - 1-30 characters
  // - Alphanumeric, periods, underscores only
  // - Cannot start/end with period
  return /^[A-Za-z0-9._]{1,30}$/.test(username) && 
         !username.startsWith('.') && 
         !username.endsWith('.');
}

/**
 * Normalize Instagram username
 * Removes @ symbol and converts to lowercase
 */
export function normalizeInstagramUsername(username: string): string {
  return username.replace(/^@/, '').toLowerCase().trim();
}

