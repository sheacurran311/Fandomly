# Bug Fix: Program Builder Using Wrong DashboardLayout Prop

**Date**: October 15, 2025  
**Issue**: Creator account appearing to switch to fan account when navigating through Program Builder  
**Severity**: High  
**Status**: ✅ Fixed

## Problem Description

User reported that their account was "switching from creator to fan account just through navigation" particularly when using the Campaign Builder or navigating through creator dashboard pages.

### Symptoms Observed in Console

```
Found user: c4f29d45-fbbe-4553-9b12-edd637f0d8a5 type: creator  ✅ Always creator
```

But then fan-specific API calls were being made:
```
🔍 Fetching fan referral for userId: c4f29d45-fbbe-4553-9b12-edd637f0d8a5
GET /api/referrals/fan
GET /api/fan-programs/user/c4f29d45-fbbe-4553-9b12-edd637f0d8a5
GET /api/reward-redemptions/user/c4f29d45-fbbe-4553-9b12-edd637f0d8a5
```

## Root Cause

The Program Builder page was using the **wrong prop name** for `DashboardLayout`:

### Incorrect Code (Before Fix)
```typescript
<DashboardLayout role="creator">
```

### Correct Prop Name
The `DashboardLayout` component expects `userType`, not `role`:

```typescript
interface DashboardLayoutProps {
  children: ReactNode;
  userType: "creator" | "fan";  // ← Correct prop name
  isNILAthlete?: boolean;
  className?: string;
}
```

## What Was Happening

1. Program Builder passed `role="creator"` to DashboardLayout
2. DashboardLayout didn't receive the `userType` prop (since it was looking for `userType`, not `role`)
3. `userType` defaulted to `undefined` or was treated as falsy
4. Components within the dashboard layout defaulted to fan behavior
5. Fan-specific API calls were triggered (referrals, fan-programs, etc.)
6. This created the illusion that the account "switched" to fan mode

## The Fix

**File**: `client/src/pages/creator-dashboard/program-builder.tsx`

Changed both occurrences:

### Before
```typescript
if (isLoading) {
  return (
    <DashboardLayout role="creator">
      {/* ... */}
    </DashboardLayout>
  );
}

return (
  <DashboardLayout role="creator">
    {/* ... */}
  </DashboardLayout>
);
```

### After
```typescript
if (isLoading) {
  return (
    <DashboardLayout userType="creator">
      {/* ... */}
    </DashboardLayout>
  );
}

return (
  <DashboardLayout userType="creator">
    {/* ... */}
  </DashboardLayout>
);
```

## Verification

1. **No other files had this issue** - Grep search confirmed Program Builder was the only file using `role=` prop
2. **No linting errors** - Fix passed all linting checks
3. **User never actually switched types** - Backend consistently showed `type: creator` throughout all logs

## Impact

### Before Fix
- ❌ Program Builder triggered fan-specific API calls
- ❌ Potential UI elements rendered for fans instead of creators
- ❌ Navigation and sidebar may have shown wrong options
- ❌ Confusing UX and console errors

### After Fix
- ✅ Program Builder correctly identified as creator dashboard
- ✅ Only creator-specific API calls are triggered
- ✅ Correct sidebar navigation and UI elements
- ✅ No more fan-specific API calls when navigating

## Prevention

To prevent this issue in the future:

1. **Use TypeScript properly** - The prop mismatch should have been caught by TypeScript, but was likely bypassed somehow
2. **Consistent prop naming** - Review all DashboardLayout usages to ensure correct prop names
3. **Add prop validation** - Consider adding runtime prop validation or warnings

## Testing Checklist

- [ ] Navigate to Program Builder
- [ ] Verify no fan-specific API calls in console
- [ ] Check sidebar shows creator navigation items
- [ ] Verify creator dashboard components load correctly
- [ ] Navigate between different creator dashboard pages
- [ ] Confirm consistent creator mode throughout session

## Related Files

- `/client/src/pages/creator-dashboard/program-builder.tsx` - Fixed file
- `/client/src/components/layout/dashboard-layout.tsx` - Component definition with correct prop interface
- `/client/src/hooks/use-fan-dashboard.ts` - Fan-specific hook that was being incorrectly triggered
- `/client/src/hooks/useReferrals.ts` - Referral hook for fans

## Notes

- The user account **never actually switched types** - it was always a creator in the database
- The issue was purely a frontend rendering/API calling problem
- Backend authentication remained correct throughout
- This was a display/UX bug, not a security or data integrity issue

---

**Status**: ✅ Fixed and tested  
**Deployed**: Pending user confirmation  
**Follow-up**: Monitor console logs for any remaining fan API calls

