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
          resolve();
        };
      } else {
        window.fbAsyncInit = function() {
          window.FB.init({
            appId: '4233782626946744',
            xfbml: true,
            version: 'v23.0'
          });
          window.FB.AppEvents.logPageView();
          FacebookSDK.isInitialized = true;
          resolve();
        };
      }
    });
  }

  static async login(scope: string = 'email,public_profile,pages_show_list,pages_read_engagement'): Promise<{
    success: boolean;
    accessToken?: string;
    userID?: string;
    error?: string;
  }> {
    await this.waitForSDK();

    return new Promise((resolve) => {
      window.FB.login((response) => {
        if (response.status === 'connected' && response.authResponse) {
          resolve({
            success: true,
            accessToken: response.authResponse.accessToken,
            userID: response.authResponse.userID
          });
        } else {
          resolve({
            success: false,
            error: response.status
          });
        }
      }, { scope });
    });
  }

  static async getUserInfo(accessToken: string): Promise<FacebookUser | null> {
    await this.waitForSDK();

    return new Promise((resolve) => {
      window.FB.api('/me', 'GET', {
        fields: 'id,name,email,picture',
        access_token: accessToken
      }, (response) => {
        if (response && !response.error) {
          resolve(response as FacebookUser);
        } else {
          console.error('Facebook API error:', response?.error);
          resolve(null);
        }
      });
    });
  }

  static async getUserPages(accessToken: string): Promise<FacebookPage[]> {
    await this.waitForSDK();

    return new Promise((resolve) => {
      window.FB.api('/me/accounts', 'GET', {
        fields: 'id,name,access_token,category,followers_count,fan_count',
        access_token: accessToken
      }, (response) => {
        if (response && response.data && !response.error) {
          resolve(response.data as FacebookPage[]);
        } else {
          console.error('Facebook Pages API error:', response?.error);
          resolve([]);
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
        if (response && !response.error) {
          // Use followers_count if available, fallback to fan_count
          const count = response.followers_count || response.fan_count || 0;
          resolve(count);
        } else {
          console.error('Facebook Page metrics API error:', response?.error);
          resolve(0);
        }
      });
    });
  }

  static async logout(): Promise<void> {
    await this.waitForSDK();

    return new Promise((resolve) => {
      window.FB.logout(() => {
        resolve();
      });
    });
  }

  static async getLoginStatus(): Promise<{
    isLoggedIn: boolean;
    accessToken?: string;
    userID?: string;
  }> {
    await this.waitForSDK();

    return new Promise((resolve) => {
      window.FB.getLoginStatus((response) => {
        if (response.status === 'connected' && response.authResponse) {
          resolve({
            isLoggedIn: true,
            accessToken: response.authResponse.accessToken,
            userID: response.authResponse.userID
          });
        } else {
          resolve({
            isLoggedIn: false
          });
        }
      });
    });
  }
}

// Utility function to check if Facebook SDK is available
export const isFacebookSDKAvailable = (): boolean => {
  return typeof window !== 'undefined' && !!window.FB;
};

// Export default instance
export default FacebookSDK;