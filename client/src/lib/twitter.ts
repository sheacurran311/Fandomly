/* eslint-disable @typescript-eslint/no-explicit-any, no-empty */
/**
 * ⛔ SINGLE SOURCE OF TRUTH — Twitter/X OAuth
 * See rule: .cursor/rules/social-auth-single-source.mdc
 *
 * TwitterSDKManager is the ONLY place where Twitter OAuth config (client ID,
 * scopes, PKCE, redirect URI, popup flow) should be defined. All UI layers
 * must import and call TwitterSDKManager.secureLogin(). NEVER duplicate
 * this logic elsewhere.
 */
import { fetchApi } from '@/lib/queryClient';

type UserType = 'creator' | 'fan' | string; // 'string' allows 'auth' and other neutral values

// Module-level guards to prevent duplicate flows
let twitterLoginInFlight = false;
let twitterPopup: Window | null = null;
let _lastAuthUrlBuild = 0;

export interface TwitterUserInfo {
  id: string;
  username: string;
  name: string;
  profileImageUrl?: string;
  followersCount?: number;
  followingCount?: number;
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
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generateRandomString(length: number = 64): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const result: string[] = [];
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result.push(charset[randomValues[i] % charset.length]);
  }
  return result.join('');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(digest);
}

function getEnvRedirectUri(): string {
  const fromEnv = import.meta.env.VITE_TWITTER_REDIRECT_URI as string | undefined;
  const fallback = `${window.location.origin}/x-callback`;
  // Do not swap origins silently; prefer explicit env when present
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  return fallback;
}

function getEnvScopes(): string {
  const fromEnv = import.meta.env.VITE_TWITTER_SCOPES as string | undefined;
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv.trim();
  // Required scopes for all Twitter verification tasks:
  // - users.read: Read user profiles
  // - tweet.read: Read tweets for content verification
  // - tweet.write: For future write operations
  // - follows.read: Verify follow relationships (GET /2/users/{id}/following)
  // - like.read: Verify likes (GET /2/users/{id}/liked_tweets)
  // - offline.access: Get refresh tokens for long-lived access
  return 'users.read tweet.read tweet.write follows.read like.read offline.access';
}

function getClientId(): string {
  const clientId = import.meta.env.VITE_TWITTER_CLIENT_ID as string | undefined;
  if (!clientId) throw new Error('VITE_TWITTER_CLIENT_ID is not set');
  return clientId;
}

export class TwitterSDKManager {
  static async getAuthUrl(
    userType: UserType,
    state?: string,
    forcedRedirectUri?: string
  ): Promise<string> {
    // Prevent duplicate calls within 200ms
    const now = Date.now();
    if (now - _lastAuthUrlBuild < 200) {
      await new Promise((r) => setTimeout(r, 220));
    }
    _lastAuthUrlBuild = Date.now();

    const clientId = getClientId();
    const redirectUri = forcedRedirectUri || getEnvRedirectUri();
    const scope = getEnvScopes();

    // 1) Create verifier & challenge for PKCE
    const verifier = generateRandomString(64);
    const challenge = await generateCodeChallenge(verifier);

    // 2) Persist verifier keyed by state (10-15 min TTL)
    const st = state || `twitter_${userType}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const map = JSON.parse(sessionStorage.getItem('twitter_pkce_map') || '{}');
    map[st] = { verifier, ts: Date.now(), userType };
    sessionStorage.setItem('twitter_pkce_map', JSON.stringify(map));
    sessionStorage.setItem('twitter_oauth_state', st);

    const params = new URLSearchParams();
    params.set('response_type', 'code');
    params.set('client_id', clientId);
    params.set('redirect_uri', redirectUri);
    params.set('scope', scope);
    params.set('state', st);
    params.set('code_challenge', challenge);
    params.set('code_challenge_method', 'S256');

    // Force %20 encoding for spaces instead of + (Twitter prefers this)
    const url = `https://twitter.com/i/oauth2/authorize?${params.toString().replace(/\+/g, '%20')}`;
    try {
      console.log(
        '[Twitter] CLIENT_ID fingerprint:',
        clientId.slice(0, 6),
        '...',
        clientId.slice(-6)
      );
      console.log('[Twitter] FINAL redirectUri:', redirectUri);
      console.log('[Twitter] FINAL authorize URL:', url);
    } catch {}
    return url;
  }

  static async secureLogin(userType: UserType): Promise<TwitterLoginResult> {
    if (twitterLoginInFlight) {
      return { success: false, error: 'Twitter auth already in progress' };
    }
    twitterLoginInFlight = true;

    try {
      // Clear any stale state first
      try {
        sessionStorage.removeItem('twitter_oauth_state');
        sessionStorage.removeItem('twitter_pkce_verifier');
        const rawMap = sessionStorage.getItem('twitter_pkce_map');
        if (rawMap) {
          const map = JSON.parse(rawMap);
          // Clear entries older than 10 minutes
          const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
          Object.keys(map).forEach((key) => {
            const timestamp = parseInt(key.split('_')[2]) || 0;
            if (timestamp < tenMinutesAgo) delete map[key];
          });
          sessionStorage.setItem('twitter_pkce_map', JSON.stringify(map));
        }
      } catch {}

      const stateValue = `twitter_${userType}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem('twitter_oauth_state', stateValue);
      try {
        (window as any).__twitterState = stateValue;
      } catch {}

      console.log(`[Twitter] Starting OAuth with state: ${stateValue}`);

      const redirectUri = getEnvRedirectUri();
      console.log('[Twitter] Using redirectUri:', redirectUri);
      const authUrl = await this.getAuthUrl(userType, stateValue, redirectUri);

      return new Promise<TwitterLoginResult>((resolve) => {
        try {
          twitterPopup?.close();
        } catch {}
        twitterPopup = window.open(
          authUrl,
          'twitter-oauth',
          'width=600,height=700,scrollbars=yes,resizable=yes'
        );
        if (!twitterPopup) {
          twitterLoginInFlight = false;
          resolve({ success: false, error: 'Popup blocked. Please allow popups and try again.' });
          return;
        }

        let settled = false;
        const cleanup = () => {
          try {
            window.removeEventListener('message', onMsg);
          } catch {}
          try {
            twitterPopup?.close();
          } catch {}
          twitterPopup = null;
          twitterLoginInFlight = false;
        };

        const onMsg = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          if (event.data?.type === 'twitter-pkce-request') {
            try {
              const reqState = event.data?.state as string | undefined;
              let verifier: string | null = null;
              try {
                const rawMap = sessionStorage.getItem('twitter_pkce_map');
                const map: Record<string, any> = rawMap ? JSON.parse(rawMap) : {};
                verifier = (reqState && map[reqState]?.verifier) || null;
              } catch {}
              (event.source as Window | null)?.postMessage(
                { type: 'twitter-pkce-response', state: reqState, verifier },
                '*'
              );
            } catch {}
            return;
          }
          if (event.data?.type !== 'twitter-oauth-result') return;
          if (settled) return;
          settled = true;
          cleanup();
          resolve(event.data.result as TwitterLoginResult);
        };
        window.addEventListener('message', onMsg);

        const poll = setInterval(() => {
          try {
            if (!twitterPopup || twitterPopup.closed) {
              clearInterval(poll);
              if (!settled) {
                settled = true;
                cleanup();

                // Check window callback data first
                const cb = (window as any).twitterCallbackData as TwitterLoginResult | undefined;
                if (cb) {
                  delete (window as any).twitterCallbackData;
                  resolve(cb);
                  return;
                }

                // Check localStorage as COOP fallback (Cross-Origin-Opener-Policy can null window.opener)
                try {
                  const lsKey = `twitter_oauth_result_${stateValue}`;
                  const lsResult = localStorage.getItem(lsKey);
                  if (lsResult) {
                    localStorage.removeItem(lsKey);
                    const parsed = JSON.parse(lsResult) as TwitterLoginResult;
                    console.log(
                      '[Twitter] Found result in localStorage (COOP fallback):',
                      parsed.success
                    );
                    resolve(parsed);
                    return;
                  }
                } catch (e) {
                  console.error('[Twitter] Error reading localStorage fallback:', e);
                }

                resolve({ success: false, error: 'Twitter authorization was cancelled or failed' });
              }
            }
          } catch {}
        }, 600);
      });
    } catch (e: any) {
      twitterLoginInFlight = false;
      return { success: false, error: e?.message || 'Twitter login failed' };
    }
  }

  static async handleCallbackFromWindow(): Promise<TwitterLoginResult> {
    try {
      const search = new URLSearchParams(window.location.search);
      const code = search.get('code');
      const state = search.get('state') || undefined;
      const error = search.get('error');

      if (error) {
        return { success: false, error };
      }

      if (!code || !state) {
        return { success: false, error: 'Missing code/state in callback' };
      }

      // Idempotency lock per state to prevent double processing
      const cbLockKey = state ? `tw_cb_lock_${state}` : undefined;
      if (cbLockKey && sessionStorage.getItem(cbLockKey)) {
        console.warn('[Twitter] Duplicate callback run blocked');
        // Try to reuse previously stored successful result if available
        try {
          if (state) {
            const prev = sessionStorage.getItem(`tw_cb_result_${state}`);
            if (prev) {
              return JSON.parse(prev) as TwitterLoginResult;
            }
          }
        } catch {}
        try {
          const openerResult = (window as any).opener?.twitterCallbackData as
            | TwitterLoginResult
            | undefined;
          if (openerResult) return openerResult;
        } catch {}
        return { success: false, error: 'Callback already processed' };
      }
      if (cbLockKey) sessionStorage.setItem(cbLockKey, '1');

      // Get PKCE verifier from state mapping (try multiple sources)
      const st = state!;
      let verifier: string | null = null;

      // Try current window localStorage first
      try {
        const pkceMap = JSON.parse(sessionStorage.getItem('twitter_pkce_map') || '{}');
        verifier = pkceMap?.[st]?.verifier || null;
      } catch {}

      // Try opener window localStorage if not found
      if (!verifier && (window as any).opener) {
        try {
          const openerPkceMap = JSON.parse(
            (window as any).opener.sessionStorage?.getItem('twitter_pkce_map') || '{}'
          );
          verifier = openerPkceMap?.[st]?.verifier || null;
        } catch {}
      }

      // Try requesting verifier from opener via postMessage
      if (!verifier && (window as any).opener) {
        try {
          verifier = await new Promise<string | null>((resolve) => {
            const timeout = setTimeout(() => {
              window.removeEventListener('message', onResponse);
              resolve(null);
            }, 8000);
            function onResponse(ev: MessageEvent) {
              if (ev.data?.type === 'twitter-pkce-response' && ev.data?.state === st) {
                clearTimeout(timeout);
                window.removeEventListener('message', onResponse);
                resolve(ev.data?.verifier || null);
              }
            }
            window.addEventListener('message', onResponse);
            (window as any).opener.postMessage({ type: 'twitter-pkce-request', state: st }, '*');
          });
        } catch {}
      }

      if (!verifier) {
        try {
          console.error('[Twitter] Missing PKCE verifier for state:', st, 'tried all sources');
        } catch {}
        return { success: false, error: 'Missing PKCE verifier' };
      }

      try {
        console.log('[Twitter] Callback detected, exchanging code for token...');
      } catch {}
      console.log(`[Twitter] About to call exchangeCodeForToken with:`, {
        code: code.substring(0, 10) + '...',
        state,
        hasVerifier: !!verifier,
      });

      const tokenResult = await this.exchangeCodeForToken(code, verifier);

      console.log(
        `[Twitter] exchangeCodeForToken returned:`,
        tokenResult ? `token (${tokenResult.accessToken.substring(0, 10)}...)` : 'null'
      );

      // Clean up state and pkce map entries AFTER token exchange success
      try {
        sessionStorage.removeItem('twitter_oauth_state');
      } catch {}
      try {
        if ((window as any).opener)
          (window as any).opener.sessionStorage?.removeItem('twitter_oauth_state');
      } catch {}
      try {
        if ((window as any).opener) (window as any).opener.__twitterState = null;
      } catch {}

      // Clean up PKCE mapping after exchange
      try {
        const rawMap = sessionStorage.getItem('twitter_pkce_map');
        const map: Record<string, any> = rawMap ? JSON.parse(rawMap) : {};
        if (state && map[state]) {
          delete map[state];
          sessionStorage.setItem('twitter_pkce_map', JSON.stringify(map));
        }
      } catch {}
      try {
        const openerRawMap = (window as any).opener?.localStorage?.getItem('twitter_pkce_map');
        const openerMap: Record<string, any> = openerRawMap ? JSON.parse(openerRawMap) : {};
        if (state && openerMap[state]) {
          delete openerMap[state];
          (window as any).opener?.localStorage?.setItem(
            'twitter_pkce_map',
            JSON.stringify(openerMap)
          );
        }
      } catch {}

      // No PKCE mapping to clear for confidential clients

      if (!tokenResult) {
        console.error('[Twitter] Token exchange returned null - failing callback');
        return { success: false, error: 'Token exchange failed' };
      }

      const { accessToken, refreshToken } = tokenResult;
      const user = await this.fetchUserInfo(accessToken);
      const userType = state.includes('_creator_')
        ? 'creator'
        : state.includes('_fan_')
          ? 'fan'
          : undefined;

      const result: TwitterLoginResult = {
        success: true,
        accessToken,
        refreshToken,
        user,
        state,
        userType,
      };

      // Persist result for reuse if a second callback run occurs
      try {
        if (state) sessionStorage.setItem(`tw_cb_result_${state}`, JSON.stringify(result));
      } catch {}

      // Save connection via the authenticated endpoint (supports cookie auth)
      if (user) {
        try {
          console.log(`[Twitter] Saving connection via /api/social-connections...`);
          const savePayload = {
            platform: 'twitter',
            platformUserId: user.id,
            platformUsername: user.username,
            platformDisplayName: user.name,
            accessToken,
            refreshToken,
            profileData: {
              profileImageUrl: user.profileImageUrl,
              followersCount: user.followersCount,
              followingCount: user.followingCount,
            },
          };
          const saveRes = await fetch('/api/social-connections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(savePayload),
          });
          if (saveRes.ok) {
            const saveData = await saveRes.json();
            console.log(`[Twitter] Connection saved successfully:`, saveData);
          } else {
            const errText = await saveRes.text();
            console.warn(
              `[Twitter] Connection save via /api/social-connections failed (${saveRes.status}):`,
              errText
            );
          }
        } catch (connectError) {
          console.error('[Twitter] Failed to save connection, but OAuth succeeded:', connectError);
        }
      } else {
        console.warn(`[Twitter] Cannot save connection: no user info available`);
      }

      return result;
    } catch (error: any) {
      try {
        console.error('[Twitter] Callback handling error:', error);
      } catch {}
      return { success: false, error: error?.message || 'Callback handling failed' };
    }
  }

  // Track used codes to prevent reuse
  private static usedCodes = new Set<string>();

  static async exchangeCodeForToken(
    code: string,
    codeVerifier: string
  ): Promise<{ accessToken: string; refreshToken?: string } | null> {
    const lockKey = `tw_code_lock_${code.slice(0, 24)}`;
    if (sessionStorage.getItem(lockKey)) {
      console.warn('[Twitter] Duplicate code exchange blocked by session lock');
      return null;
    }
    sessionStorage.setItem(lockKey, '1');

    try {
      const redirectUri = getEnvRedirectUri();

      const data: { access_token?: string; refresh_token?: string } = await fetchApi(
        '/api/social/twitter/token',
        {
          method: 'POST',
          body: JSON.stringify({ code, redirect_uri: redirectUri, code_verifier: codeVerifier }),
        }
      );

      if (!data?.access_token) return null;

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
      };
    } catch (e) {
      console.error('[Twitter] Token exchange error:', e);
      return null;
    }
  }

  static async fetchUserInfo(accessToken: string): Promise<TwitterUserInfo | undefined> {
    try {
      const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` };

      const res = await fetch('/api/social/twitter/user', { headers, credentials: 'include' });
      const data = await res.json();
      const u = data?.data;
      if (!u) return undefined;
      return {
        id: u.id,
        username: u.username,
        name: u.name,
        profileImageUrl: u.profile_image_url,
        followersCount: u.public_metrics?.followers_count,
        followingCount: u.public_metrics?.following_count,
      };
    } catch (error) {
      console.error('[Twitter] Fetch user error:', error);
      return undefined;
    }
  }
}
