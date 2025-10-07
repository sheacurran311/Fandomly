# 🎨 Snag/Kazm Design Inspiration & Code Implementation

## 📸 Visual References

### **Snag Interface Screenshots**
- `attached_assets/snag1_1758415023997.png` - Rule Type Selection Interface
- `attached_assets/snag2_1758415023997.png` - Loyalty Settings Configuration  
- `attached_assets/snag3_1758415023996.png` - Badge Creation Modal
- Additional variations: `snag4-6_*.png` with different timestamps

### **Kazm Interface Screenshots**  
- `attached_assets/kazm1_1758387011651.png` - Quest Creation Flow
- `attached_assets/kazm2_1758387011651.png` - Qualifying Conditions Setup
- `attached_assets/kazm3_1758387011649.png` - Quest Management List View
- Additional variations: `kazm4-6_*.png` with different timestamps

## 🏗️ Snag Interface Analysis & Implementation

### **1. Rule Type Selection (snag1.png)**

#### **Snag's Design Pattern:**
```
Categories (Left Sidebar):
├── NFT Activity
├── Social Quests  
├── Token Activity
├── Campaign Onchain Login
└── Other

Rule Types (Main Area):
├── Mint an NFT (Reward users for minting a new NFT)
├── Purchase an NFT (Reward users for purchasing a specific NFT)  
├── Hold an NFT (Reward users for holding a new NFT)
├── Sell an NFT (Reward users for selling a specific NFT)
├── Hold an ERC-20 Token (Reward users for holding a specific amount of ERC-20 tokens)
└── [Additional rule types...]
```

#### **Our Implementation:**
```typescript
// File: shared/taskTemplates.ts
export const CORE_TASK_TEMPLATES = {
  // Twitter Templates
  twitter_follow: {
    id: "twitter_follow",
    name: "Follow on Twitter",
    platform: "twitter",
    defaultPoints: 10,
    description: "Reward users for following your Twitter account",
    category: "Social Media",
  },
  
  // Facebook Templates  
  facebook_like: {
    id: "facebook_like", 
    name: "Like Facebook Page",
    platform: "facebook",
    defaultPoints: 10,
    description: "Reward users for liking your Facebook page",
    category: "Social Media",
  },
  // ... 12 total templates
};

// File: client/src/components/templates/TaskTemplateManagement.tsx
export function TaskTemplateManagement() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Object.values(CORE_TASK_TEMPLATES).map((template) => (
        <Card key={template.id} className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {getPlatformIcon(template.platform)}
              <div>
                <h3 className="font-semibold">{template.name}</h3>
                <p className="text-sm text-muted-foreground">{template.platform}</p>
              </div>
            </div>
            <Badge variant="secondary">{template.defaultPoints} pts</Badge>
          </div>
          <p className="text-sm mb-4">{template.description}</p>
          <Button 
            onClick={() => onSelectTemplate(template)}
            className="w-full"
            data-testid={`button-use-template-${template.id}`}
          >
            Use Template
          </Button>
        </Card>
      ))}
    </div>
  );
}
```

### **2. Loyalty Settings (snag2.png)**

#### **Snag's Configuration Form:**
```
Page Settings:
├── Page Title: "e.g. Loyalty Program"
├── Page Description: [Text area]
├── Rules Title: "Earn loyalty points"
├── Banner Image: [Upload area - Recommended size 1200x600]

Settings:
├── Enable loyalty first value: [Toggle Switch]
├── Currencies & balances: [Add new currency button]
├── Additional settings: [Update URL balance button]
└── Advanced settings: [Sync money Cap, Re-check % accounts toggles]
```

#### **Our Implementation:**
```typescript
// File: client/src/components/templates/TaskConfigurationForm.tsx
const configSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  platform: z.string(),
  taskType: z.string(), 
  pointValue: z.number().min(1).max(1000),
  verificationMethod: z.enum(["manual", "automatic"]),
  url: z.string().url("Invalid URL").optional().or(z.literal("")),
  handle: z.string().optional(),
});

export function TaskConfigurationForm({ template, onSave, onCancel }) {
  const form = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      title: template.name,
      description: template.description,
      platform: template.platform,
      taskType: template.taskType,
      pointValue: template.defaultPoints,
      verificationMethod: "automatic",
      url: "",
      handle: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)} className="space-y-6">
        {/* Basic Configuration */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Basic Configuration</h3>
          
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Task Title</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-task-title" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Platform-specific fields */}
          {template.platform === "twitter" && (
            <FormField
              control={form.control}
              name="handle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Twitter Handle (optional)</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="@username" 
                      data-testid="input-twitter-handle"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          )}
          
          {/* Points & Verification */}
          <FormField
            control={form.control}
            name="pointValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Point Value</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    {...field} 
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    data-testid="input-point-value"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" data-testid="button-save-task">
            Create Task
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

### **3. Badge Configuration Modal (snag3.png)**

#### **Snag's Modal Pattern:**
```
Add New Loyalty Badge Modal:
├── Badge Name: [Text input with validation]
├── Badge Icon: [Icon picker with visual selection]
├── Conditions: [Condition builder interface]
├── Add Condition: [+ Button to add new conditions]  
└── Actions: [Cancel] [Add] buttons
```

#### **Our Modal Implementation Pattern:**
```typescript
// Similar pattern in our TemplatePicker.tsx
export function TemplatePicker({ isOpen, onClose, selectedTemplate }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Task from Template</DialogTitle>
          <DialogDescription>
            Configure your task settings and requirements
          </DialogDescription>
        </DialogHeader>
        
        {/* 3-Step Process */}
        <div className="space-y-6">
          {currentStep === 1 && <PlatformSelectionStep />}
          {currentStep === 2 && <TaskTypeSelectionStep />}
          {currentStep === 3 && <TaskConfigurationStep />}
        </div>
        
        {/* Step Navigation */}
        <div className="flex justify-between mt-6">
          <Button 
            variant="outline" 
            onClick={onClose}
            data-testid="button-cancel-template"
          >
            Cancel
          </Button>
          <div className="flex gap-2">
            {currentStep > 1 && (
              <Button 
                variant="outline" 
                onClick={() => setCurrentStep(currentStep - 1)}
                data-testid="button-previous-step"
              >
                Previous
              </Button>
            )}
            {currentStep < 3 ? (
              <Button 
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!canProceedToNextStep()}
                data-testid="button-next-step"
              >
                Next
              </Button>
            ) : (
              <Button 
                onClick={handleCreateTask}
                disabled={createTaskMutation.isPending}
                data-testid="button-create-task"
              >
                {createTaskMutation.isPending ? "Creating..." : "Create Task"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

## 🚀 Kazm Interface Analysis & Implementation

### **1. Quest Creation Flow (kazm1.png)**

#### **Kazm's Design Pattern:**
```
Platform Selection: Twitter/X with platform icon
Rich Text Editor: Bold, Italic, Underline, Link, Image options
Points Configuration: "10 points" input field
Verification Options:
├── Verify manually: "Wait until an admin verifies completion"
└── Auto-approve: "Automatically grant points without verification"
Prerequisites: Expandable section for quest dependencies
Actions: [Save] button (purple/blue brand color)
```

#### **Our Implementation:**
```typescript
// File: client/src/components/templates/TemplatePicker.tsx - Step 3
function TaskConfigurationStep() {
  return (
    <div className="space-y-6">
      {/* Platform Display (matches Kazm's platform header) */}
      <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
        {getPlatformIcon(selectedPlatform)}
        <div>
          <h3 className="font-semibold">{selectedPlatform.toUpperCase()}</h3>
          <p className="text-sm text-muted-foreground">{selectedTaskType}</p>
        </div>
      </div>

      {/* Configuration Form (matches Kazm's detailed setup) */}
      <TaskConfigurationForm 
        template={selectedTemplate}
        platform={selectedPlatform}
        taskType={selectedTaskType}
        onSave={handleTaskCreation}
        onCancel={() => setCurrentStep(2)}
      />
    </div>
  );
}

// Platform-specific icons (matching Kazm's visual style)
function getPlatformIcon(platform: string) {
  const icons = {
    twitter: <svg className="w-6 h-6 text-blue-400">...</svg>,
    facebook: <svg className="w-6 h-6 text-blue-600">...</svg>,
    instagram: <svg className="w-6 h-6 text-pink-500">...</svg>,
    youtube: <svg className="w-6 h-6 text-red-500">...</svg>,
    tiktok: <svg className="w-6 h-6 text-black">...</svg>,
    spotify: <svg className="w-6 h-6 text-green-500">...</svg>,
  };
  return icons[platform] || <div className="w-6 h-6 bg-gray-300 rounded" />;
}
```

### **2. Qualifying Conditions (kazm2.png)**

#### **Kazm's Condition Builder:**
```
Qualifying Conditions:
├── "Points awarded when referred user meets criteria"
├── Quest Completion Requirements:
│   ├── Quest: "Complete ** quest"
│   ├── Quest: "Complete ** quest" 
│   └── [+ Condition] button
└── Prerequisites: "User must meet these to see the quest"
```

#### **Our Condition System (Future Enhancement):**
```typescript
// Planned enhancement for complex conditions
interface TaskCondition {
  id: string;
  type: "quest_completion" | "point_threshold" | "time_limit" | "user_attribute";
  value: any;
  operator: "equals" | "greater_than" | "less_than" | "contains";
}

interface TaskRule {
  id: string;
  name: string;
  conditions: TaskCondition[];
  logic: "AND" | "OR";
  rewards: {
    points: number;
    badges?: string[];
    unlocks?: string[];
  };
}

// Example implementation structure
export function ConditionBuilder({ conditions, onChange }) {
  return (
    <div className="space-y-4">
      <h4 className="font-medium">Qualifying Conditions</h4>
      <p className="text-sm text-muted-foreground">
        Points awarded when user meets criteria
      </p>
      
      {conditions.map((condition, index) => (
        <div key={condition.id} className="p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <Select 
              value={condition.type}
              onValueChange={(value) => updateCondition(index, "type", value)}
            >
              <SelectItem value="quest_completion">Complete Quest</SelectItem>
              <SelectItem value="point_threshold">Reach Points</SelectItem>
              <SelectItem value="time_limit">Within Time</SelectItem>
            </Select>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => removeCondition(index)}
            >
              ✕
            </Button>
          </div>
        </div>
      ))}
      
      <Button 
        variant="outline" 
        onClick={() => addCondition()}
        className="w-full"
      >
        + Add Condition
      </Button>
    </div>
  );
}
```

### **3. Quest Management View (kazm3.png)**

#### **Kazm's List Layout:**
```
Quest List Interface:
├── Platform Icons: Twitter, Referral, Server join, etc.
├── Quest Titles: "X Follow", "Refer a friend", "Join Telegram Group"
├── Status Indicators: "Finalize Quest" badges
├── Point Values: "+10 pt" prominently displayed
├── Action Menus: Three-dot menus for each quest
└── Organized Card Layout: Clean, scannable interface
```

#### **Our List Implementation:**
```typescript
// File: client/src/components/templates/TaskTemplateManagement.tsx
export function TaskTemplateManagement() {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["/api/tasks"],
    enabled: !!user,
  });

  if (isLoading) {
    return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="p-6">
          <Skeleton className="h-4 w-full mb-4" />
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-8 w-full" />
        </Card>
      ))}
    </div>;
  }

  return (
    <div className="space-y-6">
      {/* Template Grid (matching Kazm's organized layout) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.values(CORE_TASK_TEMPLATES).map((template) => (
          <Card key={template.id} className="p-6 hover:shadow-md transition-shadow">
            {/* Platform Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {getPlatformIcon(template.platform)}
                <div>
                  <h3 className="font-semibold">{template.name}</h3>
                  <p className="text-sm text-muted-foreground capitalize">
                    {template.platform}
                  </p>
                </div>
              </div>
              {/* Point Badge (matching Kazm's +10 pt style) */}
              <Badge variant="secondary" className="font-medium">
                {template.defaultPoints} pts
              </Badge>
            </div>
            
            {/* Description */}
            <p className="text-sm text-muted-foreground mb-4">
              {template.description}
            </p>
            
            {/* Action Button */}
            <Button 
              onClick={() => onSelectTemplate(template)}
              className="w-full"
              data-testid={`button-use-template-${template.id}`}
            >
              Use Template
            </Button>
          </Card>
        ))}
      </div>

      {/* Active Tasks List (when tasks exist) */}
      {tasks && tasks.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Active Tasks</h3>
          <div className="space-y-3">
            {tasks.map((task) => (
              <Card key={task.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getPlatformIcon(task.platform)}
                    <div>
                      <h4 className="font-medium">{task.title}</h4>
                      <p className="text-sm text-muted-foreground">{task.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-medium">
                      +{task.pointValue} pt
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => editTask(task.id)}>
                          Edit Task
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => deleteTask(task.id)}
                          className="text-destructive"
                        >
                          Delete Task
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

## 🎨 Design System Patterns

### **Color Schemes**
```css
/* Snag Style Colors */
.snag-orange { color: #ff6b35; }
.snag-primary { background: #ff6b35; }
.snag-secondary { background: #f5f5f5; }

/* Kazm Style Colors */
.kazm-purple { color: #7c3aed; }
.kazm-blue { background: #3b82f6; }
.kazm-dark { background: #1f2937; }

/* Our Brand Colors */
.brand-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.brand-secondary { background: #10b981; }
.brand-accent { background: #3b82f6; }
```

### **Component Spacing**
```css
/* Consistent with both Snag and Kazm */
.card-padding { padding: 1.5rem; }
.section-gap { gap: 1.5rem; }
.input-spacing { margin-bottom: 1rem; }
.button-group-gap { gap: 0.75rem; }
```

## 📊 Implementation Comparison

| Feature | Snag | Kazm | Our Implementation |
|---------|------|------|-------------------|
| **Category Organization** | ✅ Sidebar categories | ❌ Single platform focus | ✅ Platform-based templates |
| **Rule Configuration** | ✅ Detailed forms | ✅ Rich text editor | ✅ Comprehensive forms |
| **Condition Builder** | ✅ Advanced conditions | ✅ Complex prerequisites | 🟡 Planned enhancement |
| **Visual Design** | 🟠 Orange/white theme | 🟣 Purple/dark theme | 🟣 Purple gradient theme |
| **Template System** | ❌ No templates | ❌ No templates | ✅ 12 core templates |
| **Platform Support** | ✅ Multi-platform | 🟡 Limited platforms | ✅ 6 major platforms |
| **Authentication** | ✅ Integrated auth | ✅ Seamless flow | 🟡 Requires wallet connection |

## 🎯 Next Implementation Steps

### **Immediate Enhancements**
1. **Template Editing**: Make templates truly editable like Snag's loyalty settings
2. **Condition Builder**: Implement Kazm-style qualifying conditions system  
3. **Category Organization**: Add Snag-style sidebar categories for better template organization
4. **Verification Options**: Add manual vs automatic verification like Kazm

### **Advanced Features**
1. **Rich Text Editor**: Implement Kazm's rich text description editor
2. **Prerequisites System**: Add Kazm's prerequisite logic for task dependencies
3. **Badge System**: Implement Snag's badge creation and management
4. **Advanced Conditions**: Build Snag's complex condition builder interface

---

**Reference Files**: 
- Template Implementation: `/client/src/components/templates/`
- Design Screenshots: `/attached_assets/snag*.png` and `/attached_assets/kazm*.png`
- Data Models: `/shared/taskTemplates.ts`