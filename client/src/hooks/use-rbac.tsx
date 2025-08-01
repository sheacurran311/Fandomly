import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useQuery } from "@tanstack/react-query";

export interface UserRole {
  id: string;
  role: 'fandomly_admin' | 'customer_admin' | 'customer_end_user';
  customerTier?: 'basic' | 'premium' | 'vip';
  adminPermissions?: {
    canManageAllCreators?: boolean;
    canManageUsers?: boolean;
    canAccessAnalytics?: boolean;
    canManagePlatformSettings?: boolean;
    canManagePayments?: boolean;
  };
  customerAdminData?: {
    organizationName?: string;
    businessType?: string;
    nilAthleteData?: {
      sport: string;
      division: string;
      school: string;
      position: string;
      year: string;
    };
    subscriptionStatus?: 'active' | 'inactive' | 'trial';
    subscriptionTier?: 'starter' | 'professional' | 'enterprise';
  };
}

export function useRBAC() {
  const { user } = useDynamicContext();

  const { data: userRole, isLoading } = useQuery<UserRole>({
    queryKey: ['/api/auth/role'],
    enabled: !!user,
  });

  const hasRole = (allowedRoles: Array<'fandomly_admin' | 'customer_admin' | 'customer_end_user'>): boolean => {
    if (!userRole) return false;
    return allowedRoles.includes(userRole.role);
  };

  const hasCustomerTier = (minTier: 'basic' | 'premium' | 'vip'): boolean => {
    if (!userRole || userRole.role !== 'customer_end_user') return true; // Non-customers bypass tier restrictions
    
    const tierLevels: Record<string, number> = { basic: 1, premium: 2, vip: 3 };
    const currentTier = userRole.customerTier || 'basic';
    const userTierLevel = tierLevels[currentTier];
    const requiredTierLevel = tierLevels[minTier];
    
    return userTierLevel >= requiredTierLevel;
  };

  const hasAdminPermission = (permission: keyof NonNullable<UserRole['adminPermissions']>): boolean => {
    if (!userRole || userRole.role !== 'fandomly_admin') return false;
    return !!userRole.adminPermissions?.[permission];
  };

  const hasFeatureAccess = (feature: 'nil_dashboard' | 'advanced_analytics' | 'bulk_operations' | 'api_access'): boolean => {
    if (!userRole) return false;

    switch (feature) {
      case 'nil_dashboard':
        return userRole.role === 'customer_admin' || userRole.role === 'fandomly_admin';
      
      case 'advanced_analytics':
        return userRole.role === 'fandomly_admin' || 
               (userRole.role === 'customer_admin') ||
               (userRole.role === 'customer_end_user' && (userRole.customerTier === 'premium' || userRole.customerTier === 'vip'));
      
      case 'bulk_operations':
        return userRole.role === 'fandomly_admin' || userRole.role === 'customer_admin';
      
      case 'api_access':
        return userRole.role === 'fandomly_admin' || 
               (userRole.role === 'customer_admin') ||
               (userRole.role === 'customer_end_user' && userRole.customerTier === 'vip');
      
      default:
        return false;
    }
  };

  const isFandomlyAdmin = (): boolean => hasRole(['fandomly_admin']);
  const isCustomerAdmin = (): boolean => hasRole(['customer_admin']);
  const isCustomerEndUser = (): boolean => hasRole(['customer_end_user']);
  const isNILAthlete = (): boolean => {
    return isCustomerAdmin() && !!userRole?.customerAdminData?.nilAthleteData;
  };

  return {
    userRole,
    isLoading,
    hasRole,
    hasCustomerTier,
    hasAdminPermission,
    hasFeatureAccess,
    isFandomlyAdmin,
    isCustomerAdmin,
    isCustomerEndUser,
    isNILAthlete,
  };
}

// Component wrapper for role-based rendering
export function RoleGuard({ 
  allowedRoles, 
  minTier, 
  adminPermission,
  feature,
  children, 
  fallback 
}: {
  allowedRoles?: Array<'fandomly_admin' | 'customer_admin' | 'customer_end_user'>;
  minTier?: 'basic' | 'premium' | 'vip';
  adminPermission?: keyof NonNullable<UserRole['adminPermissions']>;
  feature?: 'nil_dashboard' | 'advanced_analytics' | 'bulk_operations' | 'api_access';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { hasRole, hasCustomerTier, hasAdminPermission, hasFeatureAccess, isLoading } = useRBAC();

  if (isLoading) {
    return <div className="animate-pulse bg-gray-300 h-4 w-24 rounded"></div>;
  }

  // Check role access
  if (allowedRoles && !hasRole(allowedRoles)) {
    return fallback || null;
  }

  // Check tier access
  if (minTier && !hasCustomerTier(minTier)) {
    return fallback || null;
  }

  // Check admin permission
  if (adminPermission && !hasAdminPermission(adminPermission)) {
    return fallback || null;
  }

  // Check feature access
  if (feature && !hasFeatureAccess(feature)) {
    return fallback || null;
  }

  return <>{children}</>;
}