import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Plus, Settings, Target, Trash2, Edit, Eye, EyeOff,
  CheckCircle, Clock, BarChart3, Search, Filter, X,
  CheckSquare, Square, TrendingUp
} from "lucide-react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import DashboardCard from "@/components/dashboard/dashboard-card";

interface Task {
  id: string;
  name: string;
  description: string;
  taskType: string;
  platform?: string;
  ownershipLevel: 'platform' | 'creator';
  isDraft: boolean;
  isActive: boolean;
  pointsToReward?: number;
  frequency?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    completions: number;
  };
}

export default function CreatorTasksIndex() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // State
  const [selectedTab, setSelectedTab] = useState<'all' | 'published' | 'draft'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterFrequency, setFilterFrequency] = useState<string>('all');

  // Sprint 4B: Bulk operations
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);

  // Fetch tasks
  const { data: tasks = [], isLoading: tasksLoading, refetch } = useQuery<Task[]>({
    queryKey: ['/api/tasks', user?.id],
    queryFn: async (): Promise<Task[]> => {
      const response = await apiRequest('GET', '/api/tasks');
      return response.json();
    },
    enabled: !!user?.id,
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiRequest('DELETE', `/api/tasks/${taskId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Task Deleted",
        description: "The task has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete task.",
        variant: "destructive",
      });
    }
  });

  // Toggle publish mutation
  const togglePublishMutation = useMutation({
    mutationFn: async ({ taskId, isDraft }: { taskId: string; isDraft: boolean }) => {
      const response = await apiRequest('PUT', `/api/tasks/${taskId}`, { isDraft: !isDraft });
      return response.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.isDraft ? "Task Published" : "Task Unpublished",
        description: variables.isDraft 
          ? "The task is now live and visible to fans." 
          : "The task has been moved to drafts.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update task status.",
        variant: "destructive",
      });
    }
  });

  // Sprint 4B: Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (taskIds: string[]) => {
      await Promise.all(taskIds.map(id =>
        apiRequest('DELETE', `/api/tasks/${id}`).then(r => r.json())
      ));
    },
    onSuccess: () => {
      toast({
        title: "Tasks Deleted",
        description: `Successfully deleted ${selectedTasks.size} task(s).`,
      });
      setSelectedTasks(new Set());
      setBulkMode(false);
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete some tasks.",
        variant: "destructive",
      });
    }
  });

  // Sprint 4B: Bulk publish mutation
  const bulkPublishMutation = useMutation({
    mutationFn: async ({ taskIds, isDraft }: { taskIds: string[]; isDraft: boolean }) => {
      await Promise.all(taskIds.map(id =>
        apiRequest('PUT', `/api/tasks/${id}`, { isDraft }).then(r => r.json())
      ));
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.isDraft ? "Tasks Saved as Drafts" : "Tasks Published",
        description: `Successfully updated ${selectedTasks.size} task(s).`,
      });
      setSelectedTasks(new Set());
      setBulkMode(false);
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update some tasks.",
        variant: "destructive",
      });
    }
  });

  // Sprint 4B: Bulk selection handlers
  const toggleTaskSelection = (taskId: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedTasks.size === filteredTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(filteredTasks.map(t => t.id)));
    }
  };

  // Filter and search tasks
  const filteredTasks = tasks.filter(task => {
    // Tab filter
    if (selectedTab === 'published' && task.isDraft) return false;
    if (selectedTab === 'draft' && !task.isDraft) return false;

    // Search filter
    if (searchQuery && !task.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Type filter
    if (filterType !== 'all' && task.taskType !== filterType) {
      return false;
    }

    // Platform filter
    if (filterPlatform !== 'all' && task.platform !== filterPlatform) {
      return false;
    }

    // Sprint 4B: Frequency filter
    if (filterFrequency !== 'all' && task.frequency !== filterFrequency) {
      return false;
    }

    return true;
  });

  // Stats
  const stats = {
    total: tasks.length,
    published: tasks.filter(t => !t.isDraft).length,
    draft: tasks.filter(t => t.isDraft).length,
    completions: tasks.reduce((sum, t) => sum + (t._count?.completions || 0), 0),
  };

  // Get unique task types and platforms for filters
  const taskTypes = Array.from(new Set(tasks.map(t => t.taskType)));
  const platforms = Array.from(new Set(tasks.map(t => t.platform).filter(Boolean))) as string[];

  return (
    <DashboardLayout userType="creator">
      <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Task Management
                </h1>
                <p className="text-gray-400">
                  Create, manage, and track your tasks and campaigns
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => setBulkMode(!bulkMode)}
                  variant="outline"
                  className="border-white/20 hover:bg-white/5"
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  {bulkMode ? 'Exit Bulk Mode' : 'Bulk Actions'}
                </Button>
                <Button
                  onClick={() => setLocation("/creator-dashboard/tasks/create")}
                  className="bg-brand-primary hover:bg-brand-primary/80"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Task
                </Button>
              </div>
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
              title="Published"
              value={stats.published}
              icon={<CheckCircle className="h-5 w-5 text-green-400" />}
              className="bg-green-500/10 border-green-500/20"
            />
            <DashboardCard
              title="Drafts"
              value={stats.draft}
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
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search tasks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>

                {/* Type Filter */}
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-full md:w-[200px] bg-white/10 border-white/20 text-white">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Task Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {taskTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Platform Filter */}
                {platforms.length > 0 && (
                  <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                    <SelectTrigger className="w-full md:w-[200px] bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Platforms</SelectItem>
                      {platforms.map(platform => (
                        <SelectItem key={platform} value={platform}>
                          <span className="capitalize">{platform}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Sprint 4B: Frequency Filter */}
                <Select value={filterFrequency} onValueChange={setFilterFrequency}>
                  <SelectTrigger className="w-full md:w-[200px] bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Frequencies</SelectItem>
                    <SelectItem value="one_time">One-time</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Sprint 4B: Bulk Actions Bar */}
          {bulkMode && selectedTasks.size > 0 && (
            <Card className="bg-brand-primary/10 border-brand-primary/30 mb-6">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-white font-semibold">
                      {selectedTasks.size} task(s) selected
                    </div>
                    <Button
                      onClick={() => setSelectedTasks(new Set())}
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/10"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear Selection
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => bulkPublishMutation.mutate({
                        taskIds: Array.from(selectedTasks),
                        isDraft: false
                      })}
                      variant="outline"
                      size="sm"
                      className="border-white/20 text-white hover:bg-white/10"
                      disabled={bulkPublishMutation.isPending}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Publish All
                    </Button>
                    <Button
                      onClick={() => bulkPublishMutation.mutate({
                        taskIds: Array.from(selectedTasks),
                        isDraft: true
                      })}
                      variant="outline"
                      size="sm"
                      className="border-white/20 text-white hover:bg-white/10"
                      disabled={bulkPublishMutation.isPending}
                    >
                      <EyeOff className="h-4 w-4 mr-1" />
                      Unpublish All
                    </Button>
                    <Button
                      onClick={() => {
                        if (confirm(`Delete ${selectedTasks.size} task(s)? This cannot be undone.`)) {
                          bulkDeleteMutation.mutate(Array.from(selectedTasks));
                        }
                      }}
                      variant="outline"
                      size="sm"
                      className="border-red-500/20 text-red-400 hover:bg-red-500/10"
                      disabled={bulkDeleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete All
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tasks Tabs */}
          <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)} className="space-y-6">
            <div className="flex items-center justify-between">
              <TabsList className="bg-white/5 border-white/10">
                <TabsTrigger value="all">All Tasks ({stats.total})</TabsTrigger>
                <TabsTrigger value="published">Published ({stats.published})</TabsTrigger>
                <TabsTrigger value="draft">Drafts ({stats.draft})</TabsTrigger>
              </TabsList>

              {/* Sprint 4B: Select All Toggle */}
              {bulkMode && filteredTasks.length > 0 && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedTasks.size === filteredTasks.length && filteredTasks.length > 0}
                    onCheckedChange={toggleSelectAll}
                    id="select-all"
                  />
                  <Label htmlFor="select-all" className="text-white cursor-pointer">
                    Select All ({filteredTasks.length})
                  </Label>
                </div>
              )}
            </div>

            <TabsContent value={selectedTab} className="space-y-6">
              {tasksLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="bg-white/5 border-white/10 animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-4 bg-white/20 rounded mb-4"></div>
                        <div className="h-3 bg-white/10 rounded mb-2"></div>
                        <div className="h-3 bg-white/10 rounded w-3/4"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredTasks.length === 0 ? (
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-12 text-center">
                    <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">No Tasks Found</h3>
                    <p className="text-gray-400 mb-6">
                      {searchQuery || filterType !== 'all' || filterPlatform !== 'all'
                        ? "Try adjusting your filters or search query."
                        : "Create your first task to get started with your campaigns."}
                    </p>
                    {!searchQuery && filterType === 'all' && filterPlatform === 'all' && (
                      <Button 
                        onClick={() => setLocation("/creator-dashboard/tasks/create")}
                        className="bg-brand-primary hover:bg-brand-primary/80"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Task
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onDelete={() => deleteTaskMutation.mutate(task.id)}
                      onTogglePublish={() => togglePublishMutation.mutate({
                        taskId: task.id,
                        isDraft: task.isDraft
                      })}
                      onEdit={() => setLocation(`/creator-dashboard/tasks/edit/${task.id}`)}
                      bulkMode={bulkMode}
                      isSelected={selectedTasks.has(task.id)}
                      onToggleSelection={() => toggleTaskSelection(task.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
    </DashboardLayout>
  );
}

// Task Card Component
function TaskCard({
  task,
  onDelete,
  onTogglePublish,
  onEdit,
  bulkMode = false,
  isSelected = false,
  onToggleSelection,
}: {
  task: Task;
  onDelete: () => void;
  onTogglePublish: () => void;
  onEdit: () => void;
  bulkMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: () => void;
}) {
  const getTaskTypeColor = (type: string) => {
    if (type.includes('referral')) return 'bg-purple-500/20 text-purple-400';
    if (type.includes('check')) return 'bg-orange-500/20 text-orange-400';
    if (type.includes('milestone')) return 'bg-blue-500/20 text-blue-400';
    if (type.includes('profile')) return 'bg-green-500/20 text-green-400';
    if (type.includes('twitter') || type.includes('facebook') || type.includes('instagram')) {
      return 'bg-indigo-500/20 text-indigo-400';
    }
    return 'bg-gray-500/20 text-gray-400';
  };

  const getFrequencyText = (frequency?: string) => {
    if (!frequency) return 'One-time';
    if (frequency === 'daily') return 'Daily';
    if (frequency === 'weekly') return 'Weekly';
    if (frequency === 'monthly') return 'Monthly';
    if (frequency === 'repeatable') return 'Repeatable';
    return 'One-time';
  };

  return (
    <Card className={`bg-white/5 border-white/10 hover:border-brand-primary/30 transition-all ${task.isDraft ? 'opacity-75' : ''} ${isSelected ? 'ring-2 ring-brand-primary' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          {/* Sprint 4B: Bulk selection checkbox */}
          {bulkMode && onToggleSelection && (
            <div className="mr-3 pt-1">
              <Checkbox
                checked={isSelected}
                onCheckedChange={onToggleSelection}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {task.isDraft ? (
                <Badge variant="secondary" className="bg-amber-500/20 text-amber-400">
                  <Clock className="h-3 w-3 mr-1" />
                  Draft
                </Badge>
              ) : (
                <Badge className="bg-green-500/20 text-green-400">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Published
                </Badge>
              )}
              <Badge className={getTaskTypeColor(task.taskType)}>
                {task.taskType.replace(/_/g, ' ')}
              </Badge>
            </div>
            <CardTitle className="text-white text-lg mb-1">{task.name}</CardTitle>
            <p className="text-gray-400 text-sm line-clamp-2">{task.description}</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Metrics */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-emerald-400">
            <Target className="h-4 w-4" />
            <span>{task.pointsToReward || 0} pts</span>
          </div>
          <div className="text-gray-400">
            {task._count?.completions || 0} completions
          </div>
        </div>

        <div className="text-sm text-gray-400">
          <Clock className="h-4 w-4 inline mr-1" />
          {getFrequencyText(task.frequency)}
        </div>

        {task.platform && (
          <Badge variant="outline" className="border-white/20 text-gray-300">
            <span className="capitalize">{task.platform}</span>
          </Badge>
        )}

        {/* Actions */}
        <div className="pt-4 border-t border-white/10 flex gap-2">
          <Button 
            onClick={onEdit}
            variant="outline" 
            size="sm"
            className="flex-1 border-white/20 hover:bg-white/5"
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button 
            onClick={onTogglePublish}
            variant="outline" 
            size="sm"
            className="flex-1 border-white/20 hover:bg-white/5"
          >
            {task.isDraft ? (
              <>
                <Eye className="h-4 w-4 mr-1" />
                Publish
              </>
            ) : (
              <>
                <EyeOff className="h-4 w-4 mr-1" />
                Unpublish
              </>
            )}
          </Button>
          <Button 
            onClick={onDelete}
            variant="outline" 
            size="sm"
            className="border-red-500/20 text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

