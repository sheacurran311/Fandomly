# 🔗 Fandomly Three-Tier Referral Engine

## 🎯 Overview

A comprehensive referral system operating at three distinct levels:
1. **Creator → Creator** (Revenue Share)
2. **Fan → Fan** (Platform Rewards)
3. **Creator Task Referrals** (Creator Points)

Each tier has unique URLs/codes and reward mechanisms.

---

## 📊 Tier 1: Creator → Creator Referrals

### **Purpose**
Incentivize creators to bring other creators to the platform with revenue share.

### **Eligibility**
- **Referring Creator**: Must have active paid account
- **Referred Creator**: Any new creator signup
- **Reward Trigger**: When referred creator upgrades to paid account

### **Reward Structure**
```typescript
{
  rewardType: "revenue_percentage",
  percentage: 10, // 10% of referred creator's subscription fees
  duration: "lifetime" | "12_months" | "6_months",
  minPayout: 10.00, // Minimum $10 before payout
  payoutMethod: "stripe_connect" | "platform_credit"
}
```

### **URL/Code Structure**
```
Profile-based (NOT task-specific):
https://fandomly.ai?ref=creator123
Code: CREATOR123
```

### **Database Schema**
```typescript
// New table: creator_referrals
{
  id: uuid,
  referringCreatorId: uuid, // Who shared the link
  referredCreatorId: uuid,  // Who signed up
  referralCode: string,     // Unique code
  referralUrl: string,      // Full URL
  
  // Tracking
  clickCount: number,
  signupDate: timestamp,
  firstPaidDate: timestamp,
  
  // Revenue tracking
  totalRevenueGenerated: decimal,
  totalCommissionEarned: decimal,
  commissionPercentage: decimal,
  
  // Status
  status: "pending" | "active" | "expired" | "cancelled",
  expiresAt: timestamp,
  
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### **Features**
- ✅ Dashboard showing referral stats
- ✅ Track clicks, signups, conversions
- ✅ Monthly payout reports
- ✅ Automatic commission calculation
- ✅ Stripe Connect integration for payouts

---

## 📊 Tier 2: Fan → Fan Platform Referrals

### **Purpose**
Fans invite other fans to join Fandomly and earn **Fandomly Points** (platform currency).

### **Eligibility**
- **All fans** can refer
- Rewards in **Fandomly Points** (redeemable for admin-issued platform rewards only)

### **Reward Structure**
```typescript
{
  rewardType: "fixed_points",
  
  // Referrer rewards (person who shares)
  referrerReward: {
    onSignup: 50,           // When friend signs up
    onFirstTask: 100,       // When friend completes first task
    onProfileComplete: 150, // When friend completes profile
  },
  
  // Referred user rewards (new fan)
  referredReward: {
    onSignup: 25,          // Welcome bonus
    onProfileComplete: 50  // Profile completion bonus
  },
  
  // Optional: Percentage earnings
  enablePercentageRewards: true,
  percentageOfReferred: 5, // Earn 5% of all points friend earns
  percentageDuration: "30_days" | "90_days" | "lifetime"
}
```

### **URL/Code Structure**
```
Profile-based (NOT task-specific):
https://fandomly.ai?fanref=fan456
Code: FAN456
```

### **Database Schema**
```typescript
// New table: fan_referrals
{
  id: uuid,
  referringFanId: uuid,    // Who shared the link
  referredFanId: uuid,     // Who signed up
  referralCode: string,    // Unique code (FAN456)
  referralUrl: string,     // Full URL
  
  // Tracking
  clickCount: number,
  signupDate: timestamp,
  
  // Milestone tracking
  firstTaskCompletedAt: timestamp,
  profileCompletedAt: timestamp,
  
  // Points tracking
  totalPointsReferredUserEarned: number,
  totalPointsReferrerEarned: number,
  
  // Percentage earnings
  percentageRewardsEnabled: boolean,
  percentageValue: number,
  percentageExpiresAt: timestamp,
  
  // Status
  status: "pending" | "active" | "expired",
  
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### **Features**
- ✅ Personal referral dashboard
- ✅ Shareable social media cards
- ✅ Track friend progress
- ✅ Tiered rewards (signup → first task → profile complete)
- ✅ Optional percentage earnings
- ✅ Fandomly Points balance

---

## 📊 Tier 3: Creator Task/Campaign Referrals

### **Purpose**
Fans share **creator-specific** tasks/campaigns and earn **creator points** (redeemable for that creator's rewards).

### **Eligibility**
- Fans participating in a creator's tasks/campaigns
- Separate URLs/codes from fan's personal platform referral

### **Reward Structure**
```typescript
{
  rewardType: "creator_points",
  
  // Task/Campaign specific
  taskId: uuid,
  campaignId: uuid,
  creatorId: uuid,
  
  // Rewards
  referrerReward: {
    onFriendSignup: 25,          // Friend joins platform
    onFriendJoinCreator: 50,     // Friend joins THIS creator
    onFriendCompleteTask: 100,   // Friend completes the task
  },
  
  // Optional: Share of earnings
  enableShareOfEarnings: true,
  sharePercentage: 10, // Earn 10% of points friend earns from THIS creator
  shareDuration: "30_days"
}
```

### **URL/Code Structure**
```
Task-specific:
https://fandomly.ai/taylor-swift/tasks/follow-twitter?ref=fan456
Code: TAYLOR-FAN456-TASK123

Campaign-specific:
https://fandomly.ai/taylor-swift/campaigns/album-launch?ref=fan456
Code: TAYLOR-FAN456-CAMP789
```

### **Database Schema**
```typescript
// New table: creator_task_referrals
{
  id: uuid,
  
  // Context
  creatorId: uuid,        // Which creator's task/campaign
  taskId: uuid,           // Specific task (if task referral)
  campaignId: uuid,       // Specific campaign (if campaign referral)
  
  // Participants
  referringFanId: uuid,   // Fan who shared
  referredFanId: uuid,    // Friend who clicked/joined
  
  // Codes
  referralCode: string,   // TAYLOR-FAN456-TASK123
  referralUrl: string,    // Full URL
  referralType: "task" | "campaign",
  
  // Tracking
  clickCount: number,
  signupDate: timestamp,
  joinedCreatorDate: timestamp,
  completedTaskDate: timestamp,
  
  // Points tracking (creator points, not platform points)
  totalCreatorPointsEarned: number,
  sharePercentage: number,
  shareExpiresAt: timestamp,
  
  // Status
  status: "pending" | "active" | "completed" | "expired",
  
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### **Features**
- ✅ Auto-generate referral links for tasks/campaigns
- ✅ Social share buttons with preview cards
- ✅ Track which fans share most effectively
- ✅ Leaderboard for top referrers per creator
- ✅ Creator points (separate from Fandomly Points)
- ✅ Creator-specific reward redemption

---

## 🎨 UI Components Needed

### 1. **Creator Profile - Creator Referral Dashboard**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Invite Other Creators</CardTitle>
    <CardDescription>
      Earn 10% revenue share when you refer paid creators
    </CardDescription>
  </CardHeader>
  <CardContent>
    {/* Your unique referral link */}
    <div className="space-y-4">
      <div>
        <Label>Your Referral Link</Label>
        <div className="flex gap-2">
          <Input value="https://fandomly.ai?ref=creator123" readOnly />
          <Button onClick={copyLink}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div>
        <Label>Your Referral Code</Label>
        <div className="flex gap-2">
          <Input value="CREATOR123" readOnly />
          <Button onClick={copyCode}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 pt-4">
        <StatCard
          title="Clicks"
          value={245}
          icon={<MousePointer />}
        />
        <StatCard
          title="Signups"
          value={12}
          icon={<UserPlus />}
        />
        <StatCard
          title="Commission Earned"
          value="$487.50"
          icon={<DollarSign />}
        />
      </div>
      
      {/* Referral list */}
      <div className="pt-4">
        <Label className="text-lg">Your Referrals</Label>
        <div className="space-y-2 mt-2">
          {referrals.map(ref => (
            <ReferralCard key={ref.id} referral={ref} />
          ))}
        </div>
      </div>
    </div>
  </CardContent>
</Card>
```

### 2. **Fan Profile - Platform Referral Dashboard**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Invite Friends</CardTitle>
    <CardDescription>
      Earn Fandomly Points when friends join and complete tasks
    </CardDescription>
  </CardHeader>
  <CardContent>
    {/* Shareable link */}
    <div className="space-y-4">
      <ReferralLinkDisplay
        url="https://fandomly.ai?fanref=fan456"
        code="FAN456"
      />
      
      {/* Social share buttons */}
      <div className="flex gap-2">
        <Button onClick={shareToTwitter}>
          <Twitter className="h-4 w-4 mr-2" />
          Share on X
        </Button>
        <Button onClick={shareToFacebook}>
          <Facebook className="h-4 w-4 mr-2" />
          Share on Facebook
        </Button>
      </div>
      
      {/* Rewards breakdown */}
      <Alert>
        <Coins className="h-4 w-4" />
        <AlertTitle>Earn Fandomly Points</AlertTitle>
        <AlertDescription>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>50 points when friend signs up</li>
            <li>100 points when they complete first task</li>
            <li>150 points when they complete profile</li>
            <li>+ 5% of all points they earn for 30 days!</li>
          </ul>
        </AlertDescription>
      </Alert>
      
      {/* Stats */}
      <ReferralStats
        friends={referralStats.totalFriends}
        pointsEarned={referralStats.totalPoints}
        pendingRewards={referralStats.pendingPoints}
      />
    </div>
  </CardContent>
</Card>
```

### 3. **Task/Campaign Referral Widget** (Creator-specific)
```tsx
<Card>
  <CardHeader>
    <CardTitle>Share This Task</CardTitle>
    <CardDescription>
      Earn {task.referralReward} creator points when friends complete it
    </CardDescription>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      {/* Auto-generated link */}
      <ReferralLinkDisplay
        url={`https://fandomly.ai/${creator.url}/tasks/${task.id}?ref=${fanCode}`}
        code={generatedCode}
      />
      
      {/* Preview card */}
      <TaskPreviewCard task={task} creator={creator} />
      
      {/* Share buttons with pre-filled text */}
      <ShareButtons
        text={`Check out this cool task from ${creator.name}! Complete it and earn points 🎉`}
        url={referralUrl}
      />
      
      {/* Tracking */}
      <div className="text-sm text-gray-400">
        Your shares: {shareCount} | Friends completed: {completionCount}
      </div>
    </div>
  </CardContent>
</Card>
```

---

## 🔧 Backend Implementation

### **Referral Tracking Service**
```typescript
// server/referral-service.ts

export class ReferralService {
  // Creator → Creator
  async createCreatorReferral(creatorId: string) {
    const code = generateUniqueCode('CREATOR');
    const url = `https://fandomly.ai?ref=${code.toLowerCase()}`;
    
    return db.insert(creatorReferrals).values({
      referringCreatorId: creatorId,
      referralCode: code,
      referralUrl: url,
      status: 'active'
    });
  }
  
  async trackCreatorReferralClick(code: string) {
    await db.update(creatorReferrals)
      .set({ clickCount: sql`${creatorReferrals.clickCount} + 1` })
      .where(eq(creatorReferrals.referralCode, code));
  }
  
  async completeCreatorReferral(code: string, newCreatorId: string) {
    const referral = await db.query.creatorReferrals.findFirst({
      where: eq(creatorReferrals.referralCode, code)
    });
    
    if (!referral) return;
    
    // Update with referred creator
    await db.update(creatorReferrals)
      .set({ 
        referredCreatorId: newCreatorId,
        signupDate: new Date(),
        status: 'active'
      })
      .where(eq(creatorReferrals.id, referral.id));
  }
  
  async calculateCreatorCommission(referredCreatorId: string, paymentAmount: number) {
    const referral = await db.query.creatorReferrals.findFirst({
      where: eq(creatorReferrals.referredCreatorId, referredCreatorId)
    });
    
    if (!referral || referral.status !== 'active') return 0;
    
    const commission = paymentAmount * (referral.commissionPercentage / 100);
    
    // Update totals
    await db.update(creatorReferrals)
      .set({
        totalRevenueGenerated: sql`${creatorReferrals.totalRevenueGenerated} + ${paymentAmount}`,
        totalCommissionEarned: sql`${creatorReferrals.totalCommissionEarned} + ${commission}`
      })
      .where(eq(creatorReferrals.id, referral.id));
    
    return commission;
  }
  
  // Fan → Fan
  async createFanReferral(fanId: string) {
    const code = generateUniqueCode('FAN');
    const url = `https://fandomly.ai?fanref=${code.toLowerCase()}`;
    
    return db.insert(fanReferrals).values({
      referringFanId: fanId,
      referralCode: code,
      referralUrl: url,
      status: 'active'
    });
  }
  
  async awardFanReferralPoints(
    referralId: string, 
    milestone: 'signup' | 'first_task' | 'profile_complete',
    points: number
  ) {
    const referral = await db.query.fanReferrals.findFirst({
      where: eq(fanReferrals.id, referralId)
    });
    
    if (!referral) return;
    
    // Award Fandomly Points to referring fan
    await awardFandomlyPoints(referral.referringFanId, points, {
      reason: `Friend ${milestone} referral bonus`,
      referralId: referralId
    });
    
    // Update tracking
    await db.update(fanReferrals)
      .set({
        totalPointsReferrerEarned: sql`${fanReferrals.totalPointsReferrerEarned} + ${points}`
      })
      .where(eq(fanReferrals.id, referralId));
  }
  
  // Creator Task/Campaign Referrals
  async createTaskReferral(taskId: string, fanId: string, creatorId: string) {
    const baseCode = generateUniqueCode('TASK');
    const code = `${creatorId}-${fanId}-${baseCode}`;
    const url = `https://fandomly.ai/${creatorId}/tasks/${taskId}?ref=${code}`;
    
    return db.insert(creatorTaskReferrals).values({
      taskId,
      referringFanId: fanId,
      creatorId,
      referralCode: code,
      referralUrl: url,
      referralType: 'task',
      status: 'active'
    });
  }
  
  async awardTaskReferralPoints(
    referralId: string,
    milestone: 'signup' | 'joined_creator' | 'completed_task',
    points: number
  ) {
    const referral = await db.query.creatorTaskReferrals.findFirst({
      where: eq(creatorTaskReferrals.id, referralId)
    });
    
    if (!referral) return;
    
    // Award creator points to referring fan
    await awardCreatorPoints(
      referral.referringFanId,
      referral.creatorId,
      points,
      {
        reason: `Task referral: ${milestone}`,
        taskId: referral.taskId,
        referralId: referralId
      }
    );
  }
}

function generateUniqueCode(prefix: string): string {
  return `${prefix}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}
```

---

## 🗄️ Database Migrations

### **Migration: Add Referral Tables**
```sql
-- Creator → Creator Referrals
CREATE TABLE creator_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referring_creator_id UUID NOT NULL REFERENCES creators(id),
  referred_creator_id UUID REFERENCES creators(id),
  referral_code VARCHAR(50) UNIQUE NOT NULL,
  referral_url TEXT NOT NULL,
  
  click_count INTEGER DEFAULT 0,
  signup_date TIMESTAMP,
  first_paid_date TIMESTAMP,
  
  total_revenue_generated DECIMAL(10,2) DEFAULT 0,
  total_commission_earned DECIMAL(10,2) DEFAULT 0,
  commission_percentage DECIMAL(5,2) DEFAULT 10.00,
  
  status VARCHAR(20) DEFAULT 'active',
  expires_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_creator_referrals_code ON creator_referrals(referral_code);
CREATE INDEX idx_creator_referrals_referring ON creator_referrals(referring_creator_id);
CREATE INDEX idx_creator_referrals_referred ON creator_referrals(referred_creator_id);

-- Fan → Fan Referrals
CREATE TABLE fan_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referring_fan_id UUID NOT NULL REFERENCES users(id),
  referred_fan_id UUID REFERENCES users(id),
  referral_code VARCHAR(50) UNIQUE NOT NULL,
  referral_url TEXT NOT NULL,
  
  click_count INTEGER DEFAULT 0,
  signup_date TIMESTAMP,
  first_task_completed_at TIMESTAMP,
  profile_completed_at TIMESTAMP,
  
  total_points_referred_user_earned INTEGER DEFAULT 0,
  total_points_referrer_earned INTEGER DEFAULT 0,
  
  percentage_rewards_enabled BOOLEAN DEFAULT false,
  percentage_value DECIMAL(5,2) DEFAULT 0,
  percentage_expires_at TIMESTAMP,
  
  status VARCHAR(20) DEFAULT 'pending',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_fan_referrals_code ON fan_referrals(referral_code);
CREATE INDEX idx_fan_referrals_referring ON fan_referrals(referring_fan_id);
CREATE INDEX idx_fan_referrals_referred ON fan_referrals(referred_fan_id);

-- Creator Task/Campaign Referrals
CREATE TABLE creator_task_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id),
  task_id UUID REFERENCES tasks(id),
  campaign_id UUID REFERENCES campaigns(id),
  
  referring_fan_id UUID NOT NULL REFERENCES users(id),
  referred_fan_id UUID REFERENCES users(id),
  
  referral_code VARCHAR(100) UNIQUE NOT NULL,
  referral_url TEXT NOT NULL,
  referral_type VARCHAR(20) NOT NULL, -- 'task' or 'campaign'
  
  click_count INTEGER DEFAULT 0,
  signup_date TIMESTAMP,
  joined_creator_date TIMESTAMP,
  completed_task_date TIMESTAMP,
  
  total_creator_points_earned INTEGER DEFAULT 0,
  share_percentage DECIMAL(5,2) DEFAULT 0,
  share_expires_at TIMESTAMP,
  
  status VARCHAR(20) DEFAULT 'pending',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_task_referrals_code ON creator_task_referrals(referral_code);
CREATE INDEX idx_task_referrals_task ON creator_task_referrals(task_id);
CREATE INDEX idx_task_referrals_campaign ON creator_task_referrals(campaign_id);
CREATE INDEX idx_task_referrals_referring_fan ON creator_task_referrals(referring_fan_id);
```

---

## 🎯 Implementation Priority

1. ✅ **Database Schema** - Create all three referral tables
2. ✅ **Backend Service** - ReferralService with tracking logic
3. ✅ **Creator→Creator** - Revenue share referrals first (highest value)
4. ✅ **Fan→Fan** - Platform growth referrals
5. ✅ **Task Referrals** - Creator-specific sharing
6. ✅ **Admin Dashboard** - Monitor all referral activity
7. ✅ **Analytics** - Track conversion rates, top referrers

---

## 📈 Success Metrics

### **Creator→Creator**
- Referral click-to-signup rate
- Signup-to-paid conversion rate
- Average commission per referrer
- Monthly recurring commission

### **Fan→Fan**
- Viral coefficient (how many friends each fan refers)
- Friend activation rate (complete profile + first task)
- Average Fandomly Points earned per referrer
- Platform growth attribution

### **Task Referrals**
- Share rate (% of fans who share tasks)
- Task completion rate from referrals
- Top-performing tasks for virality
- Creator points distributed via referrals

---

**Status**: 🚧 Architecture Complete - Ready for Implementation  
**Next Steps**: Database migration → Backend service → UI components  
**Last Updated**: October 5, 2025

