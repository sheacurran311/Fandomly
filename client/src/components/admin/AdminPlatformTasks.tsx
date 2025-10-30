import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, 
  Settings, 
  Users, 
  Image, 
  MessageSquare, 
  Twitter, 
  Instagram, 
  Facebook, 
  Music, 
  Trophy,
  Target,
  Gift,
  Zap,
  CheckCircle,
  AlertCircle,
  Edit,
  Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

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
}

interface PlatformTaskForm {
  name: string;
  description: string;
  type: 'profile' | 'social' | 'engagement';
  category: string;
  points: number;
  requiredFields: string[];
  socialPlatform?: string;
  eligibleAccountTypes: AccountType[];
}

const PLATFORM_TASK_TEMPLATES = [
  {
    id: 'complete_profile',
    name: 'Complete Profile',
    description: 'Reward fans for completing their profile with required fields',
    type: 'profile' as const,
    category: 'Profile Completion',
    points: 100,
    requiredFields: ['bio', 'profile_photo', 'location', 'interests'],
    icon: Users,
  },
  {
    id: 'add_profile_photo',
    name: 'Add Profile Photo',
    description: 'Reward fans for adding a profile photo',
    type: 'profile' as const,
    category: 'Profile Completion',
    points: 50,
    requiredFields: ['profile_photo'],
    icon: Image,
  },
  {
    id: 'complete_bio',
    name: 'Complete Bio',
    description: 'Reward fans for writing a bio',
    type: 'profile' as const,
    category: 'Profile Completion',
    points: 25,
    requiredFields: ['bio'],
    icon: MessageSquare,
  },
  {
    id: 'connect_twitter',
    name: 'Connect Twitter',
    description: 'Reward fans for connecting their Twitter account',
    type: 'social' as const,
    category: 'Social Connection',
    points: 100,
    socialPlatform: 'twitter',
    icon: Twitter,
  },
  {
    id: 'connect_instagram',
    name: 'Connect Instagram',
    description: 'Reward fans for connecting their Instagram account',
    type: 'social' as const,
    category: 'Social Connection',
    points: 100,
    socialPlatform: 'instagram',
    icon: Instagram,
  },
  {
    id: 'connect_facebook',
    name: 'Connect Facebook',
    description: 'Reward fans for connecting their Facebook account',
    type: 'social' as const,
    category: 'Social Connection',
    points: 100,
    socialPlatform: 'facebook',
    icon: Facebook,
  },
  {
    id: 'connect_spotify',
    name: 'Connect Spotify',
    description: 'Reward fans for connecting their Spotify account',
    type: 'social' as const,
    category: 'Social Connection',
    points: 75,
    socialPlatform: 'spotify',
    icon: Music,
  },
  {
    id: 'first_task_completion',
    name: 'Complete First Task',
    description: 'Reward fans for completing their first task',
    type: 'engagement' as const,
    category: 'Engagement',
    points: 200,
    icon: Trophy,
  },
];

export default function AdminPlatformTasks() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<PlatformTask | null>(null);
  const [formData, setFormData] = useState<PlatformTaskForm>({
    name: '',
    description: '',
    type: 'profile',
    category: '',
    points: 50,
    requiredFields: [],
    socialPlatform: undefined,
    eligibleAccountTypes: ['fan'],
  });

  // Fetch platform tasks
  const { data: platformTasks, isLoading } = useQuery({
    queryKey: ['/api/admin/platform-tasks'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/platform-tasks');
      return response.json();
    },
  });

  // Create platform task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: PlatformTaskForm) => {
      const response = await apiRequest('POST', '/api/admin/platform-tasks', taskData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/platform-tasks'] });
      toast({
        title: "Platform Task Created",
        description: "The platform task has been created successfully.",
      });
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create platform task",
        variant: "destructive",
      });
    },
  });

  // Update platform task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, taskData }: { id: string; taskData: Partial<PlatformTaskForm> }) => {
      const response = await apiRequest('PUT', `/api/admin/platform-tasks/${id}`, taskData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/platform-tasks'] });
      toast({
        title: "Platform Task Updated",
        description: "The platform task has been updated successfully.",
      });
      setEditingTask(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update platform task",
        variant: "destructive",
      });
    },
  });

  // Toggle task status mutation
  const toggleTaskMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await apiRequest('PUT', `/api/admin/platform-tasks/${id}`, { isActive });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/platform-tasks'] });
      toast({
        title: "Task Status Updated",
        description: "The task status has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update task status",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'profile',
      category: '',
      points: 50,
      requiredFields: [],
      socialPlatform: undefined,
      eligibleAccountTypes: ['fan'],
    });
  };

  const handleTemplateSelect = (template: typeof PLATFORM_TASK_TEMPLATES[0]) => {
    setFormData({
      name: template.name,
      description: template.description,
      type: template.type,
      category: template.category,
      points: template.points,
      requiredFields: template.requiredFields || [],
      socialPlatform: template.socialPlatform,
      eligibleAccountTypes: ['fan'],
    });
  };

  const handleSubmit = () => {
    if (editingTask) {
      updateTaskMutation.mutate({ id: editingTask.id, taskData: formData });
    } else {
      createTaskMutation.mutate(formData);
    }
  };

  const handleEdit = (task: PlatformTask) => {
    setEditingTask(task);
    setFormData({
      name: task.name,
      description: task.description,
      type: task.type,
      category: task.category,
      points: task.points,
      requiredFields: task.requiredFields || [],
      socialPlatform: task.socialPlatform,
      eligibleAccountTypes: task.eligibleAccountTypes || ['fan'],
    });
    setIsCreateModalOpen(true);
  };

  const handleToggleStatus = (task: PlatformTask) => {
    toggleTaskMutation.mutate({ id: task.id, isActive: !task.isActive });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-gray-400">Loading platform tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Platform Tasks</h1>
          <p className="text-gray-400 mt-1">
            Manage platform-wide tasks that award Fandomly Points to all users
          </p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingTask(null); resetForm(); }}>
              <Plus className="h-4 w-4 mr-2" />
              Create Platform Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl bg-brand-dark-bg border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingTask ? 'Edit Platform Task' : 'Create Platform Task'}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {editingTask 
                  ? 'Update the platform task configuration' 
                  : 'Create a new platform-wide task that awards Fandomly Points'
                }
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Template Selection */}
              {!editingTask && (
                <div>
                  <Label className="text-white mb-3 block">Quick Templates</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {PLATFORM_TASK_TEMPLATES.map((template) => {
                      const IconComponent = template.icon;
                      return (
                        <Card 
                          key={template.id}
                          className="bg-white/5 border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
                          onClick={() => handleTemplateSelect(template)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-brand-primary/20 flex items-center justify-center">
                                <IconComponent className="h-5 w-5 text-brand-primary" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-white text-sm">{template.name}</h4>
                                <p className="text-xs text-gray-400">{template.category}</p>
                              </div>
                              <Badge variant="outline" className="border-brand-primary text-brand-primary">
                                {template.points} pts
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Form Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Task Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Complete Profile"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div>
                  <Label className="text-white">Points</Label>
                  <Input
                    type="number"
                    value={formData.points}
                    onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                    placeholder="50"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>

              <div>
                <Label className="text-white">Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of what fans need to do"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Task Type</Label>
                  <Select value={formData.type} onValueChange={(value: 'profile' | 'social' | 'engagement') => setFormData({ ...formData, type: value })}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="profile">Profile</SelectItem>
                      <SelectItem value="social">Social Connection</SelectItem>
                      <SelectItem value="engagement">Engagement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-white">Category</Label>
                  <Input
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., Profile Completion"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>

              {formData.type === 'social' && (
                <div>
                  <Label className="text-white">Social Platform</Label>
                  <Select value={formData.socialPlatform || ''} onValueChange={(value) => setFormData({ ...formData, socialPlatform: value })}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="twitter">Twitter</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="spotify">Spotify</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Eligible Account Types */}
              <div className="space-y-3">
                <Label className="text-white">Eligible Account Types</Label>
                <p className="text-xs text-gray-400 mb-2">Select which account types can see and complete this task</p>
                <div className="space-y-2 p-4 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="account-type-fan"
                      checked={formData.eligibleAccountTypes.includes('fan')}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({ ...formData, eligibleAccountTypes: [...formData.eligibleAccountTypes, 'fan'] });
                        } else {
                          setFormData({ ...formData, eligibleAccountTypes: formData.eligibleAccountTypes.filter(t => t !== 'fan') });
                        }
                      }}
                    />
                    <label
                      htmlFor="account-type-fan"
                      className="text-sm text-white font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Fans
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="account-type-creator"
                      checked={formData.eligibleAccountTypes.includes('creator')}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({ ...formData, eligibleAccountTypes: [...formData.eligibleAccountTypes, 'creator'] });
                        } else {
                          setFormData({ ...formData, eligibleAccountTypes: formData.eligibleAccountTypes.filter(t => t !== 'creator') });
                        }
                      }}
                    />
                    <label
                      htmlFor="account-type-creator"
                      className="text-sm text-white font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      All Creators
                    </label>
                  </div>
                  <div className="ml-6 space-y-2 border-l-2 border-white/10 pl-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="account-type-athlete"
                        checked={formData.eligibleAccountTypes.includes('creator-athlete')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({ ...formData, eligibleAccountTypes: [...formData.eligibleAccountTypes, 'creator-athlete'] });
                          } else {
                            setFormData({ ...formData, eligibleAccountTypes: formData.eligibleAccountTypes.filter(t => t !== 'creator-athlete') });
                          }
                        }}
                      />
                      <label
                        htmlFor="account-type-athlete"
                        className="text-sm text-gray-300 font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Athletes Only
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="account-type-musician"
                        checked={formData.eligibleAccountTypes.includes('creator-musician')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({ ...formData, eligibleAccountTypes: [...formData.eligibleAccountTypes, 'creator-musician'] });
                          } else {
                            setFormData({ ...formData, eligibleAccountTypes: formData.eligibleAccountTypes.filter(t => t !== 'creator-musician') });
                          }
                        }}
                      />
                      <label
                        htmlFor="account-type-musician"
                        className="text-sm text-gray-300 font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Musicians Only
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="account-type-content-creator"
                        checked={formData.eligibleAccountTypes.includes('creator-content-creator')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({ ...formData, eligibleAccountTypes: [...formData.eligibleAccountTypes, 'creator-content-creator'] });
                          } else {
                            setFormData({ ...formData, eligibleAccountTypes: formData.eligibleAccountTypes.filter(t => t !== 'creator-content-creator') });
                          }
                        }}
                      />
                      <label
                        htmlFor="account-type-content-creator"
                        className="text-sm text-gray-300 font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Content Creators Only
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 border-white/20"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
                  className="flex-1 bg-brand-primary hover:bg-brand-primary/90"
                >
                  {editingTask ? 'Update Task' : 'Create Task'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Platform Tasks List */}
      <div className="grid gap-4">
        {platformTasks?.length === 0 ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-8 text-center">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Platform Tasks</h3>
              <p className="text-gray-400 mb-4">
                Create your first platform task to reward users with Fandomly Points.
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Task
              </Button>
            </CardContent>
          </Card>
        ) : (
          platformTasks?.map((task: PlatformTask) => (
            <Card key={task.id} className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-brand-primary/20 flex items-center justify-center">
                      <Gift className="h-6 w-6 text-brand-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{task.name}</h3>
                      <p className="text-sm text-gray-400">{task.description}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <Badge variant="outline" className="border-brand-primary text-brand-primary">
                          {task.points} Fandomly Points
                        </Badge>
                        <Badge variant="outline" className="border-white/20 text-white">
                          {task.category}
                        </Badge>
                        {task.isActive ? (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/20">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-gray-500 text-gray-400">
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(task)}
                      className="border-white/20"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(task)}
                      className={task.isActive ? "border-red-500 text-red-400" : "border-green-500 text-green-400"}
                    >
                      {task.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
