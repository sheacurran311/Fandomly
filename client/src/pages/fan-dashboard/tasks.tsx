import { Trophy, Target, Flame, Filter, Search, Star, Plus } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FanTaskCard } from '@/components/tasks/FanTaskCard';
import { PlatformTaskCard } from '@/components/tasks/PlatformTaskCard';
import { CreatorTasksTable } from '@/components/tasks/CreatorTasksTable';
import { useUserTaskCompletions } from '@/hooks/useTaskCompletion';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/use-auth';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { Task, TaskCompletion } from '@shared/schema';
import { TimeframeSelector, type Timeframe } from '@/components/charts/TimeframeSelector';
import { LineChartCard } from '@/components/charts/LineChartCard';
import { PieChartCard } from '@/components/charts/PieChartCard';
import { BarChartCard } from '@/components/charts/BarChartCard';

export default function FanTasksPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [timeframe, setTimeframe] = useState<Timeframe>('weekly');

  // Fetch platform tasks (Fandomly-issued)
  const { data: platformTasksData, isLoading: isLoadingPlatformTasks } = useQuery({
    queryKey: ['/api/platform-tasks'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/platform-tasks');
      return response.json();
    },
    enabled: !!user,
  });
  const platformTasks = platformTasksData?.tasks || [];

  // Fetch platform points balance
  const { data: platformPointsData } = useQuery({
    queryKey: ['/api/platform-points/balance'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/platform-points/balance');
      return response.json();
    },
    enabled: !!user,
  });
  const platformPoints = platformPointsData?.balance || 0;

  // Fetch published creator tasks (server filters by joined programs)
  const { data: tasksData, isLoading: isLoadingTasks } = useTasks();
  const tasks = tasksData?.tasks || [];

  // Fetch user's task completions
  const { data: completionsData, isLoading: isLoadingCompletions } = useUserTaskCompletions();
  const completions = completionsData?.completions || [];

  // Create a map of task completions for quick lookup
  const completionMap = new Map<string, TaskCompletion>();
  completions.forEach((completion) => {
    completionMap.set(completion.taskId, completion);
  });

  // Filter tasks
  const filteredTasks = tasks.filter((task: Task) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!task.name.toLowerCase().includes(query) && 
          !task.description.toLowerCase().includes(query)) {
        return false;
      }
    }

    // Type filter
    if (filterType !== 'all') {
      const completion = completionMap.get(task.id);
      
      if (filterType === 'available' && completion?.status === 'completed') {
        return false;
      }
      if (filterType === 'in_progress' && completion?.status !== 'in_progress') {
        return false;
      }
      if (filterType === 'completed' && completion?.status !== 'completed') {
        return false;
      }
    }

    return true;
  });

  // Calculate stats
  const stats = {
    total: tasks.length,
    completed: completions.filter(c => c.status === 'completed').length,
    inProgress: completions.filter(c => c.status === 'in_progress').length,
    totalPoints: completions.reduce((sum, c) => sum + (c.pointsEarned || 0), 0),
  };

  // Fetch task completion stats for charts
  const { data: taskStats } = useQuery({
    queryKey: ['/api/fan/dashboard/task-completion-stats', timeframe],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/fan/dashboard/task-completion-stats?timeframe=${timeframe}`);
      return response.json();
    },
    enabled: !!user,
  });

  // Calculate task type breakdown
  const taskTypeBreakdown = tasks.reduce((acc: any, task: Task) => {
    const type = task.type || 'other';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const taskTypeData = Object.entries(taskTypeBreakdown).map(([type, count]) => ({
    name: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: count as number,
    color: type === 'social_follow' ? '#3b82f6' :
           type === 'social_like' ? '#8b5cf6' :
           type === 'engagement' ? '#10b981' :
           type === 'content' ? '#f59e0b' : '#6b7280'
  }));

  const isLoading = isLoadingTasks || isLoadingCompletions;

  return (
    <DashboardLayout userType="fan">
      <div className="container max-w-7xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold">Tasks & Rewards</h1>
            </div>
            <Link href="/find-creators">
              <Button className="bg-brand-primary hover:bg-brand-primary/80">
                <Plus className="w-4 h-4 mr-2" />
                Add Creators
              </Button>
            </Link>
          </div>
          <p className="text-muted-foreground">
            Complete tasks to earn points and unlock exclusive rewards
          </p>
        </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Tasks</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Target className="w-8 h-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <Trophy className="w-8 h-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              </div>
              <Flame className="w-8 h-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Points</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.totalPoints}</p>
              </div>
              <Star className="w-8 h-8 text-yellow-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task Activity & Insights */}
      <div className="mb-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Task Analytics</h2>
          <TimeframeSelector selected={timeframe} onChange={setTimeframe} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Task Completion Over Time */}
          <LineChartCard
            title="Task Completions"
            description="Your task completion activity over time"
            data={taskStats?.completions?.map((item: any) => ({
              period: item.period,
              completed: item.completed,
              inProgress: item.in_progress || 0
            })) || []}
            dataKeys={[
              { key: 'completed', color: '#10b981', name: 'Completed' },
              { key: 'inProgress', color: '#3b82f6', name: 'In Progress' }
            ]}
            xAxisKey="period"
            height={300}
          />

          {/* Task Types Breakdown */}
          <PieChartCard
            title="Task Types"
            description="Breakdown of available tasks by type"
            data={taskTypeData}
            height={300}
          />

          {/* Task Completion Rate */}
          <BarChartCard
            title="Completion Rate"
            description="Track your completion progress"
            data={[
              {
                status: 'Completed',
                count: stats.completed,
                color: '#10b981'
              },
              {
                status: 'In Progress',
                count: stats.inProgress,
                color: '#3b82f6'
              },
              {
                status: 'Available',
                count: stats.total - stats.completed - stats.inProgress,
                color: '#6b7280'
              }
            ]}
            dataKeys={[
              { key: 'count', color: '#8b5cf6', name: 'Tasks' }
            ]}
            xAxisKey="status"
            height={300}
          />

          {/* Platform vs Creator Tasks */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Task Distribution</CardTitle>
              <p className="text-sm text-gray-400">Platform vs Creator tasks</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <div>
                    <p className="text-sm text-gray-400">Platform Tasks</p>
                    <p className="text-2xl font-bold text-white">{platformTasks.length}</p>
                    <p className="text-xs text-gray-500 mt-1">Earn Fandomly Points</p>
                  </div>
                  <Star className="h-8 w-8 text-purple-400" />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div>
                    <p className="text-sm text-gray-400">Creator Tasks</p>
                    <p className="text-2xl font-bold text-white">{tasks.length}</p>
                    <p className="text-xs text-gray-500 mt-1">Earn Creator Points</p>
                  </div>
                  <Trophy className="h-8 w-8 text-blue-400" />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <div>
                    <p className="text-sm text-gray-400">Points Balance</p>
                    <p className="text-2xl font-bold text-white">{platformPoints.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">Platform Points</p>
                  </div>
                  <Star className="h-8 w-8 text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Platform Tasks Section */}
      {platformTasks.length > 0 && (
        <Card className="bg-gradient-to-r from-brand-primary/10 to-brand-secondary/10 border-brand-primary/30 mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center">
                  <Star className="mr-2 h-5 w-5 text-brand-primary" />
                  Platform Tasks
                </CardTitle>
                <p className="text-xs text-gray-400 mt-1">
                  Earn Fandomly Points - Redeemable for platform rewards, NFTs, and special offers
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  NOTE: Not redeemable for any creator-issued rewards
                </p>
              </div>
              <Badge className="bg-brand-primary/20 text-brand-primary border-brand-primary/40">
                {platformPoints} Points
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingPlatformTasks ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto"></div>
                <p className="mt-2 text-sm text-gray-400">Loading platform tasks...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {platformTasks.map((task: Task) => (
                  <PlatformTaskCard key={task.id} task={task} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Creator Tasks Section */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-white mb-2">Creator Tasks</h2>
        <p className="text-sm text-gray-400">Complete tasks from creators you follow to earn creator-specific rewards</p>
      </div>

      {/* Filters & Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Tabs value={filterType} onValueChange={setFilterType} className="w-full md:w-auto">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="available">Available</TabsTrigger>
                <TabsTrigger value="in_progress">Active</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Table */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading tasks...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Tasks Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery 
                ? 'Try adjusting your search or filters'
                : 'Join creators to see their tasks!'}
            </p>
            {!searchQuery && (
              <Link href="/find-creators">
                <Button className="bg-brand-primary hover:bg-brand-primary/80 mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Find Creators
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <CreatorTasksTable 
          tasks={filteredTasks as any} 
          completionMap={completionMap}
        />
      )}
      </div>
    </DashboardLayout>
  );
}
