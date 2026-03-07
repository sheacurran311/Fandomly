/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Loader2, X, ChevronDown, ChevronUp } from 'lucide-react';
import {
  FaGoogle,
  FaTiktok,
  FaTwitter,
  FaFacebook,
  FaTwitch,
  FaDiscord,
  FaYoutube,
  FaSpotify,
} from 'react-icons/fa';
import { TwitterSDKManager } from '@/lib/twitter';
import { FacebookSDKManager } from '@/lib/facebook';
import { useToast } from '@/hooks/use-toast';
import { getPostAuthRedirect } from '@/lib/auth-redirect';

interface AuthProvider {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
}

const primaryProviders: AuthProvider[] = [
  {
    id: 'google',
    name: 'Google',
    icon: <FaGoogle className="w-5 h-5" />,
    color: 'bg-white/10 hover:bg-white/20 text-white border border-white/10',
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    icon: <FaTwitter className="w-5 h-5" />,
    color: 'bg-white/10 hover:bg-white/20 text-white border border-white/10',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: <FaFacebook className="w-5 h-5 text-[#1877F2]" />,
    color: 'bg-white/10 hover:bg-white/20 text-white border border-white/10',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: <FaTiktok className="w-5 h-5" />,
    color: 'bg-white/10 hover:bg-white/20 text-white border border-white/10',
  },
];

const moreProviders: AuthProvider[] = [
  {
    id: 'discord',
    name: 'Discord',
    icon: <FaDiscord className="w-5 h-5 text-[#5865F2]" />,
    color: 'bg-white/10 hover:bg-white/20 text-white border border-white/10',
  },
  {
    id: 'twitch',
    name: 'Twitch',
    icon: <FaTwitch className="w-5 h-5 text-[#9146FF]" />,
    color: 'bg-white/10 hover:bg-white/20 text-white border border-white/10',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: <FaYoutube className="w-5 h-5 text-[#FF0000]" />,
    color: 'bg-white/10 hover:bg-white/20 text-white border border-white/10',
  },
  {
    id: 'spotify',
    name: 'Spotify',
    icon: <FaSpotify className="w-5 h-5 text-[#1DB954]" />,
    color: 'bg-white/10 hover:bg-white/20 text-white border border-white/10',
  },
];

async function openOAuthPopup(
  providerId: string,
  stateTag: string = 'auth'
): Promise<{
  success: boolean;
  accessToken?: string;
  userId?: string;
  username?: string;
  displayName?: string;
  email?: string;
  profileData?: any;
  error?: string;
}> {
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
    case 'tiktok': {
      const tiktokClientKey = import.meta.env.VITE_TIKTOK_CLIENT_KEY || '';
      authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${tiktokClientKey}&scope=user.info.basic&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
      break;
    }
    case 'youtube': {
      const youtubeClientId = import.meta.env.VITE_GOOGLE_YOUTUBE_CLIENT_ID || '';
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${youtubeClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=https://www.googleapis.com/auth/youtube.readonly%20openid%20email%20profile&response_type=code&state=${state}&access_type=offline&prompt=consent`;
      break;
    }
    case 'spotify': {
      const spotifyClientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';
      authUrl = `https://accounts.spotify.com/authorize?client_id=${spotifyClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user-read-private%20user-read-email&response_type=code&state=${state}`;
      break;
    }
    case 'discord': {
      const discordClientId = import.meta.env.VITE_DISCORD_CLIENT_ID || '';
      authUrl = `https://discord.com/oauth2/authorize?client_id=${discordClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=identify%20email&response_type=code&state=${state}`;
      break;
    }
    case 'twitch': {
      const twitchClientId = import.meta.env.VITE_TWITCH_CLIENT_ID || '';
      authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${twitchClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:read:email&response_type=code&state=${state}`;
      break;
    }
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
      try {
        popup?.close();
      } catch {
        /* noop */
      }
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
      } catch {
        /* noop */
      }
    }, 500);
  });
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [, setLocation] = useLocation();
  const {
    login,
    loginWithCallback,
    confirmAccountLink,
    linkRequired,
    clearLinkRequired,
    isLoading,
    error,
  } = useAuth();
  const { toast } = useToast();
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [pendingLinkData, setPendingLinkData] = useState<{
    provider: string;
    callbackData: any;
  } | null>(null);
  const [isLinking, setIsLinking] = useState(false);

  if (!isOpen) return null;

  const busy = isLoading || loadingProvider !== null;

  const handleGoogleLogin = async () => {
    setLoadingProvider('google');
    try {
      await login('google');
    } catch (err: any) {
      toast({
        title: 'Login Failed',
        description: err.message || 'Failed to connect with Google',
        variant: 'destructive',
      });
      setLoadingProvider(null);
    }
  };

  const handleSocialLogin = async (providerId: string) => {
    if (providerId === 'google') return handleGoogleLogin();
    setLoadingProvider(providerId);

    try {
      let result: any;

      switch (providerId) {
        case 'twitter':
          result = await TwitterSDKManager.secureLogin('auth');
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
          result = await FacebookSDKManager.secureLogin('fan');
          if (result.success && result.user) {
            result = {
              success: true,
              accessToken: result.accessToken,
              userId: result.user.id,
              username: result.user.name,
              displayName: result.user.name,
              email: result.user.email,
              profileData: { picture: result.user.picture },
            };
          }
          break;
        case 'tiktok':
        case 'youtube':
        case 'spotify':
        case 'discord':
        case 'twitch':
          result = await openOAuthPopup(providerId, 'auth');
          break;
        default:
          throw new Error(`Provider ${providerId} not configured`);
      }

      if (result.success) {
        const authResult = await loginWithCallback(providerId, {
          access_token: result.accessToken,
          platform_user_id: result.userId || result.platformUserId,
          email: result.email,
          username: result.username,
          display_name: result.displayName,
          profile_data: result.profileData || {},
        });

        if (authResult.success) {
          toast({ title: 'Welcome!', description: `Signed in with ${providerId}` });
          onClose();
          const redirectUrl = getPostAuthRedirect(authResult.user, authResult.isNewUser || false);
          setLocation(redirectUrl);
        } else if (authResult.linkRequired) {
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
      toast({
        title: 'Login Failed',
        description: err.message || `Failed to connect with ${providerId}`,
        variant: 'destructive',
      });
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleConfirmLink = async () => {
    if (!pendingLinkData || !linkRequired) return;
    setIsLinking(true);
    try {
      const result = await confirmAccountLink(
        linkRequired.pendingLinkId,
        pendingLinkData.provider,
        pendingLinkData.callbackData
      );
      if (!result.success) throw new Error(result.message || 'Failed to link accounts');
      toast({ title: 'Account Linked', description: 'Your accounts have been linked successfully.' });
      setPendingLinkData(null);
      onClose();
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

  const showLinkConfirmation = pendingLinkData && linkRequired;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={showLinkConfirmation ? undefined : onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-[420px] bg-gradient-to-b from-[#1e1e3a] to-[#13132b] rounded-3xl shadow-[0_0_80px_rgba(139,92,246,0.15)] border border-white/[0.08] overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-brand-primary/20 rounded-full blur-[100px] pointer-events-none" />

        {/* Close */}
        <button
          onClick={showLinkConfirmation ? handleCancelLink : onClose}
          className="absolute top-5 right-5 p-1.5 text-gray-500 hover:text-white transition-colors rounded-full hover:bg-white/10 z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {showLinkConfirmation ? (
          /* ── Account Linking ── */
          <div className="relative px-8 py-10">
            <div className="text-center mb-6">
              <div className="mx-auto w-14 h-14 bg-amber-500/15 rounded-2xl flex items-center justify-center mb-4 border border-amber-500/20">
                <svg className="w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Account Found</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                An account with this email exists via{' '}
                <span className="text-white font-medium">
                  {linkRequired.existingProviders.join(', ')}
                </span>
                . Link your{' '}
                <span className="text-white font-medium capitalize">{pendingLinkData.provider}</span>{' '}
                account?
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleConfirmLink}
                disabled={isLinking}
                className="w-full h-12 bg-brand-primary hover:bg-brand-primary/80 text-white font-semibold rounded-2xl transition-all"
              >
                {isLinking && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {isLinking ? 'Linking...' : 'Link Accounts'}
              </Button>
              <Button
                onClick={handleCancelLink}
                disabled={isLinking}
                variant="ghost"
                className="w-full h-12 text-gray-400 hover:text-white hover:bg-white/5 rounded-2xl"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          /* ── Sign In ── */
          <div className="relative px-8 py-10">
            {/* Header */}
            <div className="text-center mb-8">
              <img src="/fandomly2.png" alt="Fandomly" className="h-10 mx-auto mb-5 opacity-90" />
              <h2 className="text-[22px] font-bold text-white tracking-tight">Welcome back</h2>
              <p className="text-gray-400 text-sm mt-1.5">
                Sign in to earn rewards and support creators
              </p>
            </div>

            {/* Provider Grid — 2x2 for primary */}
            <div className="grid grid-cols-2 gap-2.5 mb-3">
              {primaryProviders.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSocialLogin(p.id)}
                  disabled={busy}
                  className={`${p.color} h-12 rounded-2xl flex items-center justify-center gap-2.5 text-sm font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]`}
                >
                  {loadingProvider === p.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    p.icon
                  )}
                  <span>{p.name}</span>
                </button>
              ))}
            </div>

            {/* Expand more */}
            <button
              onClick={() => setShowMore(!showMore)}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              {showMore ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Fewer options</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>More options</span>
                </>
              )}
            </button>

            {/* More providers — same grid */}
            {showMore && (
              <div className="grid grid-cols-2 gap-2.5 mt-1 mb-3 animate-in fade-in slide-in-from-top-2 duration-200">
                {moreProviders.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSocialLogin(p.id)}
                    disabled={busy}
                    className={`${p.color} h-12 rounded-2xl flex items-center justify-center gap-2.5 text-sm font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]`}
                  >
                    {loadingProvider === p.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      p.icon
                    )}
                    <span>{p.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl mt-4">
                <p className="text-sm text-red-400 text-center">{error}</p>
              </div>
            )}

            {/* Footer */}
            <div className="mt-6 pt-5 border-t border-white/[0.06]">
              <p className="text-[11px] text-gray-600 text-center leading-relaxed">
                By continuing, you agree to our{' '}
                <button onClick={() => { onClose(); setLocation('/terms-of-service'); }} className="text-gray-500 hover:text-white underline underline-offset-2 transition-colors">
                  Terms of Service
                </button>{' '}
                and{' '}
                <button onClick={() => { onClose(); setLocation('/privacy-policy'); }} className="text-gray-500 hover:text-white underline underline-offset-2 transition-colors">
                  Privacy Policy
                </button>
              </p>
              <p className="text-[11px] text-gray-600 text-center mt-2">
                A crypto wallet will be created automatically for you
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
