# OAuth Configuration Guide

This document explains how OAuth authentication is configured in the Fandomly platform, including the separation between basic Google authentication and YouTube-specific integration.

## Overview

We use **two separate OAuth clients** to follow the principle of least privilege:

1. **Basic Google Auth Client** - For user sign-in (fans, creators, brands)
2. **YouTube OAuth Client** - For creators connecting their YouTube channels

This separation ensures:
- Fans only grant minimal identity permissions
- Creators explicitly consent to YouTube access when needed
- Clear audit trail for different permission types
- Reduced security risk if tokens are compromised

---

## Basic Google Authentication (Sign In)

### Purpose
Used for all users (fans, creators, brands) to sign into the Fandomly platform.

### Configuration

**Environment Variables:**
- Server: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Client: `VITE_GOOGLE_CLIENT_ID`

**OAuth Scopes:**
- `openid` - OpenID Connect authentication
- `email` - User's email address
- `profile` - Basic profile info (name, avatar)

**Endpoints:**
- `GET /api/auth/google` - Initiates OAuth flow
- `POST /api/auth/google/callback` - Handles OAuth callback and creates user session
- `GET /api/auth/google/url` - Returns OAuth URL for client-side redirect

**Callback URL:**
- Production: `https://fandomly.ai/google-callback`
- Development: `http://localhost:5000/google-callback`

**Implementation:**
- Service: [`server/services/auth/google-auth.ts`](./google-auth.ts)
- Routes: [`server/routes/auth/google-routes.ts`](../routes/auth/google-routes.ts)

### What Users See

**Google Consent Screen:**
- "Sign in with Google"
- "Allow Fandomly to see your basic profile info"
- "Allow Fandomly to see your email address"

**Permissions Granted:**
- View your email address
- View your basic profile info

**Permissions NOT Granted:**
- YouTube access
- Google Drive access
- Gmail access
- Any other Google services

### Token Storage

Tokens are stored in the `social_connections` table:
- Platform: `'google'`
- Fields: `accessToken`, `refreshToken`, `tokenExpiresAt`
- User session created via JWT tokens

---

## YouTube Integration (Channel Connection)

### Purpose
Used for creators who want to connect their YouTube channel to enable YouTube-specific features like subscription verification, like tracking, and channel stats.

### Configuration

**Environment Variables:**
- Server: `GOOGLE_YOUTUBE_CLIENT_ID`, `GOOGLE_YOUTUBE_CLIENT_SECRET`
- Client: `VITE_GOOGLE_YOUTUBE_CLIENT_ID`

**OAuth Scopes:**
- `https://www.googleapis.com/auth/youtube.readonly` - Read YouTube account data
- `openid` - OpenID Connect authentication
- `email` - User's email address
- `profile` - Basic profile info

**Note:** The `youtube.channel-memberships.creator` scope was removed as it's not currently used.

**Endpoints:**
- `POST /api/social/youtube/token` - Exchanges authorization code for tokens
- `POST /api/social/youtube/refresh` - Refreshes expired access token
- `GET /api/social/youtube/me` - Gets channel information

**Callback URL:**
- Production: `https://fandomly.ai/youtube-callback`
- Development: `http://localhost:5000/youtube-callback`

**Implementation:**
- Service: [`server/services/auth/youtube-auth.ts`](./youtube-auth.ts)
- Routes: [`server/routes/social/social-routes.ts`](../routes/social/social-routes.ts) (lines 1396-1460)
- Client Integration: `client/src/lib/social-integrations.ts` (YouTubeAPI class)

### What Users See

**Google Consent Screen:**
- "Connect your YouTube channel"
- "Allow Fandomly to view your YouTube account"
- Shows YouTube logo and "YouTube Data API v3"

**Permissions Granted:**
- View your YouTube account (channel, videos, subscriptions, likes)

**Permissions NOT Granted:**
- Upload videos
- Delete content
- Modify playlists
- Manage channel settings
- Post comments

### Token Storage

Tokens are stored in the `social_connections` table:
- Platform: `'youtube'`
- Fields: `accessToken`, `refreshToken`, `tokenExpiresAt`, `platformUserId` (channel ID)

### YouTube API Calls

The `youtube.readonly` scope allows these API calls:

1. **Channel Info** - `GET /youtube/v3/channels`
   - Fetch channel details, statistics, subscriber count
   
2. **Subscription Verification** - `GET /youtube/v3/subscriptions`
   - Verify if user subscribed to a channel
   
3. **Like Verification** - `GET /youtube/v3/videos/getRating`
   - Verify if user liked a video
   
4. **Comment Fetching** - `GET /youtube/v3/commentThreads`
   - Fetch comments for verification tasks
   
5. **Video Statistics** - `GET /youtube/v3/videos`
   - Poll video metrics for group goals (views, likes, comments)

---

## User Flow

### Fan Sign-In Flow

```
1. Fan clicks "Sign in with Google"
2. Redirects to Google OAuth (GOOGLE_CLIENT_ID)
3. Google shows consent screen (email, profile only)
4. User approves
5. Redirects to /google-callback
6. Backend exchanges code for tokens
7. Creates user session (JWT)
8. User is logged in
```

**Result:** Fan has access to the platform but no YouTube permissions.

### Creator YouTube Connection Flow

```
1. Creator is already signed in (via basic Google auth)
2. Creator clicks "Connect YouTube Channel"
3. Redirects to Google OAuth (GOOGLE_YOUTUBE_CLIENT_ID)
4. Google shows consent screen (YouTube access requested)
5. User approves
6. Redirects to /youtube-callback
7. Backend exchanges code for YouTube tokens
8. Stores tokens in social_connections table
9. Creator's YouTube channel is now connected
```

**Result:** Creator can use YouTube features like task verification, channel stats, etc.

---

## Google Cloud Console Setup

### Basic Auth Client

1. Go to Google Cloud Console > APIs & Services > Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Name: "Fandomly Basic Auth"
4. Authorized redirect URIs:
   - `https://fandomly.ai/google-callback`
   - `http://localhost:5000/google-callback` (for development)
5. Copy Client ID and Client Secret to:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `VITE_GOOGLE_CLIENT_ID`

**OAuth Consent Screen:**
- Scopes: `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`
- No sensitive scopes needed

### YouTube OAuth Client

1. Go to Google Cloud Console > APIs & Services > Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Name: "Fandomly YouTube Integration"
4. Enable YouTube Data API v3
5. Authorized redirect URIs:
   - `https://fandomly.ai/youtube-callback`
   - `http://localhost:5000/youtube-callback` (for development)
6. Copy Client ID and Client Secret to:
   - `GOOGLE_YOUTUBE_CLIENT_ID`
   - `GOOGLE_YOUTUBE_CLIENT_SECRET`
   - `VITE_GOOGLE_YOUTUBE_CLIENT_ID`

**OAuth Consent Screen:**
- Scopes: `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`, `.../auth/youtube.readonly`
- Note: `youtube.readonly` is a **sensitive scope** requiring Google verification

---

## Environment Variables Summary

### Backend (.env)

```bash
# Basic Google Authentication
GOOGLE_CLIENT_ID=your-basic-auth-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-basic-auth-client-secret

# YouTube Integration
GOOGLE_YOUTUBE_CLIENT_ID=your-youtube-client-id.apps.googleusercontent.com
GOOGLE_YOUTUBE_CLIENT_SECRET=your-youtube-client-secret
```

### Frontend (.env)

```bash
# Basic Google Authentication
VITE_GOOGLE_CLIENT_ID=your-basic-auth-client-id.apps.googleusercontent.com

# YouTube Integration
VITE_GOOGLE_YOUTUBE_CLIENT_ID=your-youtube-client-id.apps.googleusercontent.com
VITE_YOUTUBE_REDIRECT_URI=https://fandomly.ai/youtube-callback
```

---

## Security Best Practices

1. **Separate Clients**: Never use the same OAuth client for both basic auth and YouTube
2. **Minimal Scopes**: Only request scopes absolutely necessary for functionality
3. **Token Storage**: Store refresh tokens securely (encrypted in production)
4. **Token Refresh**: Implement automatic token refresh for expired access tokens
5. **Consent Screen**: Keep consent screen clear and specific about permissions
6. **Audit Logging**: Log all OAuth flows for security auditing

---

## Troubleshooting

### "OAuth credentials not configured" Error

**Cause:** Environment variables not set correctly.

**Solution:**
- Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set for basic auth
- Check that `GOOGLE_YOUTUBE_CLIENT_ID` and `GOOGLE_YOUTUBE_CLIENT_SECRET` are set for YouTube
- Restart the server after updating `.env`

### "redirect_uri_mismatch" Error

**Cause:** Callback URL not authorized in Google Cloud Console.

**Solution:**
- Go to Google Cloud Console > Credentials > Your OAuth Client
- Add the exact callback URL to "Authorized redirect URIs"
- Common mistakes: missing `https://`, trailing slash, wrong domain

### Token Refresh Fails

**Cause:** Refresh token expired or revoked.

**Solution:**
- User needs to re-authenticate
- Ensure `access_type: 'offline'` is set in OAuth URL
- Ensure `prompt: 'consent'` to force refresh token issuance

### YouTube API Returns 403 Forbidden

**Cause:** Access token expired or insufficient permissions.

**Solution:**
- Check if token needs refresh (compare `tokenExpiresAt` with current time)
- Call `/api/social/youtube/refresh` to get new access token
- Verify YouTube Data API v3 is enabled in Google Cloud Console

---

## Testing

### Test Basic Google Auth

```bash
# Get OAuth URL
curl http://localhost:5000/api/auth/google/url?redirect_uri=http://localhost:5000/google-callback

# Open URL in browser, complete OAuth flow
# Backend should log "Google authentication successful"
```

### Test YouTube Integration

```bash
# User must be signed in first
# Frontend calls YouTubeAPI.secureLogin()
# Or manually construct OAuth URL using getYouTubeAuthUrl()

# After callback, verify token storage:
curl -H "Authorization: Bearer <access_token>" \
  http://localhost:5000/api/social/youtube/me
```

---

## Migration Notes

If you're migrating from a single OAuth client to split clients:

1. **Existing users**: No action required. They can continue using their existing sessions.
2. **YouTube tokens**: Existing YouTube tokens will continue to work until they expire.
3. **Re-authentication**: Users will need to re-authenticate with YouTube using the new client when their tokens expire.
4. **No data loss**: User data and connections remain intact.

---

## Related Documentation

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [YouTube Data API v3](https://developers.google.com/youtube/v3)
- [OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect)

---

## Support

For issues or questions:
- Check environment variables are set correctly
- Review server logs for detailed error messages
- Ensure Google Cloud Console configuration matches this guide
- Verify callback URLs are exactly correct (case-sensitive)
