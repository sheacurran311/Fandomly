import { createContext, useContext, ReactNode } from "react";
import { useTenantBranding } from "@/hooks/use-tenant-branding";

interface TenantThemeContextType {
  currentBranding: any;
  isCustomThemeActive: boolean;
  isLoading: boolean;
  applyBranding: (branding: any) => void;
  resetBranding: () => void;
  previewBranding: (branding: any) => void;
  getPrimaryColor: () => string;
  getSecondaryColor: () => string; 
  getAccentColor: () => string;
  primaryBg: string;
  secondaryBg: string;
  accentBg: string;
  primaryText: string;
  secondaryText: string;
  accentText: string;
}

const TenantThemeContext = createContext<TenantThemeContextType | undefined>(undefined);

interface TenantThemeProviderProps {
  children: ReactNode;
  tenantId?: string;
}

export function TenantThemeProvider({ children, tenantId }: TenantThemeProviderProps) {
  const tenantBranding = useTenantBranding(tenantId);

  return (
    <TenantThemeContext.Provider value={tenantBranding}>
      {children}
    </TenantThemeContext.Provider>
  );
}

export function useTenantTheme() {
  const context = useContext(TenantThemeContext);
  if (context === undefined) {
    throw new Error('useTenantTheme must be used within a TenantThemeProvider');
  }
  return context;
}