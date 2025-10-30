import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Video, Clock, Sparkles, AlertCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Reward } from "@shared/schema";

interface VideoRedemptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  reward: Reward;
  userPoints: number;
}

export default function VideoRedemptionModal({ isOpen, onClose, reward, userPoints }: VideoRedemptionModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [personalizationMessage, setPersonalizationMessage] = useState('');
  
  const videoData = reward.rewardData?.videoData;
  const canAfford = userPoints >= reward.pointsCost;

  const redeemMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/rewards/redeem', {
        rewardId: reward.id,
        redemptionData: {
          personalizationMessage,
          requestedAt: new Date().toISOString(),
        }
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rewards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/fan-programs'] });
      toast({
        title: "Video Request Submitted!",
        description: `Your custom video request has been sent. Expected delivery: ${videoData?.turnaroundDays || 7} days`,
      });
      onClose();
      setPersonalizationMessage('');
    },
    onError: (error) => {
      toast({
        title: "Redemption Failed",
        description: error instanceof Error ? error.message : "Failed to redeem reward",
        variant: "destructive",
      });
    }
  });

  const handleRedeem = () => {
    if (!canAfford) {
      toast({
        title: "Insufficient Points",
        description: `You need ${reward.pointsCost - userPoints} more points to redeem this reward.`,
        variant: "destructive",
      });
      return;
    }

    if (videoData?.requiresPersonalization && !personalizationMessage.trim()) {
      toast({
        title: "Personalization Required",
        description: "Please provide your personalization message.",
        variant: "destructive",
      });
      return;
    }

    redeemMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-brand-dark-bg border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Video className="h-5 w-5 text-pink-500" />
            {reward.name}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {reward.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Sample Video Preview */}
          {videoData?.sampleVideoUrl && (
            <div className="space-y-2">
              <Label className="text-white">Sample Video</Label>
              <div className="bg-black rounded-lg overflow-hidden">
                <video
                  src={videoData.sampleVideoUrl}
                  controls
                  className="w-full max-h-64 object-contain"
                />
              </div>
              <p className="text-xs text-gray-400">
                This is a sample of the type of video you'll receive
              </p>
            </div>
          )}

          {/* Video Details */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-white/5 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-400">Max Duration</p>
                <p className="text-white font-medium">{videoData?.maxVideoDuration || 60} seconds</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-400">Turnaround Time</p>
                <p className="text-white font-medium">{videoData?.turnaroundDays || 7} days</p>
              </div>
            </div>
          </div>

          {/* Delivery Instructions */}
          {videoData?.deliveryInstructions && (
            <Alert className="bg-blue-500/10 border-blue-500/20">
              <AlertDescription className="text-gray-300 text-sm">
                <strong className="text-white">Delivery:</strong> {videoData.deliveryInstructions}
              </AlertDescription>
            </Alert>
          )}

          {/* Personalization Message */}
          {videoData?.requiresPersonalization && (
            <div className="space-y-2">
              <Label className="text-white">Your Personalization Message *</Label>
              <Textarea
                value={personalizationMessage}
                onChange={(e) => setPersonalizationMessage(e.target.value)}
                placeholder={videoData.personalizationInstructions || "Tell the creator what you'd like in your video (name, occasion, special message, etc.)"}
                className="bg-white/10 border-white/20 text-white"
                rows={4}
              />
              <p className="text-xs text-gray-400">
                {videoData.personalizationInstructions || "Provide details for your personalized video"}
              </p>
            </div>
          )}

          {/* Points Cost */}
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <div>
              <p className="text-sm text-gray-400">Cost</p>
              <p className="text-2xl font-bold text-white">{reward.pointsCost} points</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Your Balance</p>
              <p className={`text-2xl font-bold ${canAfford ? 'text-green-400' : 'text-red-400'}`}>
                {userPoints} points
              </p>
            </div>
          </div>

          {/* Insufficient Points Warning */}
          {!canAfford && (
            <Alert className="bg-red-500/10 border-red-500/20">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-400">
                You need {reward.pointsCost - userPoints} more points to redeem this reward.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-white/20 text-white"
              disabled={redeemMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRedeem}
              disabled={!canAfford || redeemMutation.isPending}
              className="flex-1 bg-brand-primary hover:bg-brand-primary/80"
            >
              {redeemMutation.isPending ? "Redeeming..." : `Redeem for ${reward.pointsCost} pts`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

