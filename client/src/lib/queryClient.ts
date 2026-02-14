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
 * Helper to get current Dynamic user ID from multiple sources (legacy support)
 */
export function getDynamicUserId(): string | null {
  try {
    // 1. Current window (for parent window)
    if ((window as any).__dynamicUserId) {
      return (window as any).__dynamicUserId;
    }
    
    // 2. localStorage (for popup window - Twitter OAuth)
    const fromStorage = localStorage.getItem("twitter_dynamic_user_id");
    if (fromStorage) {
      return fromStorage;
    }
    
    // 3. Opener window (for popup window)
    if ((window as any).opener && (window as any).opener.__dynamicUserId) {
      return (window as any).opener.__dynamicUserId;
    }
    
    // 4. Opener's localStorage (for popup window)
    if ((window as any).opener && (window as any).opener.localStorage) {
      const fromOpenerStorage = (window as any).opener.localStorage.getItem("twitter_dynamic_user_id");
      if (fromOpenerStorage) {
        return fromOpenerStorage;
      }
    }
  } catch (e) {
    console.warn('[Auth] Error accessing Dynamic user ID:', e);
  }
  
  return null;
}

/**
 * Build auth headers for API requests
 * Supports both JWT (new) and Dynamic user ID (legacy)
 */
export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  
  // Prefer JWT if available
  const accessToken = getAccessToken();
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
    return headers;
  }
  
  // Fall back to legacy Dynamic user ID
  const dynamicUserId = getDynamicUserId();
  if (dynamicUserId) {
    headers["x-dynamic-user-id"] = dynamicUserId;
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
 * Fetch wrapper for URL-first pattern with options (returns JSON)
 */
export async function fetchApi(
  url: string,
  options?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }
): Promise<any> {
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
  return await res.json();
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

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
