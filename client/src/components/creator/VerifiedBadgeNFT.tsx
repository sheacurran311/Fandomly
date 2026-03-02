/**
 * VerifiedBadgeNFT — Displays a verification badge icon for verified creators.
 *
 * Shows a ShieldCheck icon with a tooltip indicating on-chain badge status.
 * Used next to creator names in profiles, cards, and public pages.
 */

import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface VerifiedBadgeNFTProps {
  isVerified: boolean;
  hasBadgeNFT?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

export function VerifiedBadgeNFT({
  isVerified,
  hasBadgeNFT,
  size = 'md',
  className,
}: VerifiedBadgeNFTProps) {
  if (!isVerified) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('inline-flex items-center', className)}>
            <ShieldCheck className={cn(sizeClasses[size], 'text-brand-primary')} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-[220px]">
          <p className="font-semibold">Verified Creator</p>
          <p className="text-gray-400 mt-0.5">
            This creator has a complete profile, connected social accounts, and an active program on
            Fandomly.
          </p>
          {hasBadgeNFT && (
            <p className="text-gray-400 mt-0.5">Badge credential minted on Fandomly Chain</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
