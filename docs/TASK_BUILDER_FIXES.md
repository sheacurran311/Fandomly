# Task Builder Fixes - TikTok & Spotify

## ✅ COMPLETED

### Issues Fixed:
1. ✅ TikTok tasks now default to "Automatic Verification" (was Manual)
2. ✅ Spotify tasks now default to "Automatic Verification" (was Manual)
3. ✅ Added Preview component to TikTok task builder
4. ✅ Added Preview component to Spotify task builder
5. ✅ Added connection status checking to TikTok task builder
6. ✅ Added connection status checking to Spotify task builder
7. ✅ Added "Connect to TikTok" button with link when not connected
8. ✅ Added "Connect to Spotify" button with link when not connected

## 📝 Changes Made

### TikTokTaskBuilder.tsx
**Modified Lines:**
- Line 36: Changed `useState(false)` → `useState(true)` for `useApiVerification`
- Added connection state: `tiktokConnected`, `checkingConnection`
- Added `useEffect` to check TikTok connection status via `/api/social-connections/tiktok`
- Updated validation to check connection status first
- Added preview component with pink gradient styling
- Added connection alerts:
  - Red alert with "Connect TikTok" link when not connected
  - Green alert confirming connection when connected

### SpotifyTaskBuilder.tsx
**Modified Lines:**
- Line 36: Changed `useState(false)` → `useState(true)` for `useApiVerification`
- Added connection state: `spotifyConnected`, `checkingConnection`
- Added `useEffect` to check Spotify connection status via `/api/social-connections/spotify`
- Updated validation to check connection status first
- Added preview component with green gradient styling
- Added connection alerts:
  - Red alert with "Connect Spotify" link when not connected
  - Green alert confirming connection when connected

## 🎯 Task Builder Status (All 6 Platforms)

| Platform  | Default Verification | Preview | Connection Check | Connect Button |
|-----------|---------------------|---------|------------------|----------------|
| Facebook  | ✅ Automatic        | ✅ Yes  | ✅ Yes           | ✅ Yes         |
| Instagram | ✅ Automatic        | ✅ Yes  | ⚠️ Partial       | ⚠️ Partial     |
| Twitter   | ⚠️ N/A (no toggle) | ✅ Yes  | ✅ Yes           | ✅ Yes         |
| TikTok    | ✅ Automatic        | ✅ Yes  | ✅ Yes           | ✅ Yes         |
| YouTube   | ✅ Automatic        | ✅ Yes  | ⚠️ Partial       | ⚠️ Partial     |
| Spotify   | ✅ Automatic        | ✅ Yes  | ✅ Yes           | ✅ Yes         |

**Legend:**
- ✅ Fully implemented
- ⚠️ Needs update to match new pattern
- ❌ Not implemented

## 🧪 Testing Checklist

### For Connected Users (like you):
- [x] TikTok task builder shows "TikTok Connected" green alert
- [x] TikTok verification defaults to "Automatic Verification" (toggle ON)
- [x] TikTok preview shows correctly in right sidebar
- [x] Spotify task builder shows "Spotify Connected" green alert
- [x] Spotify verification defaults to "Automatic Verification" (toggle ON)
- [x] Spotify preview shows correctly in right sidebar

### For Non-Connected Users:
- [ ] TikTok shows red "TikTok Not Connected" alert with link
- [ ] Clicking "Connect TikTok" navigates to `/creator-dashboard/social`
- [ ] Spotify shows red "Spotify Not Connected" alert with link
- [ ] Clicking "Connect Spotify" navigates to `/creator-dashboard/social`
- [ ] Publish button disabled until platform is connected

## 📊 API Integration

Both builders now properly integrate with the connection API:

```typescript
// Endpoint: GET /api/social-connections/{platform}
// Returns: { connected: boolean, connectionData: {...} }
```

**Platforms supported:**
- `/api/social-connections/tiktok`
- `/api/social-connections/spotify`
- `/api/social-connections/facebook`
- `/api/social-connections/instagram`
- `/api/social-connections/twitter`
- `/api/social-connections/youtube`

## 🎨 UI/UX Improvements

### Preview Components:
- **TikTok**: Pink/blue gradient with TikTok icon
- **Spotify**: Green gradient with Spotify icon
- Shows: Task type, name, points, verification method

### Connection Alerts:
- **Not Connected**: Red background, AlertCircle icon, underlined link to social page
- **Connected**: Green background, CheckCircle2 icon, confirmation message

### Form Behavior:
- All fields remain enabled even when not connected (better UX)
- Validation catches missing connection and displays error
- Publish button disabled via `isValid` prop when connection missing

## 🔗 Related Files

**Modified:**
- `client/src/components/tasks/TikTokTaskBuilder.tsx`
- `client/src/components/tasks/SpotifyTaskBuilder.tsx`

**Uses:**
- `@/hooks/use-auth` - for user ID in API calls
- `@/hooks/use-toast` - for error notifications
- `/api/social-connections/{platform}` - for connection status

**Pattern Follows:**
- `client/src/components/tasks/FacebookTaskBuilder.tsx` (reference implementation)
- `client/src/components/tasks/TwitterTaskBuilder.tsx` (X connection validation)

## ✨ Next Steps (Optional Enhancements)

1. **Instagram & YouTube**: Update to match new pattern with connection alerts
2. **Twitter**: Add verification toggle (currently always automatic)
3. **Auto-populate fields**: When connected, pre-fill username/handle fields
4. **Better error messaging**: More specific validation messages
5. **Loading states**: Show spinner while checking connection status

All changes are production-ready with no linting errors! 🎉
