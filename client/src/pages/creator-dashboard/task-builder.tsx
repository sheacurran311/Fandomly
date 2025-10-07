import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import TaskTemplateSelector, { TaskTemplateType } from "@/components/tasks/TaskTemplateSelector";
import ReferralTaskBuilder from "@/components/tasks/ReferralTaskBuilder";
import CheckInTaskBuilder from "@/components/tasks/CheckInTaskBuilder";
import FollowerMilestoneBuilder from "@/components/tasks/FollowerMilestoneBuilder";
import TwitterTaskBuilder from "@/components/tasks/TwitterTaskBuilder";
import { CompleteProfileTaskBuilder } from "@/components/templates/CompleteProfileTaskBuilder";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";

export default function TaskBuilder() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplateType | null>(null);

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

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      const response = await apiRequest('POST', '/api/tasks', taskData);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', user?.id] });
      toast({
        title: data.isDraft ? "Draft Saved" : "Task Published",
        description: data.isDraft 
          ? "Your task has been saved as a draft." 
          : "Your task is now live and visible to fans!",
      });
      if (!data.isDraft) {
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
    createTaskMutation.mutate({ ...config, isDraft: true });
  };

  const handlePublish = (config: any) => {
    createTaskMutation.mutate({ ...config, isDraft: false });
  };

  // Template Selection Screen
  if (!selectedTemplate) {
    return (
      <TaskTemplateSelector
        onSelectTemplate={handleSelectTemplate}
        onBack={handleBack}
      />
    );
  }

  // Show the appropriate builder based on selected template
  switch (selectedTemplate) {
    case 'complete_profile':
      return (
        <CompleteProfileTaskBuilder
          onSave={handleSave}
          onPublish={handlePublish}
          onBack={handleBack}
        />
      );

    case 'referral':
      return (
        <ReferralTaskBuilder
          onSave={handleSave}
          onPublish={handlePublish}
          onBack={handleBack}
        />
      );

    case 'checkin':
      return (
        <CheckInTaskBuilder
          onSave={handleSave}
          onPublish={handlePublish}
          onBack={handleBack}
        />
      );

    case 'follower_milestone':
      return (
        <FollowerMilestoneBuilder
          onSave={handleSave}
          onPublish={handlePublish}
          onBack={handleBack}
        />
      );

    case 'twitter_follow':
    case 'twitter_like':
    case 'twitter_retweet':
      return (
        <TwitterTaskBuilder
          onSave={handleSave}
          onPublish={handlePublish}
          onBack={handleBack}
        />
      );

    default:
      return (
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
      );
  }
}

