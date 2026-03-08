/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import TaskTemplateSelector, { TaskTemplateType } from '@/components/tasks/TaskTemplateSelector';
import ReferralTaskBuilder from '@/components/tasks/ReferralTaskBuilder';
import CheckInTaskBuilder from '@/components/tasks/CheckInTaskBuilder';
import FollowerMilestoneBuilder from '@/components/tasks/FollowerMilestoneBuilder';
import TwitterTaskBuilder from '@/components/tasks/TwitterTaskBuilder';
import FacebookTaskBuilder from '@/components/tasks/FacebookTaskBuilder';
import InstagramTaskBuilder from '@/components/tasks/InstagramTaskBuilder';
import YouTubeTaskBuilder from '@/components/tasks/YouTubeTaskBuilder';
import TikTokTaskBuilder from '@/components/tasks/TikTokTaskBuilder';
import SpotifyTaskBuilder from '@/components/tasks/SpotifyTaskBuilder';
import AppleMusicTaskBuilder from '@/components/tasks/AppleMusicTaskBuilder';
import DiscordTaskBuilder from '@/components/tasks/DiscordTaskBuilder';
import TwitchTaskBuilder from '@/components/tasks/TwitchTaskBuilder';
import KickTaskBuilder from '@/components/tasks/KickTaskBuilder';
import PatreonTaskBuilder from '@/components/tasks/PatreonTaskBuilder';
import StreamCodeTaskBuilder from '@/components/tasks/StreamCodeTaskBuilder';
import { CompleteProfileTaskBuilder } from '@/components/templates/CompleteProfileTaskBuilder';
import PollQuizTaskBuilder from '@/components/tasks/PollQuizTaskBuilder';
import WebsiteVisitTaskBuilder from '@/components/tasks/WebsiteVisitTaskBuilder';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/layout/dashboard-layout';

export default function TaskBuilder() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id?: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplateType | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [hasInitialized, setHasInitialized] = useState(false);
  const isEditMode = !!params.id;

  // Fetch programs for the creator
  const { data: programs = [], isLoading: programsLoading } = useQuery<
    { id: string; name: string; createdAt?: Date | string | null }[]
  >({
    queryKey: ['/api/programs'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/programs');
      return res.json();
    },
    enabled: !!user?.id,
  });

  // Auto-select most recently created program (sync during render, not in effect)
  if (programs.length > 0 && !selectedProgramId && !isEditMode && !hasInitialized) {
    const sortedPrograms = [...(programs as any[])].sort(
      (a: any, b: any) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
    setSelectedProgramId(sortedPrograms[0].id);
  }

  // Fetch campaigns for the selected program
  const { data: campaigns = [] } = useQuery<{ id: string; programId?: string }[]>({
    queryKey: ['/api/campaigns/creator', user?.creator?.id],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/campaigns/creator/${user?.creator?.id}`);
      return res.json();
    },
    enabled: !!user?.creator?.id && !!selectedProgramId,
  });

  // Fetch existing task if in edit mode
  const { data: existingTask, isLoading: taskLoading } = useQuery({
    queryKey: ['/api/tasks', params.id],
    queryFn: async () => {
      if (!params.id) return null;
      const response = await apiRequest('GET', `/api/tasks/${params.id}`);
      const task = await response.json();

      // Transform database fields to match task builder expectations
      return {
        ...task,
        points: task.pointsToReward || task.points || 50,
        settings: task.customSettings || task.settings || {},
        verificationMethod:
          task.customSettings?.verificationMethod || task.verificationMethod || 'manual',
      };
    },
    enabled: isEditMode,
  });

  // Derive initial values from existing task (avoids setState in effect)
  const derivedTemplate = existingTask?.taskType as TaskTemplateType | undefined;
  const derivedProgramId =
    isEditMode && existingTask?.programId ? existingTask.programId : undefined;
  const derivedCampaignId =
    isEditMode && existingTask?.campaignId ? existingTask.campaignId : undefined;

  // Sync derived values into state only once when task first loads
  if (existingTask && !hasInitialized) {
    setHasInitialized(true);
    if (derivedTemplate && !selectedTemplate) {
      setSelectedTemplate(derivedTemplate);
    }
    if (derivedProgramId) {
      setSelectedProgramId(derivedProgramId);
    }
    if (derivedCampaignId) {
      setSelectedCampaignId(derivedCampaignId);
    }
  }

  const handleSelectTemplate = (template: TaskTemplateType) => {
    setSelectedTemplate(template);
  };

  const handleBack = () => {
    if (selectedTemplate) {
      setSelectedTemplate(null);
    } else {
      setLocation('/creator-dashboard/tasks');
    }
  };

  // Create or update task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: Record<string, unknown>) => {
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
        title: isEditMode ? 'Task Updated' : data.isDraft ? 'Draft Saved' : 'Task Published',
        description: isEditMode
          ? 'Your task has been updated successfully.'
          : data.isDraft
            ? 'Your task has been saved as a draft.'
            : 'Your task is now live and visible to fans!',
      });
      if (!data.isDraft || isEditMode) {
        setLocation('/creator-dashboard/tasks');
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save task',
        variant: 'destructive',
      });
    },
  });

  const handleSave = (config: Record<string, unknown>) => {
    if (!selectedProgramId) {
      toast({
        title: 'Program Required',
        description: 'Please select a program before saving the task.',
        variant: 'destructive',
      });
      return;
    }
    createTaskMutation.mutate({
      ...config,
      isDraft: true,
      programId: selectedProgramId,
      campaignId: selectedCampaignId || undefined,
    });
  };

  const handlePublish = (config: Record<string, unknown>) => {
    if (!selectedProgramId) {
      toast({
        title: 'Program Required',
        description: 'Please select a program before publishing the task.',
        variant: 'destructive',
      });
      return;
    }
    createTaskMutation.mutate({
      ...config,
      isDraft: false,
      programId: selectedProgramId,
      campaignId: selectedCampaignId || undefined,
    });
  };

  // Loading state for edit mode
  if (isEditMode && taskLoading) {
    return (
      <DashboardLayout userType="creator">
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
            <p className="text-gray-300">Loading task...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Check if creator has any programs - required for creating tasks
  if (!isEditMode && !programsLoading && programs.length === 0) {
    return (
      <DashboardLayout userType="creator">
        <div className="p-6">
          <div className="max-w-2xl mx-auto mt-12">
            <Alert className="border-yellow-500/50 bg-yellow-500/10">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              <AlertTitle className="text-yellow-500 text-lg font-semibold mb-2">
                Program Required
              </AlertTitle>
              <AlertDescription className="text-gray-300 mb-4">
                You must create a loyalty program before adding tasks. Tasks are always associated
                with a program to help organize your fan engagement strategy.
              </AlertDescription>
              <div className="flex gap-3 mt-4">
                <Button
                  onClick={() => setLocation('/creator-dashboard/program-builder')}
                  className="bg-brand-primary hover:bg-brand-primary/80"
                >
                  Create Program
                </Button>
                <Button onClick={() => setLocation('/creator-dashboard/tasks')} variant="outline">
                  Back to Tasks
                </Button>
              </div>
            </Alert>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Template Selection Screen (skip in edit mode)
  if (!selectedTemplate && !isEditMode) {
    return (
      <DashboardLayout userType="creator">
        <TaskTemplateSelector onSelectTemplate={handleSelectTemplate} onBack={handleBack} />
      </DashboardLayout>
    );
  }

  // Filter campaigns by selected program
  const filteredCampaigns = (campaigns as any[]).filter(
    (campaign: any) => !selectedProgramId || campaign.programId === selectedProgramId
  );

  // Program/Campaign selector card rendered inside TaskBuilderBase
  const programSelectorCard = (
    <Card className="bg-white/5 backdrop-blur-lg border-white/10">
      <CardHeader>
        <CardTitle className="text-white">Program & Campaign Association</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-white mb-2 block">
            Select Program <span className="text-red-400">*</span>
          </Label>
          <Select
            value={selectedProgramId}
            onValueChange={(value) => {
              setSelectedProgramId(value);
              setSelectedCampaignId(''); // Reset campaign when program changes
            }}
          >
            <SelectTrigger className="bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Select a program (required)" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10">
              {(programs as any[]).map((program: any) => (
                <SelectItem
                  key={program.id}
                  value={program.id}
                  className="text-white hover:bg-white/10"
                >
                  {program.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-400 mt-1">
            All tasks must be associated with a loyalty program
          </p>
        </div>

        {selectedProgramId && (
          <div>
            <Label className="text-white mb-2 block">Select Campaign (Optional)</Label>
            <Select
              value={selectedCampaignId}
              onValueChange={(value) => setSelectedCampaignId(value === 'unassigned' ? '' : value)}
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Select a campaign (or leave unassigned)" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                <SelectItem value="unassigned" className="text-white hover:bg-white/10">
                  No Campaign (Unassigned)
                </SelectItem>
                {filteredCampaigns.map((campaign: any) => (
                  <SelectItem
                    key={campaign.id}
                    value={campaign.id}
                    className="text-white hover:bg-white/10"
                  >
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
  );

  // Show the appropriate builder based on selected template
  switch (selectedTemplate) {
    case 'complete_profile':
      return (
        <DashboardLayout userType="creator">
          <CompleteProfileTaskBuilder
            onSave={handleSave}
            onPublish={handlePublish}
            onBack={handleBack}
            initialData={existingTask}
            isEditMode={isEditMode}
            programSelector={programSelectorCard}
          />
        </DashboardLayout>
      );

    case 'referral':
      return (
        <DashboardLayout userType="creator">
          <ReferralTaskBuilder
            onSave={handleSave as any}
            onPublish={handlePublish as any}
            onBack={handleBack}
            initialData={existingTask}
            isEditMode={isEditMode}
            programSelector={programSelectorCard}
          />
        </DashboardLayout>
      );

    case 'checkin':
      return (
        <DashboardLayout userType="creator">
          <CheckInTaskBuilder
            onSave={handleSave as any}
            onPublish={handlePublish as any}
            onBack={handleBack}
            initialData={existingTask}
            isEditMode={isEditMode}
            programSelector={programSelectorCard}
          />
        </DashboardLayout>
      );

    case 'follower_milestone':
      return (
        <DashboardLayout userType="creator">
          <FollowerMilestoneBuilder
            onSave={handleSave as any}
            onPublish={handlePublish as any}
            onBack={handleBack}
            initialData={existingTask}
            isEditMode={isEditMode}
            programSelector={programSelectorCard}
          />
        </DashboardLayout>
      );

    case 'twitter_follow':
    case 'twitter_like':
    case 'twitter_retweet':
    case 'twitter_quote_tweet':
      return (
        <DashboardLayout userType="creator">
          <TwitterTaskBuilder
            onSave={handleSave}
            onPublish={handlePublish}
            onBack={handleBack}
            initialData={existingTask}
            isEditMode={isEditMode}
            taskType={selectedTemplate}
            programSelector={programSelectorCard}
          />
        </DashboardLayout>
      );

    case 'facebook_like_page':
    case 'facebook_like_post':
    case 'facebook_comment_post':
    case 'facebook_comment_photo':
      return (
        <DashboardLayout userType="creator">
          <FacebookTaskBuilder
            onSave={handleSave}
            onPublish={handlePublish}
            onBack={handleBack}
            initialData={existingTask}
            isEditMode={isEditMode}
            taskType={selectedTemplate}
            programSelector={programSelectorCard}
          />
        </DashboardLayout>
      );

    case 'instagram_follow':
    case 'instagram_like_post':
    case 'comment_code':
    case 'mention_story':
    case 'keyword_comment':
      return (
        <DashboardLayout userType="creator">
          <InstagramTaskBuilder
            onSave={handleSave}
            onPublish={handlePublish}
            onBack={handleBack}
            initialData={existingTask}
            isEditMode={isEditMode}
            taskType={selectedTemplate}
            programSelector={programSelectorCard}
          />
        </DashboardLayout>
      );

    case 'youtube_subscribe':
    case 'youtube_like':
    case 'youtube_comment':
      return (
        <DashboardLayout userType="creator">
          <YouTubeTaskBuilder
            onSave={handleSave}
            onPublish={handlePublish}
            onBack={handleBack}
            initialData={existingTask}
            isEditMode={isEditMode}
            taskType={selectedTemplate}
            programSelector={programSelectorCard}
          />
        </DashboardLayout>
      );

    case 'tiktok_follow':
    case 'tiktok_like':
    case 'tiktok_comment':
    case 'tiktok_post':
      return (
        <DashboardLayout userType="creator">
          <TikTokTaskBuilder
            onSave={handleSave}
            onPublish={handlePublish}
            onBack={handleBack}
            initialData={existingTask}
            isEditMode={isEditMode}
            taskType={selectedTemplate}
            programSelector={programSelectorCard}
          />
        </DashboardLayout>
      );

    case 'poll':
    case 'quiz':
      return (
        <DashboardLayout userType="creator">
          <PollQuizTaskBuilder
            onSave={handleSave}
            onPublish={handlePublish}
            onBack={handleBack}
            taskType={selectedTemplate}
            initialData={existingTask}
            isEditMode={isEditMode}
            programSelector={programSelectorCard}
          />
        </DashboardLayout>
      );

    case 'website_visit':
      return (
        <DashboardLayout userType="creator">
          <WebsiteVisitTaskBuilder
            onSave={handleSave}
            onPublish={handlePublish}
            onBack={handleBack}
            initialData={existingTask}
            isEditMode={isEditMode}
            programSelector={programSelectorCard}
          />
        </DashboardLayout>
      );

    case 'spotify_follow':
    case 'spotify_playlist':
      return (
        <DashboardLayout userType="creator">
          <SpotifyTaskBuilder
            onSave={handleSave}
            onPublish={handlePublish}
            onBack={handleBack}
            initialData={existingTask}
            isEditMode={isEditMode}
            taskType={selectedTemplate}
            programSelector={programSelectorCard}
          />
        </DashboardLayout>
      );

    case 'apple_music_favorite_artist':
    case 'apple_music_add_track':
    case 'apple_music_add_album':
    case 'apple_music_add_playlist':
    case 'apple_music_listen':
      return (
        <DashboardLayout userType="creator">
          <AppleMusicTaskBuilder
            onSave={handleSave}
            onPublish={handlePublish}
            onBack={handleBack}
            initialData={existingTask}
            isEditMode={isEditMode}
            taskType={selectedTemplate}
            programSelector={programSelectorCard}
          />
        </DashboardLayout>
      );

    case 'discord_join':
    case 'discord_verify':
      return (
        <DashboardLayout userType="creator">
          <DiscordTaskBuilder
            onSave={handleSave}
            onPublish={handlePublish}
            onBack={handleBack}
            initialData={existingTask}
            isEditMode={isEditMode}
            taskType={selectedTemplate}
            programSelector={programSelectorCard}
          />
        </DashboardLayout>
      );

    case 'twitch_follow':
    case 'twitch_subscribe':
      return (
        <DashboardLayout userType="creator">
          <TwitchTaskBuilder
            onSave={handleSave}
            onPublish={handlePublish}
            onBack={handleBack}
            initialData={existingTask}
            isEditMode={isEditMode}
            taskType={selectedTemplate}
            programSelector={programSelectorCard}
          />
        </DashboardLayout>
      );

    case 'kick_follow':
    case 'kick_subscribe':
      return (
        <DashboardLayout userType="creator">
          <KickTaskBuilder
            onSave={handleSave}
            onPublish={handlePublish}
            onBack={handleBack}
            initialData={existingTask}
            isEditMode={isEditMode}
            taskType={selectedTemplate}
            programSelector={programSelectorCard}
          />
        </DashboardLayout>
      );

    case 'patreon_support':
    case 'patreon_tier_check':
      return (
        <DashboardLayout userType="creator">
          <PatreonTaskBuilder
            onSave={handleSave}
            onPublish={handlePublish}
            onBack={handleBack}
            initialData={existingTask}
            isEditMode={isEditMode}
            taskType={selectedTemplate}
            programSelector={programSelectorCard}
          />
        </DashboardLayout>
      );

    case 'stream_code_verify':
      return (
        <DashboardLayout userType="creator">
          <StreamCodeTaskBuilder
            onSave={handleSave}
            onPublish={handlePublish}
            onBack={handleBack}
            initialData={existingTask}
            isEditMode={isEditMode}
            programSelector={programSelectorCard}
          />
        </DashboardLayout>
      );

    default:
      return (
        <DashboardLayout userType="creator">
          <div className="flex items-center justify-center py-24">
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
