import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { doubleCsrf } from 'csrf-csrf';
import { registerRoutes } from './routes';
import { setupVite, serveStatic, log } from './vite';
import { syncScheduler } from './services/analytics/sync/sync-scheduler';
import { groupGoalPoller } from './services/verification/group-goals/group-goal-poller';
import { pointExpirationJob } from './jobs/point-expiration-job';
import { reputationSyncJob } from './jobs/reputation-sync-job';

const app = express();

// Security headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // Allow Facebook SDK, Google APIs, and other necessary external scripts
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'", // Required for Vite in dev
          'https://connect.facebook.net',
          'https://apis.google.com',
          'https://accounts.google.com',
          'https://www.googletagmanager.com',
          'https://replit.com', // For Replit dev banner
        ],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://accounts.google.com', 'https://fonts.googleapis.com'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
        connectSrc: ["'self'", 'https:', 'wss:'],
        frameSrc: ["'self'", 'https://www.facebook.com', 'https://accounts.google.com'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false, // May interfere with some embeds
    crossOriginOpenerPolicy: false, // Required for OAuth popup flows -- popups need window.opener access
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow cross-origin resources
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// CSRF Protection
const isProduction = process.env.NODE_ENV === 'production';
const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () =>
    process.env.CSRF_SECRET ||
    process.env.TOKEN_ENCRYPTION_KEY ||
    'csrf-secret-change-in-production',
  // getSessionIdentifier is required in v4 - use a constant for stateless CSRF
  // The security comes from the httpOnly cookie + token comparison, not session binding
  getSessionIdentifier: () => 'stateless',
  // __Host- prefix requires secure:true which only works on HTTPS
  // Use different cookie name for dev vs prod
  cookieName: isProduction ? '__Host-csrf' : 'csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: isProduction ? 'strict' : 'lax',
    secure: isProduction,
    path: '/',
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getTokenFromRequest: (req) => req.headers['x-csrf-token'] as string,
});

// Expose CSRF token endpoint for frontend
app.get('/api/csrf-token', (req, res) => {
  const token = generateCsrfToken(req, res);
  res.json({ csrfToken: token });
});

// Apply CSRF protection to all state-changing routes
// Exclude webhook endpoints that receive external calls
app.use((req, res, next) => {
  // Skip CSRF for webhooks (they use signature verification instead)
  if (req.path.startsWith('/api/webhooks/') || req.path.startsWith('/api/stripe/webhook')) {
    return next();
  }
  // Skip CSRF for auth callback routes (OAuth redirects)
  if (req.path.includes('/callback') || req.path.includes('/oauth')) {
    return next();
  }
  // Skip CSRF for social token exchange and connection routes
  // These are protected by JWT authentication and run in popup windows
  // where CSRF cookies from the main window are not available
  if (req.path.startsWith('/api/social/') || req.path.startsWith('/api/social-connections')) {
    return next();
  }
  // Skip CSRF for auth routes that handle social login/linking
  // These are protected by their own mechanisms (OAuth tokens, pending link IDs with expiration)
  if (req.path.startsWith('/api/auth/')) {
    return next();
  }
  // Skip CSRF for stateless utility endpoints that don't modify server state
  if (req.path === '/api/twitter/extract-tweet-id') {
    return next();
  }
  // Skip CSRF for public beta signup (landing page form has no auth/CSRF token)
  if (req.path === '/api/beta-signup') {
    return next();
  }
  doubleCsrfProtection(req, res, next);
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on('finish', () => {
    const duration = Date.now() - start;
    if (path.startsWith('/api')) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + '…';
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Use standardized error handling middleware
  const { errorHandler } = await import('./utils/error-factory');
  app.use(errorHandler);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get('env') === 'development') {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen(
    {
      port,
      host: '0.0.0.0',
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);

      // Start background services after server is listening
      try {
        syncScheduler.start();
        log('Analytics sync scheduler started');
      } catch (err) {
        console.error('Failed to start sync scheduler:', err);
      }

      try {
        groupGoalPoller.start();
        log('Group goal poller started');
      } catch (err) {
        console.error('Failed to start group goal poller:', err);
      }

      try {
        pointExpirationJob.start();
        log('Point expiration job started');
      } catch (err) {
        console.error('Failed to start point expiration job:', err);
      }

      try {
        reputationSyncJob.start();
        log('Reputation sync job started (hourly)');
      } catch (err) {
        console.error('Failed to start reputation sync job:', err);
      }
    }
  );
})();
