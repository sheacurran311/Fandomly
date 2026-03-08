/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Menu, X, User, Settings, LogOut, ChevronDown, Wallet } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { isParticleAuthEnabled } from '@/contexts/particle-provider';
import UserTypeSwitcher from '@/components/auth/user-type-switcher';
import { transformImageUrl } from '@/lib/image-utils';
import { BrandSwitcher } from '@/components/brand-switcher';
import { useEmbeddedWallet, useAccount } from '@particle-network/connectkit';

/**
 * Wallet dropdown menu item — only renders inside ConnectKitProvider
 * when Particle is enabled and the embedded wallet is available.
 */
function WalletDropdownItem() {
  const embeddedWallet = useEmbeddedWallet();
  if (!embeddedWallet?.isCanOpen) return null;
  return (
    <DropdownMenuItem
      onClick={() => {
        try {
          embeddedWallet.openWallet();
        } catch (err) {
          console.warn('[Navigation] Wallet not available:', err);
        }
      }}
      className="text-gray-300 hover:text-white hover:bg-brand-primary/60"
    >
      <Wallet className="mr-2 h-4 w-4" />
      Wallet
    </DropdownMenuItem>
  );
}

/**
 * Nav bar wallet button — only renders when the Particle embedded wallet is
 * connected and openable.  Never shows Particle's auth/connect modal.
 */
function NavWalletButton() {
  const { isConnected, address } = useAccount();
  const embeddedWallet = useEmbeddedWallet();

  if (!isConnected || !embeddedWallet?.isCanOpen) return null;

  const shortAddr = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Wallet';

  return (
    <button
      onClick={() => {
        try {
          embeddedWallet.openWallet();
        } catch (err) {
          console.warn('[Navigation] Wallet open failed:', err);
        }
      }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all"
      title={address || 'Open Wallet'}
    >
      <Wallet className="h-3.5 w-3.5 text-brand-secondary" />
      <span>{shortAddr}</span>
    </button>
  );
}

export default function Navigation() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const particleEnabled = isParticleAuthEnabled();

  if (location === '/') return null;

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/';
    } catch (error) {
      console.error('Error logging out:', error);
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
              {!isAuthenticated ? (
                <>
                  <Link
                    href="/#features"
                    className="text-gray-300 hover:text-brand-secondary transition-colors"
                  >
                    Features
                  </Link>
                  <Link
                    href="/find-creators"
                    className="text-gray-300 hover:text-brand-secondary transition-colors"
                  >
                    Explore
                  </Link>
                  <Link
                    href="/#ideal-users"
                    className="text-gray-300 hover:text-brand-secondary transition-colors"
                  >
                    Who It&apos;s For
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/find-creators"
                    className="text-gray-300 hover:text-brand-secondary transition-colors"
                  >
                    Explore
                  </Link>
                  <Link
                    href="/marketplace"
                    className="text-gray-300 hover:text-brand-secondary transition-colors"
                  >
                    Rewards Store
                  </Link>
                </>
              )}

              {isAuthenticated && user ? (
                <div className="flex items-center space-x-3">
                  {user.profileData?.brandType === 'agency' && <BrandSwitcher />}

                  {/* Wallet button — only shows when Particle wallet is connected and ready */}
                  {particleEnabled && <NavWalletButton />}

                  {/* Dashboard button */}
                  {!isLoading && user ? (
                    user.userType === 'creator' || user.profileData?.brandType ? (
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
                    )
                  ) : (
                    <Button
                      disabled
                      className="bg-brand-primary/50 text-white/50 px-6 py-2 rounded-xl font-semibold cursor-not-allowed"
                    >
                      Loading...
                    </Button>
                  )}

                  {/* User Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="flex items-center space-x-2 text-white hover:text-brand-secondary"
                      >
                        <Avatar className="w-8 h-8" data-testid="img-nav-user-avatar">
                          <AvatarImage
                            src={
                              transformImageUrl(user.profileData?.avatar || user.avatar) ||
                              undefined
                            }
                            alt={user.profileData?.name || user.username || user.email || 'User'}
                          />
                          <AvatarFallback className="w-8 h-8 bg-brand-primary text-white text-sm font-bold">
                            {(user.email?.[0] || user.username?.[0] || 'U').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 bg-brand-dark-purple border-brand-primary/20">
                      <div className="px-2 py-1.5 text-sm text-gray-300">
                        <div className="font-medium text-white">
                          {user.profileData?.name || user.username || user.email || 'User'}
                        </div>
                        <div className="text-xs text-gray-400">{user.email || user.username}</div>
                      </div>
                      <DropdownMenuSeparator className="bg-brand-primary/20" />
                      {!isLoading && user && (
                        <>
                          <Link href={user.userType === 'creator' ? '/profile' : '/fan-profile'}>
                            <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-brand-primary/60">
                              <User className="mr-2 h-4 w-4" />
                              Profile
                            </DropdownMenuItem>
                          </Link>
                          <Link
                            href={
                              user.userType === 'creator'
                                ? '/creator-dashboard/settings'
                                : '/fan-dashboard/settings'
                            }
                          >
                            <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-brand-primary/60">
                              <Settings className="mr-2 h-4 w-4" />
                              Settings
                            </DropdownMenuItem>
                          </Link>
                          {particleEnabled && <WalletDropdownItem />}
                        </>
                      )}
                      <DropdownMenuSeparator className="bg-brand-primary/20" />
                      {user && (
                        <div className="px-2 py-1">
                          <UserTypeSwitcher
                            userId={user.id}
                            currentUserType={user.userType as 'fan' | 'creator'}
                          />
                        </div>
                      )}
                      <DropdownMenuSeparator className="bg-brand-primary/20" />
                      <DropdownMenuItem
                        onClick={handleLogout}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                /* Not authenticated — show Sign In button linking to /login */
                <Link href="/login">
                  <Button className="bg-brand-primary hover:bg-brand-primary/80 text-white font-medium px-6 py-2 rounded-xl transition-all duration-200 hover:scale-105">
                    Sign In
                  </Button>
                </Link>
              )}
            </div>

            <button
              className="md:hidden text-white"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-brand-primary/20">
              <div className="flex flex-col space-y-4">
                {!isAuthenticated ? (
                  <>
                    <Link
                      href="/#features"
                      className="text-gray-300 hover:text-brand-secondary transition-colors"
                    >
                      Features
                    </Link>
                    <Link
                      href="/find-creators"
                      className="text-gray-300 hover:text-brand-secondary transition-colors"
                    >
                      Find Creators
                    </Link>
                    <Link
                      href="/#ideal-users"
                      className="text-gray-300 hover:text-brand-secondary transition-colors"
                    >
                      Who It&apos;s For
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/find-creators"
                      className="text-gray-300 hover:text-brand-secondary transition-colors"
                    >
                      Explore
                    </Link>
                    <Link
                      href="/marketplace"
                      className="text-gray-300 hover:text-brand-secondary transition-colors"
                    >
                      Rewards Store
                    </Link>
                  </>
                )}
                {!isAuthenticated && (
                  <Link href="/login">
                    <Button
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="w-full bg-brand-primary hover:bg-brand-primary/80 text-white font-medium py-2 rounded-xl transition-all duration-200"
                    >
                      Sign In
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>
    </>
  );
}
