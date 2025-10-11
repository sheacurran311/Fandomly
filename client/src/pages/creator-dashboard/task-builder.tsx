import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
  const params = useParams<{ id?: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplateType | null>(null);
  const isEditMode = !!params.id;

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
    createTaskMutation.mutate({ ...config, isDraft: true });
  };

  const handlePublish = (config: any) => {
    createTaskMutation.mutate({ ...config, isDraft: false });
  };

  // Loading state for edit mode
  if (isEditMode && taskLoading) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-gray-300">Loading task...</p>
        </div>
      </div>
    );
  }

  // Template Selection Screen (skip in edit mode)
  if (!selectedTemplate && !isEditMode) {
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
          initialData={existingTask}
          isEditMode={isEditMode}
        />
      );

    case 'referral':
      return (
        <ReferralTaskBuilder
          onSave={handleSave}
          onPublish={handlePublish}
          onBack={handleBack}
          initialData={existingTask}
          isEditMode={isEditMode}
        />
      );

    case 'checkin':
      return (
        <CheckInTaskBuilder
          onSave={handleSave}
          onPublish={handlePublish}
          onBack={handleBack}
          initialData={existingTask}
          isEditMode={isEditMode}
        />
      );

    case 'follower_milestone':
      return (
        <FollowerMilestoneBuilder
          onSave={handleSave}
          onPublish={handlePublish}
          onBack={handleBack}
          initialData={existingTask}
          isEditMode={isEditMode}
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
          initialData={existingTask}
          isEditMode={isEditMode}
          taskType={selectedTemplate}
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

