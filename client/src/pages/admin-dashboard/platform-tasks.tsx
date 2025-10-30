import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Plus, Settings, Target, Trash2, Edit, Eye, EyeOff,
  CheckCircle, Clock, BarChart3, Search, Filter, Star
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import DashboardCard from "@/components/dashboard/dashboard-card";

type AccountType = 'fan' | 'creator' | 'creator-athlete' | 'creator-musician' | 'creator-content-creator';

interface PlatformTask {
  id: string;
  name: string;
  description: string;
  type: 'profile' | 'social' | 'engagement';
  category: string;
  points: number;
  isActive: boolean;
  requiredFields?: string[];
  socialPlatform?: string;
  eligibleAccountTypes?: AccountType[];
  createdAt: string;
  _count?: {
    completions: number;
  };
}

export default function AdminPlatformTasksIndex() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // State
  const [selectedTab, setSelectedTab] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAccountType, setFilterAccountType] = useState<string>('all');

  // Fetch platform tasks
  const { data: tasks = [], isLoading: tasksLoading, refetch } = useQuery<PlatformTask[]>({
    queryKey: ['/api/admin/platform-tasks'],
    queryFn: async (): Promise<PlatformTask[]> => {
      const response = await apiRequest('GET', '/api/admin/platform-tasks');
      return response.json();
    },
    enabled: !!user?.id,
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiRequest('DELETE', `/api/admin/platform-tasks/${taskId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Task Deleted",
        description: "The platform task has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/platform-tasks'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete task.",
        variant: "destructive",
      });
    }
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ taskId, isActive }: { taskId: string; isActive: boolean }) => {
      const response = await apiRequest('PUT', `/api/admin/platform-tasks/${taskId}`, { isActive: !isActive });
      return response.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.isActive ? "Task Deactivated" : "Task Activated",
        description: variables.isActive 
          ? "The task is now inactive and hidden from users." 
          : "The task is now active and visible to eligible users.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/platform-tasks'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update task status.",
        variant: "destructive",
      });
    }
  });

  // Filter and search tasks
  const filteredTasks = tasks.filter(task => {
    // Tab filter
    if (selectedTab === 'active' && !task.isActive) return false;
    if (selectedTab === 'inactive' && task.isActive) return false;

    // Search filter
    if (searchQuery && !task.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Type filter
    if (filterType !== 'all' && task.type !== filterType) {
      return false;
    }

    // Account type filter
    if (filterAccountType !== 'all') {
      const hasAccountType = task.eligibleAccountTypes?.includes(filterAccountType as AccountType);
      if (!hasAccountType) return false;
    }

    return true;
  });

  // Stats
  const stats = {
    total: tasks.length,
    active: tasks.filter(t => t.isActive).length,
    inactive: tasks.filter(t => !t.isActive).length,
    completions: tasks.reduce((sum, t) => sum + (t._count?.completions || 0), 0),
  };

  // Get unique task types for filters
  const taskTypes = Array.from(new Set(tasks.map(t => t.type)));

  const getAccountTypeLabel = (types?: AccountType[]) => {
    if (!types || types.length === 0) return 'All Users';
    if (types.length === 1) {
      const type = types[0];
      if (type === 'fan') return 'Fans';
      if (type === 'creator') return 'All Creators';
      if (type === 'creator-athlete') return 'Athletes';
      if (type === 'creator-musician') return 'Musicians';
      if (type === 'creator-content-creator') return 'Content Creators';
    }
    return `${types.length} Types`;
  };

  return (
    <AdminLayout
      title="Platform Task Management"
      description="Create and manage platform-wide tasks that award Fandomly Points"
    >
      <div>
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
                  <Star className="mr-3 h-8 w-8 text-brand-primary" />
                  Platform Task Management
                </h1>
                <p className="text-gray-400">
                  Create and manage platform-wide tasks that award Fandomly Points
                </p>
              </div>
              
              <Button 
                onClick={() => setLocation("/admin-dashboard/platform-tasks/create")}
                className="bg-brand-primary hover:bg-brand-primary/80"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Task
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <DashboardCard
              title="Total Tasks"
              value={stats.total}
              icon={<Settings className="h-5 w-5 text-blue-400" />}
              className="bg-blue-500/10 border-blue-500/20"
            />
            <DashboardCard
              title="Active"
              value={stats.active}
              icon={<CheckCircle className="h-5 w-5 text-green-400" />}
              className="bg-green-500/10 border-green-500/20"
            />
            <DashboardCard
              title="Inactive"
              value={stats.inactive}
              icon={<Clock className="h-5 w-5 text-amber-400" />}
              className="bg-amber-500/10 border-amber-500/20"
            />
            <DashboardCard
              title="Total Completions"
              value={stats.completions}
              icon={<BarChart3 className="h-5 w-5 text-purple-400" />}
              className="bg-purple-500/10 border-purple-500/20"
            />
          </div>

          {/* Filters & Search */}
          <Card className="bg-white/5 border-white/10 mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search tasks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                    />
                  </div>
                </div>

                {/* Type Filter */}
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-full md:w-[180px] bg-white/5 border-white/10 text-white">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Task Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="profile">Profile</SelectItem>
                    <SelectItem value="social">Social</SelectItem>
                    <SelectItem value="engagement">Engagement</SelectItem>
                  </SelectContent>
                </Select>

                {/* Account Type Filter */}
                <Select value={filterAccountType} onValueChange={setFilterAccountType}>
                  <SelectTrigger className="w-full md:w-[180px] bg-white/5 border-white/10 text-white">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Account Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Accounts</SelectItem>
                    <SelectItem value="fan">Fans Only</SelectItem>
                    <SelectItem value="creator">All Creators</SelectItem>
                    <SelectItem value="creator-athlete">Athletes</SelectItem>
                    <SelectItem value="creator-musician">Musicians</SelectItem>
                    <SelectItem value="creator-content-creator">Content Creators</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tasks List */}
          <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as 'all' | 'active' | 'inactive')}>
            <TabsList className="bg-white/5 border-white/10 mb-6">
              <TabsTrigger value="all">
                All ({stats.total})
              </TabsTrigger>
              <TabsTrigger value="active">
                Active ({stats.active})
              </TabsTrigger>
              <TabsTrigger value="inactive">
                Inactive ({stats.inactive})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab} className="space-y-4">
              {tasksLoading ? (
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading tasks...</p>
                  </CardContent>
                </Card>
              ) : filteredTasks.length === 0 ? (
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-12 text-center">
                    <Target className="mx-auto h-12 w-12 text-gray-600 mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {tasks.length === 0 ? "No Platform Tasks Yet" : "No Tasks Found"}
                    </h3>
                    <p className="text-gray-400 mb-6">
                      {tasks.length === 0 
                        ? "Create your first platform task to start rewarding users."
                        : "Try adjusting your search or filters."}
                    </p>
                    {tasks.length === 0 && (
                      <Button 
                        onClick={() => setLocation("/admin-dashboard/platform-tasks/create")}
                        className="bg-brand-primary hover:bg-brand-primary/80"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Task
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                filteredTasks.map((task) => (
                  <Card key={task.id} className="bg-white/5 border-white/10 hover:border-white/20 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-lg bg-brand-primary/20 flex items-center justify-center flex-shrink-0">
                              <Star className="h-6 w-6 text-brand-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-semibold text-white mb-1">
                                {task.name}
                              </h3>
                              <p className="text-sm text-gray-400 mb-3">
                                {task.description}
                              </p>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge className="bg-brand-primary/20 text-brand-primary border-brand-primary/40">
                                  {task.points} Fandomly Points
                                </Badge>
                                <Badge variant="outline" className="border-white/20 text-white capitalize">
                                  {task.type}
                                </Badge>
                                <Badge variant="outline" className="border-purple-500/30 text-purple-400">
                                  {getAccountTypeLabel(task.eligibleAccountTypes)}
                                </Badge>
                                {task.socialPlatform && (
                                  <Badge variant="outline" className="border-blue-500/30 text-blue-400 capitalize">
                                    {task.socialPlatform}
                                  </Badge>
                                )}
                                {task.isActive ? (
                                  <Badge className="bg-green-500/20 text-green-400 border-green-500/20">
                                    Active
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="border-gray-500 text-gray-400">
                                    Inactive
                                  </Badge>
                                )}
                                {task._count?.completions !== undefined && (
                                  <Badge variant="outline" className="border-amber-500/30 text-amber-400">
                                    {task._count.completions} completions
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLocation(`/admin-dashboard/platform-tasks/edit/${task.id}`)}
                            className="text-gray-400 hover:text-white"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleActiveMutation.mutate({ taskId: task.id, isActive: task.isActive })}
                            className={task.isActive ? "text-amber-400 hover:text-amber-300" : "text-green-400 hover:text-green-300"}
                          >
                            {task.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this task?')) {
                                deleteTaskMutation.mutate(task.id);
                              }
                            }}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
      </div>
    </AdminLayout>
  );
}

