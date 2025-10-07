# Fandomly Rewards & Loyalty Engine - Technical Roadmap

**Last Updated**: October 1, 2025  
**Inspiration**: Snag Solutions (primary), Kazm (UI reference)  
**Philosophy**: Structured configuration over free-form text

---

## 📊 System Architecture

### Two Parallel Systems

#### 1. Fan Rewards System (Fandomly Points)
- **Purpose**: Application-wide gamification and engagement
- **Currency**: Fandomly Points (universal across platform)
- **Configuration**: Highly flexible per-task customization
- **Examples**: Complete profile, check-ins, referrals, social actions
- **Reward**: Points currency

#### 2. Creator Verification System
- **Purpose**: Trust signals and feature unlocking
- **Configuration**: Platform-defined required fields
- **Requirements**: Basic info + type-specific data + social media
- **Reward**: "Verified" badge (not points)

---

## ✅ Phase 1: Core Foundation (COMPLETE)

### Task Rule Schema (`shared/taskRuleSchema.ts`)
- ✅ 8 task-specific sub-schemas with Zod validation
- ✅ Section-based organization (6 categories)
- ✅ Timing system: Update cadence + Reward frequency
- ✅ Dual reward types: Points OR Multipliers
- ✅ Platform enums (Twitter, Instagram, TikTok, etc.)

### Reusable Components
- ✅ `TaskTimingConfig.tsx` - Visual timing configuration
- ✅ `TaskRewardConfig.tsx` - Points vs multiplier selector

### Database Schema
- ✅ 3 new enum types (task_section, update_cadence, reward_frequency)
- ✅ Extended enums (reward_type + multiplier, social_platform + system)
- ✅ 14 new columns in `tasks` table
- ✅ `verificationData` JSONB in `creators` table

---

## ✅ Phase 2A: Complete Profile & Verification (COMPLETE)

### Fan Profile Tasks
- ✅ `CompleteProfileTaskBuilder.tsx`
  - 11 profile fields (Basic, Preferences, Social)
  - 2 reward modes: All-or-nothing vs Per-field
  - Live preview with total points
  - Smart recommendations

### Creator Verification
- ✅ `creatorVerificationSchema.ts`
  - Required fields per creator type
  - Auto-calculation of completion percentage
  - Auto-verification at 100%
  - Missing fields tracking

### Integration
- ✅ Creator Dashboard (compact progress card)
- ✅ Creator Settings (full verification tab)
- ✅ Creator Profile (verified badge)

---

## 🚧 Phase 2B: Core Task Templates (NEXT UP)

### 1. Referral Task Builder
**Reference**: https://docs.snagsolutions.io/loyalty/rules/refer-friends

**Configuration Options:**
- Reward structure:
  - Fixed (referrer gets X points, referred gets Y points)
  - Percentage (referrer gets % of referred user's future earnings)
- Qualifying conditions:
  - Quest completion
  - Point threshold (e.g., referred must earn 100 points)
  - Account age (e.g., referred must be active 7 days)
- Limits:
  - Max referrals per user
  - Total max referrals (campaign-wide cap)

**UI Components:**
```tsx
<ReferralTaskBuilder>
  <RadioGroup> {/* Fixed vs Percentage */}
    <Option: Fixed>
      <Input: Referrer Points />
      <Input: Referred Points />
    </Option>
    <Option: Percentage>
      <Slider: Percentage (1-50%) />
    </Option>
  </RadioGroup>
  
  <QualifyingConditions>
    <Button: Add Condition />
    {conditions.map(condition => (
      <ConditionCard>
        <Select: Type (quest/points/age) />
        <Input: Value />
      </ConditionCard>
    ))}
  </QualifyingConditions>
  
  <Limits>
    <Input: Max per User />
    <Input: Total Max />
  </Limits>
</ReferralTaskBuilder>
```

---

### 2. Check-In Task Builder
**Reference**: https://docs.snagsolutions.io/loyalty/rules/check-in

**Configuration Options:**
- Base points per check-in
- Check-in frequency (daily/weekly/monthly)
- Streak system:
  - Enable/disable streaks
  - Milestone configuration (3-day, 7-day, 30-day, etc.)
  - Bonus points per milestone
  - Celebration asset (image/video on completion)
- Advanced options:
  - "Reward only streak completions" (no points until streak done)
  - "Count any rule as check-in" (any task = check-in)

**UI Components:**
```tsx
<CheckInTaskBuilder>
  <Input: Points Per Check-In />
  <Select: Frequency (daily/weekly/monthly) />
  
  <Switch: Enable Streak Bonuses />
  {streaksEnabled && (
    <>
      <Switch: Reward Only Streak Completions />
      <StreakMilestones>
        <Button: Add Milestone />
        {milestones.map(milestone => (
          <MilestoneCard>
            <Input: Consecutive Days />
            <Input: Bonus Points />
          </MilestoneCard>
        ))}
      </StreakMilestones>
    </>
  )}
  
  <CelebrationAsset>
    <RadioGroup: None / Image / Video />
    <Input: Asset URL />
  </CelebrationAsset>
  
  <Switch: Count Any Task as Check-In />
</CheckInTaskBuilder>
```

---

### 3. Follower Milestone Builder
**Reference**: https://docs.snagsolutions.io/loyalty/rules/x-followers

**Configuration Options:**
- Platform selector (Twitter, Instagram, TikTok, YouTube, Spotify)
- Milestone structure:
  - Single (one-time at X followers)
  - Tiered (multiple milestones at different thresholds)
- Tier manager (add/remove/sort dynamically)
- Update cadence: Always daily (follower counts checked at midnight UTC)

**UI Components:**
```tsx
<FollowerMilestoneBuilder>
  <Select: Platform (Twitter/Instagram/TikTok/YouTube/Spotify) />
  
  <RadioGroup: Single vs Tiered />
  
  {single && (
    <SingleMilestone>
      <Input: Target Follower Count />
      <Input: Points to Reward />
    </SingleMilestone>
  )}
  
  {tiered && (
    <TieredMilestones>
      <Button: Add Tier />
      {tiers.map((tier, index) => (
        <TierCard>
          <Badge: Tier {index + 1} />
          <Input: Followers />
          <Input: Points />
          <Button: Remove />
        </TierCard>
      ))}
    </TieredMilestones>
  )}
  
  <Alert>
    Follower counts checked daily at midnight UTC
  </Alert>
</FollowerMilestoneBuilder>
```

---

## 📋 Phase 2C: Social & Community Templates (FUTURE)

### Social Action Templates

#### Twitter/X Tasks
- Follow account
- Retweet specific tweet
- Like tweet
- Comment on tweet
- Post with hashtag
- Bio contains text
- Username contains text
- Reach X followers (already in Phase 2B)

#### Instagram Tasks
- Follow account
- Like post

#### TikTok Tasks
- Follow account
- Like video
- Share video

#### YouTube Tasks
- Subscribe to channel
- Like video
- Comment on video

#### Spotify Tasks
- Follow artist
- Add song to playlist

### Community Templates

#### Discord Tasks
- Join server
- Send message
- Get specific role

#### Telegram Tasks
- Join group
- Send message

---

## 📋 Phase 2D: Custom Task Templates (FUTURE)

### Code Entry Builder
- Code validation
- One-time use codes
- Multi-use codes with limits
- Expiration dates

### Quiz/Poll Builder
- Multiple choice questions
- Correct answer validation
- Points per correct answer
- Time limits

### Link Click Builder
- External link tracking
- Conversion tracking
- Time on page requirements

### Text Submission Builder
- Free-form text input
- Character limits
- Moderation queue
- Auto-approval vs manual review

---

## 🎯 Task Configuration Matrix

| Task Type | Section | Update Cadence | Reward Frequency | Best Reward | Status |
|-----------|---------|---------------|------------------|-------------|---------|
| Complete Profile | Onboarding | Immediate | One Time | Points | ✅ Built |
| Connect Account | Onboarding | Immediate | One Time | Points | 📋 Future |
| Refer Friend | Onboarding | Immediate | One Time | Points/% | 🚧 Next |
| Daily Check-In | Onboarding | Daily | Daily | Points | 🚧 Next |
| Reach Followers | Social | Daily | One Time | Multiplier | 🚧 Next |
| Twitter Follow | Social | Immediate | One Time | Points | 📋 Future |
| Discord Join | Community | Immediate | One Time | Points | 📋 Future |
| Code Entry | Custom | Immediate | One Time | Points | 📋 Future |
| Quiz | Custom | Immediate | One Time | Points | 📋 Future |

**Legend:**
- ✅ Built: Component complete and ready
- 🚧 Next: Phase 2B (immediate priority)
- 📋 Future: Phase 2C/2D

---

## 🗄️ Database Schema

### `tasks` Table (Enhanced with Snag Fields)
```sql
-- Basic Details
id              uuid              PRIMARY KEY
name            text              NOT NULL
description     text
section         task_section      DEFAULT 'custom'
start_time      timestamp
end_time        timestamp
is_required     boolean           DEFAULT false
hide_from_ui    boolean           DEFAULT false

-- Reward Configuration
reward_type             reward_type       DEFAULT 'points'
points_to_reward        integer           DEFAULT 50
point_currency          text              DEFAULT 'default'
multiplier_value        numeric(4,2)
currencies_to_apply     jsonb
apply_to_existing_balance boolean         DEFAULT false

-- Timing Configuration
update_cadence          update_cadence    DEFAULT 'immediate'
reward_frequency        reward_frequency  DEFAULT 'one_time'

-- Task-Specific Data
platform                text
task_type               text
custom_settings         jsonb
is_draft                boolean           DEFAULT false

-- Timestamps
created_at              timestamp         DEFAULT NOW()
updated_at              timestamp         DEFAULT NOW()
```

### `creators` Table (Verification Data)
```sql
-- Creator Verification System
verification_data    jsonb    DEFAULT {
  "profileComplete": false,
  "requiredFieldsFilled": [],
  "completionPercentage": 0
}

-- Structure:
{
  profileComplete: boolean,
  requiredFieldsFilled: string[],
  verifiedAt?: string,              // ISO timestamp
  verificationMethod?: 'auto' | 'manual',
  completionPercentage: number,     // 0-100
  missingFields?: string[]
}
```

---

## 🎨 UI/UX Design Patterns

### Color Themes by Feature
- **Blue** (#3B82F6): All-or-nothing rewards, profile completion
- **Green** (#10B981): Per-field rewards, multipliers, check-ins
- **Yellow** (#F59E0B): Points, currency
- **Purple** (#8B5CF6): Social engagement
- **Orange** (#F97316): Content creation
- **Pink** (#EC4899): Music/streaming

### Component Patterns
1. **Radio Cards** - Large clickable cards with icons for mode selection
2. **Checkbox Lists** - Category-grouped field selection
3. **Slider + Input** - Combined controls for numeric values
4. **Badge Indicators** - "Recommended", "Required", status markers
5. **Live Previews** - Real-time calculation displays
6. **Help Text** - Context-aware descriptions

### Timing Configuration
- Icon-based cadence selector (Zap, Calendar, RefreshCw)
- Color-coded options for easy scanning
- Live preview explains exact behavior
- Smart defaults prevent invalid configurations

---

## 🔗 Reference Documentation

### Snag Solutions (Primary)
- **Rules Configuration**: https://docs.snagsolutions.io/loyalty/rules-configuration
- **Complete Profile**: https://docs.snagsolutions.io/loyalty/rules/complete-profile
- **Refer Friends**: https://docs.snagsolutions.io/loyalty/rules/refer-friends
- **Check-In**: https://docs.snagsolutions.io/loyalty/rules/check-in
- **X Followers**: https://docs.snagsolutions.io/loyalty/rules/x-followers

### Kazm (Secondary)
- Campaign-level reward distribution
- Points-based leveling systems
- Multi-tiered challenges

---

## 🚀 Implementation Timeline

### Completed
- ✅ **Phase 1** (Week 1): Core configuration system
- ✅ **Phase 2A** (Week 2): Complete profile + verification

### Next Up
- 🚧 **Phase 2B** (Week 3): Core task templates
  - Referral Task Builder (2 days)
  - Check-In Task Builder (2 days)
  - Follower Milestone Builder (2 days)

### Future Sprints
- 📋 **Phase 2C** (Week 4-5): Social & community templates
- 📋 **Phase 2D** (Week 6): Custom task templates
- 📋 **Phase 3** (Week 7-8): Task creation flow integration
- 📋 **Phase 4** (Week 9-10): Fan dashboard & task discovery
- 📋 **Phase 5** (Week 11-12): Analytics & creator insights

---

## 📈 Success Metrics

### Phase 1-2A Achievements
- ✅ Zero TypeScript errors
- ✅ Database migration successful
- ✅ All components follow design system
- ✅ Type-safe with Zod validation
- ✅ Reusable component architecture
- ✅ Clear Fan/Creator separation

### Phase 2B Goals
- Build 3 core task templates
- Test end-to-end task creation
- Validate with real campaign scenarios
- Zero linter/TypeScript errors

---

## 🎯 Key Architectural Decisions

### 1. Separation of Concerns
- Fan rewards (points) vs Creator verification (badges) are separate
- Shared infrastructure but different purposes
- Independent evolution of each system

### 2. Structured Configuration
- No rich text editors (Snag philosophy)
- Every option is dropdown/toggle/slider
- Prevents misconfiguration

### 3. Flexible Storage
- `customSettings` JSONB for platform-specific config
- Type-safe schemas for common tasks
- Easy to add new task types

### 4. Timing System
- Separate: "when to check" vs "when to reward"
- Allows complex scenarios (check daily, reward weekly)
- Smart defaults prevent invalid combinations

### 5. Reward Types
- Points for simple tasks
- Multipliers for VIP rewards (boost future earnings)
- Multi-currency support
- Extensible for future types (badges, NFTs, raffles)

---

**Status**: 🟢 **READY FOR PHASE 2B**

**Next Action**: Begin building Referral Task Builder

**Estimated Completion**: Phase 2B (3 core tasks) - 1 week

