/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { transformImageUrl } from '@/lib/image-utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import { isParticleAuthEnabled } from '@/lib/particle-config';
import { getNavigationItems } from '@/config/navigation';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  Target,
  Megaphone,
  Wallet,
} from 'lucide-react';
import { useEmbeddedWallet } from '@particle-network/connectkit';

/**
 * Profile section at the bottom of the sidebar.
 * When Particle wallet is available, the entire section is clickable to open the wallet modal.
 */
function SidebarProfileSection({
  isCollapsed,
  user,
  avatarUrl,
  userType,
  particleEnabled,
}: {
  isCollapsed: boolean;
  user: any;
  avatarUrl: string | null;
  userType: string;
  particleEnabled: boolean;
}) {
  const embeddedWallet = useEmbeddedWallet();
  const canOpenWallet = particleEnabled && embeddedWallet?.isCanOpen;

  const profileContent = !isCollapsed ? (
    <div className="flex items-center space-x-3">
      <div className="relative">
        <Avatar className="h-9 w-9 border border-white/10">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt={user?.username || 'Profile'} /> : null}
          <AvatarFallback className="bg-gradient-to-br from-brand-primary to-brand-secondary text-white text-xs font-bold">
            {(user?.username || 'U').charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {userType === 'creator' && (
          <div
            className={cn(
              'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-brand-dark-bg',
              particleEnabled ? 'bg-emerald-400' : 'bg-gray-500'
            )}
            title={particleEnabled ? 'Connected to Fandomly Chain' : 'Fandomly Chain not connected'}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">
          {user?.username || 'Your Account'}
        </p>
        <p className="text-xs truncate">
          {userType === 'creator' && particleEnabled ? (
            <span className="text-emerald-400">Chain connected</span>
          ) : userType === 'creator' ? (
            <span className="text-gray-500">Chain offline</span>
          ) : (
            <span className="text-gray-400 capitalize">{userType}</span>
          )}
        </p>
      </div>
      {canOpenWallet && <Wallet className="flex-shrink-0 h-4 w-4 text-brand-secondary" />}
    </div>
  ) : (
    <div className="flex justify-center">
      <div className="relative">
        <Avatar className="h-8 w-8 border border-white/10">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt={user?.username || 'Profile'} /> : null}
          <AvatarFallback className="bg-gradient-to-br from-brand-primary to-brand-secondary text-white text-xs font-bold">
            {(user?.username || 'U').charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {userType === 'creator' && (
          <div
            className={cn(
              'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-brand-dark-bg',
              particleEnabled ? 'bg-emerald-400' : 'bg-gray-500'
            )}
          />
        )}
      </div>
    </div>
  );

  if (canOpenWallet) {
    return (
      <button
        onClick={() => {
          try {
            embeddedWallet.openWallet();
          } catch (err) {
            console.warn('[Sidebar] Wallet not available:', err);
          }
        }}
        className="w-full p-3 border border-white/10 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer text-left"
        title="Open Wallet"
      >
        {profileContent}
      </button>
    );
  }

  return <div className="p-3 border border-white/10 rounded-lg bg-white/5">{profileContent}</div>;
}

interface SidebarNavigationProps {
  userType: 'creator' | 'fan';
  className?: string;
  isNILAthlete?: boolean;
}

export default function SidebarNavigation({
  userType,
  className,
  isNILAthlete = false,
}: SidebarNavigationProps) {
  const [location, setLocation] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  const { user, isAuthenticated } = useAuth();
  const particleEnabled = isParticleAuthEnabled();

  // Fetch creator's program for sidebar profile photo
  const { data: programs = [] } = useQuery<Array<{ pageConfig?: { logo?: string } }>>({
    queryKey: ['/api/programs'],
    enabled: isAuthenticated && userType === 'creator',
    staleTime: 30000,
  });
  const program = programs[0];
  const programLogo = program?.pageConfig?.logo;
  // Creators: program logo first, then Particle Auth / user avatar. Fans: user avatar only.
  const avatarUrl =
    transformImageUrl(programLogo) ||
    transformImageUrl((user?.profileData as { avatar?: string })?.avatar) ||
    transformImageUrl(user?.avatar) ||
    null;

  const items = getNavigationItems(userType, isNILAthlete);

  const toggleSubmenu = (label: string) => {
    setExpandedMenus((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    );
  };

  return (
    <div
      className={cn(
        'flex flex-col bg-brand-dark-purple/30 backdrop-blur-lg border-r border-white/10 transition-all duration-300 fixed top-0 left-0 h-screen',
        isCollapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
        {!isCollapsed && (
          <div>
            <h2 className="text-lg font-bold text-white">
              {userType === 'creator' ? 'Creator Hub' : 'Fan Zone'}
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
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto min-h-0">
        {items.map((item) => {
          const hasSubmenu = item.submenu && item.submenu.length > 0;
          const isExpanded = expandedMenus.includes(item.label);
          const isActive =
            location === item.href ||
            (item.href !== `/${userType}-dashboard` && location.startsWith(item.href));
          const Icon = item.icon;

          return (
            <div key={item.href}>
              {hasSubmenu ? (
                <>
                  <div
                    onClick={() => !isCollapsed && toggleSubmenu(item.label)}
                    className={cn(
                      'flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group cursor-pointer',
                      'text-gray-300 hover:text-white hover:bg-brand-primary/60',
                      isCollapsed && 'justify-center'
                    )}
                  >
                    <Icon
                      className={cn(
                        'flex-shrink-0 h-5 w-5',
                        item.color || 'text-gray-400',
                        !isCollapsed && 'mr-3'
                      )}
                    />
                    {!isCollapsed && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </>
                    )}
                  </div>
                  {!isCollapsed && isExpanded && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.submenu?.map((subItem) => {
                        const subIsActive = location === subItem.href;
                        const SubIcon = subItem.icon;
                        return (
                          <Link key={subItem.href} href={subItem.href}>
                            <div
                              className={cn(
                                'flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer',
                                subIsActive
                                  ? 'bg-brand-primary text-white shadow-lg'
                                  : 'text-gray-400 hover:text-white hover:bg-brand-primary/60'
                              )}
                            >
                              <SubIcon
                                className={cn(
                                  'flex-shrink-0 h-4 w-4 mr-3',
                                  subIsActive ? 'text-white' : subItem.color || 'text-gray-400'
                                )}
                              />
                              <span className="flex-1">{subItem.label}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <Link href={item.href}>
                  <div
                    className={cn(
                      'flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group cursor-pointer',
                      isActive
                        ? 'bg-brand-primary text-white shadow-lg'
                        : 'text-gray-300 hover:text-white hover:bg-brand-primary/60',
                      isCollapsed && 'justify-center'
                    )}
                  >
                    <Icon
                      className={cn(
                        'flex-shrink-0 h-5 w-5',
                        isActive ? 'text-white' : item.color || 'text-gray-400',
                        !isCollapsed && 'mr-3'
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
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom container: Create Button + Profile */}
      <div className="mx-2 mb-2 mt-auto space-y-2">
        {/* + Create Button (creators only) */}
        {userType === 'creator' && (
          <div className="relative">
            <button
              onClick={() =>
                isCollapsed
                  ? setLocation('/creator-dashboard/tasks/create')
                  : setShowCreateMenu((prev) => !prev)
              }
              className={cn(
                'w-full flex items-center gap-2 rounded-lg font-semibold transition-all duration-200',
                'bg-gradient-to-r from-brand-primary to-brand-accent text-white',
                'hover:shadow-lg hover:shadow-brand-primary/30 hover:brightness-110',
                'active:scale-[0.98]',
                isCollapsed ? 'justify-center p-2.5' : 'px-4 py-2.5'
              )}
              data-testid="sidebar-create-button"
            >
              <Plus
                className={cn(
                  'h-5 w-5 transition-transform duration-200',
                  showCreateMenu && !isCollapsed && 'rotate-45'
                )}
              />
              {!isCollapsed && <span>Create</span>}
            </button>

            {/* Create Menu Dropdown */}
            {showCreateMenu && !isCollapsed && (
              <div className="mt-1 space-y-1 animate-in slide-in-from-top-1 duration-150">
                <button
                  onClick={() => {
                    setShowCreateMenu(false);
                    setLocation('/creator-dashboard/tasks/create');
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-brand-primary/20 transition-colors"
                  data-testid="sidebar-create-task"
                >
                  <div className="w-7 h-7 rounded-md bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                    <Target className="h-3.5 w-3.5 text-indigo-400" />
                  </div>
                  <span>New Task</span>
                </button>
                <button
                  onClick={() => {
                    setShowCreateMenu(false);
                    setLocation('/creator-dashboard/campaign-builder');
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-brand-primary/20 transition-colors"
                  data-testid="sidebar-create-campaign"
                >
                  <div className="w-7 h-7 rounded-md bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                    <Megaphone className="h-3.5 w-3.5 text-orange-400" />
                  </div>
                  <span>New Campaign</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Profile Section — clickable to open Particle wallet when available */}
        <SidebarProfileSection
          isCollapsed={isCollapsed}
          user={user}
          avatarUrl={avatarUrl}
          userType={userType}
          particleEnabled={particleEnabled}
        />
      </div>
    </div>
  );
}
