# Production Landing Page Deployment Guide

## ✅ Ready to Deploy!

All beta signup features are complete and tested:

### Features Implemented

1. **Beta Signup Form** with email validation
2. **1,000 Welcome Points** automatically credited when users sign up
3. **Duplicate Prevention** - users can't claim points twice
4. **Success Modal** with animated points counter and confetti
5. **Landing-Only Mode** for production deployment

## Deployment Steps

### 1. Set Environment Variable

In your production hosting platform (Replit, Vercel, etc.), add:

```
VITE_LANDING_ONLY=true
```

This strips the app down to just the landing page - no navigation, no footer, no auth flows.

### 2. Deploy

Build and deploy as normal:
```bash
npm run build
npm start
```

Your production site will show ONLY the landing page at all routes.

### 3. Database (Already Done ✓)

- ✅ `beta_signups` table created
- ✅ Tracking columns (`claimed`, `claimed_at`, `claimed_by_user_id`) added
- ✅ Beta signup service integrated into auth flow

## How Points Work

### User Flow:
1. **User signs up** on landing page with `user@example.com`
   - Stored in `beta_signups` table
   - `claimed = false`

2. **When beta launches**, user logs in with Google (email: `user@example.com`)
   - Server checks if email exists in `beta_signups` with `claimed = false`
   - If yes: Credits 1,000 platform points
   - Marks signup as `claimed = true`
   - Records `claimed_at` and `claimed_by_user_id`

3. **Points appear immediately** in user's account
   - Stored in `platform_points_transactions` table
   - Source: `"beta_welcome"`
   - Can be used for rewards, monthly fees, swag

### Preventing Double-Claims:
- Email is checked as lowercase (case-insensitive matching)
- `claimed` flag prevents re-crediting if user logs out/in
- Each beta signup can only be claimed once

## Development vs Production

### Development (no env var set):
- Full app with all features
- Navigation with all links
- Footer with product information
- Authentication flows work
- Landing page accessible at `/` without redirect

### Production (`VITE_LANDING_ONLY=true`):
- **ONLY** landing page content
- No navigation bar
- Minimal footer (logo, social, legal only)
- No authentication
- Beta signup form works (public API)
- All routes show the same landing page

## Testing Checklist

Before deploying:
- [ ] Beta signup form submits successfully
- [ ] Success modal shows "1,000 Fandomly Points"
- [ ] Duplicate email shows "already registered" message
- [ ] Form validation works (invalid email shows error)
- [ ] `VITE_LANDING_ONLY=true` env variable set in production

After going live:
- [ ] Submit a test beta signup
- [ ] Later: Log in with that email's social account
- [ ] Verify 1,000 points appear in account
- [ ] Check database: `beta_signups.claimed = true` for that email

## Database Queries

### Check beta signups:
```sql
SELECT email, claimed, claimed_at, created_at 
FROM beta_signups 
ORDER BY created_at DESC;
```

### Check if points were credited:
```sql
SELECT u.email, ppt.points, ppt.source, ppt.created_at
FROM platform_points_transactions ppt
JOIN users u ON ppt.user_id = u.id
WHERE ppt.source = 'beta_welcome'
ORDER BY ppt.created_at DESC;
```

## Files Modified

- `client/src/App.tsx` - Landing-only mode
- `client/src/pages/home.tsx` - Enhanced signup form, modal, footer
- `server/routes/auth/auth-routes.ts` - Points attribution on signup
- `server/services/beta-signup-service.ts` - Points claiming logic
- `server/routes/beta-signup-routes.ts` - Beta signup API (CSRF skip)
- `server/index.ts` - CSRF exemption for public form
- `shared/schema.ts` - Beta signup schema with claimed tracking

## Support

If anything doesn't work:
1. Check server logs for `[Beta Signup]` messages
2. Verify `beta_signups` table exists
3. Ensure `VITE_LANDING_ONLY=true` is set in production
4. Check database for email (case-insensitive)

---

🎉 **You're ready to collect beta signups and automatically reward your first users!**
