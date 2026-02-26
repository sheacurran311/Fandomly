// Base64 utilities to handle encoding/decoding issues that can occur with social media APIs

/**
 * Safe base64 decode that handles malformed strings gracefully
 * This addresses the InvalidCharacterError that can occur with TikTok tokens
 */
export function safeAtob(str: string): string | null {
  try {
    // Clean the string first - remove any non-base64 characters
    const cleanStr = str.replace(/[^A-Za-z0-9+/=]/g, '');
    
    // Ensure proper padding
    const paddedStr = cleanStr + '='.repeat((4 - cleanStr.length % 4) % 4);
    
    return atob(paddedStr);
  } catch (error) {
    console.warn('Base64 decode failed:', error, 'Input:', str);
    return null;
  }
}

/**
 * Safe base64 encode
 */
export function safeBtoa(str: string): string | null {
  try {
    return btoa(str);
  } catch (error) {
    console.warn('Base64 encode failed:', error, 'Input:', str);
    return null;
  }
}

/**
 * Standard JWT payload fields
 */
export interface JWTPayload {
  sub?: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
  [key: string]: unknown;
}

/**
 * Parse JWT token safely without throwing errors
 */
export function parseJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const payload = safeAtob(parts[1]);
    if (!payload) {
      return null;
    }
    
    return JSON.parse(payload) as JWTPayload;
  } catch (error) {
    console.warn('JWT parse failed:', error, 'Token:', token);
    return null;
  }
}

/**
 * Extract base64 data from data URL safely
 */
export function extractBase64FromDataURL(dataURL: string): string | null {
  try {
    const parts = dataURL.split('base64,');
    if (parts.length !== 2) {
      return null;
    }
    return parts[1];
  } catch (error) {
    console.warn('Data URL extraction failed:', error, 'Input:', dataURL);
    return null;
  }
}
