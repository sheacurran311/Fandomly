import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  DollarSign, 
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
  ChevronLeft,
  ChevronRight
} from "lucide-react";

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  color?: string;
}

interface SidebarNavigationProps {
  userType: "creator" | "fan";
  className?: string;
}

const creatorItems: SidebarItem[] = [
  { label: "Overview", href: "/creator-dashboard", icon: Home },
  { label: "Analytics", href: "/creator-dashboard/analytics", icon: BarChart3, color: "text-blue-400" },
  { label: "Fans", href: "/creator-dashboard/fans", icon: Users, color: "text-green-400" },
  { label: "Growth", href: "/creator-dashboard/growth", icon: TrendingUp, color: "text-purple-400" },
  { label: "Revenue", href: "/creator-dashboard/revenue", icon: DollarSign, color: "text-yellow-400" },
  { label: "Campaigns", href: "/creator-dashboard/campaigns", icon: Megaphone, color: "text-orange-400" },
  { label: "Social Accounts", href: "/creator-dashboard/social", icon: Instagram, color: "text-pink-400" },
  { label: "Profile", href: "/creator-dashboard/profile", icon: User },
  { label: "Settings", href: "/creator-dashboard/settings", icon: Settings },
];

const fanItems: SidebarItem[] = [
  { label: "Overview", href: "/fan-dashboard", icon: Home },
  { label: "Profile", href: "/fan-dashboard/profile", icon: User },
  { label: "Following", href: "/fan-dashboard/following", icon: Heart, color: "text-red-400" },
  { label: "Campaigns", href: "/fan-dashboard/campaigns", icon: Trophy, color: "text-yellow-400" },
  { label: "Rewards", href: "/fan-dashboard/rewards", icon: Star, color: "text-purple-400" },
  { label: "Points", href: "/fan-dashboard/points", icon: CreditCard, color: "text-green-400" },
  { label: "Notifications", href: "/fan-dashboard/notifications", icon: Bell, color: "text-blue-400" },
  { label: "Settings", href: "/fan-dashboard/settings", icon: Settings },
];

export default function SidebarNavigation({ userType, className }: SidebarNavigationProps) {
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const items = userType === "creator" ? creatorItems : fanItems;

  return (
    <div className={cn(
      "flex flex-col bg-brand-dark-purple/30 backdrop-blur-lg border-r border-white/10 transition-all duration-300",
      isCollapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        {!isCollapsed && (
          <div>
            <h2 className="text-lg font-bold text-white">
              {userType === "creator" ? "Creator Hub" : "Fan Zone"}
            </h2>
            <p className="text-sm text-gray-400 capitalize">{userType} Dashboard</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-gray-400 hover:text-white hover:bg-white/10"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-2 space-y-1">
        {items.map((item) => {
          const isActive = location === item.href || (item.href !== `/${userType}-dashboard` && location.startsWith(item.href));
          const Icon = item.icon;
          
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group cursor-pointer",
                  isActive
                    ? "bg-brand-primary text-white shadow-lg"
                    : "text-gray-300 hover:text-white hover:bg-white/10",
                  isCollapsed && "justify-center"
                )}
              >
                <Icon 
                  className={cn(
                    "flex-shrink-0 h-5 w-5",
                    isActive ? "text-white" : (item.color || "text-gray-400"),
                    !isCollapsed && "mr-3"
                  )} 
                />
                {!isCollapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-brand-secondary/20 text-brand-secondary rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-white/10">
        {!isCollapsed ? (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                Your Account
              </p>
              <p className="text-xs text-gray-400 truncate capitalize">
                {userType}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-8 h-8 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}