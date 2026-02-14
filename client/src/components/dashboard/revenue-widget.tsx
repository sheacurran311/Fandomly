import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Users, CheckCircle, Gift, Coins, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

type TimePeriod = "week" | "month" | "all";

interface WeeklyMetrics {
  newFans: number;
  tasksCompleted: number;
  rewardsRedeemed: number;
  pointsDistributed: number;
  // Comparison data
  previousNewFans?: number;
  previousTasksCompleted?: number;
  previousRewardsRedeemed?: number;
  previousPointsDistributed?: number;
}

// Calculate percentage change
function calculateChange(current: number, previous: number | undefined): { value: number; isPositive: boolean } | null {
  if (previous === undefined || previous === 0) {
    if (current > 0) {
      return { value: 100, isPositive: true };
    }
    return null;
  }
  const change = ((current - previous) / previous) * 100;
  return { value: Math.abs(change), isPositive: change >= 0 };
}

export default function EngagementSummaryWidget() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<TimePeriod>("week");
  
  // Fetch real weekly metrics from API
  const { data: metrics, isLoading, error } = useQuery<WeeklyMetrics>({
    queryKey: ['creator-weekly-metrics', user?.id, period],
    queryFn: async () => {
      const response = await fetch(`/api/creator/weekly-metrics/${user?.id}?period=${period}`);
      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }
      return response.json();
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  });

  const newFansChange = calculateChange(metrics?.newFans || 0, metrics?.previousNewFans);
  const tasksChange = calculateChange(metrics?.tasksCompleted || 0, metrics?.previousTasksCompleted);
  
  if (isLoading) {
    return (
      <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-brand-primary" />
            <span>Engagement Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-brand-primary" />
            <span>Engagement Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-400">
            Unable to load engagement data
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-brand-primary" />
            <span>Engagement Summary</span>
          </div>
          <div className="flex gap-1">
            {(["week", "month", "all"] as TimePeriod[]).map((p) => (
              <Button
                key={p}
                variant={period === p ? "default" : "ghost"}
                size="sm"
                onClick={() => setPeriod(p)}
                className={cn(
                  "h-7 px-2 text-xs",
                  period === p 
                    ? "bg-brand-primary text-white" 
                    : "text-gray-400 hover:text-white hover:bg-white/10"
                )}
              >
                {p === "week" ? "This Week" : p === "month" ? "This Month" : "All Time"}
              </Button>
            ))}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Primary Metric - Tasks Completed */}
          <div>
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
              <CheckCircle className="h-4 w-4" />
              Tasks Completed
            </div>
            <div className="text-3xl font-bold text-white">
              {(metrics?.tasksCompleted || 0).toLocaleString()}
            </div>
            {tasksChange && period !== "all" && (
              <div className="flex items-center gap-2 mt-2">
                {tasksChange.isPositive ? (
                  <TrendingUp className="h-4 w-4 text-green-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-400" />
                )}
                <span className={cn(
                  "text-sm font-medium",
                  tasksChange.isPositive ? "text-green-400" : "text-red-400"
                )}>
                  {tasksChange.isPositive ? "+" : "-"}{tasksChange.value.toFixed(1)}%
                </span>
                <span className="text-sm text-gray-400">
                  vs last {period}
                </span>
              </div>
            )}
          </div>
          
          {/* Secondary Metrics Grid */}
          <div className="pt-4 border-t border-white/10">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="flex items-center gap-1 text-gray-400 mb-1">
                  <Users className="h-3 w-3" />
                  New Fans
                </div>
                <div className="text-white font-medium">
                  {(metrics?.newFans || 0).toLocaleString()}
                </div>
                {newFansChange && period !== "all" && (
                  <div className={cn(
                    "text-xs",
                    newFansChange.isPositive ? "text-green-400" : "text-red-400"
                  )}>
                    {newFansChange.isPositive ? "+" : "-"}{newFansChange.value.toFixed(0)}%
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-1 text-gray-400 mb-1">
                  <Coins className="h-3 w-3" />
                  Points Given
                </div>
                <div className="text-white font-medium">
                  {(metrics?.pointsDistributed || 0).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-gray-400 mb-1">
                  <Gift className="h-3 w-3" />
                  Rewards
                </div>
                <div className="text-white font-medium">
                  {(metrics?.rewardsRedeemed || 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
