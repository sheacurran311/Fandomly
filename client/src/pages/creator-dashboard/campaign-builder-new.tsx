import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchApi, queryClient } from "@/lib/queryClient";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, ArrowRight, Check, Save, Rocket, AlertCircle, Plus, X,
  Calendar, Clock, Trophy, Gift, Ticket, Coins, Target, Users,
  CheckSquare, Lock, Image as ImageIcon, Award, Loader2
} from "lucide-react";
import { useLocation } from "wouter";
import type { Task, Campaign } from "@shared/schema";

// Step indicator component
function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const steps = [
    { number: 1, label: "Basics" },
    { number: 2, label: "Rewards" },
    { number: 3, label: "Requirements" },
    { number: 4, label: "Tasks" },
  ];

  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
            currentStep >= step.number
              ? "bg-brand-primary border-brand-primary text-white"
              : "border-gray-600 text-gray-400"
          }`}>
            {currentStep > step.number ? (
              <Check className="h-5 w-5" />
            ) : (
              <span className="font-semibold">{step.number}</span>
            )}
          </div>
          <span className={`ml-2 text-sm font-medium ${
            currentStep >= step.number ? "text-white" : "text-gray-400"
          }`}>
            {step.label}
          </span>
          {index < steps.length - 1 && (
            <div className={`w-12 h-0.5 mx-4 ${
              currentStep > step.number ? "bg-brand-primary" : "bg-gray-600"
            }`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function CampaignBuilderNew() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // Campaign form state
  const [campaignData, setCampaignData] = useState({
    // Step 1: Basics
    name: "",
    description: "",
    campaignType: "time_based", // time_based, ongoing
    startDate: "",
    endDate: "",
    isIndefinite: false,

    // Step 2: Reward Strategy
    rewardType: "points", // points, raffle
    pointsPerTask: 100,
    raffleEntryPerTask: 1,
    rafflePrize: "",
    raffleDrawDate: "",

    // Step 3: Requirements
    requireAllTasks: true,
    requiredPreviousCampaigns: [] as string[],
    requiredNftCollectionIds: [] as string[],
    requiredBadgeIds: [] as string[],

    // Step 4: Tasks (assigned after soft-save)
    assignedTaskIds: [] as string[],
  });

  // Fetch creator's previous campaigns for prerequisite selection
  const { data: previousCampaigns = [] } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns/creator", user?.creator?.id],
    queryFn: async () => {
      const res = await fetchApi(`/api/campaigns/creator/${user?.creator?.id}`);
      return res.json();
    },
    enabled: !!user?.creator?.id,
  });

  // Fetch available tasks (not assigned to any campaign or assigned to this one)
  const { data: availableTasks = [], refetch: refetchTasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks/available", campaignId],
    queryFn: async () => {
      const res = await fetchApi("/api/tasks");
      const allTasks = await res.json();
      // Show tasks that are unassigned OR assigned to this campaign
      return allTasks.filter((t: Task) => !t.campaignId || t.campaignId === campaignId);
    },
    enabled: !!user?.creator?.id,
  });

  // Soft-save campaign mutation (creates draft in DB)
  const softSaveMutation = useMutation({
    mutationFn: async (data: any) => {
      const endpoint = campaignId
        ? `/api/campaigns/${campaignId}`
        : "/api/campaigns/draft";
      const method = campaignId ? "PUT" : "POST";
      const res = await fetchApi(endpoint, {
        method,
        body: JSON.stringify({
          ...data,
          status: "draft",
          creatorId: user?.creator?.id,
        }),
      });
      return res.json();
    },
    onSuccess: (result) => {
      if (!campaignId && result.id) {
        setCampaignId(result.id);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    },
  });

  // Assign task to campaign mutation
  const assignTaskMutation = useMutation({
    mutationFn: async ({ taskId, campaignId }: { taskId: string; campaignId: string }) => {
      const res = await fetchApi(`/api/tasks/${taskId}/assign`, {
        method: "POST",
        body: JSON.stringify({ campaignId }),
      });
      return res.json();
    },
    onSuccess: () => {
      refetchTasks();
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  // Publish campaign mutation
  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!campaignId) throw new Error("Campaign not saved");
      const res = await fetchApi(`/api/campaigns/${campaignId}/publish`, {
        method: "POST",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      setLocation("/creator-dashboard/campaigns");
    },
  });

  // Handle step navigation
  const handleNext = async () => {
    if (currentStep === 1) {
      // Soft-save on leaving step 1 to get campaign ID
      await softSaveMutation.mutateAsync({
        name: campaignData.name,
        description: campaignData.description,
        startDate: campaignData.startDate || new Date().toISOString(),
        endDate: campaignData.isIndefinite ? null : campaignData.endDate,
        campaignTypes: [campaignData.rewardType],
      });
    }
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handlePublish = async () => {
    await publishMutation.mutateAsync();
  };

  const updateData = (field: string, value: any) => {
    setCampaignData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleTaskAssignment = async (taskId: string) => {
    if (!campaignId) return;

    const isAssigned = campaignData.assignedTaskIds.includes(taskId);
    if (isAssigned) {
      // Unassign task
      updateData("assignedTaskIds", campaignData.assignedTaskIds.filter(id => id !== taskId));
    } else {
      // Assign task
      await assignTaskMutation.mutateAsync({ taskId, campaignId });
      updateData("assignedTaskIds", [...campaignData.assignedTaskIds, taskId]);
    }
  };

  return (
    <DashboardLayout userType="creator">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Campaign Builder</h1>
            <p className="text-gray-400">Create engaging campaigns for your fans</p>
          </div>
          <Button
            variant="outline"
            onClick={() => setLocation("/creator-dashboard/campaigns")}
            className="border-white/20 text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaigns
          </Button>
        </div>

        {/* Step Indicator */}
        <StepIndicator currentStep={currentStep} totalSteps={4} />

        {/* Step Content */}
        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardContent className="p-6">
            {/* Step 1: Campaign Basics */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-brand-primary" />
                    Campaign Basics
                  </h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-white">Campaign Name *</Label>
                    <Input
                      id="name"
                      value={campaignData.name}
                      onChange={(e) => updateData("name", e.target.value)}
                      placeholder="e.g., Summer Fan Challenge"
                      className="mt-1 bg-white/5 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-white">Campaign Summary</Label>
                    <Textarea
                      id="description"
                      value={campaignData.description}
                      onChange={(e) => updateData("description", e.target.value)}
                      placeholder="Describe what fans will do and earn..."
                      className="mt-1 bg-white/5 border-white/20 text-white min-h-[100px]"
                    />
                  </div>

                  <Separator className="bg-white/10" />

                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                    <div>
                      <Label className="text-white">Indefinite Campaign</Label>
                      <p className="text-sm text-gray-400">Campaign runs continuously with no end date</p>
                    </div>
                    <Switch
                      checked={campaignData.isIndefinite}
                      onCheckedChange={(checked) => {
                        updateData("isIndefinite", checked);
                        if (checked) updateData("endDate", "");
                      }}
                    />
                  </div>

                  {!campaignData.isIndefinite && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="startDate" className="text-white">Start Date</Label>
                        <Input
                          id="startDate"
                          type="datetime-local"
                          value={campaignData.startDate}
                          onChange={(e) => updateData("startDate", e.target.value)}
                          className="mt-1 bg-white/5 border-white/20 text-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="endDate" className="text-white">End Date</Label>
                        <Input
                          id="endDate"
                          type="datetime-local"
                          value={campaignData.endDate}
                          onChange={(e) => updateData("endDate", e.target.value)}
                          className="mt-1 bg-white/5 border-white/20 text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Reward Strategy */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <Gift className="h-5 w-5 text-brand-primary" />
                    Reward Strategy
                  </h2>
                  <p className="text-gray-400">Choose how fans will be rewarded</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Points Option */}
                  <Card
                    className={`cursor-pointer transition-all ${
                      campaignData.rewardType === "points"
                        ? "bg-brand-primary/20 border-brand-primary"
                        : "bg-white/5 border-white/10 hover:border-white/30"
                    }`}
                    onClick={() => updateData("rewardType", "points")}
                  >
                    <CardContent className="p-6 text-center">
                      <Coins className="h-12 w-12 mx-auto mb-4 text-yellow-400" />
                      <h3 className="text-white font-semibold mb-2">Points</h3>
                      <p className="text-sm text-gray-400">
                        Award points for each task completion
                      </p>
                    </CardContent>
                  </Card>

                  {/* Raffle Option */}
                  <Card
                    className={`cursor-pointer transition-all ${
                      campaignData.rewardType === "raffle"
                        ? "bg-brand-primary/20 border-brand-primary"
                        : "bg-white/5 border-white/10 hover:border-white/30"
                    }`}
                    onClick={() => updateData("rewardType", "raffle")}
                  >
                    <CardContent className="p-6 text-center">
                      <Ticket className="h-12 w-12 mx-auto mb-4 text-purple-400" />
                      <h3 className="text-white font-semibold mb-2">Raffle Entry</h3>
                      <p className="text-sm text-gray-400">
                        Each task = entry ticket for prize draw
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Points Configuration */}
                {campaignData.rewardType === "points" && (
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <Label className="text-white">Points Per Task Completion</Label>
                    <Input
                      type="number"
                      value={campaignData.pointsPerTask}
                      onChange={(e) => updateData("pointsPerTask", parseInt(e.target.value) || 0)}
                      className="mt-2 bg-white/5 border-white/20 text-white w-32"
                    />
                  </div>
                )}

                {/* Raffle Configuration */}
                {campaignData.rewardType === "raffle" && (
                  <div className="space-y-4 p-4 bg-white/5 rounded-lg border border-white/10">
                    <div>
                      <Label className="text-white">Entries Per Task Completion</Label>
                      <Input
                        type="number"
                        value={campaignData.raffleEntryPerTask}
                        onChange={(e) => updateData("raffleEntryPerTask", parseInt(e.target.value) || 1)}
                        className="mt-2 bg-white/5 border-white/20 text-white w-32"
                      />
                    </div>
                    <div>
                      <Label className="text-white">Prize Description</Label>
                      <Input
                        value={campaignData.rafflePrize}
                        onChange={(e) => updateData("rafflePrize", e.target.value)}
                        placeholder="e.g., Signed merchandise, VIP meet & greet"
                        className="mt-2 bg-white/5 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-white">Draw Date</Label>
                      <Input
                        type="datetime-local"
                        value={campaignData.raffleDrawDate}
                        onChange={(e) => updateData("raffleDrawDate", e.target.value)}
                        className="mt-2 bg-white/5 border-white/20 text-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Requirements */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <Lock className="h-5 w-5 text-brand-primary" />
                    Campaign Requirements
                  </h2>
                  <p className="text-gray-400">Set prerequisites for participation</p>
                </div>

                {/* All Tasks Required */}
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                  <div>
                    <Label className="text-white">Require All Tasks</Label>
                    <p className="text-sm text-gray-400">Fans must complete all tasks to earn rewards</p>
                  </div>
                  <Switch
                    checked={campaignData.requireAllTasks}
                    onCheckedChange={(checked) => updateData("requireAllTasks", checked)}
                  />
                </div>

                {/* Previous Campaign Requirement */}
                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <Label className="text-white mb-3 block">Previous Campaign Completion</Label>
                  <p className="text-sm text-gray-400 mb-3">
                    Require fans to have completed specific campaigns first
                  </p>
                  {previousCampaigns.length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {previousCampaigns
                        .filter(c => c.id !== campaignId && c.status === 'active')
                        .map((campaign) => (
                          <div key={campaign.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`camp-${campaign.id}`}
                              checked={campaignData.requiredPreviousCampaigns.includes(campaign.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  updateData("requiredPreviousCampaigns", [...campaignData.requiredPreviousCampaigns, campaign.id]);
                                } else {
                                  updateData("requiredPreviousCampaigns", campaignData.requiredPreviousCampaigns.filter(id => id !== campaign.id));
                                }
                              }}
                            />
                            <label htmlFor={`camp-${campaign.id}`} className="text-white text-sm">
                              {campaign.name}
                            </label>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No previous campaigns available</p>
                  )}
                </div>

                {/* NFT Requirement */}
                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <Label className="text-white mb-3 block flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Hold an NFT
                  </Label>
                  <p className="text-sm text-gray-400 mb-3">
                    Require fans to hold specific NFT collections
                  </p>
                  <Input
                    placeholder="Enter NFT collection ID (coming soon)"
                    className="bg-white/5 border-white/20 text-white"
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-2">NFT gating coming soon</p>
                </div>

                {/* Badge Requirement */}
                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <Label className="text-white mb-3 block flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Hold a Specific Badge
                  </Label>
                  <p className="text-sm text-gray-400 mb-3">
                    Require fans to have earned specific badges
                  </p>
                  <Input
                    placeholder="Enter badge ID (coming soon)"
                    className="bg-white/5 border-white/20 text-white"
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-2">Badge gating coming soon</p>
                </div>
              </div>
            )}

            {/* Step 4: Task Assignment */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-white mb-1 flex items-center gap-2">
                      <CheckSquare className="h-5 w-5 text-brand-primary" />
                      Campaign Tasks
                    </h2>
                    <p className="text-gray-400">Assign existing tasks or create new ones</p>
                  </div>
                  <Button
                    onClick={() => setIsTaskModalOpen(true)}
                    className="bg-brand-primary hover:bg-brand-primary/80"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Task
                  </Button>
                </div>

                {!campaignId ? (
                  <Alert className="bg-yellow-500/10 border-yellow-500/30">
                    <AlertCircle className="h-4 w-4 text-yellow-400" />
                    <AlertDescription className="text-yellow-200">
                      Campaign will be saved as draft when you proceed to this step
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    {/* Assigned Tasks */}
                    <div>
                      <h3 className="text-white font-medium mb-3">
                        Assigned Tasks ({campaignData.assignedTaskIds.length})
                      </h3>
                      {campaignData.assignedTaskIds.length === 0 ? (
                        <div className="text-center py-8 bg-white/5 rounded-lg border border-dashed border-white/20">
                          <Target className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                          <p className="text-gray-400">No tasks assigned yet</p>
                          <p className="text-sm text-gray-500">Select from available tasks below</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {availableTasks
                            .filter(t => campaignData.assignedTaskIds.includes(t.id))
                            .map((task) => (
                              <div key={task.id} className="flex items-center justify-between p-3 bg-brand-primary/10 rounded-lg border border-brand-primary/30">
                                <div>
                                  <p className="text-white font-medium">{task.name}</p>
                                  <p className="text-sm text-gray-400">{task.taskType}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleTaskAssignment(task.id)}
                                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* Available Tasks */}
                    <div>
                      <h3 className="text-white font-medium mb-3">Available Tasks</h3>
                      {availableTasks.filter(t => !campaignData.assignedTaskIds.includes(t.id)).length === 0 ? (
                        <p className="text-sm text-gray-500 italic">No available tasks. Create a new one above.</p>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {availableTasks
                            .filter(t => !campaignData.assignedTaskIds.includes(t.id))
                            .map((task) => (
                              <div key={task.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:border-white/30 transition-colors">
                                <div>
                                  <p className="text-white font-medium">{task.name}</p>
                                  <p className="text-sm text-gray-400">{task.taskType}</p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleTaskAssignment(task.id)}
                                  className="border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white"
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Add
                                </Button>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="border-white/20 text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex gap-3">
            {currentStep < 4 ? (
              <Button
                onClick={handleNext}
                disabled={currentStep === 1 && !campaignData.name}
                className="bg-brand-primary hover:bg-brand-primary/80"
              >
                {softSaveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                {currentStep === 1 ? "Save & Continue" : "Continue"}
              </Button>
            ) : (
              <Button
                onClick={handlePublish}
                disabled={campaignData.assignedTaskIds.length === 0 || publishMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {publishMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Rocket className="h-4 w-4 mr-2" />
                )}
                Publish Campaign
              </Button>
            )}
          </div>
        </div>

        {/* Task Creation Modal - Placeholder for now */}
        <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
          <DialogContent className="bg-gray-900 border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">Create New Task</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-400">
                Task creation modal will be implemented here. For now, create tasks from the Tasks page and return to assign them.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTaskModalOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
