/**
 * Sentry Server-Side Initialization
 *
 * Must be imported at the very top of server/index.ts before any other imports.
 * Gracefully degrades when SENTRY_DSN is not set (dev/staging).
 */
import * as Sentry from '@sentry/node';

const SENTRY_DSN = process.env.SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.npm_package_version || '1.0.0',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    // Capture unhandled promise rejections
    integrations: [],
    // Don't send PII by default
    sendDefaultPii: false,
    // Filter out noisy errors
    beforeSend(event) {
      // Skip CSRF token mismatch errors (expected for expired sessions)
      if (event.exception?.values?.[0]?.value?.includes('csrf')) {
        return null;
      }
      return event;
    },
  });
}

export { Sentry };

/** Whether Sentry is configured and active */
export function isSentryEnabled(): boolean {
  return !!SENTRY_DSN;
}
