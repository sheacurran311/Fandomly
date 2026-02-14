/**
 * Analytics Hooks
 * 
 * React Query hooks for the cross-platform analytics API.
 * Provides overview, per-platform, content, growth, and comparison data.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi, apiRequest } from '@/lib/queryClient';

// ============================================================================
// Types
// ============================================================================

export interface PlatformMetrics {
  platform: string;
  followers: number;
  views: number;
  likes: number;
  posts: number;
  engagementRate: number | null;
  platformSpecific: Record<string, any>;
}

export interface TopContent {
  id: string;
  platform: string;
  title: string;
  contentType: string;
  url: string;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
}

export interface SyncStatus {
  platform: string;
  syncEnabled: boolean;
  lastSyncAt: string | null;
  nextSyncAt: string | null;
  status: string;
}

export interface AnalyticsOverview {
  overview: {
    totalFollowers: number;
    totalViews: number;
    totalLikes: number;
    totalPosts: number;
    totalFans: number;
    totalTaskCompletions: number;
    followerGrowth: number;
  };
  platforms: PlatformMetrics[];
  topContent: TopContent[];
  connectedPlatforms: string[];
  syncStatus: SyncStatus[];
  dateRange: { start: string; end: string };
}

export interface PlatformAnalytics {
  platform: string;
  metricsHistory: Array<{
    date: string;
    followers: number;
    following: number;
    totalPosts: number;
    totalViews: number;
    totalLikes: number;
    engagementRate: number | null;
    subscribers: number;
    platformSpecific: Record<string, any>;
  }>;
  content: Array<{
    id: string;
    platformContentId: string;
    contentType: string;
    title: string;
    url: string;
    thumbnailUrl: string | null;
    publishedAt: string | null;
    views: number;
    likes: number;
    comments: number;
    shares: number;
  }>;
  syncStatus: {
    syncEnabled: boolean;
    lastSyncAt: string | null;
    nextSyncAt: string | null;
    status: string;
    frequency: number;
  } | null;
  connectionInfo: {
    username: string;
    displayName: string;
    connectedAt: string;
    profileData: Record<string, any>;
  } | null;
}

export interface GrowthData {
  aggregated: Array<{
    date: string;
    totalFollowers: number;
    totalViews: number;
    totalLikes: number;
    platforms: Record<string, { followers: number; views: number; likes: number }>;
  }>;
  byPlatform: Record<string, Array<{ date: string; followers: number; views: number }>>;
  dateRange: { start: string; end: string };
}

export interface ComparisonData {
  comparison: Array<{
    platform: string;
    username: string;
    displayName: string;
    followers: number;
    followerGrowth: number;
    totalViews: number;
    totalPosts: number;
    engagementRate: number | null;
    contentItems: number;
    platformSpecific: Record<string, any>;
  }>;
  dateRange: { start: string; end: string };
}

export interface SyncPreference {
  id: string;
  userId: string;
  platform: string;
  syncEnabled: boolean;
  syncFrequencyMinutes: number;
  lastSyncAt: string | null;
  nextSyncAt: string | null;
  syncStatus: string;
  errorMessage: string | null;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch cross-platform analytics overview
 */
export function useAnalyticsOverview(platforms?: string, dateRange?: string) {
  const params = new URLSearchParams();
  if (platforms) params.set('platforms', platforms);
  if (dateRange) params.set('dateRange', dateRange);
  const qs = params.toString();

  return useQuery<AnalyticsOverview>({
    queryKey: ['/api/analytics/overview' + (qs ? `?${qs}` : '')],
    staleTime: 60_000,
    refetchInterval: 5 * 60_000, // Auto-refresh every 5 min
  });
}

/**
 * Fetch single platform deep dive
 */
export function usePlatformAnalytics(platform: string | null, dateRange?: string) {
  const params = new URLSearchParams();
  if (dateRange) params.set('dateRange', dateRange);
  const qs = params.toString();

  return useQuery<PlatformAnalytics>({
    queryKey: [`/api/analytics/platform/${platform}` + (qs ? `?${qs}` : '')],
    enabled: !!platform,
    staleTime: 60_000,
  });
}

/**
 * Fetch content performance across platforms
 */
export function useContentAnalytics(platforms?: string, sortBy?: string, limit?: number) {
  const params = new URLSearchParams();
  if (platforms) params.set('platforms', platforms);
  if (sortBy) params.set('sortBy', sortBy);
  if (limit) params.set('limit', String(limit));
  const qs = params.toString();

  return useQuery<{ content: TopContent[]; total: number }>({
    queryKey: ['/api/analytics/content' + (qs ? `?${qs}` : '')],
    staleTime: 60_000,
  });
}

/**
 * Fetch growth data over time
 */
export function useGrowthAnalytics(platforms?: string, dateRange?: string) {
  const params = new URLSearchParams();
  if (platforms) params.set('platforms', platforms);
  if (dateRange) params.set('dateRange', dateRange);
  const qs = params.toString();

  return useQuery<GrowthData>({
    queryKey: ['/api/analytics/growth' + (qs ? `?${qs}` : '')],
    staleTime: 60_000,
  });
}

/**
 * Fetch platform comparison data
 */
export function useComparisonAnalytics(dateRange?: string) {
  const params = new URLSearchParams();
  if (dateRange) params.set('dateRange', dateRange);
  const qs = params.toString();

  return useQuery<ComparisonData>({
    queryKey: ['/api/analytics/comparison' + (qs ? `?${qs}` : '')],
    staleTime: 60_000,
  });
}

/**
 * Fetch sync preferences for all platforms
 */
export function useSyncPreferences() {
  const queryClient = useQueryClient();

  const query = useQuery<{ preferences: SyncPreference[]; connectedPlatforms: string[] }>({
    queryKey: ['/api/sync-preferences'],
    staleTime: 30_000,
  });

  const toggleSync = useMutation({
    mutationFn: async ({ platform, syncEnabled }: { platform: string; syncEnabled: boolean }) => {
      const res = await apiRequest('PUT', `/api/sync-preferences/${platform}`, { syncEnabled });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sync-preferences'] });
    },
  });

  const updateFrequency = useMutation({
    mutationFn: async ({ platform, syncFrequencyMinutes }: { platform: string; syncFrequencyMinutes: number }) => {
      const res = await apiRequest('PUT', `/api/sync-preferences/${platform}`, { syncFrequencyMinutes });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sync-preferences'] });
    },
  });

  const syncNow = useMutation({
    mutationFn: async (platform: string) => {
      const res = await apiRequest('POST', `/api/sync-preferences/${platform}/sync-now`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sync-preferences'] });
      // Also refresh analytics data after manual sync
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
      }, 5000);
    },
  });

  return {
    ...query,
    toggleSync,
    updateFrequency,
    syncNow,
  };
}

/**
 * Fetch sync history log
 */
export function useSyncHistory(limit?: number) {
  const params = new URLSearchParams();
  if (limit) params.set('limit', String(limit));
  const qs = params.toString();

  return useQuery<{ logs: any[] }>({
    queryKey: ['/api/analytics/sync-history' + (qs ? `?${qs}` : '')],
    staleTime: 30_000,
  });
}
