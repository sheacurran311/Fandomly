# Program Page Improvements - October 15, 2025

## Completed Improvements ✅

### 1. "Your Stats" Widget Added
**Files Modified**: 
- `client/src/components/program/widgets.tsx`
- `client/src/pages/program-public.tsx`
- `server/program-routes.ts`

**What Was Added**:
- New `YourStatsWidget` component that displays for logged-in fans
- Shows:
  - Total points earned
  - Tasks completed count
  - Leaderboard rank (with badge)
- Positioned at the top of the sidebar (above other widgets)
- Beautiful gradient background (brand-primary to brand-secondary)
- Only visible to authenticated users

**Backend Support**:
- New endpoint: `GET /api/programs/:programId/user-stats`
- Returns:
  ```typescript
  {
    points: number;
    tasksCompleted: number;
    leaderboardRank: number | null;
  }
  ```
- Calculates user's rank by fetching all fans and finding position
- Counts completed tasks for the program's creator

### 2. Preview Modal Fixed
**File Modified**: `client/src/pages/creator-dashboard/program-builder.tsx`

**Changes**:
- Replaced placeholder content with actual iframe
- Shows live preview of published program page
- If program is published: displays iframe with `/programs/{slug}`
- If program is draft: shows message to publish first
- Badge shows "Live Preview" vs "Draft Preview"
- Full-height iframe for complete page view

**Before**:
```typescript
<div className="text-center text-gray-400 py-12">
  <Eye className="h-16 w-16 mx-auto mb-4" />
  <p className="text-lg">Full preview will be displayed here</p>
</div>
```

**After**:
```typescript
{previewUrl ? (
  <div className="h-full rounded-lg overflow-hidden border border-white/10">
    <iframe
      src={previewUrl}
      className="w-full h-full bg-brand-dark-bg"
      title="Program Preview"
    />
  </div>
) : (
  // Draft message
)}
```

### 3. Profile Photo Verified
**File**: `client/src/pages/program-public.tsx`

**Status**: ✅ Already Working
- Profile photo is displayed in header (line 145-150)
- Uses `creator.imageUrl` from backend
- 32x32 avatar with border and shadow
- Fallback shows program initials if no image

**Code**:
```typescript
<Avatar className="w-32 h-32 border-4 border-brand-dark-bg shadow-xl">
  <AvatarImage src={creator.imageUrl} />
  <AvatarFallback className="bg-brand-primary/20 text-brand-primary text-3xl">
    {programData.name.substring(0, 2).toUpperCase()}
  </AvatarFallback>
</Avatar>
```

## Remaining Work 🚧

### 1. Granular Profile Data Toggles (High Priority)

**Requirement**: 
- Creators need to control which specific data points show in Profile tab
- Section toggle controls entire tab visibility
- Individual data point toggles control specific fields
- If all data points are hidden, section auto-hides

**Implementation Plan**:

#### A. Update Database Schema
Add `profileDataVisibility` to `pageConfig`:

```typescript
// shared/schema.ts
pageConfig: jsonb("page_config").$type<{
  // ... existing fields
  profileDataVisibility?: {
    showBio: boolean;
    showLocation: boolean;
    showWebsite: boolean;
    showSocialLinks: boolean;
    showJoinDate: boolean;
    showFollowerCount: boolean;
    showVerificationBadge: boolean;
    showTiers: boolean;
  };
}>()
```

#### B. Update Program Builder UI
**File**: `client/src/pages/creator-dashboard/program-builder.tsx`

Add collapsible section under "Show Profile Tab":

```typescript
<div className="space-y-2">
  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
    <div>
      <p className="text-white font-medium">Show Profile Tab</p>
      <p className="text-sm text-gray-400">Display your profile information</p>
    </div>
    <Switch
      checked={customizeData.showProfile}
      onCheckedChange={(checked) => setCustomizeData({ ...customizeData, showProfile: checked })}
    />
  </div>
  
  {/* Collapsible Profile Data Points */}
  {customizeData.showProfile && (
    <div className="ml-6 space-y-2 border-l-2 border-white/10 pl-4">
      <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
        <span className="text-white text-sm">Show Bio</span>
        <Switch
          checked={customizeData.profileData.showBio}
          onCheckedChange={(checked) => setCustomizeData({ 
            ...customizeData, 
            profileData: { ...customizeData.profileData, showBio: checked }
          })}
        />
      </div>
      
      <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
        <span className="text-white text-sm">Show Location</span>
        <Switch
          checked={customizeData.profileData.showLocation}
          onCheckedChange={(checked) => setCustomizeData({ 
            ...customizeData, 
            profileData: { ...customizeData.profileData, showLocation: checked }
          })}
        />
      </div>
      
      <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
        <span className="text-white text-sm">Show Social Links</span>
        <Switch
          checked={customizeData.profileData.showSocialLinks}
          onCheckedChange={(checked) => setCustomizeData({ 
            ...customizeData, 
            profileData: { ...customizeData.profileData, showSocialLinks: checked }
          })}
        />
      </div>
      
      <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
        <span className="text-white text-sm">Show Reward Tiers</span>
        <Switch
          checked={customizeData.profileData.showTiers}
          onCheckedChange={(checked) => setCustomizeData({ 
            ...customizeData, 
            profileData: { ...customizeData.profileData, showTiers: checked }
          })}
        />
      </div>
      
      <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
        <span className="text-white text-sm">Show Verification Badge</span>
        <Switch
          checked={customizeData.profileData.showVerificationBadge}
          onCheckedChange={(checked) => setCustomizeData({ 
            ...customizeData, 
            profileData: { ...customizeData.profileData, showVerificationBadge: checked }
          })}
        />
      </div>
    </div>
  )}
</div>
```

#### C. Update Profile Tab Component
**File**: `client/src/pages/program-public.tsx`

Update `ProfileTab` to respect data point visibility:

```typescript
function ProfileTab({ program, creator }: { program: ProgramPublicData; creator: any }) {
  const dataVisibility = program.pageConfig?.profileDataVisibility || {
    showBio: true,
    showLocation: true,
    showWebsite: true,
    showSocialLinks: true,
    showJoinDate: true,
    showFollowerCount: true,
    showVerificationBadge: true,
    showTiers: true,
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">About {program.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Only show bio if enabled */}
          {dataVisibility.showBio && program.description && (
            <div>
              <h3 className="text-white font-semibold mb-2">Description</h3>
              <p className="text-gray-300">{program.description}</p>
            </div>
          )}

          <Separator className="bg-white/10" />

          <div>
            <h3 className="text-white font-semibold mb-2">Creator</h3>
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={creator.imageUrl} />
                <AvatarFallback className="bg-brand-primary/20 text-brand-primary">
                  {creator.displayName?.substring(0, 2).toUpperCase() || 'CR'}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-white font-medium">{creator.displayName}</p>
                  {dataVisibility.showVerificationBadge && creator.verified && (
                    <CheckCircle className="h-4 w-4 text-blue-400" />
                  )}
                </div>
                {dataVisibility.showBio && creator.bio && (
                  <p className="text-gray-400 text-sm">{creator.bio}</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Only show tiers if enabled */}
      {dataVisibility.showTiers && program.tiers && program.tiers.length > 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Reward Tiers</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Tier content */}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

### 2. Additional Profile Data Points

**Creator Profile Fields to Add**:
- Location (city/country)
- Website URL
- Join date
- Follower count
- Verification badge
- Custom bio fields

**Implementation**:
1. Add fields to creator profile schema if not present
2. Add inputs in creator profile settings
3. Display conditionally based on visibility toggles

### 3. Social Links from Connected Accounts

**Current State**: Manual social link inputs
**Desired State**: Auto-populate from connected accounts

**Implementation**:
1. When creator connects Facebook/Instagram/Twitter
2. Auto-populate social links in `pageConfig.socialLinks`
3. Display connected account icons on public page
4. Show follower counts if available

## Testing Checklist

### Your Stats Widget
- [ ] Widget appears for logged-in fans
- [ ] Widget hidden for logged-out visitors
- [ ] Points display correctly
- [ ] Tasks completed count is accurate
- [ ] Leaderboard rank shows correct position
- [ ] Gradient background displays properly

### Preview Modal
- [ ] Opens when clicking Preview button
- [ ] Shows iframe for published programs
- [ ] Shows draft message for unpublished programs
- [ ] Iframe loads complete page
- [ ] Modal is scrollable if needed
- [ ] Close button works

### Profile Photo
- [ ] Displays in header
- [ ] Correct size (32x32)
- [ ] Border and shadow applied
- [ ] Fallback shows initials
- [ ] Image loads from creator profile

### Profile Data Toggles (When Implemented)
- [ ] Section toggle controls tab visibility
- [ ] Data point toggles control specific fields
- [ ] Changes save to database
- [ ] Public page respects toggles
- [ ] All data points hidden = section hidden
- [ ] Collapsible UI works smoothly

## Files Modified

### Frontend
1. `client/src/components/program/widgets.tsx` - Added YourStatsWidget
2. `client/src/pages/program-public.tsx` - Added YourStatsWidget to sidebar
3. `client/src/pages/creator-dashboard/program-builder.tsx` - Fixed preview modal

### Backend
1. `server/program-routes.ts` - Added `/api/programs/:programId/user-stats` endpoint

## Next Steps

1. **Implement granular profile data toggles** (highest priority per user request)
2. Add more creator profile fields (location, website, etc.)
3. Auto-populate social links from connected accounts
4. Add image upload for program banner/logo
5. Build announcement management UI
6. Integrate campaigns and tasks with program hierarchy

---

**Status**: Phase 1 Complete (Stats Widget, Preview Modal, Profile Photo)  
**Next**: Phase 2 - Granular Profile Data Toggles  
**Last Updated**: October 15, 2025

