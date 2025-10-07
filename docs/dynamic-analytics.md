# Dynamic Analytics Integration

## Overview

Fandomly's admin dashboard integrates with **Dynamic's Analytics API** to provide real-time insights into:
- Wallet connections and types
- User visits and engagement
- Authentication patterns
- Multi-chain analytics

## Quick Setup

### 1. Get Your Dynamic API Credentials
1. **Log in to Dynamic Dashboard**: https://app.dynamic.xyz/
2. **Navigate to**: Settings → API
3. **Copy**:
   - Environment ID
   - API Token

### 2. Add to Environment Variables
```bash
# Backend (Server-side)
DYNAMIC_ENVIRONMENT_ID=your-environment-id
DYNAMIC_API_KEY=your-api-key

# Frontend (Client-side)
VITE_DYNAMIC_ENVIRONMENT_ID=your-environment-id
VITE_DYNAMIC_API_KEY=your-public-key
```

### 3. Restart Server
The analytics dashboard will automatically connect to Dynamic.

## Implementation Details

### Backend Service (`server/dynamic-analytics-service.ts`)
- Core service for Dynamic API integration
- Bearer token authentication
- Environment ID URL resolution
- Error handling and logging

### Backend Routes (`server/dynamic-analytics-routes.ts`)
All routes protected by admin authentication:
- `GET /api/admin/dynamic-analytics/wallets`
- `GET /api/admin/dynamic-analytics/visits`
- `GET /api/admin/dynamic-analytics/overview`
- `GET /api/admin/dynamic-analytics/topline`
- `GET /api/admin/dynamic-analytics/engagement`
- `GET /api/admin/dynamic-analytics/wallets/breakdown`
- `GET /api/admin/dynamic-analytics/users`

### Frontend Hooks (`client/src/hooks/useDynamicAnalytics.ts`)
React Query hooks for data fetching:
- `useDynamicWalletAnalytics()`
- `useDynamicVisitAnalytics()`
- `useDynamicOverviewAnalytics()`
- `useDynamicEngagementAnalytics()`
- `useDynamicToplineAnalytics()`
- `useDynamicWalletBreakdown()`
- `useDynamicUsers()`

### Admin Dashboard (`client/src/pages/admin-dashboard/analytics.tsx`)
- 4 KPI cards (Users, Wallets, Visits, Engagement)
- Tabs for Overview, Wallets, Engagement, Traffic
- Raw data display for development
- Configuration status alerts

## Dynamic API Endpoints

### 1. Wallet Analytics
**URL**: `app.dynamic.xyz/api/v0/environments/{environmentId}/analytics/wallets`
**Returns**: Wallet connection data, types, chains, success rates

### 2. Visit Analytics
**URL**: `app.dynamic.xyz/api/v0/environments/{environmentId}/analytics/visits`
**Returns**: Unique visitors, total visits, return rates, session duration

### 3. Overview Analytics
**URL**: `app.dynamic.xyz/api/v0/environments/{environmentId}/analytics/overview`
**Returns**: High-level platform metrics, growth trends

### 4. Topline Analytics
**URL**: `app.dynamic.xyz/api/v0/environments/{environmentId}/analytics/topline`
**Returns**: Key performance indicators and topline metrics

### 5. Engagement Analytics
**URL**: `app.dynamic.xyz/api/v0/environments/{environmentId}/analytics/engagement`
**Returns**: User engagement, active sessions, interaction data

### 6. Wallet Breakdown
**URL**: `app.dynamic.xyz/api/v0/environments/{environmentId}/analytics/wallets/breakdown`
**Returns**: Detailed breakdown by wallet type and chain

### 7. Users List
**URL**: `app.dynamic.xyz/api/v0/environments/{environmentId}/users`
**Returns**: All users with wallet information

## Debugging Guide

### No Data Showing
1. Check browser console for errors
2. Verify environment variables are set
3. Restart the server
4. Check Network tab for failed API calls

### 401 Unauthorized
1. Ensure you're logged in with a Fandomly admin account
2. Check that `x-dynamic-user-id` header is being sent
3. Verify the Dynamic API key is valid

### Empty/Null Data
This might be expected if:
- Your Dynamic environment is new
- The date range has no data
- Dynamic's API returns empty results for new accounts

## Future Enhancements

### Based on API Response Data
1. **Wallet Analytics Tab**
   - Wallet type distribution
   - Chain distribution
   - Success/failure rates
   - Connection trends

2. **Visit Analytics Tab**
   - Unique vs. returning visitors
   - Session duration averages
   - Bounce rate
   - Traffic sources

3. **Engagement Tab**
   - Daily/weekly/monthly active users
   - Session frequency
   - Average engagement time
   - User retention metrics

4. **Charts & Visualizations**
   - Line charts for trends
   - Pie charts for distribution
   - Bar charts for comparisons
   - Heatmaps for activity

5. **Date Range Filters**
   - Preset ranges (7/30/90 days)
   - Custom date picker
   - Period comparisons

6. **Export Functionality**
   - CSV export
   - JSON export
   - PDF reports

## Testing Different Scenarios

### Date Range Testing
```typescript
const walletAnalytics = useDynamicWalletAnalytics(true, {
  startDate: '2025-01-01',
  endDate: '2025-10-04'
});
```

### Pagination Testing
```typescript
const dynamicUsers = useDynamicUsers(true, 50, 0); // limit: 50, offset: 0
```

## Current Status

The Dynamic Analytics integration is complete and functional! To proceed:

1. Visit the Admin Dashboard → Analytics
2. Check the Raw Data section to see what Dynamic returns
3. Based on the data structure, we can enhance the UI with:
   - Exact field mappings for KPIs
   - Charts and visualizations
   - Detailed breakdowns
   - Custom filters

The system is ready to display real data - just check what Dynamic returns and we can make the UI even better! 🚀
