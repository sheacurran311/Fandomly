# 📘 Snag Task System - Detailed Reference

> **Companion document to FANDOMLY_MASTER_PLAN.md**  
> This document provides detailed UI/UX examples and configuration patterns from Snag.

---

## 🎨 Snag's Design Philosophy

### **Core Principles:**
1. **Structured Configuration** - No free-form text fields
2. **Visual Feedback** - Every option has icons and descriptions
3. **Section-Based Organization** - Group related settings
4. **Time-Based Logic** - Update cadence + reward frequency
5. **Multiplier System** - Future earnings boost, not just points
6. **Repeatability** - Daily/weekly/monthly task resets

---

## 📋 Complete Task Configuration Sections

Based on [Snag Rules Configuration](https://docs.snagsolutions.io/loyalty/rules-configuration):

### **Section 1: Basic Details**
```typescript
{
  name: "Task Name",
  description: "What fans need to do",
  section: "user_onboarding" | "social_engagement" | "community_building" | etc.,
  startTime: "2025-01-01T00:00:00Z",
  endTime: "2025-12-31T23:59:59Z",
  isRequired: false,  // Block other tasks
  hideFromUI: false   // Hidden background task
}
```

### **Section 2: Contract/Platform Address**
*Only for blockchain/smart contract rules - not applicable to social tasks*

### **Section 3: Reward Configuration**
```typescript
{
  rewardType: "points" | "multiplier",
  
  // If "points"
  pointsToReward: 100,
  pointCurrency: "default" | "custom_currency_name",
  
  // If "multiplier"
  multiplierValue: 1.5, // Must be > 1
  currenciesToApply: ["default", "bonus_points"],
  applyToExistingBalance: false,
  
  // Timing
  updateCadence: "immediate" | "daily" | "weekly" | "monthly",
  rewardFrequency: "one_time" | "daily" | "weekly" | "monthly"
}
```

### **Section 4: Custom Settings**
*Platform-specific fields - varies by task type*

---

## 🎯 Fandomly Priority Tasks - Detailed Examples

### **1. Complete Profile Task**

**Reference:** [Snag Complete Profile](https://docs.snagsolutions.io/loyalty/rules/complete-profile)

#### **Configuration UI:**
```tsx
<Card className="p-6">
  <CardHeader>
    <CardTitle>Complete Profile</CardTitle>
    <CardDescription>Reward fans for completing their profile</CardDescription>
  </CardHeader>
  
  <CardContent className="space-y-6">
    {/* Field Selection */}
    <div>
      <Label className="text-lg mb-4">Required Profile Fields</Label>
      <div className="space-y-2">
        {[
          { id: "username", label: "Username", alwaysRequired: true },
          { id: "avatar", label: "Profile Photo" },
          { id: "bio", label: "Bio/Description" },
          { id: "location", label: "Location" },
          { id: "interests", label: "Fan Interests" },
          { id: "twitter", label: "Twitter Handle" },
          { id: "instagram", label: "Instagram Handle" },
          { id: "discord", label: "Discord Username" },
        ].map(field => (
          <div key={field.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={selectedFields.includes(field.id)}
                disabled={field.alwaysRequired}
              />
              <Label className="font-medium">{field.label}</Label>
              {field.alwaysRequired && (
                <Badge variant="secondary">Always Required</Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
    
    <Separator />
    
    {/* Reward Type */}
    <div>
      <Label>Reward Type</Label>
      <Select value={rewardType} onValueChange={setRewardType}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all_or_nothing">
            <div>
              <div className="font-medium">All or Nothing</div>
              <div className="text-xs text-gray-400">
                Full points only when ALL selected fields are completed
              </div>
            </div>
          </SelectItem>
          <SelectItem value="per_field">
            <div>
              <div className="font-medium">Points Per Field</div>
              <div className="text-xs text-gray-400">
                Award points for each individual field completed
              </div>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
    
    {/* Points Configuration */}
    {rewardType === "all_or_nothing" && (
      <div>
        <Label>Total Points for Completion</Label>
        <Input type="number" value={totalPoints} placeholder="e.g., 500" />
      </div>
    )}
    
    {rewardType === "per_field" && (
      <div>
        <Label>Points Per Field</Label>
        <Input type="number" value={pointsPerField} placeholder="e.g., 50" />
        <p className="text-sm text-gray-400 mt-2">
          With {selectedFields.length} fields selected, max possible: {selectedFields.length * pointsPerField} points
        </p>
      </div>
    )}
    
    {/* Timing */}
    <TaskTimingConfig
      updateCadence="immediate"
      rewardFrequency="one_time"
      onChange={handleTimingChange}
    />
  </CardContent>
</Card>
```

---

### **2. Refer a Friend Task**

**Reference:** [Snag Refer Friends](https://docs.snagsolutions.io/loyalty/rules/refer-friends)

#### **Configuration UI:**
```tsx
<Card className="p-6">
  <CardHeader>
    <CardTitle>Refer a Friend</CardTitle>
    <CardDescription>Reward fans for bringing new users</CardDescription>
  </CardHeader>
  
  <CardContent className="space-y-6">
    {/* Reward Structure */}
    <div>
      <Label className="text-lg mb-4">Reward Structure</Label>
      <RadioGroup value={rewardType} onValueChange={setRewardType}>
        <div className="flex items-center space-x-3 p-4 border rounded-lg">
          <RadioGroupItem value="fixed" id="fixed" />
          <Label htmlFor="fixed" className="flex-1 cursor-pointer">
            <div className="font-medium">Fixed Points</div>
            <div className="text-sm text-gray-400">
              Set specific point amounts for referrer and referred user
            </div>
          </Label>
          <Coins className="h-5 w-5 text-yellow-500" />
        </div>
        
        <div className="flex items-center space-x-3 p-4 border rounded-lg">
          <RadioGroupItem value="percentage" id="percentage" />
          <Label htmlFor="percentage" className="flex-1 cursor-pointer">
            <div className="font-medium">Percentage of Earnings</div>
            <div className="text-sm text-gray-400">
              Referrer earns a percentage of all points the referred user earns
            </div>
          </Label>
          <TrendingUp className="h-5 w-5 text-green-500" />
        </div>
      </RadioGroup>
    </div>
    
    {/* Fixed Points Configuration */}
    {rewardType === "fixed" && (
      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Points for Referrer</Label>
            <Input
              type="number"
              value={referrerPoints}
              onChange={(e) => setReferrerPoints(Number(e.target.value))}
              placeholder="e.g., 100"
            />
            <p className="text-xs text-gray-400 mt-1">Person who shares the link</p>
          </div>
          <div>
            <Label>Points for Referred User</Label>
            <Input
              type="number"
              value={referredPoints}
              onChange={(e) => setReferredPoints(Number(e.target.value))}
              placeholder="e.g., 50"
            />
            <p className="text-xs text-gray-400 mt-1">Person who signs up</p>
          </div>
        </div>
      </div>
    )}
    
    {/* Percentage Configuration */}
    {rewardType === "percentage" && (
      <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
        <Label>Referrer Earnings Percentage</Label>
        <div className="flex items-center gap-4 mt-2">
          <Slider
            min={1}
            max={50}
            step={1}
            value={[percentageOfReferred]}
            onValueChange={(vals) => setPercentageOfReferred(vals[0])}
            className="flex-1"
          />
          <div className="flex items-center gap-1 min-w-[80px]">
            <Input
              type="number"
              value={percentageOfReferred}
              onChange={(e) => setPercentageOfReferred(Number(e.target.value))}
              className="w-16"
            />
            <span className="text-sm text-gray-400">%</span>
          </div>
        </div>
        <Alert className="mt-3">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Referrer will earn <strong>{percentageOfReferred}%</strong> of all points the referred user earns in the future
          </AlertDescription>
        </Alert>
      </div>
    )}
    
    <Separator />
    
    {/* Qualifying Conditions */}
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <Label className="text-lg">Qualifying Conditions</Label>
          <p className="text-sm text-gray-400">
            Referred user must meet these before referrer gets rewarded
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={addCondition}>
          <Plus className="h-4 w-4 mr-2" />
          Add Condition
        </Button>
      </div>
      
      {qualifyingConditions.length === 0 ? (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            No conditions set - referrer gets rewarded immediately when someone signs up
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-2">
          {qualifyingConditions.map((condition, index) => (
            <Card key={index} className="p-3">
              <div className="flex items-center gap-3">
                <Badge variant="outline">{index + 1}</Badge>
                
                <Select
                  value={condition.type}
                  onValueChange={(val) => updateCondition(index, "type", val)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quest_completion">Complete Quest</SelectItem>
                    <SelectItem value="point_threshold">Reach Points</SelectItem>
                    <SelectItem value="account_age">Account Age (days)</SelectItem>
                  </SelectContent>
                </Select>
                
                {condition.type === "quest_completion" && (
                  <Select
                    value={condition.value}
                    onValueChange={(val) => updateCondition(index, "value", val)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a quest..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableQuests.map(quest => (
                        <SelectItem key={quest.id} value={quest.id}>
                          {quest.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                
                {condition.type === "point_threshold" && (
                  <Input
                    type="number"
                    value={condition.value}
                    onChange={(e) => updateCondition(index, "value", e.target.value)}
                    placeholder="Points"
                    className="w-[120px]"
                  />
                )}
                
                {condition.type === "account_age" && (
                  <Input
                    type="number"
                    value={condition.value}
                    onChange={(e) => updateCondition(index, "value", e.target.value)}
                    placeholder="Days"
                    className="w-[120px]"
                  />
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCondition(index)}
                  className="ml-auto"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
    
    <Separator />
    
    {/* Referral Limits */}
    <div>
      <Label className="text-lg mb-3">Referral Limits</Label>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm">Max Referrals Per User</Label>
          <Input
            type="number"
            value={maxReferralsPerUser}
            onChange={(e) => setMaxReferralsPerUser(e.target.value)}
            placeholder="Unlimited"
          />
          <p className="text-xs text-gray-400 mt-1">
            How many friends each fan can refer
          </p>
        </div>
        <div>
          <Label className="text-sm">Total Max Referrals</Label>
          <Input
            type="number"
            value={totalMaxReferrals}
            onChange={(e) => setTotalMaxReferrals(e.target.value)}
            placeholder="Unlimited"
          />
          <p className="text-xs text-gray-400 mt-1">
            Total referrals across all fans
          </p>
        </div>
      </div>
    </div>
    
    {/* Timing */}
    <TaskTimingConfig
      updateCadence="immediate"
      rewardFrequency="one_time"
      onChange={handleTimingChange}
    />
  </CardContent>
</Card>
```

---

### **3. Check-In System**

**Reference:** [Snag Check-In](https://docs.snagsolutions.io/loyalty/rules/check-in)

#### **Streak Milestone Configuration:**
```tsx
<Card className="p-6">
  <CardHeader>
    <CardTitle>Check-In Configuration</CardTitle>
    <CardDescription>Reward fans for regular engagement</CardDescription>
  </CardHeader>
  
  <CardContent className="space-y-6">
    {/* Basic Settings */}
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label>Points Per Check-In</Label>
        <Input
          type="number"
          value={pointsPerCheckIn}
          onChange={(e) => setPointsPerCheckIn(Number(e.target.value))}
          placeholder="e.g., 10"
        />
      </div>
      
      <div>
        <Label>Check-In Frequency</Label>
        <Select value={frequency} onValueChange={setFrequency}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily (resets midnight UTC)</SelectItem>
            <SelectItem value="weekly">Weekly (resets Monday)</SelectItem>
            <SelectItem value="monthly">Monthly (resets 1st)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
    
    <Separator />
    
    {/* Streak System */}
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-lg">Streak Bonuses</Label>
          <p className="text-sm text-gray-400">
            Reward consecutive check-ins with bonus points
          </p>
        </div>
        <Switch
          checked={enableStreak}
          onCheckedChange={setEnableStreak}
        />
      </div>
      
      {enableStreak && (
        <>
          <div className="flex items-center justify-between p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <div>
              <Label>Reward Only Streak Completions</Label>
              <p className="text-sm text-gray-400">
                No daily points until full streak is achieved (hides check-in from UI)
              </p>
            </div>
            <Switch
              checked={rewardOnlyStreakCompletions}
              onCheckedChange={setRewardOnlyStreakCompletions}
            />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Streak Milestones</Label>
              <Button variant="outline" size="sm" onClick={addStreakMilestone}>
                <Plus className="h-4 w-4 mr-2" />
                Add Milestone
              </Button>
            </div>
            
            <div className="space-y-2">
              {streakMilestones.map((milestone, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary" className="shrink-0">
                      <Flame className="h-3 w-3 mr-1" />
                      Milestone {index + 1}
                    </Badge>
                    
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm">Consecutive Days</Label>
                        <Input
                          type="number"
                          value={milestone.consecutiveDays}
                          onChange={(e) => updateMilestone(index, "consecutiveDays", Number(e.target.value))}
                          placeholder="e.g., 7"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Bonus Points</Label>
                        <Input
                          type="number"
                          value={milestone.bonusPoints}
                          onChange={(e) => updateMilestone(index, "bonusPoints", Number(e.target.value))}
                          placeholder="e.g., 100"
                        />
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMilestone(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
              
              {streakMilestones.length === 0 && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    No streak milestones configured. Fans will only earn daily check-in points.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </>
      )}
    </div>
    
    <Separator />
    
    {/* Celebration Asset */}
    <div className="space-y-4">
      <Label className="text-lg">Check-In Celebration</Label>
      <p className="text-sm text-gray-400">
        Show a celebratory image or video on successful check-in
      </p>
      
      <RadioGroup value={celebrationType} onValueChange={setCelebrationType}>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="none" id="none" />
          <Label htmlFor="none">No celebration</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="image" id="image" />
          <Label htmlFor="image">Show image (GIF or static)</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="video" id="video" />
          <Label htmlFor="video">Play video</Label>
        </div>
      </RadioGroup>
      
      {celebrationType !== "none" && (
        <div>
          <Label>Asset URL</Label>
          <Input
            type="url"
            value={celebrationUrl}
            onChange={(e) => setCelebrationUrl(e.target.value)}
            placeholder={
              celebrationType === "image"
                ? "https://example.com/celebration.gif"
                : "https://example.com/celebration.mp4"
            }
          />
        </div>
      )}
    </div>
    
    <Separator />
    
    {/* Advanced Options */}
    <div className="flex items-center justify-between p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
      <div>
        <Label>Count Any Task Completion as Check-In</Label>
        <p className="text-sm text-gray-400">
          Completing any other task automatically counts as checking in
        </p>
      </div>
      <Switch
        checked={countAnyRuleAsCheckIn}
        onCheckedChange={setCountAnyRuleAsCheckIn}
      />
    </div>
    
    {/* Timing */}
    <TaskTimingConfig
      updateCadence="daily"
      rewardFrequency={frequency}
      onChange={handleTimingChange}
      fixedCadence={true}
    />
  </CardContent>
</Card>
```

---

## 🎨 Color System & Visual Design

### **Task Category Colors:**
```css
--category-onboarding: #3b82f6;    /* Blue */
--category-social: #8b5cf6;        /* Purple */
--category-community: #10b981;     /* Green */
--category-streaming: #ec4899;     /* Pink */
--category-custom: #6b7280;        /* Gray */
```

### **Platform Brand Colors:**
```css
--platform-twitter: #1da1f2;
--platform-facebook: #1877f2;
--platform-instagram: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);
--platform-youtube: #ff0000;
--platform-tiktok: #000000;
--platform-spotify: #1db954;
--platform-discord: #5865f2;
--platform-telegram: #0088cc;
```

### **Reward Type Indicators:**
```css
--reward-points: #eab308;         /* Yellow - Coins icon */
--reward-multiplier: #10b981;     /* Green - TrendingUp icon */
--reward-streak: #f97316;         /* Orange - Flame icon */
```

---

**Document Status:** 📚 Complete reference guide  
**Usage:** Companion to FANDOMLY_MASTER_PLAN.md  
**Last Updated:** September 30, 2025

