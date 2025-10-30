# Bug Fix: Twitter OAuth Race Condition in React StrictMode

**Date**: October 15, 2025  
**Issue**: Twitter OAuth connection failing despite successful token exchange  
**Severity**: High (blocking feature)  
**Status**: ✅ Fixed

## Problem Description

Twitter OAuth was failing to connect even though the authorization flow was completing successfully. The popup would open, user would authorize, callback would execute, but the connection would not be saved and an error would be shown.

### Symptoms

- Twitter OAuth popup opens correctly
- User authorizes successfully on Twitter
- Callback page loads with code and state
- Token exchange succeeds (visible in logs)
- But error is returned to parent window: `"Callback already processed"`
- Connection not saved

### Console Evidence

```javascript
[X-Callback] handleCallbackFromWindow result: {success: false, error: 'Callback already processed'}
[Twitter] exchangeCodeForToken returned: token (eHcwMVF4Ml...)  // ✅ Token was obtained!
[X-Callback] Posting result to opener: {success: false, error: 'Callback already processed'}  // ❌ But error posted!
```

## Root Cause

**React StrictMode Double-Rendering in Development**

In development mode, React's StrictMode intentionally runs effects twice to help detect side effects. This caused the Twitter callback handler to run twice:

1. **First run**: Successfully exchanges code for token, caches result ✅
2. **Second run**: Blocked by idempotency lock, returns error ❌
3. **The error from the second run was posted to the opener window**, overwriting the success!

### Why It Happened

The `x-callback.tsx` page uses a `useEffect` with a `ranRef` to prevent double-execution, but React StrictMode still caused the effect to run twice before the ref could block it. The sequence was:

```
1. Effect runs (first time)
   - ranRef.current = false
   - Sets ranRef.current = true
   - Calls handleCallbackFromWindow() → SUCCESS
   - Caches result in sessionStorage
   
2. Effect runs again (StrictMode)
   - ranRef.current = true (should block)
   - BUT: Component unmounted/remounted, ref reset
   - Calls handleCallbackFromWindow() → ERROR (idempotency lock)
   - Posts ERROR to opener (overwrites success!)
```

## The Fix

**File**: `client/src/pages/x-callback.tsx`

### Changes Made

1. **Check for cached success when error occurs**
2. **Wait for first run to complete if needed**
3. **Use cached success result instead of error**

### Before (Broken)

```typescript
let result = await TwitterSDKManager.handleCallbackFromWindow();

// Only checked cache if result was explicitly falsy
if (!result?.success && state) {
  // Try to get cached result...
}

// Posted whatever result we had (could be error from 2nd run)
opener.postMessage({ type: "twitter-oauth-result", result }, origin);
```

### After (Fixed)

```typescript
let result = await TwitterSDKManager.handleCallbackFromWindow();
console.log('[X-Callback] handleCallbackFromWindow result:', result);

// If duplicate-callback was blocked OR if we got an error, try to reuse the cached success
// This handles React StrictMode double-rendering in development
if ((!result?.success || result?.error === 'Callback already processed') && state) {
  console.log('[X-Callback] Got error/failure, checking for cached success...');
  try {
    // First check immediately
    let cached = sessionStorage.getItem(`tw_cb_result_${state}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.success) {
        console.log('[X-Callback] Found cached success result immediately');
        result = parsed;
      }
    }
    
    // If still no success, wait and try again (for race conditions)
    if (!result?.success) {
      console.log('[X-Callback] No cached result yet, waiting 600ms...');
      await new Promise(r => setTimeout(r, 600));
      cached = sessionStorage.getItem(`tw_cb_result_${state}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.success) {
          console.log('[X-Callback] Found cached success result after wait');
          result = parsed;
        }
      }
    }
  } catch (e) {
    console.error('[X-Callback] Error checking cached result:', e);
  }
}

// Now post the correct result (success from cache, not error from 2nd run)
opener.postMessage({ type: "twitter-oauth-result", result }, origin);
```

### Key Improvements

1. **Detects "Callback already processed" error** specifically
2. **Checks sessionStorage for cached success** from first run
3. **Waits 600ms** if cache not found yet (handles race condition)
4. **Uses cached success** instead of posting error
5. **Better logging** to debug the flow

## How It Works Now

### Successful Flow

```
1. Popup opens with Twitter OAuth URL
2. User authorizes on Twitter
3. Twitter redirects to /x-callback?code=...&state=...
4. Callback page loads

5. First useEffect run:
   - Calls handleCallbackFromWindow()
   - Exchanges code for token ✅
   - Saves connection to database ✅
   - Caches result in sessionStorage ✅
   - Returns success

6. Second useEffect run (StrictMode):
   - Calls handleCallbackFromWindow()
   - Blocked by idempotency lock ❌
   - Returns error: "Callback already processed"
   
7. Error handler kicks in:
   - Detects error
   - Checks sessionStorage for cached result
   - Finds cached success from first run ✅
   - Replaces error with cached success
   
8. Posts SUCCESS to opener window ✅
9. Popup closes
10. Parent window receives success
11. Connection saved and UI updates ✅
```

## Testing

### Manual Testing Steps

1. Navigate to any page with Twitter connect button
2. Click "Connect X" or "Connect Twitter"
3. Popup should open
4. Authorize on Twitter
5. Popup should close automatically
6. Check console for logs:
   - Should see "Found cached success result"
   - Should see "Posting result to opener: {success: true}"
7. Twitter connection should be saved
8. UI should update to show connected state

### Expected Console Logs

```
[Twitter] Starting OAuth with state: twitter_creator_...
[X-Callback] Starting Twitter OAuth callback processing...
[X-Callback] handleCallbackFromWindow result: {success: true, ...}
[X-Callback] Posting result to opener: {success: true, ...}
[X-Callback] Posted to opener, closing popup...
```

Or if second run happens:

```
[X-Callback] handleCallbackFromWindow result: {success: false, error: 'Callback already processed'}
[X-Callback] Got error/failure, checking for cached success...
[X-Callback] Found cached success result immediately
[X-Callback] Posting result to opener: {success: true, ...}
```

## Why This Only Affected Development

This issue was primarily visible in **development mode** because:

1. **React StrictMode** is only enabled in development
2. StrictMode intentionally double-renders to catch bugs
3. Production builds don't have StrictMode enabled
4. However, the fix is still valuable for production edge cases

## Related Code

### Files Modified

- `/client/src/pages/x-callback.tsx` - Fixed race condition handling

### Files Involved (Not Modified)

- `/client/src/lib/twitter.ts` - Twitter SDK Manager (already had caching)
- `/client/src/components/social/creator-twitter-widget.tsx` - Connect button
- `/client/src/pages/profile.tsx` - Profile page with Twitter connect
- `/client/src/pages/creator-dashboard/social.tsx` - Social dashboard

### Backend (Working Correctly)

- `/server/social-routes.ts` - Token exchange endpoint
- Token exchange was always working
- Connection saving was always working
- Issue was purely frontend race condition

## Prevention

To prevent similar issues in the future:

1. **Always check for cached success** when handling OAuth callbacks
2. **Handle React StrictMode** double-rendering explicitly
3. **Use idempotency locks** with cache fallbacks
4. **Add comprehensive logging** for OAuth flows
5. **Test in development mode** (where StrictMode is active)

## Additional Notes

### Why Not Just Disable StrictMode?

React StrictMode is valuable for catching bugs and should not be disabled. Instead, we should write code that handles double-rendering gracefully.

### Why sessionStorage Instead of localStorage?

`sessionStorage` is used for OAuth state to:
- Isolate between tabs
- Auto-clear when tab closes
- Prevent cross-tab interference

### Production Behavior

In production (without StrictMode), the callback will only run once, and the cached result check will be a no-op. The fix adds minimal overhead and provides robustness.

---

**Status**: ✅ Fixed and tested  
**Deployed**: Pending user confirmation  
**Follow-up**: Monitor for any remaining OAuth issues

