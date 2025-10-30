/**
 * Theme utility functions for program pages
 */

export interface ThemeConfig {
  mode: 'light' | 'dark' | 'custom';
  backgroundColor?: string;
  textColor?: string;
}

export interface ThemeColors {
  background: string;
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  card: {
    background: string;
    border: string;
  };
  badge: {
    background: string;
    text: string;
  };
}

/**
 * Get computed theme colors based on theme configuration
 */
export function getThemeColors(theme?: ThemeConfig): ThemeColors {
  // Default to light theme
  const mode = theme?.mode || 'light';

  if (mode === 'light') {
    return {
      background: '#ffffff',
      text: {
        primary: '#111827',  // gray-900
        secondary: '#374151', // gray-700
        tertiary: '#6b7280',  // gray-500
      },
      card: {
        background: '#ffffff',
        border: '#e5e7eb',    // gray-200
      },
      badge: {
        background: '#f3f4f6', // gray-100
        text: '#1f2937',       // gray-800
      },
    };
  }

  if (mode === 'dark') {
    return {
      background: '#0f172a',  // slate-900
      text: {
        primary: '#ffffff',
        secondary: '#e2e8f0',  // slate-200
        tertiary: '#94a3b8',   // slate-400
      },
      card: {
        background: '#1e293b', // slate-800
        border: '#334155',     // slate-700
      },
      badge: {
        background: '#334155',  // slate-700
        text: '#e2e8f0',        // slate-200
      },
    };
  }

  // Custom mode
  return {
    background: theme?.backgroundColor || '#ffffff',
    text: {
      primary: theme?.textColor || '#111827',
      secondary: theme?.textColor || '#111827',
      tertiary: theme?.textColor || '#111827',
    },
    card: {
      background: theme?.backgroundColor || '#ffffff',
      border: adjustColorOpacity(theme?.textColor || '#111827', 0.2),
    },
    badge: {
      background: adjustColorOpacity(theme?.textColor || '#111827', 0.1),
      text: theme?.textColor || '#111827',
    },
  };
}

/**
 * Adjust color opacity (simple implementation)
 */
function adjustColorOpacity(color: string, opacity: number): string {
  // If it's a hex color, convert to rgba
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  return color;
}

/**
 * Check if theme is dark based on background color
 */
export function isDarkTheme(theme?: ThemeConfig): boolean {
  const mode = theme?.mode || 'light';
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  
  // For custom, check background lightness
  const bg = theme?.backgroundColor || '#ffffff';
  if (bg.startsWith('#')) {
    const hex = bg.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const lightness = (r * 299 + g * 587 + b * 114) / 1000;
    return lightness < 128;
  }
  
  return false;
}

