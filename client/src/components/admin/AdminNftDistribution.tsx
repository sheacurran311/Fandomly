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
import { Plus, Send, Users, Filter, Download, AlertCircle, Image as ImageIcon, Sparkles } from "lucide-react";

interface AdminNftDistributionProps {
  type: 'platform' | 'distribution';
}

export default function AdminNftDistribution({ type }: AdminNftDistributionProps) {
  const { toast } = useToast();
  const [distributionModalOpen, setDistributionModalOpen] = useState(false);
  const [distributionData, setDistributionData] = useState({
    templateId: '',
    targetAudience: 'all_fans',
    criteria: '',
    userIds: ''
  });

  if (type === 'platform') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Platform NFTs</h2>
            <p className="text-gray-400 mt-1">Issue NFTs for platform milestones and achievements</p>
          </div>
          <Button className="bg-brand-primary hover:bg-brand-primary/80">
            <Plus className="h-4 w-4 mr-2" />
            Create Platform NFT
          </Button>
        </div>

        <Alert className="bg-purple-500/10 border-purple-500/20">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <AlertDescription className="text-purple-400 text-sm">
            <strong>Platform NFTs</strong> are special commemorative tokens issued by Fandomly for user achievements like "Profile 100% Complete", "First 1000 Users", or special platform events.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="bg-white/5 border-white/10 hover:border-brand-primary/30 transition-all">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <div>
                  <CardTitle className="text-white text-lg">Profile Master</CardTitle>
                  <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/30 mt-1">
                    Active
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 text-sm mb-3">
                Awarded to users who complete their profile 100%
              </p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">1,234 issued</span>
                <Button variant="ghost" size="sm" className="text-brand-primary">
                  <Send className="h-3 w-3 mr-1" />
                  Distribute
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 hover:border-brand-primary/30 transition-all">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <div>
                  <CardTitle className="text-white text-lg">OG Fan</CardTitle>
                  <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/30 mt-1">
                    Active
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 text-sm mb-3">
                Exclusive NFT for the first 1,000 Fandomly users
              </p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">1,000 issued</span>
                <Button variant="ghost" size="sm" className="text-gray-400" disabled>
                  <Send className="h-3 w-3 mr-1" />
                  Completed
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-dashed border-2 border-white/10 hover:border-brand-primary/30 transition-all cursor-pointer">
            <CardContent className="p-12 text-center">
              <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Create a new platform NFT</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Distribution view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">NFT Distribution</h2>
          <p className="text-gray-400 mt-1">Batch distribute NFTs to users based on criteria</p>
        </div>
        <Dialog open={distributionModalOpen} onOpenChange={setDistributionModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-brand-primary hover:bg-brand-primary/80">
              <Send className="h-4 w-4 mr-2" />
              New Distribution
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl bg-brand-dark-bg border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">Batch NFT Distribution</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <Alert className="bg-yellow-500/10 border-yellow-500/20">
                <AlertCircle className="h-4 w-4 text-yellow-400" />
                <AlertDescription className="text-yellow-400 text-sm">
                  This will mint and distribute NFTs to multiple users at once. Gas fees will be paid from the Fandomly gas wallet.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label className="text-white">NFT Template / Badge</Label>
                <Select value={distributionData.templateId} onValueChange={(value) => setDistributionData({ ...distributionData, templateId: value })}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Select template..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="profile-master">Profile Master Badge</SelectItem>
                    <SelectItem value="og-fan">OG Fan NFT</SelectItem>
                    <SelectItem value="creator-verified">Verified Creator Badge</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Target Audience</Label>
                <Select value={distributionData.targetAudience} onValueChange={(value) => setDistributionData({ ...distributionData, targetAudience: value })}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_fans">All Fans</SelectItem>
                    <SelectItem value="all_creators">All Creators</SelectItem>
                    <SelectItem value="verified_creators">Verified Creators Only</SelectItem>
                    <SelectItem value="custom">Custom List (IDs)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {distributionData.targetAudience === 'custom' && (
                <div className="space-y-2">
                  <Label className="text-white">User IDs (one per line)</Label>
                  <Textarea
                    value={distributionData.userIds}
                    onChange={(e) => setDistributionData({ ...distributionData, userIds: e.target.value })}
                    placeholder="user-id-1&#10;user-id-2&#10;user-id-3"
                    className="bg-white/10 border-white/20 text-white font-mono text-sm"
                    rows={6}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-white">Eligibility Criteria (optional)</Label>
                <Textarea
                  value={distributionData.criteria}
                  onChange={(e) => setDistributionData({ ...distributionData, criteria: e.target.value })}
                  placeholder="E.g., Users who joined before Jan 1, 2025 with profile completion > 80%"
                  className="bg-white/10 border-white/20 text-white"
                  rows={3}
                />
              </div>

              <div className="flex justify-between items-center p-4 bg-white/5 rounded-lg border border-white/10">
                <div>
                  <p className="text-white font-medium">Estimated Recipients</p>
                  <p className="text-gray-400 text-sm">Based on current criteria</p>
                </div>
                <div className="text-2xl font-bold text-brand-primary">
                  {distributionData.targetAudience === 'custom' 
                    ? distributionData.userIds.split('\n').filter(id => id.trim()).length 
                    : '~2,456'}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setDistributionModalOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  disabled={!distributionData.templateId}
                  className="bg-brand-primary hover:bg-brand-primary/80"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Start Distribution
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Distribution History */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Recent Distributions</h3>
        
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="text-white font-medium">Profile Master Badge</h4>
                  <p className="text-gray-400 text-sm">Distributed to 1,234 users • Jan 15, 2025</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  Completed
                </Badge>
                <Button variant="ghost" size="sm" className="text-gray-400">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="text-white font-medium">OG Fan NFT</h4>
                  <p className="text-gray-400 text-sm">Distributed to 1,000 users • Jan 1, 2025</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  Completed
                </Badge>
                <Button variant="ghost" size="sm" className="text-gray-400">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

