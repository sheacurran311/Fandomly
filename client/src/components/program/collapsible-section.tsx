/**
 * CollapsibleSection - Reusable collapsible wrapper for Program Builder sections
 * 
 * Features:
 * - Icon and title header
 * - Optional description
 * - Badge support (e.g., "3 connected")
 * - Enterprise/Pro badge indicator
 * - Animated expand/collapse with chevron
 * - Consistent Card-based styling
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Sparkles, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CollapsibleSectionProps {
  /** Section title */
  title: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Optional description text */
  description?: string;
  /** Optional status badge (e.g., "3 connected", "5 visible") */
  badge?: string;
  /** Show "Pro" enterprise indicator badge */
  enterpriseBadge?: boolean;
  /** Whether section is open by default */
  defaultOpen?: boolean;
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Section content */
  children: React.ReactNode;
  /** Additional className for the card */
  className?: string;
}

export function CollapsibleSection({
  title,
  icon: Icon,
  description,
  badge,
  enterpriseBadge = false,
  defaultOpen = false,
  open,
  onOpenChange,
  children,
  className,
}: CollapsibleSectionProps) {
  // Use controlled state if provided, otherwise use internal state
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = open !== undefined ? open : internalOpen;
  
  const handleOpenChange = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen);
    } else {
      setInternalOpen(newOpen);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={handleOpenChange}>
      <Card className={cn("bg-white/5 backdrop-blur-lg border-white/10", className)}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-white/5 transition-colors rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-brand-primary/10">
                  <Icon className="h-5 w-5 text-brand-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-semibold">{title}</h3>
                    {enterpriseBadge && (
                      <Badge 
                        variant="outline" 
                        className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/50 text-amber-400 text-xs px-2 py-0"
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        Pro
                      </Badge>
                    )}
                    {badge && (
                      <Badge 
                        variant="secondary" 
                        className="bg-white/10 text-gray-300 text-xs"
                      >
                        {badge}
                      </Badge>
                    )}
                  </div>
                  {description && (
                    <p className="text-sm text-gray-400 mt-0.5">{description}</p>
                  )}
                </div>
              </div>
              <ChevronDown 
                className={cn(
                  "h-5 w-5 text-gray-400 transition-transform duration-200",
                  isOpen && "transform rotate-180"
                )} 
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {children}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default CollapsibleSection;
