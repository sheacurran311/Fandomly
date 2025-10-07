// TikTok integration debugging utilities

export interface TikTokConfig {
  clientKey: string;
  redirectUri: string;
  environment: 'sandbox' | 'production';
}

/**
 * Validate TikTok configuration and provide debugging information
 */
export function validateTikTokConfig(): {
  isValid: boolean;
  issues: string[];
  config: Partial<TikTokConfig>;
} {
  const issues: string[] = [];
  const config: Partial<TikTokConfig> = {};

  // Check client key
  const clientKey = import.meta.env.VITE_TIKTOK_CLIENT_KEY;
  if (!clientKey) {
    issues.push('VITE_TIKTOK_CLIENT_KEY environment variable is not set');
  } else if (clientKey.length < 10) {
    issues.push('VITE_TIKTOK_CLIENT_KEY appears to be invalid (too short)');
  } else {
    config.clientKey = clientKey;
  }

  // Check redirect URI
  const origin = window.location.origin;
  const redirectUri = `${origin}/tiktok-callback`;
  config.redirectUri = redirectUri;

  // Validate redirect URI format
  try {
    new URL(redirectUri);
  } catch {
    issues.push('Invalid redirect URI format');
  }

  // Check if running in development vs production
  const isDev = import.meta.env.DEV;
  config.environment = isDev ? 'sandbox' : 'production';

  // Sandbox-specific checks
  if (isDev && !redirectUri.includes('localhost') && !redirectUri.includes('replit.dev')) {
    issues.push('Development environment detected but redirect URI is not localhost or replit.dev');
  }

  return {
    isValid: issues.length === 0,
    issues,
    config
  };
}

/**
 * Log TikTok configuration for debugging
 */
export function debugTikTokConfig(): void {
  const validation = validateTikTokConfig();
  
  console.group('🎵 TikTok Configuration Debug');
  console.log('Configuration:', validation.config);
  console.log('Is Valid:', validation.isValid);
  
  if (validation.issues.length > 0) {
    console.warn('Issues found:');
    validation.issues.forEach((issue, index) => {
      console.warn(`  ${index + 1}. ${issue}`);
    });
  }
  
  console.log('Environment Variables:');
  console.log('  VITE_TIKTOK_CLIENT_KEY:', import.meta.env.VITE_TIKTOK_CLIENT_KEY ? '✓ Set' : '✗ Missing');
  
  console.groupEnd();
}

/**
 * Parse TikTok OAuth error from URL parameters
 */
export function parseTikTokOAuthError(searchParams: URLSearchParams): {
  hasError: boolean;
  error?: string;
  errorDescription?: string;
  errorUri?: string;
} {
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const errorUri = searchParams.get('error_uri');

  return {
    hasError: !!error,
    error: error || undefined,
    errorDescription: errorDescription || undefined,
    errorUri: errorUri || undefined
  };
}

/**
 * Common TikTok OAuth error codes and their meanings
 */
export const TIKTOK_ERROR_CODES = {
  'invalid_request': 'The request is missing a required parameter or is otherwise malformed.',
  'unauthorized_client': 'The client is not authorized to request an authorization code.',
  'access_denied': 'The user denied the authorization request.',
  'unsupported_response_type': 'The response type is not supported.',
  'invalid_scope': 'The requested scope is invalid or unknown.',
  'server_error': 'The authorization server encountered an unexpected condition.',
  'temporarily_unavailable': 'The authorization server is temporarily unavailable.',
  'invalid_client': 'Client authentication failed.',
  'invalid_grant': 'The authorization grant is invalid or expired.',
  'unsupported_grant_type': 'The grant type is not supported.',
} as const;

/**
 * Get human-readable error message for TikTok error code
 */
export function getTikTokErrorMessage(errorCode: string): string {
  return TIKTOK_ERROR_CODES[errorCode as keyof typeof TIKTOK_ERROR_CODES] || 
         `Unknown error code: ${errorCode}`;
}
