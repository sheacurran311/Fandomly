# Mobile-First Architecture Rule

## Context

The web app is being built first to ensure a smoother transition into a React Native mobile app. Most users will come from mobile. Every architectural decision should consider mobile compatibility.

## Rules

### Authentication
- Auth MUST use portable token-based flows (JWT). Never rely on cookie-only patterns for critical auth flows.
- Social OAuth flows MUST support deep-link callbacks, not just web redirect URLs.
- Token storage should work across platforms — avoid depending solely on `httpOnly` cookies for session persistence. The current JWT + refresh token system is good; keep access tokens in memory and refresh tokens portable.

### API Design
- All API responses MUST be JSON-only. No server-rendered HTML dependencies.
- API endpoints should be RESTful and stateless — no server-side session state.
- Pagination, filtering, and sorting should be handled via query parameters, not server-side rendering.

### Database & Schema
- Database schema MUST be backend-agnostic. No web-specific fields (e.g., no `sessionStorage` keys, no browser fingerprint columns).
- Use UUIDs for all primary keys (already done).
- JSONB fields for flexible nested data (already done with `pageConfig`, `profileData`, etc.).

### State Management
- All critical state MUST be API-driven, not dependent on browser APIs (`sessionStorage`, `localStorage`) for essential flows.
- `sessionStorage`/`localStorage` may be used for convenience (caching, UI preferences) but never as the source of truth for auth, navigation, or onboarding state.
- Use React Query / TanStack Query patterns that work identically in React Native.

### UI Patterns
- Prefer flexbox layouts that translate naturally to React Native.
- Avoid web-only CSS features that have no React Native equivalent (e.g., `position: fixed`, complex CSS Grid, `::before`/`::after` pseudo-elements) in core layout components.
- Touch targets should be minimum 44x44px (Apple HIG) / 48x48dp (Material Design).
- Design for bottom navigation on mobile (already implemented in navigation.tsx).

### File Uploads & Media
- Image upload flows should use multipart form data or presigned URLs — both work on mobile.
- Support responsive image sizes; don't rely on CSS-only image resizing for performance.

### Push Notifications
- Design notification preferences schema to support both email and push notifications (already done in `notificationPreferences`).
- When adding notification triggers, ensure they can target both web (browser push) and mobile (APNs/FCM).

### Deep Linking
- URL structure should support deep links: `/programs/:slug`, `/@:creatorUrl`, etc. (already done).
- All navigation should use path-based routing that maps to React Navigation screens.
