/**
 * Startup environment variable validation.
 *
 * Logs warnings for missing optional variables and errors for
 * critical ones. Does NOT crash the process — lets the app start
 * in degraded mode so development and CI remain easy.
 */

interface EnvVar {
  name: string;
  required: boolean;
  description: string;
}

const ENV_VARS: EnvVar[] = [
  // Database (critical)
  { name: 'DATABASE_URL', required: true, description: 'PostgreSQL connection string' },

  // Auth (critical)
  { name: 'SESSION_SECRET', required: true, description: 'Express session secret' },

  // Stripe (optional — billing won't work without it)
  { name: 'STRIPE_SECRET_KEY', required: false, description: 'Stripe API secret key' },
  { name: 'STRIPE_WEBHOOK_SECRET', required: false, description: 'Stripe webhook signing secret' },

  // Email (optional — emails will be skipped)
  { name: 'RESEND_API_KEY', required: false, description: 'Resend email API key' },

  // IPFS / Pinata (optional — NFT uploads won't work)
  { name: 'PINATA_JWT', required: false, description: 'Pinata IPFS JWT' },

  // Sentry (optional — error tracking disabled)
  { name: 'SENTRY_DSN', required: false, description: 'Sentry error tracking DSN' },

  // App URL (optional — OG tags use fallback)
  { name: 'APP_URL', required: false, description: 'Public application URL for OG tags' },
];

export function checkEnvironment(): void {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const v of ENV_VARS) {
    if (!process.env[v.name]) {
      if (v.required) {
        missing.push(`  [MISSING] ${v.name} — ${v.description}`);
      } else {
        warnings.push(`  [WARN]    ${v.name} — ${v.description}`);
      }
    }
  }

  if (missing.length > 0 || warnings.length > 0) {
    console.log('[Env Check] Environment variable status:');
    for (const m of missing) console.error(m);
    for (const w of warnings) console.warn(w);
  }

  if (missing.length > 0) {
    console.error(
      `[Env Check] ${missing.length} required variable(s) missing. The app may not function correctly.`
    );
  }
}
