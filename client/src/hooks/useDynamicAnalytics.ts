import { useQuery } from "@tanstack/react-query";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

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

// Helper to create authenticated fetch
async function authenticatedFetch(url: string, dynamicUserId?: string) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (dynamicUserId) {
    headers['x-dynamic-user-id'] = dynamicUserId;
  }
  
  const response = await fetch(url, { headers });
  return response.json();
}

/**
 * Hook to fetch wallet analytics from Dynamic
 */
export function useDynamicWalletAnalytics(enabled: boolean = true, dateRange?: DateRange) {
  const { user } = useDynamicContext();
  const dynamicUserId = user?.userId;
  
  return useQuery<DynamicAnalyticsResponse>({
    queryKey: ["/api/admin/dynamic-analytics/wallets", dateRange, dynamicUserId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange?.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange?.endDate) params.append('endDate', dateRange.endDate);
      
      return authenticatedFetch(`/api/admin/dynamic-analytics/wallets?${params}`, dynamicUserId);
    },
    enabled: enabled && !!dynamicUserId,
  });
}

/**
 * Hook to fetch visit analytics from Dynamic
 */
export function useDynamicVisitAnalytics(enabled: boolean = true, dateRange?: DateRange) {
  const { user } = useDynamicContext();
  const dynamicUserId = user?.userId;
  
  return useQuery<DynamicAnalyticsResponse>({
    queryKey: ["/api/admin/dynamic-analytics/visits", dateRange, dynamicUserId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange?.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange?.endDate) params.append('endDate', dateRange.endDate);
      
      return authenticatedFetch(`/api/admin/dynamic-analytics/visits?${params}`, dynamicUserId);
    },
    enabled: enabled && !!dynamicUserId,
  });
}

/**
 * Hook to fetch overview analytics from Dynamic
 */
export function useDynamicOverviewAnalytics(enabled: boolean = true, dateRange?: DateRange) {
  const { user } = useDynamicContext();
  const dynamicUserId = user?.userId;
  
  return useQuery<DynamicAnalyticsResponse>({
    queryKey: ["/api/admin/dynamic-analytics/overview", dateRange, dynamicUserId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange?.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange?.endDate) params.append('endDate', dateRange.endDate);
      
      return authenticatedFetch(`/api/admin/dynamic-analytics/overview?${params}`, dynamicUserId);
    },
    enabled: enabled && !!dynamicUserId,
  });
}

/**
 * Hook to fetch topline analytics from Dynamic
 */
export function useDynamicToplineAnalytics(enabled: boolean = true, dateRange?: DateRange) {
  const { user } = useDynamicContext();
  const dynamicUserId = user?.userId;
  
  return useQuery<DynamicAnalyticsResponse>({
    queryKey: ["/api/admin/dynamic-analytics/topline", dateRange, dynamicUserId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange?.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange?.endDate) params.append('endDate', dateRange.endDate);
      
      return authenticatedFetch(`/api/admin/dynamic-analytics/topline?${params}`, dynamicUserId);
    },
    enabled: enabled && !!dynamicUserId,
  });
}

/**
 * Hook to fetch engagement analytics from Dynamic
 */
export function useDynamicEngagementAnalytics(enabled: boolean = true, dateRange?: DateRange) {
  const { user } = useDynamicContext();
  const dynamicUserId = user?.userId;
  
  return useQuery<DynamicAnalyticsResponse>({
    queryKey: ["/api/admin/dynamic-analytics/engagement", dateRange, dynamicUserId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange?.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange?.endDate) params.append('endDate', dateRange.endDate);
      
      return authenticatedFetch(`/api/admin/dynamic-analytics/engagement?${params}`, dynamicUserId);
    },
    enabled: enabled && !!dynamicUserId,
  });
}

/**
 * Hook to fetch wallet breakdown analytics from Dynamic
 */
export function useDynamicWalletBreakdown(enabled: boolean = true, dateRange?: DateRange) {
  const { user } = useDynamicContext();
  const dynamicUserId = user?.userId;
  
  return useQuery<DynamicAnalyticsResponse>({
    queryKey: ["/api/admin/dynamic-analytics/wallets/breakdown", dateRange, dynamicUserId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange?.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange?.endDate) params.append('endDate', dateRange.endDate);
      
      return authenticatedFetch(`/api/admin/dynamic-analytics/wallets/breakdown?${params}`, dynamicUserId);
    },
    enabled: enabled && !!dynamicUserId,
  });
}

/**
 * Hook to fetch users from Dynamic
 */
export function useDynamicUsers(enabled: boolean = true, limit?: number, offset?: number) {
  const { user } = useDynamicContext();
  const dynamicUserId = user?.userId;
  
  return useQuery<DynamicAnalyticsResponse>({
    queryKey: ["/api/admin/dynamic-analytics/users", limit, offset, dynamicUserId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      if (offset) params.append('offset', offset.toString());
      
      return authenticatedFetch(`/api/admin/dynamic-analytics/users?${params}`, dynamicUserId);
    },
    enabled: enabled && !!dynamicUserId,
  });
}

