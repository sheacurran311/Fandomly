/**
 * React hooks for Twitter verification
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAccessToken, getCsrfToken, resetCsrfToken } from "@/lib/queryClient";

interface VerificationResult {
  verified: boolean;
  error?: string;
  message?: string;
  data?: any;
  completion?: any;
  rewards?: any;
  alreadyCompleted?: boolean;
}

interface TwitterTweet {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
  entities?: {
    hashtags?: Array<{ tag: string }>;
    mentions?: Array<{ username: string }>;
    urls?: Array<{ url: string; expanded_url: string }>;
  };
}

/**
 * Authenticated fetch helper with CSRF support
 */
async function authenticatedFetch(url: string, options: RequestInit = {}) {
  const accessToken = getAccessToken();
  const method = options.method?.toUpperCase() || 'GET';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  // Add CSRF token for state-changing requests
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const csrfToken = await getCsrfToken();
    if (csrfToken) {
      headers['x-csrf-token'] = csrfToken;
    }
  }

  let response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  // On CSRF rejection (403), refresh token and retry once
  if (response.status === 403 && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    resetCsrfToken();
    const freshToken = await getCsrfToken();
    if (freshToken) {
      headers['x-csrf-token'] = freshToken;
      response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });
    }
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

/**
 * Hook to verify a Twitter task
 */
export function useVerifyTwitterTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      taskType,
      taskSettings,
    }: {
      taskId: string;
      taskType: string;
      taskSettings: any;
    }): Promise<VerificationResult> => {
      return await authenticatedFetch('/api/twitter/verify-task', {
        method: 'POST',
        body: JSON.stringify({ taskId, taskType, taskSettings }),
      });
    },
    onSuccess: (data) => {
      // Invalidate relevant queries on success
      if (data.verified) {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['taskCompletions'] });
        queryClient.invalidateQueries({ queryKey: ['points'] });
        queryClient.invalidateQueries({ queryKey: ['fanProgram'] });
      }
    },
  });
}

/**
 * Hook to verify a Twitter follow
 */
export function useVerifyFollow() {
  return useMutation({
    mutationFn: async ({ creatorHandle }: { creatorHandle: string }): Promise<VerificationResult> => {
      return await authenticatedFetch('/api/twitter/verify/follow', {
        method: 'POST',
        body: JSON.stringify({ creatorHandle }),
      });
    },
  });
}

/**
 * Hook to verify a Twitter like
 */
export function useVerifyLike() {
  return useMutation({
    mutationFn: async ({ tweetUrl }: { tweetUrl: string }): Promise<VerificationResult> => {
      return await authenticatedFetch('/api/twitter/verify/like', {
        method: 'POST',
        body: JSON.stringify({ tweetUrl }),
      });
    },
  });
}

/**
 * Hook to verify a Twitter retweet
 */
export function useVerifyRetweet() {
  return useMutation({
    mutationFn: async ({ tweetUrl }: { tweetUrl: string }): Promise<VerificationResult> => {
      return await authenticatedFetch('/api/twitter/verify/retweet', {
        method: 'POST',
        body: JSON.stringify({ tweetUrl }),
      });
    },
  });
}

/**
 * Hook to fetch creator's recent tweets
 */
export function useCreatorTweets(creatorUrl: string, limit: number = 5) {
  return useQuery({
    queryKey: ['creatorTweets', creatorUrl, limit],
    queryFn: async (): Promise<TwitterTweet[]> => {
      const response = await fetch(`/api/twitter/creator-tweets/${creatorUrl}?limit=${limit}`);
      if (!response.ok) {
        throw new Error('Failed to fetch tweets');
      }
      const data = await response.json();
      return data.tweets || [];
    },
    enabled: !!creatorUrl,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch user's own tweets
 */
export function useUserTweets(userId: string, limit: number = 5) {
  return useQuery({
    queryKey: ['userTweets', userId, limit],
    queryFn: async (): Promise<TwitterTweet[]> => {
      const data = await authenticatedFetch(`/api/twitter/tweets/${userId}?limit=${limit}`);
      return data.tweets || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a specific tweet
 */
export function useTweet(tweetId: string) {
  return useQuery({
    queryKey: ['tweet', tweetId],
    queryFn: async (): Promise<TwitterTweet | null> => {
      const data = await authenticatedFetch(`/api/twitter/tweet/${tweetId}`);
      return data.tweet;
    },
    enabled: !!tweetId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to extract tweet ID from URL
 */
export function useExtractTweetId() {
  return useMutation({
    mutationFn: async ({ url }: { url: string }): Promise<{ tweetId: string }> => {
      const response = await fetch('/api/twitter/extract-tweet-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!response.ok) {
        throw new Error('Invalid tweet URL');
      }
      return response.json();
    },
  });
}

