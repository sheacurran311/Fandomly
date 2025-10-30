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
  Heart,
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
  type LucideIcon
} from "lucide-react";

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

export const creatorNavItems: NavigationItem[] = [
  { label: "Overview", href: "/creator-dashboard", icon: Home, showInBottomNav: true },
  { 
    label: "Analytics", 
    href: "/creator-dashboard/analytics", 
    icon: BarChart3, 
    color: "text-blue-400", 
    showInBottomNav: true,
    submenu: [
      { label: "Overview", href: "/creator-dashboard/analytics", icon: BarChart3, color: "text-blue-400" },
      { label: "Growth", href: "/creator-dashboard/growth", icon: TrendingUp, color: "text-purple-400" },
      { label: "Revenue", href: "/creator-dashboard/revenue", icon: DollarSign, color: "text-yellow-400" },
    ]
  },
  { 
    label: "Loyalty Manager", 
    href: "/creator-dashboard/program-builder", 
    icon: Layers, 
    color: "text-brand-primary",
    submenu: [
      { label: "Program Builder", href: "/creator-dashboard/program-builder", icon: Layers, color: "text-brand-primary" },
      { label: "Campaigns", href: "/creator-dashboard/campaigns", icon: Megaphone, color: "text-orange-400" },
      { label: "Tasks", href: "/creator-dashboard/tasks", icon: CheckSquare, color: "text-indigo-400" },
    ]
  },
  { 
    label: "Rewards", 
    href: "/creator-dashboard/rewards", 
    icon: Gift, 
    color: "text-emerald-400",
    submenu: [
      { label: "Overview", href: "/creator-dashboard/rewards", icon: Gift, color: "text-emerald-400" },
      { label: "NFT Collections", href: "/creator-dashboard/nft-collections", icon: Image, color: "text-purple-400" },
    ]
  },
  { label: "Social Accounts", href: "/creator-dashboard/social", icon: Instagram, color: "text-pink-400", showInBottomNav: true },
  { label: "Activity", href: "/creator-dashboard/activity", icon: Activity, color: "text-cyan-400" },
  { label: "Fans", href: "/creator-dashboard/fans", icon: Users, color: "text-green-400" },
  { label: "Profile", href: "/profile", icon: User, showInBottomNav: true },
  { label: "Settings", href: "/creator-dashboard/settings", icon: Settings },
];

export const fanNavItems: NavigationItem[] = [
  { label: "Overview", href: "/fan-dashboard", icon: Home, showInBottomNav: true },
  { label: "Creators", href: "/fan-dashboard/following", icon: Users, color: "text-brand-primary", showInBottomNav: true },
  { label: "Tasks", href: "/fan-dashboard/tasks", icon: Target, color: "text-brand-accent", showInBottomNav: true },
  { label: "Campaigns", href: "/fan-dashboard/campaigns", icon: Trophy, color: "text-yellow-400", showInBottomNav: true },
  { label: "Social Accounts", href: "/fan-dashboard/social", icon: Instagram, color: "text-pink-400" },
  { 
    label: "Rewards", 
    href: "/fan-dashboard/achievements", 
    icon: Gift, 
    color: "text-emerald-400",
    submenu: [
      { label: "Achievements", href: "/fan-dashboard/achievements", icon: Star, color: "text-purple-400" },
      { label: "Points", href: "/fan-dashboard/points", icon: CreditCard, color: "text-green-400" },
      { label: "My NFTs", href: "/fan-dashboard/nfts", icon: Image, color: "text-purple-400" },
    ]
  },
  { label: "Notifications", href: "/fan-dashboard/notifications", icon: Bell, color: "text-blue-400" },
  { label: "Profile", href: "/fan-profile", icon: User, showInBottomNav: true },
  { label: "Settings", href: "/fan-dashboard/settings", icon: Settings },
];

export const nilNavItem: NavigationItem = {
  label: "NIL Dashboard",
  href: "/creator-dashboard/nil",
  icon: Shield,
  color: "text-purple-400"
};

export const getNavigationItems = (
  userType: "creator" | "fan",
  isNILAthlete = false
): NavigationItem[] => {
  if (userType === "creator") {
    if (isNILAthlete) {
      const items = [...creatorNavItems];
      items.splice(items.length - 2, 0, nilNavItem);
      return items;
    }
    return creatorNavItems;
  }
  return fanNavItems;
};

export const getBottomNavItems = (
  userType: "creator" | "fan",
  isNILAthlete = false
): NavigationItem[] => {
  if (userType === "creator") {
    // For creators: Dashboard, Analytics, (+) Button, Social Accounts, Profile
    return [
      { label: "Overview", href: "/creator-dashboard", icon: Home, showInBottomNav: true },
      { label: "Analytics", href: "/creator-dashboard/analytics", icon: BarChart3, color: "text-blue-400", showInBottomNav: true },
      { 
        label: "Create", 
        href: "#", 
        icon: Plus, 
        color: "text-white", 
        showInBottomNav: true, 
        isCreateButton: true,
        submenu: [
          { label: "Campaigns", href: "/creator-dashboard/campaigns", icon: Megaphone, color: "text-orange-400" },
          { label: "Tasks", href: "/creator-dashboard/tasks", icon: CheckSquare, color: "text-indigo-400" },
          { label: "Rewards", href: "/creator-dashboard/rewards", icon: Gift, color: "text-emerald-400" },
        ]
      },
      { label: "Social Accounts", href: "/creator-dashboard/social", icon: Instagram, color: "text-pink-400", showInBottomNav: true },
      { label: "Profile", href: "/profile", icon: User, showInBottomNav: true },
    ];
  }
  
  const allItems = getNavigationItems(userType, isNILAthlete);
  return allItems.filter(item => item.showInBottomNav);
};

export const getOverflowNavItems = (
  userType: "creator" | "fan",
  isNILAthlete = false
): NavigationItem[] => {
  const allItems = getNavigationItems(userType, isNILAthlete);
  return allItems.filter(item => !item.showInBottomNav);
};
