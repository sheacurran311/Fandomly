import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Edit, Twitter, Facebook, Instagram, Youtube, Music, Zap, Settings } from "lucide-react";
import { SiTiktok, SiSpotify } from "react-icons/si";

interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  platform: string;
  taskType: string;
  defaultConfig: any;
  points: number;
  isActive: boolean;
  isGlobal: boolean;
  readOnly?: boolean;
}

const PLATFORM_ICONS = {
  twitter: Twitter,
  facebook: Facebook,
  instagram: Instagram,
  youtube: Youtube,
  tiktok: SiTiktok,
  spotify: SiSpotify
} as const;

const PLATFORM_COLORS = {
  twitter: "bg-blue-500",
  facebook: "bg-blue-600", 
  instagram: "bg-gradient-to-r from-purple-500 to-pink-500",
  youtube: "bg-red-600",
  tiktok: "bg-black",
  spotify: "bg-green-500"
} as const;

interface TaskTemplateManagementProps {
  onCreateTask?: (templateId: string) => void;
}

export function TaskTemplateManagement({ onCreateTask }: TaskTemplateManagementProps) {
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const { toast } = useToast();

  // Fetch task templates
  const { data: templates = [], isLoading } = useQuery<TaskTemplate[]>({
    queryKey: ["/api/task-templates"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/task-templates");
      return response.json();
    },
    staleTime: 5 * 60 * 1000
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const response = await apiRequest("PUT", `/api/task-templates/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-templates"] });
      toast({
        title: "Template Updated",
        description: "Task template has been updated successfully"
      });
      setEditModalOpen(false);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error", 
        description: "Failed to update template"
      });
    }
  });

  const handleEditTemplate = (template: TaskTemplate) => {
    if (template.readOnly) {
      toast({
        variant: "destructive",
        title: "Cannot Edit",
        description: "This is a core template that cannot be modified. Use it to create custom tasks."
      });
      return;
    }
    setEditingTemplate(template);
    setEditModalOpen(true);
  };

  const handleUseTemplate = (template: TaskTemplate) => {
    onCreateTask?.(template.id);
    toast({
      title: "Template Selected",
      description: `Using ${template.name} template to create a new task`
    });
  };

  const handleToggleTemplate = async (template: TaskTemplate) => {
    if (template.readOnly) {
      toast({
        variant: "destructive", 
        title: "Cannot Toggle",
        description: "Core templates are always available"
      });
      return;
    }

    updateTemplateMutation.mutate({
      id: template.id,
      updates: { isActive: !template.isActive }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-white/5 border-white/10 animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-white/20 rounded mb-4"></div>
              <div className="h-3 bg-white/10 rounded mb-2"></div>
              <div className="h-3 bg-white/10 rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Task Templates</h3>
          <p className="text-sm text-gray-400">
            Pre-built templates to quickly create social media tasks
          </p>
        </div>
        <Badge variant="secondary" className="text-[#101636]">
          {templates.length} templates
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {templates.map((template) => {
          const PlatformIcon = PLATFORM_ICONS[template.platform as keyof typeof PLATFORM_ICONS] || Settings;
          const platformColor = PLATFORM_COLORS[template.platform as keyof typeof PLATFORM_COLORS] || "bg-gray-500";
          
          return (
            <Card 
              key={template.id}
              className={`bg-white/5 border-white/10 transition-all hover:border-brand-primary/30 ${
                !template.isActive && !template.readOnly ? 'opacity-60' : ''
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 ${platformColor} rounded-lg`}>
                      <PlatformIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-white text-base">{template.name}</CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge 
                          variant={template.readOnly ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {template.readOnly ? "Core Template" : "Custom"}
                        </Badge>
                        <span className="text-xs text-gray-400 capitalize">
                          {template.platform} • {template.taskType.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditTemplate(template)}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                      data-testid={`button-edit-template-${template.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Switch
                      checked={template.readOnly || template.isActive}
                      onCheckedChange={() => handleToggleTemplate(template)}
                      disabled={template.readOnly}
                      className="data-[state=checked]:bg-brand-primary"
                      data-testid={`switch-template-${template.id}`}
                    />
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  <p className="text-gray-300 text-sm">{template.description}</p>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-1 text-emerald-400">
                      <Zap className="h-4 w-4" />
                      <span>{template.points || template.defaultConfig.points} points</span>
                    </div>
                    <div className="text-gray-400">
                      {template.defaultConfig.verification_method || 'manual'} verification
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/10">
                    <Button 
                      onClick={() => handleUseTemplate(template)}
                      size="sm"
                      className="w-full bg-brand-primary hover:bg-brand-primary/80"
                      data-testid={`button-use-template-${template.id}`}
                    >
                      Use This Template
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Template Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-2xl bg-brand-dark-bg border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Task Template</DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <TaskTemplateEditForm 
              template={editingTemplate}
              onSubmit={(updates) => {
                updateTemplateMutation.mutate({
                  id: editingTemplate.id,
                  updates
                });
              }}
              isLoading={updateTemplateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Edit Form Component
function TaskTemplateEditForm({ 
  template, 
  onSubmit, 
  isLoading 
}: { 
  template: TaskTemplate; 
  onSubmit: (updates: any) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    name: template.name,
    description: template.description,
    points: template.defaultConfig.points || template.points,
    verification_method: template.defaultConfig.verification_method || 'manual'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: formData.name,
      description: formData.description,
      defaultConfig: {
        ...template.defaultConfig,
        points: formData.points,
        verification_method: formData.verification_method
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label className="text-white">Template Name</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className="mt-2 bg-white/10 border-white/20 text-white"
          data-testid="input-template-name"
        />
      </div>

      <div>
        <Label className="text-white">Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          className="mt-2 bg-white/10 border-white/20 text-white"
          rows={3}
          data-testid="textarea-template-description"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-white">Points Reward</Label>
          <Input
            type="number"
            value={formData.points}
            onChange={(e) => setFormData(prev => ({ ...prev, points: parseInt(e.target.value) }))}
            className="mt-2 bg-white/10 border-white/20 text-white"
            data-testid="input-template-points"
          />
        </div>

        <div>
          <Label className="text-white">Verification Method</Label>
          <Select 
            value={formData.verification_method} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, verification_method: value }))}
          >
            <SelectTrigger className="mt-2 bg-white/10 border-white/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual Review</SelectItem>
              <SelectItem value="api">Automatic (API)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => setFormData({
            name: template.name,
            description: template.description,
            points: template.defaultConfig.points || template.points,
            verification_method: template.defaultConfig.verification_method || 'manual'
          })}
          data-testid="button-reset-template"
        >
          Reset
        </Button>
        <Button 
          type="submit"
          disabled={isLoading}
          className="bg-brand-primary hover:bg-brand-primary/80"
          data-testid="button-save-template"
        >
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}