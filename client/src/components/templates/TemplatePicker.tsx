import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowLeft, ArrowRight, Twitter, Facebook, Instagram, Youtube, Music2, Zap, Shield, ShieldCheck, ShieldAlert, AlertTriangle, Info } from "lucide-react";
import { SiTiktok, SiSpotify, SiDiscord, SiTwitch } from "react-icons/si";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useSocialConnections } from "@/hooks/use-social-connections";
import { TaskConfigurationForm } from "@/components/templates/TaskConfigurationForm";
import { PLATFORM_TASK_TYPES, TASK_TYPE_VERIFICATION, TIER_GUIDANCE, type VerificationTier } from "@shared/taskTemplates";

interface TemplatePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId?: string;
  onTaskCreated?: () => void;
}

type Platform = "twitter" | "facebook" | "instagram" | "youtube" | "tiktok" | "spotify" | "discord" | "twitch" | "kick" | "patreon";
type Step = "platform" | "taskType" | "configuration";

interface TaskType {
  value: string;
  label: string;
  description: string;
  points: number;
  icon?: string;
  verificationTier?: VerificationTier;
}

// Get tier badge component with tooltip showing trust level and points guidance
function TierBadge({ tier }: { tier?: VerificationTier }) {
  if (!tier) return null;
  
  const config = {
    'T1': { 
      icon: ShieldCheck, 
      label: 'API Verified', 
      className: 'bg-green-500/20 text-green-400 border-green-500/30' 
    },
    'T2': { 
      icon: Shield, 
      label: 'Code Verified', 
      className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' 
    },
    'T3': { 
      icon: ShieldAlert, 
      label: 'Honor System', 
      className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' 
    },
  }[tier];
  
  if (!config) return null;
  
  const IconComponent = config.icon;
  const guidance = TIER_GUIDANCE[tier];
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`text-xs cursor-help ${config.className}`}>
            <IconComponent className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{guidance.label}</span>
              <Badge variant="outline" className="text-xs">
                {guidance.trustLevel} Trust
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{guidance.description}</p>
            <div className="flex items-center gap-2 text-sm">
              <Info className="h-3 w-3 text-primary" />
              <span className="font-medium">Recommended: {guidance.pointsRange}</span>
            </div>
            {guidance.tip && (
              <p className="text-xs text-green-400 italic">{guidance.tip}</p>
            )}
            {guidance.warning && (
              <div className="flex items-start gap-1.5 text-xs text-amber-400">
                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                <span>{guidance.warning}</span>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const PLATFORM_CONFIG = {
  twitter: {
    name: "X (Twitter)",
    icon: Twitter,
    color: "bg-blue-500",
    description: "Grow your X/Twitter following and engagement",
    tier1Available: true,
  },
  facebook: {
    name: "Facebook", 
    icon: Facebook,
    color: "bg-blue-600",
    description: "Increase Facebook page likes and engagement",
    tier1Available: false,
  },
  instagram: {
    name: "Instagram",
    icon: Instagram,
    color: "bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500",
    description: "Boost Instagram followers and post engagement",
    tier1Available: false,
  },
  youtube: {
    name: "YouTube",
    icon: Youtube,
    color: "bg-red-600",
    description: "Grow YouTube subscribers and video engagement",
    tier1Available: true,
  },
  tiktok: {
    name: "TikTok",
    icon: SiTiktok,
    color: "bg-black",
    description: "Increase TikTok followers and video engagement",
    tier1Available: false,
  },
  spotify: {
    name: "Spotify",
    icon: SiSpotify,
    color: "bg-green-500",
    description: "Grow Spotify followers and playlist engagement",
    tier1Available: true,
  },
  discord: {
    name: "Discord",
    icon: SiDiscord,
    color: "bg-indigo-500",
    description: "Build your Discord community engagement",
    tier1Available: true,
  },
  twitch: {
    name: "Twitch",
    icon: SiTwitch,
    color: "bg-purple-500",
    description: "Grow your Twitch channel followers and subs",
    tier1Available: true,
  },
  kick: {
    name: "Kick",
    icon: Zap,
    color: "bg-green-400",
    description: "Build your Kick streaming community",
    tier1Available: true,
  },
  patreon: {
    name: "Patreon",
    icon: Music2,
    color: "bg-orange-500",
    description: "Grow your Patreon supporter base",
    tier1Available: true,
  },
} as const;

export function TemplatePicker({ open, onOpenChange, campaignId, onTaskCreated }: TemplatePickerProps) {
  const [currentStep, setCurrentStep] = useState<Step>("platform");
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [selectedTaskType, setSelectedTaskType] = useState<TaskType | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { isPlatformConnected: checkPlatformConnected } = useSocialConnections();

  // Use local platform task types (like Snag - no API needed)
  // Now includes verification tier info for each task type
  const taskTypes = selectedPlatform && currentStep === "taskType" 
    ? PLATFORM_TASK_TYPES[selectedPlatform]?.map(taskType => {
        // Build the canonical task type for tier lookup
        const canonicalType = taskType.value.includes('_') 
          ? taskType.value 
          : `${selectedPlatform}_${taskType.value}`;
        
        // Look up verification tier info
        const tierInfo = TASK_TYPE_VERIFICATION[canonicalType] || TASK_TYPE_VERIFICATION[taskType.value];
        const tier = tierInfo?.tier || 'T3';
        
        // Adjust default points based on verification tier
        let defaultPoints = 50;
        if (taskType.value.includes('follow')) {
          defaultPoints = tier === 'T1' ? 50 : tier === 'T2' ? 40 : 25;
        } else if (taskType.value.includes('like')) {
          defaultPoints = tier === 'T1' ? 25 : tier === 'T2' ? 20 : 15;
        } else if (taskType.value.includes('share') || taskType.value.includes('retweet')) {
          defaultPoints = tier === 'T1' ? 100 : tier === 'T2' ? 85 : 50;
        } else if (taskType.value.includes('comment') || taskType.value.includes('code')) {
          defaultPoints = tier === 'T2' ? 40 : 30;
        } else if (taskType.value.includes('subscribe')) {
          defaultPoints = tier === 'T1' ? 100 : 50;
        } else {
          defaultPoints = tier === 'T1' ? 75 : tier === 'T2' ? 60 : 40;
        }
        
        return {
          value: taskType.value,
          label: taskType.label,
          description: `Fans ${taskType.label.toLowerCase()} to earn points`,
          points: defaultPoints,
          icon: taskType.icon,
          verificationTier: tier,
        };
      }) || []
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

    const platform = selectedPlatform;
    const rawTaskType = selectedTaskType.value as string;
    const canonicalTaskType = rawTaskType.includes('_') && rawTaskType.startsWith(platform)
      ? rawTaskType
      : `${platform}_${rawTaskType}`;

    // Connectivity gate: determine if this platform is connected (unified check)
    const connected = checkPlatformConnected(platform);

    // Map config fields to task columns
    let targetUrl: string | undefined;
    if (config.page_url) targetUrl = config.page_url;
    if (config.channel_url) targetUrl = config.channel_url;
    if (config.artist_url) targetUrl = config.artist_url;

    // Fold misc inputs into customInstructions for now
    const customBits: string[] = [];
    if (config.handle) {
      const handle = String(config.handle).replace(/^@/, '');
      customBits.push(`Handle: @${handle}`);
    }
    if (config.include_name) customBits.push('Include name');
    if (config.include_bio) customBits.push('Include bio');
    if (config.verification_method) customBits.push(`Verification: ${config.verification_method}`);
    const customInstructions = customBits.length ? customBits.join(' | ') : undefined;

    const taskData = {
      name: `${selectedTaskType.label} on ${PLATFORM_CONFIG[platform].name}`,
      description: `Complete ${selectedTaskType.label.toLowerCase()} action on ${PLATFORM_CONFIG[platform].name}`,
      platform,
      taskType: canonicalTaskType,
      targetUrl,
      customInstructions,
      rewardType: 'points' as const,
      pointsToReward: Number(config.points || selectedTaskType.points) || 0,
      isActive: connected,
    };

    if (!connected) {
      toast({
        title: "Task saved in Pending",
        description: `Connect your ${PLATFORM_CONFIG[platform].name} account to publish this task.`,
      });
    }

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
          <div className="p-6 space-y-6">
            {taskTypesLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3 text-white">Loading task types...</span>
              </div>
            ) : (
              <>
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
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <TierBadge tier={taskType.verificationTier} />
                              <Badge variant="secondary">
                                {taskType.points} pts
                              </Badge>
                            </div>
                            <CardDescription className="text-sm text-white">
                              {taskType.description}
                            </CardDescription>
                            {/* Points guidance text for each tier */}
                            {taskType.verificationTier && (
                              <p className="text-xs text-muted-foreground mt-2 italic">
                                {TIER_GUIDANCE[taskType.verificationTier].pointsRange} recommended
                              </p>
                            )}
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground ml-2" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Verification Tier Legend */}
                <div className="border-t border-white/10 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Verification Tiers Guide</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="flex items-start gap-2 p-2 rounded bg-green-500/5 border border-green-500/20">
                      <ShieldCheck className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium text-green-400">T1 - API Verified</span>
                        <p className="text-muted-foreground">{TIER_GUIDANCE.T1.pointsRange}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-2 rounded bg-blue-500/5 border border-blue-500/20">
                      <Shield className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium text-blue-400">T2 - Code Verified</span>
                        <p className="text-muted-foreground">{TIER_GUIDANCE.T2.pointsRange}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-2 rounded bg-amber-500/5 border border-amber-500/20">
                      <ShieldAlert className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium text-amber-400">T3 - Honor System</span>
                        <p className="text-muted-foreground">{TIER_GUIDANCE.T3.pointsRange}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
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