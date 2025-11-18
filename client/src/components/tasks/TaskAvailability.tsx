import { useEffect, useState } from "react";
import { Clock, CheckCircle, XCircle, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TaskAvailabilityProps {
  isEligible: boolean;
  reason?: string;
  nextAvailableAt?: string | Date;
  lastCompletedAt?: string | Date;
  completionsCount?: number;
  className?: string;
}

export function TaskAvailability({
  isEligible,
  reason,
  nextAvailableAt,
  lastCompletedAt,
  completionsCount,
  className,
}: TaskAvailabilityProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  useEffect(() => {
    if (!nextAvailableAt || isEligible) {
      setTimeRemaining("");
      return;
    }

    const calculateTimeRemaining = () => {
      const now = new Date();
      const next = new Date(nextAvailableAt);
      const diff = next.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining("Available now!");
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`${seconds}s`);
      }
    };

    // Initial calculation
    calculateTimeRemaining();

    // Update every second
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [nextAvailableAt, isEligible]);

  // If eligible, show success state
  if (isEligible) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Badge variant="outline" className="border-green-500/50 bg-green-500/10 text-green-700">
          <CheckCircle className="w-3 h-3 mr-1" />
          Available
        </Badge>
        {lastCompletedAt && (
          <span className="text-xs text-muted-foreground">
            Last: {formatRelativeTime(lastCompletedAt)}
          </span>
        )}
      </div>
    );
  }

  // If not eligible, show countdown
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Badge variant="outline" className="border-orange-500/50 bg-orange-500/10 text-orange-700">
        <XCircle className="w-3 h-3 mr-1" />
        Not Available
      </Badge>

      {timeRemaining && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>Available in {timeRemaining}</span>
        </div>
      )}

      {reason && !timeRemaining && (
        <p className="text-xs text-muted-foreground">{reason}</p>
      )}

      {completionsCount !== undefined && completionsCount > 0 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="w-3 h-3" />
          <span>Completed {completionsCount}x</span>
        </div>
      )}
    </div>
  );
}

// Compact version for inline display
export function CompactAvailability({
  isEligible,
  nextAvailableAt,
  className,
}: {
  isEligible: boolean;
  nextAvailableAt?: string | Date;
  className?: string;
}) {
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  useEffect(() => {
    if (!nextAvailableAt || isEligible) return;

    const calculateTime = () => {
      const diff = new Date(nextAvailableAt).getTime() - new Date().getTime();
      if (diff <= 0) {
        setTimeRemaining("Now");
        return;
      }

      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setTimeRemaining(`${days}d`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h`);
      } else {
        setTimeRemaining(`${minutes}m`);
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [nextAvailableAt, isEligible]);

  if (isEligible) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-green-600", className)}>
        <CheckCircle className="w-3 h-3" />
        <span className="text-xs font-medium">Ready</span>
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-1 text-orange-600", className)}>
      <Clock className="w-3 h-3" />
      <span className="text-xs font-medium">
        {timeRemaining ? `in ${timeRemaining}` : "Later"}
      </span>
    </span>
  );
}

// Helper function to format relative time
function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 7) {
    return then.toLocaleDateString();
  } else if (diffDay > 0) {
    return `${diffDay}d ago`;
  } else if (diffHour > 0) {
    return `${diffHour}h ago`;
  } else if (diffMin > 0) {
    return `${diffMin}m ago`;
  } else {
    return "Just now";
  }
}
