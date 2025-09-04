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
  photos?: {
    data: Array<{
      id: string;
      name?: string;
      picture?: string;
      created_time?: string;
    }>;
  };
  posts?: {
    data: Array<{
      id: string;
      message?: string;
      story?: string;
      created_time?: string;
      type?: string;
    }>;
  };
  friends?: {
    data: Array<{
      id: string;
      name: string;
    }>;
  };
  profile_pic?: string;
  favorite_athletes?: string[];
  favorite_teams?: string[];
  sports?: string[];
  businesses?: {
    owned_instagram_accounts?: {
      data: Array<{
        id: string;
        name: string;
        username: string;
      }>;
    };
  };
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
          // Check login status after SDK initialization
          FacebookSDK.checkLoginStatusOnInit();
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
          // Check login status after SDK initialization
          FacebookSDK.checkLoginStatusOnInit();
          resolve();
        };
      }
    });
  }

  // Check login status when SDK initializes (as recommended by Facebook)
  private static checkLoginStatusOnInit(): void {
    window.FB.getLoginStatus((response) => {
      console.log('Facebook login status on page load:', response);
      FacebookSDK.handleLoginStatusResponse(response);
    });
  }

  // Handle the login status response
  private static handleLoginStatusResponse(response: any): void {
    if (response.status === 'connected') {
      console.log('User is connected to Facebook and logged into app');
      // Store access token and user ID for the session
      sessionStorage.setItem('fb_access_token', response.authResponse.accessToken);
      sessionStorage.setItem('fb_user_id', response.authResponse.userID);
      sessionStorage.setItem('fb_expires_in', response.authResponse.expiresIn.toString());
    } else if (response.status === 'not_authorized') {
      console.log('User is logged into Facebook but not authorized for the app');
      FacebookSDK.clearStoredTokens();
    } else {
      console.log('User is not logged into Facebook');
      FacebookSDK.clearStoredTokens();
    }
  }

  // Clear stored authentication tokens
  private static clearStoredTokens(): void {
    sessionStorage.removeItem('fb_access_token');
    sessionStorage.removeItem('fb_user_id');
    sessionStorage.removeItem('fb_expires_in');
  }

  static async login(scope: string = 'public_profile,email'): Promise<{
    success: boolean;
    accessToken?: string;
    userID?: string;
    error?: string;
  }> {
    await this.waitForSDK();

    return new Promise((resolve) => {
      console.log('Initiating Facebook login with scope:', scope);
      console.log('Facebook SDK status:', typeof window.FB, window.FB ? 'loaded' : 'not loaded');
      
      window.FB.login((response) => {
        console.log('Facebook login response:', response);
        FacebookSDK.handleLoginStatusResponse(response);
        
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
      // Updated API call to include additional fields: photos, posts, friends
      window.FB.api('/me', 'GET', {
        fields: 'id,name,email,likes,photos,posts,friends'
      }, (response) => {
        if (response && !response.error) {
          console.log('Facebook user data received:', response);
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
      // Try to get pages/accounts that the user manages
      window.FB.api('/me/accounts', 'GET', {
        fields: 'id,name,access_token,category,followers_count,fan_count,instagram_business_account',
        access_token: accessToken
      }, (response) => {
        if (response && response.data && !response.error) {
          console.log('Facebook pages received:', response.data);
          resolve(response.data as FacebookPage[]);
        } else {
          console.log('No pages found or permission denied:', response?.error);
          // If pages permission is not available, return empty array
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
        FacebookSDK.clearStoredTokens();
        resolve();
      });
    });
  }

  static async getLoginStatus(): Promise<{
    isLoggedIn: boolean;
    accessToken?: string;
    userID?: string;
    status?: string;
  }> {
    await this.waitForSDK();

    return new Promise((resolve) => {
      window.FB.getLoginStatus((response) => {
        FacebookSDK.handleLoginStatusResponse(response);
        
        if (response.status === 'connected' && response.authResponse) {
          resolve({
            isLoggedIn: true,
            accessToken: response.authResponse.accessToken,
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

  // Get stored access token from session storage
  static getStoredAccessToken(): string | null {
    return sessionStorage.getItem('fb_access_token');
  }

  // Get stored user ID from session storage
  static getStoredUserID(): string | null {
    return sessionStorage.getItem('fb_user_id');
  }

  // Check if stored token is still valid
  static isTokenValid(): boolean {
    const expiresIn = sessionStorage.getItem('fb_expires_in');
    if (!expiresIn) return false;
    
    const expirationTime = parseInt(expiresIn) * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    
    return currentTime < expirationTime;
  }
}

// Utility function to check if Facebook SDK is available
export const isFacebookSDKAvailable = (): boolean => {
  return typeof window !== 'undefined' && !!window.FB;
};

// Export default instance
export default FacebookSDK;