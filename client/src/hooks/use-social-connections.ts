/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { fetchApi, queryClient } from '@/lib/queryClient';

/**
 * Unified social connections hook.
 *
 * Backed by React Query with the key ['/api/social-connections'].
 * Every component that needs to know whether a platform is connected should
 * use this hook so they all share the same cache entry.
 *
 * After any OAuth success (callback page, popup close, etc.) call
 * `invalidateSocialConnections()` to refresh every consumer at once.
 */

export interface SocialConnection {
  id: string;
  platform: string;
  platformUserId: string;
  platformUsername?: string;
  platformDisplayName?: string;
  profileData?: Record<string, any>;
  connectedAt?: string;
  isActive?: boolean;
}

export function useSocialConnections() {
  const { user } = useAuth();
  const _qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['/api/social-connections'],
    queryFn: async () => {
      const res = await fetchApi('/api/social-connections');
      return res as { connections: SocialConnection[] };
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const connections: SocialConnection[] = useMemo(() => (data as any)?.connections ?? [], [data]);

  const connectedPlatforms = useMemo(() => {
    const map = new Map<string, SocialConnection>();
    connections.forEach((c) => map.set(c.platform, c));
    return map;
  }, [connections]);

  const isPlatformConnected = useCallback(
    (platform: string): boolean => connectedPlatforms.has(platform),
    [connectedPlatforms]
  );

  const getConnection = useCallback(
    (platform: string): SocialConnection | undefined => connectedPlatforms.get(platform),
    [connectedPlatforms]
  );

  return {
    /** Map of platform -> connection data */
    connectedPlatforms,
    /** Quick boolean check */
    isPlatformConnected,
    /** Get full connection object for a platform */
    getConnection,
    /** All connections as an array */
    connections,
    /** True while the initial fetch is in flight */
    isLoading,
    /** Manually refetch */
    refetch,
    /** Raw query data */
    data,
  };
}

/**
 * Invalidate the social-connections cache from anywhere in the app.
 * Call this after a successful OAuth connection save so every component
 * that uses `useSocialConnections()` re-renders with fresh data.
 */
export function invalidateSocialConnections() {
  queryClient.invalidateQueries({ queryKey: ['/api/social-connections'] });
}
