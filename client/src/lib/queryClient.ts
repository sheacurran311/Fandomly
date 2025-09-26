import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getAuthToken } from "@dynamic-labs/sdk-react-core";

// Helper to get current Dynamic user ID from multiple sources
function getDynamicUserId(): string | null {
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

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Traditional apiRequest function (method first)
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  
  // Add Dynamic auth token for authenticated requests
  const authToken = getAuthToken();
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  // Add Dynamic user ID header for backend authentication
  const dynamicUserId = getDynamicUserId();
  if (dynamicUserId) {
    headers["x-dynamic-user-id"] = dynamicUserId;
    console.log(`[Auth] Adding user ID header: ${dynamicUserId} for ${method} ${url}`);
  } else {
    console.warn(`[Auth] No Dynamic user ID available for ${method} ${url}`);
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

// Fetch wrapper for URL-first pattern with options (returns JSON)
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
  
  // Add Dynamic auth token for authenticated requests
  const authToken = getAuthToken();
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  // Add Dynamic user ID header for backend authentication
  const dynamicUserId = getDynamicUserId();
  if (dynamicUserId) {
    headers["x-dynamic-user-id"] = dynamicUserId;
    console.log(`[Auth] Adding user ID header: ${dynamicUserId} for ${method} ${url}`);
  } else {
    console.warn(`[Auth] No Dynamic user ID available for ${method} ${url}`);
    console.log(`[Auth] Dynamic user ID debug for ${method} ${url}:`, {
      fromWindow: (window as any).__dynamicUserId || null,
      fromStorage: localStorage.getItem("twitter_dynamic_user_id") || null,
      fromOpener: ((window as any).opener && (window as any).opener.__dynamicUserId) || null,
      fromOpenerStorage: ((window as any).opener && (window as any).opener.localStorage?.getItem("twitter_dynamic_user_id")) || null
    });
  }

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
    
    // Add Dynamic auth token for authenticated queries
    const authToken = getAuthToken();
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    // Add Dynamic user ID header for backend authentication
    const dynamicUserId = getDynamicUserId();
    if (dynamicUserId) {
      headers["x-dynamic-user-id"] = dynamicUserId;
    }

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
