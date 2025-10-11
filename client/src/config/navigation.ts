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
  type LucideIcon
} from "lucide-react";

export interface NavigationItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  color?: string;
  showInBottomNav?: boolean;
}

export const creatorNavItems: NavigationItem[] = [
  { label: "Overview", href: "/creator-dashboard", icon: Home, showInBottomNav: true },
  { label: "Analytics", href: "/creator-dashboard/analytics", icon: BarChart3, color: "text-blue-400", showInBottomNav: true },
  { label: "Fans", href: "/creator-dashboard/fans", icon: Users, color: "text-green-400" },
  { label: "Growth", href: "/creator-dashboard/growth", icon: TrendingUp, color: "text-purple-400", showInBottomNav: true },
  { label: "Revenue", href: "/creator-dashboard/revenue", icon: DollarSign, color: "text-yellow-400" },
  { label: "Rewards", href: "/creator-dashboard/rewards", icon: Gift, color: "text-emerald-400" },
  { label: "Campaigns", href: "/creator-dashboard/campaigns", icon: Megaphone, color: "text-orange-400" },
  { label: "Tasks", href: "/creator-dashboard/tasks", icon: CheckSquare, color: "text-indigo-400" },
  { label: "Social Accounts", href: "/creator-dashboard/social", icon: Instagram, color: "text-pink-400", showInBottomNav: true },
  { label: "Profile", href: "/profile", icon: User, showInBottomNav: true },
  { label: "Settings", href: "/creator-dashboard/settings", icon: Settings },
];

export const fanNavItems: NavigationItem[] = [
  { label: "Overview", href: "/fan-dashboard", icon: Home, showInBottomNav: true },
  { label: "Profile", href: "/fan-profile", icon: User, showInBottomNav: true },
  { label: "Creators", href: "/fan-dashboard/following", icon: Users, color: "text-brand-primary", showInBottomNav: true },
  { label: "Tasks", href: "/fan-dashboard/tasks", icon: Target, color: "text-brand-accent", showInBottomNav: true },
  { label: "Campaigns", href: "/fan-dashboard/campaigns", icon: Trophy, color: "text-yellow-400", showInBottomNav: true },
  { label: "Social Accounts", href: "/fan-dashboard/social", icon: Instagram, color: "text-pink-400" },
  { label: "Achievements", href: "/fan-dashboard/achievements", icon: Star, color: "text-purple-400" },
  { label: "Points", href: "/fan-dashboard/points", icon: CreditCard, color: "text-green-400" },
  { label: "Notifications", href: "/fan-dashboard/notifications", icon: Bell, color: "text-blue-400" },
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
