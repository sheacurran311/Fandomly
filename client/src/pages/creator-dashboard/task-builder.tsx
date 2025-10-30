import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import TaskTemplateSelector, { TaskTemplateType } from "@/components/tasks/TaskTemplateSelector";
import ReferralTaskBuilder from "@/components/tasks/ReferralTaskBuilder";
import CheckInTaskBuilder from "@/components/tasks/CheckInTaskBuilder";
import FollowerMilestoneBuilder from "@/components/tasks/FollowerMilestoneBuilder";
import TwitterTaskBuilder from "@/components/tasks/TwitterTaskBuilder";
import FacebookTaskBuilder from "@/components/tasks/FacebookTaskBuilder";
import InstagramTaskBuilder from "@/components/tasks/InstagramTaskBuilder";
import YouTubeTaskBuilder from "@/components/tasks/YouTubeTaskBuilder";
import TikTokTaskBuilder from "@/components/tasks/TikTokTaskBuilder";
import SpotifyTaskBuilder from "@/components/tasks/SpotifyTaskBuilder";
import { CompleteProfileTaskBuilder } from "@/components/templates/CompleteProfileTaskBuilder";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayout from "@/components/layout/dashboard-layout";

export default function TaskBuilder() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id?: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplateType | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const isEditMode = !!params.id;

  // Fetch programs for the creator
  const { data: programs = [] } = useQuery({
    queryKey: ["/api/programs"],
    enabled: !!user?.id,
  });

  // Fetch campaigns for the selected program
  const { data: campaigns = [] } = useQuery({
    queryKey: ["/api/campaigns/creator", user?.creator?.id],
    enabled: !!user?.creator?.id && !!selectedProgramId,
  });

  // Fetch existing task if in edit mode
  const { data: existingTask, isLoading: taskLoading } = useQuery({
    queryKey: ['/api/tasks', params.id],
    queryFn: async () => {
      if (!params.id) return null;
      const response = await apiRequest('GET', `/api/tasks/${params.id}`);
      return response.json();
    },
    enabled: isEditMode,
  });

  // Set template when existing task loads
  useEffect(() => {
    if (existingTask && !selectedTemplate) {
      setSelectedTemplate(existingTask.taskType as TaskTemplateType);
    }
  }, [existingTask, selectedTemplate]);

  const handleSelectTemplate = (template: TaskTemplateType) => {
    setSelectedTemplate(template);
  };

  const handleBack = () => {
    if (selectedTemplate) {
      setSelectedTemplate(null);
    } else {
      setLocation("/creator-dashboard/tasks");
    }
  };

  // Create or update task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      if (isEditMode && params.id) {
        // Update existing task
        const response = await apiRequest('PUT', `/api/tasks/${params.id}`, taskData);
        return response.json();
      } else {
        // Create new task
        const response = await apiRequest('POST', '/api/tasks', taskData);
        return response.json();
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', user?.id] });
      toast({
        title: isEditMode ? "Task Updated" : (data.isDraft ? "Draft Saved" : "Task Published"),
        description: isEditMode 
          ? "Your task has been updated successfully."
          : (data.isDraft 
            ? "Your task has been saved as a draft." 
            : "Your task is now live and visible to fans!"),
      });
      if (!data.isDraft || isEditMode) {
        setLocation("/creator-dashboard/tasks");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save task",
        variant: "destructive",
      });
    },
  });

  const handleSave = (config: any) => {
    createTaskMutation.mutate({ 
      ...config, 
      isDraft: true,
      programId: selectedProgramId || undefined,
      campaignId: selectedCampaignId || undefined,
    });
  };

  const handlePublish = (config: any) => {
    createTaskMutation.mutate({ 
      ...config, 
      isDraft: false,
      programId: selectedProgramId || undefined,
      campaignId: selectedCampaignId || undefined,
    });
  };

  // Loading state for edit mode
  if (isEditMode && taskLoading) {
    return (
      <DashboardLayout userType="creator">
        <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
            <p className="text-gray-300">Loading task...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Template Selection Screen (skip in edit mode)
  if (!selectedTemplate && !isEditMode) {
    return (
      <DashboardLayout userType="creator">
        <TaskTemplateSelector
          onSelectTemplate={handleSelectTemplate}
          onBack={handleBack}
        />
      </DashboardLayout>
    );
  }

  // Filter campaigns by selected program
  const filteredCampaigns = campaigns.filter((campaign: any) => 
    !selectedProgramId || campaign.programId === selectedProgramId
  );

  // Program/Campaign Selector Component
  const ProgramCampaignSelector = ({ children }: { children: React.ReactNode }) => (
    <DashboardLayout userType="creator">
      <div className="max-w-5xl mx-auto p-6">
        <Card className="bg-white/5 backdrop-blur-lg border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Program & Campaign Association</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-white mb-2 block">Select Program (Optional)</Label>
              <Select value={selectedProgramId} onValueChange={(value) => {
                setSelectedProgramId(value === "unassigned" ? "" : value);
                setSelectedCampaignId(""); // Reset campaign when program changes
              }}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select a program (or leave unassigned)" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  <SelectItem value="unassigned" className="text-white hover:bg-white/10">No Program (Unassigned)</SelectItem>
                  {programs.map((program: any) => (
                    <SelectItem key={program.id} value={program.id} className="text-white hover:bg-white/10">
                      {program.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400 mt-1">
                Associate this task with a specific loyalty program
              </p>
            </div>

            {selectedProgramId && (
              <div>
                <Label className="text-white mb-2 block">Select Campaign (Optional)</Label>
                <Select value={selectedCampaignId} onValueChange={(value) => setSelectedCampaignId(value === "unassigned" ? "" : value)}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Select a campaign (or leave unassigned)" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    <SelectItem value="unassigned" className="text-white hover:bg-white/10">No Campaign (Unassigned)</SelectItem>
                    {filteredCampaigns.map((campaign: any) => (
                      <SelectItem key={campaign.id} value={campaign.id} className="text-white hover:bg-white/10">
                        {campaign.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400 mt-1">
                  Associate this task with a specific campaign
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        {children}
      </div>
    </DashboardLayout>
  );

  // Show the appropriate builder based on selected template
  switch (selectedTemplate) {
    case 'complete_profile':
      return (
        <ProgramCampaignSelector>
          <CompleteProfileTaskBuilder
            onSave={handleSave}
            onPublish={handlePublish}
            onBack={handleBack}
            initialData={existingTask}
            isEditMode={isEditMode}
          />
        </ProgramCampaignSelector>
      );

    case 'referral':
      return (
        <ProgramCampaignSelector>
          <ReferralTaskBuilder
            onSave={handleSave}
            onPublish={handlePublish}
            onBack={handleBack}
            initialData={existingTask}
            isEditMode={isEditMode}
          />
        </ProgramCampaignSelector>
      );

    case 'checkin':
      return (
        <ProgramCampaignSelector>
          <CheckInTaskBuilder
            onSave={handleSave}
            onPublish={handlePublish}
            onBack={handleBack}
            initialData={existingTask}
            isEditMode={isEditMode}
          />
        </ProgramCampaignSelector>
      );

    case 'follower_milestone':
      return (
        <ProgramCampaignSelector>
          <FollowerMilestoneBuilder
            onSave={handleSave}
            onPublish={handlePublish}
            onBack={handleBack}
            initialData={existingTask}
            isEditMode={isEditMode}
          />
        </ProgramCampaignSelector>
      );

    case 'twitter_follow':
    case 'twitter_like':
    case 'twitter_retweet':
      return (
        <ProgramCampaignSelector>
          <TwitterTaskBuilder
            onSave={handleSave}
            onPublish={handlePublish}
            onBack={handleBack}
            initialData={existingTask}
            isEditMode={isEditMode}
            taskType={selectedTemplate}
          />
        </ProgramCampaignSelector>
      );

    case 'facebook_follow':
    case 'facebook_like':
      return (
        <ProgramCampaignSelector>
          <FacebookTaskBuilder
            onSave={handleSave}
            onPublish={handlePublish}
            onBack={handleBack}
            initialData={existingTask}
            isEditMode={isEditMode}
            taskType={selectedTemplate}
          />
        </ProgramCampaignSelector>
      );

    case 'instagram_follow':
    case 'instagram_like':
      return (
        <ProgramCampaignSelector>
          <InstagramTaskBuilder
            onSave={handleSave}
            onPublish={handlePublish}
            onBack={handleBack}
            initialData={existingTask}
            isEditMode={isEditMode}
            taskType={selectedTemplate}
          />
        </ProgramCampaignSelector>
      );

    case 'youtube_subscribe':
    case 'youtube_like':
      return (
        <ProgramCampaignSelector>
          <YouTubeTaskBuilder
            onSave={handleSave}
            onPublish={handlePublish}
            onBack={handleBack}
            initialData={existingTask}
            isEditMode={isEditMode}
            taskType={selectedTemplate}
          />
        </ProgramCampaignSelector>
      );

    case 'tiktok_follow':
    case 'tiktok_like':
      return (
        <ProgramCampaignSelector>
          <TikTokTaskBuilder
            onSave={handleSave}
            onPublish={handlePublish}
            onBack={handleBack}
            initialData={existingTask}
            isEditMode={isEditMode}
            taskType={selectedTemplate}
          />
        </ProgramCampaignSelector>
      );

    case 'spotify_follow':
    case 'spotify_playlist':
      return (
        <ProgramCampaignSelector>
          <SpotifyTaskBuilder
            onSave={handleSave}
            onPublish={handlePublish}
            onBack={handleBack}
            initialData={existingTask}
            isEditMode={isEditMode}
            taskType={selectedTemplate}
          />
        </ProgramCampaignSelector>
      );

    default:
      return (
        <DashboardLayout userType="creator">
          <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">🚧</div>
              <h2 className="text-2xl font-bold text-white mb-2">Coming Soon</h2>
              <p className="text-gray-400 mb-6">
                This template is under development and will be available soon.
              </p>
              <button
                onClick={handleBack}
                className="px-6 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-lg"
              >
                Back to Templates
              </button>
            </div>
          </div>
        </DashboardLayout>
      );
  }
}

