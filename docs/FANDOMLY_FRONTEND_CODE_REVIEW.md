# Fandomly Frontend Code Review

## Overview

**Codebase:** `/Fandomly/client/src/`
**Files analyzed:** 143 `.tsx`/`.ts` files across pages, components, hooks, contexts, lib, and config
**Stack:** React 18, TypeScript 5.6, Wouter routing, TanStack Query, shadcn/ui (50+ components), Tailwind CSS, Framer Motion

---

Found 22 urgent issues need to be fixed:

## 1 Memory leak in use-toast.ts listener re-registration
FilePath: client/src/hooks/use-toast.ts line 182

The `[state]` dependency in the useEffect causes the message listener to be re-registered on every state change, creating a memory leak. Each state update triggers a new `addListener` call without properly cleaning up the previous one.

```tsx
useEffect(() => {
  listeners.push(setState); // Re-registers on every state change
  return () => {
    const index = listeners.indexOf(setState);
    if (index > -1) listeners.splice(index, 1);
  };
}, [state]); // BUG: should be []
```


### Suggested fix
Change the dependency array from `[state]` to `[]` so the listener is registered once on mount and cleaned up once on unmount.

---

## 2 Missing useEffect dependency in use-tenant-branding.tsx
FilePath: client/src/hooks/use-tenant-branding.tsx line 190

The useEffect references variables in its body that are not included in the dependency array. This causes stale closures where the effect reads outdated values.


### Suggested fix
Add the missing variables to the useEffect dependency array, or refactor to use useCallback for the effect body.

---

## 3 Missing useEffect dependency in use-twitter-connection.ts
FilePath: client/src/hooks/use-twitter-connection.ts line 246

Same pattern -- references external variables not in the dependency array.


### Suggested fix
Audit and add all referenced variables to the dependency array.

---

## 4 Missing useEffect dependency in use-social-connection.ts
FilePath: client/src/hooks/use-social-connection.ts line 310

Same stale closure pattern.


### Suggested fix
Add missing dependencies to the useEffect dependency array.

---

## 5 Missing useEffect dependency in use-instagram-connection.ts
FilePath: client/src/hooks/use-instagram-connection.ts line 262

Same stale closure pattern.


### Suggested fix
Add missing dependencies to the useEffect dependency array.

---

## 6 Memory leak -- URL.revokeObjectURL not called in use-file-upload.ts
FilePath: client/src/hooks/use-file-upload.ts lines 81-93

Object URLs created with `URL.createObjectURL()` are never revoked, causing a memory leak. Each file upload creates a blob URL that persists until page unload.


### Suggested fix
Store created object URLs and call `URL.revokeObjectURL()` in a cleanup function (useEffect return) or when the preview is no longer needed.

---

## 7 fetchCurrentUser not memoized in auth-context.tsx -- potential infinite loop
FilePath: client/src/contexts/auth-context.tsx line 242

The `fetchCurrentUser` function is defined inline without useCallback. If passed as a dependency to useEffect or used in a dependency array, it creates a new reference on every render, potentially triggering infinite re-render loops.


### Suggested fix
Wrap `fetchCurrentUser` in `useCallback` with proper dependencies.

---

## 8 program-builder.tsx is 3,682 lines -- needs immediate decomposition
FilePath: client/src/pages/creator-dashboard/program-builder.tsx

At 3,682 lines, this is 12x over a reasonable component size limit. It contains theme selection, customization, preview, multi-step wizard logic, and form handling all in one file. This makes it extremely difficult to maintain, test, or review.


### Suggested fix
Split into at least 5-6 focused components: `ThemeSelector`, `CustomizationPanel`, `MobilePreview`, `WizardStepManager`, `ProgramForm`, and `ProgramBuilderPage` as the orchestrator.

---

## 9 195-line useEffect in creator-dashboard.tsx
FilePath: client/src/pages/creator-dashboard.tsx lines 149-343

A single useEffect spanning 195 lines handles OAuth callback processing for multiple platforms. This is unmaintainable and untestable.


### Suggested fix
Extract OAuth callback handling into a custom hook (`useOAuthCallback`) and split per-platform logic into separate handler functions.

---

## 10 Sequential API calls should use Promise.all in use-fan-dashboard.ts
FilePath: client/src/hooks/use-fan-dashboard.ts lines 67-136

Multiple independent API calls are made sequentially with `await` when they could run in parallel. This unnecessarily increases page load time.

```tsx
const pointsRes = await fetch('/api/points');
const tasksRes = await fetch('/api/tasks');
const achievementsRes = await fetch('/api/achievements');
// These are independent and should be parallel
```


### Suggested fix
Use `Promise.all()` to fetch independent data concurrently:
```tsx
const [pointsRes, tasksRes, achievementsRes] = await Promise.all([
  fetch('/api/points'),
  fetch('/api/tasks'),
  fetch('/api/achievements')
]);
```

---

## 11 Sequential API calls should use Promise.all in use-creator-dashboard.ts
FilePath: client/src/hooks/use-creator-dashboard.ts lines 78-130

Same pattern as above -- sequential independent API calls.


### Suggested fix
Use `Promise.all()` for concurrent fetching.

---

## 12 Sequential API calls should use Promise.all in use-points.ts
FilePath: client/src/hooks/use-points.ts lines 74-175

Same sequential API call pattern.


### Suggested fix
Use `Promise.all()` for concurrent fetching.

---

## 13 Inline style objects cause re-renders in program-builder.tsx
FilePath: client/src/pages/creator-dashboard/program-builder.tsx lines 1960-2008, 2308-2350, 3104-3268

Over 50 inline style objects (`style={{ backgroundColor: ... }}`) in the mobile preview and theme sections create new object references on every render, triggering unnecessary child re-renders.


### Suggested fix
Extract style objects into `useMemo` hooks:
```tsx
const containerStyle = useMemo(() => ({
  backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
}), [theme.mode]);
```

---

## 14 Inline style objects cause re-renders in program-public.tsx
FilePath: client/src/pages/program-public.tsx lines 367-617, 944

30+ inline style objects for theme colors create new references on every render.


### Suggested fix
Extract to useMemo or use CSS custom properties (CSS variables) set via a single style attribute on a parent element.

---

## 15 Missing useMemo on expensive filter/map/reduce computations
FilePath: client/src/pages/fan-dashboard.tsx lines 181-200, fan-dashboard/tasks.tsx lines 84-121, find-creators.tsx lines 61-98, marketplace.tsx lines 35-58

Complex `.filter()`, `.map()`, `.reduce()`, and `.sort()` chains recalculate on every render without memoization. This is wasteful for lists that could contain hundreds of items.


### Suggested fix
Wrap all data transformation chains in `useMemo`:
```tsx
const filteredTasks = useMemo(
  () => tasks.filter(task => /* ... */),
  [tasks, searchQuery, filterType]
);
```

---

## 16 Inconsistent cn() usage -- manual className concatenation
FilePath: Multiple files -- 30+ instances across pages, 15+ across feature components

Many components use template literals or ternaries for conditional class names instead of the `cn()` utility from `lib/utils.ts`.

```tsx
// Found pattern (wrong):
className={`text-sm ${isActive ? 'text-white' : 'text-gray-400'}`}

// Should use:
className={cn('text-sm', isActive ? 'text-white' : 'text-gray-400')}
```


### Suggested fix
Replace all manual className concatenation with `cn()` from `@/lib/utils`. This ensures proper Tailwind class merging and deduplication.

---

## 17 Inline prop objects without useMemo passed to children
FilePath: Multiple page components -- 20+ instances

Objects and arrays created inline in JSX props create new references every render, bypassing React.memo and causing unnecessary child re-renders.

```tsx
// Found pattern (wrong):
<BarChartCard
  dataKeys={[
    { key: 'count', color: '#8b5cf6', name: 'Tasks' }
  ]}
/>
```


### Suggested fix
Extract complex prop values to `useMemo`:
```tsx
const dataKeys = useMemo(() => [
  { key: 'count', color: '#8b5cf6', name: 'Tasks' }
], []);

<BarChartCard dataKeys={dataKeys} />
```

---

## 18 `fetchApi` returns `Promise<any>` -- should be generic
FilePath: client/src/lib/queryClient.ts line 131

The core API utility function returns `Promise<any>`, losing all type safety for every API call in the application.


### Suggested fix
Make it generic:
```tsx
export async function fetchApi<T>(
  url: string,
  options?: { ... }
): Promise<T> { ... }
```

---

## 19 `parseJWT` returns `any | null` -- untyped JWT payload
FilePath: client/src/lib/base64-utils.ts line 37

JWT payload is returned as `any`, losing type safety for all downstream consumers.


### Suggested fix
Define a `JWTPayload` interface and return `JWTPayload | null`.

---

## 20 Hardcoded Instagram App ID fallback
FilePath: client/src/lib/instagram.ts line 46

```tsx
const INSTAGRAM_CLIENT_ID = import.meta.env.VITE_INSTAGRAM_CREATOR_APP_ID || '1157911489578561';
```

Hardcoded fallback App ID should not exist in code. If the env var is missing, the app should fail explicitly rather than using a potentially stale/wrong App ID.


### Suggested fix
Remove the fallback. Throw an error or disable Instagram features if the env var is not set.

---

## 21 Missing skip-to-content navigation link
FilePath: client/src/App.tsx

No skip navigation link exists. Keyboard and screen reader users must tab through all navigation on every page.


### Suggested fix
Add at the very beginning of App component:
```tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-brand-primary focus:text-white focus:px-4 focus:py-2 focus:rounded-lg"
>
  Skip to main content
</a>
```
And wrap main content area with `<main id="main-content">`.

---

## 22 Icon-only buttons missing aria-labels
FilePath: client/src/components/layout/Navigation.tsx line 165, sidebar-navigation.tsx line 116, multiple modal close buttons

Several icon-only buttons have no accessible name, making them invisible to screen readers.

```tsx
// Found pattern:
<button className="md:hidden text-white" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
  {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
</button>
```


### Suggested fix
Add `aria-label` and `aria-expanded` attributes:
```tsx
<button
  className="md:hidden text-white"
  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
  aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
  aria-expanded={isMobileMenuOpen}
>
```

---

Found 18 suggestions for improvement:

## 1 TaskTemplateSelector.tsx is 1,515 lines
FilePath: client/src/components/tasks/TaskTemplateSelector.tsx

Oversized component should be split into smaller focused modules.


### Suggested fix
Split into `TemplateGrid`, `TemplateDetail`, `TemplateFilters`, and `TemplateSelector` components.

---

## 2 creator-profile-edit-modal.tsx is 799 lines
FilePath: client/src/components/creator/creator-profile-edit-modal.tsx

Large modal component handling many form sections.


### Suggested fix
Extract form sections into separate sub-components.

---

## 3 fan-profile-edit-modal.tsx is 817 lines
FilePath: client/src/components/fan/fan-profile-edit-modal.tsx

Same pattern as creator profile modal.


### Suggested fix
Extract form sections into separate sub-components.

---

## 4 creator-card.tsx has 4 card variants in one component (584 lines)
FilePath: client/src/components/creator/creator-card.tsx

Multiple card layout variants handled by conditionals in a single component.


### Suggested fix
Extract each variant into its own component (`CreatorCardCompact`, `CreatorCardFull`, etc.) with a shared base.

---

## 5 Multiple `any` types throughout hooks
FilePath: Multiple hooks -- use-fan-dashboard.ts, use-creator-dashboard.ts, and others

Using `any` for API response types eliminates TypeScript's safety benefits.


### Suggested fix
Define typed interfaces for all API responses and use them consistently.

---

## 6 Missing useCallback on event handlers passed to children
FilePath: Multiple components -- program-builder.tsx lines 662-754, fan-dashboard/tasks.tsx line 42, fan-dashboard/settings.tsx lines 99-110

Event handlers defined inline without `useCallback` create new function references on every render.


### Suggested fix
Wrap all handlers passed as props with `useCallback`.

---

## 7 0 components use React.memo
FilePath: Codebase-wide

No list/grid item components use React.memo, meaning every parent re-render triggers re-renders of all children.


### Suggested fix
Add React.memo to leaf components rendered in lists: `FanTaskCard`, `CreatorCard`, `NFTCard`, `DashboardCard`, chart components.

---

## 8 staleTime: Infinity prevents auto-refresh
FilePath: client/src/lib/queryClient.ts line 179

The global query client config sets `staleTime: Infinity`, meaning data never automatically refreshes. Combined with `refetchOnWindowFocus: false`, users see stale data until they manually trigger a refresh.


### Suggested fix
Set reasonable stale times per query or change the default to 5-10 minutes.

---

## 9 Duplicate icon libraries -- lucide-react AND react-icons
FilePath: package.json

Both `lucide-react` and `react-icons` are installed. This bloats the bundle with two icon sets.


### Suggested fix
Consolidate to `lucide-react` only (already used by shadcn/ui) and remove `react-icons`.

---

## 10 No image lazy loading across 41 files
FilePath: Codebase-wide (41 files use `<img>`)

No `<img>` elements use `loading="lazy"`, meaning all images load eagerly regardless of viewport position.


### Suggested fix
Add `loading="lazy"` to all images below the fold.

---

## 11 Color contrast issues -- text-gray-300/400 on dark backgrounds
FilePath: 182 files

Widespread use of `text-gray-300` and `text-gray-400` on dark backgrounds may fail WCAG AA contrast requirements (4.5:1 for normal text).


### Suggested fix
Audit all text/background combinations. Replace `text-gray-400` with `text-gray-300` and `text-gray-300` with `text-gray-200` where contrast is insufficient.

---

## 12 Clickable divs lack keyboard accessibility (54 files)
FilePath: Multiple files including creator-card.tsx lines 289-306, sidebar-navigation.tsx line 138

Interactive `<div>` elements with `onClick` and `cursor-pointer` lack `role="button"`, `tabIndex={0}`, and keyboard event handlers.


### Suggested fix
Add keyboard support:
```tsx
<div
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
  role="button"
  tabIndex={0}
>
```

---

## 13 Client-side data aggregation belongs on the backend
FilePath: client/src/hooks/use-creator-dashboard.ts (351 lines), use-fan-dashboard.ts (196 lines)

Complex data aggregation and transformation logic runs client-side by making multiple API calls in loops. This should be a single backend endpoint returning pre-aggregated data.


### Suggested fix
Create `/api/dashboard/creator-stats` and `/api/dashboard/fan-stats` backend endpoints that return pre-aggregated data.

---

## 14 Legacy Dynamic Labs code should be removed
FilePath: client/src/lib/queryClient.ts lines 23-53, 69-75

The Dynamic Labs SDK was removed from wallet operations but legacy `getDynamicUserId()` code remains, including window global lookups and localStorage fallbacks. A comment at line 82 says "getDynamicUserId removed" but the function still exists and is used.


### Suggested fix
Remove `getDynamicUserId()` and all related code. Remove Dynamic Labs packages from `package.json`.

---

## 15 Magic numbers throughout OAuth libraries
FilePath: client/src/lib/twitter.ts lines 88, 143, 222; social-integrations.ts line 308; tiktok-error-handler.ts line 89

Hardcoded numbers like `200`, `220`, `600`, `300000`, `30000` are used without named constants.


### Suggested fix
Extract to named constants: `AUTH_URL_DEBOUNCE_MS`, `OAUTH_TIMEOUT_MS`, `NOTIFICATION_COOLDOWN_MS`, etc.

---

## 16 Access tokens passed in URL parameters
FilePath: client/src/lib/instagram.ts line 169

```tsx
const response = await fetch(
  `https://graph.instagram.com/${INSTAGRAM_API_VERSION}/me?...&access_token=${accessToken}`
);
```

Tokens in URL parameters can leak via server logs, referrer headers, and browser history.


### Suggested fix
Use the `Authorization: Bearer` header instead of URL query parameters.

---

## 17 window.location.href used instead of router navigation
FilePath: client/src/pages/creator-dashboard.tsx lines 590, 682-713; App.tsx routes

Multiple components use `window.location.href = '/path'` for navigation, causing full page reloads instead of client-side routing.


### Suggested fix
Use Wouter's `useLocation` hook or `<Link>` component for SPA navigation.

---

## 18 250+ lines custom CSS in index.css instead of Tailwind config
FilePath: client/src/index.css

Custom utility classes and animations defined in raw CSS that should be Tailwind config extensions or Tailwind plugin definitions.


### Suggested fix
Move custom utilities into `tailwind.config.ts` extensions. Use `@apply` only where Tailwind utilities cannot achieve the styling.

---

## Statistics Summary

| Metric | Value |
|--------|-------|
| Total frontend files analyzed | 143 |
| Largest component | program-builder.tsx (3,682 lines) |
| Files >1,000 lines | 7 |
| Files >300 lines | 17 |
| Components using useMemo/useCallback | 15 |
| Components using React.memo | 0 |
| Inline style object occurrences | 80+ |
| Files with images (no lazy loading) | 41 |
| Manual className concatenation instances | 45+ |
| Missing useEffect dependencies | 4 hooks |
| Sequential API calls (should be parallel) | 3 hooks |

---

## Priority Matrix

### P0 -- Fix Immediately (Bugs/Memory Leaks)
1. Memory leak in `use-toast.ts` (wrong dependency)
2. Memory leak in `use-file-upload.ts` (URL not revoked)
3. Potential infinite loop in `auth-context.tsx`
4. Missing useEffect dependencies (4 hooks)

### P1 -- Fix Soon (Performance)
5. Sequential API calls -> Promise.all (3 hooks)
6. 80+ inline style objects -> useMemo
7. 20+ inline prop objects -> useMemo
8. Missing useMemo on filter/map/reduce chains
9. Split program-builder.tsx (3,682 lines)
10. Add React.memo to list/grid item components

### P2 -- Fix Before Production (Code Quality)
11. Replace manual className concatenation with cn()
12. Make fetchApi generic (remove `any` return)
13. Type all API responses (remove `any` types)
14. Remove legacy Dynamic Labs code
15. Consolidate to single icon library
16. Move access tokens from URL params to headers
17. Remove hardcoded App ID fallbacks

### P3 -- Improve UX (Accessibility)
18. Add skip-to-content link
19. Add aria-labels to icon-only buttons
20. Fix color contrast (text-gray-300/400)
21. Add keyboard support to clickable divs
22. Add image lazy loading
