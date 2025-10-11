import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Menu, X, User, Settings, LogOut, ChevronDown, Shield } from "lucide-react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import ConnectWalletButton from "@/components/auth/connect-wallet-button";
import UserTypeSwitcher from "@/components/auth/user-type-switcher";
import { useAuth } from "@/hooks/use-auth";
import { useRBAC, RoleGuard } from "@/hooks/use-rbac";
import { transformImageUrl } from "@/lib/image-utils";
export default function Navigation() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { user: dynamicUser, handleLogOut } = useDynamicContext();
  const { user: userData, isAuthenticated, isLoading } = useAuth();
  const { isFandomlyAdmin, isCustomerAdmin } = useRBAC();



  const handleDisconnect = async () => {
    try {
      await handleLogOut();
      // Clear local storage
      localStorage.removeItem('userType');
      localStorage.removeItem('onboardingCompleted');
      // Redirect to home
      window.location.href = '/';
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  };

  return (
    <>
      <nav className="bg-brand-dark-purple/90 backdrop-blur-lg border-b border-brand-primary/20 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center">
                <img src="/fandomly2.png" alt="Fandomly" className="h-20 w-auto" />
              </Link>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              {!dynamicUser ? (
                // Non-authenticated users see marketing navigation
                <>
                  <Link href="/#features" className="text-gray-300 hover:text-brand-secondary transition-colors">
                    Features
                  </Link>
                  <Link href="/find-creators" className="text-gray-300 hover:text-brand-secondary transition-colors">
                    Find Creators
                  </Link>
                  <Link href="/#ideal-users" className="text-gray-300 hover:text-brand-secondary transition-colors">
                    Who It's For
                  </Link>
                </>
              ) : (
                // Authenticated users see simplified navigation
                <>
                  <Link href="/find-creators" className="text-gray-300 hover:text-brand-secondary transition-colors">
                    Find Creators
                  </Link>
                  <Link href="/marketplace" className="text-gray-300 hover:text-brand-secondary transition-colors">
                    Rewards Store
                  </Link>
                  {userData?.userType === 'creator' ? (
                        <Link href="/creator-dashboard" className="text-gray-300 hover:text-brand-secondary transition-colors">
                          Dashboard
                        </Link>
                      ) : (
                        <Link href="/fan-dashboard" className="text-gray-300 hover:text-brand-secondary transition-colors">
                          Dashboard
                        </Link>
                      )}
                    </>
                  )}
              {dynamicUser ? (
                <div className="flex items-center space-x-4">
                  {userData?.userType === 'creator' ? (
                    <Link href="/creator-dashboard">
                      <Button className="bg-brand-primary hover:bg-brand-primary/80 text-white px-6 py-2 rounded-xl font-semibold transition-all duration-200">
                        Dashboard
                      </Button>
                    </Link>
                  ) : (
                    <Link href="/fan-dashboard">
                      <Button className="bg-brand-primary hover:bg-brand-primary/80 text-white px-6 py-2 rounded-xl font-semibold transition-all duration-200">
                        Dashboard
                      </Button>
                    </Link>
                  )}
                  
                  {/* User Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="flex items-center space-x-2 text-white hover:text-brand-secondary">
                        <Avatar className="w-8 h-8" data-testid="img-nav-user-avatar">
                          <AvatarImage 
                            src={transformImageUrl(userData?.profileData?.avatar) || undefined} 
                            alt={userData?.profileData?.name || userData?.username || dynamicUser?.email || "User"} 
                          />
                          <AvatarFallback className="w-8 h-8 bg-brand-primary text-white text-sm font-bold">
                            {dynamicUser?.email?.[0] || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 bg-brand-dark-purple border-brand-primary/20">
                      <div className="px-2 py-1.5 text-sm text-gray-300">
                        <div className="font-medium text-white">
                          {dynamicUser?.email || "User"}
                        </div>
                        <div className="text-xs text-gray-400">
                          {dynamicUser?.verifiedCredentials?.[0]?.address?.slice(0, 8)}...{dynamicUser?.verifiedCredentials?.[0]?.address?.slice(-6)}
                        </div>
                      </div>
                      <DropdownMenuSeparator className="bg-brand-primary/20" />
                      {/* Role Dashboard removed - users use type-specific dashboards */}
                      <RoleGuard allowedRoles={['customer_admin']}>
                        <Link href="/nil-dashboard">
                          <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-brand-primary/60">
                            <Shield className="mr-2 h-4 w-4" />
                            NIL Dashboard
                          </DropdownMenuItem>
                        </Link>
                      </RoleGuard>
                      <Link href={userData?.userType === 'creator' ? '/profile' : '/fan-profile'}>
                        <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-brand-primary/60">
                          <User className="mr-2 h-4 w-4" />
                          Profile
                        </DropdownMenuItem>
                      </Link>
                      <Link href={userData?.userType === 'creator' ? '/creator-dashboard/settings' : '/fan-dashboard/settings'}>
                        <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-brand-primary/60">
                          <Settings className="mr-2 h-4 w-4" />
                          Settings
                        </DropdownMenuItem>
                      </Link>
                      <DropdownMenuSeparator className="bg-brand-primary/20" />
                      {userData && (
                        <div className="px-2 py-1">
                          <UserTypeSwitcher 
                            userId={userData.id}
                            currentUserType={userData.userType as "fan" | "creator"}
                          />
                        </div>
                      )}
                      <DropdownMenuSeparator className="bg-brand-primary/20" />
                      <DropdownMenuItem 
                        onClick={handleDisconnect}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Disconnect Wallet
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <ConnectWalletButton 
                  className="bg-brand-primary hover:bg-brand-primary/80 text-white font-medium px-6 py-2 rounded-xl transition-all duration-200 hover:scale-105"
                  text="Start Here"
                />
              )}
            </div>
            
            <button 
              className="md:hidden text-white"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-brand-primary/20">
              <div className="flex flex-col space-y-4">
                {!dynamicUser ? (
                  // Non-authenticated mobile navigation
                  <>
                    <Link href="/#features" className="text-gray-300 hover:text-brand-secondary transition-colors">
                      Features
                    </Link>
                    <Link href="/find-creators" className="text-gray-300 hover:text-brand-secondary transition-colors">
                      Find Creators
                    </Link>
                    <Link href="/#ideal-users" className="text-gray-300 hover:text-brand-secondary transition-colors">
                      Who It's For
                    </Link>
                  </>
                ) : (
                  // Authenticated mobile navigation
                  <>
                    <Link href="/find-creators" className="text-gray-300 hover:text-brand-secondary transition-colors">
                      Find Creators
                    </Link>
                    <Link href="/marketplace" className="text-gray-300 hover:text-brand-secondary transition-colors">
                      Rewards Store
                    </Link>
                    {userData?.userType === 'creator' ? (
                      <Link href="/creator-dashboard" className="text-gray-300 hover:text-brand-secondary transition-colors">
                        Dashboard
                      </Link>
                    ) : (
                      <Link href="/fan-dashboard" className="text-gray-300 hover:text-brand-secondary transition-colors">
                        Dashboard
                      </Link>
                    )}
                  </>
                )}
                {!dynamicUser && (
                  <ConnectWalletButton 
                    className="w-full bg-brand-primary hover:bg-brand-primary/80 text-white font-medium py-2 rounded-xl transition-all duration-200"
                    text="Start Here"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </nav>


    </>
  );
}
