# 🎨 Fandomly Button Design System

## 🎯 Design Principles

### **Contrast Requirements**
- **Light text on dark backgrounds**: Ensure minimum 4.5:1 contrast ratio
- **Dark text on light backgrounds**: Ensure minimum 4.5:1 contrast ratio
- **Never use**: Light text on light backgrounds or dark text on dark backgrounds

### **Brand Color Consistency**
- **Primary Brand**: `#e10698` (RGB 225,6,152)
- **Secondary Brand / Accent**: `#14feee` (RGB 20,254,238)
- **Background**: `#101636`

## 🔧 Button Variants & Usage

### **1. Primary Action Buttons**
**Use for**: Main CTAs, form submissions, important actions
```tsx
className="bg-brand-primary hover:bg-brand-primary/80 text-white font-medium transition-all duration-200 hover:scale-[1.02]"
```

### **2. Secondary Action Buttons**
**Use for**: Secondary actions, alternative options
```tsx
className="bg-brand-secondary hover:bg-brand-secondary/80 text-[#0e1430] font-medium transition-all duration-200 hover:scale-[1.02]"
```

### **3. Outline Buttons**
**Use for**: Cancel actions, secondary navigation, non-destructive alternatives
```tsx
className="border-2 border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white transition-all duration-200"
```

### **4. Ghost Buttons**
**Use for**: Navigation, subtle actions, menu items
```tsx
className="text-gray-300 hover:text-white hover:bg-brand-primary/20 transition-all duration-200"
```

### **5. Destructive Buttons**
**Use for**: Delete actions, dangerous operations
```tsx
className="bg-red-500 hover:bg-red-600 text-white font-medium transition-all duration-200"
```

### **6. Neon/Glow Buttons**
**Use for**: High-impact CTAs on hero/marketing surfaces
```tsx
// Pink primary neon
className="relative bg-brand-primary text-white hover:bg-brand-primary/90 hover:scale-[1.03] shadow-[0_0_12px_rgba(225,6,152,0.65),_0_0_32px_rgba(225,6,152,0.35)] after:content-[''] after:absolute after:inset-0 after:rounded-lg after:blur after:opacity-70 after:bg-[radial-gradient(ellipse_at_center,rgba(225,6,152,0.55),transparent_60%)]"

// Cyan accent neon
className="relative bg-brand-accent text-[#0e1430] hover:bg-brand-accent/90 hover:scale-[1.03] shadow-[0_0_12px_rgba(20,254,238,0.65),_0_0_32px_rgba(20,254,238,0.35)] after:content-[''] after:absolute after:inset-0 after:rounded-lg after:blur after:opacity-70 after:bg-[radial-gradient(ellipse_at_center,rgba(20,254,238,0.55),transparent_60%)]"
```

### **6. Disabled State**
**Use for**: Inactive buttons
```tsx
className="bg-gray-600 text-gray-400 cursor-not-allowed opacity-50"
```

## 📏 Size Variants

### **Small Buttons**
```tsx
className="h-8 px-3 text-sm"
```

### **Default Buttons**
```tsx
className="h-10 px-4 py-2 text-sm"
```

### **Large Buttons**
```tsx
className="h-12 px-6 py-3 text-base"
```

## 🎭 Hover & Focus States

### **Standard Hover Pattern**
```tsx
// Opacity reduction for solid backgrounds
hover:bg-brand-primary/80

// Scale effect for emphasis
hover:scale-[1.02]

// Color transitions for outline buttons
hover:bg-brand-primary hover:text-white
```

### **Focus States**
```tsx
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-brand-dark-bg
```

## 🚫 Anti-Patterns to Avoid

❌ **Don't use**: `text-gray-400` on `bg-white/5` (poor contrast)
❌ **Don't use**: `text-white` on `bg-brand-secondary` (poor contrast) 
❌ **Don't use**: Inconsistent hover states across similar buttons
❌ **Don't use**: Multiple different button styles for the same action type
❌ **Don't use**: Missing transition effects

## ✅ Correct Patterns

✅ **Do use**: `text-white` on `bg-brand-primary` (excellent contrast)
✅ **Do use**: `text-[#0e1430]` on `bg-brand-secondary` (excellent contrast)
✅ **Do use**: Consistent hover patterns across all buttons
✅ **Do use**: Appropriate semantic button variants for actions
✅ **Do use**: Smooth transitions for all interactive states

## 🔄 Migration Strategy

### **Phase 1: Update Core Button Component**
1. Update `/client/src/components/ui/button.tsx` with new variants
2. Add brand color variants to button component
3. Ensure all variants have proper contrast and hover states

### **Phase 2: Update Existing Usage**
1. Audit all button usage across codebase
2. Replace inconsistent patterns with standardized variants
3. Fix contrast issues and hover state inconsistencies

### **Phase 3: Documentation & Enforcement**
1. Add TypeScript types to enforce proper usage
2. Create Storybook stories for all button variants
3. Add ESLint rules to prevent anti-patterns

## 🎨 Component Examples

### **Primary CTA Button**
```tsx
<Button className="bg-brand-primary hover:bg-brand-primary/80 text-white font-medium px-6 py-3 rounded-lg transition-all duration-200 hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-brand-primary">
  Create Campaign
</Button>
```

### **Secondary Action Button**
```tsx
<Button className="bg-brand-secondary hover:bg-brand-secondary/80 text-black font-medium px-6 py-3 rounded-lg transition-all duration-200 hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-brand-secondary">
  Save Draft
</Button>
```

### **Outline Button**
```tsx
<Button className="border-2 border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white px-6 py-3 rounded-lg transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand-primary">
  Cancel
</Button>
```

## 🔍 Accessibility Checklist

- [ ] All buttons have minimum 4.5:1 contrast ratio
- [ ] Focus states are clearly visible
- [ ] Hover states provide clear feedback
- [ ] Button text is readable in all states
- [ ] Disabled states are clearly distinguishable
- [ ] Button sizes meet minimum 44px touch targets on mobile

---

**Status**: ✅ Design system defined, ready for implementation
**Next Step**: Update button component and audit existing usage
