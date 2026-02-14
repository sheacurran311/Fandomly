/**
 * AI Insights Panel
 * 
 * Displays AI-generated suggestions and insights based on
 * cross-platform analytics data.
 */

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Sparkles, TrendingUp, TrendingDown, BarChart3, Clock, 
  Globe, AlertTriangle, Lightbulb, X 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { PlatformIcon } from './NetworkSelector';

interface Insight {
  id: string;
  type: 'growth' | 'engagement' | 'content' | 'timing' | 'cross_platform' | 'anomaly';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  platform?: string;
  metric?: string;
  value?: number;
  metadata?: Record<string, any>;
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  growth: { icon: TrendingUp, color: 'text-green-500 bg-green-500/10 border-green-500/20' },
  engagement: { icon: BarChart3, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
  content: { icon: Lightbulb, color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20' },
  timing: { icon: Clock, color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' },
  cross_platform: { icon: Globe, color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20' },
  anomaly: { icon: AlertTriangle, color: 'text-orange-500 bg-orange-500/10 border-orange-500/20' },
};

const PRIORITY_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  high: { label: 'High Impact', variant: 'default' },
  medium: { label: 'Medium', variant: 'secondary' },
  low: { label: 'Tip', variant: 'outline' },
};

function InsightCard({ insight, onDismiss }: { insight: Insight; onDismiss: (id: string) => void }) {
  const typeConfig = TYPE_CONFIG[insight.type] || TYPE_CONFIG.content;
  const priorityConfig = PRIORITY_CONFIG[insight.priority] || PRIORITY_CONFIG.medium;
  const Icon = typeConfig.icon;

  return (
    <div className={`p-4 rounded-lg border ${typeConfig.color}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-sm">{insight.title}</h4>
              <Badge variant={priorityConfig.variant} className="text-[10px] px-1.5 py-0">
                {priorityConfig.label}
              </Badge>
              {insight.platform && (
                <PlatformIcon platform={insight.platform} className="h-3.5 w-3.5" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">{insight.description}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 flex-shrink-0 opacity-50 hover:opacity-100"
          onClick={() => onDismiss(insight.id)}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

interface AIInsightsPanelProps {
  maxInsights?: number;
}

export function AIInsightsPanel({ maxInsights = 6 }: AIInsightsPanelProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const { data, isLoading, isError } = useQuery<{ insights: Insight[] }>({
    queryKey: ['/api/analytics/insights'],
    staleTime: 10 * 60_000, // Cache for 10 min
  });

  const insights = (data?.insights || [])
    .filter(i => !dismissed.has(i.id))
    .slice(0, maxInsights);

  const handleDismiss = (id: string) => {
    setDismissed(prev => {
      const next = new Set(Array.from(prev));
      next.add(id);
      return next;
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            AI Insights
          </CardTitle>
          <CardDescription>Generating recommendations...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="py-6 text-center text-muted-foreground">
          <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
          <p className="text-sm">Unable to load insights right now.</p>
        </CardContent>
      </Card>
    );
  }

  if (insights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            AI Insights
          </CardTitle>
          <CardDescription>Actionable recommendations based on your data</CardDescription>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Sparkles className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p className="text-sm">
            No insights yet. As your analytics data grows, personalized recommendations will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-500" />
          AI Insights
          <Badge variant="secondary" className="ml-1">
            {insights.length}
          </Badge>
        </CardTitle>
        <CardDescription>Actionable recommendations based on your cross-platform data</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map(insight => (
          <InsightCard key={insight.id} insight={insight} onDismiss={handleDismiss} />
        ))}
      </CardContent>
    </Card>
  );
}
