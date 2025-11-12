# Automated & Manual Testing Guide
## Phase 0 & Phase 1 QA across Fan, Creator, and Brand/Agency Accounts

**Date:** 2025-11-12
**Purpose:** Comprehensive testing guide for visibility controls and theme customization
**Account Types:** Fan, Creator (Individual), Brand, Agency

---

## Test Account Setup

### Required Test Accounts

| Account Type | Username | Email | Purpose |
|--------------|----------|-------|---------|
| **Fan** | `test-fan` | `fan@test.com` | Regular fan user viewing programs |
| **Creator** | `test-creator` | `creator@test.com` | Individual creator managing programs |
| **Brand** | `test-brand` | `brand@test.com` | Brand account with multiple programs |
| **Agency** | `test-agency` | `agency@test.com` | Agency managing multiple brands |

### Setup Instructions

1. Create each account type in the platform
2. For Creator: Create at least 2 test programs
   - Program 1: "Test Program Alpha" (fully customized)
   - Program 2: "Test Program Beta" (default settings)
3. For Brand: Create 3 test programs with different themes
4. For Agency: Create programs for 2 different mock clients

---

## Phase 0 Tests: Visibility Controls

### Backend API Tests

#### Test 1: Leaderboard Visibility Control

**Endpoint:** `GET /api/programs/:programId/leaderboard`

**Test Cases:**

| Test ID | Scenario | showLeaderboard | Expected Response | HTTP Status |
|---------|----------|-----------------|-------------------|-------------|
| VC-01 | Leaderboard enabled (default) | `true` or `undefined` | Array of fan data | 200 |
| VC-02 | Leaderboard disabled | `false` | `{"error": "Leaderboard is not enabled"}` | 403 |
| VC-03 | Program doesn't exist | N/A | `{"error": "Program not found"}` | 404 |

**Manual Test Steps:**
```bash
# 1. Enable leaderboard (default)
curl http://localhost:5000/api/programs/PROGRAM_ID/leaderboard

# Expected: JSON array with fan data
# [{"userId": "...", "username": "...", "points": 100, ...}]

# 2. Disable leaderboard in Program Builder
# Navigate to Program Builder → Page Sections → Toggle "Show Leaderboard Widget" OFF → Save

# 3. Try accessing leaderboard again
curl http://localhost:5000/api/programs/PROGRAM_ID/leaderboard

# Expected: {"error": "Leaderboard is not enabled for this program"}
# Status: 403 Forbidden
```

---

#### Test 2: Activity Feed Visibility Control

**Endpoint:** `GET /api/programs/:programId/activity`

**Test Cases:**

| Test ID | Scenario | showActivityFeed | Expected Response | HTTP Status |
|---------|----------|------------------|-------------------|-------------|
| VC-04 | Activity feed enabled | `true` or `undefined` | Array of activities | 200 |
| VC-05 | Activity feed disabled | `false` | `{"error": "Activity feed is not enabled"}` | 403 |

**Manual Test Steps:**
```bash
# 1. Check activity feed (enabled by default)
curl http://localhost:5000/api/programs/PROGRAM_ID/activity

# 2. Disable in Program Builder
# Navigate to: Page Sections → Toggle "Show Activity Feed" OFF → Save

# 3. Verify 403 response
curl http://localhost:5000/api/programs/PROGRAM_ID/activity
# Expected: 403 with error message
```

---

#### Test 3: Campaigns Visibility Control

**Endpoint:** `GET /api/programs/public/:slug`

**Test Cases:**

| Test ID | Scenario | showCampaigns | Expected campaigns | Notes |
|---------|----------|---------------|-------------------|-------|
| VC-06 | Campaigns visible | `true` or `undefined` | Full campaigns array | Default behavior |
| VC-07 | Campaigns hidden | `false` | Empty array `[]` | Campaigns filtered |

**Manual Test Steps:**
```bash
# 1. Fetch program with campaigns visible
curl http://localhost:5000/api/programs/public/test-program-alpha

# Expected: response.campaigns = [... campaign objects ...]

# 2. Hide campaigns
# Program Builder → Page Sections → Toggle "Show Campaigns Tab" OFF → Save

# 3. Fetch again
curl http://localhost:5000/api/programs/public/test-program-alpha

# Expected: response.campaigns = []
```

---

#### Test 4: Tasks Visibility Control

**Test Cases:**

| Test ID | Scenario | showTasks | Expected tasks | Notes |
|---------|----------|-----------|----------------|-------|
| VC-08 | Tasks visible | `true` or `undefined` | Full tasks array | Default |
| VC-09 | Tasks hidden | `false` | Empty array `[]` | Tasks filtered |

---

#### Test 5: Profile Data Granular Controls

**Test Cases:**

| Test ID | Field | Toggle Setting | Expected in API Response | Notes |
|---------|-------|----------------|--------------------------|-------|
| VC-10 | Bio/Description | `showBio: true` | `creator.bio` present | Default |
| VC-11 | Bio/Description | `showBio: false` | `creator.bio` undefined | Filtered |
| VC-12 | Social Links | `showSocialLinks: true` | `creator.socialLinks` present | Default |
| VC-13 | Social Links | `showSocialLinks: false` | `creator.socialLinks` undefined | Filtered |
| VC-14 | Banner Image | `showBio: true` | `creator.bannerImage` present | Tied to bio visibility |
| VC-15 | Banner Image | `showBio: false` | `creator.bannerImage` undefined | Filtered |

**Manual Test Steps:**
```bash
# 1. All profile data visible (default)
curl http://localhost:5000/api/programs/public/test-program-alpha

# Check response:
# creator.bio = "..." (present)
# creator.socialLinks = {...} (present)
# creator.bannerImage = "..." (present)

# 2. Hide bio
# Program Builder → Page Sections → Expand "Show Profile Tab" →
#   Toggle "Show Bio/Description" OFF → Save

curl http://localhost:5000/api/programs/public/test-program-alpha

# Check response:
# creator.bio = undefined (filtered)
# creator.bannerImage = undefined (filtered, tied to bio)

# 3. Hide social links
# Toggle "Show Social Links" OFF → Save

curl http://localhost:5000/api/programs/public/test-program-alpha

# Check response:
# creator.socialLinks = undefined (filtered)
```

---

### Frontend Rendering Tests

#### Test 6: UI Respects Visibility Settings

**Test Cases:**

| Test ID | Setting | Element | Expected Behavior |
|---------|---------|---------|-------------------|
| VC-16 | `showProfile: false` | Profile tab | Tab hidden from navigation |
| VC-17 | `showCampaigns: false` | Campaigns tab | Tab hidden from navigation |
| VC-18 | `showTasks: false` | Tasks tab | Tab hidden from navigation |
| VC-19 | `showRewards: false` | Rewards tab | Tab hidden from navigation |
| VC-20 | `showLeaderboard: false` | Leaderboard widget | Widget not rendered |
| VC-21 | `showActivityFeed: false` | Dashboard tab | Tab hidden from navigation |
| VC-22 | `showFanWidget: false` | Fan Stats widget | Widget not rendered |
| VC-23 | `profileData.showBio: false` | Bio section | Bio paragraph not rendered |
| VC-24 | `profileData.showSocialLinks: false` | Social links | Social links section not rendered |
| VC-25 | `profileData.showTiers: false` | Reward tiers | Tiers section not rendered |
| VC-26 | `profileData.showVerificationBadge: false` | Verification badge | Badge not rendered |

**Manual Test Steps:**
```
1. As Creator:
   - Go to Program Builder
   - Navigate to "Page Sections"
   - Toggle OFF "Show Profile Tab"
   - Click "Save Changes"

2. Open program public page in incognito window (as Fan)
   - Visit: /programs/test-program-alpha
   - Expected: Profile tab should NOT appear in navigation
   - Only Dashboard, Campaigns, Tasks, Rewards tabs visible

3. Return to Program Builder, toggle ON "Show Profile Tab"
   - But toggle OFF "Show Bio/Description" (nested under Profile)
   - Save changes

4. Refresh public page
   - Profile tab should be visible
   - But bio/description text should NOT appear in profile section

5. Repeat for each toggle setting, verifying UI matches setting
```

---

### Cross-Account Type Tests

#### Test 7: Settings Work Across Account Types

**Test Cases:**

| Test ID | Account Type | Program Type | Setting Modified | Expected Result |
|---------|--------------|--------------|------------------|-----------------|
| VC-27 | Creator | Personal | Hide leaderboard | Works as expected |
| VC-28 | Brand | Brand program | Hide campaigns | Works as expected |
| VC-29 | Agency | Client program | Hide social links | Works as expected |

**Manual Test Steps:**
```
1. Login as test-creator
   - Create program "Personal Fitness Program"
   - Toggle OFF "Show Leaderboard Widget"
   - Verify leaderboard hidden on public page

2. Login as test-brand
   - Create program "Brand X Loyalty"
   - Toggle OFF "Show Campaigns Tab"
   - Verify campaigns tab hidden on public page

3. Login as test-agency
   - Create program "Agency Client Y"
   - Toggle OFF profile data "Show Social Links"
   - Verify social links hidden on public page

4. For each test:
   - Use incognito window to view as fan
   - Confirm visibility settings are respected
   - No errors in browser console
```

---

## Phase 1 Tests: Theme System

### CSS Variable Injection Tests

#### Test 8: Theme Variables Correctly Injected

**Test Cases:**

| Test ID | Theme Applied | CSS Variable | Expected Value | Location |
|---------|---------------|--------------|----------------|----------|
| TH-01 | Default Light | `--color-primary` | `#6366f1` | :root |
| TH-02 | Dark Mode Pro | `--color-primary` | `#06b6d4` | :root |
| TH-03 | Neon Cyberpunk | `--color-primary` | `#ff00ff` | :root |
| TH-04 | Any theme | `--font-heading` | Theme's heading font | :root |
| TH-05 | Any theme | `--border-radius-md` | Theme's border radius | :root |
| TH-06 | Any theme | `--shadow-md` | Theme's shadow | :root |

**Manual Test Steps:**
```
1. As Creator:
   - Go to Program Builder
   - Select "Dark Mode Pro" theme
   - Click "Save Changes"

2. Visit program public page
   - Open DevTools (F12)
   - Go to Elements tab
   - Select <html> element (root)
   - Look at Styles panel

3. Verify CSS variables injected:
   - --color-primary: #06b6d4
   - --color-secondary: #8b5cf6
   - --color-accent: #f59e0b
   - --color-background: #0f172a
   - --color-surface: #1e293b
   - --color-text-primary: #f1f5f9
   - --font-heading: Inter, system-ui, sans-serif
   - --font-body: Inter, system-ui, sans-serif
   - --border-radius-md: 0.5rem
   - --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.5)
   - ... (50+ variables total)

4. Navigate away from program page
   - Go to another page (e.g., dashboard)
   - Check :root styles again
   - Expected: CSS variables should be REMOVED (cleaned up)
```

---

#### Test 9: Theme Templates Apply Correctly

**Test Cases:**

| Test ID | Template | Verify Primary Color | Verify Background | Verify Font |
|---------|----------|---------------------|-------------------|-------------|
| TH-07 | Default Light | Purple (#6366f1) | White (#ffffff) | Inter |
| TH-08 | Dark Mode Pro | Cyan (#06b6d4) | Dark slate (#0f172a) | Inter |
| TH-09 | Neon Cyberpunk | Magenta (#ff00ff) | Almost black (#0a0a0a) | Orbitron |
| TH-10 | Minimalist White | Black (#000000) | White (#ffffff) | Helvetica Neue |
| TH-11 | Ocean Blue | Sky blue (#0ea5e9) | Very light blue (#f0f9ff) | Poppins |
| TH-12 | Sunset Orange | Orange (#f97316) | Off-white (#fff7ed) | Inter |
| TH-13 | Forest Green | Green (#16a34a) | Light green (#f0fdf4) | Inter |
| TH-14 | Royal Purple | Purple (#a855f7) | Dark indigo (#1e1b4b) | Playfair Display |
| TH-15 | Monochrome | Black (#000000) | White (#ffffff) | Georgia |
| TH-16 | Pastel Dream | Light purple (#a78bfa) | Yellow tint (#fefce8) | Quicksand |
| TH-17 | High Contrast | Blue (#0000EE) | White (#FFFFFF) | Arial |
| TH-18 | Gaming RGB | Hot pink (#ff0080) | Almost black (#0d0d0d) | Exo 2 |

**Manual Test Steps:**
```
For each theme template:

1. Login as Creator
   - Navigate to Program Builder
   - Scroll to "Theme Templates" section
   - Click theme template (e.g., "Neon Cyberpunk")
   - Verify theme info appears: "Applied Theme: Neon Cyberpunk"
   - Click "Save Changes"

2. Visit program public page
   - Visual inspection:
     * Primary color appears in buttons, links, badges
     * Background color is correct
     * Text color has good contrast
     * Font family is applied to headings

3. DevTools verification:
   - Check :root CSS variables match template values
   - Inspect specific elements:
     * Button background-color uses --color-primary
     * Body background-color uses --color-background
     * Heading font-family uses --font-heading

4. Take screenshot for visual regression testing
```

---

#### Test 10: Backward Compatibility with Phase 0

**Test Cases:**

| Test ID | Program Setup | Expected Behavior |
|---------|---------------|-------------------|
| TH-19 | Has `brandColors` only (Phase 0) | Colors apply via fallback logic |
| TH-20 | Has `theme` (Phase 1) | Enhanced theme applies, overrides brandColors |
| TH-21 | Has both `brandColors` and `theme` | Theme takes priority |

**Manual Test Steps:**
```
1. Find existing program created before Phase 1
   - Should only have brandColors: {primary, secondary, accent}
   - No theme object

2. Visit public page
   - Verify colors still apply correctly
   - Check DevTools: --color-primary and --color-brand-primary both set
   - Fallback logic working

3. Update program to use new theme
   - Select "Ocean Blue" template
   - Save
   - Verify new theme overrides old brandColors

4. Check database:
   SELECT page_config FROM loyalty_programs WHERE id = 'PROGRAM_ID';

   - Should see both brandColors and theme in JSON
   - Frontend should prioritize theme
```

---

### Theme Template Gallery UI Tests

#### Test 11: Theme Selection Interface

**Test Cases:**

| Test ID | Action | Expected Result |
|---------|--------|-----------------|
| TH-22 | Load Program Builder | All 12 templates visible in grid |
| TH-23 | Click template card | Template selected, checkmark appears |
| TH-24 | Click different template | Previous unselected, new one selected |
| TH-25 | Click "Reset" button | Returns to default light theme |
| TH-26 | Hover over template | Scale animation, border color change |
| TH-27 | View on mobile | Grid adjusts to 2 columns |
| TH-28 | View on tablet | Grid adjusts to 3 columns |
| TH-29 | View on desktop | Grid shows 4 columns |

**Manual Test Steps:**
```
1. Login as Creator
   - Navigate to Program Builder
   - Scroll to "Theme Templates" section
   - Verify all 12 templates visible

2. Interaction tests:
   - Hover over "Dark Mode Pro"
     * Card should scale slightly
     * Border should highlight
   - Click "Dark Mode Pro"
     * Checkmark should appear in top-right
     * "Applied Theme" section appears below
     * Shows: "Dark Mode Pro - Sleek dark theme with cyan accents"
     * Badges show: 🌙 Dark Mode, 14 Colors, Typography Included

3. Switch themes:
   - Click "Neon Cyberpunk"
     * "Dark Mode Pro" checkmark disappears
     * "Neon Cyberpunk" becomes selected
     * "Applied Theme" updates

4. Reset test:
   - Click "Reset" button
     * Returns to "Default Light"
     * Applied theme updates

5. Save and verify:
   - Click "Save Changes"
   - Refresh page
   - Verify selected theme persists
```

---

### Cross-Account Type Theme Tests

#### Test 12: Themes Work Across Account Types

**Test Cases:**

| Test ID | Account Type | Theme Applied | Expected Result |
|---------|--------------|---------------|-----------------|
| TH-30 | Creator | Gaming RGB | Theme applies successfully |
| TH-31 | Brand | Royal Purple | Theme applies, all brand programs can have different themes |
| TH-32 | Agency | High Contrast | Theme applies, accessible for all users |

**Manual Test Steps:**
```
1. Creator Account:
   - Create "Gaming Stream Program"
   - Apply "Gaming RGB" theme
   - Verify hot pink/neon colors appear
   - Fan views: Sees gaming aesthetic

2. Brand Account:
   - Program 1: Apply "Ocean Blue"
   - Program 2: Apply "Sunset Orange"
   - Program 3: Apply "Forest Green"
   - Verify each program has distinct theme
   - Fan views: Sees different theme per program

3. Agency Account:
   - Client 1 Program: Apply "Royal Purple" (luxury brand)
   - Client 2 Program: Apply "Minimalist White" (tech startup)
   - Verify themes match client branding
   - Test from multiple fan accounts

4. Accessibility test:
   - Apply "High Contrast" theme
   - Test with screen reader
   - Verify WCAG AAA compliance
   - Check color contrast ratios
```

---

## Integration Tests

### Test 13: Visibility + Theming Combined

**Test Cases:**

| Test ID | Scenario | Actions | Expected Result |
|---------|----------|---------|-----------------|
| INT-01 | Dark theme + hidden leaderboard | Apply Dark Pro theme, hide leaderboard | Dark colors, no leaderboard widget |
| INT-02 | Pastel theme + hidden campaigns | Apply Pastel Dream, hide campaigns | Soft colors, no campaigns tab |
| INT-03 | Multiple visibility toggles + custom theme | Hide 3 sections, apply Neon theme | Theme applies, 3 sections hidden |

**Manual Test Steps:**
```
1. Complex Configuration Test:
   - Login as Creator
   - Navigate to Program Builder

2. Apply theme:
   - Select "Dark Mode Pro"
   - Verify preview colors

3. Configure visibility:
   - Toggle OFF: Show Leaderboard Widget
   - Toggle OFF: Show Activity Feed
   - Toggle OFF: Profile Tab > Show Social Links
   - Click "Save Changes"

4. Visit public page as Fan:
   - Verify dark theme applied (cyan accents, dark background)
   - Verify leaderboard widget NOT present
   - Verify Dashboard tab (activity feed) NOT present
   - Open Profile tab
   - Verify social links section NOT present
   - Verify other profile content still visible

5. Edge cases:
   - Apply "Monochrome" theme (no colors)
   - Hide ALL tabs except Tasks
   - Save
   - Visit public page
   - Should see: Only Tasks tab, pure black/white design
```

---

## Performance Tests

### Test 14: CSS Variable Cleanup

**Test Case:**

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| PERF-01 | Visit program page, then navigate away | CSS variables removed from :root |
| PERF-02 | Visit 10 different programs in sequence | No CSS variable leakage between programs |

**Manual Test Steps:**
```
1. Open program page with "Dark Mode Pro" theme
   - Check DevTools: CSS variables set

2. Navigate to Dashboard
   - Check DevTools: CSS variables REMOVED

3. Navigate back to program page
   - Check DevTools: CSS variables RE-INJECTED

4. Visit different program with "Ocean Blue" theme
   - Check DevTools: New CSS variables (blue colors)
   - Old variables (dark cyan) should be gone

5. Performance check:
   - Open Performance tab in DevTools
   - Record while navigating between programs
   - Verify no memory leaks
   - CSS variable cleanup should be instant (<1ms)
```

---

## Regression Tests

### Test 15: Existing Features Still Work

**Test Cases:**

| Test ID | Feature | Expected Behavior |
|---------|---------|-------------------|
| REG-01 | Task completion | Fans can still complete tasks |
| REG-02 | Points awarded | Points correctly calculated and displayed |
| REG-03 | Leaderboard ranking | Rankings update after task completion |
| REG-04 | Campaign creation | Creators can create campaigns |
| REG-05 | Task creation | Creators can create tasks |
| REG-06 | Reward distribution | Rewards work correctly |
| REG-07 | Social media verification | Twitter/TikTok/etc verification works |
| REG-08 | Profile editing | Creators can edit profile |
| REG-09 | Program publishing | Programs can be published/unpublished |
| REG-10 | Image uploads | Banner/logo uploads work |

---

## Browser Compatibility Tests

### Test 16: Cross-Browser Testing

**Test Cases:**

| Browser | Version | Theme Applied | Visibility Controls | Notes |
|---------|---------|---------------|---------------------|-------|
| Chrome | Latest | ✓ To test | ✓ To test | Primary target |
| Firefox | Latest | ✓ To test | ✓ To test | Secondary target |
| Safari | Latest | ✓ To test | ✓ To test | iOS important |
| Edge | Latest | ✓ To test | ✓ To test | Windows users |
| Mobile Chrome | Latest | ✓ To test | ✓ To test | Mobile primary |
| Mobile Safari | Latest | ✓ To test | ✓ To test | iOS mobile |

**Manual Test Steps:**
```
For each browser:

1. Visit program with "Neon Cyberpunk" theme
   - Verify all colors render correctly
   - Check for CSS compatibility issues
   - Inspect computed styles

2. Test visibility controls
   - Hide leaderboard
   - Verify widget doesn't appear

3. Responsive design
   - Resize window to mobile size (375px width)
   - Verify theme gallery shows 2 columns
   - Verify public page is mobile-responsive

4. Take screenshots
   - Compare across browsers
   - Flag any visual differences
```

---

## Test Automation Scripts (Future)

### Recommended Test Framework: Playwright

```typescript
// Example automated test structure (to be implemented)

import { test, expect } from '@playwright/test';

test.describe('Phase 0: Visibility Controls', () => {
  test('should hide leaderboard when toggle is off', async ({ page }) => {
    // Login as creator
    await page.goto('/login');
    await page.fill('[name="email"]', 'creator@test.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // Navigate to program builder
    await page.goto('/creator-dashboard/programs');
    await page.click('[data-testid="edit-program"]');

    // Toggle off leaderboard
    await page.click('[data-testid="toggle-leaderboard"]');
    await page.click('[data-testid="save-program"]');

    // Visit public page
    await page.goto('/programs/test-program-alpha');

    // Verify leaderboard is not visible
    const leaderboard = await page.locator('[data-testid="leaderboard-widget"]');
    await expect(leaderboard).not.toBeVisible();
  });
});

test.describe('Phase 1: Theme System', () => {
  test('should apply Dark Mode Pro theme', async ({ page }) => {
    // Login and navigate to program builder
    // ... login steps ...

    // Select Dark Mode Pro theme
    await page.click('[data-template-id="dark-pro"]');
    await page.click('[data-testid="save-program"]');

    // Visit public page
    await page.goto('/programs/test-program-alpha');

    // Verify CSS variables
    const root = await page.locator(':root');
    const primaryColor = await root.evaluate((el) =>
      getComputedStyle(el).getPropertyValue('--color-primary')
    );

    expect(primaryColor.trim()).toBe('#06b6d4');
  });
});
```

---

## Testing Checklist

### Before Each Release

- [ ] Run all Phase 0 visibility control tests
- [ ] Run all Phase 1 theme system tests
- [ ] Test across all 3 account types (Fan, Creator, Brand/Agency)
- [ ] Test in Chrome, Firefox, Safari
- [ ] Test on mobile devices
- [ ] Verify no console errors
- [ ] Check Network tab for 403/404 errors
- [ ] Verify CSS variables cleanup
- [ ] Test backward compatibility
- [ ] Run integration tests
- [ ] Check performance (no slowdowns)
- [ ] Verify all 12 theme templates
- [ ] Test all visibility toggle combinations

---

## Known Issues & Edge Cases

### Issue 1: Theme Preview Timing
- **Issue:** CSS variables may take 1 render cycle to apply
- **Workaround:** Use `useEffect` dependency array to trigger re-render
- **Status:** Working as designed

### Issue 2: Nested Visibility Controls
- **Issue:** Hiding parent (Profile Tab) should hide all children
- **Current Behavior:** Frontend hides children independently
- **Status:** Working as designed - gives more flexibility

### Issue 3: Theme Template Font Loading
- **Issue:** Custom fonts (Orbitron, Playfair) may not load immediately
- **Workaround:** Add font preload in head
- **Status:** Minor UX issue

---

## QA Sign-off

### Phase 0 Sign-off

- [ ] All backend API visibility controls work (VC-01 through VC-15)
- [ ] All frontend rendering respects settings (VC-16 through VC-26)
- [ ] Cross-account testing complete (VC-27 through VC-29)
- [ ] No regressions found
- [ ] Signed off by: _________________ Date: _________

### Phase 1 Sign-off

- [ ] All CSS variable injection working (TH-01 through TH-06)
- [ ] All 12 theme templates apply correctly (TH-07 through TH-18)
- [ ] Backward compatibility verified (TH-19 through TH-21)
- [ ] Theme gallery UI functional (TH-22 through TH-29)
- [ ] Cross-account theme testing complete (TH-30 through TH-32)
- [ ] Integration tests passed (INT-01 through INT-03)
- [ ] Performance tests passed (PERF-01, PERF-02)
- [ ] Signed off by: _________________ Date: _________

---

## Contact & Support

**Questions about testing?**
- Check test results in `/docs/test-results/`
- Review screenshots in `/docs/test-screenshots/`
- File issues with [TEST] prefix in title

**Test Data:**
- Test accounts: See "Test Account Setup" section
- Test programs: Created in each account type
- Test data reset: Run `/scripts/reset-test-data.ts`

---

**End of Testing Guide**
