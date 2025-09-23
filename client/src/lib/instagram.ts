// Instagram Graph API SDK for Creator Instagram Business Account integration
// Handles OAuth flow and messaging capabilities for creators

export interface InstagramUser {
  id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
  media_count?: number;
  account_type?: 'PERSONAL' | 'BUSINESS';
}

export interface InstagramLoginResult {
  success: boolean;
  user?: InstagramUser;
  accessToken?: string;
  error?: string;
  errorCode?: string;
  grantedScopes?: string[];
  deniedScopes?: string[];
}

export interface InstagramBusinessAccount {
  id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
  media_count?: number;
  website?: string;
  biography?: string;
}

export interface InstagramMessage {
  text: string;
  recipient_id: string;
}

export type UserType = 'creator' | 'fan';

// Instagram App Configuration
const INSTAGRAM_CONFIG = {
  creator: {
    clientId: import.meta.env.VITE_INSTAGRAM_CREATOR_APP_ID || '1157911489578561', // Use env var or fallback
    redirectUri: 'https://81905ce2-383a-4f34-a786-de23b33f10cb-00-3bmrhe6m2al7v.janeway.replit.dev/creator-dashboard', // Must match Instagram App Dashboard exactly
    requiredScopes: [
      'instagram_business_basic',
      'instagram_business_manage_messages',
      'instagram_business_manage_comments',
      'instagram_business_content_publish',
      'instagram_business_manage_insights'
    ]
  },
  fan: {
    clientId: import.meta.env.VITE_INSTAGRAM_FAN_CLIENT_ID || '',
    redirectUri: `${window.location.origin}/auth/instagram/callback`,
    requiredScopes: [
      'instagram_business_basic'
    ]
  }
};

const INSTAGRAM_API_VERSION = 'v21.0';

class InstagramSDKManager {
  private static isInitialized = false;
  private static currentConfig: typeof INSTAGRAM_CONFIG.creator | null = null;

  /**
   * Initialize Instagram OAuth flow for specific user type
   */
  static async initialize(userType: UserType): Promise<void> {
    const config = INSTAGRAM_CONFIG[userType];
    
    if (!config.clientId) {
      throw new Error(`Instagram ${userType} client ID not configured`);
    }

    this.currentConfig = config;
    this.isInitialized = true;
    
    console.log(`[Instagram Manager] Initialized for ${userType}`);
  }

  /**
   * Get Instagram OAuth authorization URL
   */
  static getAuthUrl(userType: UserType, state?: string): string {
    const config = INSTAGRAM_CONFIG[userType];
    const finalState = state || `instagram_${userType}_${Date.now()}`;
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.requiredScopes.join(','),
      response_type: 'code',
      state: finalState
    });

    const authUrl = `https://www.instagram.com/oauth/authorize?${params}`;
    console.log('[Instagram Manager] Generated auth URL:', {
      userType,
      redirectUri: config.redirectUri,
      state: finalState,
      scopes: config.requiredScopes.join(','),
      fullUrl: authUrl
    });
    
    console.log('[Instagram Manager] 🔍 EXACT REDIRECT URI BEING USED:', config.redirectUri);
    console.log('[Instagram Manager] 🔍 FULL AUTH URL:', authUrl);
    
    return authUrl;
  }

  /**
   * Exchange authorization code for access token
   */
  static async exchangeCodeForToken(code: string, userType: UserType): Promise<string> {
    const config = INSTAGRAM_CONFIG[userType];
    
    console.log('[Instagram Manager] Token exchange request:', {
      redirect_uri: config.redirectUri,
      user_type: userType,
      code_length: code.length
    });
    
    const response = await fetch('/api/social/instagram/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        code, 
        redirect_uri: config.redirectUri,
        user_type: userType
      })
    });
    
    console.log('[Instagram Manager] Token exchange response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Instagram Manager] Token exchange error:', errorText);
      throw new Error(`Failed to exchange code for token: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    console.log('[Instagram Manager] Token exchange success:', { has_access_token: !!data.access_token });
    return data.access_token;
  }

  /**
   * Get Instagram Business Account info
   */
  static async getBusinessAccount(accessToken: string): Promise<InstagramBusinessAccount> {
    const response = await fetch(
      `https://graph.instagram.com/${INSTAGRAM_API_VERSION}/me?fields=id,username,name,profile_picture_url,followers_count,media_count,website,biography&access_token=${accessToken}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch Instagram business account');
    }
    
    return response.json();
  }

  /**
   * Send Instagram message (requires Instagram Business Account)
   */
  static async sendMessage(accessToken: string, message: InstagramMessage): Promise<any> {
    const response = await fetch('/api/social/instagram/send-message', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(message)
    });
    
    if (!response.ok) {
      throw new Error('Failed to send Instagram message');
    }
    
    return response.json();
  }

  /**
   * Get Instagram Business Account from Facebook Page
   */
  static async getInstagramBusinessAccountFromPage(pageAccessToken: string, pageId: string): Promise<InstagramBusinessAccount | null> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/${INSTAGRAM_API_VERSION}/${pageId}?fields=instagram_business_account{id,username,name,profile_picture_url,followers_count,media_count,website,biography}&access_token=${pageAccessToken}`
      );
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      return data.instagram_business_account || null;
    } catch (error) {
      console.error('[Instagram Manager] Error fetching Instagram business account:', error);
      return null;
    }
  }

  /**
   * Secure login flow for creators with Instagram Business Account
   */
  static async secureLogin(userType: UserType): Promise<InstagramLoginResult> {
    try {
      await this.initialize(userType);
      
      const config = INSTAGRAM_CONFIG[userType];
      console.log(`[Instagram Manager] Starting secure login for ${userType}`);

      // For creators, use direct Instagram Business Login
      if (userType === 'creator') {
        return this.loginViaDirect(userType);
      } else {
        // For fans, use basic Instagram OAuth (if needed in the future)
        return this.loginViaDirect(userType);
      }
    } catch (error) {
      console.error('[Instagram Manager] Login error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Login via Facebook Page (for creators with Instagram Business Account)
   */
  private static async loginViaFacebookPage(): Promise<InstagramLoginResult> {
    // This requires the Facebook SDK to be already connected with proper permissions
    // We'll integrate with the existing Facebook connection to get Instagram Business Account access
    
    try {
      // Check if Facebook SDK is available and user is connected
      if (!window.FB) {
        throw new Error('Facebook SDK not available. Please connect Facebook first.');
      }

      return new Promise((resolve) => {
        window.FB.api('/me/accounts', 'GET', { fields: 'id,name,access_token,instagram_business_account' }, async (response) => {
          if (response.error) {
            resolve({
              success: false,
              error: 'Failed to fetch Facebook pages with Instagram accounts'
            });
            return;
          }

          // Find a page with Instagram Business Account
          const pageWithInstagram = response.data?.find((page: any) => page.instagram_business_account);
          
          if (!pageWithInstagram) {
            resolve({
              success: false,
              error: 'No Instagram Business Account found. Please connect an Instagram Business Account to your Facebook Page first.'
            });
            return;
          }

          try {
            // Get Instagram Business Account details
            const instagramAccount = await this.getInstagramBusinessAccountFromPage(
              pageWithInstagram.access_token, 
              pageWithInstagram.id
            );

            if (!instagramAccount) {
              resolve({
                success: false,
                error: 'Failed to fetch Instagram Business Account details'
              });
              return;
            }

            resolve({
              success: true,
              user: {
                id: instagramAccount.id,
                username: instagramAccount.username,
                name: instagramAccount.name,
                profile_picture_url: instagramAccount.profile_picture_url,
                followers_count: instagramAccount.followers_count,
                media_count: instagramAccount.media_count,
                account_type: 'BUSINESS'
              },
              accessToken: pageWithInstagram.access_token, // We'll use the page token for Instagram API calls
              grantedScopes: ['instagram_basic', 'instagram_manage_messages']
            });
          } catch (error) {
            resolve({
              success: false,
              error: 'Failed to process Instagram Business Account'
            });
          }
        });
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Facebook integration error'
      };
    }
  }

  /**
   * Direct Instagram OAuth login using Instagram Business Login
   */
  private static async loginViaDirect(userType: UserType): Promise<InstagramLoginResult> {
    try {
      const authUrl = this.getAuthUrl(userType, `instagram_${userType}_${Date.now()}`);
      
      console.log('[Instagram Manager] Redirecting to Instagram OAuth:', authUrl);
      
      // Redirect to Instagram OAuth
      window.location.href = authUrl;
      
      // This will redirect away, so we return a pending state
      // The actual token exchange happens in the callback handler
      return {
        success: false,
        error: 'Redirecting to Instagram...'
      };
    } catch (error) {
      console.error('[Instagram Manager] Login redirect error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initiate Instagram login'
      };
    }
  }

  /**
   * Handle OAuth callback and exchange code for token
   */
  static async handleCallback(code: string, state: string): Promise<InstagramLoginResult> {
    try {
      console.log('[Instagram Manager] Handling OAuth callback with code:', code.substring(0, 10) + '...', 'state:', state);
      
      // Determine user type from state
      const userType: UserType = state.includes('creator') ? 'creator' : 'fan';
      console.log('[Instagram Manager] Determined user type:', userType);
      
      // Exchange code for token
      console.log('[Instagram Manager] Exchanging code for token...');
      const accessToken = await this.exchangeCodeForToken(code, userType);
      console.log('[Instagram Manager] Received access token:', accessToken ? 'SUCCESS' : 'FAILED');
      
      // Get user profile
      console.log('[Instagram Manager] Fetching user profile...');
      const userProfile = await this.getBusinessAccount(accessToken);
      console.log('[Instagram Manager] User profile:', userProfile);
      
      return {
        success: true,
        user: {
          id: userProfile.id,
          username: userProfile.username,
          name: userProfile.name,
          profile_picture_url: userProfile.profile_picture_url,
          followers_count: userProfile.followers_count,
          media_count: userProfile.media_count,
          account_type: 'BUSINESS'
        },
        accessToken,
        grantedScopes: INSTAGRAM_CONFIG[userType].requiredScopes
      };
    } catch (error) {
      console.error('[Instagram Manager] Callback error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete Instagram login'
      };
    }
  }

  /**
   * Logout from Instagram (clears local state)
   */
  static async logout(): Promise<void> {
    this.isInitialized = false;
    this.currentConfig = null;
    console.log('[Instagram Manager] Logged out');
  }
}

export default InstagramSDKManager;

// Utility functions for Instagram integration
export const InstagramUtils = {
  /**
   * Validate Instagram username format
   */
  isValidUsername(username: string): boolean {
    const regex = /^[a-zA-Z0-9._]+$/;
    return regex.test(username) && username.length >= 1 && username.length <= 30;
  },

  /**
   * Format Instagram profile URL
   */
  getProfileUrl(username: string): string {
    return `https://instagram.com/${username}`;
  },

  /**
   * Check if account has messaging capabilities
   */
  hasMessagingCapabilities(accountType: string): boolean {
    return accountType === 'BUSINESS';
  }
};
