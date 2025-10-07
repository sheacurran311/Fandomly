import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { getBottomNavItems, type NavigationItem } from "@/config/navigation";

interface MobileBottomNavProps {
  userType: "creator" | "fan";
  isNILAthlete?: boolean;
}

export default function MobileBottomNav({ userType, isNILAthlete = false }: MobileBottomNavProps) {
  const [location] = useLocation();
  const items = getBottomNavItems(userType, isNILAthlete);

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-40 bg-brand-dark-purple/95 backdrop-blur-xl border-t border-white/10 pb-safe"
      data-testid="mobile-bottom-nav"
    >
      <div className="flex items-center justify-around px-2 h-16">
        {items.map((item) => {
          const isActive = location === item.href || (item.href !== `/${userType}-dashboard` && location.startsWith(item.href));
          const Icon = item.icon;
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center px-3 py-2 min-w-[64px] transition-all duration-200 group no-underline",
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
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
