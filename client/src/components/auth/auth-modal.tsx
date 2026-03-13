/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ⛔ SOCIAL AUTH — CONSUMER ONLY, NOT A SOURCE OF TRUTH
 * See rule: .cursor/rules/social-auth-single-source.mdc
 *
 * This file IMPORTS social auth from source-of-truth modules. It must NEVER
 * define its own OAuth URLs, scopes, popup logic, or postMessage handling.
 * To fix a social auth bug, fix it in the source file (twitter.ts,
 * facebook.ts, or social-integrations.ts), NOT here.
 */
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
import { SiKick } from 'react-icons/si';
import { TwitterSDKManager } from '@/lib/twitter';
import { FacebookSDKManager } from '@/lib/facebook';
import {
  TikTokAPI,
  YouTubeAPI,
  SpotifyAPI,
  DiscordAPI,
  TwitchAPI,
} from '@/lib/social-integrations';
import { KickAPI } from '@/lib/kick';
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
    id: 'kick',
    name: 'Kick',
    icon: <SiKick className="w-5 h-5 text-[#53FC18]" />,
    color: 'bg-white/10 hover:bg-white/20 text-white border border-white/10',
  },
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

// Reuse the single configured instances from social-integrations.ts
const tiktokApi = new TikTokAPI();
const youtubeApi = new YouTubeAPI();
const spotifyApi = new SpotifyAPI();
const discordApi = new DiscordAPI();
const twitchApi = new TwitchAPI();
const kickApi = new KickAPI();

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
      // Each provider uses its single configured API class from social-integrations.ts.
      // secureLogin() handles popup, postMessage, COOP fallback, and timeouts.
      // The callback pages exchange the code, fetch user data, save the connection,
      // and post the full result back to the opener.
      const popupResult: any = await (async () => {
        switch (providerId) {
          case 'twitter':
            return TwitterSDKManager.secureLogin('auth');
          case 'facebook':
            return FacebookSDKManager.secureLogin('auth');
          case 'tiktok':
            return tiktokApi.secureLogin('auth');
          case 'youtube':
            return youtubeApi.secureLogin('auth');
          case 'spotify':
            return spotifyApi.secureLogin('auth');
          case 'discord':
            return discordApi.secureLogin('auth');
          case 'twitch':
            return twitchApi.secureLogin('auth');
          case 'kick':
            return kickApi.secureLogin('auth');
          default:
            throw new Error(`Provider ${providerId} not configured`);
        }
      })();

      if (!popupResult.success) {
        throw new Error(popupResult.error || `Failed to connect with ${providerId}`);
      }

      // Normalize the result shape — each provider's secureLogin/callback returns
      // slightly different field names. Map to the flat shape loginWithCallback expects.
      let accessToken: string | undefined;
      let platformUserId: string | undefined;
      let username: string | undefined;
      let displayName: string | undefined;
      let email: string | undefined;
      let profileData: any = {};

      if (providerId === 'twitter') {
        accessToken = popupResult.accessToken;
        platformUserId = popupResult.user?.id;
        username = popupResult.user?.username;
        displayName = popupResult.user?.name || popupResult.user?.username;
        profileData = {
          profileImageUrl: popupResult.user?.profileImageUrl,
          followersCount: popupResult.user?.followersCount,
          followingCount: popupResult.user?.followingCount,
        };
      } else if (providerId === 'facebook') {
        accessToken = popupResult.accessToken;
        platformUserId = popupResult.user?.id;
        username = popupResult.user?.name;
        displayName = popupResult.user?.name;
        email = popupResult.user?.email;
        profileData = { picture: popupResult.user?.picture };
      } else {
        // TikTok, YouTube, Spotify, Discord, Twitch —
        // Their callback pages post back: { success, accessToken, userId, username, displayName, email, profileData }
        accessToken = popupResult.accessToken;
        platformUserId = popupResult.userId || popupResult.platformUserId;
        username = popupResult.username;
        displayName = popupResult.displayName || popupResult.channelName;
        email = popupResult.email;
        profileData = popupResult.profileData || {};
      }

      if (!accessToken || !platformUserId) {
        throw new Error(`${providerId} auth completed but returned incomplete data`);
      }

      const authResult = await loginWithCallback(providerId, {
        access_token: accessToken,
        platform_user_id: platformUserId,
        email,
        username,
        display_name: displayName,
        profile_data: profileData,
      });

      if (authResult.success) {
        toast({ title: 'Welcome!', description: `Signed in with ${providerId}` });
        onClose();
        const redirectUrl = getPostAuthRedirect(authResult.user, authResult.isNewUser || false);
        setLocation(redirectUrl);
      } else if (authResult.linkRequired) {
        console.log('[Auth Modal] Account linking required — showing link confirmation dialog');
        setPendingLinkData({
          provider: providerId,
          callbackData: {
            access_token: accessToken,
            platform_user_id: platformUserId,
            email,
            username,
            display_name: displayName,
            profile_data: profileData,
          },
        });
      } else {
        console.warn('[Auth Modal] Unexpected auth result:', authResult);
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
      toast({
        title: 'Account Linked',
        description: 'Your accounts have been linked successfully.',
      });
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

  if (showLinkConfirmation) {
    console.log('[Auth Modal] Rendering link confirmation UI', {
      provider: pendingLinkData.provider,
      existingProviders: linkRequired.existingProviders,
    });
  }

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
                <svg
                  className="w-7 h-7 text-amber-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Account Found</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                An account with this email exists via{' '}
                <span className="text-white font-medium">
                  {linkRequired.existingProviders.join(', ')}
                </span>
                . Link your{' '}
                <span className="text-white font-medium capitalize">
                  {pendingLinkData.provider}
                </span>{' '}
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
              <img
                src="/fandomly-logo-white-fuchsia.png"
                alt="Fandomly"
                className="h-8 sm:h-10 w-auto max-w-[160px] mx-auto mb-5 opacity-90 object-contain"
              />
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
                  {loadingProvider === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : p.icon}
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
                <button
                  onClick={() => {
                    onClose();
                    setLocation('/terms-of-service');
                  }}
                  className="text-gray-500 hover:text-white underline underline-offset-2 transition-colors"
                >
                  Terms of Service
                </button>{' '}
                and{' '}
                <button
                  onClick={() => {
                    onClose();
                    setLocation('/privacy-policy');
                  }}
                  className="text-gray-500 hover:text-white underline underline-offset-2 transition-colors"
                >
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
