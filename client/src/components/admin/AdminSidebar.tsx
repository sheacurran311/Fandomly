import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Store,
  Target,
  DollarSign,
  TrendingUp,
  Share2,
  Settings,
  Database,
  BarChart3,
  FileText,
  Shield,
  Zap,
  Image,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface AdminSidebarProps {
  className?: string;
}

const navigationSections = [
  {
    title: "Overview",
    items: [
      {
        title: "Dashboard",
        href: "/admin-dashboard/overview",
        icon: LayoutDashboard,
        description: "Platform overview and KPIs",
      },
      {
        title: "Analytics",
        href: "/admin-dashboard/analytics",
        icon: BarChart3,
        description: "Deep dive analytics",
      },
    ],
  },
  {
    title: "Users & Accounts",
    items: [
      {
        title: "All Users",
        href: "/admin-dashboard/users",
        icon: Users,
        description: "Fans, creators, and admins",
      },
      {
        title: "Creators",
        href: "/admin-dashboard/creators",
        icon: Store,
        description: "Creator accounts and tenants",
      },
      {
        title: "Fans",
        href: "/admin-dashboard/fans",
        icon: Users,
        description: "Fan accounts and activity",
      },
    ],
  },
  {
    title: "Platform Management",
    items: [
      {
        title: "Platform Tasks",
        href: "/admin-dashboard/platform-tasks",
        icon: Target,
        description: "Global tasks and rewards",
        badge: "Admin Only",
      },
      {
        title: "NFT Management",
        href: "/admin-dashboard/nft-management",
        icon: Image,
        description: "Badges and platform NFTs",
      },
      {
        title: "Referrals",
        href: "/admin-dashboard/referrals",
        icon: Share2,
        description: "Referral tracking and payouts",
      },
      {
        title: "Revenue",
        href: "/admin-dashboard/revenue",
        icon: DollarSign,
        description: "Platform revenue and payouts",
      },
    ],
  },
  {
    title: "Data & Reports",
    items: [
      {
        title: "Reports",
        href: "/admin-dashboard/reports",
        icon: FileText,
        description: "Generate custom reports",
      },
      {
        title: "Database",
        href: "/admin-dashboard/database",
        icon: Database,
        description: "Direct database access",
      },
      {
        title: "Trends",
        href: "/admin-dashboard/trends",
        icon: TrendingUp,
        description: "Growth and engagement trends",
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        title: "Settings",
        href: "/admin-dashboard/settings",
        icon: Settings,
        description: "Platform configuration",
      },
      {
        title: "Permissions",
        href: "/admin-dashboard/permissions",
        icon: Shield,
        description: "Role and access management",
      },
      {
        title: "System Health",
        href: "/admin-dashboard/system",
        icon: Zap,
        description: "Performance and monitoring",
      },
    ],
  },
];

export function AdminSidebar({ className }: AdminSidebarProps) {
  const [location] = useLocation();

  return (
    <div className={cn("flex flex-col h-full bg-brand-dark-purple/30 border-r border-white/10", className)}>
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-primary to-purple-600 flex items-center justify-center">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Fandomly Admin</h2>
            <p className="text-xs text-gray-400">Platform Control</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {navigationSections.map((section) => (
          <div key={section.title} className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = location === item.href;
                const Icon = item.icon;
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group",
                      isActive
                        ? "bg-brand-primary text-white"
                        : "text-gray-300 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <Icon className={cn(
                      "h-4 w-4 flex-shrink-0",
                      isActive ? "text-white" : "text-gray-400 group-hover:text-white"
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{item.title}</span>
                        {item.badge && (
                          <Badge variant="outline" className="text-xs border-brand-primary/50 text-brand-primary">
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                      {!isActive && (
                        <p className="text-xs text-gray-500 group-hover:text-gray-400 truncate">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-yellow-400">Admin Access</p>
              <p className="text-xs text-gray-400 mt-0.5">
                You have full platform control
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

