# Phase 0 Audit: Settings & Visibility Disconnections

**Date:** 2025-11-12
**Status:** 🔍 Audit Complete - Implementation Ready
**Branch:** `claude/review-loyalty-rewards-app-011CV2LgRJxyTz8rQu29onQZ`

## Executive Summary

This audit reveals that while the **database schema has comprehensive visibility and branding settings**, there are **critical disconnections** between backend settings and what's actually enforced in API responses and frontend display.

### ✅ What Works Well:
- Database schema has detailed visibility toggles at tenant, program, and creator levels
- Frontend `program-public.tsx` component respects most visibility settings for UI display
- Settings update APIs exist and work correctly
- Type definitions are comprehensive

### ⚠️ Critical Gaps:
1. **Backend API routes don't filter data by visibility settings** - All data is returned regardless of toggles
2. **Profile data granularity not fully implemented** - `visibility.profileData.*` toggles exist but aren't enforced
3. **Branding CSS variables not injected** - Colors and fonts stored in settings but not applied
4. **No settings management UI** - Creators can't easily configure visibility toggles

---

## 1. Schema Structure (Current State)

### Tenant Settings (`tenants` table)

**Location:** `shared/schema.ts:15-123`

```typescript
{
  branding: {
    logo?: string;
    primaryColor: string;        // e.g., "#6366f1"
    secondaryColor: string;      // e.g., "#8b5cf6"
    accentColor: string;         // e.g., "#ec4899"
    customCSS?: string;
    favicon?: string;
    fontFamily?: string;
  },
  settings: {
    timezone: 'UTC',
    currency: 'USD',
    language: 'en',
    publicProfile: boolean;
    allowRegistration: boolean;
    // ... other settings
  },
  limits: {
    whiteLabel: boolean;
    customDomain: boolean;
    // ... usage limits
  }
}
```

### Program Settings (`loyalty_programs.pageConfig`)

**Location:** `shared/schema.ts:525-596`, `migrations/0004_worthless_iron_fist.sql`

```typescript
{
  headerImage?: string;
  logo?: string;
  brandColors?: {
    primary: string;
    secondary: string;
    accent: string;
  },
  theme?: {
    mode: 'light' | 'dark' | 'custom';
    backgroundColor?: string;
    textColor?: string;
  },
  customDomain?: string;
  socialLinks?: {
    twitter?: string;
    instagram?: string;
    discord?: string;
    website?: string;
  },
  visibility?: {
    // ✅ Section-level visibility (PARTIALLY WORKING)
    showProfile?: boolean;           // Controls Profile tab
    showCampaigns?: boolean;         // Controls Campaigns tab
    showTasks?: boolean;             // Controls Tasks tab
    showRewards?: boolean;           // Controls Rewards tab
    showLeaderboard?: boolean;       // Controls Leaderboard widget
    showActivityFeed?: boolean;      // Controls Activity Feed tab
    showFanWidget?: boolean;         // Controls Fan Stats widget

    // ⚠️ Granular profile visibility (NOT IMPLEMENTED)
    profileData?: {
      showBio?: boolean;
      showLocation?: boolean;
      showWebsite?: boolean;
      showSocialLinks?: boolean;
      showJoinDate?: boolean;
      showFollowerCount?: boolean;
      showVerificationBadge?: boolean;
      showTiers?: boolean;
    }
  }
}
```

### Creator Settings (`creators.publicPageSettings`)

**Location:** `shared/schema.ts`, `migrations/0004_worthless_iron_fist.sql`

```typescript
{
  showAbout: boolean;
  showTasks: boolean;
  showSocialPosts: boolean;
  showAnalytics: boolean;
  showRewards: boolean;
  showCommunity: boolean;
}
```

**Default:** All `true` except `showAnalytics: false`

---

## 2. API Endpoints Analysis

### ✅ Settings Update APIs (Working)

**Tenant Settings:**
- `PATCH /api/tenants/:id` (`server/tenant-routes.ts:127`)
  - Updates branding, settings, limits
  - Requires authentication + tenant modify permission
  - ✅ Working correctly

**Program Settings:**
- `PUT /api/programs/:id` (`server/program-routes.ts:194`)
  - Updates pageConfig including visibility
  - Validation schema includes all fields
  - ✅ Working correctly

**Creator Settings:**
- `PATCH /api/creators/:id/public-settings` (`server/routes.ts:1240`)
  - Updates publicPageSettings
  - ✅ Working correctly

### ⚠️ Public Data APIs (NOT Filtering by Visibility)

#### 1. **Public Program Page**
**Endpoint:** `GET /api/programs/public/:slug`
**Location:** `server/program-routes.ts:464-554`

**Current Behavior:**
```typescript
// Returns ALL data regardless of visibility settings
const program = await storage.getLoyaltyProgramBySlug(slug);
const campaigns = await storage.getCampaignsByProgramId(program.id);
const tasks = await storage.getTasksByProgramId(program.id);

return {
  ...program,
  creator: {
    id, name, username, avatar, bio,
    businessInfo: { socialLinks }  // ⚠️ Always returned
  },
  campaigns,  // ⚠️ Always returned (regardless of showCampaigns)
  tasks       // ⚠️ Always returned (regardless of showTasks)
};
```

**What Should Happen:**
```typescript
const visibility = program.pageConfig?.visibility || {};

// Filter campaigns based on showCampaigns
const campaigns = visibility.showCampaigns !== false
  ? await storage.getCampaignsByProgramId(program.id)
  : [];

// Filter tasks based on showTasks
const tasks = visibility.showTasks !== false
  ? await storage.getTasksByProgramId(program.id)
  : [];

// Filter creator profile data based on visibility.profileData
const creatorData = {
  id: creator.id,
  name: creator.name,
  username: creator.username,
  avatar: creator.avatar,
  ...(visibility.profileData?.showBio !== false && { bio: creator.bio }),
  ...(visibility.profileData?.showSocialLinks !== false && {
    businessInfo: { socialLinks: creator.businessInfo?.socialLinks }
  })
};
```

#### 2. **Leaderboard API**
**Endpoint:** `GET /api/programs/:programId/leaderboard`
**Location:** `server/program-routes.ts:589-612`

**Current Behavior:**
```typescript
// Always returns leaderboard data
const leaderboard = await storage.getLeaderboard(programId, limit);
return leaderboard;  // ⚠️ No visibility check
```

**What Should Happen:**
```typescript
const program = await storage.getLoyaltyProgram(programId);
const visibility = program.pageConfig?.visibility || {};

// Return 403 or empty array if showLeaderboard is false
if (visibility.showLeaderboard === false) {
  return res.status(403).json({
    error: 'Leaderboard is not enabled for this program'
  });
}

const leaderboard = await storage.getLeaderboard(programId, limit);
return leaderboard;
```

#### 3. **Activity Feed API**
**Endpoint:** `GET /api/programs/:programId/activity`
**Location:** `server/program-routes.ts:560-583`

**Current Behavior:**
```typescript
// Always returns recent activity
const completions = await storage.getRecentTaskCompletions(programId, limit);
return completions;  // ⚠️ No visibility check
```

**What Should Happen:**
```typescript
const program = await storage.getLoyaltyProgram(programId);
const visibility = program.pageConfig?.visibility || {};

if (visibility.showActivityFeed === false) {
  return res.status(403).json({
    error: 'Activity feed is not enabled for this program'
  });
}

const completions = await storage.getRecentTaskCompletions(programId, limit);
return completions;
```

---

## 3. Frontend Implementation Analysis

### ✅ What Works (Frontend Respects Settings)

**Location:** `client/src/pages/program-public.tsx:125-133`

```typescript
const visibility = program.pageConfig?.visibility || {};

// Tabs are conditionally rendered based on visibility
{visibility.showProfile !== false && <TabsTrigger value="profile">Profile</TabsTrigger>}
{visibility.showCampaigns !== false && <TabsTrigger value="campaigns">Campaigns</TabsTrigger>}
{visibility.showTasks !== false && <TabsTrigger value="tasks">Tasks</TabsTrigger>}
{visibility.showRewards !== false && <TabsTrigger value="rewards">Rewards</TabsTrigger>}
{visibility.showActivityFeed !== false && <TabsTrigger value="dashboard">Dashboard</TabsTrigger>}

// Widgets are conditionally rendered
{visibility.showLeaderboard !== false && <LeaderboardWidget />}
{visibility.showFanWidget !== false && <FanStatsWidget />}
```

**Status:** ✅ **Working correctly** - Frontend hides UI elements based on visibility settings

### ⚠️ What's Missing (Profile Data Granularity)

**Location:** `client/src/pages/program-public.tsx:474-735` (Profile tab)

**Current Implementation:**
```typescript
// Profile tab shows everything if showProfile !== false
<div className="space-y-6">
  <ProfileHeader />           {/* Shows avatar, name, username */}
  <p>{program.description}</p> {/* ⚠️ Always shown (should respect showBio) */}

  {/* Social links */}
  {program.pageConfig?.socialLinks && (
    <SocialLinks />           {/* ⚠️ Always shown (should respect showSocialLinks) */}
  )}

  {/* Tiers */}
  {program.tiers && (
    <TiersSection />          {/* ⚠️ Always shown (should respect showTiers) */}
  )}
</div>
```

**What Should Happen:**
```typescript
const profileVisibility = visibility.profileData || {};

<div className="space-y-6">
  <ProfileHeader />

  {/* Bio */}
  {profileVisibility.showBio !== false && program.description && (
    <p>{program.description}</p>
  )}

  {/* Social links */}
  {profileVisibility.showSocialLinks !== false && program.pageConfig?.socialLinks && (
    <SocialLinks />
  )}

  {/* Tiers */}
  {profileVisibility.showTiers !== false && program.tiers && (
    <TiersSection />
  )}

  {/* Verification badge */}
  {profileVisibility.showVerificationBadge !== false && program.verified && (
    <VerifiedBadge />
  )}
</div>
```

---

## 4. Branding Implementation Gap

### ⚠️ CSS Variables Not Injected

**Current State:**
- `tenants.branding.primaryColor` stored in database: `"#6366f1"`
- `program.pageConfig.brandColors.primary` stored in database: `"#8b5cf6"`
- **BUT:** These colors are NOT injected as CSS variables in the HTML

**What Should Happen:**

**Backend Injection** (`server/program-routes.ts`):
```typescript
app.get('/api/programs/public/:slug', async (req, res) => {
  const program = await storage.getLoyaltyProgramBySlug(slug);

  // Include branding data in response
  return {
    ...program,
    branding: {
      colors: program.pageConfig?.brandColors || program.tenant.branding,
      theme: program.pageConfig?.theme || { mode: 'light' },
      fonts: program.tenant.branding?.fontFamily
    }
  };
});
```

**Frontend Injection** (`client/src/pages/program-public.tsx`):
```typescript
useEffect(() => {
  if (!program) return;

  const root = document.documentElement;
  const branding = program.branding || {};

  // Inject CSS variables
  if (branding.colors?.primary) {
    root.style.setProperty('--color-primary', branding.colors.primary);
  }
  if (branding.colors?.secondary) {
    root.style.setProperty('--color-secondary', branding.colors.secondary);
  }
  if (branding.colors?.accent) {
    root.style.setProperty('--color-accent', branding.colors.accent);
  }
  if (branding.theme?.backgroundColor) {
    root.style.setProperty('--bg-color', branding.theme.backgroundColor);
  }
  if (branding.fonts) {
    root.style.setProperty('--font-family', branding.fonts);
  }

  // Cleanup on unmount
  return () => {
    root.style.removeProperty('--color-primary');
    root.style.removeProperty('--color-secondary');
    // ... remove all
  };
}, [program]);
```

**Global CSS** (`client/src/index.css`):
```css
:root {
  /* Default values (fallbacks) */
  --color-primary: #6366f1;
  --color-secondary: #8b5cf6;
  --color-accent: #ec4899;
  --bg-color: #ffffff;
  --font-family: 'Inter', system-ui, sans-serif;
}

/* Use variables throughout */
.btn-primary {
  background-color: var(--color-primary);
}

.text-primary {
  color: var(--color-primary);
}

body {
  font-family: var(--font-family);
  background-color: var(--bg-color);
}
```

---

## 5. Settings Management UI Gap

### ⚠️ No Comprehensive Settings UI

**Current State:**
- Program builder allows editing basic info (name, description, slug)
- **No UI for visibility toggles** in program settings
- **No UI for branding colors, fonts** in tenant settings
- Creators can't easily configure `showLeaderboard`, `showProfile`, etc.

**What's Needed:**

#### Program Settings Page
**Location:** Should be at `client/src/pages/program-settings.tsx` (doesn't exist yet)

**Sections:**
1. **Basic Info** (name, description, slug, status)
2. **Branding** (logo, header image, colors, theme)
3. **Visibility Controls** - Toggle switches for:
   - Show Profile
   - Show Campaigns
   - Show Tasks
   - Show Rewards
   - Show Leaderboard
   - Show Activity Feed
   - Show Fan Widget
4. **Profile Data Visibility** - Toggle switches for:
   - Show Bio
   - Show Social Links
   - Show Tiers
   - Show Verification Badge
   - Show Join Date
5. **Advanced** (custom domain, custom CSS)

#### Tenant Branding Settings Page
**Location:** Should be at `client/src/pages/tenant-settings.tsx` (may exist but needs branding section)

**Branding Section:**
1. **Colors**
   - Primary Color (color picker)
   - Secondary Color (color picker)
   - Accent Color (color picker)
2. **Typography**
   - Font Family (dropdown: Inter, Roboto, Poppins, etc.)
3. **Assets**
   - Logo upload
   - Favicon upload
4. **Custom CSS** (advanced users)

---

## 6. Summary of Disconnections

### Critical Priority (Week 1 Implementation)

| # | Issue | Current State | Impact | Fix Location |
|---|-------|---------------|--------|--------------|
| 1 | **Backend doesn't filter by visibility** | APIs return all data regardless of toggles | High - Data exposed even when hidden in UI | `server/program-routes.ts` |
| 2 | **Profile data granularity not enforced** | `visibility.profileData.*` toggles ignored | Medium - Can't control bio, social links visibility | `server/program-routes.ts`, `client/pages/program-public.tsx` |
| 3 | **Branding colors not applied** | Colors stored but not injected as CSS variables | High - Programs all look the same | `client/pages/program-public.tsx`, CSS files |
| 4 | **No settings management UI** | Creators can't configure visibility toggles | High - Settings exist but unusable | New: `client/pages/program-settings.tsx` |

### Medium Priority (Week 2-3 Enhancement)

| # | Issue | Current State | Impact | Fix Location |
|---|-------|---------------|--------|--------------|
| 5 | **No font family support** | `fontFamily` stored but not applied | Medium - Limited branding | CSS injection |
| 6 | **Custom CSS not loaded** | `customCSS` stored but not injected | Medium - Advanced customization unavailable | HTML head injection |
| 7 | **Theme mode not respected** | `theme.mode` (light/dark) not applied | Medium - Can't switch themes | CSS class application |
| 8 | **No visual theme builder** | Must manually edit JSON | Low - Poor UX for non-technical users | New theme builder UI |

---

## 7. Implementation Plan (Phase 0)

### Step 1: Fix Backend API Filtering (2-3 hours)
**Files:** `server/program-routes.ts`

- [ ] Add visibility checks to `GET /api/programs/public/:slug`
- [ ] Add visibility checks to `GET /api/programs/:programId/leaderboard`
- [ ] Add visibility checks to `GET /api/programs/:programId/activity`
- [ ] Filter profile data based on `visibility.profileData.*` toggles
- [ ] Return appropriate HTTP status (403) when feature disabled

### Step 2: Implement CSS Variable Injection (2-3 hours)
**Files:** `client/src/pages/program-public.tsx`, `client/src/index.css`

- [ ] Create `useBranding()` hook to inject CSS variables
- [ ] Add branding data to program API response
- [ ] Inject colors, fonts, theme on component mount
- [ ] Update global CSS to use CSS variables
- [ ] Test with different color combinations

### Step 3: Update Frontend Profile Data Visibility (1-2 hours)
**Files:** `client/src/pages/program-public.tsx`

- [ ] Add granular checks for `visibility.profileData.*`
- [ ] Conditionally render bio, social links, tiers, verification badge
- [ ] Test all combinations of visibility settings

### Step 4: Create Settings Management UI (4-6 hours)
**Files:** New: `client/src/pages/program-settings.tsx`, `client/src/components/settings/*`

- [ ] Create Program Settings page with tabs
- [ ] Build Visibility Controls section with toggle switches
- [ ] Build Branding section with color pickers
- [ ] Build Profile Data Visibility section
- [ ] Connect to `PUT /api/programs/:id` endpoint
- [ ] Add live preview functionality

### Step 5: Testing & Documentation (2 hours)

- [ ] Test all visibility toggle combinations
- [ ] Test branding color application
- [ ] Test settings persistence
- [ ] Document new settings UI in creator guide
- [ ] Create video walkthrough of settings

---

## 8. Success Criteria

### Backend API Filtering
- ✅ Leaderboard API returns 403 when `showLeaderboard: false`
- ✅ Activity API returns 403 when `showActivityFeed: false`
- ✅ Public program API filters campaigns/tasks based on visibility
- ✅ Profile data respects all `profileData.*` toggles

### Branding Application
- ✅ Primary color applied to buttons, links, accents
- ✅ Secondary color applied to secondary UI elements
- ✅ Custom fonts loaded and applied
- ✅ Light/dark theme mode switches correctly

### Settings UI
- ✅ Creators can toggle all visibility settings via UI
- ✅ Color pickers update branding in real-time
- ✅ Settings persist correctly to database
- ✅ Live preview shows changes immediately

---

## Next Steps

1. **Review this audit** with stakeholders
2. **Prioritize fixes** based on impact
3. **Begin implementation** with Step 1 (Backend API filtering)
4. **Iterate with user feedback** after each step

---

**Audit completed by:** Claude
**Estimated implementation time:** 12-16 hours (1.5-2 days)
**Ready to begin:** ✅ Yes
