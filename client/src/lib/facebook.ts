// Centralized Facebook SDK loader and utilities for Fandomly
// Handles proper App ID separation between Fan and Creator contexts

declare global {
  interface Window {
    FB: {
      init: (config: {
        appId: string;
        xfbml: boolean;
        version: string;
      }) => void;
      AppEvents: {
        logPageView: () => void;
      };
      api: (
        path: string,
        method: string,
        params: any,
        callback: (response: any) => void
      ) => void;
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
      getLoginStatus: (callback: (response: {
        status: string;
        authResponse?: {
          accessToken: string;
          userID: string;
          expiresIn: number;
        };
      }) => void) => void;
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
}

export interface FacebookLoginResult {
  success: boolean;
  user?: FacebookUser;
  grantedScopes?: string[];
  deniedScopes?: string[];
  error?: string;
  errorCode?: string;
}

export type UserType = 'fan' | 'creator';

// App ID configuration
const FB_APP_CONFIG = {
  fan: {
    appId: '4233782626946744', // Fan App ID
    requiredScopes: ['public_profile', 'email']
  },
  creator: {
    appId: import.meta.env.VITE_FACEBOOK_CREATOR_APP_ID || '4233782626946744', // Creator App ID (fallback to fan for now)
    requiredScopes: ['public_profile', 'email', 'pages_show_list', 'business_management', 'pages_read_engagement']
  }
};

const FB_API_VERSION = 'v23.0';

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
    const config = FB_APP_CONFIG[userType];
    const requiredAppId = config.appId;

    console.log(`[FB Manager] Ensuring FB ready for ${userType} with App ID: ${requiredAppId.substring(0, 6)}...`);

    // If we need to reinitialize with different App ID
    if (this.currentAppId && this.currentAppId !== requiredAppId && !this.reinitInProgress) {
      console.log(`[FB Manager] App ID change detected, reinitializing...`);
      await this.reinitializeSDK(requiredAppId);
      return;
    }

    // If already initialized with correct App ID
    if (this.isInitialized && this.currentAppId === requiredAppId && window.FB) {
      console.log(`[FB Manager] Already initialized for ${userType}`);
      return;
    }

    // Wait for existing initialization if in progress
    if (this.initPromise) {
      console.log(`[FB Manager] Waiting for existing initialization...`);
      await this.initPromise;
      return;
    }

    // Start new initialization
    this.initPromise = this.initializeSDK(requiredAppId);
    await this.initPromise;
  }

  private static async initializeSDK(appId: string): Promise<void> {
    return new Promise((resolve) => {
      console.log(`[FB Manager] Initializing SDK with App ID: ${appId.substring(0, 6)}...`);

      if (window.FB) {
        // SDK already loaded, just init with new config
        this.finalizeInitialization(appId);
        resolve();
        return;
      }

      // Set up fbAsyncInit
      window.fbAsyncInit = () => {
        this.finalizeInitialization(appId);
        resolve();
      };

      // Load FB SDK script if not present
      if (!document.getElementById('facebook-jssdk')) {
        const script = document.createElement('script');
        script.id = 'facebook-jssdk';
        script.src = `https://connect.facebook.net/en_US/sdk.js`;
        script.async = true;
        script.defer = true;
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

    // Reinitialize
    window.FB.init({
      appId: newAppId,
      xfbml: true,
      version: FB_API_VERSION
    });

    this.currentAppId = newAppId;
    this.isInitialized = true;
    this.reinitInProgress = false;

    // Small delay to ensure reinitialization is complete
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log(`[FB Manager] Reinitialization complete`);
  }

  private static finalizeInitialization(appId: string): void {
    window.FB.init({
      appId: appId,
      xfbml: true,
      version: FB_API_VERSION
    });

    window.FB.AppEvents.logPageView();

    this.currentAppId = appId;
    this.isInitialized = true;
    this.initPromise = null;

    console.log(`[FB Manager] SDK initialized successfully`);
  }

  /**
   * Secure login with permissions verification
   */
  static async secureLogin(userType: UserType): Promise<FacebookLoginResult> {
    await this.ensureFBReady(userType);
    
    const config = FB_APP_CONFIG[userType];
    const scope = config.requiredScopes.join(',');

    console.log(`[FB Manager] Starting secure login for ${userType}`);

    return new Promise((resolve) => {
      window.FB.login((response) => {
        // Security: Never log full response which contains tokens
        console.log(`[FB Manager] Login completed with status: ${response.status}`);

        if (response.status === 'connected' && response.authResponse) {
          this.handleSuccessfulLogin(response, config.requiredScopes, resolve);
        } else {
          resolve({
            success: false,
            error: `Login failed with status: ${response.status}`,
            errorCode: response.status
          });
        }
      }, { scope });
    });
  }

  private static handleSuccessfulLogin(
    response: any, 
    requiredScopes: string[], 
    resolve: (result: FacebookLoginResult) => void
  ): void {
    // Get user info and verify permissions
    window.FB.api('/me', 'GET', { 
      fields: 'id,name,email,picture.width(200).height(200)' 
    }, (userResponse) => {
      if (userResponse && !userResponse.error) {
        // Verify permissions
        window.FB.api('/me/permissions', 'GET', {}, (permResponse) => {
          const result = this.processPermissions(userResponse, permResponse, requiredScopes);
          resolve(result);
        });
      } else {
        console.error('[FB Manager] Failed to get user info:', userResponse?.error?.message || 'Unknown error');
        resolve({
          success: false,
          error: 'Failed to get user information',
          errorCode: 'USER_INFO_ERROR'
        });
      }
    });
  }

  private static processPermissions(
    userResponse: any,
    permResponse: any,
    requiredScopes: string[]
  ): FacebookLoginResult {
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
    const missingScopes = requiredScopes.filter(scope => !grantedScopes.includes(scope));
    
    if (missingScopes.length > 0) {
      console.warn('[FB Manager] Missing required permissions:', missingScopes);
    }

    return {
      success: true,
      user: {
        id: userResponse.id,
        name: userResponse.name,
        email: userResponse.email,
        picture: userResponse.picture
      },
      grantedScopes,
      deniedScopes
    };
  }

  /**
   * Get user pages with error handling
   */
  static async getUserPages(): Promise<FacebookPage[]> {
    if (!window.FB || !this.isInitialized) {
      console.error('[FB Manager] SDK not initialized for getUserPages');
      return [];
    }

    return new Promise((resolve) => {
      window.FB.api('/me/accounts', 'GET', {
        fields: 'id,name,access_token,category,followers_count,fan_count,instagram_business_account'
      }, (response: any) => {
        if (response && response.data && !response.error) {
          console.log(`[FB Manager] Successfully loaded ${response.data.length} pages`);
          resolve(response.data as FacebookPage[]);
        } else {
          const errorMsg = response?.error?.message || 'Unknown error';
          console.error('[FB Manager] Failed to load pages:', errorMsg);
          resolve([]);
        }
      });
    });
  }

  /**
   * Get login status without sensitive logging
   */
  static async getLoginStatus(): Promise<{ 
    isLoggedIn: boolean; 
    userID?: string; 
    status?: string; 
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
            status: response.status 
          });
        } else {
          resolve({ 
            isLoggedIn: false, 
            status: response.status 
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