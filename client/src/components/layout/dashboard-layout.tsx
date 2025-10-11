import { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import SidebarNavigation from "@/components/dashboard/sidebar-navigation";
import MobileBottomNav from "@/components/dashboard/mobile-bottom-nav";
import MobileTopMenu from "@/components/dashboard/mobile-top-menu";
import FloatingCreateButton from "@/components/dashboard/floating-create-button";
import MinimalFooter from "@/components/layout/minimal-footer";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
  userType: "creator" | "fan";
  isNILAthlete?: boolean;
  className?: string;
}

export default function DashboardLayout({ 
  children, 
  userType, 
  isNILAthlete = false,
  className 
}: DashboardLayoutProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex flex-col">
        {/* Mobile Top Menu */}
        <MobileTopMenu userType={userType} isNILAthlete={isNILAthlete} />
        
        {/* Main Content with bottom padding for fixed bottom nav */}
        <main className={cn("flex-1 pb-20", className)}>
          {children}
        </main>
        
        {/* Minimal Footer */}
        <MinimalFooter />
        
        {/* Mobile Bottom Navigation */}
        <MobileBottomNav userType={userType} isNILAthlete={isNILAthlete} />
        
        {/* Floating Create Button (creators only) */}
        {userType === "creator" && <FloatingCreateButton userType={userType} />}
      </div>
    );
  }

  // Desktop layout with sidebar
  return (
    <div className="min-h-screen bg-brand-dark-bg flex">
      <SidebarNavigation userType={userType} isNILAthlete={isNILAthlete} />
      <div className="flex-1 flex flex-col overflow-auto">
        <main className={cn("flex-1", className)}>
          {children}
        </main>
        <MinimalFooter />
      </div>
    </div>
  );
}
