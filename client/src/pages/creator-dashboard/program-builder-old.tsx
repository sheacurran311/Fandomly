import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchApi, queryClient } from "@/lib/queryClient";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { 
  Layers, 
  Plus, 
  Settings, 
  Eye, 
  Rocket,
  Edit,
  Trash2,
  Megaphone,
  CheckSquare,
  Star,
  Save,
  Globe,
  Palette,
  AlertCircle,
  ChevronRight,
  ArrowLeft,
  Twitter,
  Instagram,
  MessageCircle
} from "lucide-react";
import type { Program, Campaign, Task } from "@shared/schema";

interface ProgramWithDetails extends Program {
  campaigns?: Campaign[];
  tasks?: Task[];
}

export default function ProgramBuilder() {
  const { user, isLoading: authLoading } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<ProgramWithDetails | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "campaigns" | "tasks" | "customize" | "settings">("overview");

  // Fetch programs
  const { data: programs = [], isLoading } = useQuery<Program[]>({
    queryKey: ["/api/programs"],
    enabled: !!user,
  });

  // Fetch selected program details
  const { data: programDetails, refetch: refetchProgram } = useQuery<ProgramWithDetails>({
    queryKey: [`/api/programs/${selectedProgram?.id}`],
    enabled: !!selectedProgram?.id,
  });

  // Update selected program when details are fetched
  useEffect(() => {
    if (programDetails) {
      setSelectedProgram(programDetails);
    }
  }, [programDetails]);

  // Create program mutation
  const createProgramMutation = useMutation({
    mutationFn: async (data: any) => {
      return fetchApi("/api/programs", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      setIsCreateModalOpen(false);
    },
  });

  // Publish program mutation
  const publishProgramMutation = useMutation({
    mutationFn: async ({ id, slug }: { id: string; slug: string }) => {
      return fetchApi(`/api/programs/${id}/publish`, {
        method: "POST",
        body: JSON.stringify({ slug }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      if (selectedProgram) {
        refetchProgram();
      }
    },
  });

  // Unpublish program mutation
  const unpublishProgramMutation = useMutation({
    mutationFn: async (id: string) => {
      return fetchApi(`/api/programs/${id}/unpublish`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      if (selectedProgram) {
        refetchProgram();
      }
    },
  });

  // Delete program mutation
  const deleteProgramMutation = useMutation({
    mutationFn: async (id: string) => {
      return fetchApi(`/api/programs/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      setSelectedProgram(null);
    },
  });

  if (authLoading || isLoading) {
    return (
      <DashboardLayout userType="creator">
        <div className="flex items-center justify-center h-screen">
          <div className="text-white">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  // If no programs, show welcome screen
  if (!programs.length && !selectedProgram) {
    return (
      <DashboardLayout userType="creator">
        <div className="p-6">
          <WelcomeScreen onCreateProgram={() => setIsCreateModalOpen(true)} />
          <CreateProgramModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onSubmit={(data) => createProgramMutation.mutate(data)}
          />
        </div>
      </DashboardLayout>
    );
  }

  // If program selected, show program builder
  if (selectedProgram) {
    return (
      <DashboardLayout userType="creator">
        <div className="p-6">
          <ProgramBuilderView
            program={selectedProgram}
            onBack={() => setSelectedProgram(null)}
            onPublish={(slug) => publishProgramMutation.mutate({ id: selectedProgram.id, slug })}
            onUnpublish={() => unpublishProgramMutation.mutate(selectedProgram.id)}
            onDelete={() => {
              if (confirm("Are you sure you want to delete this program?")) {
                deleteProgramMutation.mutate(selectedProgram.id);
              }
            }}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>
      </DashboardLayout>
    );
  }

  // Show programs list
  return (
    <DashboardLayout userType="creator">
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
              <Layers className="mr-3 h-8 w-8 text-brand-primary" />
              Program Builder
            </h1>
            <p className="text-gray-400">
              Build your public program page with campaigns and tasks
            </p>
          </div>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-brand-primary hover:bg-brand-primary/80"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Program
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map((program) => (
            <ProgramCard
              key={program.id}
              program={program}
              onClick={() => setSelectedProgram(program)}
            />
          ))}
        </div>

        <CreateProgramModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={(data) => createProgramMutation.mutate(data)}
        />
      </div>
    </DashboardLayout>
  );
}

// Welcome Screen Component
function WelcomeScreen({ onCreateProgram }: { onCreateProgram: () => void }) {
  return (
    <div className="max-w-4xl mx-auto">
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardContent className="p-12 text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-brand-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Layers className="h-10 w-10 text-brand-primary" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">
              Welcome to Program Builder
            </h2>
            <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
              Create your program page where fans can discover your campaigns and tasks. 
              Think of it as your engagement hub - organize everything in one place!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-left">
            <div className="bg-white/5 p-6 rounded-lg border border-white/10">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                <Layers className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">Program</h3>
              <p className="text-gray-400 text-sm">
                Your main page - the top level that contains everything
              </p>
            </div>

            <div className="bg-white/5 p-6 rounded-lg border border-white/10">
              <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mb-4">
                <Megaphone className="h-6 w-6 text-orange-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">Campaigns</h3>
              <p className="text-gray-400 text-sm">
                Time-based collections of tasks with special rewards
              </p>
            </div>

            <div className="bg-white/5 p-6 rounded-lg border border-white/10">
              <div className="w-12 h-12 bg-indigo-500/20 rounded-lg flex items-center justify-center mb-4">
                <CheckSquare className="h-6 w-6 text-indigo-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">Tasks</h3>
              <p className="text-gray-400 text-sm">
                Individual actions fans complete to earn rewards
              </p>
            </div>
          </div>

          <Button
            onClick={onCreateProgram}
            size="lg"
            className="bg-brand-primary hover:bg-brand-primary/80"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Your First Program
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Program Card Component
function ProgramCard({ program, onClick }: { program: Program; onClick: () => void }) {
  const statusColor = program.status === 'published' 
    ? 'bg-green-500/20 text-green-400 border-green-500/30'
    : program.status === 'draft'
    ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    : 'bg-gray-500/20 text-gray-400 border-gray-500/30';

  return (
    <Card 
      className="bg-white/5 backdrop-blur-lg border-white/10 hover:border-brand-primary/50 transition-all cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 bg-brand-primary/20 rounded-lg flex items-center justify-center group-hover:bg-brand-primary/30 transition-colors">
            <Layers className="h-6 w-6 text-brand-primary" />
          </div>
          <Badge className={`${statusColor} border`}>
            {program.status}
          </Badge>
        </div>

        <h3 className="text-white font-semibold text-lg mb-2 group-hover:text-brand-primary transition-colors">
          {program.name}
        </h3>
        <p className="text-gray-400 text-sm mb-4 line-clamp-2">
          {program.description || "No description"}
        </p>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">
            {program.pointsName || "Points"}
          </span>
          <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-brand-primary transition-colors" />
        </div>
      </CardContent>
    </Card>
  );
}

// Create Program Modal Component
function CreateProgramModal({ 
  isOpen, 
  onClose, 
  onSubmit 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (data: any) => void;
}) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    pointsName: "Points",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({ name: "", description: "", pointsName: "Points" });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">Create New Program</DialogTitle>
          <DialogDescription className="text-gray-400">
            Set up your program page. You can customize it further after creation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-white">Program Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="My Fan Engagement Program"
              className="bg-white/5 border-white/10 text-white"
              required
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-white">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what your program offers..."
              className="bg-white/5 border-white/10 text-white"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="pointsName" className="text-white">Points Name</Label>
            <Input
              id="pointsName"
              value={formData.pointsName}
              onChange={(e) => setFormData({ ...formData, pointsName: e.target.value })}
              placeholder="Points, Tokens, Rewards, etc."
              className="bg-white/5 border-white/10 text-white"
            />
            <p className="text-xs text-gray-400 mt-1">
              What you'll call the rewards fans earn (e.g., "Thunder Points", "Luna Coins")
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-white/10 text-white hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-brand-primary hover:bg-brand-primary/80"
            >
              Create Program
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Program Builder View Component
function ProgramBuilderView({ 
  program, 
  onBack, 
  onPublish,
  onUnpublish,
  onDelete,
  activeTab,
  onTabChange
}: { 
  program: ProgramWithDetails;
  onBack: () => void;
  onPublish: (slug: string) => void;
  onUnpublish: () => void;
  onDelete: () => void;
  activeTab: string;
  onTabChange: (tab: "overview" | "campaigns" | "tasks" | "customize" | "settings") => void;
}) {
  const [publishSlug, setPublishSlug] = useState(program.slug || "");
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const handlePublish = () => {
    if (!publishSlug) {
      alert("Please enter a URL slug");
      return;
    }
    onPublish(publishSlug);
    setShowPublishDialog(false);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={onBack}
          className="text-gray-400 hover:text-white mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Programs
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white">{program.name}</h1>
              <Badge className={
                program.status === 'published'
                  ? 'bg-green-500/20 text-green-400 border-green-500/30'
                  : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
              }>
                {program.status}
              </Badge>
            </div>
            <p className="text-gray-400">
              {program.description || "No description"}
            </p>
          </div>

          <div className="flex gap-2">
            {program.status === 'draft' ? (
              <Button
                onClick={() => setShowPublishDialog(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Rocket className="h-4 w-4 mr-2" />
                Publish
              </Button>
            ) : (
              <Button
                onClick={onUnpublish}
                variant="outline"
                className="border-white/10 text-white hover:bg-white/5"
              >
                Unpublish
              </Button>
            )}
            <Button
              onClick={() => setShowPreviewModal(true)}
              variant="outline"
              className="border-white/10 text-white hover:bg-white/5"
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-white/5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">
            Campaigns
            {program.campaigns && program.campaigns.length > 0 && (
              <Badge className="ml-2 bg-orange-500/20 text-orange-400">
                {program.campaigns.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="tasks">
            Tasks
            {program.tasks && program.tasks.length > 0 && (
              <Badge className="ml-2 bg-indigo-500/20 text-indigo-400">
                {program.tasks.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="customize">Customize</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <ProgramOverview program={program} onTabChange={onTabChange} />
        </TabsContent>

        <TabsContent value="campaigns" className="mt-6">
          <ProgramCampaigns program={program} />
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <ProgramTasks program={program} />
        </TabsContent>

        <TabsContent value="customize" className="mt-6">
          <ProgramCustomize program={program} />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <ProgramSettings program={program} onDelete={onDelete} />
        </TabsContent>
      </Tabs>

      {/* Publish Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent className="bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Publish Program</DialogTitle>
            <DialogDescription className="text-gray-400">
              Choose a URL slug for your public program page
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="slug" className="text-white">URL Slug *</Label>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-gray-400 text-sm">fandomly.com/</span>
                <Input
                  id="slug"
                  value={publishSlug}
                  onChange={(e) => setPublishSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                  placeholder="my-program"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Only lowercase letters, numbers, and hyphens allowed
              </p>
            </div>

            <Alert className="border-blue-500/20 bg-blue-500/10">
              <AlertCircle className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-gray-300">
                Once published, your program will be visible to fans at the URL above.
              </AlertDescription>
            </Alert>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowPublishDialog(false)}
              className="border-white/10 text-white hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePublish}
              className="bg-green-600 hover:bg-green-700"
            >
              <Rocket className="h-4 w-4 mr-2" />
              Publish Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <PreviewModal 
        program={program} 
        isOpen={showPreviewModal} 
        onClose={() => setShowPreviewModal(false)} 
      />
    </div>
  );
}

// Preview Modal Component
function PreviewModal({ 
  program, 
  isOpen, 
  onClose 
}: { 
  program: ProgramWithDetails; 
  isOpen: boolean; 
  onClose: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] bg-slate-900 border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center justify-between">
            <span>Preview: {program.name}</span>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Read-Only Preview</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto h-full p-6 bg-brand-dark-bg rounded-lg">
          {/* Public Program Page Preview */}
          <div className="space-y-6">
            {/* Hero Banner */}
            <div className="relative h-48 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-lg overflow-hidden">
              {program.pageConfig?.headerImage ? (
                <img src={program.pageConfig.headerImage} className="w-full h-full object-cover" alt="Banner" />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-white/50">No banner image set</p>
                </div>
              )}
            </div>

            {/* Program Info */}
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-2">{program.name}</h2>
              <p className="text-gray-400 mb-4">{program.description || "No description"}</p>
              <div className="flex justify-center gap-4">
                <Badge className="bg-brand-primary/20 text-brand-primary">
                  {program.campaigns?.length || 0} Campaigns
                </Badge>
                <Badge className="bg-indigo-500/20 text-indigo-400">
                  {program.tasks?.length || 0} Tasks
                </Badge>
                <Badge className="bg-yellow-500/20 text-yellow-400">
                  {program.pointsName}
                </Badge>
              </div>
            </div>

            {/* Preview Notice */}
            <Alert className="border-blue-500/20 bg-blue-500/10">
              <AlertCircle className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-gray-300">
                This is a preview of how your program page will appear to fans. Publish your program to make it live.
              </AlertDescription>
            </Alert>

            {/* Campaigns Preview */}
            {program.campaigns && program.campaigns.length > 0 && (
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Active Campaigns</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {program.campaigns.slice(0, 3).map((campaign) => (
                      <div key={campaign.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
                        <h4 className="text-white font-semibold">{campaign.name}</h4>
                        <p className="text-sm text-gray-400">{campaign.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tasks Preview */}
            {program.tasks && program.tasks.length > 0 && (
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Available Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {program.tasks.slice(0, 3).map((task) => (
                      <div key={task.id} className="p-4 bg-white/5 rounded-lg border border-white/10 flex items-center justify-between">
                        <div>
                          <h4 className="text-white font-semibold">{task.name}</h4>
                          <p className="text-sm text-gray-400">{task.description}</p>
                        </div>
                        <Badge className="bg-indigo-500/20 text-indigo-400">
                          {task.pointsToReward} {program.pointsName}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Program Overview Tab
function ProgramOverview({ program, onTabChange }: { program: ProgramWithDetails; onTabChange?: (tab: string) => void }) {
  const campaignCount = program.campaigns?.length || 0;
  const taskCount = program.tasks?.length || 0;
  const activeCampaigns = program.campaigns?.filter(c => c.status === 'active').length || 0;
  const activeTasks = program.tasks?.filter(t => t.isActive).length || 0;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Campaigns</p>
                <p className="text-2xl font-bold text-white">{campaignCount}</p>
              </div>
              <Megaphone className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Active Campaigns</p>
                <p className="text-2xl font-bold text-white">{activeCampaigns}</p>
              </div>
              <Star className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Tasks</p>
                <p className="text-2xl font-bold text-white">{taskCount}</p>
              </div>
              <CheckSquare className="h-8 w-8 text-indigo-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Active Tasks</p>
                <p className="text-2xl font-bold text-white">{activeTasks}</p>
              </div>
              <CheckSquare className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={() => window.location.href = '/creator-dashboard/campaigns'}
              variant="outline"
              className="border-white/10 text-white hover:bg-white/5 h-auto py-4 flex-col items-start"
            >
              <Megaphone className="h-6 w-6 mb-2 text-orange-400" />
              <span className="font-semibold">Create Campaign</span>
              <span className="text-xs text-gray-400">Time-based task collection</span>
            </Button>

            <Button
              onClick={() => window.location.href = '/creator-dashboard/tasks/create'}
              variant="outline"
              className="border-white/10 text-white hover:bg-white/5 h-auto py-4 flex-col items-start"
            >
              <CheckSquare className="h-6 w-6 mb-2 text-indigo-400" />
              <span className="font-semibold">Create Task</span>
              <span className="text-xs text-gray-400">Single action for fans</span>
            </Button>

            <Button
              onClick={() => onTabChange?.('customize')}
              variant="outline"
              className="border-white/10 text-white hover:bg-white/5 h-auto py-4 flex-col items-start"
            >
              <Palette className="h-6 w-6 mb-2 text-purple-400" />
              <span className="font-semibold">Customize Page</span>
              <span className="text-xs text-gray-400">Branding & design</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Program Info */}
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Program Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-gray-400">Program Name</Label>
            <p className="text-white">{program.name}</p>
          </div>
          <Separator className="bg-white/10" />
          <div>
            <Label className="text-gray-400">Description</Label>
            <p className="text-white">{program.description || "No description"}</p>
          </div>
          <Separator className="bg-white/10" />
          <div>
            <Label className="text-gray-400">Points Currency</Label>
            <p className="text-white">{program.pointsName}</p>
          </div>
          {program.slug && (
            <>
              <Separator className="bg-white/10" />
              <div>
                <Label className="text-gray-400">Public URL</Label>
                <div className="flex items-center gap-2">
                  <p className="text-white">fandomly.com/{program.slug}</p>
                  {program.status === 'published' && (
                    <Badge className="bg-green-500/20 text-green-400">Live</Badge>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Program Campaigns Tab
function ProgramCampaigns({ program }: { program: ProgramWithDetails }) {
  return (
    <div className="space-y-6">
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white">Campaigns</CardTitle>
          <Button className="bg-orange-600 hover:bg-orange-700">
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </Button>
        </CardHeader>
        <CardContent>
          {!program.campaigns || program.campaigns.length === 0 ? (
            <div className="text-center py-12">
              <Megaphone className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No campaigns yet</h3>
              <p className="text-gray-400 mb-4">
                Campaigns are time-based collections of tasks with special rewards
              </p>
              <Button className="bg-orange-600 hover:bg-orange-700">
                <Plus className="h-4 w-4 mr-2" />
                Create First Campaign
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {program.campaigns.map((campaign) => (
                <Card key={campaign.id} className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-semibold">{campaign.name}</h4>
                        <p className="text-sm text-gray-400">{campaign.description}</p>
                      </div>
                      <Badge className={
                        campaign.status === 'active'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }>
                        {campaign.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Program Tasks Tab
function ProgramTasks({ program }: { program: ProgramWithDetails }) {
  return (
    <div className="space-y-6">
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white">Tasks</CardTitle>
          <Button className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </CardHeader>
        <CardContent>
          {!program.tasks || program.tasks.length === 0 ? (
            <div className="text-center py-12">
              <CheckSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No tasks yet</h3>
              <p className="text-gray-400 mb-4">
                Tasks are individual actions fans complete to earn rewards
              </p>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="h-4 w-4 mr-2" />
                Create First Task
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {program.tasks.map((task) => (
                <Card key={task.id} className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-semibold">{task.name}</h4>
                        <p className="text-sm text-gray-400">{task.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-indigo-500/20 text-indigo-400">
                          {task.pointsToReward} {program.pointsName}
                        </Badge>
                        <Badge className={
                          task.isActive
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }>
                          {task.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Program Customize Tab
function ProgramCustomize({ program }: { program: ProgramWithDetails }) {
  const { user } = useAuth();
  const [customizeData, setCustomizeData] = useState({
    // Profile Info
    displayName: program.name,
    bio: program.description || '',
    profilePhoto: '', // from creator.imageUrl
    bannerImage: '', // from user.profileData.bannerImage
    
    // Brand Colors
    brandColors: program.pageConfig?.brandColors || { primary: '#8B5CF6', secondary: '#EC4899', accent: '#F59E0B' },
    
    // Social Links
    socialLinks: program.pageConfig?.socialLinks || {},
    
    // Public Page Toggles (inherit from creator.publicPageSettings)
    showProfile: true,
    showCampaigns: true,
    showTasks: true,
    showRewards: true,
    showLeaderboard: true,
    showActivityFeed: true,
    showFanWidget: true,
  });

  return (
    <div className="space-y-6">
      {/* Profile Section */}
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Profile Information</CardTitle>
          <p className="text-sm text-gray-400">Customize how your program appears to fans</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-white">Display Name</Label>
            <Input
              value={customizeData.displayName}
              onChange={(e) => setCustomizeData({ ...customizeData, displayName: e.target.value })}
              className="bg-white/5 border-white/10 text-white mt-1"
            />
          </div>
          <div>
            <Label className="text-white">Bio / Description</Label>
            <Textarea
              value={customizeData.bio}
              onChange={(e) => setCustomizeData({ ...customizeData, bio: e.target.value })}
              className="bg-white/5 border-white/10 text-white mt-1"
              rows={3}
            />
          </div>
          <Alert className="border-blue-500/20 bg-blue-500/10">
            <AlertCircle className="h-4 w-4 text-blue-400" />
            <AlertDescription className="text-gray-300 text-sm">
              Profile photo and banner image are managed in your Creator Profile settings
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Brand Colors */}
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Brand Colors</CardTitle>
          <p className="text-sm text-gray-400">Colors used throughout your program page</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-white">Primary Color</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="color"
                  value={customizeData.brandColors.primary}
                  onChange={(e) => setCustomizeData({ 
                    ...customizeData, 
                    brandColors: { ...customizeData.brandColors, primary: e.target.value }
                  })}
                  className="w-16 h-10 p-1 bg-white/5 border-white/10"
                />
                <Input
                  value={customizeData.brandColors.primary}
                  onChange={(e) => setCustomizeData({ 
                    ...customizeData, 
                    brandColors: { ...customizeData.brandColors, primary: e.target.value }
                  })}
                  className="flex-1 bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>
            <div>
              <Label className="text-white">Secondary Color</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="color"
                  value={customizeData.brandColors.secondary}
                  onChange={(e) => setCustomizeData({ 
                    ...customizeData, 
                    brandColors: { ...customizeData.brandColors, secondary: e.target.value }
                  })}
                  className="w-16 h-10 p-1 bg-white/5 border-white/10"
                />
                <Input
                  value={customizeData.brandColors.secondary}
                  onChange={(e) => setCustomizeData({ 
                    ...customizeData, 
                    brandColors: { ...customizeData.brandColors, secondary: e.target.value }
                  })}
                  className="flex-1 bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>
            <div>
              <Label className="text-white">Accent Color</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="color"
                  value={customizeData.brandColors.accent}
                  onChange={(e) => setCustomizeData({ 
                    ...customizeData, 
                    brandColors: { ...customizeData.brandColors, accent: e.target.value }
                  })}
                  className="w-16 h-10 p-1 bg-white/5 border-white/10"
                />
                <Input
                  value={customizeData.brandColors.accent}
                  onChange={(e) => setCustomizeData({ 
                    ...customizeData, 
                    brandColors: { ...customizeData.brandColors, accent: e.target.value }
                  })}
                  className="flex-1 bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Social Links */}
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Social Links</CardTitle>
          <p className="text-sm text-gray-400">Connect your social media accounts</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-white flex items-center gap-2">
              <Twitter className="h-4 w-4" /> Twitter / X
            </Label>
            <Input
              value={customizeData.socialLinks.twitter || ''}
              onChange={(e) => setCustomizeData({ 
                ...customizeData, 
                socialLinks: { ...customizeData.socialLinks, twitter: e.target.value }
              })}
              placeholder="https://twitter.com/username"
              className="bg-white/5 border-white/10 text-white mt-1"
            />
          </div>
          <div>
            <Label className="text-white flex items-center gap-2">
              <Instagram className="h-4 w-4" /> Instagram
            </Label>
            <Input
              value={customizeData.socialLinks.instagram || ''}
              onChange={(e) => setCustomizeData({ 
                ...customizeData, 
                socialLinks: { ...customizeData.socialLinks, instagram: e.target.value }
              })}
              placeholder="https://instagram.com/username"
              className="bg-white/5 border-white/10 text-white mt-1"
            />
          </div>
          <div>
            <Label className="text-white flex items-center gap-2">
              <MessageCircle className="h-4 w-4" /> Discord
            </Label>
            <Input
              value={customizeData.socialLinks.discord || ''}
              onChange={(e) => setCustomizeData({ 
                ...customizeData, 
                socialLinks: { ...customizeData.socialLinks, discord: e.target.value }
              })}
              placeholder="https://discord.gg/invite"
              className="bg-white/5 border-white/10 text-white mt-1"
            />
          </div>
          <div>
            <Label className="text-white flex items-center gap-2">
              <Globe className="h-4 w-4" /> Website
            </Label>
            <Input
              value={customizeData.socialLinks.website || ''}
              onChange={(e) => setCustomizeData({ 
                ...customizeData, 
                socialLinks: { ...customizeData.socialLinks, website: e.target.value }
              })}
              placeholder="https://yourwebsite.com"
              className="bg-white/5 border-white/10 text-white mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Visibility Toggles */}
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Page Sections</CardTitle>
          <p className="text-sm text-gray-400">Control what appears on your public program page</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <p className="text-white font-medium">Show Profile Tab</p>
              <p className="text-sm text-gray-400">Display your profile information</p>
            </div>
            <Switch
              checked={customizeData.showProfile}
              onCheckedChange={(checked) => setCustomizeData({ ...customizeData, showProfile: checked })}
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <p className="text-white font-medium">Show Campaigns Tab</p>
              <p className="text-sm text-gray-400">Display active campaigns</p>
            </div>
            <Switch
              checked={customizeData.showCampaigns}
              onCheckedChange={(checked) => setCustomizeData({ ...customizeData, showCampaigns: checked })}
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <p className="text-white font-medium">Show Tasks Tab</p>
              <p className="text-sm text-gray-400">Display available tasks</p>
            </div>
            <Switch
              checked={customizeData.showTasks}
              onCheckedChange={(checked) => setCustomizeData({ ...customizeData, showTasks: checked })}
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <p className="text-white font-medium">Show Rewards Tab</p>
              <p className="text-sm text-gray-400">Display reward store</p>
            </div>
            <Switch
              checked={customizeData.showRewards}
              onCheckedChange={(checked) => setCustomizeData({ ...customizeData, showRewards: checked })}
            />
          </div>
          <Separator className="bg-white/10" />
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <p className="text-white font-medium">Show Leaderboard Widget</p>
              <p className="text-sm text-gray-400">Display top fans leaderboard</p>
            </div>
            <Switch
              checked={customizeData.showLeaderboard}
              onCheckedChange={(checked) => setCustomizeData({ ...customizeData, showLeaderboard: checked })}
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <p className="text-white font-medium">Show Activity Feed</p>
              <p className="text-sm text-gray-400">Display recent activity and announcements</p>
            </div>
            <Switch
              checked={customizeData.showActivityFeed}
              onCheckedChange={(checked) => setCustomizeData({ ...customizeData, showActivityFeed: checked })}
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <p className="text-white font-medium">Show Fan Stats Widget</p>
              <p className="text-sm text-gray-400">Display fan count and engagement stats</p>
            </div>
            <Switch
              checked={customizeData.showFanWidget}
              onCheckedChange={(checked) => setCustomizeData({ ...customizeData, showFanWidget: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button className="bg-brand-primary hover:bg-brand-primary/80">
          <Save className="h-4 w-4 mr-2" />
          Save Customization
        </Button>
      </div>
    </div>
  );
}

// Program Settings Tab
function ProgramSettings({ program, onDelete }: { program: ProgramWithDetails; onDelete: () => void }) {
  return (
    <div className="space-y-6">
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Program Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-white">Program Name</Label>
            <Input
              value={program.name}
              className="bg-white/5 border-white/10 text-white mt-1"
              disabled
            />
          </div>

          <div>
            <Label className="text-white">Description</Label>
            <Textarea
              value={program.description || ""}
              className="bg-white/5 border-white/10 text-white mt-1"
              rows={3}
              disabled
            />
          </div>

          <div>
            <Label className="text-white">Points Currency Name</Label>
            <Input
              value={program.pointsName || "Points"}
              className="bg-white/5 border-white/10 text-white mt-1"
              disabled
            />
          </div>

          <Button className="bg-brand-primary hover:bg-brand-primary/80">
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-red-500/10 backdrop-blur-lg border-red-500/20">
        <CardHeader>
          <CardTitle className="text-red-400">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-300 mb-4">
            Deleting your program will permanently remove all associated campaigns and tasks. This action cannot be undone.
          </p>
          <Button
            onClick={onDelete}
            variant="destructive"
            className="bg-red-600 hover:bg-red-700"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Program
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
