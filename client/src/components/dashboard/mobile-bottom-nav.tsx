import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { getBottomNavItems, type NavigationItem } from "@/config/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { getNavigationItems } from "@/config/navigation";

interface MobileBottomNavProps {
  userType: "creator" | "fan";
  isNILAthlete?: boolean;
}

export default function MobileBottomNav({ userType, isNILAthlete = false }: MobileBottomNavProps) {
  const [location, setLocation] = useLocation();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMenuSheet, setShowMenuSheet] = useState(false);
  const items = getBottomNavItems(userType, isNILAthlete);
  const allItems = getNavigationItems(userType, isNILAthlete);
  
  // Get overflow items (not in bottom nav)
  const overflowItems = allItems.filter(item => {
    const bottomNavHrefs = items.map(i => i.href);
    return !bottomNavHrefs.includes(item.href) && !item.submenu;
  });

  const handleItemClick = (item: NavigationItem) => {
    if (item.isCreateButton && item.submenu) {
      setShowCreateModal(true);
    } else if (item.href !== "#") {
      setLocation(item.href);
    }
  };

  return (
    <>
      <nav 
        className="fixed bottom-0 left-0 right-0 z-40 bg-brand-dark-purple/95 backdrop-blur-xl border-t border-white/10 pb-safe"
        data-testid="mobile-bottom-nav"
      >
        <div className="flex items-center justify-between px-2 h-16">
          {items.map((item, index) => {
            const isActive = location === item.href || (item.href !== `/${userType}-dashboard` && location.startsWith(item.href));
            const Icon = item.icon;
            const isCreateButton = item.isCreateButton;
            
            // Show hamburger menu as last item
            if (index === items.length - 1) {
              return (
                <div key="menu-group" className="flex items-center gap-2">
                  <button
                    onClick={() => handleItemClick(item)}
                    className={cn(
                      "flex flex-col items-center justify-center px-3 py-2 min-w-[64px] transition-all duration-200 group",
                      "active:scale-95"
                    )}
                    data-testid={`nav-button-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <div className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-xl mb-0.5 transition-all",
                      isActive 
                        ? "bg-brand-primary shadow-lg shadow-brand-primary/30" 
                        : "group-active:bg-white/10"
                    )}>
                      <Icon 
                        className={cn(
                          "h-5 w-5 transition-colors",
                          isActive 
                            ? "text-white" 
                            : item.color || "text-gray-400 group-active:text-white"
                        )} 
                      />
                    </div>
                    <span className={cn(
                      "text-[10px] font-medium transition-colors leading-tight text-center",
                      isActive ? "text-white" : "text-gray-400 group-active:text-white"
                    )}>
                      {item.label === "Overview" ? "Dashboard" : item.label}
                    </span>
                  </button>
                  
                  {/* Hamburger Menu */}
                  <button
                    onClick={() => setShowMenuSheet(true)}
                    className="flex flex-col items-center justify-center px-3 py-2 min-w-[64px] transition-all duration-200 group active:scale-95"
                    data-testid="nav-button-menu"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl mb-0.5 transition-all group-active:bg-white/10">
                      <Menu className="h-5 w-5 text-gray-400 group-active:text-white transition-colors" />
                    </div>
                    <span className="text-[10px] font-medium text-gray-400 group-active:text-white transition-colors leading-tight text-center">
                      Menu
                    </span>
                  </button>
                </div>
              );
            }
            
            return (
              <button
                key={item.href}
                onClick={() => handleItemClick(item)}
                className={cn(
                  "flex flex-col items-center justify-center px-3 py-2 min-w-[64px] transition-all duration-200 group",
                  "active:scale-95"
                )}
                data-testid={`nav-button-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-xl mb-0.5 transition-all",
                  isCreateButton 
                    ? "bg-brand-primary shadow-lg shadow-brand-primary/30"
                    : isActive 
                      ? "bg-brand-primary shadow-lg shadow-brand-primary/30" 
                      : "group-active:bg-white/10"
                )}>
                  <Icon 
                    className={cn(
                      "h-5 w-5 transition-colors",
                      isCreateButton || isActive 
                        ? "text-white" 
                        : item.color || "text-gray-400 group-active:text-white"
                    )} 
                  />
                </div>
                <span className={cn(
                  "text-[10px] font-medium transition-colors leading-tight text-center",
                  isCreateButton || isActive ? "text-white" : "text-gray-400 group-active:text-white"
                )}>
                  {item.label === "Overview" ? "Dashboard" : item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-brand-dark-bg border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Create New</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            {items.find(i => i.isCreateButton)?.submenu?.map((subItem) => {
              const SubIcon = subItem.icon;
              return (
                <Link
                  key={subItem.href}
                  href={subItem.href}
                  onClick={() => setShowCreateModal(false)}
                  className="no-underline"
                >
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", 
                      subItem.label === "Campaigns" ? "bg-orange-400/20" : 
                      subItem.label === "Tasks" ? "bg-indigo-400/20" : "bg-emerald-400/20"
                    )}>
                      <SubIcon className={cn("h-6 w-6", subItem.color)} />
                    </div>
                    <div>
                      <h3 className="text-white font-medium">{subItem.label}</h3>
                      <p className="text-sm text-gray-400">
                        {subItem.label === "Campaigns" && "Create a new campaign"}
                        {subItem.label === "Tasks" && "Add a new task"}
                        {subItem.label === "Rewards" && "Define new rewards"}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Hamburger Menu Sheet */}
      <Sheet open={showMenuSheet} onOpenChange={setShowMenuSheet}>
        <SheetContent 
          side="right" 
          className="bg-brand-dark-purple/95 backdrop-blur-xl border-l border-white/10 w-[280px]"
        >
          <SheetHeader className="border-b border-white/10 pb-4">
            <SheetTitle className="text-white">Menu</SheetTitle>
          </SheetHeader>
          
          <nav className="mt-6 space-y-1">
            {overflowItems.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  onClick={() => setShowMenuSheet(false)}
                  className={cn(
                    "w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 no-underline",
                    isActive
                      ? "bg-brand-primary text-white shadow-lg"
                      : "text-gray-300 hover:text-white hover:bg-brand-primary/60"
                  )}
                >
                  <Icon 
                    className={cn(
                      "flex-shrink-0 h-5 w-5 mr-3",
                      isActive ? "text-white" : (item.color || "text-gray-400")
                    )} 
                  />
                  <span className="flex-1 text-left">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
