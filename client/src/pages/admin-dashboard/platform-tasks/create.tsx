import { useState, useEffect } from 'react';
import { useLocation, useRoute } from "wouter";
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft, Save, Star, Users, Image as ImageIcon, 
  MessageSquare, Twitter, Instagram, Facebook, Music, Trophy,
  Youtube, Video, Heart, Share, MessageCircle, UserPlus
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { FaSpotify, FaTiktok } from 'react-icons/fa';
import { CompleteProfileTaskBuilder } from "@/components/templates/CompleteProfileTaskBuilder";

type AccountType = 'fan' | 'creator' | 'creator-athlete' | 'creator-musician' | 'creator-content-creator';

interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  type: 'profile' | 'social' | 'engagement';
  category: string;
  points: number;
  requiredFields?: string[];
  socialPlatform?: string;
  icon: any;
}

const TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: 'complete_profile',
    name: 'Complete Your Profile',
    description: 'Reward users for completing their profile. Choose between all-or-nothing (points when all fields complete) or per-field rewards (points for each field). Configurable fields: username, avatar, bio, location, interests, and social connections (Twitter, Instagram, Facebook, TikTok, Discord, Telegram, YouTube, Spotify).',
    type: 'profile',
    category: 'Profile Completion',
    points: 100,
    requiredFields: ['username', 'avatar', 'bio', 'location', 'interests', 'twitter', 'instagram', 'facebook', 'tiktok', 'discord', 'telegram', 'youtube', 'spotify'],
    icon: Users,
  },
  {
    id: 'add_profile_photo',
    name: 'Add Profile Photo',
    description: 'Reward users for adding a profile photo',
    type: 'profile',
    category: 'Profile Completion',
    points: 50,
    requiredFields: ['profile_photo'],
    icon: ImageIcon,
  },
  {
    id: 'complete_bio',
    name: 'Complete Bio',
    description: 'Reward users for writing a bio',
    type: 'profile',
    category: 'Profile Completion',
    points: 25,
    requiredFields: ['bio'],
    icon: MessageSquare,
  },
  {
    id: 'connect_twitter',
    name: 'Connect Twitter/X',
    description: 'Reward users for connecting their Twitter/X account',
    type: 'social',
    category: 'Social Connection',
    points: 100,
    socialPlatform: 'twitter',
    icon: Twitter,
  },
  {
    id: 'connect_instagram',
    name: 'Connect Instagram',
    description: 'Reward users for connecting their Instagram account',
    type: 'social',
    category: 'Social Connection',
    points: 100,
    socialPlatform: 'instagram',
    icon: Instagram,
  },
  {
    id: 'connect_facebook',
    name: 'Connect Facebook',
    description: 'Reward users for connecting their Facebook account',
    type: 'social',
    category: 'Social Connection',
    points: 100,
    socialPlatform: 'facebook',
    icon: Facebook,
  },
  {
    id: 'connect_tiktok',
    name: 'Connect TikTok',
    description: 'Reward users for connecting their TikTok account',
    type: 'social',
    category: 'Social Connection',
    points: 100,
    socialPlatform: 'tiktok',
    icon: Video,
  },
  {
    id: 'connect_youtube',
    name: 'Connect YouTube',
    description: 'Reward users for connecting their YouTube channel',
    type: 'social',
    category: 'Social Connection',
    points: 100,
    socialPlatform: 'youtube',
    icon: Youtube,
  },
  {
    id: 'connect_spotify',
    name: 'Connect Spotify',
    description: 'Reward users for connecting their Spotify account',
    type: 'social',
    category: 'Social Connection',
    points: 75,
    socialPlatform: 'spotify',
    icon: FaSpotify,
  },
  {
    id: 'first_task_completion',
    name: 'Complete First Task',
    description: 'Reward users for completing their first task',
    type: 'engagement',
    category: 'Engagement',
    points: 200,
    icon: Trophy,
  },
  
  // Twitter/X Engagement Tasks (for Fandomly's accounts)
  {
    id: 'follow_fandomly_twitter',
    name: 'Follow Fandomly on X (Twitter)',
    description: 'Reward users for following Fandomly\'s official X/Twitter account',
    type: 'social',
    category: 'Platform Engagement',
    points: 50,
    socialPlatform: 'twitter',
    icon: Twitter,
  },
  {
    id: 'retweet_fandomly_post',
    name: 'Retweet Fandomly Post',
    description: 'Reward users for retweeting a Fandomly post',
    type: 'social',
    category: 'Platform Engagement',
    points: 100,
    socialPlatform: 'twitter',
    icon: Share,
  },
  {
    id: 'mention_fandomly',
    name: 'Mention Fandomly',
    description: 'Reward users for mentioning Fandomly in their posts',
    type: 'social',
    category: 'Platform Engagement',
    points: 75,
    socialPlatform: 'twitter',
    icon: MessageCircle,
  },
  {
    id: 'like_fandomly_tweet',
    name: 'Like Fandomly Tweet',
    description: 'Reward users for liking a Fandomly tweet',
    type: 'social',
    category: 'Platform Engagement',
    points: 25,
    socialPlatform: 'twitter',
    icon: Heart,
  },
  
  // Facebook Engagement Tasks (for Fandomly's accounts)
  {
    id: 'like_fandomly_facebook_page',
    name: 'Like Fandomly Facebook Page',
    description: 'Reward users for liking Fandomly\'s Facebook page',
    type: 'social',
    category: 'Platform Engagement',
    points: 50,
    socialPlatform: 'facebook',
    icon: Facebook,
  },
  {
    id: 'like_fandomly_facebook_post',
    name: 'Like Fandomly Facebook Post',
    description: 'Reward users for liking a Fandomly Facebook post',
    type: 'social',
    category: 'Platform Engagement',
    points: 25,
    socialPlatform: 'facebook',
    icon: Heart,
  },
  {
    id: 'share_fandomly_facebook_post',
    name: 'Share Fandomly Facebook Post',
    description: 'Reward users for sharing a Fandomly Facebook post',
    type: 'social',
    category: 'Platform Engagement',
    points: 100,
    socialPlatform: 'facebook',
    icon: Share,
  },
  {
    id: 'comment_fandomly_facebook_post',
    name: 'Comment on Fandomly Facebook Post',
    description: 'Reward users for commenting on a Fandomly Facebook post',
    type: 'social',
    category: 'Platform Engagement',
    points: 50,
    socialPlatform: 'facebook',
    icon: MessageCircle,
  },
  
  // Instagram Engagement Tasks (for Fandomly's accounts)
  {
    id: 'follow_fandomly_instagram',
    name: 'Follow Fandomly on Instagram',
    description: 'Reward users for following Fandomly\'s Instagram account',
    type: 'social',
    category: 'Platform Engagement',
    points: 50,
    socialPlatform: 'instagram',
    icon: Instagram,
  },
  {
    id: 'like_fandomly_instagram_post',
    name: 'Like Fandomly Instagram Post',
    description: 'Reward users for liking a Fandomly Instagram post',
    type: 'social',
    category: 'Platform Engagement',
    points: 25,
    socialPlatform: 'instagram',
    icon: Heart,
  },
  {
    id: 'comment_fandomly_instagram_post',
    name: 'Comment on Fandomly Instagram Post',
    description: 'Reward users for commenting on a Fandomly Instagram post',
    type: 'social',
    category: 'Platform Engagement',
    points: 50,
    socialPlatform: 'instagram',
    icon: MessageCircle,
  },
  {
    id: 'story_mention_fandomly',
    name: 'Mention Fandomly in Story',
    description: 'Reward users for mentioning Fandomly in their Instagram story',
    type: 'social',
    category: 'Platform Engagement',
    points: 75,
    socialPlatform: 'instagram',
    icon: MessageSquare,
  },
  
  // TikTok Engagement Tasks (for Fandomly's accounts)
  {
    id: 'follow_fandomly_tiktok',
    name: 'Follow Fandomly on TikTok',
    description: 'Reward users for following Fandomly\'s TikTok account',
    type: 'social',
    category: 'Platform Engagement',
    points: 50,
    socialPlatform: 'tiktok',
    icon: FaTiktok,
  },
  {
    id: 'like_fandomly_tiktok_video',
    name: 'Like Fandomly TikTok Video',
    description: 'Reward users for liking a Fandomly TikTok video',
    type: 'social',
    category: 'Platform Engagement',
    points: 25,
    socialPlatform: 'tiktok',
    icon: Heart,
  },
  {
    id: 'comment_fandomly_tiktok_video',
    name: 'Comment on Fandomly TikTok Video',
    description: 'Reward users for commenting on a Fandomly TikTok video',
    type: 'social',
    category: 'Platform Engagement',
    points: 50,
    socialPlatform: 'tiktok',
    icon: MessageCircle,
  },
  {
    id: 'share_fandomly_tiktok_video',
    name: 'Share Fandomly TikTok Video',
    description: 'Reward users for sharing a Fandomly TikTok video',
    type: 'social',
    category: 'Platform Engagement',
    points: 100,
    socialPlatform: 'tiktok',
    icon: Share,
  },
  
  // YouTube Engagement Tasks (for Fandomly's accounts)
  {
    id: 'subscribe_fandomly_youtube',
    name: 'Subscribe to Fandomly YouTube',
    description: 'Reward users for subscribing to Fandomly\'s YouTube channel',
    type: 'social',
    category: 'Platform Engagement',
    points: 100,
    socialPlatform: 'youtube',
    icon: Youtube,
  },
  {
    id: 'like_fandomly_youtube_video',
    name: 'Like Fandomly YouTube Video',
    description: 'Reward users for liking a Fandomly YouTube video',
    type: 'social',
    category: 'Platform Engagement',
    points: 25,
    socialPlatform: 'youtube',
    icon: Heart,
  },
  {
    id: 'comment_fandomly_youtube_video',
    name: 'Comment on Fandomly YouTube Video',
    description: 'Reward users for commenting on a Fandomly YouTube video',
    type: 'social',
    category: 'Platform Engagement',
    points: 50,
    socialPlatform: 'youtube',
    icon: MessageCircle,
  },
  
  // Spotify Engagement Tasks (for Fandomly's accounts)
  {
    id: 'follow_fandomly_spotify',
    name: 'Follow Fandomly on Spotify',
    description: 'Reward users for following Fandomly\'s Spotify profile',
    type: 'social',
    category: 'Platform Engagement',
    points: 50,
    socialPlatform: 'spotify',
    icon: FaSpotify,
  },
  {
    id: 'follow_fandomly_spotify_playlist',
    name: 'Follow Fandomly Spotify Playlist',
    description: 'Reward users for following a Fandomly Spotify playlist',
    type: 'social',
    category: 'Platform Engagement',
    points: 75,
    socialPlatform: 'spotify',
    icon: Music,
  },
];

export default function AdminPlatformTaskCreate() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/admin-dashboard/platform-tasks/edit/:id");
  const isEditMode = !!match;
  const taskId = params?.id;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'profile' as 'profile' | 'social' | 'engagement',
    category: '',
    points: 50,
    requiredFields: [] as string[],
    socialPlatform: '',
    eligibleAccountTypes: ['fan'] as AccountType[],
  });

  // Track if using CompleteProfileTaskBuilder
  const [useCompleteProfileBuilder, setUseCompleteProfileBuilder] = useState(false);

  // Track connected admin social accounts using React Query for persistence
  const { data: connectedSocials = {
    facebook: { connected: false },
    twitter: { connected: false },
    instagram: { connected: false },
    tiktok: { connected: false },
    youtube: { connected: false },
    spotify: { connected: false },
  }} = useQuery({
    queryKey: ['admin-social-connections', user?.dynamicUserId],
    queryFn: async () => {
      if (!user?.dynamicUserId) return {};

      const platforms = ['facebook', 'twitter', 'instagram', 'tiktok', 'youtube', 'spotify'];
      const connectionStatuses: {[key: string]: {connected: boolean, handle?: string}} = {};

      for (const platform of platforms) {
        try {
          const response = await fetch(`/api/social-connections/${platform}`, {
            headers: {
              'x-dynamic-user-id': user.dynamicUserId,
              'Content-Type': 'application/json'
            },
            credentials: 'include'
          });

          if (response.ok) {
            const data = await response.json();
            console.log(`[Admin Platform Tasks] ${platform} connection status:`, data);
            
            // Robust field extraction for handle/username
            let handle: string | undefined;
            
            if (platform === 'facebook') {
              handle = data.pageName || data.name || data.username;
            } else if (platform === 'instagram') {
              handle = data.username || data.profileData?.username || data.handle;
            } else if (platform === 'twitter') {
              handle = data.username || data.handle;
            } else if (platform === 'tiktok') {
              handle = data.handle || data.profileData?.handle || data.profileData?.uniqueId || data.username;
            } else if (platform === 'youtube') {
              handle = data.channelTitle || data.handle || data.username;
            } else if (platform === 'spotify') {
              handle = data.displayName || data.username || data.handle;
            }
            
            connectionStatuses[platform] = {
              connected: data.connected || false,
              handle: handle
            };
          } else {
            console.warn(`[Admin Platform Tasks] ${platform} connection check failed with status:`, response.status);
            connectionStatuses[platform] = { connected: false };
          }
        } catch (error) {
          console.error(`[Admin Platform Tasks] Error checking ${platform} connection:`, error);
          connectionStatuses[platform] = { connected: false };
        }
      }

      console.log('[Admin Platform Tasks] Final connection statuses:', connectionStatuses);
      return connectionStatuses;
    },
    enabled: !!user?.dynamicUserId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  // Fetch task if editing
  const { data: existingTask, isLoading: taskLoading } = useQuery({
    queryKey: ['/api/admin/platform-tasks', taskId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/admin/platform-tasks/${taskId}`);
      return response.json();
    },
    enabled: isEditMode && !!taskId,
  });


  // Populate form when editing
  useEffect(() => {
    if (existingTask && isEditMode) {
      setFormData({
        name: existingTask.name,
        description: existingTask.description,
        type: existingTask.type,
        category: existingTask.category,
        points: existingTask.points,
        requiredFields: existingTask.requiredFields || [],
        socialPlatform: existingTask.socialPlatform || '',
        eligibleAccountTypes: existingTask.eligibleAccountTypes || ['fan'],
      });
    }
  }, [existingTask, isEditMode]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest('POST', '/api/admin/platform-tasks', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Task Created",
        description: "Platform task has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/platform-tasks'] });
      setLocation('/admin-dashboard/platform-tasks');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create task.",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest('PUT', `/api/admin/platform-tasks/${taskId}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Task Updated",
        description: "Platform task has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/platform-tasks'] });
      setLocation('/admin-dashboard/platform-tasks');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update task.",
        variant: "destructive",
      });
    },
  });

  const handleTemplateSelect = (template: TaskTemplate) => {
    // Special handling for Complete Profile task - use the full builder
    if (template.id === 'complete_profile') {
      setUseCompleteProfileBuilder(true);
      return;
    }

    // Check if this is a platform engagement task requiring social connection
    const isPlatformEngagement = template.category === 'Platform Engagement' && template.socialPlatform;
    
    if (isPlatformEngagement && template.socialPlatform) {
      const socialStatus = connectedSocials[template.socialPlatform];
      
      if (!socialStatus.connected) {
        toast({
          title: "Social Account Not Connected",
          description: `Connect Fandomly's ${template.socialPlatform.charAt(0).toUpperCase() + template.socialPlatform.slice(1)} account in Admin Profile to create this task.`,
          variant: "destructive",
        });
      } else if (socialStatus.handle) {
        // Auto-populate description with connected handle
        const updatedDescription = template.description.replace(
          /Fandomly'?s?/gi, 
          `Fandomly (@${socialStatus.handle})`
        );
        
        setFormData({
          ...formData,
          name: template.name,
          description: updatedDescription,
          type: template.type,
          category: template.category,
          points: template.points,
          requiredFields: template.requiredFields || [],
          socialPlatform: template.socialPlatform || '',
        });
        
        toast({
          title: "Template Selected",
          description: `Connected as @${socialStatus.handle}`,
        });
        return;
      }
    }
    
    setFormData({
      ...formData,
      name: template.name,
      description: template.description,
      type: template.type,
      category: template.category,
      points: template.points,
      requiredFields: template.requiredFields || [],
      socialPlatform: template.socialPlatform || '',
    });
  };

  const handleAccountTypeToggle = (type: AccountType, checked: boolean) => {
    if (checked) {
      setFormData({ 
        ...formData, 
        eligibleAccountTypes: [...formData.eligibleAccountTypes, type] 
      });
    } else {
      setFormData({ 
        ...formData, 
        eligibleAccountTypes: formData.eligibleAccountTypes.filter(t => t !== type) 
      });
    }
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.description || !formData.category) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (formData.eligibleAccountTypes.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one eligible account type.",
        variant: "destructive",
      });
      return;
    }

    if (isEditMode) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isEditMode && taskLoading) {
    return (
      <AdminLayout
        title="Loading Task..."
        description="Please wait while we load your task"
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto mb-4"></div>
            <p className="text-gray-400">Loading task...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={isEditMode ? "Edit Platform Task" : "Create Platform Task"}
      description={isEditMode ? "Update your platform task configuration" : "Create a new platform-wide task that awards Fandomly Points"}
    >
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation('/admin-dashboard/platform-tasks')}
            className="mb-4 text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tasks
          </Button>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
            <Star className="mr-3 h-8 w-8 text-brand-primary" />
            {isEditMode ? 'Edit Platform Task' : 'Create Platform Task'}
          </h1>
          <p className="text-gray-400">
            {isEditMode 
              ? 'Update your platform task configuration'
              : 'Create a new platform-wide task that awards Fandomly Points'}
          </p>
        </div>

        {/* Conditional Rendering: Complete Profile Builder or Regular Form */}
        {useCompleteProfileBuilder ? (
          <CompleteProfileTaskBuilder
            onBack={() => setUseCompleteProfileBuilder(false)}
            onSave={(config) => {
              // Handle save as draft
              createMutation.mutate({
                ...formData,
                ...config,
                eligibleAccountTypes: formData.eligibleAccountTypes,
              });
            }}
            onPublish={(config) => {
              // Handle publish
              createMutation.mutate({
                ...formData,
                ...config,
                eligibleAccountTypes: formData.eligibleAccountTypes,
              });
            }}
          />
        ) : (
          <>
            {/* Quick Templates (only show when creating) */}
            {!isEditMode && (
              <Card className="bg-white/5 border-white/10 mb-6">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Quick Templates</CardTitle>
                  <p className="text-sm text-gray-400">Start with a pre-configured template</p>
                </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 max-h-[400px] overflow-y-auto pr-2">
                {TASK_TEMPLATES.map((template) => {
                  const IconComponent = template.icon;
                  const isPlatformEngagement = template.category === 'Platform Engagement' && template.socialPlatform;
                  const isConnected = isPlatformEngagement ? connectedSocials[template.socialPlatform!]?.connected : true;
                  
                  return (
                    <Card
                      key={template.id}
                      className={`bg-white/5 border-white/10 cursor-pointer hover:bg-white/10 hover:border-brand-primary/50 transition-all relative ${
                        isPlatformEngagement && !isConnected ? 'opacity-60' : ''
                      }`}
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <CardContent className="p-4 text-center">
                        {isPlatformEngagement && (
                          <div className="absolute top-2 right-2">
                            <Badge 
                              variant="outline" 
                              className={`text-[10px] px-1 py-0 ${
                                isConnected 
                                  ? 'border-green-500/50 text-green-400' 
                                  : 'border-red-500/50 text-red-400'
                              }`}
                            >
                              {isConnected ? '✓' : '⚠'}
                            </Badge>
                          </div>
                        )}
                        <div className="w-12 h-12 rounded-full bg-brand-primary/20 flex items-center justify-center mx-auto mb-3">
                          <IconComponent className="h-6 w-6 text-brand-primary" />
                        </div>
                        <h4 className="font-semibold text-white text-sm mb-1">{template.name}</h4>
                        <p className="text-xs text-gray-400 mb-2">{template.category}</p>
                        <Badge variant="outline" className="border-brand-primary text-brand-primary text-xs">
                          {template.points} pts
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Task Configuration */}
        <Card className="bg-white/5 border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Task Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Task Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Connect Facebook"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div>
                <Label className="text-white">Points Reward *</Label>
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
              <Label className="text-white">Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of what users need to do"
                className="bg-white/5 border-white/10 text-white min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Task Type *</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value: 'profile' | 'social' | 'engagement') => 
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="profile">Profile Completion</SelectItem>
                    <SelectItem value="social">Social Connection</SelectItem>
                    <SelectItem value="engagement">Engagement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white">Category *</Label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Social Connection"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>

            {formData.type === 'social' && (
              <div>
                <Label className="text-white">Social Platform</Label>
                <Select 
                  value={formData.socialPlatform || ''} 
                  onValueChange={(value) => setFormData({ ...formData, socialPlatform: value })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="twitter">Twitter/X</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="spotify">Spotify</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Eligible Account Types */}
        <Card className="bg-white/5 border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Eligible Account Types</CardTitle>
            <p className="text-sm text-gray-400">Select which account types can see and complete this task</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
                <Checkbox
                  id="account-type-fan"
                  checked={formData.eligibleAccountTypes.includes('fan')}
                  onCheckedChange={(checked) => handleAccountTypeToggle('fan', checked as boolean)}
                />
                <label
                  htmlFor="account-type-fan"
                  className="text-white font-medium cursor-pointer flex-1"
                >
                  Fans
                  <span className="block text-xs text-gray-400 mt-1">All fan accounts</span>
                </label>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
                <Checkbox
                  id="account-type-creator"
                  checked={formData.eligibleAccountTypes.includes('creator')}
                  onCheckedChange={(checked) => handleAccountTypeToggle('creator', checked as boolean)}
                />
                <label
                  htmlFor="account-type-creator"
                  className="text-white font-medium cursor-pointer flex-1"
                >
                  All Creators
                  <span className="block text-xs text-gray-400 mt-1">All creator accounts regardless of type</span>
                </label>
              </div>

              <div className="ml-6 space-y-3 border-l-2 border-white/10 pl-4">
                <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
                  <Checkbox
                    id="account-type-athlete"
                    checked={formData.eligibleAccountTypes.includes('creator-athlete')}
                    onCheckedChange={(checked) => handleAccountTypeToggle('creator-athlete', checked as boolean)}
                  />
                  <label
                    htmlFor="account-type-athlete"
                    className="text-gray-300 font-medium cursor-pointer flex-1"
                  >
                    Athletes Only
                    <span className="block text-xs text-gray-400 mt-1">Only creators with athlete type</span>
                  </label>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
                  <Checkbox
                    id="account-type-musician"
                    checked={formData.eligibleAccountTypes.includes('creator-musician')}
                    onCheckedChange={(checked) => handleAccountTypeToggle('creator-musician', checked as boolean)}
                  />
                  <label
                    htmlFor="account-type-musician"
                    className="text-gray-300 font-medium cursor-pointer flex-1"
                  >
                    Musicians Only
                    <span className="block text-xs text-gray-400 mt-1">Only creators with musician type</span>
                  </label>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
                  <Checkbox
                    id="account-type-content-creator"
                    checked={formData.eligibleAccountTypes.includes('creator-content-creator')}
                    onCheckedChange={(checked) => handleAccountTypeToggle('creator-content-creator', checked as boolean)}
                  />
                  <label
                    htmlFor="account-type-content-creator"
                    className="text-gray-300 font-medium cursor-pointer flex-1"
                  >
                    Content Creators Only
                    <span className="block text-xs text-gray-400 mt-1">Only creators with content creator type</span>
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => setLocation('/admin-dashboard/platform-tasks')}
            className="flex-1 border-white/20"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="flex-1 bg-brand-primary hover:bg-brand-primary/80"
          >
            {isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {isEditMode ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEditMode ? 'Update Task' : 'Create Task'}
              </>
            )}
          </Button>
        </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

