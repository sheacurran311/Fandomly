import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Twitter, Facebook, Instagram, Youtube, Music2, Zap } from "lucide-react";
import { SiTiktok, SiSpotify } from "react-icons/si";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useAuth } from "@/hooks/use-auth";
import { TaskConfigurationForm } from "@/components/templates/TaskConfigurationForm";
import { PLATFORM_TASK_TYPES } from "@shared/taskTemplates";

interface TemplatePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId?: string;
  onTaskCreated?: () => void;
}

type Platform = "twitter" | "facebook" | "instagram" | "youtube" | "tiktok" | "spotify";
type Step = "platform" | "taskType" | "configuration";

interface TaskType {
  value: string;
  label: string;
  description: string;
  points: number;
  icon?: string;
}

const PLATFORM_CONFIG = {
  twitter: {
    name: "Twitter",
    icon: Twitter,
    color: "bg-blue-500",
    description: "Grow your Twitter following and engagement"
  },
  facebook: {
    name: "Facebook", 
    icon: Facebook,
    color: "bg-blue-600",
    description: "Increase Facebook page likes and engagement"
  },
  instagram: {
    name: "Instagram",
    icon: Instagram,
    color: "bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500",
    description: "Boost Instagram followers and post engagement"
  },
  youtube: {
    name: "YouTube",
    icon: Youtube,
    color: "bg-red-600",
    description: "Grow YouTube subscribers and video engagement"
  },
  tiktok: {
    name: "TikTok",
    icon: SiTiktok,
    color: "bg-black",
    description: "Increase TikTok followers and video engagement"
  },
  spotify: {
    name: "Spotify",
    icon: SiSpotify,
    color: "bg-green-500",
    description: "Grow Spotify followers and playlist engagement"
  }
} as const;

export function TemplatePicker({ open, onOpenChange, campaignId, onTaskCreated }: TemplatePickerProps) {
  const [currentStep, setCurrentStep] = useState<Step>("platform");
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [selectedTaskType, setSelectedTaskType] = useState<TaskType | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { user: dynamicUser } = useDynamicContext();

  // Use local platform task types (like Snag - no API needed)
  const taskTypes = selectedPlatform && currentStep === "taskType" 
    ? PLATFORM_TASK_TYPES[selectedPlatform]?.map(taskType => ({
        value: taskType.value,
        label: taskType.label,
        description: `Fans ${taskType.label.toLowerCase()} to earn points`,
        points: taskType.value.includes('follow') ? 50 : taskType.value.includes('like') ? 25 : taskType.value.includes('share') ? 100 : 75,
        icon: taskType.icon
      })) || []
    : [];
  const taskTypesLoading = false;

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      const response = await apiRequest("POST", "/api/tasks", taskData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({
        title: "Task Created",
        description: `Successfully created ${selectedTaskType?.label} task for ${PLATFORM_CONFIG[selectedPlatform!].name}`,
      });
      handleClose();
      onTaskCreated?.();
    },
    onError: (error) => {
      toast({
        variant: "destructive", 
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create task"
      });
    }
  });

  const handleClose = () => {
    setCurrentStep("platform");
    setSelectedPlatform(null);
    setSelectedTaskType(null);
    onOpenChange(false);
  };

  const handlePlatformSelect = (platform: Platform) => {
    setSelectedPlatform(platform);
    setCurrentStep("taskType");
  };

  const handleTaskTypeSelect = (taskType: TaskType) => {
    setSelectedTaskType(taskType);
    setCurrentStep("configuration");
  };

  const handleBack = () => {
    if (currentStep === "taskType") {
      setCurrentStep("platform");
      setSelectedPlatform(null);
    } else if (currentStep === "configuration") {
      setCurrentStep("taskType");
      setSelectedTaskType(null);
    }
  };

  const handleConfigurationSubmit = (config: any) => {
    if (!selectedPlatform || !selectedTaskType) return;

    const taskData = {
      title: `${selectedTaskType.label} on ${PLATFORM_CONFIG[selectedPlatform].name}`,
      description: `Complete ${selectedTaskType.label.toLowerCase()} action on ${PLATFORM_CONFIG[selectedPlatform].name}`,
      platform: selectedPlatform,
      taskType: selectedTaskType.value,
      config,
      points: config.points || selectedTaskType.points,
      campaignId: campaignId || null
    };

    createTaskMutation.mutate(taskData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {currentStep !== "platform" && (
              <Button variant="ghost" size="sm" onClick={handleBack} data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <span className="text-[#101636]">
              {currentStep === "platform" && "Choose Platform"}
              {currentStep === "taskType" && `Select ${PLATFORM_CONFIG[selectedPlatform!]?.name} Task`}
              {currentStep === "configuration" && `Configure ${selectedTaskType?.label} Task`}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Platform Selection Step */}
        {currentStep === "platform" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {Object.entries(PLATFORM_CONFIG).map(([key, platform]) => {
              const IconComponent = platform.icon;
              return (
                <Card 
                  key={key}
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-primary"
                  onClick={() => handlePlatformSelect(key as Platform)}
                  data-testid={`card-platform-${key}`}
                >
                  <CardContent className="p-6 text-center">
                    <div className={`w-16 h-16 rounded-full ${platform.color} flex items-center justify-center mx-auto mb-4`}>
                      <IconComponent className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-lg mb-2 text-white">{platform.name}</CardTitle>
                    <CardDescription className="text-sm text-white">
                      {platform.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Task Type Selection Step */}
        {currentStep === "taskType" && selectedPlatform && (
          <div className="p-6">
            {taskTypesLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3 text-white">Loading task types...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {taskTypes?.map((taskType) => (
                  <Card 
                    key={taskType.value}
                    className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-primary"
                    onClick={() => handleTaskTypeSelect(taskType)}
                    data-testid={`card-tasktype-${taskType.value}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Zap className="h-4 w-4 text-primary" />
                            <CardTitle className="text-base text-white">{taskType.label}</CardTitle>
                            <Badge variant="secondary" className="ml-auto">
                              {taskType.points} pts
                            </Badge>
                          </div>
                          <CardDescription className="text-sm text-white">
                            {taskType.description}
                          </CardDescription>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground ml-2" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Configuration Step */}
        {currentStep === "configuration" && selectedPlatform && selectedTaskType && (
          <div className="p-6">
            <TaskConfigurationForm
              platform={selectedPlatform}
              taskType={selectedTaskType}
              onSubmit={handleConfigurationSubmit}
              isLoading={createTaskMutation.isPending}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}