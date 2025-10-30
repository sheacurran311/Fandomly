import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { formatDistanceToNow } from "date-fns";
import type { Reward } from "@shared/schema";

export default function PhysicalRewardsApproval() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  // Fetch all physical rewards
  const { data: rewards = [], isLoading } = useQuery({
    queryKey: ['/api/admin/physical-rewards'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/physical-rewards');
      return response.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ rewardId, notes }: { rewardId: string; notes?: string }) => {
      const response = await apiRequest('PUT', `/api/admin/physical-rewards/${rewardId}/approve`, {
        adminNotes: notes,
        approvedAt: new Date().toISOString(),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/physical-rewards'] });
      toast({
        title: "Reward Approved",
        description: "The physical reward has been approved and is now live.",
      });
      setReviewModalOpen(false);
      setSelectedReward(null);
      setAdminNotes('');
    },
    onError: (error) => {
      toast({
        title: "Approval Failed",
        description: error instanceof Error ? error.message : "Failed to approve reward",
        variant: "destructive",
      });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ rewardId, notes }: { rewardId: string; notes: string }) => {
      const response = await apiRequest('PUT', `/api/admin/physical-rewards/${rewardId}/reject`, {
        adminNotes: notes,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/physical-rewards'] });
      toast({
        title: "Reward Rejected",
        description: "The creator has been notified of the rejection.",
      });
      setReviewModalOpen(false);
      setSelectedReward(null);
      setAdminNotes('');
    },
    onError: (error) => {
      toast({
        title: "Rejection Failed",
        description: error instanceof Error ? error.message : "Failed to reject reward",
        variant: "destructive",
      });
    }
  });

  const handleReview = (reward: Reward) => {
    setSelectedReward(reward);
    setAdminNotes(reward.rewardData?.physicalData?.adminNotes || '');
    setReviewModalOpen(true);
  };

  const handleApprove = () => {
    if (!selectedReward) return;
    approveMutation.mutate({ rewardId: selectedReward.id, notes: adminNotes || undefined });
  };

  const handleReject = () => {
    if (!selectedReward) return;
    if (!adminNotes.trim()) {
      toast({
        title: "Notes Required",
        description: "Please provide a reason for rejection.",
        variant: "destructive",
      });
      return;
    }
    rejectMutation.mutate({ rewardId: selectedReward.id, notes: adminNotes });
  };

  const pendingRewards = rewards.filter((r: Reward) => 
    r.rewardType === 'physical' && r.rewardData?.physicalData?.approvalStatus === 'pending'
  );
  const approvedRewards = rewards.filter((r: Reward) => 
    r.rewardType === 'physical' && r.rewardData?.physicalData?.approvalStatus === 'approved'
  );
  const rejectedRewards = rewards.filter((r: Reward) => 
    r.rewardType === 'physical' && r.rewardData?.physicalData?.approvalStatus === 'rejected'
  );

  return (
    <DashboardLayout userType="creator">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Package className="h-8 w-8 text-blue-500" />
            Physical Rewards Approval
          </h1>
          <p className="text-gray-400">
            Review and approve physical reward submissions from creators
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Pending Review</p>
                  <p className="text-3xl font-bold text-white">{pendingRewards.length}</p>
                </div>
                <Clock className="h-10 w-10 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Approved</p>
                  <p className="text-3xl font-bold text-white">{approvedRewards.length}</p>
                </div>
                <CheckCircle2 className="h-10 w-10 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Rejected</p>
                  <p className="text-3xl font-bold text-white">{rejectedRewards.length}</p>
                </div>
                <XCircle className="h-10 w-10 text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total</p>
                  <p className="text-3xl font-bold text-white">{rewards.length}</p>
                </div>
                <Package className="h-10 w-10 text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="bg-white/5">
            <TabsTrigger value="pending">
              Pending ({pendingRewards.length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approved ({approvedRewards.length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected ({rejectedRewards.length})
            </TabsTrigger>
          </TabsList>

          {/* Pending Tab */}
          <TabsContent value="pending" className="space-y-4">
            {isLoading ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading submissions...</p>
                </CardContent>
              </Card>
            ) : pendingRewards.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-8 text-center">
                  <Package className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Pending Reviews</h3>
                  <p className="text-gray-400">
                    There are no physical rewards pending review at the moment.
                  </p>
                </CardContent>
              </Card>
            ) : (
              pendingRewards.map((reward: Reward) => (
                <RewardReviewCard 
                  key={reward.id} 
                  reward={reward} 
                  onReview={() => handleReview(reward)}
                />
              ))
            )}
          </TabsContent>

          {/* Approved Tab */}
          <TabsContent value="approved" className="space-y-4">
            {approvedRewards.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-8 text-center">
                  <CheckCircle2 className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No approved rewards yet.</p>
                </CardContent>
              </Card>
            ) : (
              approvedRewards.map((reward: Reward) => (
                <RewardReviewCard 
                  key={reward.id} 
                  reward={reward}
                  onReview={() => handleReview(reward)}
                  isApproved
                />
              ))
            )}
          </TabsContent>

          {/* Rejected Tab */}
          <TabsContent value="rejected" className="space-y-4">
            {rejectedRewards.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-8 text-center">
                  <XCircle className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No rejected rewards.</p>
                </CardContent>
              </Card>
            ) : (
              rejectedRewards.map((reward: Reward) => (
                <RewardReviewCard 
                  key={reward.id} 
                  reward={reward}
                  onReview={() => handleReview(reward)}
                  isRejected
                />
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Review Modal */}
        <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
          <DialogContent className="max-w-3xl bg-brand-dark-bg border-white/10 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Review Physical Reward</DialogTitle>
            </DialogHeader>

            {selectedReward && (
              <div className="space-y-6">
                {/* Reward Details */}
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <p className="text-xs text-gray-400">Reward Name</p>
                      <p className="text-white font-semibold">{selectedReward.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Description</p>
                      <p className="text-white">{selectedReward.description}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-400">Condition</p>
                        <p className="text-white capitalize">{selectedReward.rewardData?.physicalData?.condition}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Quantity</p>
                        <p className="text-white">{selectedReward.rewardData?.physicalData?.quantity}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Points Cost</p>
                        <p className="text-white">{selectedReward.pointsCost} pts</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Admin Notes */}
                <div className="space-y-2">
                  <Label className="text-white">Admin Notes</Label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add notes about this reward (required for rejection, optional for approval)..."
                    className="bg-white/10 border-white/20 text-white"
                    rows={4}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setReviewModalOpen(false);
                      setSelectedReward(null);
                      setAdminNotes('');
                    }}
                    className="flex-1 border-white/20 text-white"
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleReject}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {rejectMutation.isPending ? "Rejecting..." : "Reject"}
                  </Button>
                  <Button
                    onClick={handleApprove}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {approveMutation.isPending ? "Approving..." : "Approve"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

// Reward Review Card Component
function RewardReviewCard({ 
  reward, 
  onReview, 
  isApproved = false, 
  isRejected = false 
}: { 
  reward: Reward; 
  onReview: () => void;
  isApproved?: boolean;
  isRejected?: boolean;
}) {
  const physicalData = reward.rewardData?.physicalData;
  
  return (
    <Card className="bg-white/5 border-white/10 hover:border-blue-500/30 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                isApproved ? 'bg-green-500/20' : isRejected ? 'bg-red-500/20' : 'bg-yellow-500/20'
              }`}>
                {isApproved ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : isRejected ? (
                  <XCircle className="h-6 w-6 text-red-500" />
                ) : (
                  <Clock className="h-6 w-6 text-yellow-500" />
                )}
              </div>
              <div>
                <h3 className="text-white font-semibold">{reward.name}</h3>
                <p className="text-sm text-gray-400">{reward.pointsCost} points</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-white text-sm">{reward.description}</p>
              
              <div className="grid grid-cols-3 gap-4 p-3 bg-white/5 rounded text-sm">
                <div>
                  <p className="text-xs text-gray-400">Condition</p>
                  <p className="text-white capitalize">{physicalData?.condition}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Quantity</p>
                  <p className="text-white">{physicalData?.quantity}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Submitted</p>
                  <p className="text-white">
                    {physicalData?.submittedAt 
                      ? formatDistanceToNow(new Date(physicalData.submittedAt), { addSuffix: true })
                      : formatDistanceToNow(new Date(reward.createdAt), { addSuffix: true })
                    }
                  </p>
                </div>
              </div>

              {physicalData?.adminNotes && (
                <div className="p-3 bg-brand-dark-bg rounded border border-white/10">
                  <p className="text-xs text-gray-400 mb-1">Admin Notes:</p>
                  <p className="text-white text-sm">{physicalData.adminNotes}</p>
                </div>
              )}
            </div>
          </div>

          <Button
            onClick={onReview}
            variant={isApproved || isRejected ? "outline" : "default"}
            className={
              isApproved || isRejected
                ? "border-white/20 text-white"
                : "bg-brand-primary hover:bg-brand-primary/80"
            }
          >
            {isApproved || isRejected ? "View Details" : "Review"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

