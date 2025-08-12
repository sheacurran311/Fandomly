import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Menu, X, User, Settings, LogOut, ChevronDown, Shield } from "lucide-react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import ConnectWalletButton from "@/components/auth/connect-wallet-button";
import { useRBAC, RoleGuard } from "@/hooks/use-rbac";
export default function Navigation() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { user: dynamicUser, handleLogOut } = useDynamicContext();
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
                <img src="/fandomly-logo-with-text.png" alt="Fandomly" className="h-12 w-auto" />
              </Link>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/#features" className="text-gray-300 hover:text-brand-secondary transition-colors">
                Features
              </Link>
              <Link href="/marketplace" className="text-gray-300 hover:text-brand-secondary transition-colors">
                Marketplace
              </Link>
              <Link href="/#ideal-users" className="text-gray-300 hover:text-brand-secondary transition-colors">
                Who It's For
              </Link>
              {dynamicUser ? (
                <div className="flex items-center space-x-4">
                  <Link href="/dashboard">
                    <Button variant="outline" className="border-2 border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white px-6 py-2 rounded-xl font-semibold transition-all duration-200">
                      Dashboard
                    </Button>
                  </Link>
                  
                  {/* User Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="flex items-center space-x-2 text-white hover:text-brand-secondary">
                        <div className="w-8 h-8 bg-brand-primary rounded-full flex items-center justify-center">
                          {dynamicUser?.email?.[0] || "U"}
                        </div>
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
                      <Link href="/rbac-dashboard">
                        <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-brand-primary/20">
                          <Shield className="mr-2 h-4 w-4" />
                          Role Dashboard
                        </DropdownMenuItem>
                      </Link>
                      <RoleGuard allowedRoles={['customer_admin']}>
                        <Link href="/nil-dashboard">
                          <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-brand-primary/20">
                            <Shield className="mr-2 h-4 w-4" />
                            NIL Dashboard
                          </DropdownMenuItem>
                        </Link>
                      </RoleGuard>
                      <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-brand-primary/20">
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-brand-primary/20">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </DropdownMenuItem>
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
                >
                  Start Here
                </ConnectWalletButton>
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
                <Link href="/#features" className="text-gray-300 hover:text-brand-secondary transition-colors">
                  Features
                </Link>
                <Link href="/marketplace" className="text-gray-300 hover:text-brand-secondary transition-colors">
                  Marketplace
                </Link>
                <Link href="/#pricing" className="text-gray-300 hover:text-brand-secondary transition-colors">
                  Pricing
                </Link>
                {dynamicUser ? (
                  <Link href="/dashboard">
                    <Button className="w-full bg-brand-primary hover:bg-brand-primary/80">
                      Dashboard
                    </Button>
                  </Link>
                ) : (
                  <ConnectWalletButton 
                    className="w-full bg-brand-primary hover:bg-brand-primary/80 text-white font-medium py-2 rounded-xl transition-all duration-200"
                  >
                    Start Here
                  </ConnectWalletButton>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>


    </>
  );
}
