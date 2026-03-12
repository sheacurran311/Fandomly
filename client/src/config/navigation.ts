/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BarChart3,
  Users,
  TrendingUp,
  DollarSign,
  Gift,
  Megaphone,
  Instagram,
  User,
  Settings,
  Home,
  Trophy,
  Star,
  Bell,
  CreditCard,
  Target,
  CheckSquare,
  Shield,
  Layers,
  Activity,
  Plus,
  Image,
  Coins,
  Store,
  type LucideIcon,
} from 'lucide-react';
import { ROUTES } from './routes';

export interface NavigationItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  color?: string;
  showInBottomNav?: boolean;
  submenu?: NavigationItem[];
  isCreateButton?: boolean;
}

/**
 * Creator sidebar: 8 top-level items (down from 14).
 *
 * Consolidated:
 *   - Activity → Settings submenu
 *   - My Token + Reputation → Web3 submenu
 *   - Fandomly Tasks → Settings submenu ("Platform Tasks")
 *   - Profile → Settings submenu
 *   - Subscription → Settings submenu
 */
export const creatorNavItems: NavigationItem[] = [
  { label: 'Overview', href: ROUTES.CREATOR_DASHBOARD, icon: Home, showInBottomNav: true },
  {
    label: 'Analytics',
    href: ROUTES.CREATOR_ANALYTICS,
    icon: BarChart3,
    color: 'text-blue-400',
    showInBottomNav: true,
    submenu: [
      {
        label: 'Overview',
        href: ROUTES.CREATOR_ANALYTICS,
        icon: BarChart3,
        color: 'text-blue-400',
      },
      { label: 'Growth', href: ROUTES.CREATOR_GROWTH, icon: TrendingUp, color: 'text-purple-400' },
      {
        label: 'Revenue',
        href: ROUTES.CREATOR_REVENUE,
        icon: DollarSign,
        color: 'text-yellow-400',
      },
    ],
  },
  {
    label: 'Loyalty Manager',
    href: ROUTES.CREATOR_PROGRAM_BUILDER,
    icon: Layers,
    color: 'text-brand-primary',
    submenu: [
      {
        label: 'Program Builder',
        href: ROUTES.CREATOR_PROGRAM_BUILDER,
        icon: Layers,
        color: 'text-brand-primary',
      },
      {
        label: 'Campaigns',
        href: ROUTES.CREATOR_CAMPAIGNS,
        icon: Megaphone,
        color: 'text-orange-400',
      },
      { label: 'Tasks', href: ROUTES.CREATOR_TASKS, icon: CheckSquare, color: 'text-indigo-400' },
    ],
  },
  {
    label: 'Rewards',
    href: ROUTES.CREATOR_REWARDS,
    icon: Gift,
    color: 'text-emerald-400',
    submenu: [
      { label: 'Overview', href: ROUTES.CREATOR_REWARDS, icon: Gift, color: 'text-emerald-400' },
      {
        label: 'NFT Collections',
        href: ROUTES.CREATOR_NFT_COLLECTIONS,
        icon: Image,
        color: 'text-purple-400',
      },
    ],
  },
  { label: 'Fans', href: ROUTES.CREATOR_FANS, icon: Users, color: 'text-green-400' },
  {
    label: 'Social Accounts',
    href: ROUTES.CREATOR_SOCIAL,
    icon: Instagram,
    color: 'text-pink-400',
    showInBottomNav: true,
  },
  {
    label: 'Web3',
    href: ROUTES.CREATOR_TOKEN,
    icon: Coins,
    color: 'text-purple-400',
    submenu: [
      { label: 'My Token', href: ROUTES.CREATOR_TOKEN, icon: Coins, color: 'text-purple-400' },
      { label: 'Reputation', href: ROUTES.REPUTATION, icon: Shield, color: 'text-indigo-400' },
    ],
  },
  {
    label: 'Settings',
    href: ROUTES.CREATOR_SETTINGS,
    icon: Settings,
    submenu: [
      { label: 'Profile', href: ROUTES.PROFILE, icon: User },
      {
        label: 'Subscription',
        href: ROUTES.CREATOR_SUBSCRIPTIONS,
        icon: CreditCard,
        color: 'text-amber-400',
      },
      { label: 'Activity', href: ROUTES.CREATOR_ACTIVITY, icon: Activity, color: 'text-cyan-400' },
      {
        label: 'Platform Tasks',
        href: ROUTES.CREATOR_PLATFORM_TASKS,
        icon: Star,
        color: 'text-yellow-400',
      },
      { label: 'Account Settings', href: ROUTES.CREATOR_SETTINGS, icon: Settings },
    ],
  },
];

/**
 * Fan sidebar: 7 top-level items (down from 11).
 *
 * Consolidated:
 *   - Social Accounts → Settings submenu
 *   - Staking + Reputation → Web3 submenu
 *   - Notifications → Settings submenu
 *   - Profile → Settings submenu
 */
export const fanNavItems: NavigationItem[] = [
  { label: 'Overview', href: ROUTES.FAN_DASHBOARD, icon: Home, showInBottomNav: true },
  {
    label: 'Joined',
    href: ROUTES.FAN_JOINED,
    icon: Users,
    color: 'text-brand-primary',
    showInBottomNav: true,
  },
  {
    label: 'Tasks',
    href: ROUTES.FAN_TASKS,
    icon: Target,
    color: 'text-brand-accent',
    showInBottomNav: true,
  },
  {
    label: 'Campaigns',
    href: ROUTES.FAN_CAMPAIGNS,
    icon: Trophy,
    color: 'text-yellow-400',
    showInBottomNav: true,
  },
  {
    label: 'Rewards',
    href: ROUTES.FAN_ACHIEVEMENTS,
    icon: Gift,
    color: 'text-emerald-400',
    submenu: [
      {
        label: 'Rewards Store',
        href: ROUTES.FAN_REWARDS_STORE,
        icon: Store,
        color: 'text-brand-primary',
      },
      {
        label: 'Achievements',
        href: ROUTES.FAN_ACHIEVEMENTS,
        icon: Star,
        color: 'text-purple-400',
      },
      { label: 'Points', href: ROUTES.FAN_POINTS, icon: CreditCard, color: 'text-green-400' },
      { label: 'My NFTs', href: ROUTES.FAN_NFTS, icon: Image, color: 'text-purple-400' },
    ],
  },
  {
    label: 'Web3',
    href: ROUTES.STAKING,
    icon: Coins,
    color: 'text-emerald-400',
    submenu: [
      { label: 'Staking', href: ROUTES.STAKING, icon: Coins, color: 'text-emerald-400' },
      { label: 'Reputation', href: ROUTES.REPUTATION, icon: Shield, color: 'text-indigo-400' },
    ],
  },
  {
    label: 'Settings',
    href: ROUTES.FAN_SETTINGS,
    icon: Settings,
    submenu: [
      { label: 'Profile', href: ROUTES.FAN_PROFILE, icon: User },
      {
        label: 'Social Accounts',
        href: ROUTES.FAN_SOCIAL,
        icon: Instagram,
        color: 'text-pink-400',
      },
      {
        label: 'Notifications',
        href: ROUTES.FAN_NOTIFICATIONS,
        icon: Bell,
        color: 'text-blue-400',
      },
      { label: 'Account Settings', href: ROUTES.FAN_SETTINGS, icon: Settings },
    ],
  },
];

export const nilNavItem: NavigationItem = {
  label: 'NIL Dashboard',
  href: ROUTES.CREATOR_NIL,
  icon: Shield,
  color: 'text-purple-400',
};

export const getNavigationItems = (
  userType: 'creator' | 'fan',
  isNILAthlete = false
): NavigationItem[] => {
  if (userType === 'creator') {
    if (isNILAthlete) {
      const items = [...creatorNavItems];
      // Insert NIL item before Settings (last item)
      items.splice(items.length - 1, 0, nilNavItem);
      return items;
    }
    return creatorNavItems;
  }
  return fanNavItems;
};

export const getBottomNavItems = (
  userType: 'creator' | 'fan',
  isNILAthlete = false
): NavigationItem[] => {
  if (userType === 'creator') {
    // For creators: Dashboard, Analytics, (+) Button, Social Accounts, Profile
    return [
      { label: 'Overview', href: ROUTES.CREATOR_DASHBOARD, icon: Home, showInBottomNav: true },
      {
        label: 'Analytics',
        href: ROUTES.CREATOR_ANALYTICS,
        icon: BarChart3,
        color: 'text-blue-400',
        showInBottomNav: true,
      },
      {
        label: 'Create',
        href: '#',
        icon: Plus,
        color: 'text-white',
        showInBottomNav: true,
        isCreateButton: true,
        submenu: [
          {
            label: 'Campaigns',
            href: ROUTES.CREATOR_CAMPAIGNS,
            icon: Megaphone,
            color: 'text-orange-400',
          },
          {
            label: 'Tasks',
            href: ROUTES.CREATOR_TASKS,
            icon: CheckSquare,
            color: 'text-indigo-400',
          },
          { label: 'Rewards', href: ROUTES.CREATOR_REWARDS, icon: Gift, color: 'text-emerald-400' },
        ],
      },
      {
        label: 'Social Accounts',
        href: ROUTES.CREATOR_SOCIAL,
        icon: Instagram,
        color: 'text-pink-400',
        showInBottomNav: true,
      },
      { label: 'Profile', href: ROUTES.PROFILE, icon: User, showInBottomNav: true },
    ];
  }

  const allItems = getNavigationItems(userType, isNILAthlete);
  return allItems.filter((item) => item.showInBottomNav);
};

export const getOverflowNavItems = (
  userType: 'creator' | 'fan',
  isNILAthlete = false
): NavigationItem[] => {
  const allItems = getNavigationItems(userType, isNILAthlete);
  return allItems.filter((item) => !item.showInBottomNav);
};
