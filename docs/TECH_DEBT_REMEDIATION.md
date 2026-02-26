# Frontend Tech Debt Remediation Plan

> **Created**: February 15, 2026  
> **Source**: External frontend code audit (see `FANDOMLY_FRONTEND_CODE_REVIEW.md`)  
> **Status**: Partially addressed - remaining items documented below

---

## Overview

This document tracks remaining technical debt items that were identified during the frontend audit but deferred for later implementation. These items are categorized by priority and impact.

---

## Completed Items (For Reference)

The following high-priority items were addressed:

### P0 - Bugs/Memory Leaks (All Fixed)
- ✅ `use-toast.ts` memory leak (useEffect dependency fix)
- ✅ `use-file-upload.ts` URL.revokeObjectURL leak
- ✅ `auth-context.tsx` fetchCurrentUser memoization (verified)
- ✅ `use-tenant-branding.tsx` missing useEffect dependencies

### P1 - Performance (Partially Addressed)
- ✅ Sequential API calls → Promise.all (3 hooks)
- ✅ Inline style memoization in `program-public.tsx`
- ✅ useMemo for filter/map/reduce chains (4 pages)
- ✅ React.memo for list components (4 components)

### P2 - Code Quality (Partially Addressed)
- ✅ Generic typing for `fetchApi`
- ✅ `JWTPayload` interface for `parseJWT`
- ✅ Removed hardcoded Instagram App ID fallback
- ✅ QueryClient `staleTime` changed from Infinity to 5 minutes

### P3 - Accessibility (Partially Addressed)
- ✅ Skip-to-content link in `App.tsx`
- ✅ aria-labels on navigation mobile menu button

---

## Remaining Items

### HIGH PRIORITY - Address Soon

#### 1. Remove Legacy Dynamic Labs Code
**Files**: `client/src/lib/queryClient.ts` (lines 23-53, 69-75), social connection hooks  
**What**: Remove `getDynamicUserId()`, `window.__dynamicUserId`, and related localStorage lookups  
**Why**: Dead code that could confuse developers and potentially cause bugs  
**Effort**: Medium (requires careful tracing of usage)  
**Risk if ignored**: Developers may accidentally use defunct auth patterns

#### 2. Type All API Response `any` Types
**Files**: `use-fan-dashboard.ts`, `use-creator-dashboard.ts`, and other hooks  
**What**: Define TypeScript interfaces for API responses, replace `any` types  
**Why**: Loss of type safety means bugs slip through, IDE autocomplete doesn't work  
**Effort**: High (many files, need to understand API response shapes)  
**Risk if ignored**: Compounds over time as more untyped code is added

#### 3. Extract 195-line OAuth useEffect
**File**: `client/src/pages/creator-dashboard.tsx` (lines 149-344)  
**What**: Move OAuth callback handling into `use-instagram-oauth-callback.ts` hook  
**Why**: Makes critical auth code hard to understand and maintain  
**Effort**: Medium  
**Risk if ignored**: Bugs in auth flow harder to diagnose and fix

---

### MEDIUM PRIORITY - Address Eventually

#### 4. Decompose program-builder.tsx
**File**: `client/src/pages/creator-dashboard/program-builder.tsx` (2,126 lines)  
**What**: Extract into `ThemeSelector`, `CustomizationPanel`, `MobilePreview`, `WizardStepManager`, `ProgramForm`  
**Why**: Large file increases cognitive load and maintenance difficulty  
**Effort**: Medium-high  
**Risk if ignored**: Slows development velocity when modifying this feature

#### 5. Replace window.location.href with Wouter Navigation
**File**: `client/src/pages/creator-dashboard.tsx` (8 instances)  
**What**: Convert `window.location.href = '/path'` to Wouter's `useLocation` hook  
**Why**: Causes full page reloads instead of SPA navigation, loses React state  
**Effort**: Low  
**Risk if ignored**: Degraded UX, but functionally correct

#### 6. Add Keyboard Support to Clickable Divs
**Scope**: 54 files with `<div onClick>` without proper keyboard handling  
**What**: Add `role="button"`, `tabIndex={0}`, `onKeyDown` for Enter/Space  
**Why**: Keyboard users cannot interact with these elements  
**Effort**: Medium-high  
**Risk if ignored**: Accessibility compliance issues (WCAG 2.1 failure)

---

### LOW PRIORITY - Nice to Have

#### 7. Replace Manual className Concatenations with cn()
**Scope**: 45+ instances across 30+ files  
**What**: Replace template literal class concatenations with `cn()` utility  
**Why**: Consistency and cleaner conditional class handling  
**Effort**: Low  
**Risk if ignored**: None - purely stylistic

#### 8. Memoize Inline Prop Objects
**Scope**: 20+ instances across page components  
**What**: Extract inline objects/arrays in JSX props to `useMemo`  
**Why**: Prevents unnecessary child re-renders  
**Effort**: Low-medium  
**Risk if ignored**: Minor performance impact, only matters with large lists

#### 9. Add loading="lazy" to Images
**Scope**: 41 files with `<img>` tags  
**What**: Add `loading="lazy"` to below-the-fold images  
**Why**: Improves initial page load performance  
**Effort**: Low-medium  
**Risk if ignored**: Slightly slower initial page loads

#### 10. Fix Color Contrast Issues
**Scope**: 182 files using `text-gray-300/400` on dark backgrounds  
**What**: Bump to `text-gray-200/300` for better contrast  
**Why**: WCAG accessibility compliance  
**Effort**: High (need visual verification)  
**Risk if ignored**: Accessibility compliance issues if WCAG required

---

## Suggested Timeline

| Quarter | Focus Area |
|---------|------------|
| **Immediate** | Items 1-3 (Legacy code, typing, OAuth extraction) |
| **Next Sprint** | Items 4-5 (Component decomposition, navigation fixes) |
| **Ongoing** | Item 6 (Keyboard accessibility) |
| **As Needed** | Items 7-10 (Lower priority improvements) |

---

## Notes

- The original audit document (`FANDOMLY_FRONTEND_CODE_REVIEW.md`) contains full code snippets and line numbers
- Some audit findings were already fixed or were inaccurate (e.g., `fetchCurrentUser` was already memoized)
- Instagram Graph API requires tokens in URL params - this cannot be changed to headers per API requirements
- Consider creating a lint rule to catch new `any` types in API responses
