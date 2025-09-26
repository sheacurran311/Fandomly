import { fetchApi } from "@/lib/queryClient";

type UserType = "creator" | "fan";

export interface TwitterUserInfo {
  id: string;
  username: string;
  name: string;
  profileImageUrl?: string;
  followersCount?: number;
}

export interface TwitterLoginResult {
  success: boolean;
  error?: string;
  user?: TwitterUserInfo;
  accessToken?: string;
  refreshToken?: string;
  state?: string;
  userType?: UserType;
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function generateRandomString(length: number = 64): string {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const result: string[] = [];
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result.push(charset[randomValues[i] % charset.length]);
  }
  return result.join("");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(digest);
}

function getEnvRedirectUri(): string {
  const runtimeUri = `${window.location.origin}/x-callback`;
  const fromEnv = import.meta.env.VITE_TWITTER_REDIRECT_URI as string | undefined;
  if (!fromEnv || fromEnv.length === 0) return runtimeUri;
  try {
    const envOrigin = new URL(fromEnv).origin;
    if (envOrigin !== window.location.origin) {
      console.warn(`[Twitter] Redirect URI origin mismatch. Using runtime origin instead: ${runtimeUri}`);
      return runtimeUri;
    }
  } catch {}
  return fromEnv;
}

function getEnvScopes(): string {
  const fromEnv = import.meta.env.VITE_TWITTER_SCOPES as string | undefined;
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv.trim();
  return "tweet.read tweet.write users.read follows.read offline.access";
}

function getClientId(): string {
  const clientId = import.meta.env.VITE_TWITTER_CLIENT_ID as string | undefined;
  if (!clientId) throw new Error("VITE_TWITTER_CLIENT_ID is not set");
  return clientId;
}

function getDynamicUserId(): string | null {
  // Try multiple sources for Dynamic user ID
  try {
    // 1. Current window (for parent window)
    if ((window as any).__dynamicUserId) {
      return (window as any).__dynamicUserId;
    }
    
    // 2. localStorage (for popup window)
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
    console.warn('[Twitter] Error accessing Dynamic user ID:', e);
  }
  
  return null;
}

export class TwitterSDKManager {
  static getAuthUrl(userType: UserType, state?: string, codeChallenge?: string): string {
    const clientId = getClientId();
    const redirectUri = getEnvRedirectUri();
    const scopes = getEnvScopes();

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes,
      state: state || `twitter_${userType}_${Date.now()}`,
      code_challenge: codeChallenge || "",
      code_challenge_method: "S256",
    });

    return `https://x.com/i/oauth2/authorize?${params.toString()}`;
  }

  static async secureLogin(userType: UserType, dynamicUserIdParam?: string): Promise<TwitterLoginResult> {
    try {
      // Clear any stale state first (do NOT clear twitter_dynamic_user_id preemptively)
      try {
        localStorage.removeItem("twitter_oauth_state");
        localStorage.removeItem("twitter_pkce_verifier");
        const rawMap = localStorage.getItem('twitter_pkce_map');
        if (rawMap) {
          const map = JSON.parse(rawMap);
          // Clear entries older than 10 minutes
          const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
          Object.keys(map).forEach(key => {
            const timestamp = parseInt(key.split('_')[2]) || 0;
            if (timestamp < tenMinutesAgo) delete map[key];
          });
          localStorage.setItem('twitter_pkce_map', JSON.stringify(map));
        }
      } catch {}
      
      const stateValue = `twitter_${userType}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem("twitter_oauth_state", stateValue);
      try { (window as any).__twitterState = stateValue; } catch {}
      
      console.log(`[Twitter] Starting OAuth with state: ${stateValue}`);

      // CRITICAL: Store Dynamic user ID for popup access
      const dynamicUserId = dynamicUserIdParam || getDynamicUserId();
      if (dynamicUserId) {
        localStorage.setItem("twitter_dynamic_user_id", dynamicUserId);
        try { (window as any).__dynamicUserId = dynamicUserId; } catch {}
        console.log(`[Twitter] Stored Dynamic user ID for popup: ${dynamicUserId}`);
      } else {
        console.warn('[Twitter] No Dynamic user ID available - connection may fail');
      }

      // PKCE setup
      const codeVerifier = generateRandomString(64);
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      localStorage.setItem("twitter_pkce_verifier", codeVerifier);
      try { (window as any).__twitterPkceVerifier = codeVerifier; } catch {}

      // Map state -> code_verifier to support multiple concurrent attempts and robust validation
      try {
        const rawMap = localStorage.getItem('twitter_pkce_map');
        const map: Record<string, string> = rawMap ? JSON.parse(rawMap) : {};
        map[stateValue] = codeVerifier;
        localStorage.setItem('twitter_pkce_map', JSON.stringify(map));
      } catch {}

      const authUrl = this.getAuthUrl(userType, stateValue, codeChallenge);

      return new Promise<TwitterLoginResult>((resolve) => {
        const popup = window.open(
          authUrl,
          "twitter-oauth",
          "width=600,height=700,scrollbars=yes,resizable=yes"
        );

        if (!popup) {
          resolve({ success: false, error: "Popup blocked. Please allow popups and try again." });
          return;
        }

        const pollTimer = setInterval(() => {
          try {
            if (popup.closed) {
              clearInterval(pollTimer);
              const callbackData = (window as any).twitterCallbackData as TwitterLoginResult | undefined;
              if (callbackData) {
                delete (window as any).twitterCallbackData;
                resolve(callbackData);
              } else {
                resolve({ success: false, error: "Twitter authorization was cancelled or failed" });
              }
            }
          } catch {}
        }, 800);

        const messageListener = (event: MessageEvent) => {
          // Callback window asking for PKCE verifier by state
          if (event.data?.type === 'twitter-pkce-request') {
            try {
              const reqState = event.data?.state as string | undefined;
              let verifier: string | null = null;
              // Prefer state->verifier map
              try {
                const rawMap = localStorage.getItem('twitter_pkce_map');
                const map: Record<string, string> = rawMap ? JSON.parse(rawMap) : {};
                verifier = (reqState && map[reqState]) || null;
              } catch {}
              // Fallback to stored verifier
              if (!verifier) {
                verifier = localStorage.getItem('twitter_pkce_verifier');
              }
              // Final fallback: in-memory
              if (!verifier) {
                try { verifier = (window as any).__twitterPkceVerifier || null; } catch {}
              }
              // Reply back to the popup regardless of origin; the popup will validate the response
              (event.source as Window | null)?.postMessage({ type: 'twitter-pkce-response', state: reqState, verifier }, '*');
            } catch {}
            return;
          }
          if (event.data?.type === "twitter-oauth-result") {
            clearInterval(pollTimer);
            window.removeEventListener("message", messageListener);
            try { popup.close(); } catch {}
            try { localStorage.removeItem('twitter_oauth_state'); } catch {}
            try { (window as any).__twitterState = null; } catch {}
            // Do NOT clear parent's __dynamicUserId; Dynamic SDK owns auth state
            // Debug log for parent
            try { console.log('[Twitter] Received oauth result from popup:', event.data?.result); } catch {}
            resolve(event.data.result as TwitterLoginResult);
          }
        };
        window.addEventListener("message", messageListener);
      });
    } catch (error: any) {
      return { success: false, error: error?.message || "Twitter login failed" };
    }
  }

  static async handleCallbackFromWindow(): Promise<TwitterLoginResult> {
    try {
      const search = new URLSearchParams(window.location.search);
      const code = search.get("code");
      const state = search.get("state") || undefined;
      const error = search.get("error");

      if (error) {
        return { success: false, error };
      }

      if (!code || !state) {
        return { success: false, error: "Missing code/state in callback" };
      }

      // Verify state using state->code_verifier mapping (supports concurrent popups)
      let expectedState: string | null = null;
      let mappedCodeVerifier: string | null = null;
      try {
        expectedState = localStorage.getItem('twitter_oauth_state');
        if (!expectedState && (window as any).opener) {
          expectedState = (window as any).opener.localStorage?.getItem('twitter_oauth_state') || (window as any).opener.__twitterState || null;
        }

        // Load pkce map from current or opener and extract code_verifier by returned state
        const rawMapCurrent = localStorage.getItem('twitter_pkce_map');
        const mapCurrent: Record<string, string> | null = rawMapCurrent ? JSON.parse(rawMapCurrent) : null;
        const rawMapOpener = (window as any).opener?.localStorage?.getItem('twitter_pkce_map');
        const mapOpener: Record<string, string> | null = rawMapOpener ? JSON.parse(rawMapOpener) : null;
        mappedCodeVerifier = (state && (mapCurrent?.[state] || mapOpener?.[state])) || null;
      } catch {}

      // If no mapping, proactively request PKCE from opener FIRST, then fallback to storage
      if (!mappedCodeVerifier && (window as any).opener) {
        try {
          const verifier = await new Promise<string | null>((resolve) => {
            const timeout = setTimeout(() => {
              window.removeEventListener('message', onResponse);
              resolve(null);
            }, 4000);
            function onResponse(ev: MessageEvent) {
              if (ev.data?.type === 'twitter-pkce-response' && ev.data?.state === state) {
                clearTimeout(timeout);
                window.removeEventListener('message', onResponse);
                resolve(ev.data?.verifier || null);
              }
            }
            window.addEventListener('message', onResponse);
            // Request from opener using a permissive target; opener will validate origin
            (window as any).opener.postMessage({ type: 'twitter-pkce-request', state }, '*');
          });
          if (verifier) {
            mappedCodeVerifier = verifier;
          }
        } catch {}
      }

      // Fallback: if still missing, use local storage verifier only when state matches expected
      if (!mappedCodeVerifier) {
        let fallbackVerifier: string | null = null;
        try {
          if (expectedState && expectedState === state) {
            fallbackVerifier = localStorage.getItem('twitter_pkce_verifier') || null;
            if (!fallbackVerifier && (window as any).opener) {
              fallbackVerifier = (window as any).opener.__twitterPkceVerifier || (window as any).opener.localStorage?.getItem('twitter_pkce_verifier') || null;
            }
          }
        } catch {}
        if (!fallbackVerifier) {
          try { console.error('[Twitter] Invalid state: no PKCE mapping or fallback verifier found', { state, expectedState }); } catch {}
          return { success: false, error: "Invalid state parameter" };
        }
        mappedCodeVerifier = fallbackVerifier;
      }

      try { console.log('[Twitter] Callback detected, exchanging code for token...'); } catch {}
      console.log(`[Twitter] About to call exchangeCodeForToken with:`, {
        code: code.substring(0, 10) + '...',
        codeVerifier: mappedCodeVerifier ? mappedCodeVerifier.substring(0, 10) + '...' : 'missing',
        state
      });
      
      const token = await this.exchangeCodeForToken(code, mappedCodeVerifier || undefined);
      
      console.log(`[Twitter] exchangeCodeForToken returned:`, token ? `token (${token.substring(0, 10)}...)` : 'null');
      
      // Clean up state and pkce map entries AFTER token exchange
      try { localStorage.removeItem('twitter_oauth_state'); } catch {}
      try { localStorage.removeItem('twitter_dynamic_user_id'); } catch {}
      try { if ((window as any).opener) (window as any).opener.localStorage?.removeItem('twitter_oauth_state'); } catch {}
      try { if ((window as any).opener) (window as any).opener.localStorage?.removeItem('twitter_dynamic_user_id'); } catch {}
      try { if ((window as any).opener) (window as any).opener.__twitterState = null; } catch {}
      // Do NOT clear parent's __dynamicUserId; Dynamic SDK owns auth state

      try {
        const rawMap = localStorage.getItem('twitter_pkce_map');
        const map: Record<string, string> = rawMap ? JSON.parse(rawMap) : {};
        if (state && map[state]) { delete map[state]; localStorage.setItem('twitter_pkce_map', JSON.stringify(map)); }
      } catch {}
      try {
        const openerRawMap = (window as any).opener?.localStorage?.getItem('twitter_pkce_map');
        const openerMap: Record<string, string> = openerRawMap ? JSON.parse(openerRawMap) : {};
        if (state && openerMap[state]) { delete openerMap[state]; (window as any).opener?.localStorage?.setItem('twitter_pkce_map', JSON.stringify(openerMap)); }
      } catch {}
      
      if (!token) {
        console.error('[Twitter] Token exchange returned null - failing callback');
        return { success: false, error: "Token exchange failed" };
      }

      const user = await this.fetchUserInfo(token);
      const userType = state.includes("_creator_") ? "creator" : state.includes("_fan_") ? "fan" : undefined;

      const result: TwitterLoginResult = {
        success: true,
        accessToken: token,
        user,
        state,
        userType,
      };

      try {
        const dynamicUserId = getDynamicUserId();
        console.log(`[Twitter] Callback - Dynamic user ID check:`, {
          fromWindow: (window as any).__dynamicUserId || null,
          fromStorage: localStorage.getItem("twitter_dynamic_user_id") || null,
          fromOpener: ((window as any).opener && (window as any).opener.__dynamicUserId) || null,
          final: dynamicUserId
        });
        console.log(`[Twitter] Attempting to save connection: dynamicUserId=${dynamicUserId ? 'present' : 'missing'}, user=${user ? 'present' : 'missing'}`);
        if (dynamicUserId && user) {
          const payload = { platform: "twitter", accountData: { user, connectedAt: new Date().toISOString() } };
          console.log(`[Twitter] Saving connection payload:`, payload);
          const connectResult = await fetchApi("/api/social/connect", { method: "POST", body: JSON.stringify(payload) });
          console.log(`[Twitter] Connection save result:`, connectResult);
        } else {
          console.warn(`[Twitter] Cannot save connection: dynamicUserId=${!!dynamicUserId}, user=${!!user}`);
        }
      } catch (connectError) {
        console.error('[Twitter] Failed to save connection, but OAuth succeeded:', connectError);
      }

      return result;
    } catch (error: any) {
      try { console.error('[Twitter] Callback handling error:', error); } catch {}
      return { success: false, error: error?.message || "Callback handling failed" };
    }
  }

  // Track used codes to prevent reuse
  private static usedCodes = new Set<string>();

  static async exchangeCodeForToken(code: string, providedCodeVerifier?: string): Promise<string | null> {
    try {
      const timestamp = new Date().toISOString();
      console.log(`[Twitter] ${timestamp} exchangeCodeForToken called with code: ${code.substring(0, 10)}...`);
      console.log(`[Twitter] providedCodeVerifier: ${providedCodeVerifier ? 'provided' : 'not provided'}`);
      console.trace('[Twitter] exchangeCodeForToken call stack');
      
      // Prevent duplicate use of the same authorization code
      if (TwitterSDKManager.usedCodes.has(code)) {
        console.warn(`[Twitter] Code already used: ${code.substring(0, 10)}... - blocking duplicate call`);
        return null;
      }
      TwitterSDKManager.usedCodes.add(code);
      
      let codeVerifier = providedCodeVerifier || localStorage.getItem("twitter_pkce_verifier") || "";
      if (!codeVerifier) {
        try {
          codeVerifier = (window as any).opener?.__twitterPkceVerifier || '';
        } catch {}
      }
      
      console.log(`[Twitter] Using codeVerifier: ${codeVerifier ? codeVerifier.substring(0, 10) + '...' : 'EMPTY'}`);
      
      const redirectUri = getEnvRedirectUri();
      const dynamicUserId = getDynamicUserId();
      
      console.log(`[Twitter] Request params: redirectUri=${redirectUri}, dynamicUserId=${dynamicUserId ? 'present' : 'missing'}`);
      console.log(`[Twitter] Dynamic user ID sources check:`, {
        fromWindow: (window as any).__dynamicUserId || null,
        fromStorage: localStorage.getItem("twitter_dynamic_user_id") || null,
        fromOpener: ((window as any).opener && (window as any).opener.__dynamicUserId) || null,
        fromOpenerStorage: ((window as any).opener && (window as any).opener.localStorage?.getItem("twitter_dynamic_user_id")) || null,
        final: dynamicUserId
      });

      const data = await fetchApi("/api/social/twitter/token", {
        method: "POST",
        body: JSON.stringify({ code, redirect_uri: redirectUri, code_verifier: codeVerifier, dynamicUserId })
      });

      console.log(`[Twitter] Token exchange API response:`, data);

      // Handle different response structures - the backend may return the token directly or wrapped
      let accessToken: string | undefined;
      let refreshToken: string | undefined;
      
      // Try direct access first (most common case)
      if (data?.access_token) {
        accessToken = data.access_token;
        refreshToken = data.refresh_token;
      }
      // Fallback: check if wrapped in body property
      else if (data?.body?.access_token) {
        accessToken = data.body.access_token;
        refreshToken = data.body.refresh_token;
      }
      
      if (accessToken) {
        console.log(`[Twitter] Successfully received access token: ${accessToken.substring(0, 10)}...`);
        console.log(`[Twitter] Refresh token present: ${!!refreshToken}`);
        return accessToken;
      }
      
      console.error(`[Twitter] No access token in response. Response structure:`, {
        hasDirectToken: !!data?.access_token,
        hasBodyToken: !!data?.body?.access_token,
        responseKeys: data ? Object.keys(data) : [],
        bodyKeys: data?.body ? Object.keys(data.body) : []
      });
      return null;
    } catch (error) {
      console.error("[Twitter] Token exchange error:", error);
      return null;
    } finally {
      // One-time use - clean up
      try { localStorage.removeItem("twitter_pkce_verifier"); } catch {}
      try { if ((window as any).opener) (window as any).opener.__twitterPkceVerifier = null; } catch {}
      // Clean up used codes after 5 minutes to prevent memory leaks
      setTimeout(() => {
        TwitterSDKManager.usedCodes.delete(code);
      }, 5 * 60 * 1000);
    }
  }

  static async fetchUserInfo(accessToken: string): Promise<TwitterUserInfo | undefined> {
    try {
      const dynamicUserId = getDynamicUserId();
      const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` };
      if (dynamicUserId) headers["x-dynamic-user-id"] = dynamicUserId;

      const res = await fetch("/api/social/twitter/user", { headers, credentials: "include" });
      const data = await res.json();
      const u = data?.data;
      if (!u) return undefined;
      return {
        id: u.id,
        username: u.username,
        name: u.name,
        profileImageUrl: u.profile_image_url,
        followersCount: u.public_metrics?.followers_count,
      };
    } catch (error) {
      console.error("[Twitter] Fetch user error:", error);
      return undefined;
    }
  }
}


