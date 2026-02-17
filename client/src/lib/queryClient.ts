import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Store for JWT access token (in memory for security)
let accessTokenStorage: string | null = null;

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

/**
 * Traditional apiRequest function (method first)
 */
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  
  // Add auth headers
  Object.assign(headers, getAuthHeaders());

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

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
  
  // Add auth headers
  Object.assign(headers, getAuthHeaders());

  const res = await fetch(url, {
    method,
    headers,
    body: options?.body,
    credentials: "include",
  });

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
