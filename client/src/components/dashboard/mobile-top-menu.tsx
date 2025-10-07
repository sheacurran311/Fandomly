import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X } from "lucide-react";
import { getOverflowNavItems } from "@/config/navigation";

interface MobileTopMenuProps {
  userType: "creator" | "fan";
  isNILAthlete?: boolean;
}

export default function MobileTopMenu({ userType, isNILAthlete = false }: MobileTopMenuProps) {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const overflowItems = getOverflowNavItems(userType, isNILAthlete);

  if (overflowItems.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between p-4 bg-brand-dark-purple/30 backdrop-blur-lg border-b border-white/10">
      <div>
        <h2 className="text-lg font-bold text-white">
          {userType === "creator" ? "Creator Hub" : "Fan Zone"}
        </h2>
      </div>
      
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white hover:bg-brand-primary/60"
            data-testid="mobile-menu-toggle"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </SheetTrigger>
        <SheetContent 
          side="right" 
          className="bg-brand-dark-purple/95 backdrop-blur-xl border-l border-white/10 w-[280px]"
        >
          <SheetHeader className="border-b border-white/10 pb-4">
            <SheetTitle className="text-white">Menu</SheetTitle>
          </SheetHeader>
          
          <nav className="mt-6 space-y-1">
            {overflowItems.map((item) => {
              const isActive = location === item.href || (item.href !== `/${userType}-dashboard` && location.startsWith(item.href));
              const Icon = item.icon;
              
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 no-underline",
                    isActive
                      ? "bg-brand-primary text-white shadow-lg"
                      : "text-gray-300 hover:text-white hover:bg-brand-primary/60"
                  )}
                  data-testid={`overflow-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Icon 
                    className={cn(
                      "flex-shrink-0 h-5 w-5 mr-3",
                      isActive ? "text-white" : (item.color || "text-gray-400")
                    )} 
                  />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-brand-secondary/20 text-brand-secondary rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
