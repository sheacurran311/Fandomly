import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Store for JWT access token (in memory for security)
let accessTokenStorage: string | null = null;

// CSRF token cache (shared across all API calls)
let csrfTokenCache: string | null = null;
let csrfTokenFetchPromise: Promise<string | null> | null = null;

/**
 * Set the JWT access token (called by AuthContext)
 */
export function setAccessToken(token: string | null) {
  accessTokenStorage = token;
}

/**
 * Get the current JWT access token
 */
export function getAccessToken(): string | null {
  return accessTokenStorage;
}

/**
 * Fetch a fresh CSRF token from the server.
 * Deduplicates concurrent requests so only one fetch happens at a time.
 */
async function fetchCsrfToken(): Promise<string | null> {
  if (csrfTokenFetchPromise) return csrfTokenFetchPromise;

  csrfTokenFetchPromise = (async () => {
    try {
      const response = await fetch('/api/csrf-token', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        csrfTokenCache = data.csrfToken;
        return csrfTokenCache;
      }
    } catch (error) {
      console.error('[CSRF] Failed to fetch token:', error);
    }
    return null;
  })();

  const token = await csrfTokenFetchPromise;
  csrfTokenFetchPromise = null;
  return token;
}

/**
 * Get CSRF token (cached or fetch fresh)
 */
export async function getCsrfToken(): Promise<string | null> {
  if (csrfTokenCache) return csrfTokenCache;
  return fetchCsrfToken();
}

/**
 * Reset cached CSRF token (call on 403 to force re-fetch)
 */
export function resetCsrfToken(): void {
  csrfTokenCache = null;
}

/**
 * Build auth headers for API requests
 * Uses JWT authentication only - cookies are sent automatically via credentials: 'include'
 */
export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  
  // Use JWT access token if available
  const accessToken = getAccessToken();
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }
  
  return headers;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    
    // Check for token expiration
    if (res.status === 401) {
      try {
        const json = JSON.parse(text);
        if (json.code === 'TOKEN_EXPIRED') {
          // Trigger token refresh (handled by AuthContext)
          window.dispatchEvent(new CustomEvent('auth:token-expired'));
        }
      } catch {}
    }
    
    throw new Error(`${res.status}: ${text}`);
  }
}

/** Methods that mutate server state and need CSRF protection */
const CSRF_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);

/**
 * Add CSRF token to headers for state-changing requests
 */
async function addCsrfHeader(headers: Record<string, string>, method: string): Promise<void> {
  if (CSRF_METHODS.has(method.toUpperCase())) {
    const token = await getCsrfToken();
    if (token) {
      headers['x-csrf-token'] = token;
    }
  }
}

/**
 * Traditional apiRequest function (method first)
 */
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  
  // Add auth + CSRF headers
  Object.assign(headers, getAuthHeaders());
  await addCsrfHeader(headers, method);

  let res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // On CSRF rejection, fetch a fresh token and retry once
  if (res.status === 403) {
    resetCsrfToken();
    const freshToken = await getCsrfToken();
    if (freshToken) {
      headers['x-csrf-token'] = freshToken;
      res = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include",
      });
    }
  }

  await throwIfResNotOk(res);
  return res;
}

/**
 * Fetch wrapper for URL-first pattern with options (returns typed JSON)
 */
export async function fetchApi<T = unknown>(
  url: string,
  options?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }
): Promise<T> {
  const method = options?.method || "GET";
  const headers: Record<string, string> = { "Content-Type": "application/json", ...options?.headers };
  
  // Add auth + CSRF headers
  Object.assign(headers, getAuthHeaders());
  await addCsrfHeader(headers, method);

  let res = await fetch(url, {
    method,
    headers,
    body: options?.body,
    credentials: "include",
  });

  // On CSRF rejection, fetch a fresh token and retry once
  if (res.status === 403) {
    resetCsrfToken();
    const freshToken = await getCsrfToken();
    if (freshToken) {
      headers['x-csrf-token'] = freshToken;
      res = await fetch(url, {
        method,
        headers,
        body: options?.body,
        credentials: "include",
      });
    }
  }

  await throwIfResNotOk(res);
  return await res.json() as T;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers: Record<string, string> = {};
    
    // Add auth headers
    Object.assign(headers, getAuthHeaders());

    const res = await fetch(queryKey.join("/") as string, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// Default stale time of 5 minutes for queries
const DEFAULT_STALE_TIME = 5 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      staleTime: DEFAULT_STALE_TIME,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
