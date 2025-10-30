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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Layers, 
  Plus, 
  Eye, 
  Rocket,
  Save,
  AlertCircle,
  ArrowLeft,
  Megaphone,
  CheckSquare,
  Palette,
  Settings,
  ExternalLink,
  Image as ImageIcon,
  Pin,
  Trash2,
  Edit,
  Send
} from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";
import type { Program, Campaign, Task } from "@shared/schema";

interface ProgramWithDetails extends Program {
  campaigns?: Campaign[];
  tasks?: Task[];
}

export default function ProgramBuilderNew() {
  const { user } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<ProgramWithDetails | null>(null);

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

  // Fetch campaigns for the selected program
  const { data: programCampaigns = [] } = useQuery<Campaign[]>({
    queryKey: [`/api/campaigns/program/${selectedProgram?.id}`],
    queryFn: async () => {
      const response = await fetchApi(`/api/campaigns/creator/${user?.creator?.id}`);
      const allCampaigns = await response.json();
      // Filter campaigns by programId
      return allCampaigns.filter((c: any) => c.programId === selectedProgram?.id);
    },
    enabled: !!selectedProgram?.id && !!user?.creator?.id,
  });

  // Fetch tasks for the selected program
  const { data: programTasks = [] } = useQuery<Task[]>({
    queryKey: [`/api/tasks/program/${selectedProgram?.id}`],
    queryFn: async () => {
      const response = await fetchApi('/api/tasks');
      const allTasks = await response.json();
      // Filter tasks by programId
      return allTasks.filter((t: any) => t.programId === selectedProgram?.id);
    },
    enabled: !!selectedProgram?.id,
  });

  useEffect(() => {
    if (programDetails) {
      setSelectedProgram(programDetails);
    }
  }, [programDetails]);

  // Select first program by default
  useEffect(() => {
    if (programs.length > 0 && !selectedProgram) {
      setSelectedProgram(programs[0]);
    }
  }, [programs, selectedProgram]);

  // Create program mutation
  const createProgramMutation = useMutation({
    mutationFn: async (data: any) => {
      return fetchApi("/api/programs", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (newProgram) => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      setIsCreateModalOpen(false);
      setSelectedProgram(newProgram);
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
      refetchProgram();
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout userType="creator">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
            <p className="text-gray-400">Loading programs...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userType="creator">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Program Builder</h1>
            <p className="text-gray-400">Customize your program page and manage settings</p>
          </div>
          {programs.length === 0 && (
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-brand-primary hover:bg-brand-primary/80"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Program
            </Button>
          )}
        </div>

        {programs.length === 0 ? (
          <WelcomeScreen onCreateProgram={() => setIsCreateModalOpen(true)} />
        ) : selectedProgram ? (
          <ProgramCustomizer
            program={selectedProgram}
            onPublish={(slug) => publishProgramMutation.mutate({ id: selectedProgram.id, slug })}
            onUpdate={refetchProgram}
            campaigns={programCampaigns}
            tasks={programTasks}
          />
        ) : null}

        {/* Create Program Modal */}
        <CreateProgramModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={(data) => createProgramMutation.mutate(data)}
          isSubmitting={createProgramMutation.isPending}
        />
      </div>
    </DashboardLayout>
  );
}

function WelcomeScreen({ onCreateProgram }: { onCreateProgram: () => void }) {
  return (
    <Card className="bg-white/5 backdrop-blur-lg border-white/10">
      <CardContent className="p-12 text-center">
        <div className="max-w-2xl mx-auto">
          <Layers className="h-24 w-24 text-brand-primary mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-white mb-4">Welcome to Program Builder</h2>
          <p className="text-gray-300 text-lg mb-8">
            Your program is the foundation of your fan engagement system. Create a stunning public page
            that showcases your campaigns, tasks, and rewards all in one place.
          </p>
          <Button
            onClick={onCreateProgram}
            size="lg"
            className="bg-brand-primary hover:bg-brand-primary/80"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Your First Program
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ProgramCustomizer({ 
  program, 
  onPublish,
  onUpdate,
  campaigns = [],
  tasks = []
}: { 
  program: ProgramWithDetails;
  onPublish: (slug: string) => void;
  onUpdate: () => void;
  campaigns?: Campaign[];
  tasks?: Task[];
}) {
  const [showPreview, setShowPreview] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [publishSlug, setPublishSlug] = useState(program.slug || "");
  const [customizeData, setCustomizeData] = useState({
    displayName: program.name,
    bio: program.description || '',
    // Program-specific images
    headerImage: program.pageConfig?.headerImage || '',
    logo: program.pageConfig?.logo || '',
    brandColors: program.pageConfig?.brandColors || { 
      primary: '#8B5CF6', 
      secondary: '#EC4899', 
      accent: '#F59E0B' 
    },
    // Theme settings
    theme: program.pageConfig?.theme || {
      mode: 'light' as 'light' | 'dark' | 'custom',
      backgroundColor: '#ffffff',
      textColor: '#111827',
    },
    // Visibility toggles
    showProfile: program.pageConfig?.visibility?.showProfile ?? true,
    showCampaigns: program.pageConfig?.visibility?.showCampaigns ?? true,
    showTasks: program.pageConfig?.visibility?.showTasks ?? true,
    showRewards: program.pageConfig?.visibility?.showRewards ?? true,
    showLeaderboard: program.pageConfig?.visibility?.showLeaderboard ?? true,
    showActivityFeed: program.pageConfig?.visibility?.showActivityFeed ?? true,
    showFanWidget: program.pageConfig?.visibility?.showFanWidget ?? true,
    // Granular profile data visibility
    profileData: program.pageConfig?.visibility?.profileData || {
      showBio: true,
      showSocialLinks: true,
      showTiers: true,
      showVerificationBadge: true,
    },
  });

  const updateProgramMutation = useMutation({
    mutationFn: async (data: any) => {
      return fetchApi(`/api/programs/${program.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/programs/${program.id}`] });
      onUpdate();
    },
  });

  const handleSave = () => {
    updateProgramMutation.mutate({
      name: customizeData.displayName,
      description: customizeData.bio,
      pageConfig: {
        ...program.pageConfig,
        headerImage: customizeData.headerImage,
        logo: customizeData.logo,
        brandColors: customizeData.brandColors,
        theme: customizeData.theme,
        visibility: {
          showProfile: customizeData.showProfile,
          showCampaigns: customizeData.showCampaigns,
          showTasks: customizeData.showTasks,
          showRewards: customizeData.showRewards,
          showLeaderboard: customizeData.showLeaderboard,
          showActivityFeed: customizeData.showActivityFeed,
          showFanWidget: customizeData.showFanWidget,
          profileData: customizeData.profileData,
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="border-white/20 text-white">
                {program.status === 'published' ? (
                  <><Rocket className="h-3 w-3 mr-1" /> Published</>
                ) : (
                  <>Draft</>
                )}
              </Badge>
              {program.status === 'published' && program.slug && (
                <a
                  href={`/programs/${program.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-primary hover:underline text-sm flex items-center gap-1"
                >
                  View Public Page <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowPreview(true)}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button
                onClick={handleSave}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
                disabled={updateProgramMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {updateProgramMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
              {program.status !== 'published' && (
                <Button
                  onClick={() => setShowPublishDialog(true)}
                  className="bg-brand-primary hover:bg-brand-primary/80"
                >
                  <Rocket className="h-4 w-4 mr-2" />
                  Publish Program
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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
              className="border-white/10 text-white hover:bg-white/5 h-auto py-6 flex-col items-start"
            >
              <Megaphone className="h-8 w-8 mb-3 text-orange-400" />
              <span className="font-semibold text-lg">Create Campaign</span>
              <span className="text-xs text-gray-400 mt-1">Time-based task collection</span>
            </Button>

            <Button
              onClick={() => window.location.href = '/creator-dashboard/tasks/create'}
              variant="outline"
              className="border-white/10 text-white hover:bg-white/5 h-auto py-6 flex-col items-start"
            >
              <CheckSquare className="h-8 w-8 mb-3 text-indigo-400" />
              <span className="font-semibold text-lg">Create Task</span>
              <span className="text-xs text-gray-400 mt-1">Single action for fans</span>
            </Button>

            <Button
              onClick={() => window.location.href = '/creator-dashboard/rewards'}
              variant="outline"
              className="border-white/10 text-white hover:bg-white/5 h-auto py-6 flex-col items-start"
            >
              <Settings className="h-8 w-8 mb-3 text-purple-400" />
              <span className="font-semibold text-lg">Manage Rewards</span>
              <span className="text-xs text-gray-400 mt-1">Set up reward store</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Profile Information */}
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Program Information</CardTitle>
          <p className="text-sm text-gray-400">Customize how your program appears to fans</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-white">Program Name</Label>
            <Input
              value={customizeData.displayName}
              onChange={(e) => setCustomizeData({ ...customizeData, displayName: e.target.value })}
              className="bg-white/5 border-white/10 text-white mt-1"
              placeholder="My Loyalty Program"
            />
          </div>
          <div>
            <Label className="text-white">Description</Label>
            <Textarea
              value={customizeData.bio}
              onChange={(e) => setCustomizeData({ ...customizeData, bio: e.target.value })}
              className="bg-white/5 border-white/10 text-white mt-1"
              rows={3}
              placeholder="Tell your fans what this program is about..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Program Images */}
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Program Images
          </CardTitle>
          <p className="text-sm text-gray-400">Customize your program's banner and logo (separate from your personal profile)</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-white mb-3 block">Banner Image</Label>
            <p className="text-sm text-gray-400 mb-3">
              This banner will appear at the top of your program page. If not set, your creator profile banner will be used.
            </p>
            <ImageUpload
              type="banner"
              currentImageUrl={customizeData.headerImage}
              onUploadSuccess={(url) => setCustomizeData({ ...customizeData, headerImage: url })}
              onRemove={() => setCustomizeData({ ...customizeData, headerImage: '' })}
            />
          </div>

          <Separator className="bg-white/10" />

          <div>
            <Label className="text-white mb-3 block">Program Logo</Label>
            <p className="text-sm text-gray-400 mb-3">
              This logo will appear as your program's profile picture. If not set, your creator profile photo will be used.
            </p>
            <ImageUpload
              type="avatar"
              currentImageUrl={customizeData.logo}
              onUploadSuccess={(url) => setCustomizeData({ ...customizeData, logo: url })}
              onRemove={() => setCustomizeData({ ...customizeData, logo: '' })}
            />
          </div>

          <Alert className="border-yellow-500/20 bg-yellow-500/10">
            <AlertCircle className="h-4 w-4 text-yellow-400" />
            <AlertDescription className="text-gray-300 text-sm">
              <strong>Tip:</strong> Use program-specific images to differentiate your loyalty program from your personal brand. Leave blank to use your creator profile images.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Brand Colors */}
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Brand Colors
          </CardTitle>
          <p className="text-sm text-gray-400">Customize colors used throughout your program page</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-white">Primary Color</Label>
                <span className="text-xs text-gray-500 italic">Banner, Buttons, Highlights</span>
              </div>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={customizeData.brandColors.primary}
                  onChange={(e) => setCustomizeData({ 
                    ...customizeData, 
                    brandColors: { ...customizeData.brandColors, primary: e.target.value }
                  })}
                  className="w-16 h-10 p-1 bg-white/5 border-white/10 cursor-pointer"
                />
                <Input
                  value={customizeData.brandColors.primary}
                  onChange={(e) => setCustomizeData({ 
                    ...customizeData, 
                    brandColors: { ...customizeData.brandColors, primary: e.target.value }
                  })}
                  className="flex-1 bg-white/5 border-white/10 text-white"
                  placeholder="#6366f1"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Used for primary CTAs, badges, and active states</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-white">Secondary Color</Label>
                <span className="text-xs text-gray-500 italic">Banner Gradient, Accents</span>
              </div>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={customizeData.brandColors.secondary}
                  onChange={(e) => setCustomizeData({ 
                    ...customizeData, 
                    brandColors: { ...customizeData.brandColors, secondary: e.target.value }
                  })}
                  className="w-16 h-10 p-1 bg-white/5 border-white/10 cursor-pointer"
                />
                <Input
                  value={customizeData.brandColors.secondary}
                  onChange={(e) => setCustomizeData({ 
                    ...customizeData, 
                    brandColors: { ...customizeData.brandColors, secondary: e.target.value }
                  })}
                  className="flex-1 bg-white/5 border-white/10 text-white"
                  placeholder="#8b5cf6"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Used in banner gradients and secondary accents</p>
            </div>
          </div>
          
          <Alert className="border-blue-500/20 bg-blue-500/10">
            <AlertCircle className="h-4 w-4 text-blue-400" />
            <AlertDescription className="text-gray-300 text-sm">
              <strong>Brand Colors:</strong> These colors are applied to buttons, badges, banners, and interactive elements throughout your program page.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Page Theme */}
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Page Theme
          </CardTitle>
          <p className="text-sm text-gray-400">Choose a preset theme or customize your own</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme Mode Selector */}
          <div>
            <Label className="text-white mb-3 block">Theme Preset</Label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setCustomizeData({ 
                  ...customizeData, 
                  theme: { mode: 'light', backgroundColor: '#ffffff', textColor: '#111827' }
                })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  customizeData.theme.mode === 'light' 
                    ? 'border-brand-primary bg-brand-primary/10' 
                    : 'border-white/20 bg-white/5 hover:border-white/40'
                }`}
              >
                <div className="w-full h-20 rounded bg-white border border-gray-300 mb-2"></div>
                <p className="text-white font-medium text-sm">Light</p>
                <p className="text-gray-400 text-xs">White background</p>
              </button>
              
              <button
                onClick={() => setCustomizeData({ 
                  ...customizeData, 
                  theme: { mode: 'dark', backgroundColor: '#0f172a', textColor: '#ffffff' }
                })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  customizeData.theme.mode === 'dark' 
                    ? 'border-brand-primary bg-brand-primary/10' 
                    : 'border-white/20 bg-white/5 hover:border-white/40'
                }`}
              >
                <div className="w-full h-20 rounded bg-slate-900 border border-gray-700 mb-2"></div>
                <p className="text-white font-medium text-sm">Dark</p>
                <p className="text-gray-400 text-xs">Dark background</p>
              </button>
              
              <button
                onClick={() => setCustomizeData({ 
                  ...customizeData, 
                  theme: { ...customizeData.theme, mode: 'custom' }
                })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  customizeData.theme.mode === 'custom' 
                    ? 'border-brand-primary bg-brand-primary/10' 
                    : 'border-white/20 bg-white/5 hover:border-white/40'
                }`}
              >
                <div className="w-full h-20 rounded bg-gradient-to-br from-purple-500 to-pink-500 mb-2"></div>
                <p className="text-white font-medium text-sm">Custom</p>
                <p className="text-gray-400 text-xs">Your colors</p>
              </button>
            </div>
          </div>

          {/* Custom Color Pickers (shown when Custom is selected) */}
          {customizeData.theme.mode === 'custom' && (
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div>
                <Label className="text-white mb-2 block">Background Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={customizeData.theme.backgroundColor}
                    onChange={(e) => setCustomizeData({ 
                      ...customizeData, 
                      theme: { ...customizeData.theme, backgroundColor: e.target.value }
                    })}
                    className="w-16 h-10 p-1 bg-white/5 border-white/10 cursor-pointer"
                  />
                  <Input
                    value={customizeData.theme.backgroundColor}
                    onChange={(e) => setCustomizeData({ 
                      ...customizeData, 
                      theme: { ...customizeData.theme, backgroundColor: e.target.value }
                    })}
                    className="flex-1 bg-white/5 border-white/10 text-white"
                    placeholder="#ffffff"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Main page background color</p>
              </div>

              <div>
                <Label className="text-white mb-2 block">Text Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={customizeData.theme.textColor}
                    onChange={(e) => setCustomizeData({ 
                      ...customizeData, 
                      theme: { ...customizeData.theme, textColor: e.target.value }
                    })}
                    className="w-16 h-10 p-1 bg-white/5 border-white/10 cursor-pointer"
                  />
                  <Input
                    value={customizeData.theme.textColor}
                    onChange={(e) => setCustomizeData({ 
                      ...customizeData, 
                      theme: { ...customizeData.theme, textColor: e.target.value }
                    })}
                    className="flex-1 bg-white/5 border-white/10 text-white"
                    placeholder="#111827"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Primary text color for headings and body</p>
              </div>

              <Alert className="border-yellow-500/20 bg-yellow-500/10">
                <AlertCircle className="h-4 w-4 text-yellow-400" />
                <AlertDescription className="text-gray-300 text-sm">
                  <strong>Tip:</strong> Ensure good contrast between background and text colors for readability. Light backgrounds pair best with dark text, and dark backgrounds with light text.
                </AlertDescription>
              </Alert>
            </div>
          )}
          
          {/* Preview Box */}
          <div className="p-6 rounded-lg border-2 border-white/20" style={{
            backgroundColor: customizeData.theme.backgroundColor,
            color: customizeData.theme.textColor
          }}>
            <h3 className="font-bold text-lg mb-2">Preview</h3>
            <p className="text-sm opacity-80">This is how your text will look on your page background.</p>
            <div className="flex gap-2 mt-3">
              <Badge style={{ 
                backgroundColor: customizeData.brandColors.primary + '20', 
                color: customizeData.brandColors.primary,
                borderColor: customizeData.brandColors.primary + '40'
              }}>
                Primary Badge
              </Badge>
              <Badge style={{ 
                backgroundColor: customizeData.brandColors.secondary + '20', 
                color: customizeData.brandColors.secondary,
                borderColor: customizeData.brandColors.secondary + '40'
              }}>
                Secondary Badge
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Page Visibility */}
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Page Sections</CardTitle>
          <p className="text-sm text-gray-400">Control what appears on your public program page</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Show Profile Tab - with granular controls */}
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div>
                <p className="text-white font-medium">Show Profile Tab</p>
                <p className="text-sm text-gray-400">Display your profile information and about section</p>
              </div>
              <Switch
                checked={customizeData.showProfile}
                onCheckedChange={(checked) => setCustomizeData({ ...customizeData, showProfile: checked })}
              />
            </div>
            
            {/* Collapsible Profile Data Controls */}
            {customizeData.showProfile && (
              <div className="ml-6 space-y-2 border-l-2 border-brand-primary/30 pl-4">
                <p className="text-xs text-gray-400 mb-2 italic">Profile Data Visibility</p>
                
                <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  <span className="text-white text-sm">Show Bio/Description</span>
                  <Switch
                    checked={customizeData.profileData?.showBio ?? true}
                    onCheckedChange={(checked) => setCustomizeData({ 
                      ...customizeData, 
                      profileData: { ...customizeData.profileData, showBio: checked }
                    })}
                  />
                </div>
                
                <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  <span className="text-white text-sm">Show Social Links</span>
                  <Switch
                    checked={customizeData.profileData?.showSocialLinks ?? true}
                    onCheckedChange={(checked) => setCustomizeData({ 
                      ...customizeData, 
                      profileData: { ...customizeData.profileData, showSocialLinks: checked }
                    })}
                  />
                </div>
                
                <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  <span className="text-white text-sm">Show Reward Tiers</span>
                  <Switch
                    checked={customizeData.profileData?.showTiers ?? true}
                    onCheckedChange={(checked) => setCustomizeData({ 
                      ...customizeData, 
                      profileData: { ...customizeData.profileData, showTiers: checked }
                    })}
                  />
                </div>
                
                <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  <span className="text-white text-sm">Show Verification Badge</span>
                  <Switch
                    checked={customizeData.profileData?.showVerificationBadge ?? true}
                    onCheckedChange={(checked) => setCustomizeData({ 
                      ...customizeData, 
                      profileData: { ...customizeData.profileData, showVerificationBadge: checked }
                    })}
                  />
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <p className="text-white font-medium">Show Campaigns Tab</p>
              <p className="text-sm text-gray-400">Display active and upcoming campaigns</p>
            </div>
            <Switch
              checked={customizeData.showCampaigns}
              onCheckedChange={(checked) => setCustomizeData({ ...customizeData, showCampaigns: checked })}
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <p className="text-white font-medium">Show Tasks Tab</p>
              <p className="text-sm text-gray-400">Display available tasks for fans</p>
            </div>
            <Switch
              checked={customizeData.showTasks}
              onCheckedChange={(checked) => setCustomizeData({ ...customizeData, showTasks: checked })}
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <p className="text-white font-medium">Show Rewards Tab</p>
              <p className="text-sm text-gray-400">Display reward store and available rewards</p>
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
              <p className="text-sm text-gray-400">Display top fans leaderboard in sidebar</p>
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
              <p className="text-sm text-gray-400">Display community stats and engagement metrics</p>
            </div>
            <Switch
              checked={customizeData.showFanWidget}
              onCheckedChange={(checked) => setCustomizeData({ ...customizeData, showFanWidget: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Program Content (Campaigns & Tasks) */}
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Program Content
              </CardTitle>
              <p className="text-sm text-gray-400 mt-1">Campaigns and tasks associated with this program</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Campaigns Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-orange-400" />
                Campaigns ({campaigns.length})
              </h3>
              <Button
                onClick={() => window.location.href = '/creator-dashboard/campaigns'}
                size="sm"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Campaign
              </Button>
            </div>
            {campaigns.length === 0 ? (
              <div className="text-center py-8 bg-white/5 rounded-lg border border-white/10">
                <Megaphone className="h-10 w-10 mx-auto mb-3 text-gray-500" />
                <p className="text-gray-400 text-sm">No campaigns associated with this program yet</p>
                <p className="text-gray-500 text-xs mt-1">Create a campaign and assign it to this program</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {campaigns.map((campaign: any) => (
                  <Card key={campaign.id} className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h4 className="text-white font-semibold text-sm">{campaign.name}</h4>
                          <p className="text-gray-400 text-xs mt-1 line-clamp-2">{campaign.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge 
                              className={`text-xs ${
                                campaign.status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                campaign.status === 'draft' ? 'bg-gray-500/20 text-gray-400 border-gray-500/30' :
                                'bg-blue-500/20 text-blue-400 border-blue-500/30'
                              }`}
                            >
                              {campaign.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <Separator className="bg-white/10" />

          {/* Tasks Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-indigo-400" />
                Tasks ({tasks.length})
              </h3>
              <Button
                onClick={() => window.location.href = '/creator-dashboard/tasks/create'}
                size="sm"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Task
              </Button>
            </div>
            {tasks.length === 0 ? (
              <div className="text-center py-8 bg-white/5 rounded-lg border border-white/10">
                <CheckSquare className="h-10 w-10 mx-auto mb-3 text-gray-500" />
                <p className="text-gray-400 text-sm">No tasks associated with this program yet</p>
                <p className="text-gray-500 text-xs mt-1">Create a task and assign it to this program</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {tasks.map((task: any) => (
                  <Card key={task.id} className="bg-white/5 border-white/10">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-medium text-sm truncate">{task.name}</h4>
                          <p className="text-gray-400 text-xs mt-1 line-clamp-1">{task.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className="bg-brand-primary/20 text-brand-primary border-brand-primary/30 text-xs">
                              +{task.pointsToReward} pts
                            </Badge>
                            {task.isActive && (
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                                Active
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Announcements Section */}
      <AnnouncementsManager programId={program.id} />

      {/* Preview Modal */}
      {showPreview && (
        <PreviewModal
          program={program}
          customizeData={customizeData}
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
        />
      )}

      {/* Publish Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent className="bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Publish Program</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label className="text-white">Public URL Slug</Label>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-gray-400 text-sm">/programs/</span>
                <Input
                  value={publishSlug}
                  onChange={(e) => setPublishSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="my-loyalty-program"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                This will be your program's public URL
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowPublishDialog(false)}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onPublish(publishSlug);
                  setShowPublishDialog(false);
                }}
                className="bg-brand-primary hover:bg-brand-primary/80"
                disabled={!publishSlug}
              >
                <Rocket className="h-4 w-4 mr-2" />
                Publish Now
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PreviewModal({ 
  program, 
  customizeData,
  isOpen, 
  onClose 
}: { 
  program: ProgramWithDetails;
  customizeData: any;
  isOpen: boolean;
  onClose: () => void;
}) {
  // For published programs, use the public slug URL (no auth needed)
  // For draft programs, we'll need to implement a proper preview mechanism
  const previewUrl = program.status === 'published' && program.slug
    ? `/programs/${program.slug}`
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[95vh] bg-slate-900 border-white/10 p-0 flex flex-col">
        <DialogHeader className="p-4 border-b border-white/10 flex-shrink-0">
          <DialogTitle className="text-white flex items-center justify-between">
            <span>Preview: {customizeData.displayName}</span>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
              {program.status === 'published' ? 'Live Preview' : 'Draft Preview'}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          {previewUrl ? (
            <iframe
              key={previewUrl}
              src={previewUrl}
              className="w-full h-full bg-white"
              title="Program Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-brand-dark-bg">
              <div className="text-center text-gray-400">
                <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                <p className="text-lg mb-2">Preview Unavailable</p>
                <p className="text-sm">Please publish your program to see the preview</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateProgramModal({ 
  isOpen, 
  onClose, 
  onSubmit,
  isSubmitting 
}: { 
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    pointsName: 'Points'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">Create New Program</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div>
            <Label className="text-white">Program Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="bg-white/5 border-white/10 text-white mt-1"
              placeholder="My Loyalty Program"
              required
            />
          </div>
          <div>
            <Label className="text-white">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-white/5 border-white/10 text-white mt-1"
              placeholder="Tell your fans what this program is about..."
              rows={3}
            />
          </div>
          <div>
            <Label className="text-white">Points Name</Label>
            <Input
              value={formData.pointsName}
              onChange={(e) => setFormData({ ...formData, pointsName: e.target.value })}
              className="bg-white/5 border-white/10 text-white mt-1"
              placeholder="Points, Stars, Coins, etc."
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-white/20 text-white hover:bg-white/10"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-brand-primary hover:bg-brand-primary/80"
              disabled={isSubmitting || !formData.name}
            >
              {isSubmitting ? 'Creating...' : 'Create Program'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Announcements Manager Component
function AnnouncementsManager({ programId }: { programId: string }) {
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<any>(null);

  // Fetch announcements
  const { data: announcements = [], refetch } = useQuery<any[]>({
    queryKey: [`/api/programs/${programId}/announcements`],
    enabled: !!programId,
  });

  // Create/Update announcement mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingAnnouncement) {
        return fetchApi(`/api/announcements/${editingAnnouncement.id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
      } else {
        return fetchApi(`/api/programs/${programId}/announcements`, {
          method: "POST",
          body: JSON.stringify(data),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/programs/${programId}/announcements`] });
      setIsComposerOpen(false);
      setEditingAnnouncement(null);
      refetch();
    },
  });

  // Delete announcement mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return fetchApi(`/api/announcements/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/programs/${programId}/announcements`] });
      refetch();
    },
  });

  // Pin/Unpin announcement mutation
  const togglePinMutation = useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      return fetchApi(`/api/announcements/${id}`, {
        method: "PUT",
        body: JSON.stringify({ isPinned: !isPinned }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/programs/${programId}/announcements`] });
      refetch();
    },
  });

  const handleEdit = (announcement: any) => {
    setEditingAnnouncement(announcement);
    setIsComposerOpen(true);
  };

  const handleCloseComposer = () => {
    setIsComposerOpen(false);
    setEditingAnnouncement(null);
  };

  return (
    <Card className="bg-white/5 backdrop-blur-lg border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Announcements & Updates
            </CardTitle>
            <p className="text-sm text-gray-400 mt-1">Share news, updates, and achievements with your fans</p>
          </div>
          <Button
            onClick={() => setIsComposerOpen(true)}
            className="bg-brand-primary hover:bg-brand-primary/80"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Announcement
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {announcements.length === 0 ? (
          <div className="text-center py-12">
            <Megaphone className="h-12 w-12 mx-auto mb-4 text-gray-500" />
            <p className="text-gray-400 mb-2">No announcements yet</p>
            <p className="text-sm text-gray-500 mb-4">Share updates with your fans to keep them engaged!</p>
            <Button
              onClick={() => setIsComposerOpen(true)}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              Create Your First Announcement
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((announcement) => (
              <Card key={announcement.id} className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-white font-semibold">{announcement.title}</h4>
                        {announcement.isPinned && (
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                            <Pin className="h-3 w-3 mr-1" />
                            Pinned
                          </Badge>
                        )}
                        <Badge 
                          variant="outline" 
                          className="border-white/20 text-gray-400 text-xs"
                        >
                          {announcement.type}
                        </Badge>
                      </div>
                      <p className="text-gray-400 text-sm mb-3">{announcement.content}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(announcement.createdAt).toLocaleDateString()} at {new Date(announcement.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/10 text-white hover:bg-white/10"
                        onClick={() => togglePinMutation.mutate({ id: announcement.id, isPinned: announcement.isPinned })}
                      >
                        <Pin className={`h-4 w-4 ${announcement.isPinned ? 'fill-current' : ''}`} />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/10 text-white hover:bg-white/10"
                        onClick={() => handleEdit(announcement)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500/20 text-red-400 hover:bg-red-500/10"
                        onClick={() => deleteMutation.mutate(announcement.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>

      {/* Announcement Composer Modal */}
      <AnnouncementComposer
        isOpen={isComposerOpen}
        onClose={handleCloseComposer}
        onSubmit={(data) => saveMutation.mutate(data)}
        isSubmitting={saveMutation.isPending}
        initialData={editingAnnouncement}
      />
    </Card>
  );
}

// Announcement Composer Component
function AnnouncementComposer({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  initialData
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
  initialData?: any;
}) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'update' as 'update' | 'new_campaign' | 'new_task' | 'achievement',
    isPinned: false,
    isPublished: true,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        content: initialData.content || '',
        type: initialData.type || 'update',
        isPinned: initialData.isPinned || false,
        isPublished: initialData.isPublished ?? true,
      });
    } else {
      setFormData({
        title: '',
        content: '',
        type: 'update',
        isPinned: false,
        isPublished: true,
      });
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-white/10 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">
            {initialData ? 'Edit Announcement' : 'Create Announcement'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div>
            <Label className="text-white">Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="bg-white/5 border-white/10 text-white mt-1"
              placeholder="Exciting news!"
              required
            />
          </div>
          <div>
            <Label className="text-white">Content *</Label>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="bg-white/5 border-white/10 text-white mt-1"
              placeholder="Share your update with fans..."
              rows={5}
              required
            />
          </div>
          <div>
            <Label className="text-white">Type</Label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 text-white rounded-md"
            >
              <option value="update">General Update</option>
              <option value="new_campaign">New Campaign Launch</option>
              <option value="new_task">New Task Available</option>
              <option value="achievement">Achievement/Milestone</option>
            </select>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isPinned}
                onCheckedChange={(checked) => setFormData({ ...formData, isPinned: checked })}
              />
              <Label className="text-white">Pin to top</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isPublished}
                onCheckedChange={(checked) => setFormData({ ...formData, isPublished: checked })}
              />
              <Label className="text-white">Publish immediately</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-white/20 text-white hover:bg-white/10"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-brand-primary hover:bg-brand-primary/80"
              disabled={isSubmitting || !formData.title || !formData.content}
            >
              <Send className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Saving...' : initialData ? 'Update' : 'Publish'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

