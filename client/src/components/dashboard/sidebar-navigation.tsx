import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { FacebookSDKManager, FacebookPage } from "@/lib/facebook";
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
  ChevronLeft,
  ChevronRight,
  Shield,
  Facebook,
  Plus,
  MoreHorizontal,
  CheckSquare
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
  isNILAthlete?: boolean;
}

const creatorItems: SidebarItem[] = [
  { label: "Overview", href: "/creator-dashboard", icon: Home },
  { label: "Analytics", href: "/creator-dashboard/analytics", icon: BarChart3, color: "text-blue-400" },
  { label: "Fans", href: "/creator-dashboard/fans", icon: Users, color: "text-green-400" },
  { label: "Growth", href: "/creator-dashboard/growth", icon: TrendingUp, color: "text-purple-400" },
  { label: "Revenue", href: "/creator-dashboard/revenue", icon: DollarSign, color: "text-yellow-400" },
  { label: "Rewards", href: "/creator-dashboard/rewards", icon: Gift, color: "text-emerald-400" },
  { label: "Campaigns", href: "/creator-dashboard/campaigns", icon: Megaphone, color: "text-orange-400" },
  { label: "Tasks", href: "/creator-dashboard/tasks", icon: CheckSquare, color: "text-indigo-400" },
  { label: "Social Accounts", href: "/creator-dashboard/social", icon: Instagram, color: "text-pink-400" },
  { label: "Profile", href: "/profile", icon: User },
  { label: "Settings", href: "/creator-dashboard/settings", icon: Settings },
];

const fanItems: SidebarItem[] = [
  { label: "Overview", href: "/fan-dashboard", icon: Home },
  { label: "Profile", href: "/fan-profile", icon: User },
  { label: "Following", href: "/fan-dashboard/following", icon: Heart, color: "text-red-400" },
  { label: "Campaigns", href: "/fan-dashboard/campaigns", icon: Trophy, color: "text-yellow-400" },
  { label: "Social Accounts", href: "/fan-dashboard/social", icon: Instagram, color: "text-pink-400" },
  { label: "Achievements", href: "/fan-dashboard/achievements", icon: Star, color: "text-purple-400" },
  { label: "Points", href: "/fan-dashboard/points", icon: CreditCard, color: "text-green-400" },
  { label: "Notifications", href: "/fan-dashboard/notifications", icon: Bell, color: "text-blue-400" },
  { label: "Settings", href: "/fan-dashboard/settings", icon: Settings },
];

export default function SidebarNavigation({ userType, className, isNILAthlete = false }: SidebarNavigationProps) {
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { toast } = useToast();
  
  // Facebook page state for creators
  const [facebookConnected, setFacebookConnected] = useState(false);
  const [facebookPages, setFacebookPages] = useState<FacebookPage[]>([]);
  const [activePage, setActivePage] = useState<FacebookPage | null>(null);
  const [showPageModal, setShowPageModal] = useState(false);
  const [isLoadingFacebook, setIsLoadingFacebook] = useState(false);
  
  // Add NIL dashboard for athletes
  const creatorItemsWithNIL = isNILAthlete 
    ? [...creatorItems.slice(0, -2), { label: "NIL Dashboard", href: "/creator-dashboard/nil", icon: Shield, color: "text-purple-400" }, ...creatorItems.slice(-2)]
    : creatorItems;
  
  const items = userType === "creator" ? creatorItemsWithNIL : fanItems;

  // Load Facebook status for creators
  useEffect(() => {
    if (userType === 'creator') {
      checkFacebookStatus();
    }
  }, [userType]);

  const checkFacebookStatus = async () => {
    try {
      setIsLoadingFacebook(true);
      await FacebookSDKManager.ensureFBReady('creator');
      const status = await FacebookSDKManager.getLoginStatus();
      
      if (status.isLoggedIn) {
        setFacebookConnected(true);
        await loadFacebookPages();
      } else {
        setFacebookConnected(false);
        setFacebookPages([]);
        setActivePage(null);
        localStorage.removeItem('fandomly_active_facebook_page_id'); // Clear saved page when not logged in
      }
    } catch (error) {
      console.error('Error checking Facebook status in sidebar:', error);
      setFacebookConnected(false);
    } finally {
      setIsLoadingFacebook(false);
    }
  };

  const loadFacebookPages = async () => {
    try {
      const pages = await FacebookSDKManager.getUserPages();
      setFacebookPages(pages);
      
      if (pages.length > 0) {
        const savedActivePageId = localStorage.getItem('fandomly_active_facebook_page_id');
        let pageToSet = pages.find(page => page.id === savedActivePageId) || pages[0];
        setActivePage(pageToSet);
        // Save to localStorage if we're setting a default page
        if (!savedActivePageId && pageToSet) {
          localStorage.setItem('fandomly_active_facebook_page_id', pageToSet.id);
        }
      }
    } catch (error) {
      console.error('Error loading Facebook pages in sidebar:', error);
      setFacebookPages([]);
      setActivePage(null);
    }
  };

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
          className="text-gray-400 hover:text-white hover:bg-brand-primary/60"
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
                    : "text-gray-300 hover:text-white hover:bg-brand-primary/60",
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

      {/* Facebook Page Widget for Creators */}
      {userType === 'creator' && facebookConnected && activePage && !isCollapsed && (
        <div className="p-3 mx-2 mb-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-blue-400 uppercase tracking-wider">
              Active Page
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
              onClick={() => setShowPageModal(true)}
              data-testid="button-sidebar-switch-page"
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={activePage.picture?.data?.url} alt={activePage.name} />
              <AvatarFallback className="bg-blue-500/20 text-blue-400 text-xs">
                {activePage.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">
                {activePage.name}
              </div>
              <div className="text-xs text-blue-400">
                {activePage.followers_count?.toLocaleString() || 0} followers
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Facebook Page Selection Modal */}
      <Dialog open={showPageModal} onOpenChange={setShowPageModal}>
        <DialogContent className="sm:max-w-md bg-brand-dark-bg border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Switch Active Page</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-sm text-gray-400 mb-4">
              Select which Facebook page to use for your campaigns.
            </div>
            
            {facebookPages.length > 0 ? (
              <div className="space-y-3">
                {facebookPages.map((page, index) => (
                  <div 
                    key={page.id} 
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      activePage?.id === page.id 
                        ? 'border-brand-primary bg-brand-primary/10' 
                        : 'border-white/20 hover:border-white/30 bg-white/5'
                    }`}
                    onClick={() => {
                      setActivePage(page);
                      localStorage.setItem('fandomly_active_facebook_page_id', page.id);
                      toast({
                        title: "Active Page Changed",
                        description: `"${page.name}" is now your active Facebook page.`,
                        duration: 3000
                      });
                      setShowPageModal(false);
                    }}
                    data-testid={`sidebar-facebook-page-${index}`}
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={page.picture?.data?.url} alt={page.name} />
                        <AvatarFallback className="bg-blue-500/20 text-blue-400">
                          {page.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <div className="text-white font-medium">{page.name}</div>
                          {activePage?.id === page.id && (
                            <Badge className="bg-brand-primary/20 text-brand-primary text-xs">
                              Active
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-400">
                          {page.category} • {page.followers_count?.toLocaleString() || 0} followers
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-400">
                No Facebook pages found.
              </div>
            )}
            
            <div className="flex gap-2 pt-4">
              <Button 
                onClick={() => setShowPageModal(false)}
                className="flex-1 bg-brand-primary hover:bg-brand-primary/80"
                data-testid="button-close-sidebar-page-modal"
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}