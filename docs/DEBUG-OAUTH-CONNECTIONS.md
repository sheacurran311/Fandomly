# Debug Guide for TikTok/YouTube/Spotify OAuth

## Quick Status Check

Run these checks in your browser console while on `/creator-dashboard/social`:

### 1. Check Environment Variables
```javascript
console.log({
  tiktokClientKey: import.meta.env.VITE_TIKTOK_CLIENT_KEY,
  youtubeClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  spotifyClientId: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
  youtubeRedirect: import.meta.env.VITE_YOUTUBE_REDIRECT_URI,
  spotifyRedirect: import.meta.env.VITE_SPOTIFY_REDIRECT_URI,
  currentOrigin: window.location.origin
});
```

**Expected Output:**
```javascript
{
  tiktokClientKey: "sbawqsggulolxfgsad",
  youtubeClientId: "<your-google-client-id>",  // Should NOT be undefined
  spotifyClientId: "<your-spotify-client-id>", // Should NOT be undefined
  youtubeRedirect: "https://...janeway.replit.dev/youtube-callback",
  spotifyRedirect: "https://...janeway.replit.dev/spotify-callback",
  currentOrigin: "https://...janeway.replit.dev"
}
```

**If any are `undefined`:** Environment variables not loaded. Restart dev server after adding secrets.

---

### 2. Test OAuth URL Generation

```javascript
// Test TikTok
const tiktokAPI = new TikTokAPI();
console.log('TikTok Auth URL:', tiktokAPI.getAuthUrl());

// Test YouTube  
const youtubeAPI = new YouTubeAPI();
console.log('YouTube Auth URL:', youtubeAPI.getAuthUrl());

// Test Spotify
const spotifyAPI = new SpotifyAPI();
console.log('Spotify Auth URL:', spotifyAPI.getAuthUrl());
```

Copy each URL and try opening it in a new tab manually. You should see the OAuth consent screen.

---

### 3. Check Callback Routes Exist

Visit these URLs directly (will show loading screen even without params):
- `https://your-domain.janeway.replit.dev/tiktok-callback`
- `https://your-domain.janeway.replit.dev/youtube-callback`
- `https://your-domain.janeway.replit.dev/spotify-callback`

**If you get 404:** Route not registered in `App.tsx`

---

### 4. Check Redirect URI Configuration

For each platform, the redirect URI in their developer console MUST EXACTLY match:

#### TikTok Developer Console
- Go to: https://developers.tiktok.com/apps/
- Select your app
- Navigate to: Login Kit → Settings
- Check "Redirect domain": Should include your full callback URL
- ✅ `https://81905ce2-383a-4f34-a786-de23b33f10cb-00-3bmrhe6m2al7v.janeway.replit.dev/tiktok-callback`

#### Google Cloud Console (YouTube)
- Go to: https://console.cloud.google.com/apis/credentials
- Click your OAuth 2.0 Client ID
- Check "Authorized redirect URIs"
- ✅ Should include: `https://81905ce2-383a-4f34-a786-de23b33f10cb-00-3bmrhe6m2al7v.janeway.replit.dev/youtube-callback`

#### Spotify Developer Dashboard
- Go to: https://developer.spotify.com/dashboard/applications
- Click your app
- Check "Redirect URIs"
- ✅ Should include: `https://81905ce2-383a-4f34-a786-de23b33f10cb-00-3bmrhe6m2al7v.janeway.replit.dev/spotify-callback`

---

## Common Issues & Solutions

### Issue: Popup Opens but Immediately Closes
**Cause:** Redirect URI mismatch
**Solution:** Ensure redirect URI in developer console matches exactly (including https://, no trailing slash)

### Issue: Popup Shows "redirect_uri_mismatch" Error
**Cause:** OAuth app not configured with your callback URL
**Solution:** Add callback URL to platform's developer console

### Issue: Popup Stays Open, Never Closes
**Cause:** Callback page not posting message back to opener
**Solution:** Check browser console in popup window for errors

### Issue: "Client ID not configured" Warning
**Cause:** Environment variable not loaded
**Solution:** 
1. Verify secret is added in Replit Secrets
2. Restart dev server (stop and start Replit)
3. Hard refresh browser (Ctrl+Shift+R)

### Issue: Connection Appears to Work but Doesn't Save
**Cause:** Backend API error
**Solution:** 
1. Check Network tab for failed API requests
2. Look for 401/403/500 errors
3. Check server logs for error messages

---

## Step-by-Step Debug Process

### For TikTok:

1. **Click "Connect TikTok" button**
2. **Watch console for:**
   ```
   [TikTok] Generated auth URL: https://www.tiktok.com/v2/auth/authorize/...
   ```
3. **Does popup open?**
   - No → Check browser popup blocker, try again
   - Yes → Continue

4. **In popup, do you see TikTok login?**
   - No (error page) → Redirect URI mismatch, check developer console
   - Yes → Continue

5. **After authorizing, does popup close automatically?**
   - No → Check `/tiktok-callback` page, look for errors in popup console
   - Yes → Continue

6. **In main window, do you see success toast?**
   - No → Check main window console for errors
   - Yes → Connection should be complete

### For YouTube:

1. **Click "Connect YouTube" button**
2. **Watch console for:**
   ```
   [YouTube] Opening popup: https://accounts.google.com/o/oauth2/v2/auth...
   ```
3. **Does popup open?**
   - No → Check browser popup blocker, try again
   - Yes → Continue

4. **In popup, do you see Google OAuth consent?**
   - No (error page) → Check Google Console redirect URIs
   - Yes → Continue

5. **After granting permissions, does popup close?**
   - No → Check `/youtube-callback` page logs
   - Yes → Continue

6. **Check Network tab for:**
   ```
   POST /api/social/youtube/token → Should return 200 OK
   GET /api/social/youtube/me → Should return channel info
   ```

### For Spotify:

1. **Click "Connect Spotify" button**
2. **Watch console for:**
   ```
   [Spotify] Opening popup: https://accounts.spotify.com/authorize...
   ```
3. **Does popup open?**
   - No → Check browser popup blocker
   - Yes → Continue

4. **In popup, do you see Spotify login?**
   - No → Check Spotify Dashboard redirect URIs
   - Yes → Continue

5. **After authorizing, does popup close?**
   - No → Check `/spotify-callback` page
   - Yes → Continue

6. **Check Network tab for:**
   ```
   POST /api/social/spotify/token → Should return 200 OK
   GET /api/social/spotify/me → Should return user info
   ```

---

## Server-Side Debugging

If connections are failing after popup closes, check server logs:

### YouTube Token Exchange Fails:
```bash
# Check if this endpoint is working
curl -X POST http://localhost:5000/api/social/youtube/token \
  -H "Content-Type: application/json" \
  -d '{"code":"test","redirectUri":"http://test"}'
```

Should return error (because code is invalid) but endpoint should exist.

### Spotify Token Exchange Fails:
```bash
curl -X POST http://localhost:5000/api/social/spotify/token \
  -H "Content-Type: application/json" \
  -d '{"code":"test","redirectUri":"http://test"}'
```

Should return error but endpoint should exist.

---

## Emergency Fixes

### If Instagram Still Has Issues:
```bash
# Clear localStorage
localStorage.clear();
# Hard refresh
location.reload();
```

### If Facebook Rate Limit Persists:
Wait 1 hour for Facebook's rate limit to reset, or use a different Facebook account for testing.

### If All Else Fails:
1. Open incognito/private window
2. Log in fresh
3. Try connecting again
4. This eliminates cached auth state issues

---

## What Success Looks Like

**Console logs after successful connection:**
```
[Platform] Opening OAuth popup: https://...
[Platform] Popup closed, processing result
[Platform] Connection successful
✅ Success toast appears: "Platform Connected!"
```

**Network tab after successful connection:**
```
POST /api/social/<platform>/token → 200 OK
GET /api/social/<platform>/me → 200 OK  
POST /api/social-connections → 200 OK
```

**UI updates:**
- Connection button changes from "Connect" to "Disconnect"
- Platform name shows as connected
- Follower/subscriber count appears (if available)

---

## Need More Help?

If connections still fail after checking all the above:

1. **Copy exact error messages** from:
   - Main window console
   - Popup window console (before it closes)
   - Network tab (failed requests)
   - Server logs

2. **Take screenshots** of:
   - Developer console redirect URI settings
   - Replit environment variables (hide sensitive values)
   - Browser console errors

3. **Note the exact flow:**
   - Does popup open? Yes/No
   - Does OAuth page load? Yes/No
   - After auth, does popup close? Yes/No
   - Does toast appear? Yes/No
   - What's the last log message before failure?

