# Admin Dashboard Overhaul Plan

## Overview

Rebuild the Fandomly admin dashboard to match current codebase standards. The admin dashboard is at `/admin-dashboard` and is accessible to users with `role: 'fandomly_admin'`.

**Current state:** 10 page files in `client/src/pages/admin-dashboard/`, most untouched for months. The analytics page was recently cleared of Dynamic Labs code and has a placeholder. Server routes are in `server/routes/admin/admin-routes.ts` and `server/routes/admin/agency-routes.ts`.

**Target stack:** shadcn/ui components, TanStack React Query for data fetching, existing RBAC middleware (`requireFandomlyAdmin`), current Drizzle ORM patterns.

---

## Current Pages (audit)

| Page | File | Current State | Action |
|------|------|---------------|--------|
| Overview | `overview.tsx` | Basic stats | **Rebuild** with real-time platform metrics |
| Users | `users.tsx` | User list | **Rebuild** with search, filters, role management |
| Creators | `creators.tsx` | Creator list | **Rebuild** with verification status, tenant details |
| Tasks | `tasks.tsx` | Task management | **Update** to use current task template system |
| Platform Tasks | `platform-tasks/` | CRUD for platform tasks | **Update** — mostly functional, needs UI refresh |
| Analytics | `analytics.tsx` | Placeholder (Dynamic removed) | **Rebuild** with real analytics |
| Agencies | `agencies.tsx` | Agency management | **Update** — low priority |
| Profile | `profile.tsx` | Admin profile | **Update** — minor |
| Index | `index.tsx` | Layout/routing | **Update** layout to match current design |

---

## Page Rebuilds

### 1. Overview Dashboard (`overview.tsx`)

**Purpose:** Platform-wide stats at a glance.

**Stat cards (top row):**
- Total Users (fans + creators)
- Total Creators (verified / unverified)
- Total Revenue (Stripe MRR)
- Active Campaigns (currently running)

**Charts (middle row):**
- User growth over time (line chart, 30/90/365 day toggle)
- Task completions per day (bar chart)
- Revenue trend (line chart)
- Platform engagement (active users / total users %)

**Tables (bottom):**
- Recent signups (last 20 users with type, date, source)
- Top creators by fan count
- Recent support/moderation flags

**API endpoints needed:**
- `GET /api/admin/stats/overview` — aggregated counts
- `GET /api/admin/stats/growth?period=30d` — time-series user growth
- `GET /api/admin/stats/completions?period=30d` — time-series task completions
- `GET /api/admin/users/recent?limit=20` — recent signups

### 2. User Management (`users.tsx`)

**Purpose:** Search, view, and manage all users.

**Features:**
- Search by username, email, wallet address
- Filter by: role (admin/creator/fan), userType, status, auth provider
- Sortable table with columns: username, email, type, role, created, last active, points
- User detail drawer/modal:
  - Profile info, auth provider, social connections
  - Role change (promote to admin, change tier)
  - Suspend / unsuspend
  - View task completions, point transactions
  - View tenant memberships
- Bulk actions: export CSV, bulk role change

**API endpoints needed:**
- `GET /api/admin/users?search=&role=&type=&page=&limit=` — paginated user search
- `PATCH /api/admin/users/:id/role` — change role
- `PATCH /api/admin/users/:id/status` — suspend/unsuspend
- `GET /api/admin/users/:id/details` — full user detail with relationships

### 3. Creator Management (`creators.tsx`)

**Purpose:** Manage creators, their tenants, and verification status.

**Features:**
- Creator list with: name, tenant, fan count, revenue, verification status, subscription tier
- Filter by: verified/unverified, subscription tier, creator type (athlete/musician/etc.)
- Creator detail drawer:
  - Tenant info (slug, status, limits)
  - Program/campaign summary
  - Social connections and verification status
  - Revenue breakdown
  - Upgrade/downgrade subscription tier
- Verification workflow: approve/reject creator verification requests
- Blockchain: show creator token status (has token / eligible / not eligible)

**API endpoints needed:**
- `GET /api/admin/creators?search=&tier=&verified=&page=` — paginated creator list
- `GET /api/admin/creators/:id/details` — full creator detail
- `PATCH /api/admin/creators/:id/verify` — approve/reject verification
- `PATCH /api/admin/creators/:id/tier` — change subscription tier

### 4. Analytics Dashboard (`analytics.tsx`)

**Purpose:** Platform-wide analytics replacing the removed Dynamic Labs analytics.

**Sections:**
1. **User Analytics** — DAU/WAU/MAU, retention rates, cohort analysis
2. **Task Analytics** — completions by platform, verification success rates by tier (T1/T2/T3), most popular task types
3. **Revenue Analytics** — MRR, ARPU, churn rate, revenue by tier
4. **Social Platform Metrics** — connection counts per platform (Twitter, Instagram, TikTok, etc.), verification volumes
5. **Blockchain Analytics** — reputation score distribution, total tokens created, total value staked, staking APY

**Data sources:**
- User stats: `users` table aggregation
- Task stats: `task_completions`, `verification_attempts` tables
- Revenue: Stripe API (if connected) or `point_transactions` aggregation
- Social: `social_connections` table aggregation
- Blockchain: on-chain reads via `shared/blockchain-config.ts`

**API endpoints needed:**
- `GET /api/admin/analytics/users?period=` — user growth, retention
- `GET /api/admin/analytics/tasks?period=` — completion rates by platform/tier
- `GET /api/admin/analytics/revenue?period=` — revenue metrics
- `GET /api/admin/analytics/social` — platform connection stats
- `GET /api/admin/analytics/blockchain` — on-chain metrics

### 5. Task Management (`tasks.tsx`)

**Purpose:** View and moderate all tasks across the platform.

**Features:**
- List all tasks across all tenants
- Filter by: platform, task type, verification tier, status (active/draft/hidden)
- Moderation: hide/unhide tasks, flag for review
- Manual review queue (cross-tenant): see pending reviews, approve/reject
- Task template management: view `CORE_TASK_TEMPLATES`, manage DB `task_templates`

### 6. Platform Tasks (`platform-tasks/`)

**Current state:** Mostly functional CRUD. Needs UI refresh.

**Updates:**
- Refresh to use current shadcn/ui form components
- Add bulk create/update capability
- Add analytics per platform task (completion rate, points distributed)
- Connect to verification tier system

---

## Shared Admin Components

### AdminLayout (`admin-dashboard/index.tsx`)
- Sidebar navigation matching the main dashboard style
- Top bar with admin user info, notification badge
- Dark theme consistent with rest of app

### AdminDataTable
- Reusable data table component with:
  - Server-side pagination
  - Column sorting
  - Search/filter bar
  - Row selection for bulk actions
  - Export to CSV

### AdminStatCard
- Reusable stat card with:
  - Value, label, change indicator (%, up/down)
  - Mini sparkline chart
  - Click to drill down

---

## Server-Side Changes

### New admin routes file
**File:** `server/routes/admin/admin-analytics-routes.ts`

Dedicated analytics endpoints (the current `admin-routes.ts` is already large).

### Update existing admin routes
**File:** `server/routes/admin/admin-routes.ts`

- Add user management endpoints (search, role change, suspend)
- Add creator management endpoints (verification, tier change)
- Add analytics aggregation endpoints
- Ensure all endpoints use `requireFandomlyAdmin` middleware

### Database queries
Use Drizzle ORM for all queries. Key aggregations:
- User growth: `SELECT date_trunc('day', created_at), count(*) FROM users GROUP BY 1`
- Task completions: `SELECT date_trunc('day', completed_at), count(*) FROM task_completions WHERE status='completed' GROUP BY 1`
- Platform connections: `SELECT platform, count(*) FROM social_connections WHERE is_active=true GROUP BY 1`

---

## Implementation Order

1. **AdminLayout** — rebuild the shell (sidebar, top bar, routing)
2. **Overview** — stat cards + charts (most visible impact)
3. **User Management** — search, view, role management
4. **Creator Management** — list, verification, tier management
5. **Analytics** — multi-section analytics dashboard
6. **Task Management** — cross-tenant moderation
7. **Platform Tasks** — UI refresh
8. **Agencies** — low priority, update last

---

## Design Guidelines

- Follow the existing dark theme from `client/src/pages/creator-dashboard.tsx`
- Use shadcn/ui components: `Card`, `Table`, `Badge`, `Button`, `Input`, `Select`, `Dialog`, `Tabs`
- Use Recharts for all charts (already in the dependency tree)
- Use TanStack React Query for all data fetching (`useQuery`, `useMutation`)
- Mobile-responsive but desktop-first (admin dashboard is primarily desktop)
- Keep the admin dashboard behind the `fandomly_admin` role gate in `App.tsx`
