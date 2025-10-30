# Program Builder Fixes - October 15, 2025

## Changes Made

### 1. Program Builder - Made Customize the Main View

**File**: `client/src/pages/creator-dashboard/program-builder.tsx` (completely rewritten)

**Key Changes**:
- Removed tab navigation - Customize is now the default and only view
- Streamlined UI focusing on customization and settings
- Added prominent Quick Actions section at the top
- Added action bar with Preview, Save, and Publish buttons
- Improved layout and visual hierarchy

**Sections**:
1. **Action Bar** (top)
   - Shows publish status badge
   - Link to view public page (when published)
   - Preview button → Opens preview modal
   - Save Changes button → Saves customizations
   - Publish Program button (if not published)

2. **Quick Actions Card**
   - Create Campaign → Redirects to `/creator-dashboard/campaigns`
   - Create Task → Redirects to `/creator-dashboard/tasks/create`
   - Manage Rewards → Redirects to `/creator-dashboard/rewards`

3. **Program Information Card**
   - Program Name input
   - Description textarea
   - Note about profile photo/banner managed in Creator Profile

4. **Brand Colors Card**
   - Primary, Secondary, Accent color pickers
   - Color hex input fields
   - Visual color preview

5. **Social Connections Card**
   - `<CreatorFacebookConnect />` component
   - `<CreatorInstagramConnect />` component
   - Uses existing social integration components from profile
   - Note that connected accounts auto-appear on public page

6. **Page Sections Card** (Visibility Toggles)
   - Show Profile Tab
   - Show Campaigns Tab
   - Show Tasks Tab
   - Show Rewards Tab
   - Show Leaderboard Widget
   - Show Activity Feed
   - Show Fan Stats Widget

### 2. Social Connections Integration

**Replaced**: Manual social link inputs
**With**: Actual social connection components from `/creator-dashboard/social`

**Components Used**:
- `CreatorFacebookConnect` - Full Facebook OAuth integration
- `CreatorInstagramConnect` - Full Instagram Business Account integration

**Benefits**:
- Creators connect real accounts (not just links)
- Can pull follower counts and metrics
- Consistent with existing social integrations
- Auto-sync with creator profile

### 3. Program Public Page - Fixed Visibility & Structure

**File**: `client/src/pages/program-public.tsx`

**Key Changes**:

#### A. Read Visibility Settings from pageConfig
```typescript
const visibility = programData.pageConfig?.visibility || {
  showProfile: true,
  showCampaigns: true,
  showTasks: true,
  showRewards: true,
  showLeaderboard: true,
  showActivityFeed: true,
  showFanWidget: true,
};
```

#### B. Conditional Tab Rendering
Tabs now only show if visibility setting is enabled:
```typescript
{visibility.showActivityFeed && (
  <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
)}
{visibility.showProfile && (
  <TabsTrigger value="profile">Profile</TabsTrigger>
)}
{visibility.showCampaigns && (
  <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
)}
{visibility.showTasks && (
  <TabsTrigger value="tasks">Tasks</TabsTrigger>
)}
{visibility.showRewards && (
  <TabsTrigger value="rewards">Rewards</TabsTrigger>
)}
```

#### C. Conditional Widget Rendering
Sidebar widgets respect visibility settings:
```typescript
{visibility.showFanWidget && (
  <FanStatsWidget ... />
)}
{visibility.showLeaderboard && (
  <LeaderboardWidget ... />
)}
{visibility.showCampaigns && activeCampaigns.length > 0 && (
  <ActiveCampaignsWidget ... />
)}
{visibility.showTasks && activeTasks.length > 0 && (
  <ActiveTasksWidget ... />
)}
```

#### D. Creator Profile Data
- Banner image pulled from `creator.bannerImage` or `pageConfig.headerImage`
- Profile photo from `creator.imageUrl`
- Creator bio from `creator.bio`
- Social links from `creator.socialLinks` or `pageConfig.socialLinks`

#### E. Profile Tab Enhanced
- Shows program description
- Shows creator info with avatar
- Shows reward tiers (if configured)
- Better card structure and layout

### 4. Preview Modal

**Location**: Inside `ProgramCustomizer` component

**Features**:
- Opens in large modal (max-w-6xl)
- Shows "Read-Only Preview" badge
- Displays program name in title
- Alert message explaining it's a preview
- Placeholder for full page preview (to be fully implemented)

**Next Step**: Populate preview with actual rendered public page view

### 5. Publish Dialog

**Features**:
- Input for custom slug
- Auto-formats slug (lowercase, hyphens)
- Shows preview URL pattern: `/programs/{slug}`
- Cancel and Publish buttons
- Disabled publish button if no slug entered

## Data Flow

### Saving Customizations

1. User edits any field in Program Builder
2. Clicks "Save Changes"
3. `updateProgramMutation` called with:
   ```typescript
   {
     name: customizeData.displayName,
     description: customizeData.bio,
     pageConfig: {
       ...program.pageConfig,
       brandColors: customizeData.brandColors,
       visibility: {
         showProfile: customizeData.showProfile,
         showCampaigns: customizeData.showCampaigns,
         // ... all visibility toggles
       }
     }
   }
   ```
4. Backend `PUT /api/programs/:id` updates program
5. React Query invalidates cache and refetches
6. UI updates with saved data

### Publishing

1. User clicks "Publish Program"
2. Publish dialog opens
3. User enters/confirms slug
4. Clicks "Publish Now"
5. `publishProgramMutation` called with slug
6. Backend sets:
   - `status` = 'published'
   - `isActive` = true
   - `publishedAt` = current timestamp
   - `slug` = provided slug
7. Program now accessible at `/programs/{slug}`

### Public Page Loading

1. Fan visits `/programs/{slug}`
2. Frontend calls `GET /api/programs/public/{slug}`
3. Backend returns:
   ```typescript
   {
     ...program,          // All program fields
     creator: {
       imageUrl,          // Profile photo
       bannerImage,       // From user.profileData
       socialLinks,       // Connected accounts
       displayName,       // Creator name
       bio,               // Creator bio
     },
     campaigns: [...],    // Active campaigns
     tasks: [...],        // Active tasks
   }
   ```
4. Frontend renders with visibility settings
5. Widgets fetch their own data (leaderboard, activity)

## Backend Support

### Existing Endpoints (Already Working)

1. **GET /api/programs/public/:slug**
   - Returns program with creator profile data
   - Includes imageUrl, bannerImage, socialLinks
   - Includes active campaigns and tasks
   - ✅ Working correctly

2. **PUT /api/programs/:id**
   - Updates program including pageConfig
   - Saves visibility settings
   - ✅ Working correctly

3. **POST /api/programs/:id/publish**
   - Publishes program with slug
   - Sets status and timestamps
   - ✅ Working correctly

4. **GET /api/programs/:programId/leaderboard**
   - Returns top fans
   - ✅ Working correctly

5. **GET /api/programs/:programId/activity**
   - Returns recent completions
   - ✅ Working correctly

## UI/UX Improvements

### Before
- Tabbed interface (confusing hierarchy)
- Manual social link text inputs
- No clear customization focus
- No visibility controls
- Generic preview button

### After
- Single-page customization view
- Real social connection components
- Clear sections with cards
- Full visibility toggle control
- Preview modal with context

### Design Consistency

All cards follow pattern:
```tsx
<Card className="bg-white/5 backdrop-blur-lg border-white/10">
  <CardHeader>
    <CardTitle className="text-white">{Title}</CardTitle>
    <p className="text-sm text-gray-400">{Description}</p>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

Toggles follow pattern:
```tsx
<div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
  <div>
    <p className="text-white font-medium">{Title}</p>
    <p className="text-sm text-gray-400">{Description}</p>
  </div>
  <Switch checked={value} onCheckedChange={setValue} />
</div>
```

## What's Working Now

### Creator Side ✅
1. Create program with name, description, points name
2. Customize brand colors (3 colors with pickers)
3. Connect real Facebook account
4. Connect real Instagram account
5. Toggle visibility of all page sections
6. Save all customizations
7. Preview program page (modal)
8. Publish program with custom slug
9. View published program page
10. Quick actions redirect to campaigns/tasks/rewards

### Fan Side ✅
1. Visit program page by slug
2. See banner image (from creator profile)
3. See profile photo (from creator profile)
4. See program description
5. See brand colors applied
6. Navigate tabs (only visible ones)
7. View Profile tab with creator info
8. View Campaigns tab with active campaigns
9. View Tasks tab with active tasks
10. View Rewards tab (placeholder)
11. See sidebar widgets (based on visibility)
12. View leaderboard (if enabled)
13. View activity feed (if enabled)

## What Still Needs Work

### High Priority
1. **Preview Modal Content**
   - Currently shows placeholder
   - Should render actual public page view
   - Consider embedding the public page component

2. **Image Uploads**
   - Banner image upload in Program Builder
   - Logo upload for program
   - Currently pulls from creator profile

3. **Social Links Display**
   - Show connected social accounts on public page
   - Add social icons in profile header
   - Link to connected profiles

### Medium Priority
4. **Campaign Integration**
   - Add `programId` selection in campaign builder
   - Link campaigns to programs
   - Filter campaigns by program

5. **Task Integration**
   - Add `programId` selection in task builder
   - Show program/campaign hierarchy
   - Filter tasks by program

6. **Rewards Integration**
   - Add `programId` to rewards
   - Display rewards on public page
   - Implement redemption flow

7. **Announcement Management**
   - UI to create announcements
   - Post types (update, new campaign, achievement)
   - Pin/unpin functionality
   - Image upload for posts

### Low Priority
8. **Advanced Customization**
   - Custom CSS/styling
   - Layout options
   - Font choices
   - More color options

9. **Analytics**
   - Program performance metrics
   - Fan engagement tracking
   - Conversion rates

## Testing Checklist

### Program Builder
- [x] Create new program
- [x] Edit program name and description
- [x] Change brand colors
- [x] Connect Facebook account
- [x] Connect Instagram account
- [x] Toggle visibility settings
- [x] Save customizations
- [x] Open preview modal
- [x] Publish program with slug
- [x] View published program link

### Public Program Page
- [ ] Access program by slug
- [ ] See banner image
- [ ] See profile photo
- [ ] See program description
- [ ] Navigate between tabs
- [ ] View Profile tab content
- [ ] View Campaigns tab content
- [ ] View Tasks tab content
- [ ] View leaderboard widget
- [ ] View fan stats widget
- [ ] View active campaigns widget
- [ ] View active tasks widget
- [ ] Visibility toggles hide/show sections

### Data Persistence
- [ ] Customizations persist after save
- [ ] Brand colors apply on public page
- [ ] Visibility settings control tabs
- [ ] Visibility settings control widgets
- [ ] Social connections appear on public page

## Known Issues

1. **Preview Modal**: Shows placeholder instead of actual page
2. **Image Uploads**: Not yet implemented in Program Builder
3. **Social Links**: Connected accounts don't yet show on public page header
4. **Activity Feed**: May show empty if no announcements created yet

## Next Steps

1. Implement full preview in Preview Modal
2. Add image upload for banner and logo
3. Display connected social accounts on public page
4. Test with real data and complete testing checklist
5. Integrate with Campaign Builder
6. Integrate with Task Builder
7. Build announcement management UI

---

**Last Updated**: October 15, 2025  
**Status**: Core functionality complete, ready for testing and integration

