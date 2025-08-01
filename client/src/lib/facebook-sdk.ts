// Facebook SDK integration for Fandomly
declare global {
  interface Window {
    FB: {
      init: (params: {
        appId: string;
        cookie: boolean;
        xfbml: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: FacebookLoginResponse) => void,
        options?: { scope: string }
      ) => void;
      logout: (callback: (response: any) => void) => void;
      getLoginStatus: (callback: (response: FacebookLoginResponse) => void) => void;
      api: (
        path: string,
        method: string,
        params: any,
        callback: (response: any) => void
      ) => void;
      AppEvents: {
        logPageView: () => void;
      };
    };
    fbAsyncInit: () => void;
  }
}

export interface FacebookLoginResponse {
  status: 'connected' | 'not_authorized' | 'unknown';
  authResponse?: {
    accessToken: string;
    expiresIn: number;
    signedRequest: string;
    userID: string;
  };
}

export interface FacebookUserData {
  id: string;
  name: string;
  email?: string;
  picture?: {
    data: {
      url: string;
    };
  };
  followers_count?: number;
}

export interface FacebookPageData {
  id: string;
  name: string;
  access_token: string;
  category: string;
  fan_count?: number;
  picture?: {
    data: {
      url: string;
    };
  };
}

class FacebookSDK {
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.isInitialized) return;
    
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve) => {
      if (window.FB) {
        this.isInitialized = true;
        resolve();
        return;
      }

      // Wait for Facebook SDK to load
      const checkFB = () => {
        if (window.FB) {
          this.isInitialized = true;
          resolve();
        } else {
          setTimeout(checkFB, 100);
        }
      };
      checkFB();
    });

    return this.initPromise;
  }

  async login(): Promise<FacebookLoginResponse> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      try {
        window.FB.login((response: FacebookLoginResponse) => {
          resolve(response);
        }, {
          scope: 'pages_read_engagement,pages_show_list,email,public_profile'
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async logout(): Promise<void> {
    await this.init();
    
    return new Promise((resolve) => {
      window.FB.logout(() => {
        resolve();
      });
    });
  }

  async getLoginStatus(): Promise<FacebookLoginResponse> {
    await this.init();
    
    return new Promise((resolve) => {
      window.FB.getLoginStatus((response: FacebookLoginResponse) => {
        resolve(response);
      });
    });
  }

  async getUserData(): Promise<FacebookUserData> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      window.FB.api('/me', 'GET', {
        fields: 'id,name,email,picture'
      }, (response: any) => {
        if (response.error) {
          reject(response.error);
        } else {
          resolve(response);
        }
      });
    });
  }

  async getUserPages(): Promise<FacebookPageData[]> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      window.FB.api('/me/accounts', 'GET', {
        fields: 'id,name,access_token,category,fan_count,picture'
      }, (response: any) => {
        if (response.error) {
          reject(response.error);
        } else {
          resolve(response.data || []);
        }
      });
    });
  }

  async getPageInsights(pageId: string, accessToken: string): Promise<any> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      window.FB.api(`/${pageId}/insights`, 'GET', {
        access_token: accessToken,
        metric: 'page_fan_adds,page_impressions,page_engaged_users',
        period: 'day',
        since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        until: new Date().toISOString().split('T')[0]
      }, (response: any) => {
        if (response.error) {
          reject(response.error);
        } else {
          resolve(response.data || []);
        }
      });
    });
  }
}

export const facebookSDK = new FacebookSDK();