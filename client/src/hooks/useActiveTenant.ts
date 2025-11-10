import { useState, useEffect } from 'react';
import { useAuth } from './use-auth';

/**
 * Hook to manage active tenant for agency users managing multiple brands
 * Stores active tenant in localStorage and syncs across tabs
 */
export function useActiveTenant() {
  const { user } = useAuth();
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load active tenant from localStorage on mount
  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    const storageKey = `active_tenant_${user.id}`;
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      setActiveTenantId(stored);
    }
    
    setIsLoading(false);
  }, [user?.id]);

  // Listen for storage events (cross-tab synchronization)
  useEffect(() => {
    if (!user?.id) return;

    const storageKey = `active_tenant_${user.id}`;
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        setActiveTenantId(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user?.id]);

  const switchTenant = (tenantId: string) => {
    if (!user?.id) return;

    const storageKey = `active_tenant_${user.id}`;
    localStorage.setItem(storageKey, tenantId);
    setActiveTenantId(tenantId);

    // Dispatch custom event for same-tab synchronization
    window.dispatchEvent(new CustomEvent('tenant-switched', { detail: { tenantId } }));
  };

  const clearActiveTenant = () => {
    if (!user?.id) return;

    const storageKey = `active_tenant_${user.id}`;
    localStorage.removeItem(storageKey);
    setActiveTenantId(null);
  };

  return {
    activeTenantId,
    isLoading,
    switchTenant,
    clearActiveTenant,
    hasActiveTenant: !!activeTenantId,
  };
}

