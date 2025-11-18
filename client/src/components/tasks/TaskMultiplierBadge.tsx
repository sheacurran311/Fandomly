import { Badge } from "@/components/ui/badge";
import { Zap, TrendingUp, Calendar, Trophy, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface MultiplierInfo {
  id: string;
  name: string;
  type: string;
  value: number;
  reason: string;
}

interface TaskMultiplierBadgeProps {
  multiplier?: number; // Task base multiplier
  activeMultipliers?: MultiplierInfo[];
  className?: string;
  showBreakdown?: boolean;
}

export function TaskMultiplierBadge({
  multiplier = 1,
  activeMultipliers = [],
  className,
  showBreakdown = false,
}: TaskMultiplierBadgeProps) {
  // Calculate total multiplier
  const totalMultiplier = activeMultipliers.reduce((total, m) => total * m.value, multiplier);

  // Don't show badge if no multipliers active
  if (totalMultiplier <= 1) {
    return null;
  }

  // Get icon based on multiplier type
  const getMultiplierIcon = (type: string) => {
    switch (type) {
      case 'time_based':
        return <Calendar className="w-3 h-3" />;
      case 'streak_based':
        return <TrendingUp className="w-3 h-3" />;
      case 'tier_based':
        return <Trophy className="w-3 h-3" />;
      case 'event':
        return <Star className="w-3 h-3" />;
      default:
        return <Zap className="w-3 h-3" />;
    }
  };

  // Format multiplier display
  const formatMultiplier = (value: number) => {
    return `${value.toFixed(value % 1 === 0 ? 0 : 1)}x`;
  };

  // Primary active multiplier (highest value)
  const primaryMultiplier = activeMultipliers.length > 0
    ? activeMultipliers.reduce((max, m) => m.value > max.value ? m : max, activeMultipliers[0])
    : null;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {/* Main Badge */}
      <Badge
        variant="default"
        className={cn(
          "bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0",
          "hover:from-yellow-600 hover:to-orange-600 transition-all",
          "shadow-lg shadow-yellow-500/50",
          "animate-pulse-slow"
        )}
      >
        <Zap className="w-3 h-3 mr-1 fill-current" />
        <span className="font-bold">{formatMultiplier(totalMultiplier)}</span>
        {primaryMultiplier && (
          <span className="ml-1 text-xs font-normal opacity-90">
            {primaryMultiplier.name.split(' ')[0]}
          </span>
        )}
      </Badge>

      {/* Breakdown (optional) */}
      {showBreakdown && activeMultipliers.length > 0 && (
        <div className="flex flex-col gap-0.5">
          {multiplier > 1 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Zap className="w-2.5 h-2.5" />
              <span>Task: {formatMultiplier(multiplier)}</span>
            </div>
          )}
          {activeMultipliers.map((m) => (
            <div key={m.id} className="flex items-center gap-1 text-xs text-muted-foreground">
              {getMultiplierIcon(m.type)}
              <span>{m.name}: {formatMultiplier(m.value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Compact version for inline display
export function CompactMultiplierBadge({
  multiplier,
  className,
}: {
  multiplier: number;
  className?: string;
}) {
  if (multiplier <= 1) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full",
        "bg-gradient-to-r from-yellow-500 to-orange-500 text-white",
        "text-xs font-bold",
        className
      )}
    >
      <Zap className="w-2.5 h-2.5 fill-current" />
      {multiplier.toFixed(1)}x
    </span>
  );
}
