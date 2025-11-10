import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, ChevronDown, Check } from "lucide-react";

interface ManagedBrand {
  tenantId: string;
  brandName: string;
  programName?: string;
  isActive: boolean;
}

export function BrandSwitcher() {
  const { user } = useAuth();
  const { activeTenantId, switchTenant } = useActiveTenant();

  const { data: managedBrands, isLoading } = useQuery<ManagedBrand[]>({
    queryKey: ['/api/user/managed-brands'],
    queryFn: async () => {
      const response = await fetch('/api/user/managed-brands', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch managed brands');
      return response.json();
    },
    enabled: !!user && user.brandType === 'agency',
  });

  // Only show for agency users with multiple brands
  if (!user || user.brandType !== 'agency' || !managedBrands || managedBrands.length <= 1) {
    return null;
  }

  const activeBrand = managedBrands.find(b => b.tenantId === activeTenantId);
  const defaultBrand = managedBrands[0];
  const currentBrand = activeBrand || defaultBrand;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="border-white/20 text-white hover:bg-white/10 gap-2"
        >
          <Building2 className="h-4 w-4" />
          <span className="max-w-[150px] truncate">
            {currentBrand?.brandName || 'Select Brand'}
          </span>
          <Badge variant="outline" className="ml-1 border-purple-500/50 text-purple-400">
            {managedBrands.length}
          </Badge>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[280px] bg-slate-900 border-white/10">
        <DropdownMenuLabel className="text-gray-400 text-xs uppercase tracking-wider">
          Your Brands ({managedBrands.length})
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        {isLoading ? (
          <DropdownMenuItem disabled className="text-gray-400">
            Loading brands...
          </DropdownMenuItem>
        ) : (
          managedBrands.map((brand) => {
            const isActive = brand.tenantId === activeTenantId;
            const isDefault = !activeTenantId && brand.tenantId === defaultBrand?.tenantId;
            
            return (
              <DropdownMenuItem
                key={brand.tenantId}
                onClick={() => switchTenant(brand.tenantId)}
                className="cursor-pointer text-white hover:bg-white/10 focus:bg-white/10 py-3"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{brand.brandName}</div>
                    {brand.programName && (
                      <div className="text-xs text-gray-400 truncate mt-0.5">
                        {brand.programName}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    {!brand.isActive && (
                      <Badge variant="outline" className="text-xs border-gray-500/50 text-gray-400">
                        Inactive
                      </Badge>
                    )}
                    {(isActive || isDefault) && (
                      <Check className="h-4 w-4 text-brand-primary" />
                    )}
                  </div>
                </div>
              </DropdownMenuItem>
            );
          })
        )}
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem className="text-xs text-gray-400 justify-center py-2">
          Switch between your managed brands
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

