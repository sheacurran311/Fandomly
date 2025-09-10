# 🔍 Fandomly Development Priorities & Current State Analysis

## 📊 Project Overview

Fandomly is a Web3-enabled loyalty rewards platform targeting athletes, creators, and musicians with NIL opportunities. This document outlines the current state, critical issues, and prioritized development tasks.

## Current Architecture Status

### ✅ **What's Working Well:**
- **Database Schema**: Comprehensive multi-tenant architecture with proper relationships in `shared/schema.ts`
- **Authentication Flow**: Dynamic wallet integration functional via `client/src/hooks/use-auth.ts`
- **UI Structure**: All major pages exist with proper routing (22 routes in `client/src/App.tsx`)
- **Facebook Integration**: SDK working, profile import functional in `client/src/components/fan/facebook-profile-import.tsx`
- **Component Architecture**: Well-structured with reusable UI components
- **Basic API Endpoints**: 25+ API routes defined in `server/routes.ts`

### ❌ **Critical Issues Identified:**

## 🚨 **PRIORITY 1: CRITICAL BACKEND-FRONTEND DISCONNECTIONS**

### **Issue 1: Data Display vs Reality**

**Problem**: Frontend displays hardcoded data instead of real API data

**Affected Files:**
- `client/src/pages/fan-dashboard.tsx` - Shows hardcoded stats (12,450 points, 18 following)
- `client/src/pages/creator-dashboard.tsx` - Displays static metrics 
- `client/src/pages/marketplace.tsx` - Uses `client/src/data/sampleNFTs.ts` instead of live data
- `client/src/pages/fan-dashboard/campaigns.tsx` - Hardcoded campaign arrays

**API Endpoints Available but Not Used:**
- `/api/point-transactions/fan-program/:fanProgramId`
- `/api/fan-programs/user/:fanId`
- `/api/campaigns/creator/:creatorId`
- `/api/rewards`
- `/api/loyalty-programs/creator/:creatorId`

**Fix Required:**
Replace hardcoded data with `useQuery` calls to actual API endpoints

### **Issue 2: Non-Functional Buttons & Forms**

**Problem**: UI components exist but don't connect to backend functionality

**Affected Components:**
- `client/src/components/branding/branding-customizer.tsx` - Upload buttons with no upload endpoints
- `client/src/pages/campaign-builder.tsx` - Creates campaigns in UI but doesn't save via API
- `client/src/components/fan/fan-profile-edit-modal.tsx` - Form exists but limited backend integration
- Social action buttons throughout app don't trigger point accrual

**Backend Routes Needed:**
- File upload endpoints for images/assets
- Campaign creation/update endpoints properly wired
- Profile update endpoints with proper validation

### **Issue 3: Security Critical Issues**

**MAJOR SECURITY VULNERABILITY** in `server/routes.ts` lines 23-26:
```javascript
// For now, we'll skip JWT verification and trust the client
// In production, you'd verify the JWT token here  
req.dynamicUser = req.body.dynamicUser || req.headers['x-dynamic-user'];
```

**Other Security Issues:**
- No proper tenant isolation in queries
- RBAC middleware exists but not consistently applied
- Client-side data trusted without server validation

## 🎯 **PRIORITIZED DEVELOPMENT TASKS**

### **IMMEDIATE (Week 1) - Core Functionality**

#### **Task A1: Fix Dashboard Data Flow**
**Priority**: 🔴 CRITICAL
**Files to Update:**
- `client/src/pages/fan-dashboard.tsx`
- `client/src/pages/creator-dashboard.tsx`  
- `client/src/pages/fan-dashboard/campaigns.tsx`

**Actions:**
1. Replace hardcoded stats with `useQuery` calls to:
   - `/api/point-transactions/fan-program/:fanProgramId`
   - `/api/fan-programs/user/:fanId`
   - `/api/campaigns/creator/:creatorId`
2. Add proper loading states and error handling
3. Implement cache invalidation patterns

**Expected Outcome**: Users see real data instead of fake numbers

#### **Task A2: Campaign System Integration**
**Priority**: 🔴 CRITICAL
**Files to Update:**
- `client/src/pages/campaign-builder.tsx`
- `server/routes.ts` (campaign endpoints)

**Actions:**
1. Wire campaign builder form to `POST /api/campaigns`
2. Implement campaign participation tracking
3. Add real-time progress updates
4. Connect campaign templates to actual database operations

**Expected Outcome**: Campaign creation and participation works end-to-end

#### **Task A3: Profile Management Completion**
**Priority**: 🟠 HIGH
**Files to Update:**
- `client/src/components/fan/fan-profile-edit-modal.tsx`
- `client/src/pages/fan-profile.tsx`
- `server/routes.ts` (profile endpoints)

**Actions:**
1. Fix profile update flows for both fan & creator
2. Ensure Facebook profile import properly saves all fields
3. Add proper error handling and validation
4. Implement avatar upload functionality

**Expected Outcome**: Profile editing works completely

#### **Task A4: Security Critical Fixes** 
**Priority**: 🔴 CRITICAL - SECURITY
**Files to Update:**
- `server/routes.ts`
- `server/middleware/rbac.ts`

**Actions:**
1. **IMMEDIATE**: Implement proper JWT verification
2. Apply RBAC middleware consistently across all protected routes
3. Add tenant context validation
4. Implement proper request validation using Zod schemas

**Expected Outcome**: Application is secure for production use

### **PRIORITY 2 (Week 2) - Infrastructure & Payments**

#### **Task B1: File Upload Infrastructure**
**Priority**: 🟠 HIGH
**New Files Needed:**
- `server/upload-routes.ts`
- `client/src/hooks/use-file-upload.ts`

**Actions:**
1. Create backend upload endpoints (presigned URLs or direct upload)
2. Implement profile picture upload functionality
3. Add branding asset uploads for creators
4. Integrate with cloud storage (AWS S3 or similar)

**Expected Outcome**: File uploads work throughout the application

#### **Task B2: Stripe Payment Integration**
**Priority**: 🟠 HIGH
**Files to Update:**
- Create `client/src/pages/billing.tsx`
- Create `server/payment-routes.ts`
- Update `server/routes.ts`

**Actions:**
1. Implement Stripe checkout flows (env vars already exist: `VITE_STRIPE_PUBLIC_KEY`, `STRIPE_SECRET_KEY`)
2. Create subscription management UI
3. Add billing dashboard for creators
4. Set up webhook handling for subscription events

**Expected Outcome**: Creators can subscribe and manage billing

#### **Task B3: Points & Rewards System**
**Priority**: 🟠 HIGH
**Files to Update:**
- `client/src/hooks/use-points.ts` (new)
- `server/routes.ts` (extend point transaction endpoints)
- Campaign participation components

**Actions:**
1. Implement real point accrual from social actions
2. Create reward redemption flows
3. Add transaction history displays
4. Connect Facebook actions to point awards

**Expected Outcome**: Points system works completely

### **PRIORITY 3 (Week 3) - Multi-Tenant & Advanced Features**

#### **Task C1: Multi-Tenant Architecture**
**Priority**: 🟡 MEDIUM
**Files to Update:**
- `client/src/App.tsx`
- `server/routes.ts`
- All dashboard components

**Actions:**
1. Implement `/:slug/` routing pattern for tenant isolation
2. Apply real tenant branding from database
3. Ensure all queries filter by tenant context
4. Add tenant switching functionality

**Expected Outcome**: True multi-tenant application with proper isolation

#### **Task C2: Advanced Campaign Features**
**Priority**: 🟡 MEDIUM
**Files to Update:**
- `client/src/pages/facebook-like-campaign.tsx`
- Social media integration components
- Analytics dashboards

**Actions:**
1. Complete Facebook like/comment/share tracking
2. Add Instagram/TikTok integration
3. Implement campaign analytics and reporting
4. Create campaign performance dashboards

**Expected Outcome**: Advanced social media campaign functionality

### **PRIORITY 4 (Future) - NFT Integration**

#### **Task D1: Metaplex Integration**
**Priority**: 🟢 LOW
**Note**: Only start after core functionality is complete

**Actions:**
1. Integrate Metaplex for cNFT and NFT distribution
2. Implement blockchain connectivity for NFT rewards
3. Create advanced NFT marketplace features
4. Add NFT reward distribution automation

**Expected Outcome**: Full NFT rewards and marketplace functionality

## 🔧 **Technical Implementation Notes**

### **Database Schema Issues to Address:**
- Many frontend queries don't use proper TypeScript types from `@shared/schema`
- Profile data not fully mapped to expanded schema fields (new fields added: bio, location, socialLinks, etc.)
- Missing tenant-scoped queries throughout application

### **API Integration Patterns:**
- Implement consistent error handling for API failures
- Add proper cache invalidation using React Query
- Use proper TypeScript types for all API responses
- Implement optimistic updates where appropriate

### **Current API Endpoints Available:**
```
AUTH:
POST /api/auth/register
POST /api/auth/switch-user-type
GET /api/auth/user/:dynamicUserId
POST /api/auth/profile
POST /api/auth/facebook-profile-import

CREATORS:
POST /api/creators
GET /api/creators
GET /api/creators/:id
GET /api/creators/user/:userId

CAMPAIGNS:
GET /api/campaigns/creator/:creatorId
POST /api/campaigns
GET /api/campaign-rules/:campaignId
POST /api/campaign-rules

LOYALTY:
POST /api/loyalty-programs
GET /api/loyalty-programs/creator/:creatorId
GET /api/loyalty-programs/:id

REWARDS:
POST /api/rewards
GET /api/rewards
GET /api/rewards/program/:programId

FANS:
POST /api/fan-programs
GET /api/fan-programs/user/:fanId
GET /api/point-transactions/fan-program/:fanProgramId
GET /api/reward-redemptions/user/:fanId

TENANTS:
POST /api/tenants/:tenantId/follow
```

### **Missing API Endpoints Needed:**
```
FILE UPLOADS:
POST /api/upload/image
POST /api/upload/avatar
POST /api/upload/branding

PAYMENTS:
POST /api/stripe/create-checkout
POST /api/stripe/webhook
GET /api/billing/subscription
POST /api/billing/cancel

SOCIAL ACTIONS:
POST /api/social/facebook/like
POST /api/social/facebook/comment
POST /api/social/facebook/share
POST /api/social/instagram/follow
```

### **Recommended File Structure:**
```
client/src/
├── hooks/
│   ├── use-points.ts (new)
│   ├── use-campaigns.ts (new)
│   ├── use-file-upload.ts (new)
│   └── use-tenant.ts (new)
├── services/
│   ├── api.ts (centralized API calls)
│   ├── upload.ts (file upload service)
│   └── stripe.ts (payment service)
server/
├── routes/
│   ├── upload-routes.ts (new)
│   ├── payment-routes.ts (new)
│   └── campaign-routes.ts (extract from routes.ts)
└── services/
    ├── upload.ts (upload logic)
    └── stripe.ts (payment logic)
```

## 🚨 **Critical Blockers to Address First**

1. **Security**: Fix JWT verification immediately - currently completely disabled
2. **Data Flow**: Connect dashboards to real data - users see fake numbers
3. **Campaign System**: Make campaign creation/participation functional
4. **File Uploads**: Implement basic upload infrastructure

## 🎯 **Success Criteria for Each Priority**

### **Priority 1 Success Criteria:**
- [ ] All dashboard data comes from real API calls (no hardcoded numbers)
- [ ] Campaign builder saves to database and campaigns can be joined
- [ ] Profile updates work end-to-end (fan and creator)
- [ ] JWT verification implemented and tested
- [ ] No security vulnerabilities in authentication

### **Priority 2 Success Criteria:**
- [ ] File uploads working (profile pics, branding assets)
- [ ] Stripe payments functional with subscription management
- [ ] Point accrual working for social actions (Facebook likes, follows)
- [ ] Reward redemption flows complete

### **Priority 3 Success Criteria:**
- [ ] Multi-tenant routing implemented (/:slug/ pattern)
- [ ] Tenant branding applied from database
- [ ] Advanced campaign analytics working
- [ ] Social media integrations complete (Instagram, TikTok)

### **Priority 4 Success Criteria:**
- [ ] Metaplex integration functional
- [ ] NFT rewards distributed automatically
- [ ] NFT marketplace features complete

## 🛠 **Development Commands**

```bash
# Start development environment
npm run dev

# Run database migrations
npm run db:push

# Check TypeScript errors
npm run type-check

# Generate database types
npm run db:generate

# Reset database (careful!)
npm run db:reset
```

## 🔍 **Testing Each Priority**

### **Priority 1 Testing:**
```bash
# Test real data in dashboards
curl http://localhost:5000/api/fan-programs/user/:fanId
curl http://localhost:5000/api/campaigns/creator/:creatorId

# Test JWT verification
curl -H "Authorization: Bearer invalid_token" http://localhost:5000/api/auth/user/test

# Test profile updates
# (Use browser to test profile edit forms)
```

### **Priority 2 Testing:**
```bash
# Test file uploads
# (Use browser to upload profile pictures)

# Test Stripe integration
# (Use Stripe test keys and test checkout flows)
```

## 📝 **Notes for Cursor Agents**

### **Development Approach:**
- Focus on one priority at a time
- Always test API endpoints before connecting frontend
- Use existing TypeScript types from `@shared/schema`
- Follow existing code patterns and component structure
- Prioritize security fixes over feature additions
- Test with real user flows, not just individual components

### **Code Quality Standards:**
- Use TypeScript strictly (no `any` types)
- Implement proper error handling for all API calls
- Add loading states for all async operations
- Use React Query for all API calls with proper cache invalidation
- Follow existing component patterns and naming conventions

### **Security Requirements:**
- Never trust client-provided data
- Always validate input with Zod schemas
- Implement proper JWT verification
- Use RBAC middleware on all protected routes
- Implement tenant isolation for all queries

### **Database Interaction:**
- Use Drizzle ORM for all database operations
- Always scope queries by tenant where applicable
- Use proper TypeScript types from schema
- Implement proper error handling for database operations

---

**Last Updated**: September 10, 2025
**Status**: Critical issues identified, prioritized development plan created
**Next Action**: Begin Priority 1 Task A1 (Dashboard Data Flow)
**Estimated Timeline**: 3-4 weeks for Priority 1-3 completion