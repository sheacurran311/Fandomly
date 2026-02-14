import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

interface TenantBranding {
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  customCSS?: string;
  favicon?: string;
  fontFamily?: string;
  backgroundImage?: string;
  gradientDirection?: 'to-right' | 'to-bottom' | 'to-bottom-right' | 'radial';
}

interface TenantTheme extends TenantBranding {
  // Computed theme variables
  primaryRgb: string;
  secondaryRgb: string;
  accentRgb: string;
  primaryHsl: string;
  secondaryHsl: string;
  accentHsl: string;
}

const defaultBranding: TenantBranding = {
  primaryColor: "#8B5CF6",
  secondaryColor: "#06B6D4", 
  accentColor: "#10B981",
  fontFamily: "Inter, system-ui, sans-serif",
  gradientDirection: "to-bottom-right"
};

// Convert hex to RGB
const hexToRgb = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "139, 92, 246"; // fallback to purple
  
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  
  return `${r}, ${g}, ${b}`;
};

// Convert hex to HSL
const hexToHsl = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "258, 70%, 62%"; // fallback to purple
  
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: h = 0;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%`;
};

export function useTenantBranding(tenantId?: string) {
  const [currentBranding, setCurrentBranding] = useState<TenantTheme | null>(null);
  const [isCustomThemeActive, setIsCustomThemeActive] = useState(false);

  // Fetch tenant branding from API
  const { data: tenantData, isLoading } = useQuery<{ branding?: TenantBranding }>({
    queryKey: ['/api/tenants', tenantId, 'branding'],
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Apply branding to document
  const applyBranding = (branding: TenantBranding) => {
    const theme: TenantTheme = {
      ...branding,
      primaryRgb: hexToRgb(branding.primaryColor),
      secondaryRgb: hexToRgb(branding.secondaryColor),
      accentRgb: hexToRgb(branding.accentColor),
      primaryHsl: hexToHsl(branding.primaryColor),
      secondaryHsl: hexToHsl(branding.secondaryColor),
      accentHsl: hexToHsl(branding.accentColor),
    };

    setCurrentBranding(theme);

    // Apply CSS custom properties
    const root = document.documentElement;
    
    // Primary color variations
    root.style.setProperty('--brand-primary', theme.primaryColor);
    root.style.setProperty('--brand-primary-rgb', theme.primaryRgb);
    root.style.setProperty('--brand-primary-hsl', theme.primaryHsl);
    
    // Secondary color variations
    root.style.setProperty('--brand-secondary', theme.secondaryColor);
    root.style.setProperty('--brand-secondary-rgb', theme.secondaryRgb);
    root.style.setProperty('--brand-secondary-hsl', theme.secondaryHsl);
    
    // Accent color variations
    root.style.setProperty('--brand-accent', theme.accentColor);
    root.style.setProperty('--brand-accent-rgb', theme.accentRgb);
    root.style.setProperty('--brand-accent-hsl', theme.accentHsl);

    // Font family
    if (theme.fontFamily) {
      root.style.setProperty('--font-family-base', theme.fontFamily);
    }

    // Background image
    if (theme.backgroundImage) {
      root.style.setProperty('--background-image', `url(${theme.backgroundImage})`);
    }

    // Gradient direction
    const gradientMap = {
      'to-right': '90deg',
      'to-bottom': '180deg',
      'to-bottom-right': '135deg',
      'radial': 'radial-gradient'
    };
    
    if (theme.gradientDirection && theme.gradientDirection !== 'radial') {
      root.style.setProperty('--gradient-direction', gradientMap[theme.gradientDirection]);
    }

    // Apply custom CSS if provided
    if (theme.customCSS) {
      let customStyleEl = document.getElementById('tenant-custom-styles');
      if (!customStyleEl) {
        customStyleEl = document.createElement('style');
        customStyleEl.id = 'tenant-custom-styles';
        document.head.appendChild(customStyleEl);
      }
      customStyleEl.textContent = theme.customCSS;
    }

    // Update favicon
    if (theme.favicon) {
      let faviconEl = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (!faviconEl) {
        faviconEl = document.createElement('link');
        faviconEl.rel = 'icon';
        document.head.appendChild(faviconEl);
      }
      faviconEl.href = theme.favicon;
    }

    setIsCustomThemeActive(true);
  };

  // Reset to default branding
  const resetBranding = () => {
    applyBranding(defaultBranding);
    setIsCustomThemeActive(false);
  };

  // Preview branding temporarily (for live preview)
  const previewBranding = (branding: Partial<TenantBranding>) => {
    const mergedBranding = { 
      ...(currentBranding || defaultBranding), 
      ...branding 
    };
    applyBranding(mergedBranding);
  };

  // Initialize branding on load
  useEffect(() => {
    const branding = tenantData?.branding;
    if (branding && typeof branding === 'object' && !Array.isArray(branding) && 'primaryColor' in branding && 'secondaryColor' in branding && 'accentColor' in branding) {
      applyBranding(branding as TenantBranding);
    } else if (!isLoading && !tenantId) {
      // No tenant specified, use default
      resetBranding();
    }
  }, [tenantData, isLoading, tenantId]);

  return {
    currentBranding,
    isCustomThemeActive,
    isLoading,
    applyBranding,
    resetBranding,
    previewBranding,
    
    // Helper functions for components
    getPrimaryColor: () => currentBranding?.primaryColor || defaultBranding.primaryColor,
    getSecondaryColor: () => currentBranding?.secondaryColor || defaultBranding.secondaryColor,
    getAccentColor: () => currentBranding?.accentColor || defaultBranding.accentColor,
    
    // CSS class helpers
    primaryBg: `bg-[${currentBranding?.primaryColor || defaultBranding.primaryColor}]`,
    secondaryBg: `bg-[${currentBranding?.secondaryColor || defaultBranding.secondaryColor}]`,
    accentBg: `bg-[${currentBranding?.accentColor || defaultBranding.accentColor}]`,
    
    primaryText: `text-[${currentBranding?.primaryColor || defaultBranding.primaryColor}]`,
    secondaryText: `text-[${currentBranding?.secondaryColor || defaultBranding.secondaryColor}]`,
    accentText: `text-[${currentBranding?.accentColor || defaultBranding.accentColor}]`,
  };
}