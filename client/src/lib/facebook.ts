/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ⛔ SINGLE SOURCE OF TRUTH — Facebook / Instagram OAuth
 * See rule: .cursor/rules/social-auth-single-source.mdc
 *
 * FacebookSDKManager is the ONLY place where Facebook/Instagram OAuth config
 * (app IDs, scopes, SDK loading, login flow) should be defined. All UI layers
 * must import and call FacebookSDKManager.secureLogin(). NEVER duplicate
 * this logic elsewhere.
 */

declare global {
  interface Window {
    FB: {
      init: (config: { appId: string; xfbml: boolean; version: string }) => void;
      AppEvents: {
        logPageView: () => void;
      };
      api: (path: string, method: string, params: any, callback: (response: any) => void) => void;
      login: (
        callback: (response: {
          status: string;
          authResponse?: {
            accessToken: string;
            userID: string;
            expiresIn: number;
          };
        }) => void,
        options?: { scope: string }
      ) => void;
      logout: (callback: () => void) => void;
      getLoginStatus: (
        callback: (response: {
          status: string;
          authResponse?: {
            accessToken: string;
            userID: string;
            expiresIn: number;
          };
        }) => void
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

export interface FacebookUser {
  id: string;
  name: string;
  email?: string;
  picture?: {
    data: {
      url: string;
    };
  };
}

export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  category: string;
  followers_count?: number;
  fan_count?: number;
  engagement_data?: any;
  picture?: { data?: { url?: string } };
}

export interface FacebookLoginResult {
  success: boolean;
  accessToken?: string;
  user?: FacebookUser;
  grantedScopes?: string[];
  deniedScopes?: string[];
  error?: string;
  errorCode?: string;
}

export type UserType = 'fan' | 'creator' | string; // 'string' allows 'auth' and other neutral values

// App ID configuration
const FB_APP_CONFIG = {
  fan: {
    appId: '4233782626946744', // Fan App ID
    requiredScopes: ['public_profile', 'email'],
  },
  creator: {
    appId: '1665384740795979', // Creator App ID for business page access
    requiredScopes: [
      'public_profile',
      'email',
      'pages_show_list',
      'business_management',
      'pages_read_engagement',
    ],
  },
};

const FB_API_VERSION = 'v24.0';

class FacebookSDKManager {
  private static currentAppId: string | null = null;
  private static isInitialized = false;
  private static initPromise: Promise<void> | null = null;
  private static reinitInProgress = false;

  /**
   * Centralized Facebook SDK ready function
   * Ensures FB SDK is loaded and initialized with correct App ID for user type
   */
  static async ensureFBReady(userType: UserType): Promise<void> {
    const configKey = (userType === 'creator' ? 'creator' : 'fan') as keyof typeof FB_APP_CONFIG;
    const config = FB_APP_CONFIG[configKey];
    const requiredAppId = config.appId;

    console.log(
      `[FB Manager] Ensuring FB ready for ${userType} with App ID: ${requiredAppId.substring(0, 6)}...`
    );

    // Fast path: SDK already loaded and initialized with correct App ID
    if (window.FB && this.isInitialized && this.currentAppId === requiredAppId) {
      console.log('[FB Manager] Already initialized with correct App ID');
      return;
    }

    // SDK loaded but not by us - adopt it
    if (window.FB && !this.isInitialized) {
      console.log('[FB Manager] Adopting SDK already loaded by index.html');
      this.finalizeInitialization(requiredAppId);
      return;
    }

    // SDK loaded but with different App ID - reinitialize
    if (window.FB && this.currentAppId && this.currentAppId !== requiredAppId) {
      console.log(
        `[FB Manager] App ID change detected (${this.currentAppId?.substring(0, 6)} -> ${requiredAppId.substring(0, 6)}), reinitializing...`
      );
      await this.reinitializeSDK(requiredAppId);
      return;
    }

    // Wait for existing initialization if in progress
    if (this.initPromise) {
      console.log('[FB Manager] Waiting for existing initialization...');
      await this.initPromise;

      // Check if successful
      if (window.FB && this.isInitialized) {
        // May need to switch App ID
        if (this.currentAppId !== requiredAppId) {
          await this.reinitializeSDK(requiredAppId);
        }
        return;
      }
    }

    // Start new initialization
    console.log('[FB Manager] Starting new initialization...');
    this.initPromise = this.initializeSDK(requiredAppId);
    await this.initPromise;
  }

  private static async initializeSDK(appId: string): Promise<void> {
    return new Promise((resolve) => {
      // DEBUG: Log all relevant state at start
      console.log(`[FB Manager] Initializing SDK with App ID: ${appId.substring(0, 6)}...`, {
        windowFB: typeof window.FB,
        fbAsyncInitExists: typeof window.fbAsyncInit,
        fbCurrentAppId: (window as any).__FB_CURRENT_APP_ID__,
        fbDefaults: (window as any).__FB_DEFAULTS__,
      });

      // Check if Facebook SDK URL is reachable (helps debug blocking issues)
      fetch('https://connect.facebook.net/en_US/sdk.js', { mode: 'no-cors' })
        .then(() => console.log('[FB Manager] SDK URL is reachable'))
        .catch((e) => console.error('[FB Manager] SDK URL fetch failed:', e));

      // Check if FB is already available (loaded by index.html)
      if (window.FB) {
        console.log('[FB Manager] FB SDK already available, initializing...', {
          fbMethods: Object.keys(window.FB || {}),
        });
        this.finalizeInitialization(appId);
        resolve();
        return;
      }

      const scriptEl = document.getElementById('facebook-jssdk') as HTMLScriptElement | null;
      const scriptExists = !!scriptEl;

      console.log('[FB Manager] Script check:', {
        scriptExists,
        scriptSrc: scriptEl?.src,
        scriptReadyState: (scriptEl as any)?.readyState,
      });

      if (scriptExists) {
        // Script tag exists - SDK was loaded by index.html but may not be ready yet
        // Check if fbAsyncInit already ran (indicated by window.__FB_CURRENT_APP_ID__)
        if ((window as any).__FB_CURRENT_APP_ID__) {
          console.log('[FB Manager] fbAsyncInit already ran:', {
            currentAppId: (window as any).__FB_CURRENT_APP_ID__,
            windowFB: typeof window.FB,
          });
          // FB object should exist if fbAsyncInit ran
          if (window.FB) {
            this.finalizeInitialization(appId);
            resolve();
            return;
          }
        }

        // Check if FB is already available now
        if (window.FB) {
          console.log('[FB Manager] FB already available');
          this.finalizeInitialization(appId);
          resolve();
          return;
        }

        // Hook into script load/error events if it hasn't loaded yet
        if (scriptEl) {
          console.log('[FB Manager] Script element found:', {
            src: scriptEl.src,
            readyState: (scriptEl as any).readyState,
            complete: (scriptEl as any).complete,
          });

          // Add onload handler if script hasn't loaded yet
          const originalOnload = scriptEl.onload;
          scriptEl.onload = (e) => {
            console.log('[FB Manager] Script onload fired', {
              windowFB: typeof window.FB,
              fbCurrentAppId: (window as any).__FB_CURRENT_APP_ID__,
            });
            if (originalOnload) (originalOnload as any).call(scriptEl, e);
            setTimeout(() => {
              if (window.FB) {
                this.finalizeInitialization(appId);
                resolve();
              }
            }, 100);
          };

          // Add onerror handler
          const originalOnerror = scriptEl.onerror;
          scriptEl.onerror = (e) => {
            console.error('[FB Manager] Script load error:', e);
            if (originalOnerror) (originalOnerror as any).call(scriptEl, e);
          };
        }

        // Poll for window.FB to become available
        console.log('[FB Manager] Script exists, polling for FB to become available...');
        let pollCount = 0;
        const maxPolls = 50; // 5 seconds max (50 * 100ms)

        const checkInterval = setInterval(() => {
          pollCount++;
          if (window.FB) {
            clearInterval(checkInterval);
            console.log(`[FB Manager] FB became available after ${pollCount * 100}ms`, {
              fbMethods: Object.keys(window.FB || {}),
            });
            this.finalizeInitialization(appId);
            resolve();
          } else if (pollCount >= maxPolls) {
            clearInterval(checkInterval);
            console.error(
              '[FB Manager] FB SDK never became available after 5 seconds, attempting reload...',
              {
                scriptSrc: scriptEl?.src,
                fbAsyncInitRan: !!(window as any).__FB_CURRENT_APP_ID__,
                windowFB: typeof window.FB,
              }
            );

            // Remove the existing script and try loading fresh
            if (scriptEl && scriptEl.parentNode) {
              scriptEl.parentNode.removeChild(scriptEl);
              console.log('[FB Manager] Removed old script, loading fresh...');
            }

            // Set up our own fbAsyncInit
            window.fbAsyncInit = () => {
              console.log('[FB Manager] fbAsyncInit callback fired (reload attempt)');
              this.finalizeInitialization(appId);
              resolve();
            };

            // Create and insert new script
            const newScript = document.createElement('script');
            newScript.id = 'facebook-jssdk';
            newScript.src = 'https://connect.facebook.net/en_US/sdk.js';
            newScript.async = true;
            newScript.crossOrigin = 'anonymous';
            newScript.onload = () => {
              console.log('[FB Manager] Fresh script loaded, FB:', typeof window.FB);
            };
            newScript.onerror = (e) => {
              console.error('[FB Manager] Fresh script failed to load:', e);
              this.initPromise = null;
              resolve();
            };
            document.head.appendChild(newScript);

            // Give the reload attempt another 5 seconds
            setTimeout(() => {
              if (!window.FB) {
                console.error(
                  '[FB Manager] SDK reload also failed - script may be blocked by ad blocker or network'
                );
                this.initPromise = null;
                resolve();
              }
            }, 5000);
          }
        }, 100);
      } else {
        // No script tag - we need to load the SDK ourselves
        console.log('[FB Manager] Loading FB SDK script...');

        window.fbAsyncInit = () => {
          console.log('[FB Manager] fbAsyncInit callback fired');
          this.finalizeInitialization(appId);
          resolve();
        };

        const script = document.createElement('script');
        script.id = 'facebook-jssdk';
        script.src = 'https://connect.facebook.net/en_US/sdk.js';
        script.async = true;
        script.defer = true;
        script.onerror = () => {
          console.error('[FB Manager] Failed to load Facebook SDK script');
          this.initPromise = null;
          resolve();
        };
        document.head.appendChild(script);
      }
    });
  }

  private static async reinitializeSDK(newAppId: string): Promise<void> {
    this.reinitInProgress = true;
    console.log(`[FB Manager] Reinitializing with new App ID: ${newAppId.substring(0, 6)}...`);

    // Reset state
    this.isInitialized = false;
    this.initPromise = null;

    window.FB.init({
      appId: newAppId,
      cookie: true,
      xfbml: true,
      version: FB_API_VERSION,
      status: true,
    } as any);

    // Update the global tracker
    (window as any).__FB_CURRENT_APP_ID__ = newAppId;

    this.currentAppId = newAppId;
    this.isInitialized = true;
    this.reinitInProgress = false;

    // Small delay to ensure reinitialization is complete
    await new Promise((resolve) => setTimeout(resolve, 100));
    console.log(`[FB Manager] Reinitialization complete with App ID: ${newAppId.substring(0, 6)}`);
  }

  private static finalizeInitialization(appId: string): void {
    // Check what App ID was previously initialized (by index.html)
    const previousAppId = (window as any).__FB_CURRENT_APP_ID__;
    console.log(
      `[FB Manager] finalizeInitialization - previous: ${previousAppId?.substring(0, 6)}, new: ${appId.substring(0, 6)}`
    );

    window.FB.init({
      appId: appId,
      cookie: true,
      xfbml: true,
      version: FB_API_VERSION,
      status: true,
    } as any);

    // Update the global tracker
    (window as any).__FB_CURRENT_APP_ID__ = appId;

    window.FB.AppEvents.logPageView();

    this.currentAppId = appId;
    this.isInitialized = true;
    this.initPromise = null;

    console.log(`[FB Manager] SDK initialized successfully with App ID: ${appId.substring(0, 6)}`);
  }

  /**
   * Logout from Facebook and clear current session
   * Should be called when switching between user types to prevent App ID conflicts
   */
  static async logoutFromFacebook(): Promise<void> {
    return new Promise((resolve) => {
      if (!window.FB) {
        console.log('[FB Manager] No FB SDK loaded, logout not needed');
        resolve();
        return;
      }

      console.log('[FB Manager] Logging out from Facebook...');

      window.FB.logout(() => {
        console.log('[FB Manager] Facebook logout completed');

        // Clear our internal state
        this.currentAppId = null;
        this.isInitialized = false;
        this.initPromise = null;
        this.reinitInProgress = false;

        resolve();
      });
    });
  }

  /**
   * Secure login with permissions verification
   */
  static async secureLogin(userType: UserType): Promise<FacebookLoginResult> {
    await this.ensureFBReady(userType);

    // Verify SDK is actually ready
    if (!window.FB) {
      console.error('[FB Manager] SDK not available after ensureFBReady');
      return {
        success: false,
        error: 'Facebook SDK failed to load. Please refresh the page and try again.',
        errorCode: 'SDK_NOT_LOADED',
      };
    }

    const configKey = (userType === 'creator' ? 'creator' : 'fan') as keyof typeof FB_APP_CONFIG;
    const config = FB_APP_CONFIG[configKey];
    const scope = config.requiredScopes.join(',');

    console.log(`[FB Manager] Starting secure login for ${userType}`);

    return new Promise((resolve) => {
      console.log(`[FB Manager] Calling FB.login with scope: ${scope}`);

      try {
        window.FB.login(
          (response) => {
            console.log(`[FB Manager] Login completed with status: ${response.status}`, {
              hasAuthResponse: !!response.authResponse,
              errorReason: (response as any).error_reason,
              errorDescription: (response as any).error_description,
            });

            if (response.status === 'connected' && response.authResponse) {
              this.handleSuccessfulLogin(
                response,
                response.authResponse.accessToken,
                config.requiredScopes,
                resolve
              );
            } else if (response.status === 'unknown') {
              // 'unknown' typically means popup was closed or blocked
              resolve({
                success: false,
                error:
                  'Login was cancelled or popup was blocked. Please allow popups for this site and try again.',
                errorCode: 'POPUP_CLOSED',
              });
            } else if (response.status === 'not_authorized') {
              resolve({
                success: false,
                error: 'You need to authorize the app to continue.',
                errorCode: 'NOT_AUTHORIZED',
              });
            } else {
              resolve({
                success: false,
                error: `Login failed with status: ${response.status}`,
                errorCode: response.status || 'UNKNOWN_ERROR',
              });
            }
          },
          {
            scope,
            return_scopes: true as any,
            auth_type: 'rerequest',
          } as any
        );
      } catch (err) {
        console.error('[FB Manager] FB.login threw an error:', err);
        resolve({
          success: false,
          error: 'Failed to open Facebook login. Please try again.',
          errorCode: 'LOGIN_EXCEPTION',
        });
      }
    });
  }

  private static handleSuccessfulLogin(
    response: any,
    accessToken: string,
    requiredScopes: string[],
    resolve: (result: FacebookLoginResult) => void
  ): void {
    // Get user info and verify permissions
    window.FB.api(
      '/me',
      'GET',
      {
        fields: 'id,name,email,picture.width(200).height(200)',
      },
      (userResponse) => {
        if (userResponse && !userResponse.error) {
          // Verify permissions
          window.FB.api('/me/permissions', 'GET', {}, async (permResponse) => {
            const result = await this.processPermissions(
              userResponse,
              accessToken,
              permResponse,
              requiredScopes
            );
            resolve(result);
          });
        } else {
          console.error(
            '[FB Manager] Failed to get user info:',
            userResponse?.error?.message || 'Unknown error'
          );
          resolve({
            success: false,
            error: 'Failed to get user information',
            errorCode: 'USER_INFO_ERROR',
          });
        }
      }
    );
  }

  private static async processPermissions(
    userResponse: any,
    accessToken: string,
    permResponse: any,
    requiredScopes: string[]
  ): Promise<FacebookLoginResult> {
    const grantedScopes: string[] = [];
    const deniedScopes: string[] = [];

    if (permResponse && permResponse.data) {
      permResponse.data.forEach((perm: any) => {
        if (perm.status === 'granted') {
          grantedScopes.push(perm.permission);
        } else {
          deniedScopes.push(perm.permission);
        }
      });
    }

    // Check if all required scopes are granted
    const missingScopes = requiredScopes.filter((scope) => !grantedScopes.includes(scope));

    if (missingScopes.length > 0) {
      console.warn('[FB Manager] Missing required permissions:', missingScopes);
    }

    // Save connection to database using cookie-based auth
    try {
      const { saveSocialConnection } = await import('./auth-redirect');
      console.log('[FB Manager] Saving connection to database...');

      // Try to get user's Facebook pages if they have page permissions
      let pages: any[] = [];
      try {
        await new Promise<void>((resolve) => {
          window.FB.api(
            '/me/accounts',
            'GET',
            { fields: 'id,name,access_token' },
            (pagesResponse) => {
              if (pagesResponse && !pagesResponse.error && pagesResponse.data) {
                pages = pagesResponse.data;
                console.log(`[FB Manager] Found ${pages.length} Facebook pages`);
              }
              resolve();
            }
          );
        });
      } catch {
        console.log('[FB Manager] Could not fetch pages (user may not have page permissions)');
      }

      const saveResult = await saveSocialConnection({
        platform: 'facebook',
        platformUserId: userResponse.id,
        platformUsername: userResponse.name,
        platformDisplayName: userResponse.name,
        accessToken,
        profileData: {
          id: userResponse.id,
          name: userResponse.name,
          email: userResponse.email,
          picture: userResponse.picture,
          pages: pages,
        },
      });

      if (saveResult.success) {
        console.log('[FB Manager] Connection saved successfully');
      } else {
        console.warn('[FB Manager] Failed to save connection:', saveResult.error);
      }
    } catch (error) {
      console.error('[FB Manager] Error saving connection:', error);
    }

    return {
      success: true,
      accessToken,
      user: {
        id: userResponse.id,
        name: userResponse.name,
        email: userResponse.email,
        picture: userResponse.picture,
      },
      grantedScopes,
      deniedScopes,
    };
  }

  /**
   * Get user pages with error handling
   */
  static async getUserPages(_accessToken?: string): Promise<FacebookPage[]> {
    if (!window.FB || !this.isInitialized) {
      console.error('[FB Manager] SDK not initialized for getUserPages');
      return [];
    }

    return new Promise((resolve) => {
      window.FB.api(
        '/me/accounts',
        'GET',
        {
          fields:
            'id,name,access_token,category,followers_count,fan_count,instagram_business_account',
        },
        (response: any) => {
          if (response && response.data && !response.error) {
            console.log(`[FB Manager] Successfully loaded ${response.data.length} pages`);
            resolve(response.data as FacebookPage[]);
          } else {
            const errorMsg = response?.error?.message || 'Unknown error';
            console.error('[FB Manager] Failed to load pages:', errorMsg);
            resolve([]);
          }
        }
      );
    });
  }

  /**
   * Get login status without sensitive logging
   */
  static async getLoginStatus(): Promise<{
    isLoggedIn: boolean;
    userID?: string;
    status?: string;
    accessToken?: string;
  }> {
    if (!window.FB || !this.isInitialized) {
      return { isLoggedIn: false, status: 'sdk_not_ready' };
    }

    return new Promise((resolve) => {
      window.FB.getLoginStatus((response) => {
        // Security: Only log status, never tokens
        console.log(`[FB Manager] Login status check: ${response.status}`);

        if (response.status === 'connected' && response.authResponse) {
          resolve({
            isLoggedIn: true,
            userID: response.authResponse.userID,
            status: response.status,
            accessToken: response.authResponse.accessToken,
          });
        } else {
          resolve({
            isLoggedIn: false,
            status: response.status,
          });
        }
      });
    });
  }

  /**
   * Secure logout
   */
  static async secureLogout(): Promise<void> {
    if (!window.FB || !this.isInitialized) {
      return;
    }

    return new Promise((resolve) => {
      console.log('[FB Manager] Logging out user');
      window.FB.logout(() => {
        console.log('[FB Manager] User logged out successfully');
        resolve();
      });
    });
  }

  /**
   * Back-compat: Simple login with arbitrary scopes.
   * Returns a shape expected by existing contexts: { success, accessToken, userID, status }
   */
  static async login(
    scopes: string
  ): Promise<{ success: boolean; accessToken?: string; userID?: string; status?: string }> {
    // Default to fan app for simple login unless already initialized
    if (!this.isInitialized) {
      await this.ensureFBReady('fan');
    }

    // Verify SDK is actually ready
    if (!window.FB) {
      console.error('[FB Manager] SDK not available for login');
      return { success: false, status: 'sdk_not_loaded' };
    }

    return new Promise((resolve) => {
      window.FB.login(
        (response) => {
          console.log('[FB Manager] login() status:', response?.status);
          if (response?.status === 'connected' && response.authResponse) {
            resolve({
              success: true,
              accessToken: response.authResponse.accessToken,
              userID: response.authResponse.userID,
              status: response.status,
            });
          } else {
            resolve({ success: false, status: response?.status });
          }
        },
        { scope: scopes }
      );
    });
  }

  /**
   * Back-compat: logout alias expected by some contexts
   */
  static async logout(): Promise<void> {
    return this.secureLogout();
  }

  /**
   * Back-compat: get basic user info
   */
  static async getUserInfo(_accessToken?: string): Promise<FacebookUser | null> {
    if (!window.FB || !this.isInitialized) {
      return null;
    }
    return new Promise((resolve) => {
      window.FB.api(
        '/me',
        'GET',
        { fields: 'id,name,email,picture.width(200).height(200)' },
        (response: any) => {
          if (response && !response.error) {
            resolve({
              id: response.id,
              name: response.name,
              email: response.email,
              picture: response.picture,
            } as FacebookUser);
          } else {
            resolve(null);
          }
        }
      );
    });
  }

  /**
   * Back-compat: get page follower count using page access token
   */
  static async getPageFollowerCount(
    pageId: string,
    pageAccessToken: string
  ): Promise<number | null> {
    try {
      return await new Promise<number | null>((resolve) => {
        window.FB.api(
          `/${pageId}`,
          'GET',
          { fields: 'followers_count,fan_count', access_token: pageAccessToken },
          (resp: any) => {
            if (resp && !resp.error) {
              resolve(resp.followers_count ?? resp.fan_count ?? null);
            } else {
              console.error('[FB Manager] getPageFollowerCount error:', resp?.error?.message);
              resolve(null);
            }
          }
        );
      });
    } catch (e) {
      console.error('[FB Manager] getPageFollowerCount exception:', e);
      return null;
    }
  }

  /**
   * Back-compat: get simple engagement data for a page
   */
  static async getPageEngagementData(pageId: string, pageAccessToken: string): Promise<any> {
    try {
      return await new Promise<any>((resolve) => {
        window.FB.api(
          `/${pageId}/insights`,
          'GET',
          {
            metric: 'page_impressions_unique,page_engaged_users',
            period: 'day',
            access_token: pageAccessToken,
          },
          (resp: any) => {
            if (resp && !resp.error) {
              resolve(resp.data ?? []);
            } else {
              console.error('[FB Manager] getPageEngagementData error:', resp?.error?.message);
              resolve([]);
            }
          }
        );
      });
    } catch (e) {
      console.error('[FB Manager] getPageEngagementData exception:', e);
      return [];
    }
  }

  /**
   * Get current App ID (for debugging)
   */
  static getCurrentAppId(): string | null {
    return this.currentAppId;
  }

  /**
   * Check if SDK is ready
   */
  static isSDKReady(): boolean {
    return this.isInitialized && !!window.FB;
  }
}

// Export the manager and convenience functions
export { FacebookSDKManager };

// Backward compatibility alias - many files expect 'FacebookSDK'
export const FacebookSDK = FacebookSDKManager;

// Convenience functions for backward compatibility
export const ensureFBReady = FacebookSDKManager.ensureFBReady;
export const secureLogin = FacebookSDKManager.secureLogin;
export const getUserPages = FacebookSDKManager.getUserPages;
export const getLoginStatus = FacebookSDKManager.getLoginStatus;
export const secureLogout = FacebookSDKManager.secureLogout;

export default FacebookSDKManager;
