import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getAuthToken } from "@dynamic-labs/sdk-react-core";

// Helper to get current Dynamic user ID from local storage or current context
function getDynamicUserId(): string | null {
  if (typeof window !== 'undefined') {
    try {
      // Try multiple localStorage keys that Dynamic might use
      const possibleKeys = [
        'dynamic_authentication_state',
        'dynamic-labs-sdk-auth',
        'dynamic_user',
        'dynamic_auth_token'
      ];
      
      for (const key of possibleKeys) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const parsed = JSON.parse(data);
            
            // Try different user ID paths
            const userId = parsed?.user?.userId || 
                          parsed?.user?.id || 
                          parsed?.userId || 
                          parsed?.id ||
                          parsed?.user?.sub ||
                          parsed?.sub;
                          
            if (userId) {
              console.log(`[Auth] Found Dynamic user ID: ${userId} from key: ${key}`);
              return userId;
            }
          } catch (parseError) {
            // Skip invalid JSON
            continue;
          }
        }
      }
      
      console.warn('[Auth] No Dynamic user ID found in localStorage');
    } catch (error) {
      console.warn('[Auth] Failed to get Dynamic user ID:', error);
    }
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
