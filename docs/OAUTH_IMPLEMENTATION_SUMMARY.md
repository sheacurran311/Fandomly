# Google/YouTube OAuth Split - Implementation Summary

## ✅ Completed Changes

### 1. Created YouTube Auth Service

**File:** `server/services/auth/youtube-auth.ts`

New dedicated service for YouTube OAuth with:

- `exchangeYouTubeCode()` - Token exchange using GOOGLE_YOUTUBE_CLIENT_ID
- `refreshYouTubeTokens()` - Token refresh using GOOGLE_YOUTUBE_CLIENT_ID
- `getYouTubeAuthUrl()` - Generate OAuth URL with YouTube scopes
- `getYouTubeOAuthStatus()` - Check configuration status

**Scopes:** `youtube.readonly`, `openid`, `email`, `profile`

### 2. Updated Social Routes

**File:** `server/routes/social/social-routes.ts`

- `exchangeYouTubeToken()` now imports and uses `exchangeYouTubeCode()` from youtube-auth service
- `refreshYouTubeToken()` now imports and uses `refreshYouTubeTokens()` from youtube-auth service
- Endpoints remain the same (backward compatible)

### 3. Updated Frontend YouTube Integration

**File:** `client/src/lib/social-integrations.ts`

- Changed to use `VITE_GOOGLE_YOUTUBE_CLIENT_ID` instead of `VITE_GOOGLE_CLIENT_ID`
- Updated scopes: Removed unused `youtube.channel-memberships.creator`
- New scopes: `youtube.readonly openid email profile`

### 4. Created Documentation

**File:** `server/services/auth/README.md`

Comprehensive guide covering:

- OAuth configuration for both clients
- Environment variables
- User flows
- Google Cloud Console setup
- Security best practices
- Troubleshooting guide

---

## 🔧 Required Environment Variables

### Backend (.env)

You need to add these NEW environment variables:

```bash
# YouTube Integration (NEW - use your YouTube OAuth client credentials)
GOOGLE_YOUTUBE_CLIENT_ID=your-youtube-client-id.apps.googleusercontent.com
GOOGLE_YOUTUBE_CLIENT_SECRET=your-youtube-client-secret

# Basic Google Auth (EXISTING - should already be set)
GOOGLE_CLIENT_ID=your-basic-auth-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-basic-auth-client-secret
```

### Frontend (.env)

You need to add this NEW environment variable:

```bash
# YouTube Integration (NEW)
VITE_GOOGLE_YOUTUBE_CLIENT_ID=your-youtube-client-id.apps.googleusercontent.com

# Basic Google Auth (EXISTING - should already be set)
VITE_GOOGLE_CLIENT_ID=your-basic-auth-client-id.apps.googleusercontent.com

# YouTube Callback (EXISTING - should already be set)
VITE_YOUTUBE_REDIRECT_URI=https://fandomly.ai/youtube-callback
```

---

## 🎯 Google Cloud Console Configuration

### Basic Auth Client (Already Configured)

- Client ID → `GOOGLE_CLIENT_ID`
- Client Secret → `GOOGLE_CLIENT_SECRET`
- Callback URL: `https://fandomly.ai/google-callback`
- Scopes: `openid`, `email`, `profile`

### YouTube OAuth Client (Already Created)

- Client ID → `GOOGLE_YOUTUBE_CLIENT_ID` & `VITE_GOOGLE_YOUTUBE_CLIENT_ID`
- Client Secret → `GOOGLE_YOUTUBE_CLIENT_SECRET`
- Callback URL: `https://fandomly.ai/youtube-callback`
- Scopes: `openid`, `email`, `profile`, `youtube.readonly`

**Important:** Make sure both callback URLs are added to the "Authorized redirect URIs" list for their respective OAuth clients in Google Cloud Console.

---

## 🔄 How It Works Now

### Basic Sign-In Flow (All Users)

```
User → "Sign in with Google"
     → Google OAuth (GOOGLE_CLIENT_ID)
     → Consent: email, profile only
     → /google-callback
     → Session created
```

### YouTube Connection Flow (Creators Only)

```
Creator (already signed in) → "Connect YouTube"
     → Google OAuth (GOOGLE_YOUTUBE_CLIENT_ID)
     → Consent: YouTube access + identity
     → /youtube-callback
     → YouTube tokens stored
     → YouTube features enabled
```

---

## ✅ Testing Checklist

### Backend Testing

- [ ] Set `GOOGLE_YOUTUBE_CLIENT_ID` and `GOOGLE_YOUTUBE_CLIENT_SECRET` in `.env`
- [ ] Restart server
- [ ] Check logs: No "YouTube OAuth credentials not configured" errors
- [ ] Test YouTube token exchange: POST to `/api/social/youtube/token`
- [ ] Test YouTube token refresh: POST to `/api/social/youtube/refresh`

### Frontend Testing

- [ ] Set `VITE_GOOGLE_YOUTUBE_CLIENT_ID` in `.env`
- [ ] Rebuild frontend (if needed)
- [ ] Test YouTube connection flow:
  - Creator signs in with basic Google auth
  - Creator clicks "Connect YouTube"
  - Consent screen shows YouTube permissions
  - Connection succeeds

### Scope Verification

- [ ] Basic sign-in shows ONLY: email, profile permissions
- [ ] YouTube connect shows: email, profile, "View your YouTube account"
- [ ] Fans never see YouTube permissions
- [ ] Creators see YouTube permissions only when connecting channel

---

## 🚨 Important Notes

### Backward Compatibility

- ✅ Existing routes unchanged
- ✅ Existing tokens continue working
- ✅ No database migrations needed
- ✅ Users don't need to re-authenticate immediately

### When Tokens Expire

When existing YouTube tokens expire, users will need to re-authenticate using the new YouTube OAuth client. This is expected and will happen automatically the first time they try to use a YouTube feature after token expiry.

### Scope Changes

Removed `youtube.channel-memberships.creator` scope because:

- Not used in current codebase
- No API calls require it
- Reduces requested permissions

If you need membership features in the future:

1. Add the scope back to `youtube-auth.ts` line 143
2. Update `social-integrations.ts` line 365
3. Re-submit for Google verification (it's a sensitive scope)

---

## 📝 Next Steps

1. **Set environment variables** in your production and development environments
2. **Update Google Cloud Console** redirect URIs if needed
3. **Test the basic auth flow** with a new user
4. **Test the YouTube flow** with a creator account
5. **Monitor logs** for any OAuth errors
6. **Update any documentation** that references OAuth setup

---

## 🐛 Troubleshooting

### "YouTube OAuth credentials not configured"

- Check `GOOGLE_YOUTUBE_CLIENT_ID` and `GOOGLE_YOUTUBE_CLIENT_SECRET` are set
- Restart the server
- Verify no typos in variable names

### "redirect_uri_mismatch"

- Verify callback URLs in Google Cloud Console exactly match:
  - Basic Auth: `https://fandomly.ai/google-callback`
  - YouTube: `https://fandomly.ai/youtube-callback`
- Case-sensitive, must include https://, no trailing slash

### YouTube API 403 Errors

- Check YouTube Data API v3 is enabled in Google Cloud Console
- Verify tokens aren't expired
- Confirm `youtube.readonly` scope is in consent screen

---

## 📚 Documentation

Full documentation available in:

- **OAuth Guide:** `server/services/auth/README.md`
- **YouTube Auth Service:** `server/services/auth/youtube-auth.ts`
- **Basic Auth Service:** `server/services/auth/google-auth.ts`

---

## ✨ Benefits Achieved

1. ✅ **Minimal Scopes**: Fans only grant email/profile, not YouTube
2. ✅ **Clear Consent**: Users understand exactly what they're granting
3. ✅ **Security**: Separate tokens for separate purposes
4. ✅ **Compliance**: Follows Google OAuth best practices
5. ✅ **Flexibility**: Easy to add more scopes per client as needed

---

## 🎉 You're All Set!

The code changes are complete. Just add the environment variables and you're ready to go!
