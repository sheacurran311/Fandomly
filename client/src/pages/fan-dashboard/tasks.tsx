import { Trophy, Target, Flame, Filter, Search, Star, Plus } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FanTaskCard } from '@/components/tasks/FanTaskCard';
import { useUserTaskCompletions } from '@/hooks/useTaskCompletion';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/use-auth';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Link } from 'wouter';
import type { Task, TaskCompletion } from '@shared/schema';

export default function FanTasksPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // Fetch all published tasks (you'll need to add this endpoint)
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

      {/* Tasks Grid */}
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
                : 'Check back soon for new tasks!'}
            </p>
            {!searchQuery && (
              <p className="text-muted-foreground">
                or{' '}
                <Link href="/find-creators">
                  <span className="text-brand-primary hover:text-brand-primary/80 underline cursor-pointer">
                    search for more Creators
                  </span>
                </Link>
                {' '}to find active tasks!
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTasks.map((task: Task) => (
            <FanTaskCard
              key={task.id}
              task={task}
              completion={completionMap.get(task.id)}
              tenantId={task.tenantId}
            />
          ))}
        </div>
      )}
      </div>
    </DashboardLayout>
  );
}
