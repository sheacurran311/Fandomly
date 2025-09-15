// Facebook SDK utilities and types for Fandomly
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
  likes?: {
    data: Array<{
      id: string;
      name: string;
      category?: string;
    }>;
  };
  photos?: any;
  posts?: any;
  friends?: any;
  profile_pic?: string;
  favorite_athletes?: string[];
  favorite_teams?: string[];
  sports?: string[];
  businesses?: any;
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

export class FacebookSDK {
  private static isInitialized = false;

  static async waitForSDK(): Promise<void> {
    return new Promise((resolve) => {
      if (window.FB && FacebookSDK.isInitialized) {
        resolve();
        return;
      }

      if (window.fbAsyncInit) {
        const originalInit = window.fbAsyncInit;
        window.fbAsyncInit = function() {
          originalInit();
          FacebookSDK.isInitialized = true;
          FacebookSDK.checkLoginStatusOnInit();
          resolve();
        };
      } else {
        window.fbAsyncInit = function() {
          window.FB.init({
            appId: (import.meta as any)?.env?.VITE_FACEBOOK_APP_ID || '4233782626946744',
            xfbml: true,
            version: (import.meta as any)?.env?.VITE_FACEBOOK_API_VERSION || 'v23.0'
          });
          window.FB.AppEvents.logPageView();
          FacebookSDK.isInitialized = true;
          FacebookSDK.checkLoginStatusOnInit();
          resolve();
        };
      }
    });
  }

  private static checkLoginStatusOnInit(): void {
    window.FB.getLoginStatus((response) => {
      console.log('Facebook login status on page load:', response);
      FacebookSDK.handleLoginStatusResponse(response);
    });
  }

  private static handleLoginStatusResponse(response: any): void {
    if (response.status === 'connected') {
      sessionStorage.setItem('fb_access_token', response.authResponse.accessToken);
      sessionStorage.setItem('fb_user_id', response.authResponse.userID);
      sessionStorage.setItem('fb_expires_in', response.authResponse.expiresIn.toString());
      const expiresAtMs = Date.now() + (Number(response.authResponse.expiresIn) * 1000);
      sessionStorage.setItem('fb_expires_at', String(expiresAtMs));
      sessionStorage.setItem('fb_captured_at', String(Date.now()));
    } else {
      FacebookSDK.clearStoredTokens();
    }
  }

  private static clearStoredTokens(): void {
    sessionStorage.removeItem('fb_access_token');
    sessionStorage.removeItem('fb_user_id');
    sessionStorage.removeItem('fb_expires_in');
    sessionStorage.removeItem('fb_expires_at');
    sessionStorage.removeItem('fb_captured_at');
  }

  static async login(scope: string = 'public_profile,email'): Promise<{
    success: boolean;
    accessToken?: string;
    userID?: string;
    error?: string;
  }> {
    await this.waitForSDK();

    return new Promise((resolve) => {
      window.FB.login((response) => {
        FacebookSDK.handleLoginStatusResponse(response);
        if (response.status === 'connected' && response.authResponse) {
          resolve({ success: true, accessToken: response.authResponse.accessToken, userID: response.authResponse.userID });
        } else {
          resolve({ success: false, error: response.status });
        }
      }, { scope });
    });
  }

  static async getUserInfo(accessToken: string): Promise<FacebookUser | null> {
    await this.waitForSDK();
    console.log('[FB SDK] getUserInfo called');

    return new Promise((resolve) => {
      console.log('[FB SDK] calling FB.api /me...');
      window.FB.api(
        '/me',
        'GET',
        { fields: 'id,name,email,picture.width(200).height(200)' },
        function(response) {
          console.log('[FB SDK] /me response:', response);
          if (response && !response.error) {
            console.log('[FB SDK] /me SUCCESS');
            resolve(response as FacebookUser);
          } else {
            console.error('[FB] /me error:', response?.error || response);
            console.log('[FB SDK] trying fallback /me with minimal fields...');
            window.FB.api(
              '/me',
              'GET',
              { fields: 'id,name' },
              function(fallbackResponse) {
                console.log('[FB SDK] /me fallback response:', fallbackResponse);
                if (fallbackResponse && !fallbackResponse.error) {
                  console.log('[FB SDK] /me fallback SUCCESS');
                  resolve(fallbackResponse as FacebookUser);
                } else {
                  console.error('[FB] /me fallback error:', fallbackResponse?.error || fallbackResponse);
                  console.log('[FB SDK] /me fallback FAILED');
                  resolve(null);
                }
              }
            );
          }
        }
      );
    });
  }

  static async getUserPages(accessToken: string): Promise<FacebookPage[]> {
    await this.waitForSDK();
    console.log('[FB SDK] getUserPages called');

    return new Promise((resolve) => {
      console.log('[FB SDK] calling FB.api /me/accounts...');
      window.FB.api('/me/accounts', 'GET', {
        fields: 'id,name,access_token,category,followers_count,fan_count,instagram_business_account'
      }, (response: any) => {
        console.log('[FB SDK] /me/accounts response:', response);
        if (response && response.data && !response.error) {
          console.log('[FB SDK] /me/accounts SUCCESS ->', response.data.length, 'pages');
          resolve(response.data as FacebookPage[]);
        } else {
          console.error('[FB] /me/accounts error:', response?.error || response);
          console.log('[FB SDK] /me/accounts FAILED');
          resolve([]);
        }
      });
    });
  }

  static async getPageEngagementData(pageId: string, pageAccessToken: string): Promise<any> {
    await this.waitForSDK();

    return new Promise((resolve) => {
      window.FB.api(`/${pageId}/insights`, 'GET', {
        metric: 'page_engaged_users,page_post_engagements,page_fans,page_impressions',
        period: 'day',
        since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        until: new Date().toISOString().split('T')[0],
        access_token: pageAccessToken
      }, (response: any) => {
        if (response && response.data && !response.error) {
          resolve(response.data);
        } else {
          console.error('[FB] /:pageId/insights error:', response?.error || response);
          resolve(null);
        }
      });
    });
  }

  static async getPageFollowerCount(pageId: string, pageAccessToken: string): Promise<number> {
    await this.waitForSDK();

    return new Promise((resolve) => {
      window.FB.api(`/${pageId}`, 'GET', {
        fields: 'followers_count,fan_count',
        access_token: pageAccessToken
      }, (response) => {
        if (response && !(response as any).error) {
          const count = (response as any).followers_count || (response as any).fan_count || 0;
          resolve(count);
        } else {
          console.error('[FB] /:pageId error:', (response as any)?.error || response);
          resolve(0);
        }
      });
    });
  }

  static async logout(): Promise<void> {
    await this.waitForSDK();
    return new Promise((resolve) => {
      window.FB.logout(() => { FacebookSDK.clearStoredTokens(); resolve(); });
    });
  }

  static async getLoginStatus(): Promise<{ isLoggedIn: boolean; accessToken?: string; userID?: string; status?: string; }> {
    await this.waitForSDK();

    return new Promise((resolve) => {
      window.FB.getLoginStatus((response) => {
        FacebookSDK.handleLoginStatusResponse(response);
        if (response.status === 'connected' && response.authResponse) {
          resolve({ isLoggedIn: true, accessToken: response.authResponse.accessToken, userID: response.authResponse.userID, status: response.status });
        } else {
          resolve({ isLoggedIn: false, status: response.status });
        }
      });
    });
  }

  static getStoredAccessToken(): string | null {
    return sessionStorage.getItem('fb_access_token');
  }

  static getStoredUserID(): string | null {
    return sessionStorage.getItem('fb_user_id');
  }

  static isTokenValid(): boolean {
    const expiresAt = sessionStorage.getItem('fb_expires_at');
    if (expiresAt) {
      return Date.now() < Number(expiresAt);
    }
    const capturedAt = Number(sessionStorage.getItem('fb_captured_at') || '0');
    const expiresIn = Number(sessionStorage.getItem('fb_expires_in') || '0');
    if (capturedAt && expiresIn) {
      return Date.now() < (capturedAt + expiresIn * 1000);
    }
    return false;
  }
}

export const isFacebookSDKAvailable = (): boolean => {
  return typeof window !== 'undefined' && !!window.FB;
};

export default FacebookSDK;