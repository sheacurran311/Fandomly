import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2, X, ChevronDown, ChevronUp, Wallet } from 'lucide-react';
import {
  FaGoogle,
  FaTiktok,
  FaTwitter,
  FaFacebook,
  FaTwitch,
  FaDiscord,
  FaYoutube,
  FaSpotify
} from 'react-icons/fa';
import { TwitterSDKManager } from '@/lib/twitter';
import { FacebookSDKManager } from '@/lib/facebook';
import { useToast } from '@/hooks/use-toast';
import { getPostAuthRedirect } from '@/lib/auth-redirect';
import { isParticleAuthEnabled } from '@/contexts/particle-provider';

interface AuthProvider {
  id: string;
  name: string;
  icon: React.ReactNode;
  bgColor: string;
  hoverColor: string;
  textColor: string;
}

// Primary providers shown by default (Google + top 3 social)
// Note: Instagram is NOT included here - it only supports business/creator accounts
// and is only available for creators to connect their accounts on the creator dashboard
const primaryProviders: AuthProvider[] = [
  {
    id: 'google',
    name: 'Continue with Google',
    icon: <FaGoogle className="w-5 h-5" />,
    bgColor: 'bg-white',
    hoverColor: 'hover:bg-gray-100',
    textColor: 'text-gray-800',
  },
  {
    id: 'twitter',
    name: 'Continue with X',
    icon: <FaTwitter className="w-5 h-5" />,
    bgColor: 'bg-black',
    hoverColor: 'hover:bg-gray-900',
    textColor: 'text-white',
  },
  {
    id: 'facebook',
    name: 'Continue with Facebook',
    icon: <FaFacebook className="w-5 h-5" />,
    bgColor: 'bg-[#1877F2]',
    hoverColor: 'hover:bg-[#166FE5]',
    textColor: 'text-white',
  },
  {
    id: 'tiktok',
    name: 'Continue with TikTok',
    icon: <FaTiktok className="w-5 h-5" />,
    bgColor: 'bg-black',
    hoverColor: 'hover:bg-gray-900',
    textColor: 'text-white',
  },
];

// Additional providers shown when expanded
const additionalProviders: AuthProvider[] = [
  {
    id: 'twitch',
    name: 'Continue with Twitch',
    icon: <FaTwitch className="w-5 h-5" />,
    bgColor: 'bg-[#9146FF]',
    hoverColor: 'hover:bg-[#7C3AED]',
    textColor: 'text-white',
  },
  {
    id: 'discord',
    name: 'Continue with Discord',
    icon: <FaDiscord className="w-5 h-5" />,
    bgColor: 'bg-[#5865F2]',
    hoverColor: 'hover:bg-[#4752C4]',
    textColor: 'text-white',
  },
  {
    id: 'youtube',
    name: 'Continue with YouTube',
    icon: <FaYoutube className="w-5 h-5" />,
    bgColor: 'bg-[#FF0000]',
    hoverColor: 'hover:bg-[#CC0000]',
    textColor: 'text-white',
  },
  {
    id: 'spotify',
    name: 'Continue with Spotify',
    icon: <FaSpotify className="w-5 h-5" />,
    bgColor: 'bg-[#1DB954]',
    hoverColor: 'hover:bg-[#1AA34A]',
    textColor: 'text-white',
  },
];

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// OAuth popup helper for TikTok, YouTube, Spotify, Discord, Twitch
async function openOAuthPopup(
  providerId: string,
  stateTag: string = 'auth'  // neutral tag — no fan/creator assumption
): Promise<{ success: boolean; accessToken?: string; userId?: string; username?: string; displayName?: string; email?: string; profileData?: any; error?: string }> {
  const redirectUrls: Record<string, string> = {
    tiktok: '/tiktok-callback',
    youtube: '/youtube-callback',
    spotify: '/spotify-callback',
    discord: '/discord-callback',
    twitch: '/twitch-callback',
  };

  const state = `${providerId}_${stateTag}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(`${providerId}_oauth_state`, state);

  const origin = window.location.origin;
  const redirectUri = `${origin}${redirectUrls[providerId]}`;

  let authUrl: string;

  switch (providerId) {
    case 'tiktok':
      const tiktokClientKey = import.meta.env.VITE_TIKTOK_CLIENT_KEY || '';
      authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${tiktokClientKey}&scope=user.info.basic&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
      break;
    case 'youtube':
      const youtubeClientId = import.meta.env.VITE_GOOGLE_YOUTUBE_CLIENT_ID || '';
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${youtubeClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=https://www.googleapis.com/auth/youtube.readonly%20openid%20email%20profile&response_type=code&state=${state}&access_type=offline&prompt=consent`;
      break;
    case 'spotify':
      const spotifyClientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';
      authUrl = `https://accounts.spotify.com/authorize?client_id=${spotifyClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user-read-private%20user-read-email&response_type=code&state=${state}`;
      break;
    case 'discord':
      const discordClientId = import.meta.env.VITE_DISCORD_CLIENT_ID || '';
      authUrl = `https://discord.com/oauth2/authorize?client_id=${discordClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=identify%20email&response_type=code&state=${state}`;
      break;
    case 'twitch':
      const twitchClientId = import.meta.env.VITE_TWITCH_CLIENT_ID || '';
      authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${twitchClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:read:email&response_type=code&state=${state}`;
      break;
    default:
      return { success: false, error: `Unknown provider: ${providerId}` };
  }

  return new Promise((resolve) => {
    const popup = window.open(
      authUrl,
      `${providerId}-oauth`,
      'width=600,height=700,scrollbars=yes,resizable=yes'
    );

    if (!popup) {
      resolve({ success: false, error: 'Popup blocked. Please allow popups and try again.' });
      return;
    }

    let settled = false;

    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      try { popup?.close(); } catch {}
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== `${providerId}-oauth-result`) return;
      if (settled) return;

      settled = true;
      cleanup();
      resolve(event.data.result);
    };

    window.addEventListener('message', onMessage);

    // Poll to check if popup was closed
    const poll = setInterval(() => {
      try {
        if (!popup || popup.closed) {
          clearInterval(poll);
          if (!settled) {
            settled = true;
            cleanup();
            resolve({ success: false, error: `${providerId} authorization was cancelled` });
          }
        }
      } catch {}
    }, 500);
  });
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [, setLocation] = useLocation();
  const { login, loginWithCallback, confirmAccountLink, linkRequired, clearLinkRequired, isLoading, error } = useAuth();
  const { toast } = useToast();
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [showMoreProviders, setShowMoreProviders] = useState(false);
  // Account linking state — stores the provider + callback data needed to confirm the link
  const [pendingLinkData, setPendingLinkData] = useState<{
    provider: string;
    callbackData: any;
  } | null>(null);
  const [isLinking, setIsLinking] = useState(false);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setLoadingProvider('google');
    try {
      await login('google');
    } catch (err: any) {
      console.error('Google login error:', err);
      toast({
        title: 'Login Failed',
        description: err.message || 'Failed to connect with Google',
        variant: 'destructive',
      });
      setLoadingProvider(null);
    }
  };

  const handleSocialLogin = async (providerId: string) => {
    setLoadingProvider(providerId);
    
    try {
      let result: any;
      
      // Use platform-specific login methods
      switch (providerId) {
        case 'twitter':
          result = await TwitterSDKManager.secureLogin('auth');
          // Normalize Twitter result to match expected format
          if (result.success && result.user) {
            result = {
              success: true,
              accessToken: result.accessToken,
              userId: result.user.id,
              username: result.user.username,
              displayName: result.user.name || result.user.username,
              profileData: {
                profileImageUrl: result.user.profileImageUrl,
                followersCount: result.user.followersCount,
                followingCount: result.user.followingCount,
              },
            };
          }
          break;
        case 'facebook':
          // Always use 'fan' app for initial authentication (basic public_profile + email)
          // The 'creator' app with page permissions is only used later when connecting Pages
          result = await FacebookSDKManager.secureLogin('fan');
          // Normalize Facebook result to match expected format
          if (result.success && result.user) {
            result = {
              success: true,
              accessToken: result.accessToken,
              userId: result.user.id,
              username: result.user.name,
              displayName: result.user.name,
              email: result.user.email,
              profileData: {
                picture: result.user.picture,
              },
            };
          }
          break;
        case 'tiktok':
        case 'youtube':
        case 'spotify':
        case 'discord':
        case 'twitch':
          // These platforms use OAuth popup flow
          result = await openOAuthPopup(providerId, 'auth');
          break;
        default:
          throw new Error(`Provider ${providerId} not configured`);
      }

      if (result.success) {
        // Exchange the social token for our app token
        const authResult = await loginWithCallback(providerId, {
          access_token: result.accessToken,
          platform_user_id: result.userId || result.platformUserId,
          email: result.email,
          username: result.username,
          display_name: result.displayName,
          profile_data: result.profileData || {
            followers: result.followers,
            verified: result.verified,
          },
        });

        if (authResult.success) {
          toast({
            title: 'Welcome!',
            description: `Successfully signed in with ${providerId}`,
          });
          onClose();
          
          // Redirect based on user status using shared utility
          const redirectUrl = getPostAuthRedirect(authResult.user, authResult.isNewUser || false);
          setLocation(redirectUrl);
        } else if (authResult.linkRequired) {
          // Show the in-modal account linking confirmation UI
          setPendingLinkData({
            provider: providerId,
            callbackData: {
              access_token: result.accessToken,
              platform_user_id: result.userId || result.platformUserId,
              email: result.email,
              username: result.username,
              display_name: result.displayName,
              profile_data: result.profileData,
            },
          });
        }
      } else {
        throw new Error(result.error || `Failed to connect with ${providerId}`);
      }
    } catch (err: any) {
      console.error(`${providerId} login error:`, err);
      toast({
        title: 'Login Failed',
        description: err.message || `Failed to connect with ${providerId}`,
        variant: 'destructive',
      });
    } finally {
      setLoadingProvider(null);
    }
  };

  // Handle confirming account link
  const handleConfirmLink = async () => {
    if (!pendingLinkData || !linkRequired) return;
    setIsLinking(true);
    try {
      const result = await confirmAccountLink(
        linkRequired.pendingLinkId,
        pendingLinkData.provider,
        pendingLinkData.callbackData
      );

      if (!result.success) {
        throw new Error(result.message || 'Failed to link accounts');
      }

      toast({
        title: 'Account Linked',
        description: 'Your accounts have been linked successfully.',
      });
      setPendingLinkData(null);
      onClose();

      // Redirect to the existing user's appropriate page (not onboarding — they already have an account)
      const redirectUrl = getPostAuthRedirect(result.user, false);
      setLocation(redirectUrl);
    } catch (err: any) {
      toast({
        title: 'Linking Failed',
        description: err.message || 'Failed to link accounts. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLinking(false);
    }
  };

  const handleCancelLink = () => {
    setPendingLinkData(null);
    clearLinkRequired();
  };

  // Determine which view to show
  const showLinkConfirmation = pendingLinkData && linkRequired;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={showLinkConfirmation ? undefined : onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-[#1A1A2E] rounded-2xl shadow-2xl border border-gray-800 overflow-hidden">
        {/* Close button */}
        <button
          onClick={showLinkConfirmation ? handleCancelLink : onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-800"
        >
          <X className="w-5 h-5" />
        </button>

        {showLinkConfirmation ? (
          /* ── Account Linking Confirmation View ── */
          <>
            <div className="px-8 pt-8 pb-4 text-center">
              <div className="mx-auto w-14 h-14 bg-yellow-500/20 rounded-full flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Account Found</h2>
              <p className="text-gray-400 text-sm">
                An account with this email already exists using{' '}
                <span className="text-white font-medium">
                  {linkRequired.existingProviders.join(', ')}
                </span>.
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Would you like to link your{' '}
                <span className="text-white font-medium capitalize">{pendingLinkData.provider}</span>{' '}
                account to your existing account?
              </p>
            </div>

            <div className="px-8 pb-8 space-y-3">
              <Button
                onClick={handleConfirmLink}
                disabled={isLinking}
                className="w-full h-12 bg-brand-primary hover:bg-brand-primary/80 text-white font-medium rounded-xl"
              >
                {isLinking ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : null}
                {isLinking ? 'Linking...' : 'Yes, Link My Accounts'}
              </Button>
              <Button
                onClick={handleCancelLink}
                disabled={isLinking}
                variant="outline"
                className="w-full h-12 border-gray-700 text-gray-300 hover:bg-gray-800 font-medium rounded-xl"
              >
                Cancel
              </Button>
              <p className="text-xs text-gray-500 text-center pt-2">
                Linking allows you to sign in with either account in the future.
              </p>
            </div>
          </>
        ) : (
          /* ── Normal Sign-in View ── */
          <>
            {/* Header */}
            <div className="px-8 pt-8 pb-4 text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Welcome to Fandomly</h2>
              <p className="text-gray-400 text-sm">
                Sign in to connect with creators, grow your community, and earn rewards
              </p>
            </div>

            {/* Auth Buttons */}
            <div className="px-8 pb-8 space-y-3">
              {isParticleAuthEnabled() ? (
                /* Particle Connect -- handles social + wallet login in one button */
                <ParticleConnectButton onClose={onClose} />
              ) : (
                /* Legacy Google login */
                <Button
                  onClick={handleGoogleLogin}
                  disabled={isLoading || loadingProvider !== null}
                  className={`w-full h-12 ${primaryProviders[0].bgColor} ${primaryProviders[0].hoverColor} ${primaryProviders[0].textColor} font-medium flex items-center justify-center gap-3 rounded-xl transition-all duration-200 border-0`}
                >
                  {loadingProvider === 'google' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    primaryProviders[0].icon
                  )}
                  <span>{primaryProviders[0].name}</span>
                </Button>
              )}

              {/* OR Divider */}
              <div className="relative py-2">
                <Separator className="bg-gray-700" />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#1A1A2E] px-4 text-sm text-gray-500 font-medium">
                  OR
                </span>
              </div>

              {/* Primary Social Providers (X, Facebook, TikTok) */}
              {primaryProviders.slice(1).map((provider) => (
                <Button
                  key={provider.id}
                  onClick={() => handleSocialLogin(provider.id)}
                  disabled={isLoading || loadingProvider !== null}
                  className={`w-full h-12 ${provider.bgColor} ${provider.hoverColor} ${provider.textColor} font-medium flex items-center justify-center gap-3 rounded-xl transition-all duration-200 border-0`}
                >
                  {loadingProvider === provider.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    provider.icon
                  )}
                  <span>{provider.name}</span>
                </Button>
              ))}

              {/* Show More Button */}
              <button
                onClick={() => setShowMoreProviders(!showMoreProviders)}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
              >
                {showMoreProviders ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    <span>Show fewer options</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    <span>More sign-in options</span>
                  </>
                )}
              </button>

              {/* Additional Providers (collapsible) */}
              {showMoreProviders && (
                <div className="space-y-3 pt-1">
                  {additionalProviders.map((provider) => (
                    <Button
                      key={provider.id}
                      onClick={() => handleSocialLogin(provider.id)}
                      disabled={isLoading || loadingProvider !== null}
                      className={`w-full h-12 ${provider.bgColor} ${provider.hoverColor} ${provider.textColor} font-medium flex items-center justify-center gap-3 rounded-xl transition-all duration-200 border-0`}
                    >
                      {loadingProvider === provider.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        provider.icon
                      )}
                      <span>{provider.name}</span>
                    </Button>
                  ))}
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="p-3 bg-red-900/30 border border-red-700 rounded-xl mt-4">
                  <p className="text-sm text-red-400 text-center">{error}</p>
                </div>
              )}

              {/* Terms */}
              <p className="text-xs text-gray-500 text-center pt-4">
                By continuing, you agree to our{' '}
                <button 
                  onClick={() => {
                    onClose();
                    setLocation('/terms-of-service');
                  }} 
                  className="text-primary hover:underline"
                >
                  Terms of Service
                </button>
                {' '}and{' '}
                <button 
                  onClick={() => {
                    onClose();
                    setLocation('/privacy-policy');
                  }} 
                  className="text-primary hover:underline"
                >
                  Privacy Policy
                </button>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Particle Connect button wrapper.
 * Opens Particle's modal (social + wallet login) and the ParticleAuthListener
 * handles bridging the session to Fandomly auth automatically.
 */
function ParticleConnectButton({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      // Dynamically import to avoid bundling when Particle is disabled
      const { useModal } = await import('@particle-network/connectkit');
      // The ConnectKit modal is opened via the hook, but since we can't
      // call hooks dynamically, we dispatch a custom event that's picked
      // up by a small wrapper. As a simpler approach, we just render
      // Particle's ConnectButton directly.
    } catch {
      // Fall through to render the button below
    }
    setLoading(false);
  };

  // Render a styled button that triggers the Particle Connect modal.
  // The actual ConnectButton from Particle is rendered elsewhere in the tree;
  // here we provide a visual trigger that matches the auth modal design.
  return (
    <div className="space-y-2">
      <ParticleConnectTrigger />
      <p className="text-xs text-gray-500 text-center">
        Sign in with email, social accounts, or connect a wallet
      </p>
    </div>
  );
}

/**
 * Renders Particle's ConnectButton with custom styling to match the auth modal.
 * This component must be inside ConnectKitProvider.
 */
function ParticleConnectTrigger() {
  try {
    // This will only work when @particle-network/connectkit is installed
    // and this component is inside ConnectKitProvider
    const { ConnectButton } = require('@particle-network/connectkit');
    return (
      <div className="[&_button]:w-full [&_button]:h-12 [&_button]:rounded-xl [&_button]:font-medium">
        <ConnectButton label="Sign in with Fandomly" />
      </div>
    );
  } catch {
    // SDK not installed yet - show a placeholder
    return (
      <Button
        disabled
        className="w-full h-12 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-medium flex items-center justify-center gap-3 rounded-xl transition-all duration-200 border-0"
      >
        <Wallet className="w-5 h-5" />
        <span>Sign in with Fandomly</span>
      </Button>
    );
  }
}
