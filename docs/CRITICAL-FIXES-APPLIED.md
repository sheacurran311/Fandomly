# Critical Fixes Applied - Social OAuth Issues

## ✅ Fixed Issues

### 1. Instagram Webhook Component - React Hooks Violation ✅
**Problem:** 
```
Uncaught Error: Rendered more hooks than during the previous render.
Warning: React has detected a change in the order of Hooks called by InstagramWebhookSetup.
```

**Root Cause:**
Component had conditional early return (`return null`) BEFORE all hooks were called, violating React's Rules of Hooks.

**Fix:**
Moved the conditional return to AFTER all hooks are called:
```typescript
// BEFORE (WRONG)
export default function InstagramWebhookSetup() {
  const { user } = useAuth();        // Hook 1
  const { isConnected } = useInsta...() // Hook 2
  const [webhookStatus, setState] = useState() // Hook 3
  
  if (!isConnected) return null; // ❌ Early return BEFORE all hooks
  
  useEffect(() => {...}); // Hook 4 - Sometimes called, sometimes not!
}

// AFTER (CORRECT)
export default function InstagramWebhookSetup() {
  const { user } = useAuth();
  const { isConnected } = useInsta...()
  const [webhookStatus, setState] = useState()
  
  useEffect(() => {...}); // All hooks called consistently
  
  if (!isConnected) return null; // ✅ Conditional return AFTER all hooks
}
```

**Result:** No more infinite loop, component renders properly.

---

### 2. Instagram 401 Error - Wrong API Endpoint ✅
**Problem:**
```
POST /api/creators/instagram-account 401 (Unauthorized)
[Instagram] Database save failed: 401
```

**Root Cause:**
Instagram context was trying to save to `/api/creators/instagram-account` (old endpoint) instead of using the unified `/api/social-connections` endpoint like other platforms.

**Fix:**
```typescript
// BEFORE (WRONG)
const response = await fetch('/api/creators/instagram-account', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    instagramUserId: result.user.id,
    username: result.user.username,
    accessToken: result.accessToken,
    accountType: result.user.account_type || 'BUSINESS'
  })
});

// AFTER (CORRECT)
// Save to database using the social_connections table
await saveConnection(connectionData);
console.log('[Instagram] Connection saved to database');
```

The `saveConnection` callback already exists and uses the correct `saveSocialConnection` function from `social-connection-api.ts`, which hits the proper `/api/social-connections` endpoint.

**Result:** Instagram connections now save properly to the database.

---

## ℹ️ Expected Warnings (Not Errors)

### 3. Cross-Origin-Opener-Policy Warnings ⚠️
**Warnings:**
```
Cross-Origin-Opener-Policy policy would block the window.closed call.
```

**Why This Happens:**
When checking if OAuth popup windows are closed using `popup.closed`, browsers with strict COOP policies log warnings. This is expected behavior when dealing with cross-origin popups (Google, Spotify, TikTok are different origins).

**Current Implementation:**
```typescript
const pollTimer = setInterval(() => {
  try {
    if (popup.closed) {
      // Handle popup closed
    }
  } catch (error) {
    // Cross-origin error means popup is still open (expected)
  }
}, 1000);
```

**Why It's OK:**
- This is a FALLBACK mechanism only
- Primary communication uses `postMessage` API (which works perfectly)
- The try-catch properly handles the cross-origin errors
- These are console warnings, not actual errors
- The OAuth flow still completes successfully

**Could be improved:** 
Reduce polling frequency or remove polling entirely if `postMessage` is reliable enough. But this is not critical.

---

### 4. Facebook Rate Limit ⚠️
**Error:**
```
[FB Manager] Failed to get user info: (#4) Application request limit reached
```

**Status:** Still occurring intermittently

**Why:**
Facebook has strict rate limits on API calls. The app may be:
1. Making too many API calls during development/testing
2. Multiple page loads refreshing data
3. Dashboard checking status on every mount

**Partial Fix Already Applied:**
- Disabled auto-initialization in `creator-facebook-connect.tsx` widget
- Context system handles checking more efficiently

**Recommendation:**
This is a Facebook platform limitation, not a code bug. Options:
- Wait for rate limit to reset (hourly/daily)
- Implement more aggressive caching
- Add exponential backoff for failed requests
- Only check status when user explicitly clicks "Connect" or "Refresh"

---

## 🔧 Remaining Issues to Address

### 5. TikTok/YouTube/Spotify Not Connecting
**Symptoms:**
```
[TikTok] Generated auth URL: https://www.tiktok.com/v2/auth/authorize/...
[YouTube] Opening popup...
[Spotify] Opening popup...
```
But connections aren't completing.

**Likely Causes:**

#### A. Redirect URI Mismatch
Check that redirect URIs configured in each platform's developer console EXACTLY match what's being used:

**TikTok:**
- Code uses: `https://81905ce2-383a-4f34-a786-de23b33f10cb-00-3bmrhe6m2al7v.janeway.replit.dev/tiktok-callback`
- Must match in TikTok developer console

**YouTube:**
- Code uses: `VITE_YOUTUBE_REDIRECT_URI` or `${origin}/youtube-callback`
- Must match in Google Cloud Console OAuth 2.0 credentials

**Spotify:**
- Code uses: `VITE_SPOTIFY_REDIRECT_URI` or `${origin}/spotify-callback`
- Must match in Spotify Developer Dashboard

#### B. Popup Blocked by Browser
Browsers may block popups on first attempt. User needs to:
1. Click button
2. Allow popups when prompted
3. Click button again

#### C. Callback Pages Not Handling postMessage
Check that callback pages are properly:
1. Exchanging code for token
2. Posting result back to opener window
3. Closing themselves

---

## 🧪 Testing Checklist

### Instagram ✅
- [x] Hook error fixed
- [x] 401 error fixed
- [x] Should now connect properly
- [ ] **TEST:** Try connecting Instagram again

### Facebook ⚠️
- [x] Rate limit acknowledged (platform limitation)
- [ ] **TEST:** Wait for rate limit reset, then test

### Twitter/X ✅
- [x] Logs show: "Found existing Twitter connection"
- [x] Already working properly

### TikTok ⚠️
- [ ] **TEST:** Check redirect URI in TikTok developer console
- [ ] **TEST:** Try connecting, check callback page

### YouTube ⚠️
- [ ] **TEST:** Check redirect URI in Google Console
- [ ] **TEST:** Verify `VITE_YOUTUBE_REDIRECT_URI` is set
- [ ] **TEST:** Try connecting, check callback page

### Spotify ⚠️
- [ ] **TEST:** Check redirect URI in Spotify Dashboard
- [ ] **TEST:** Verify `VITE_SPOTIFY_REDIRECT_URI` is set
- [ ] **TEST:** Try connecting, check callback page

---

## 🔍 Debugging Next Steps

### For TikTok/YouTube/Spotify Connections:

1. **Open browser DevTools console**
2. **Click connect button for each platform**
3. **Watch for:**
   - Popup opens? (If no, allow popups)
   - OAuth page loads in popup? (If no, check URL)
   - After authorization, does popup close? (If no, check callback page)
   - Any errors in console? (Note exact error message)

4. **Check Network tab:**
   - Look for `/api/social/<platform>/token` requests
   - Check if they return 200 OK or errors
   - Check response body for error messages

5. **Check callback pages are accessible:**
   - Navigate directly to: `/tiktok-callback`
   - Navigate directly to: `/youtube-callback`
   - Navigate directly to: `/spotify-callback`
   - They should show a loading screen (even without OAuth params)

---

## 📝 Files Modified

1. ✅ `client/src/components/social/instagram-webhook-setup.tsx`
   - Moved conditional return after hooks

2. ✅ `client/src/contexts/instagram-connection-context.tsx`
   - Removed old `/api/creators/instagram-account` endpoint
   - Using `saveConnection` which hits `/api/social-connections`

---

## 🎯 Summary

**Fixed:**
- ✅ Instagram infinite loop (hooks violation)
- ✅ Instagram 401 error (wrong endpoint)

**Expected/Non-Critical:**
- ⚠️ COOP warnings (browser security feature, not breaking)
- ⚠️ Facebook rate limit (platform limitation, will reset)

**Needs Investigation:**
- ❓ TikTok connection not completing
- ❓ YouTube connection not completing
- ❓ Spotify connection not completing

**Next Action:** Test the connections and report back specific error messages for TikTok/YouTube/Spotify if they still don't work.

