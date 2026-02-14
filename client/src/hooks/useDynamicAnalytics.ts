import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { fetchApi } from "@/lib/queryClient";

interface DynamicAnalyticsResponse<T = any> {
  success: boolean;
  configured: boolean;
  data: T | null;
  error?: string;
}

interface DateRange {
  startDate?: string;
  endDate?: string;
}

/**
 * Hook to fetch wallet analytics (stub - Dynamic analytics removed)
 */
export function useDynamicWalletAnalytics(enabled: boolean = true, dateRange?: DateRange) {
  const { user, isAuthenticated } = useAuth();
  
  return useQuery<DynamicAnalyticsResponse>({
    queryKey: ["/api/admin/dynamic-analytics/wallets", dateRange, user?.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange?.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange?.endDate) params.append('endDate', dateRange.endDate);
      
      return fetchApi(`/api/admin/dynamic-analytics/wallets?${params}`);
    },
    enabled: enabled && isAuthenticated,
  });
}

/**
 * Hook to fetch visit analytics (stub - Dynamic analytics removed)
 */
export function useDynamicVisitAnalytics(enabled: boolean = true, dateRange?: DateRange) {
  const { user, isAuthenticated } = useAuth();
  
  return useQuery<DynamicAnalyticsResponse>({
    queryKey: ["/api/admin/dynamic-analytics/visits", dateRange, user?.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange?.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange?.endDate) params.append('endDate', dateRange.endDate);
      
      return fetchApi(`/api/admin/dynamic-analytics/visits?${params}`);
    },
    enabled: enabled && isAuthenticated,
  });
}

/**
 * Hook to fetch overview analytics (stub - Dynamic analytics removed)
 */
export function useDynamicOverviewAnalytics(enabled: boolean = true, dateRange?: DateRange) {
  const { user, isAuthenticated } = useAuth();
  
  return useQuery<DynamicAnalyticsResponse>({
    queryKey: ["/api/admin/dynamic-analytics/overview", dateRange, user?.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange?.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange?.endDate) params.append('endDate', dateRange.endDate);
      
      return fetchApi(`/api/admin/dynamic-analytics/overview?${params}`);
    },
    enabled: enabled && isAuthenticated,
  });
}

/**
 * Hook to fetch topline analytics (stub - Dynamic analytics removed)
 */
export function useDynamicToplineAnalytics(enabled: boolean = true, dateRange?: DateRange) {
  const { user, isAuthenticated } = useAuth();
  
  return useQuery<DynamicAnalyticsResponse>({
    queryKey: ["/api/admin/dynamic-analytics/topline", dateRange, user?.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange?.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange?.endDate) params.append('endDate', dateRange.endDate);
      
      return fetchApi(`/api/admin/dynamic-analytics/topline?${params}`);
    },
    enabled: enabled && isAuthenticated,
  });
}

/**
 * Hook to fetch engagement analytics (stub - Dynamic analytics removed)
 */
export function useDynamicEngagementAnalytics(enabled: boolean = true, dateRange?: DateRange) {
  const { user, isAuthenticated } = useAuth();
  
  return useQuery<DynamicAnalyticsResponse>({
    queryKey: ["/api/admin/dynamic-analytics/engagement", dateRange, user?.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange?.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange?.endDate) params.append('endDate', dateRange.endDate);
      
      return fetchApi(`/api/admin/dynamic-analytics/engagement?${params}`);
    },
    enabled: enabled && isAuthenticated,
  });
}

/**
 * Hook to fetch wallet breakdown analytics (stub - Dynamic analytics removed)
 */
export function useDynamicWalletBreakdown(enabled: boolean = true, dateRange?: DateRange) {
  const { user, isAuthenticated } = useAuth();
  
  return useQuery<DynamicAnalyticsResponse>({
    queryKey: ["/api/admin/dynamic-analytics/wallets/breakdown", dateRange, user?.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange?.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange?.endDate) params.append('endDate', dateRange.endDate);
      
      return fetchApi(`/api/admin/dynamic-analytics/wallets/breakdown?${params}`);
    },
    enabled: enabled && isAuthenticated,
  });
}

/**
 * Hook to fetch users (stub - Dynamic analytics removed)
 */
export function useDynamicUsers(enabled: boolean = true, limit?: number, offset?: number) {
  const { user, isAuthenticated } = useAuth();
  
  return useQuery<DynamicAnalyticsResponse>({
    queryKey: ["/api/admin/dynamic-analytics/users", limit, offset, user?.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      if (offset) params.append('offset', offset.toString());
      
      return fetchApi(`/api/admin/dynamic-analytics/users?${params}`);
    },
    enabled: enabled && isAuthenticated,
  });
}
