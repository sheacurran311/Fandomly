# Phase 1: Enhanced Branding System Design

**Date:** 2025-11-12
**Status:** 🎨 Design Complete - Ready for Implementation
**Phase:** 1 of 6 (Weeks 2-3)

---

## Executive Summary

Phase 1 expands the basic 3-color branding system into a comprehensive theme engine that gives creators enterprise-level customization. This includes:

- **Expanded color palette** (11 colors instead of 3)
- **Typography system** (font families, sizes, weights, line heights)
- **Layout system** (border radius, spacing, shadows)
- **10+ pre-built theme templates**
- **Theme import/export** for sharing
- **Live preview** in theme builder

---

## Enhanced Theme Schema

### Current Schema (Phase 0)
```typescript
pageConfig: {
  brandColors: {
    primary: string;    // e.g., "#8B5CF6"
    secondary: string;  // e.g., "#EC4899"
    accent: string;     // e.g., "#F59E0B"
  }
}
```

### Enhanced Schema (Phase 1)
```typescript
pageConfig: {
  theme: {
    // Theme Metadata
    name: string;              // "Dark Mode Pro", "Minimalist Light", etc.
    mode: 'light' | 'dark' | 'custom';
    templateId?: string;       // Reference to pre-built template

    // Color System (11 colors)
    colors: {
      // Brand Colors
      primary: string;         // Main brand color (buttons, links, CTA)
      secondary: string;       // Secondary brand color (accents, highlights)
      accent: string;          // Accent color (badges, special elements)

      // Surface Colors
      background: string;      // Page background
      surface: string;         // Card/panel background
      surfaceHover: string;    // Card/panel hover state

      // Text Colors
      text: {
        primary: string;       // Main text color
        secondary: string;     // Secondary/muted text
        tertiary: string;      // Disabled/placeholder text
      };

      // UI State Colors
      border: string;          // Borders, dividers
      success: string;         // Success states, positive feedback
      warning: string;         // Warning states
      error: string;           // Error states, destructive actions
      info: string;            // Info states, neutral feedback
    };

    // Typography System
    typography: {
      // Font Families
      fontFamily: {
        heading: string;       // Headings, titles
        body: string;          // Body text, paragraphs
        mono: string;          // Code, monospace text
      };

      // Font Sizes (rem units)
      fontSize: {
        xs: string;            // 0.75rem (12px)
        sm: string;            // 0.875rem (14px)
        base: string;          // 1rem (16px)
        lg: string;            // 1.125rem (18px)
        xl: string;            // 1.25rem (20px)
        '2xl': string;         // 1.5rem (24px)
        '3xl': string;         // 1.875rem (30px)
        '4xl': string;         // 2.25rem (36px)
        '5xl': string;         // 3rem (48px)
      };

      // Font Weights
      fontWeight: {
        light: number;         // 300
        normal: number;        // 400
        medium: number;        // 500
        semibold: number;      // 600
        bold: number;          // 700
        extrabold: number;     // 800
      };

      // Line Heights
      lineHeight: {
        tight: number;         // 1.25
        normal: number;        // 1.5
        relaxed: number;       // 1.75
        loose: number;         // 2
      };
    };

    // Layout System
    layout: {
      // Border Radius (rem units)
      borderRadius: {
        none: string;          // 0
        sm: string;            // 0.25rem (4px)
        md: string;            // 0.5rem (8px)
        lg: string;            // 0.75rem (12px)
        xl: string;            // 1rem (16px)
        '2xl': string;         // 1.5rem (24px)
        full: string;          // 9999px (pill shape)
      };

      // Spacing Scale (multiplier of base 0.25rem)
      spacing: {
        mode: 'tight' | 'normal' | 'relaxed';
        scale: number;         // 0.75, 1, 1.25
      };

      // Box Shadows
      shadow: {
        sm: string;            // Subtle shadow
        md: string;            // Default shadow
        lg: string;            // Prominent shadow
        xl: string;            // Very prominent shadow
        inner: string;         // Inset shadow
      };
    };
  };

  // Legacy support (Phase 0)
  brandColors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
}
```

---

## Pre-built Theme Templates

### 1. **Default Light** (Template ID: `default-light`)
Modern, clean light theme with purple accents

```typescript
{
  name: "Default Light",
  mode: "light",
  templateId: "default-light",
  colors: {
    primary: "#6366f1",      // Indigo
    secondary: "#8b5cf6",    // Purple
    accent: "#ec4899",       // Pink
    background: "#ffffff",   // White
    surface: "#f9fafb",      // Light gray
    surfaceHover: "#f3f4f6", // Slightly darker
    text: {
      primary: "#111827",    // Near black
      secondary: "#6b7280",  // Gray
      tertiary: "#9ca3af"    // Light gray
    },
    border: "#e5e7eb",       // Light border
    success: "#10b981",      // Green
    warning: "#f59e0b",      // Amber
    error: "#ef4444",        // Red
    info: "#3b82f6"          // Blue
  },
  typography: {
    fontFamily: {
      heading: "Inter, system-ui, sans-serif",
      body: "Inter, system-ui, sans-serif",
      mono: "Monaco, Courier, monospace"
    },
    fontSize: {
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
      "4xl": "2.25rem",
      "5xl": "3rem"
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
      loose: 2
    }
  },
  layout: {
    borderRadius: {
      none: "0",
      sm: "0.25rem",
      md: "0.5rem",
      lg: "0.75rem",
      xl: "1rem",
      "2xl": "1.5rem",
      full: "9999px"
    },
    spacing: {
      mode: "normal",
      scale: 1
    },
    shadow: {
      sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      md: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
      lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
      xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
      inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)"
    }
  }
}
```

---

### 2. **Dark Mode Pro** (Template ID: `dark-pro`)
Sleek dark theme with cyan accents

```typescript
{
  name: "Dark Mode Pro",
  mode: "dark",
  templateId: "dark-pro",
  colors: {
    primary: "#06b6d4",      // Cyan
    secondary: "#8b5cf6",    // Purple
    accent: "#f59e0b",       // Amber
    background: "#0f172a",   // Dark slate
    surface: "#1e293b",      // Slate
    surfaceHover: "#334155", // Lighter slate
    text: {
      primary: "#f1f5f9",    // Near white
      secondary: "#cbd5e1",  // Light slate
      tertiary: "#64748b"    // Gray slate
    },
    border: "#334155",       // Dark border
    success: "#10b981",      // Green
    warning: "#f59e0b",      // Amber
    error: "#ef4444",        // Red
    info: "#06b6d4"          // Cyan
  },
  typography: {
    fontFamily: {
      heading: "Inter, system-ui, sans-serif",
      body: "Inter, system-ui, sans-serif",
      mono: "Monaco, Courier, monospace"
    },
    fontSize: {
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
      "4xl": "2.25rem",
      "5xl": "3rem"
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
      loose: 2
    }
  },
  layout: {
    borderRadius: {
      none: "0",
      sm: "0.25rem",
      md: "0.5rem",
      lg: "0.75rem",
      xl: "1rem",
      "2xl": "1.5rem",
      full: "9999px"
    },
    spacing: {
      mode: "normal",
      scale: 1
    },
    shadow: {
      sm: "0 1px 2px 0 rgba(0, 0, 0, 0.5)",
      md: "0 4px 6px -1px rgba(0, 0, 0, 0.5)",
      lg: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
      xl: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
      inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.3)"
    }
  }
}
```

---

### 3. **Neon Cyberpunk** (Template ID: `neon-cyberpunk`)
Bold, high-contrast theme with neon accents

```typescript
{
  name: "Neon Cyberpunk",
  mode: "dark",
  templateId: "neon-cyberpunk",
  colors: {
    primary: "#ff00ff",      // Magenta
    secondary: "#00ffff",    // Cyan
    accent: "#ffff00",       // Yellow
    background: "#0a0a0a",   // Almost black
    surface: "#1a1a1a",      // Dark gray
    surfaceHover: "#2a2a2a", // Lighter gray
    text: {
      primary: "#ffffff",    // White
      secondary: "#cccccc",  // Light gray
      tertiary: "#888888"    // Mid gray
    },
    border: "#ff00ff",       // Magenta border
    success: "#00ff00",      // Lime green
    warning: "#ffff00",      // Yellow
    error: "#ff0000",        // Red
    info: "#00ffff"          // Cyan
  },
  typography: {
    fontFamily: {
      heading: "Orbitron, sans-serif",
      body: "Roboto, sans-serif",
      mono: "Courier, monospace"
    },
    fontSize: {
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
      "4xl": "2.25rem",
      "5xl": "3rem"
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
      loose: 2
    }
  },
  layout: {
    borderRadius: {
      none: "0",
      sm: "0rem",
      md: "0rem",
      lg: "0rem",
      xl: "0rem",
      "2xl": "0rem",
      full: "0rem"
    },
    spacing: {
      mode: "normal",
      scale: 1
    },
    shadow: {
      sm: "0 0 5px rgba(255, 0, 255, 0.5)",
      md: "0 0 10px rgba(255, 0, 255, 0.5)",
      lg: "0 0 20px rgba(255, 0, 255, 0.5)",
      xl: "0 0 30px rgba(255, 0, 255, 0.5)",
      inner: "inset 0 0 10px rgba(255, 0, 255, 0.3)"
    }
  }
}
```

---

### 4. **Minimalist White** (Template ID: `minimalist-white`)
Ultra-clean, minimal design with gray accents

```typescript
{
  name: "Minimalist White",
  mode: "light",
  templateId: "minimalist-white",
  colors: {
    primary: "#000000",      // Black
    secondary: "#333333",    // Dark gray
    accent: "#666666",       // Mid gray
    background: "#ffffff",   // White
    surface: "#fafafa",      // Off-white
    surfaceHover: "#f5f5f5", // Light gray
    text: {
      primary: "#000000",    // Black
      secondary: "#666666",  // Gray
      tertiary: "#999999"    // Light gray
    },
    border: "#e0e0e0",       // Very light gray
    success: "#4caf50",      // Green
    warning: "#ff9800",      // Orange
    error: "#f44336",        // Red
    info: "#2196f3"          // Blue
  },
  typography: {
    fontFamily: {
      heading: "Helvetica Neue, sans-serif",
      body: "Helvetica Neue, sans-serif",
      mono: "Courier, monospace"
    },
    fontSize: {
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
      "4xl": "2.25rem",
      "5xl": "3rem"
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 400,
      semibold: 500,
      bold: 600,
      extrabold: 700
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
      loose: 2
    }
  },
  layout: {
    borderRadius: {
      none: "0",
      sm: "0.125rem",
      md: "0.25rem",
      lg: "0.375rem",
      xl: "0.5rem",
      "2xl": "0.75rem",
      full: "9999px"
    },
    spacing: {
      mode: "relaxed",
      scale: 1.25
    },
    shadow: {
      sm: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
      md: "0 2px 6px 0 rgba(0, 0, 0, 0.1)",
      lg: "0 4px 12px 0 rgba(0, 0, 0, 0.1)",
      xl: "0 8px 24px 0 rgba(0, 0, 0, 0.1)",
      inner: "inset 0 1px 3px 0 rgba(0, 0, 0, 0.05)"
    }
  }
}
```

---

### 5. **Ocean Blue** (Template ID: `ocean-blue`)
Calming blue theme inspired by the ocean

```typescript
{
  name: "Ocean Blue",
  mode: "light",
  templateId: "ocean-blue",
  colors: {
    primary: "#0ea5e9",      // Sky blue
    secondary: "#06b6d4",    // Cyan
    accent: "#14b8a6",       // Teal
    background: "#f0f9ff",   // Very light blue
    surface: "#e0f2fe",      // Light sky
    surfaceHover: "#bae6fd", // Lighter sky
    text: {
      primary: "#0c4a6e",    // Dark blue
      secondary: "#0369a1",  // Mid blue
      tertiary: "#0284c7"    // Light blue
    },
    border: "#7dd3fc",       // Light sky border
    success: "#14b8a6",      // Teal
    warning: "#f59e0b",      // Amber
    error: "#ef4444",        // Red
    info: "#0ea5e9"          // Sky blue
  },
  typography: {
    fontFamily: {
      heading: "Poppins, sans-serif",
      body: "Open Sans, sans-serif",
      mono: "Monaco, monospace"
    },
    fontSize: {
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
      "4xl": "2.25rem",
      "5xl": "3rem"
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
      loose: 2
    }
  },
  layout: {
    borderRadius: {
      none: "0",
      sm: "0.375rem",
      md: "0.5rem",
      lg: "0.75rem",
      xl: "1rem",
      "2xl": "1.5rem",
      full: "9999px"
    },
    spacing: {
      mode: "normal",
      scale: 1
    },
    shadow: {
      sm: "0 1px 2px 0 rgba(14, 165, 233, 0.1)",
      md: "0 4px 6px -1px rgba(14, 165, 233, 0.2)",
      lg: "0 10px 15px -3px rgba(14, 165, 233, 0.2)",
      xl: "0 20px 25px -5px rgba(14, 165, 233, 0.2)",
      inner: "inset 0 2px 4px 0 rgba(14, 165, 233, 0.1)"
    }
  }
}
```

---

### Additional Templates (Summary)

**6. Sunset Orange** - Warm, vibrant theme with orange/red gradients
**7. Forest Green** - Natural, earthy theme with green tones
**8. Royal Purple** - Elegant, luxurious purple theme
**9. Monochrome** - Pure black and white, no colors
**10. Pastel Dream** - Soft, muted pastel colors
**11. High Contrast** - Maximum accessibility, WCAG AAA compliant
**12. Gaming RGB** - Dynamic, colorful gaming aesthetic

---

## CSS Variable Mapping

All theme values will be injected as CSS variables:

```css
:root {
  /* Colors - Brand */
  --color-primary: #6366f1;
  --color-secondary: #8b5cf6;
  --color-accent: #ec4899;

  /* Colors - Surface */
  --color-background: #ffffff;
  --color-surface: #f9fafb;
  --color-surface-hover: #f3f4f6;

  /* Colors - Text */
  --color-text-primary: #111827;
  --color-text-secondary: #6b7280;
  --color-text-tertiary: #9ca3af;

  /* Colors - UI State */
  --color-border: #e5e7eb;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;

  /* Typography - Font Family */
  --font-heading: Inter, system-ui, sans-serif;
  --font-body: Inter, system-ui, sans-serif;
  --font-mono: Monaco, Courier, monospace;

  /* Typography - Font Size */
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 1.875rem;
  --font-size-4xl: 2.25rem;
  --font-size-5xl: 3rem;

  /* Typography - Font Weight */
  --font-weight-light: 300;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --font-weight-extrabold: 800;

  /* Typography - Line Height */
  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;
  --line-height-loose: 2;

  /* Layout - Border Radius */
  --border-radius-none: 0;
  --border-radius-sm: 0.25rem;
  --border-radius-md: 0.5rem;
  --border-radius-lg: 0.75rem;
  --border-radius-xl: 1rem;
  --border-radius-2xl: 1.5rem;
  --border-radius-full: 9999px;

  /* Layout - Spacing Scale */
  --spacing-scale: 1;

  /* Layout - Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  --shadow-inner: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06);
}
```

---

## Implementation Plan

### Step 1: Database Migration
Create migration to add enhanced theme structure while maintaining backward compatibility with Phase 0.

### Step 2: Theme Templates File
Create `/shared/theme-templates.ts` with all 12 pre-built themes.

### Step 3: Theme Builder UI
Enhance Program Builder with comprehensive theme customization:
- Template selector gallery
- Color pickers for all 11 colors
- Typography controls
- Layout controls
- Live preview iframe
- Import/Export buttons

### Step 4: CSS Injection Enhancement
Update `program-public.tsx` to inject all CSS variables from enhanced theme.

### Step 5: Component Updates
Update UI components to use CSS variables instead of hard-coded Tailwind classes where appropriate.

---

## Success Criteria

✅ Database schema supports enhanced theme structure
✅ 12 pre-built theme templates available
✅ Theme builder UI allows full customization
✅ Live preview shows changes in real-time
✅ Theme import/export works correctly
✅ All CSS variables injected and applied
✅ Backward compatible with Phase 0 basic colors
✅ Program pages reflect all theme customizations

---

## Next Steps

1. Create database migration
2. Create theme templates file
3. Build theme builder UI
4. Test all templates
5. Document for creators

