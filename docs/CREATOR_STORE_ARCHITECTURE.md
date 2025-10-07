# Creator Store Architecture

## Overview
The Creator Store is a **public-facing storefront** where fans can discover creators, join campaigns, earn rewards, and shop for exclusive items. Each creator gets their own unique URL (e.g., `fandomly.com/johndoe`).

---

## 🎨 Page Layout & UX

### 1. Hero Section (Full-Width Banner)
```
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│              [  BANNER IMAGE OR GRADIENT  ]                   │
│                                                               │
│   ┌───────┐                                                   │
│   │       │    JOHN DOE  ✓ Verified                          │
│   │ PHOTO │    @johndoe                                       │
│   │       │    "Inspiring the next generation..."            │
│   └───────┘                                                   │
│              👥 12.5K Fans  🏆 5 Campaigns  🎁 500 Rewards    │
│                                                               │
│              [ 💜 Follow ]  [ 🔗 Share ]                      │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- ✅ Profile photo with verification badge
- ✅ Display name, username, bio
- ✅ Social proof stats (fans, campaigns, rewards)
- ✅ Follow/unfollow functionality
- ✅ Share button
- ✅ Uses creator's banner image or brand colors

---

### 2. Tabbed Navigation

```
┌─────────────────────────────────────────────────────────────┐
│  [ Overview ]  [ Campaigns (5) ]  [ Rewards ]  [ Shop ]     │
└─────────────────────────────────────────────────────────────┘
```

#### **Tab: Overview**
Shows creator highlights, featured campaigns, stats, and social links.

```
┌──────────────────────────────────┬──────────────────────┐
│                                  │                      │
│  ✨ About John Doe               │  📊 Stats            │
│  ─────────────────               │  ─────               │
│  Type: 🏆 Athlete                │  Total Fans: 12.5K   │
│  Location: 📍 Los Angeles        │  Active Campaigns: 5 │
│                                  │  Rewards Given: 500  │
│  🏀 Athletic Profile             │                      │
│  • Basketball                    │  🔗 Connect          │
│  • Point Guard                   │  ─────               │
│  • UCLA                          │  [🔵 Facebook     →] │
│                                  │  [🐦 Twitter      →] │
│  ⚡ Featured Campaigns           │  [📷 Instagram    →] │
│  ─────────────────               │                      │
│  ┌─────────────────────────┐    │                      │
│  │ Summer Training Challenge│    │                      │
│  │ Join the 30-day workout  │    │                      │
│  │ 🕐 Ends July 15          │    │                      │
│  └─────────────────────────┘    │                      │
│                                  │                      │
└──────────────────────────────────┴──────────────────────┘
```

#### **Tab: Campaigns**
Displays all active/published campaigns.

```
┌────────────────────────────────────────────────────────┐
│  Active Campaigns (5)                                  │
│                                                        │
│  ┌─────────────────────┐  ┌─────────────────────┐    │
│  │ Summer Challenge    │  │ Fan Appreciation    │    │
│  │ ────────────────    │  │ ────────────────    │    │
│  │ Join our 30-day...  │  │ Thank you fans...   │    │
│  │                     │  │                     │    │
│  │ ⭐ Earn rewards!    │  │ ⭐ Earn rewards!    │    │
│  │ 🕐 Ends July 15     │  │ 🕐 Ends Aug 1       │    │
│  │                     │  │                     │    │
│  │ [ Join Campaign ]   │  │ [ Join Campaign ]   │    │
│  └─────────────────────┘  └─────────────────────┘    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Campaigns Include:**
- Campaign name and description
- Status badge (Active/Upcoming/Completed)
- End date countdown
- Participation button
- Point/reward preview

#### **Tab: Rewards**
Placeholder for future reward catalog.

```
┌────────────────────────────────────────────┐
│         🎁                                 │
│    Rewards Coming Soon                     │
│                                            │
│  Follow this creator to be notified       │
│  when rewards are available!               │
└────────────────────────────────────────────┘
```

#### **Tab: Shop**
Placeholder for marketplace.

```
┌────────────────────────────────────────────┐
│         🛍️                                 │
│    Marketplace Coming Soon                 │
│                                            │
│  Physical items, digital products, and     │
│  subscriptions will be available here!     │
└────────────────────────────────────────────┘
```

---

## 🏗️ Technical Architecture

### Frontend
**File:** `client/src/pages/creator-store.tsx`

**Key Components:**
- Hero section with banner/profile
- Tab navigation (Overview, Campaigns, Rewards, Shop)
- Type-specific profile displays
- Campaign cards with join functionality
- Stats sidebar
- Social links sidebar

**State Management:**
- `selectedTab`: Current active tab
- `isFollowing`: Follow/unfollow state
- React Query for data fetching

### Backend
**File:** `server/routes.ts`

**API Endpoint:** `GET /api/store/:creatorUrl`

**Flow:**
1. Fetch user by username
2. Validate user is a creator
3. Fetch creator profile
4. Fetch tenant/branding data
5. Fetch active campaigns only (filter `status === 'active'`)
6. Calculate stats (fan count, rewards distributed)
7. Return combined data

**Response Structure:**
```json
{
  "creator": {
    "id": "...",
    "displayName": "John Doe",
    "bio": "...",
    "imageUrl": "...",
    "bannerImage": "...",
    "category": "athlete",
    "typeSpecificData": {...},
    "verificationData": {...},
    "user": {
      "username": "johndoe",
      "displayName": "John Doe",
      "profileData": {...}
    },
    "tenant": {
      "slug": "johndoe-store",
      "branding": {
        "primaryColor": "#1a1f3a",
        "secondaryColor": "#0f1629",
        "accentColor": "#14feee"
      }
    }
  },
  "campaigns": [...],
  "rewards": [],
  "fanCount": 12500,
  "totalRewards": 500
}
```

### Routing
**File:** `client/src/App.tsx`

```jsx
<Route path="/:creatorUrl" component={CreatorStore} />
```

**Important:** This route is placed **last** (before 404) to avoid catching system routes like `/marketplace`, `/creator-dashboard`, etc.

---

## 📱 Mobile-First Design

- **Responsive Layout**: 
  - Mobile: Stacked single-column
  - Tablet: 2-column grid
  - Desktop: 3-column with sidebar

- **Touch-Friendly**:
  - Large tap targets (48px minimum)
  - Swipeable tabs
  - Smooth scrolling

- **Performance**:
  - Lazy loading for images
  - Optimized queries
  - Skeleton loaders

---

## 🎨 Brand Customization

Each store uses the creator's tenant branding:

```javascript
{
  primaryColor: "#1a1f3a",    // Main brand color
  secondaryColor: "#0f1629",  // Secondary accent
  accentColor: "#14feee",     // Call-to-action buttons
  logo: "...",                // Creator logo
  customCSS: "..."            // Optional custom styling
}
```

**Applied To:**
- Banner gradient (if no image)
- Button colors
- Accent highlights
- Badge colors

---

## ✅ Current Features

### Implemented
- ✅ Dynamic routing (`/:creatorUrl`)
- ✅ Public API endpoint
- ✅ Hero section with banner/profile
- ✅ Type-specific profile displays
- ✅ Active campaigns display
- ✅ Stats sidebar
- ✅ Social links
- ✅ Follow functionality (frontend)
- ✅ Brand color integration
- ✅ Verification badge display
- ✅ Mobile-responsive design
- ✅ Tab navigation

### In Progress
- 🔄 Task display within campaigns
- 🔄 Reward catalog and redemption
- 🔄 Marketplace products
- 🔄 Store URL validation
- 🔄 Draft/publish workflow
- 🔄 Public/private toggles
- 🔄 Preview mode for creators

---

## 🚀 Next Steps

### Phase 1: Campaign Tasks
- Display tasks within each campaign
- Show task progress bars
- Add task completion buttons
- Real-time point updates

### Phase 2: Rewards System
- Reward catalog display
- Point-based redemption
- NFT claiming
- Reward history

### Phase 3: Marketplace
- Product listings (physical/digital)
- Shopping cart
- Checkout flow
- Subscription tiers

### Phase 4: Store Management
- Store URL validation in onboarding
- Draft/publish workflow
- Preview mode (mobile popup)
- Public/private section toggles
- Analytics dashboard

---

## 📊 URL Structure

```
fandomly.com/                    → Home page
fandomly.com/marketplace         → All creators
fandomly.com/johndoe            → John's store
fandomly.com/johndoe?tab=campaigns → Direct link to campaigns tab
```

**Username Requirements:**
- 3-20 characters
- Lowercase letters, numbers, underscores, hyphens
- No spaces or special characters
- Must be unique across platform

---

## 🔒 Privacy & Visibility

**Public by Default:**
- All store content is public (no auth required)
- Fans can browse without logging in
- Authentication required to:
  - Follow creators
  - Join campaigns
  - Earn rewards
  - Make purchases

**Future: Private Sections** (To Be Implemented)
- Creators can toggle sections public/private
- Premium content for subscribers only
- Token-gated access for NFT holders

---

## 🎯 Success Metrics

Track these KPIs for each store:
- **Traffic**: Page views, unique visitors
- **Engagement**: Follow rate, campaign joins
- **Conversion**: Purchases, subscriptions
- **Retention**: Return visitor rate
- **Social**: Shares, referral traffic

---

## 💡 Best Practices

### For Creators
1. **Complete Your Profile** - Verified creators get more visibility
2. **Use High-Quality Images** - Banner and profile photos are crucial
3. **Active Campaigns** - Keep at least 2-3 campaigns running
4. **Engage Regularly** - Post updates, respond to fans
5. **Brand Consistency** - Match colors to your existing brand

### For Fans
1. **Follow Creators** - Get notified of new campaigns
2. **Join Campaigns Early** - Limited-time rewards
3. **Complete Tasks** - Earn points and unlock rewards
4. **Share Your Store** - Help creators grow

---

## 🐛 Known Issues & Limitations

1. **Fan Count**: Currently placeholder (0) - needs proper implementation
2. **Total Rewards**: Mock calculation - needs real data
3. **Social Links**: Hardcoded placeholder - needs dynamic data from social connections
4. **Follow Functionality**: Frontend-only - needs backend persistence
5. **Campaign Tasks**: Not yet displayed within campaigns
6. **Rewards Tab**: Placeholder only
7. **Shop Tab**: Placeholder only

---

## 📚 Related Documentation

- `PROJECT_STATUS.md` - Overall project progress
- `REWARDS_ENGINE_ROADMAP.md` - Rewards system details
- `SNAG_TASK_REFERENCE.md` - Task system inspiration
- `shared/schema.ts` - Database schema
- `client/src/pages/creator-store.tsx` - Frontend implementation
- `server/routes.ts` - Backend API

---

**Last Updated:** October 2, 2025  
**Version:** 1.0 (Initial Release)

