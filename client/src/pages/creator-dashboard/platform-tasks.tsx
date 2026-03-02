/**
 * Creator Platform Tasks Page — Fandomly Tasks for creators.
 *
 * Route: /creator-dashboard/platform-tasks
 * Shows platform-level tasks that creators can complete to earn Fandomly Points.
 * Uses the same PlatformTaskCard component and /api/platform-tasks endpoint as the fan version.
 */

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { useAuth } from '@/contexts/auth-context';
import { apiRequest } from '@/lib/queryClient';
import { PlatformTaskCard } from '@/components/tasks/PlatformTaskCard';
import type { Task } from '@shared/schema';

export default function CreatorPlatformTasksPage() {
  const { user } = useAuth();

  const { data: platformTasksData, isLoading } = useQuery({
    queryKey: ['/api/platform-tasks'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/platform-tasks');
      return response.json();
    },
    enabled: !!user,
  });

  const platformTasks = platformTasksData?.tasks ?? [];

  const { data: platformPointsData } = useQuery({
    queryKey: ['/api/platform-points/balance'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/platform-points/balance');
      return response.json();
    },
    enabled: !!user,
  });

  const platformPoints = platformPointsData?.balance ?? 0;

  const completedCount = platformTasks.filter(
    (t: Task & { completion?: { status: string } | null }) =>
      t.completion?.status === 'completed' || t.completion?.status === 'verified'
  ).length;

  return (
    <DashboardLayout userType="creator">
      <div className="container max-w-7xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-brand-primary/20">
              <Star className="w-7 h-7 text-brand-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Fandomly Tasks</h1>
              <p className="text-muted-foreground mt-1">
                Complete platform tasks to earn Fandomly Points
              </p>
            </div>
          </div>
          <Badge className="bg-brand-primary/20 text-brand-primary border-brand-primary/40 text-lg px-4 py-2">
            {platformPoints} Points
          </Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="bg-card/50 border-white/10">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-white">{platformTasks.length}</p>
              <p className="text-xs text-muted-foreground">Available Tasks</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-white/10">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-400">{completedCount}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-white/10">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-brand-primary">{platformPoints}</p>
              <p className="text-xs text-muted-foreground">Fandomly Points</p>
            </CardContent>
          </Card>
        </div>

        {/* Task Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading tasks...</p>
          </div>
        ) : platformTasks.length === 0 ? (
          <Card className="bg-card/50 border-white/10">
            <CardContent className="py-12 text-center">
              <Star className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Tasks Available</h3>
              <p className="text-muted-foreground">
                Check back soon for new Fandomly tasks to earn platform points.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {platformTasks.map((task: Task) => (
              <PlatformTaskCard key={task.id} task={task} />
            ))}
          </div>
        )}

        {/* Info Note */}
        <p className="text-xs text-gray-500 mt-6 text-center">
          Fandomly Points are redeemable for platform rewards, NFTs, and special offers. They are
          separate from creator-issued loyalty points.
        </p>
      </div>
    </DashboardLayout>
  );
}
