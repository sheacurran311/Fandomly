import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Plus, Settings, Target, Share2, Heart, MessageCircle, 
  Facebook, Instagram, Twitter, Youtube, Music, 
  CheckCircle, Clock, AlertCircle, ArrowRight, Link
} from "lucide-react";
import SidebarNavigation from "@/components/dashboard/sidebar-navigation";
import DashboardCard from "@/components/dashboard/dashboard-card";
import { TemplatePicker } from "@/components/templates/TemplatePicker";
import { TaskTemplateManagement } from "@/components/templates/TaskTemplateManagement";
import { useInstagramConnection } from "@/contexts/instagram-connection-context";
import { useFacebookConnection } from "@/contexts/facebook-connection-context";

// Task types configuration
const taskTypes = [
  { 
    id: 'follow', 
    name: 'Follow/Subscribe', 
    platforms: ['facebook', 'instagram', 'twitter', 'tiktok', 'youtube', 'spotify'],
    points: 50,
    icon: Heart,
    color: 'bg-red-500/20 text-red-400 border-red-500/30'
  },
  { 
    id: 'like_post', 
    name: 'Like Specific Post', 
    platforms: ['facebook', 'instagram', 'twitter', 'tiktok'],
    points: 50,
    icon: Heart,
    color: 'bg-pink-500/20 text-pink-400 border-pink-500/30'
  },
  { 
    id: 'comment', 
    name: 'Comment on Post', 
    platforms: ['facebook', 'instagram', 'twitter', 'tiktok'],
    points: 100,
    icon: MessageCircle,
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  },
  { 
    id: 'share', 
    name: 'Share/Repost', 
    platforms: ['facebook', 'instagram', 'twitter', 'tiktok'],
    points: 200,
    icon: Share2,
    color: 'bg-green-500/20 text-green-400 border-green-500/30'
  },
  { 
    id: 'hashtag_post', 
    name: 'Post with Hashtag', 
    platforms: ['instagram', 'twitter', 'tiktok'],
    points: 150,
    icon: Target,
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
  },
];

// Platform icons
const platformIcons = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  tiktok: Music,
  youtube: Youtube,
  spotify: Music,
};

interface Task {
  id: string;
  name: string;
  description: string;
  taskType: string;
  platform: string;
  targetUrl?: string;
  hashtags?: string[];
  rewardValue?: number;
  points?: number; // legacy
  isActive: boolean;
  assignedCampaigns: number;
  totalCompletions: number;
  createdAt: string;
}

export default function TasksManagement() {
  const { user } = useAuth();
  const { user: dynamicUser } = useDynamicContext();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const instagram = useInstagramConnection?.();
  const facebook = useFacebookConnection?.();

  // Fetch creator's tasks using real API with authentication guards
  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useQuery<Task[]>({
    queryKey: ['/api/tasks', user?.id],
    queryFn: async (): Promise<Task[]> => {
      const response = await apiRequest('/api/tasks');
      return response.json();
    },
    enabled: !!(dynamicUser && user?.id), // Require both Dynamic auth and user data
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch pending campaigns for assignment using real API with authentication guards
  const { data: pendingCampaigns = [] } = useQuery<any[]>({
    queryKey: ['/api/campaigns/pending', user?.id],
    queryFn: async (): Promise<any[]> => {
      const response = await apiRequest('/api/campaigns/pending');
      return response.json();
    },
    enabled: !!(dynamicUser && user?.id), // Require both Dynamic auth and user data
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Task stats
  const taskStats = {
    totalTasks: tasks.length,
    activeTasks: tasks.filter((t: Task) => t.isActive).length,
    assignedTasks: tasks.reduce((sum: number, t: Task) => sum + t.assignedCampaigns, 0),
    totalCompletions: tasks.reduce((sum: number, t: Task) => sum + t.totalCompletions, 0),
  };

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      const response = await apiRequest('/api/tasks', 'POST', taskData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Task Created",
        description: "Your new task has been created successfully!",
        duration: 3000
      });
      setCreateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', user?.id] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to create task. Please try again.",
        variant: "destructive",
        duration: 3000
      });
    }
  });

  const handleCreateTask = async (taskData: any) => {
    createTaskMutation.mutate(taskData);
  };

  // Task assignment mutation
  const assignTaskMutation = useMutation({
    mutationFn: async ({ taskId, campaignId }: { taskId: string; campaignId: string }) => {
      const response = await apiRequest(`/api/tasks/${taskId}/assign`, 'POST', { campaignId });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Task Assigned",
        description: `${selectedTask?.name} has been assigned to the campaign!`,
        duration: 3000
      });
      setAssignModalOpen(false);
      setSelectedTask(null);
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns/pending', user?.id] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to assign task. Please try again.",
        variant: "destructive",
        duration: 3000
      });
    }
  });

  const handleAssignTask = async (campaignId: string) => {
    if (!selectedTask) return;
    assignTaskMutation.mutate({ 
      taskId: selectedTask.id, 
      campaignId 
    });
  };

  return (
    <div className="min-h-screen bg-brand-dark-bg flex">
      <SidebarNavigation userType="creator" />
      
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Task Management
                </h1>
                <p className="text-gray-400">
                  Create and manage tasks that can be assigned to campaigns
                </p>
              </div>
              
              <Button 
                onClick={() => setLocation("/creator-dashboard/tasks/create")}
                className="bg-brand-primary hover:bg-brand-primary/80"
                data-testid="button-create-task"
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
              value={taskStats.totalTasks}
              icon={<Settings className="h-5 w-5 text-blue-400" />}
              className="bg-blue-500/10 border-blue-500/20"
            />
            <DashboardCard
              title="Active Tasks"
              value={taskStats.activeTasks}
              icon={<CheckCircle className="h-5 w-5 text-green-400" />}
              className="bg-green-500/10 border-green-500/20"
            />
            <DashboardCard
              title="Task Assignments"
              value={taskStats.assignedTasks}
              icon={<Link className="h-5 w-5 text-purple-400" />}
              className="bg-purple-500/10 border-purple-500/20"
            />
            <DashboardCard
              title="Total Completions"
              value={taskStats.totalCompletions}
              icon={<Target className="h-5 w-5 text-amber-400" />}
              className="bg-amber-500/10 border-amber-500/20"
            />
          </div>

          {/* Task Templates Section */}
          <div className="space-y-6">
            <TaskTemplateManagement 
              onCreateTask={(templateId) => {
                // Future: Could prefill template picker with selected template
                setCreateModalOpen(true);
              }}
            />
          </div>

          {/* Tasks Grid */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Your Custom Tasks</h2>
            
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
            ) : tasks.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-12 text-center">
                  <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No Tasks Yet</h3>
                  <p className="text-gray-400 mb-6">
                    Create your first task to get started with campaign assignments.
                  </p>
                  <Button 
                    onClick={() => setCreateModalOpen(true)}
                    className="bg-brand-primary hover:bg-brand-primary/80"
                  >
                    Create Your First Task
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tasks.map((task: Task) => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onAssign={(task) => {
                      setSelectedTask(task);
                      setAssignModalOpen(true);
                    }}
                    onUpdate={refetchTasks}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Task Assignment Modal */}
          <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
            <DialogContent className="sm:max-w-md bg-brand-dark-bg border-white/10">
              <DialogHeader>
                <DialogTitle className="text-white">Assign Task to Campaign</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="text-gray-300 mb-4">
                  Assign "{selectedTask?.name}" to a pending campaign:
                </p>
                <div className="space-y-3">
                  {pendingCampaigns.map((campaign: any) => (
                    <Card 
                      key={campaign.id}
                      className="bg-white/5 border-white/10 hover:border-brand-primary/30 cursor-pointer transition-all"
                      onClick={() => handleAssignTask(campaign.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-white font-medium">{campaign.name}</h4>
                            <p className="text-sm text-gray-400">
                              {campaign.assignedTasks} tasks assigned
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-brand-primary" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {pendingCampaigns.length === 0 && (
                  <p className="text-gray-400 text-center py-8">
                    No pending campaigns available. Create a campaign first.
                  </p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

// Task Card Component
function TaskCard({ task, onAssign, onUpdate }: { 
  task: Task; 
  onAssign: (task: Task) => void;
  onUpdate: () => void;
}) {
  const { toast } = useToast();
  const taskTypeConfig = taskTypes.find(t => t.id === task.taskType);
  const PlatformIcon = platformIcons[task.platform as keyof typeof platformIcons];
  const TaskIcon = taskTypeConfig?.icon || Settings;
  const instagram = useInstagramConnection?.();
  const facebook = useFacebookConnection?.();

  const isPlatformConnected = (p: string): boolean => {
    if (p === 'instagram') return !!instagram?.isConnected;
    if (p === 'facebook') return !!facebook?.isConnected;
    return false;
  };
  const connected = isPlatformConnected(task.platform);
  const platformTitle = task.platform.charAt(0).toUpperCase() + task.platform.slice(1);

  const toggleTaskStatus = async () => {
    try {
      // Prevent activation if platform is not connected
      if (!task.isActive && !connected) {
        toast({
          title: "Cannot Activate",
          description: `Connect your ${task.platform} account to publish this task.`,
          variant: "destructive",
        });
        return;
      }
      // TODO: Implement actual API call to update isActive
      toast({
        title: task.isActive ? "Task Deactivated" : "Task Activated",
        description: `${task.name} has been ${task.isActive ? 'deactivated' : 'activated'}.`,
        duration: 3000
      });
      
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update task status.",
        variant: "destructive",
        duration: 3000
      });
    }
  };

  return (
    <Card className={`bg-white/5 border-white/10 transition-all hover:border-brand-primary/30 ${!task.isActive ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-brand-primary/20 rounded-lg">
              <TaskIcon className="h-5 w-5 text-brand-primary" />
            </div>
            <div>
              <CardTitle className="text-white text-lg">{task.name}</CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <Badge className={taskTypeConfig?.color || 'bg-gray-500/20 text-gray-400'}>
                  {taskTypeConfig?.name}
                </Badge>
                <PlatformIcon className="h-4 w-4 text-gray-400" />
                {!connected && (
                  <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                    Pending: Connect {task.platform}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Switch
              checked={task.isActive && connected}
              onCheckedChange={toggleTaskStatus}
              disabled={!connected}
              className="data-[state=checked]:bg-brand-primary"
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <p className="text-gray-300 text-sm">{task.description}</p>
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-1 text-emerald-400">
              <Target className="h-4 w-4" />
              <span>{task.rewardValue ?? task.points ?? 0} points</span>
            </div>
            <div className="text-gray-400">
              {task.totalCompletions} completions
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="text-purple-400">
              <Link className="h-4 w-4 inline mr-1" />
              {task.assignedCampaigns} campaigns
            </div>
            <Badge variant={task.isActive ? "default" : "secondary"}>
              {task.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>

          <div className="pt-2 border-t border-white/10">
            <Button 
              onClick={() => onAssign(task)}
              variant="outline" 
              size="sm"
              className="w-full border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10 disabled:opacity-60"
              disabled={!connected}
              data-testid={`button-assign-task-${task.id}`}
            >
              {connected ? 'Assign to Campaign' : `Connect ${task.platform} to Assign`}
            </Button>
            {!connected && (
              <p className="mt-2 text-xs text-yellow-400">
                This task is in Pending mode. Connect your {task.platform} account to publish. Visible on mobile.
              </p>
            )}
            {!connected && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                onClick={() => { window.location.href = '/creator-dashboard/social'; }}
                data-testid={`button-connect-${task.platform}`}
              >
                Connect {platformTitle} Account
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Task Creation Form Component
function TaskCreationForm({ onSubmit, onCancel }: { onSubmit: (data: any) => void; onCancel: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    taskType: '',
    platform: '',
    targetUrl: '',
    hashtags: '',
    points: 50,
  });

  const selectedTaskType = taskTypes.find(t => t.id === formData.taskType);
  const availablePlatforms = selectedTaskType?.platforms || [];

  const handleSubmit = () => {
    if (!formData.name || !formData.taskType || !formData.platform) {
      return; // Form validation
    }

    const taskData = {
      ...formData,
      hashtags: formData.hashtags ? formData.hashtags.split(',').map(h => h.trim()) : [],
      points: selectedTaskType?.points || formData.points,
    };

    onSubmit(taskData);
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Reset platform when task type changes
    if (field === 'taskType') {
      setFormData(prev => ({ ...prev, platform: '' }));
    }
  };

  return (
    <div className="space-y-6" data-testid="form-task-creation">
      <div className="space-y-4">
        <div>
          <Label className="text-white">Task Name</Label>
          <Input
            placeholder="e.g., Follow on Instagram, Like Latest Post"
            value={formData.name}
            onChange={(e) => updateFormData('name', e.target.value)}
            className="mt-2 bg-white/10 border-white/20 text-white"
            data-testid="input-task-name"
          />
        </div>
        
        <div>
          <Label className="text-white">Description</Label>
          <Textarea
            placeholder="Describe what fans need to do..."
            value={formData.description}
            onChange={(e) => updateFormData('description', e.target.value)}
            className="mt-2 bg-white/10 border-white/20 text-white"
            rows={3}
            data-testid="textarea-task-description"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-white">Task Type</Label>
            <Select value={formData.taskType} onValueChange={(value) => updateFormData('taskType', value)}>
              <SelectTrigger className="mt-2 bg-white/10 border-white/20 text-white" data-testid="select-task-type">
                <SelectValue placeholder="Select task type" />
              </SelectTrigger>
              <SelectContent>
                {taskTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name} ({type.points} pts)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-white">Platform</Label>
            <Select 
              value={formData.platform} 
              onValueChange={(value) => updateFormData('platform', value)}
              disabled={!formData.taskType}
            >
              <SelectTrigger className="mt-2 bg-white/10 border-white/20 text-white" data-testid="select-platform">
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {availablePlatforms.map((platform) => (
                  <SelectItem key={platform} value={platform}>
                    <div className="flex items-center space-x-2">
                      {platformIcons[platform as keyof typeof platformIcons] && 
                        React.createElement(platformIcons[platform as keyof typeof platformIcons], { className: "h-4 w-4" })
                      }
                      <span className="capitalize">{platform}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {(formData.taskType === 'like_post' || formData.taskType === 'share' || formData.taskType === 'comment') && (
          <div>
            <Label className="text-white">Target URL</Label>
            <Input
              placeholder="https://instagram.com/p/your-post-id"
              value={formData.targetUrl}
              onChange={(e) => updateFormData('targetUrl', e.target.value)}
              className="mt-2 bg-white/10 border-white/20 text-white"
              data-testid="input-target-url"
            />
          </div>
        )}

        {formData.taskType === 'hashtag_post' && (
          <div>
            <Label className="text-white">Required Hashtags</Label>
            <Input
              placeholder="#yourhashtag, #campaign2024"
              value={formData.hashtags}
              onChange={(e) => updateFormData('hashtags', e.target.value)}
              className="mt-2 bg-white/10 border-white/20 text-white"
              data-testid="input-hashtags"
            />
            <p className="text-xs text-gray-400 mt-1">Separate multiple hashtags with commas</p>
          </div>
        )}
      </div>

      {/* Task Preview */}
      {formData.taskType && formData.platform && (
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <h4 className="text-white font-medium mb-2">Task Preview</h4>
          <div className="space-y-2 text-sm">
            <p className="text-gray-300">
              <strong>Action:</strong> {selectedTaskType?.name}
            </p>
            <p className="text-gray-300">
              <strong>Platform:</strong> <span className="capitalize">{formData.platform}</span>
            </p>
            <p className="text-gray-300">
              <strong>Reward:</strong> {selectedTaskType?.points} points per completion
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          data-testid="button-cancel-task"
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={!formData.name || !formData.taskType || !formData.platform}
          className="bg-brand-primary hover:bg-brand-primary/80"
          data-testid="button-create-task-submit"
        >
          Create Task
        </Button>
      </div>
    </div>
  );
}