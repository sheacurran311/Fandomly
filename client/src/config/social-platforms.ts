/**
 * Centralized social platform configuration — single source of truth.
 *
 * Previously duplicated across:
 *   - pages/creator-dashboard.tsx (8 platforms, icon components + colors)
 *   - components/program/platform-connection-priority.tsx (10 platforms, full styling)
 *   - pages/creator-dashboard/program-builder.tsx (Set of 10 IDs)
 */
import type { ComponentType } from 'react';
import { Twitter, Instagram, Facebook, Music } from 'lucide-react';
import { FaDiscord, FaTwitch, FaSpotify, FaTiktok, FaYoutube } from 'react-icons/fa';
import { SiKick } from 'react-icons/si';

export interface SocialPlatformConfig {
  id: string;
  name: string;
  /** Render with <Icon className="..." /> */
  icon: ComponentType<{ className?: string }>;
  /** Simple text-color utility for icon, e.g. 'text-blue-500' */
  color: string;
  /** Background class for icon container */
  iconBgClass: string;
  /** Text-color class for icon in styled contexts */
  iconColorClass: string;
  /** Button border class */
  buttonBorderClass: string;
  /** Button text class */
  buttonTextClass: string;
  /** Button hover class */
  buttonHoverClass: string;
}

export const SOCIAL_PLATFORMS: Record<string, SocialPlatformConfig> = {
  twitter: {
    id: 'twitter',
    name: 'Twitter / X',
    icon: Twitter,
    color: 'text-gray-400',
    iconBgClass: 'bg-blue-500/20',
    iconColorClass: 'text-blue-400',
    buttonBorderClass: 'border-blue-500/30',
    buttonTextClass: 'text-blue-400',
    buttonHoverClass: 'hover:bg-blue-500/10',
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    color: 'text-pink-500',
    iconBgClass: 'bg-pink-500/20',
    iconColorClass: 'text-pink-400',
    buttonBorderClass: 'border-pink-500/30',
    buttonTextClass: 'text-pink-400',
    buttonHoverClass: 'hover:bg-pink-500/10',
  },
  discord: {
    id: 'discord',
    name: 'Discord',
    icon: FaDiscord,
    color: 'text-indigo-400',
    iconBgClass: 'bg-purple-500/20',
    iconColorClass: 'text-purple-400',
    buttonBorderClass: 'border-purple-500/30',
    buttonTextClass: 'text-purple-400',
    buttonHoverClass: 'hover:bg-purple-500/10',
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    icon: Facebook,
    color: 'text-blue-500',
    iconBgClass: 'bg-blue-600/20',
    iconColorClass: 'text-blue-500',
    buttonBorderClass: 'border-blue-600/30',
    buttonTextClass: 'text-blue-500',
    buttonHoverClass: 'hover:bg-blue-600/10',
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    icon: FaTiktok,
    color: 'text-white',
    iconBgClass: 'bg-gray-800/50',
    iconColorClass: 'text-white',
    buttonBorderClass: 'border-gray-600/30',
    buttonTextClass: 'text-gray-300',
    buttonHoverClass: 'hover:bg-gray-600/10',
  },
  youtube: {
    id: 'youtube',
    name: 'YouTube',
    icon: FaYoutube,
    color: 'text-red-500',
    iconBgClass: 'bg-red-500/20',
    iconColorClass: 'text-red-500',
    buttonBorderClass: 'border-red-500/30',
    buttonTextClass: 'text-red-500',
    buttonHoverClass: 'hover:bg-red-500/10',
  },
  spotify: {
    id: 'spotify',
    name: 'Spotify',
    icon: FaSpotify,
    color: 'text-green-500',
    iconBgClass: 'bg-green-500/20',
    iconColorClass: 'text-green-400',
    buttonBorderClass: 'border-green-500/30',
    buttonTextClass: 'text-green-400',
    buttonHoverClass: 'hover:bg-green-500/10',
  },
  apple_music: {
    id: 'apple_music',
    name: 'Apple Music',
    icon: Music,
    color: 'text-pink-400',
    iconBgClass: 'bg-pink-400/20',
    iconColorClass: 'text-pink-400',
    buttonBorderClass: 'border-pink-400/30',
    buttonTextClass: 'text-pink-400',
    buttonHoverClass: 'hover:bg-pink-400/10',
  },
  twitch: {
    id: 'twitch',
    name: 'Twitch',
    icon: FaTwitch,
    color: 'text-purple-500',
    iconBgClass: 'bg-purple-600/20',
    iconColorClass: 'text-purple-500',
    buttonBorderClass: 'border-purple-600/30',
    buttonTextClass: 'text-purple-500',
    buttonHoverClass: 'hover:bg-purple-600/10',
  },
  kick: {
    id: 'kick',
    name: 'Kick',
    icon: SiKick,
    color: 'text-green-400',
    iconBgClass: 'bg-green-500/20',
    iconColorClass: 'text-green-400',
    buttonBorderClass: 'border-green-500/30',
    buttonTextClass: 'text-green-400',
    buttonHoverClass: 'hover:bg-green-500/10',
  },
};

/** Ordered array for iteration (dashboard cards, listings, etc.) */
export const SOCIAL_PLATFORMS_ARRAY: SocialPlatformConfig[] = [
  SOCIAL_PLATFORMS.twitter,
  SOCIAL_PLATFORMS.instagram,
  SOCIAL_PLATFORMS.discord,
  SOCIAL_PLATFORMS.facebook,
  SOCIAL_PLATFORMS.tiktok,
  SOCIAL_PLATFORMS.youtube,
  SOCIAL_PLATFORMS.spotify,
  SOCIAL_PLATFORMS.apple_music,
  SOCIAL_PLATFORMS.twitch,
  SOCIAL_PLATFORMS.kick,
];

/** Set of valid social platform IDs (for filtering out auth providers like 'google') */
export const PLATFORM_IDS = new Set(Object.keys(SOCIAL_PLATFORMS));
