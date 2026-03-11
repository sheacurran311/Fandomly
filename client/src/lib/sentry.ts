/**
 * Sentry Client-Side Initialization
 *
 * Imported in main.tsx to capture frontend errors, unhandled rejections,
 * and performance data. Gracefully degrades when VITE_SENTRY_DSN is not set.
 */
import * as Sentry from '@sentry/browser';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE || 'development',
    release: import.meta.env.VITE_APP_VERSION || '1.0.0',
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
    integrations: [Sentry.browserTracingIntegration()],
    // Don't send PII
    sendDefaultPii: false,
    // Filter noisy browser errors
    beforeSend(event) {
      const msg = event.exception?.values?.[0]?.value || '';
      // Skip Particle/EIP-1193 polyfill noise
      if (msg.includes('provider.on is not a function')) return null;
      // Skip ResizeObserver loop limit (browser quirk, harmless)
      if (msg.includes('ResizeObserver loop')) return null;
      // Skip browser extension noise
      if (msg.includes('extension')) return null;
      return event;
    },
    // Ignore common third-party script errors
    denyUrls: [/extensions\//i, /^chrome:\/\//i, /^moz-extension:\/\//i],
  });
}

export { Sentry };

/** Whether Sentry is configured and active */
export function isSentryEnabled(): boolean {
  return !!SENTRY_DSN;
}
