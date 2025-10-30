import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

type TimePeriod = "day" | "week" | "month";

interface RevenueData {
  day: { amount: number; change: number };
  week: { amount: number; change: number };
  month: { amount: number; change: number };
}

export default function RevenueWidget() {
  const [period, setPeriod] = useState<TimePeriod>("day");
  
  // Mock data - replace with actual API call
  const revenueData: RevenueData = {
    day: { amount: 245, change: 12.5 },
    week: { amount: 1750, change: 8.3 },
    month: { amount: 7420, change: -3.2 }
  };
  
  const currentData = revenueData[period];
  const isPositive = currentData.change >= 0;
  
  return (
    <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-400" />
            <span>Revenue</span>
          </div>
          <div className="flex gap-1">
            {(["day", "week", "month"] as TimePeriod[]).map((p) => (
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
                {p === "day" ? "Day" : p === "week" ? "Week" : "Month"}
              </Button>
            ))}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="text-3xl font-bold text-white">
              ${currentData.amount.toLocaleString()}
            </div>
            <div className="flex items-center gap-2 mt-2">
              {isPositive ? (
                <TrendingUp className="h-4 w-4 text-green-400" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-400" />
              )}
              <span className={cn(
                "text-sm font-medium",
                isPositive ? "text-green-400" : "text-red-400"
              )}>
                {isPositive ? "+" : ""}{currentData.change.toFixed(1)}%
              </span>
              <span className="text-sm text-gray-400">
                vs last {period}
              </span>
            </div>
          </div>
          
          <div className="pt-4 border-t border-white/10">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-400">Active Campaigns</div>
                <div className="text-white font-medium mt-1">12</div>
              </div>
              <div>
                <div className="text-gray-400">Conversion Rate</div>
                <div className="text-white font-medium mt-1">24.5%</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

