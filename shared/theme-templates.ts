/**
 * Pre-built Theme Templates for Loyalty Programs
 *
 * These templates provide creators with professional, ready-to-use themes
 * that can be applied instantly or customized further.
 */

export type CreatorTypeForTheme = 'athlete' | 'musician' | 'content_creator';

export interface ThemeTemplate {
  name: string;
  mode: 'light' | 'dark' | 'custom';
  templateId: string;
  description: string;
  preview?: string; // URL to preview image
  /** Creator types this theme is recommended for */
  recommendedFor?: CreatorTypeForTheme[];
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    surfaceHover: string;
    text: {
      primary: string;
      secondary: string;
      tertiary: string;
    };
    border: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  typography: {
    fontFamily: {
      heading: string;
      body: string;
      mono: string;
    };
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
      '4xl': string;
      '5xl': string;
    };
    fontWeight: {
      light: number;
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
      extrabold: number;
    };
    lineHeight: {
      tight: number;
      normal: number;
      relaxed: number;
      loose: number;
    };
  };
  layout: {
    borderRadius: {
      none: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
      '2xl': string;
      full: string;
    };
    spacing: {
      mode: 'tight' | 'normal' | 'relaxed';
      scale: number;
    };
    shadow: {
      sm: string;
      md: string;
      lg: string;
      xl: string;
      inner: string;
    };
  };
}

// Default typography (used by most templates)
const defaultTypography: ThemeTemplate['typography'] = {
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
};

// Default layout (used by most templates)
const defaultLayout: ThemeTemplate['layout'] = {
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
};

// ============================================================================
// THEME TEMPLATES
// ============================================================================

export const THEME_TEMPLATES: Record<string, ThemeTemplate> = {
  // 1. Default Light - Modern, clean light theme
  'default-light': {
    name: "Default Light",
    mode: "light",
    templateId: "default-light",
    description: "Modern, clean light theme with purple accents",
    recommendedFor: ['athlete', 'musician', 'content_creator'],
    colors: {
      primary: "#6366f1",
      secondary: "#8b5cf6",
      accent: "#ec4899",
      background: "#ffffff",
      surface: "#f9fafb",
      surfaceHover: "#f3f4f6",
      text: {
        primary: "#111827",
        secondary: "#6b7280",
        tertiary: "#9ca3af"
      },
      border: "#e5e7eb",
      success: "#10b981",
      warning: "#f59e0b",
      error: "#ef4444",
      info: "#3b82f6"
    },
    typography: defaultTypography,
    layout: defaultLayout
  },

  // 2. Dark Mode Pro - Sleek dark theme
  'dark-pro': {
    name: "Dark Mode Pro",
    mode: "dark",
    templateId: "dark-pro",
    description: "Sleek dark theme with cyan accents",
    recommendedFor: ['athlete', 'content_creator'],
    colors: {
      primary: "#06b6d4",
      secondary: "#8b5cf6",
      accent: "#f59e0b",
      background: "#0f172a",
      surface: "#1e293b",
      surfaceHover: "#334155",
      text: {
        primary: "#f1f5f9",
        secondary: "#cbd5e1",
        tertiary: "#64748b"
      },
      border: "#334155",
      success: "#10b981",
      warning: "#f59e0b",
      error: "#ef4444",
      info: "#06b6d4"
    },
    typography: defaultTypography,
    layout: {
      ...defaultLayout,
      shadow: {
        sm: "0 1px 2px 0 rgba(0, 0, 0, 0.5)",
        md: "0 4px 6px -1px rgba(0, 0, 0, 0.5)",
        lg: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
        xl: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
        inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.3)"
      }
    }
  },

  // 3. Neon Cyberpunk - Bold, high-contrast theme
  'neon-cyberpunk': {
    name: "Neon Cyberpunk",
    mode: "dark",
    templateId: "neon-cyberpunk",
    description: "Bold, high-contrast theme with neon accents",
    recommendedFor: ['musician', 'content_creator'],
    colors: {
      primary: "#ff00ff",
      secondary: "#00ffff",
      accent: "#ffff00",
      background: "#0a0a0a",
      surface: "#1a1a1a",
      surfaceHover: "#2a2a2a",
      text: {
        primary: "#ffffff",
        secondary: "#cccccc",
        tertiary: "#888888"
      },
      border: "#ff00ff",
      success: "#00ff00",
      warning: "#ffff00",
      error: "#ff0000",
      info: "#00ffff"
    },
    typography: {
      fontFamily: {
        heading: "Orbitron, sans-serif",
        body: "Roboto, sans-serif",
        mono: "Courier, monospace"
      },
      fontSize: defaultTypography.fontSize,
      fontWeight: defaultTypography.fontWeight,
      lineHeight: defaultTypography.lineHeight
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
  },

  // 4. Minimalist White - Ultra-clean, minimal design
  'minimalist-white': {
    name: "Minimalist White",
    mode: "light",
    templateId: "minimalist-white",
    description: "Ultra-clean, minimal design with gray accents",
    recommendedFor: ['athlete'],
    colors: {
      primary: "#000000",
      secondary: "#333333",
      accent: "#666666",
      background: "#ffffff",
      surface: "#fafafa",
      surfaceHover: "#f5f5f5",
      text: {
        primary: "#000000",
        secondary: "#666666",
        tertiary: "#999999"
      },
      border: "#e0e0e0",
      success: "#4caf50",
      warning: "#ff9800",
      error: "#f44336",
      info: "#2196f3"
    },
    typography: {
      fontFamily: {
        heading: "Helvetica Neue, sans-serif",
        body: "Helvetica Neue, sans-serif",
        mono: "Courier, monospace"
      },
      fontSize: defaultTypography.fontSize,
      fontWeight: {
        light: 300,
        normal: 400,
        medium: 400,
        semibold: 500,
        bold: 600,
        extrabold: 700
      },
      lineHeight: defaultTypography.lineHeight
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
  },

  // 5. Ocean Blue - Calming blue theme
  'ocean-blue': {
    name: "Ocean Blue",
    mode: "light",
    templateId: "ocean-blue",
    description: "Calming blue theme inspired by the ocean",
    recommendedFor: ['athlete', 'content_creator'],
    colors: {
      primary: "#0ea5e9",
      secondary: "#06b6d4",
      accent: "#14b8a6",
      background: "#f0f9ff",
      surface: "#e0f2fe",
      surfaceHover: "#bae6fd",
      text: {
        primary: "#0c4a6e",
        secondary: "#0369a1",
        tertiary: "#0284c7"
      },
      border: "#7dd3fc",
      success: "#14b8a6",
      warning: "#f59e0b",
      error: "#ef4444",
      info: "#0ea5e9"
    },
    typography: {
      fontFamily: {
        heading: "Poppins, sans-serif",
        body: "Open Sans, sans-serif",
        mono: "Monaco, monospace"
      },
      fontSize: defaultTypography.fontSize,
      fontWeight: defaultTypography.fontWeight,
      lineHeight: defaultTypography.lineHeight
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
  },

  // 6. Sunset Orange - Warm, vibrant theme
  'sunset-orange': {
    name: "Sunset Orange",
    mode: "light",
    templateId: "sunset-orange",
    description: "Warm, vibrant theme with orange/red gradients",
    recommendedFor: ['content_creator'],
    colors: {
      primary: "#f97316",
      secondary: "#ef4444",
      accent: "#fbbf24",
      background: "#fff7ed",
      surface: "#ffedd5",
      surfaceHover: "#fed7aa",
      text: {
        primary: "#7c2d12",
        secondary: "#9a3412",
        tertiary: "#c2410c"
      },
      border: "#fdba74",
      success: "#10b981",
      warning: "#f59e0b",
      error: "#dc2626",
      info: "#3b82f6"
    },
    typography: defaultTypography,
    layout: defaultLayout
  },

  // 7. Forest Green - Natural, earthy theme
  'forest-green': {
    name: "Forest Green",
    mode: "light",
    templateId: "forest-green",
    description: "Natural, earthy theme with green tones",
    recommendedFor: ['athlete'],
    colors: {
      primary: "#16a34a",
      secondary: "#059669",
      accent: "#84cc16",
      background: "#f0fdf4",
      surface: "#dcfce7",
      surfaceHover: "#bbf7d0",
      text: {
        primary: "#14532d",
        secondary: "#166534",
        tertiary: "#15803d"
      },
      border: "#86efac",
      success: "#22c55e",
      warning: "#f59e0b",
      error: "#ef4444",
      info: "#3b82f6"
    },
    typography: defaultTypography,
    layout: defaultLayout
  },

  // 8. Royal Purple - Elegant, luxurious theme
  'royal-purple': {
    name: "Royal Purple",
    mode: "dark",
    templateId: "royal-purple",
    description: "Elegant, luxurious purple theme",
    recommendedFor: ['musician'],
    colors: {
      primary: "#a855f7",
      secondary: "#d946ef",
      accent: "#f0abfc",
      background: "#1e1b4b",
      surface: "#312e81",
      surfaceHover: "#3730a3",
      text: {
        primary: "#f5f3ff",
        secondary: "#ddd6fe",
        tertiary: "#c4b5fd"
      },
      border: "#6366f1",
      success: "#10b981",
      warning: "#f59e0b",
      error: "#ef4444",
      info: "#a855f7"
    },
    typography: {
      fontFamily: {
        heading: "Playfair Display, serif",
        body: "Lato, sans-serif",
        mono: "Monaco, monospace"
      },
      fontSize: defaultTypography.fontSize,
      fontWeight: defaultTypography.fontWeight,
      lineHeight: defaultTypography.lineHeight
    },
    layout: defaultLayout
  },

  // 9. Monochrome - Pure black and white
  'monochrome': {
    name: "Monochrome",
    mode: "light",
    templateId: "monochrome",
    description: "Pure black and white, no colors",
    recommendedFor: ['athlete'],
    colors: {
      primary: "#000000",
      secondary: "#1a1a1a",
      accent: "#333333",
      background: "#ffffff",
      surface: "#f5f5f5",
      surfaceHover: "#e5e5e5",
      text: {
        primary: "#000000",
        secondary: "#404040",
        tertiary: "#737373"
      },
      border: "#d4d4d4",
      success: "#404040",
      warning: "#404040",
      error: "#000000",
      info: "#404040"
    },
    typography: {
      fontFamily: {
        heading: "Georgia, serif",
        body: "Arial, sans-serif",
        mono: "Courier, monospace"
      },
      fontSize: defaultTypography.fontSize,
      fontWeight: defaultTypography.fontWeight,
      lineHeight: defaultTypography.lineHeight
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
        sm: "0 1px 2px 0 rgba(0, 0, 0, 0.1)",
        md: "0 2px 4px 0 rgba(0, 0, 0, 0.1)",
        lg: "0 4px 8px 0 rgba(0, 0, 0, 0.1)",
        xl: "0 8px 16px 0 rgba(0, 0, 0, 0.1)",
        inner: "inset 0 1px 2px 0 rgba(0, 0, 0, 0.1)"
      }
    }
  },

  // 10. Pastel Dream - Soft, muted pastel colors
  'pastel-dream': {
    name: "Pastel Dream",
    mode: "light",
    templateId: "pastel-dream",
    description: "Soft, muted pastel colors",
    recommendedFor: ['musician'],
    colors: {
      primary: "#a78bfa",
      secondary: "#fbbf24",
      accent: "#fb923c",
      background: "#fefce8",
      surface: "#fef3c7",
      surfaceHover: "#fde68a",
      text: {
        primary: "#713f12",
        secondary: "#92400e",
        tertiary: "#b45309"
      },
      border: "#fde047",
      success: "#86efac",
      warning: "#fcd34d",
      error: "#fca5a5",
      info: "#93c5fd"
    },
    typography: {
      fontFamily: {
        heading: "Quicksand, sans-serif",
        body: "Nunito, sans-serif",
        mono: "Monaco, monospace"
      },
      fontSize: defaultTypography.fontSize,
      fontWeight: defaultTypography.fontWeight,
      lineHeight: {
        tight: 1.25,
        normal: 1.6,
        relaxed: 1.8,
        loose: 2
      }
    },
    layout: {
      borderRadius: {
        none: "0",
        sm: "0.5rem",
        md: "0.75rem",
        lg: "1rem",
        xl: "1.5rem",
        "2xl": "2rem",
        full: "9999px"
      },
      spacing: {
        mode: "relaxed",
        scale: 1.25
      },
      shadow: {
        sm: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
        md: "0 4px 6px -1px rgba(0, 0, 0, 0.08)",
        lg: "0 10px 15px -3px rgba(0, 0, 0, 0.08)",
        xl: "0 20px 25px -5px rgba(0, 0, 0, 0.08)",
        inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.03)"
      }
    }
  },

  // 11. High Contrast - Maximum accessibility
  'high-contrast': {
    name: "High Contrast",
    mode: "light",
    templateId: "high-contrast",
    description: "Maximum accessibility, WCAG AAA compliant",
    recommendedFor: ['athlete'],
    colors: {
      primary: "#0000EE",
      secondary: "#551A8B",
      accent: "#FF4500",
      background: "#FFFFFF",
      surface: "#F0F0F0",
      surfaceHover: "#E0E0E0",
      text: {
        primary: "#000000",
        secondary: "#1a1a1a",
        tertiary: "#333333"
      },
      border: "#000000",
      success: "#006400",
      warning: "#FF8C00",
      error: "#8B0000",
      info: "#00008B"
    },
    typography: {
      fontFamily: {
        heading: "Arial, sans-serif",
        body: "Arial, sans-serif",
        mono: "Courier, monospace"
      },
      fontSize: {
        xs: "0.875rem",
        sm: "1rem",
        base: "1.125rem",
        lg: "1.25rem",
        xl: "1.5rem",
        "2xl": "1.875rem",
        "3xl": "2.25rem",
        "4xl": "3rem",
        "5xl": "3.75rem"
      },
      fontWeight: {
        light: 400,
        normal: 400,
        medium: 600,
        semibold: 700,
        bold: 700,
        extrabold: 900
      },
      lineHeight: {
        tight: 1.4,
        normal: 1.6,
        relaxed: 1.8,
        loose: 2
      }
    },
    layout: {
      borderRadius: {
        none: "0",
        sm: "0.25rem",
        md: "0.375rem",
        lg: "0.5rem",
        xl: "0.625rem",
        "2xl": "0.75rem",
        full: "9999px"
      },
      spacing: {
        mode: "relaxed",
        scale: 1.5
      },
      shadow: {
        sm: "0 0 0 2px rgba(0, 0, 0, 0.2)",
        md: "0 0 0 3px rgba(0, 0, 0, 0.3)",
        lg: "0 0 0 4px rgba(0, 0, 0, 0.4)",
        xl: "0 0 0 5px rgba(0, 0, 0, 0.5)",
        inner: "inset 0 0 0 2px rgba(0, 0, 0, 0.2)"
      }
    }
  },

  // 12. Gaming RGB - Dynamic, colorful gaming aesthetic
  'gaming-rgb': {
    name: "Gaming RGB",
    mode: "dark",
    templateId: "gaming-rgb",
    description: "Dynamic, colorful gaming aesthetic",
    recommendedFor: ['content_creator'],
    colors: {
      primary: "#ff0080",
      secondary: "#00ff80",
      accent: "#ffff00",
      background: "#0d0d0d",
      surface: "#1a1a1a",
      surfaceHover: "#262626",
      text: {
        primary: "#ffffff",
        secondary: "#e0e0e0",
        tertiary: "#b0b0b0"
      },
      border: "#ff0080",
      success: "#00ff00",
      warning: "#ffaa00",
      error: "#ff0000",
      info: "#00ddff"
    },
    typography: {
      fontFamily: {
        heading: "Exo 2, sans-serif",
        body: "Rajdhani, sans-serif",
        mono: "Share Tech Mono, monospace"
      },
      fontSize: defaultTypography.fontSize,
      fontWeight: {
        light: 300,
        normal: 400,
        medium: 600,
        semibold: 700,
        bold: 700,
        extrabold: 900
      },
      lineHeight: defaultTypography.lineHeight
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
        mode: "tight",
        scale: 0.9
      },
      shadow: {
        sm: "0 0 10px rgba(255, 0, 128, 0.3)",
        md: "0 0 20px rgba(255, 0, 128, 0.4)",
        lg: "0 0 30px rgba(255, 0, 128, 0.5)",
        xl: "0 0 40px rgba(255, 0, 128, 0.6)",
        inner: "inset 0 0 15px rgba(255, 0, 128, 0.2)"
      }
    }
  }
};

// ============================================================================
// TYPOGRAPHY TEMPLATES
// ============================================================================

/**
 * Typography-only templates that can be applied independently of color themes.
 * These provide quick typography presets without affecting colors.
 */
export interface TypographyTemplate {
  id: string;
  name: string;
  description: string;
  preview: string; // Sample text to show in preview
  typography: ThemeTemplate['typography'];
  // Optional layout adjustments that complement the typography
  layout?: Partial<ThemeTemplate['layout']>;
}

export const TYPOGRAPHY_TEMPLATES: Record<string, TypographyTemplate> = {
  // 1. Classic - Elegant serif fonts
  'classic': {
    id: 'classic',
    name: 'Classic',
    description: 'Elegant serif fonts for a timeless, sophisticated look',
    preview: 'The quick brown fox',
    typography: {
      fontFamily: {
        heading: "'Playfair Display', Georgia, serif",
        body: "Georgia, 'Times New Roman', serif",
        mono: "'Courier New', Courier, monospace"
      },
      fontSize: {
        xs: "0.75rem",
        sm: "0.875rem",
        base: "1rem",
        lg: "1.125rem",
        xl: "1.25rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
        "4xl": "2.5rem",
        "5xl": "3.25rem"
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
        normal: 1.6,
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
        scale: 1.1
      }
    }
  },

  // 2. Modern - Clean sans-serif tech look
  'modern': {
    id: 'modern',
    name: 'Modern',
    description: 'Clean, minimal sans-serif for a contemporary tech feel',
    preview: 'The quick brown fox',
    typography: {
      fontFamily: {
        heading: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
        body: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
        mono: "'SF Mono', 'Fira Code', Consolas, monospace"
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
        relaxed: 1.625,
        loose: 1.75
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
      }
    }
  },

  // 3. Bold - High impact headlines
  'bold': {
    id: 'bold',
    name: 'Bold',
    description: 'High impact headlines with strong visual presence',
    preview: 'THE QUICK BROWN FOX',
    typography: {
      fontFamily: {
        heading: "Montserrat, 'Arial Black', sans-serif",
        body: "'Open Sans', Arial, sans-serif",
        mono: "'Source Code Pro', Consolas, monospace"
      },
      fontSize: {
        xs: "0.75rem",
        sm: "0.875rem",
        base: "1rem",
        lg: "1.125rem",
        xl: "1.375rem",
        "2xl": "1.75rem",
        "3xl": "2.25rem",
        "4xl": "3rem",
        "5xl": "4rem"
      },
      fontWeight: {
        light: 400,
        normal: 500,
        medium: 600,
        semibold: 700,
        bold: 800,
        extrabold: 900
      },
      lineHeight: {
        tight: 1.1,
        normal: 1.4,
        relaxed: 1.6,
        loose: 1.8
      }
    },
    layout: {
      borderRadius: {
        none: "0",
        sm: "0.25rem",
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.25rem",
        full: "9999px"
      },
      spacing: {
        mode: "tight",
        scale: 0.9
      }
    }
  },

  // 4. Playful - Rounded friendly fonts
  'playful': {
    id: 'playful',
    name: 'Playful',
    description: 'Friendly, rounded fonts with a warm, approachable feel',
    preview: 'The quick brown fox',
    typography: {
      fontFamily: {
        heading: "Quicksand, 'Comic Sans MS', cursive, sans-serif",
        body: "Nunito, 'Trebuchet MS', sans-serif",
        mono: "'Fira Code', 'Consolas', monospace"
      },
      fontSize: {
        xs: "0.8rem",
        sm: "0.9rem",
        base: "1.05rem",
        lg: "1.2rem",
        xl: "1.35rem",
        "2xl": "1.6rem",
        "3xl": "2rem",
        "4xl": "2.5rem",
        "5xl": "3.25rem"
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
        tight: 1.3,
        normal: 1.6,
        relaxed: 1.8,
        loose: 2
      }
    },
    layout: {
      borderRadius: {
        none: "0",
        sm: "0.5rem",
        md: "0.75rem",
        lg: "1rem",
        xl: "1.5rem",
        "2xl": "2rem",
        full: "9999px"
      },
      spacing: {
        mode: "relaxed",
        scale: 1.15
      }
    }
  },

  // 5. Professional - Business formal
  'professional': {
    id: 'professional',
    name: 'Professional',
    description: 'Clean, business-appropriate typography for formal contexts',
    preview: 'The quick brown fox',
    typography: {
      fontFamily: {
        heading: "Roboto, 'Helvetica Neue', Arial, sans-serif",
        body: "Roboto, 'Helvetica Neue', Arial, sans-serif",
        mono: "'Roboto Mono', 'Courier New', monospace"
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
        "5xl": "2.75rem"
      },
      fontWeight: {
        light: 300,
        normal: 400,
        medium: 500,
        semibold: 500,
        bold: 700,
        extrabold: 700
      },
      lineHeight: {
        tight: 1.25,
        normal: 1.5,
        relaxed: 1.65,
        loose: 1.85
      }
    },
    layout: {
      borderRadius: {
        none: "0",
        sm: "0.125rem",
        md: "0.25rem",
        lg: "0.375rem",
        xl: "0.5rem",
        "2xl": "0.625rem",
        full: "9999px"
      },
      spacing: {
        mode: "normal",
        scale: 1
      }
    }
  }
};

/**
 * Get all typography templates as an array
 */
export function getAllTypographyTemplates(): TypographyTemplate[] {
  return Object.values(TYPOGRAPHY_TEMPLATES);
}

/**
 * Get a typography template by ID
 */
export function getTypographyTemplate(templateId: string): TypographyTemplate | null {
  return TYPOGRAPHY_TEMPLATES[templateId] || null;
}

/**
 * Get a theme template by ID
 */
export function getThemeTemplate(templateId: string): ThemeTemplate | null {
  return THEME_TEMPLATES[templateId] || null;
}

/**
 * Get all theme templates as an array
 */
export function getAllThemeTemplates(): ThemeTemplate[] {
  return Object.values(THEME_TEMPLATES);
}

/**
 * Get theme templates recommended for a specific creator type
 * Returns recommended themes first, then remaining themes
 */
export function getThemeTemplatesForCreator(creatorType: CreatorTypeForTheme): ThemeTemplate[] {
  const allThemes = getAllThemeTemplates();
  const recommended = allThemes.filter(t => t.recommendedFor?.includes(creatorType));
  const others = allThemes.filter(t => !t.recommendedFor?.includes(creatorType));
  return [...recommended, ...others];
}

/**
 * Get only the recommended themes for a creator type
 */
export function getRecommendedThemes(creatorType: CreatorTypeForTheme): ThemeTemplate[] {
  return getAllThemeTemplates().filter(t => t.recommendedFor?.includes(creatorType));
}

/**
 * Get theme templates filtered by mode
 */
export function getThemeTemplatesByMode(mode: 'light' | 'dark' | 'custom'): ThemeTemplate[] {
  return getAllThemeTemplates().filter(template => template.mode === mode);
}

/**
 * Convert Phase 0 basic colors to Phase 1 theme
 * (For backward compatibility)
 */
export function convertLegacyColorsToTheme(brandColors: {
  primary: string;
  secondary: string;
  accent: string;
}): ThemeTemplate {
  return {
    name: "Custom Theme",
    mode: "custom",
    templateId: "custom",
    description: "Custom theme created from legacy brand colors",
    colors: {
      primary: brandColors.primary,
      secondary: brandColors.secondary,
      accent: brandColors.accent,
      // Use default light theme for other colors
      background: "#ffffff",
      surface: "#f9fafb",
      surfaceHover: "#f3f4f6",
      text: {
        primary: "#111827",
        secondary: "#6b7280",
        tertiary: "#9ca3af"
      },
      border: "#e5e7eb",
      success: "#10b981",
      warning: "#f59e0b",
      error: "#ef4444",
      info: "#3b82f6"
    },
    typography: defaultTypography,
    layout: defaultLayout
  };
}
