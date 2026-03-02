import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminStatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

export function AdminStatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendLabel,
  loading,
  onClick,
  className,
}: AdminStatCardProps) {
  return (
    <Card
      className={cn(
        'bg-white/5 border-white/10',
        onClick && 'cursor-pointer hover:bg-white/[0.07] transition-colors',
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-400">{title}</CardTitle>
        <Icon className="h-4 w-4 text-brand-primary" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <>
            <Skeleton className="h-8 w-24 mb-2" />
            <Skeleton className="h-4 w-32" />
          </>
        ) : (
          <>
            <div className="text-2xl font-bold text-white">{value}</div>
            <div className="flex items-center gap-2 mt-1">
              {description && <p className="text-xs text-gray-400">{description}</p>}
              {trend !== undefined && (
                <Badge
                  variant="outline"
                  className={
                    trend >= 0
                      ? 'border-green-500/50 text-green-400'
                      : 'border-red-500/50 text-red-400'
                  }
                >
                  <TrendingUp className={cn('h-3 w-3 mr-1', trend < 0 && 'rotate-180')} />
                  {Math.abs(trend)}% {trendLabel}
                </Badge>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
