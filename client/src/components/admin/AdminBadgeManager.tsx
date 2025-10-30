import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Award, Edit, Trash2, Eye, AlertCircle, CheckCircle2, Shield } from "lucide-react";

interface BadgeTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  chain: string;
  contractAddress: string | null;
  metadata: {
    image: string;
    criteria: string;
    requirements: string[];
  };
  isActive: boolean;
  totalIssued: number;
  createdAt: string;
}

export default function AdminBadgeManager() {
  const { toast } = useToast();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'achievement',
    chain: 'polygon',
    criteria: '',
    requirements: '',
    imageUrl: ''
  });

  // Fetch badge templates
  const { data: badgesData, isLoading, refetch } = useQuery({
    queryKey: ['/api/admin/badges/templates'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/badges/templates');
      return response.json();
    },
  });

  // Ensure badges is always an array
  const badges = Array.isArray(badgesData) ? badgesData : (badgesData?.badges || []);

  const handleCreateBadge = async () => {
    try {
      await apiRequest('POST', '/api/admin/badges/templates', {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        chain: formData.chain,
        metadata: {
          image: formData.imageUrl,
          criteria: formData.criteria,
          requirements: formData.requirements.split('\n').filter(r => r.trim())
        }
      });

      toast({
        title: "Badge Template Created",
        description: "The badge template has been created successfully.",
      });

      setCreateModalOpen(false);
      setFormData({
        name: '',
        description: '',
        category: 'achievement',
        chain: 'polygon',
        criteria: '',
        requirements: '',
        imageUrl: ''
      });
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create badge template.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Fandomly Badge Templates</h2>
          <p className="text-gray-400 mt-1">Create and manage platform-issued credential badges</p>
        </div>
        <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-brand-primary hover:bg-brand-primary/80">
              <Plus className="h-4 w-4 mr-2" />
              Create Badge Template
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl bg-brand-dark-bg border-white/10 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Shield className="h-5 w-5 text-brand-primary" />
                Create Badge Template
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <Alert className="bg-blue-500/10 border-blue-500/20">
                <AlertCircle className="h-4 w-4 text-blue-400" />
                <AlertDescription className="text-blue-400 text-sm">
                  These badges are verifiable credentials issued by Fandomly to creators. They follow the W3C VC standard and are stored on-chain.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label className="text-white">Badge Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Verified Creator, Top Performer, Community Leader"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Description *</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this badge represents..."
                  className="bg-white/10 border-white/20 text-white"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">Category *</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="achievement">Achievement</SelectItem>
                      <SelectItem value="verification">Verification</SelectItem>
                      <SelectItem value="milestone">Milestone</SelectItem>
                      <SelectItem value="special">Special</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Blockchain *</Label>
                  <Select value={formData.chain} onValueChange={(value) => setFormData({ ...formData, chain: value })}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="polygon">Polygon</SelectItem>
                      <SelectItem value="solana">Solana (cNFT)</SelectItem>
                      <SelectItem value="base">Base</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Badge Image URL *</Label>
                <Input
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://..."
                  className="bg-white/10 border-white/20 text-white"
                />
                {formData.imageUrl && (
                  <div className="mt-2 p-2 bg-white/5 rounded-lg border border-white/10">
                    <img src={formData.imageUrl} alt="Preview" className="w-20 h-20 rounded object-cover" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-white">Eligibility Criteria *</Label>
                <Textarea
                  value={formData.criteria}
                  onChange={(e) => setFormData({ ...formData, criteria: e.target.value })}
                  placeholder="Describe when and why this badge should be issued..."
                  className="bg-white/10 border-white/20 text-white"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Requirements (one per line)</Label>
                <Textarea
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  placeholder="E.g.:&#10;Complete profile 100%&#10;Verify email and phone&#10;Connect at least one social account"
                  className="bg-white/10 border-white/20 text-white font-mono text-sm"
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateBadge}
                  disabled={!formData.name || !formData.description || !formData.imageUrl}
                  className="bg-brand-primary hover:bg-brand-primary/80"
                >
                  Create Template
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Badge Templates Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-20 w-20 bg-gray-700 rounded-lg"></div>
                  <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-700 rounded w-full"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : badges.length === 0 ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-12 text-center">
            <Award className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Badge Templates Yet</h3>
            <p className="text-gray-400 mb-6">Create your first badge template to start issuing verifiable credentials to creators.</p>
            <Button onClick={() => setCreateModalOpen(true)} className="bg-brand-primary hover:bg-brand-primary/80">
              <Plus className="h-4 w-4 mr-2" />
              Create First Badge
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {badges.map((badge: BadgeTemplate) => (
            <Card key={badge.id} className="bg-white/5 border-white/10 hover:border-brand-primary/30 transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-4">
                  {badge.metadata?.image && (
                    <img 
                      src={badge.metadata.image} 
                      alt={badge.name}
                      className="w-16 h-16 rounded-lg object-cover border-2 border-brand-primary/50"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-white text-lg truncate">{badge.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="text-xs bg-purple-500/20 text-purple-400 border-purple-500/30">
                        {badge.category}
                      </Badge>
                      <Badge className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/30">
                        {badge.chain}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 text-sm mb-3 line-clamp-2">{badge.description}</p>
                
                {badge.metadata?.criteria && (
                  <div className="text-xs text-yellow-400 bg-yellow-500/10 p-2 rounded mb-2">
                    <strong>Criteria:</strong> {badge.metadata.criteria}
                  </div>
                )}

                <div className="flex items-center justify-between text-sm mt-3">
                  <div className="flex items-center gap-2">
                    {badge.isActive ? (
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-gray-400" />
                    )}
                    <span className="text-gray-400">
                      {badge.totalIssued || 0} issued
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white p-1">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white p-1">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

