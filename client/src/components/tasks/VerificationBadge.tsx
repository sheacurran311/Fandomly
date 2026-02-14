import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CheckCircle, Code, Eye, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Verification status types
 */
export type VerificationStatus = 'automatic' | 'code_required' | 'manual';

/**
 * Props for VerificationBadge component
 */
interface VerificationBadgeProps {
  /** The verification status to display */
  status: VerificationStatus;
  /** Optional size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show the tooltip */
  showTooltip?: boolean;
  /** Optional additional class names */
  className?: string;
}

/**
 * Configuration for each verification status
 */
const STATUS_CONFIG: Record<VerificationStatus, {
  label: string;
  shortLabel: string;
  description: string;
  icon: typeof CheckCircle;
  bgColor: string;
  textColor: string;
  borderColor: string;
}> = {
  automatic: {
    label: 'Auto-Verified',
    shortLabel: 'Auto',
    description: 'Verified automatically via API when fan connects their account',
    icon: CheckCircle,
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-500',
    borderColor: 'border-green-500/30',
  },
  code_required: {
    label: 'Code Verified',
    shortLabel: 'Code',
    description: 'Fan receives a unique code to include in their comment or post',
    icon: Code,
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-500',
    borderColor: 'border-blue-500/30',
  },
  manual: {
    label: 'Manual Review',
    shortLabel: 'Manual',
    description: "You'll verify this task by checking the fan's profile directly",
    icon: Eye,
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-500',
    borderColor: 'border-amber-500/30',
  },
};

/**
 * Get verification status from method and tier
 */
export function getVerificationStatus(method: string | null | undefined, tier: string | null | undefined): VerificationStatus {
  // T1 with API method = automatic
  if (tier === 'T1' && method === 'api') {
    return 'automatic';
  }
  
  // T2 with code methods = code_required
  if (tier === 'T2' && (method === 'code_comment' || method === 'code_repost')) {
    return 'code_required';
  }
  
  // Group goals with hashtag method = automatic (T1 aggregate)
  if (method === 'hashtag') {
    return 'automatic';
  }
  
  // Everything else is manual
  return 'manual';
}

/**
 * VerificationBadge Component
 * 
 * Displays a badge indicating the verification method for a task.
 * Three variants:
 * - Automatic (green): Verified via API
 * - Code Required (blue): Fan posts a unique code
 * - Manual Review (amber): Creator manually verifies
 */
export function VerificationBadge({
  status,
  size = 'md',
  showTooltip = true,
  className,
}: VerificationBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-2.5 py-1',
  };
  
  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };
  
  const badge = (
    <Badge
      variant="outline"
      className={cn(
        config.bgColor,
        config.textColor,
        config.borderColor,
        sizeClasses[size],
        'font-medium inline-flex items-center gap-1',
        className
      )}
    >
      <Icon className={iconSizes[size]} />
      <span>{size === 'sm' ? config.shortLabel : config.label}</span>
    </Badge>
  );
  
  if (!showTooltip) {
    return badge;
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-sm">{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * VerificationTierBadge Component
 * 
 * Shows the verification tier (T1/T2/T3) with styled badge appearance
 */
interface VerificationTierBadgeProps {
  tier: 'T1' | 'T2' | 'T3';
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

const TIER_CONFIG: Record<'T1' | 'T2' | 'T3', {
  label: string;
  fullLabel: string;
  description: string;
  pointsRange: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  T1: {
    label: 'T1',
    fullLabel: 'T1 - API',
    description: 'High Trust - API Verified',
    pointsRange: '50-200 pts recommended',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
  },
  T2: {
    label: 'T2',
    fullLabel: 'T2 - Code',
    description: 'Medium Trust - Code Verified',
    pointsRange: '30-85 pts recommended',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  T3: {
    label: 'T3',
    fullLabel: 'T3 - Honor',
    description: 'Lower Trust - Manual/Honor',
    pointsRange: '15-25 pts recommended',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
};

export function VerificationTierBadge({
  tier,
  size = 'md',
  showTooltip = true,
  className,
}: VerificationTierBadgeProps) {
  const config = TIER_CONFIG[tier];
  
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-2.5 py-1',
  };
  
  const badge = (
    <Badge
      variant="outline"
      className={cn(
        config.bgColor,
        config.color,
        config.borderColor,
        sizeClasses[size],
        'font-mono font-medium',
        className
      )}
    >
      {size === 'sm' ? config.label : config.fullLabel}
    </Badge>
  );
  
  if (!showTooltip) {
    return badge;
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{config.description}</p>
            <p className="text-xs text-muted-foreground">{config.pointsRange}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * VerificationInfoButton Component
 * 
 * A help button that explains the verification system
 */
interface VerificationInfoButtonProps {
  className?: string;
}

export function VerificationInfoButton({ className }: VerificationInfoButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className={cn('text-muted-foreground hover:text-foreground transition-colors', className)}>
            <HelpCircle className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm">
          <div className="space-y-3 p-1">
            <p className="font-medium">Task Verification Types</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium text-green-500">Auto-Verified:</span>
                  <span className="text-muted-foreground"> Verified automatically when fan connects their account.</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Code className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium text-blue-500">Code Verified:</span>
                  <span className="text-muted-foreground"> Fan posts a unique code in their comment.</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Eye className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium text-amber-500">Manual Review:</span>
                  <span className="text-muted-foreground"> You verify by checking fan's profile.</span>
                </div>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default VerificationBadge;
