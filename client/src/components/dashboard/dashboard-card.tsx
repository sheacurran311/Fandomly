import { ReactNode, memo } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface DashboardCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: "increase" | "decrease" | "neutral";
    period: string;
  };
  icon?: ReactNode;
  description?: string;
  className?: string;
  children?: ReactNode;
  gradient?: boolean;
}

function DashboardCard({
  title,
  value,
  change,
  icon,
  description,
  className,
  children,
  gradient = false,
}: DashboardCardProps) {
  const getChangeIcon = () => {
    if (!change) return null;
    
    switch (change.type) {
      case "increase":
        return <TrendingUp className="h-3 w-3" />;
      case "decrease":
        return <TrendingDown className="h-3 w-3" />;
      default:
        return <Minus className="h-3 w-3" />;
    }
  };

  const getChangeColor = () => {
    if (!change) return "";
    
    switch (change.type) {
      case "increase":
        return "text-green-400";
      case "decrease":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  return (
    <Card className={cn(
      "bg-white/5 backdrop-blur-lg border border-white/10 hover:bg-white/10 transition-all duration-300",
      gradient && "bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20 border-brand-primary/30",
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-300">
          {title}
        </CardTitle>
        {icon && (
          <div className="text-brand-secondary">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-2">
          <div className="text-2xl font-bold text-white">
            {value}
          </div>
          
          {change && (
            <div className={cn(
              "flex items-center space-x-1 text-xs font-medium",
              getChangeColor()
            )}>
              {getChangeIcon()}
              <span>
                {change.value > 0 ? "+" : ""}{change.value}% {change.period}
              </span>
            </div>
          )}
          
          {description && (
            <p className="text-xs text-gray-400">
              {description}
            </p>
          )}
          
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

export default memo(DashboardCard);