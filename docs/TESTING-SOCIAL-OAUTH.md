# Testing Social OAuth Integrations

## ✅ Setup Complete!

All environment variables are now configured:
- ✅ `VITE_GOOGLE_CLIENT_ID` - Added in Replit
- ✅ `VITE_SPOTIFY_CLIENT_ID` - Added in Replit
- ✅ Server-side secrets already configured

## 🧪 How to Test Each Integration

### 1. TikTok Connection (Fixed & Updated to Popup Flow)

**Where to test:**
- Navigate to `/creator-dashboard/social` OR
- Use the Social Connections widget on creator dashboard

**Expected behavior:**
1. Click "Connect TikTok" button
2. Popup window opens with TikTok OAuth
3. User authorizes the app
4. Popup communicates back to parent window
5. Popup closes automatically
6. Success toast appears: "TikTok Connected!"
7. TikTok widget shows connected status with username

**Database storage:**
- Check `social_connections` table for new TikTok entry
- Should include: `access_token`, `refresh_token`, `platformUsername`, `profileData`

---

### 2. YouTube Connection (New Implementation)

**Where to test:**
- Navigate to `/creator-dashboard/social`
- Look for YouTube connection button

**Expected behavior:**
1. Click "Connect YouTube" button
2. Popup opens with Google OAuth consent screen
3. User sees requested scopes:
   - View your YouTube account
   - View your YouTube channel memberships
4. User grants permissions
5. Popup communicates success back
6. Popup closes automatically
7. Success toast appears: "YouTube Connected!"
8. YouTube widget shows:
   - Channel name
   - Subscriber count

**Database storage:**
- Check `social_connections` table for YouTube entry
- Should include: `access_token`, `refresh_token`, channel info in `profileData`

**Scopes granted:**
- `https://www.googleapis.com/auth/youtube.readonly`
- `https://www.googleapis.com/auth/youtube.channel-memberships.creator`

---

### 3. Spotify Connection (New Implementation)

**Where to test:**
- Navigate to `/creator-dashboard/social`
- Look for Spotify connection button

**Expected behavior:**
1. Click "Connect Spotify" button
2. Popup opens with Spotify OAuth
3. User sees requested scopes:
   - Access your followers and who you follow
   - Manage your saved content
   - Access your subscription details
   - Access your email address
4. User grants permissions
5. Popup communicates success back
6. Popup closes automatically
7. Success toast appears: "Spotify Connected!"
8. Spotify widget shows:
   - Display name
   - Follower count
   - Profile picture (if available)

**Database storage:**
- Check `social_connections` table for Spotify entry
- Should include: `access_token`, `refresh_token`, user info in `profileData`

**Scopes granted:**
- `user-follow-modify`
- `user-follow-read`
- `user-library-modify`
- `user-library-read`
- `user-read-private`
- `user-read-email`

---

## 🔍 What to Check in Console

### ✅ Expected (Good) Logs:
```
[Creator FB] Creator user detected - Facebook provider ready
[Instagram] Creator user detected - Instagram provider ready
[TikTok Error Handler] Global error handling initialized
```

### ❌ Should NOT See:
```
YouTube: VITE_GOOGLE_CLIENT_ID not configured  ← Should be GONE now!
Spotify: VITE_SPOTIFY_CLIENT_ID not configured  ← Should be GONE now!
[Creator FB] Not a creator user - skipping...   ← Should be GONE now!
[Instagram] Not a creator user - skipping...    ← Should be GONE now!
[Fan FB] Not a fan user - skipping...          ← Should be GONE now!
```

---

## 🐛 Troubleshooting

### If YouTube button doesn't work:
1. Check browser console for errors
2. Verify `VITE_YOUTUBE_REDIRECT_URI` matches your callback URL
3. Check Google Cloud Console redirect URIs
4. Try hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### If Spotify button doesn't work:
1. Check browser console for errors
2. Verify `VITE_SPOTIFY_REDIRECT_URI` matches your callback URL
3. Check Spotify Dashboard redirect URIs
4. Try hard refresh

### If popup is blocked:
1. Browser may be blocking popups
2. Check browser popup blocker settings
3. Try clicking button again (browsers often allow on second try)

### If "state mismatch" error:
1. Clear browser localStorage
2. Try connecting again
3. This is CSRF protection working correctly

---

## 📊 Database Verification

After connecting, check the `social_connections` table:

```sql
SELECT 
  platform,
  platform_username,
  platform_display_name,
  is_connected,
  created_at
FROM social_connections
WHERE user_id = '<your-user-id>'
ORDER BY created_at DESC;
```

Expected entries:
- `platform: 'tiktok'` (if connected)
- `platform: 'youtube'` (if connected)
- `platform: 'spotify'` (if connected)

---

## 🎯 Success Criteria

All three integrations are working correctly if:
1. ✅ Popup opens for each platform
2. ✅ User can authorize successfully
3. ✅ Popup closes automatically
4. ✅ Success toast appears
5. ✅ Connection appears in dashboard
6. ✅ Data saved to `social_connections` table
7. ✅ No console errors
8. ✅ No "not configured" warnings for YouTube/Spotify

---

## 📱 Testing on Different User Types

### Creator Account (musician/content creator):
- ✅ Should see TikTok, YouTube, Spotify options
- ✅ Connections appear in creator dashboard widgets
- ✅ Social stats (followers/subscribers) displayed

### Athlete Account:
- ⚠️ May not see all social options (check business logic)
- Verify which platforms are available for athlete user type

### Fan Account:
- ⚠️ TikTok/YouTube/Spotify may not be available
- Fan accounts have different social features

---

## 🔄 Next Steps After Testing

Once all three integrations work:
1. Test token refresh functionality
2. Test disconnect flow
3. Verify profile data updates correctly
4. Test error handling (deny permissions, network errors)
5. Test on different browsers (Chrome, Firefox, Safari)

---

## 📝 Notes

- All tokens are stored encrypted in the database
- Refresh tokens enable automatic token renewal
- State tokens provide CSRF protection
- Popup pattern prevents full-page redirects
- All connections use confidential OAuth flow (server-side secrets)

