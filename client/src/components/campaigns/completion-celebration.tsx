import React from 'react';
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Trophy,
  PartyPopper,
  Coins,
  Image,
  Award,
  Ticket,
  Gift,
  Check,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export interface CompletionCelebrationProps {
  open: boolean;
  onClose: () => void;
  campaignName: string;
  bonusPoints: number;
  pendingRewards: Array<{
    type: 'nft' | 'badge' | 'raffle_entry' | 'reward' | 'points';
    rewardId?: string;
    metadata?: Record<string, unknown>;
    status: 'pending' | 'claimed' | 'failed';
  }>;
  onClaimRewards: () => Promise<void>;
  isClaimingRewards: boolean;
  claimedRewards?: Array<{
    type: string;
    metadata?: Record<string, unknown>;
    claimedAt: string;
    deliveryData?: Record<string, unknown>;
  }>;
}

const CompletionCelebration: React.FC<CompletionCelebrationProps> = ({
  open,
  onClose,
  campaignName,
  bonusPoints,
  pendingRewards,
  onClaimRewards,
  isClaimingRewards,
  claimedRewards,
}) => {
  const hasClaimedRewards = claimedRewards && claimedRewards.length > 0;

  const getRewardIcon = (type: string) => {
    switch (type) {
      case 'nft':
        return <Image className="w-6 h-6" />;
      case 'badge':
        return <Award className="w-6 h-6" />;
      case 'raffle_entry':
        return <Ticket className="w-6 h-6" />;
      case 'points':
        return <Coins className="w-6 h-6" />;
      default:
        return <Gift className="w-6 h-6" />;
    }
  };

  const getRewardBadgeText = (type: string) => {
    switch (type) {
      case 'nft':
        return 'NFT Reward';
      case 'badge':
        return 'Badge';
      case 'raffle_entry':
        return 'Raffle Entry';
      case 'points':
        return 'Points';
      default:
        return 'Reward';
    }
  };

  const getRewardName = (reward: CompletionCelebrationProps['pendingRewards'][0]) => {
    const metadata = reward.metadata as any;
    switch (reward.type) {
      case 'nft':
        return metadata?.name || 'NFT Reward';
      case 'badge':
        return metadata?.name || 'Achievement Badge';
      case 'raffle_entry':
        return metadata?.prizeName || metadata?.prizeDescription || 'Raffle Prize';
      case 'reward':
        return metadata?.name || 'Special Reward';
      default:
        return 'Reward';
    }
  };

  const getRewardDescription = (reward: CompletionCelebrationProps['pendingRewards'][0]) => {
    const metadata = reward.metadata as any;
    if (reward.type === 'raffle_entry') {
      const entries = metadata?.entries || 1;
      return `${entries} ${entries === 1 ? 'entry' : 'entries'}`;
    }
    return null;
  };

  const getClaimedRewardMessage = (
    reward: NonNullable<CompletionCelebrationProps['claimedRewards']>[0]
  ) => {
    const metadata = reward.metadata as any;
    const deliveryData = reward.deliveryData as any;

    switch (reward.type) {
      case 'nft':
        return {
          message: 'NFT minted to your wallet',
          txHash: deliveryData?.transactionHash || deliveryData?.txHash,
        };
      case 'badge':
        return {
          message: 'Badge awarded',
          txHash: deliveryData?.transactionHash || deliveryData?.txHash,
        };
      case 'raffle_entry':
        const entries = metadata?.entries || 1;
        return {
          message: `${entries} ${entries === 1 ? 'entry' : 'entries'} recorded`,
          txHash: null,
        };
      case 'points':
        const points = metadata?.amount || metadata?.points || 0;
        return {
          message: `${points} points awarded`,
          txHash: null,
        };
      default:
        return {
          message: 'Reward claimed',
          txHash: null,
        };
    }
  };

  const truncateTxHash = (hash: string) => {
    if (!hash) return '';
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-gradient-to-b from-[#1a1a3e] to-[#0F0F23] border-white/10 text-white">
        {!hasClaimedRewards ? (
          // State 1: Celebration + Claim
          <>
            <DialogHeader>
              <div className="flex flex-col items-center space-y-4 py-6">
                <div className="relative">
                  <Trophy className="w-20 h-20 text-amber-400" />
                  <PartyPopper className="w-8 h-8 text-amber-400 absolute -top-2 -right-2 animate-bounce" />
                </div>
                <DialogTitle className="text-4xl font-bold text-center bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent">
                  Campaign Complete!
                </DialogTitle>
                <p className="text-xl text-white/80 text-center">{campaignName}</p>
              </div>
            </DialogHeader>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4 text-white/90">Your Rewards</h3>
                <div className="space-y-3">
                  {bonusPoints > 0 && (
                    <Card className="bg-white/5 backdrop-blur border border-white/10 p-4">
                      <div className="flex items-center space-x-4">
                        <div className="bg-amber-500/20 p-3 rounded-lg">
                          <Coins className="w-6 h-6 text-amber-400" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-white">
                            {bonusPoints.toLocaleString()} Points
                          </div>
                          <div className="text-sm text-white/60">Bonus completion points</div>
                        </div>
                      </div>
                    </Card>
                  )}

                  {pendingRewards.map((reward, index) => (
                    <Card
                      key={index}
                      className="bg-white/5 backdrop-blur border border-white/10 p-4"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="bg-white/10 p-3 rounded-lg text-white/80">
                          {getRewardIcon(reward.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-semibold text-white">
                              {getRewardName(reward)}
                            </span>
                            <Badge
                              variant="secondary"
                              className="bg-white/10 text-white/80 border-white/20"
                            >
                              {getRewardBadgeText(reward.type)}
                            </Badge>
                          </div>
                          {getRewardDescription(reward) && (
                            <div className="text-sm text-white/60">
                              {getRewardDescription(reward)}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={onClaimRewards}
                  disabled={isClaimingRewards}
                  className="w-full bg-gradient-to-r from-brand-primary to-purple-600 hover:from-brand-primary/90 hover:to-purple-700 text-white font-semibold py-6 text-lg"
                >
                  {isClaimingRewards ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Claiming Rewards...
                    </>
                  ) : (
                    'Claim Rewards'
                  )}
                </Button>
                <p className="text-center text-sm text-white/50">
                  Complete all tasks to unlock these rewards
                </p>
              </div>
            </div>
          </>
        ) : (
          // State 2: Success
          <>
            <DialogHeader>
              <div className="flex flex-col items-center space-y-4 py-6">
                <div className="relative">
                  <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center animate-in zoom-in duration-500">
                    <Check className="w-12 h-12 text-green-400" />
                  </div>
                </div>
                <DialogTitle className="text-3xl font-bold text-center text-green-400">
                  Rewards Claimed!
                </DialogTitle>
              </div>
            </DialogHeader>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4 text-white/90">Claimed Rewards</h3>
                <div className="space-y-3">
                  {claimedRewards.map((reward, index) => {
                    const { message, txHash } = getClaimedRewardMessage(reward);
                    return (
                      <Card
                        key={index}
                        className="bg-white/5 backdrop-blur border border-white/10 p-4"
                      >
                        <div className="flex items-start space-x-4">
                          <div className="bg-green-500/20 p-3 rounded-lg flex-shrink-0">
                            {getRewardIcon(reward.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-white mb-1">{message}</div>
                            {txHash && (
                              <a
                                href={`https://etherscan.io/tx/${txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center space-x-1 text-sm text-brand-primary hover:text-brand-primary/80 transition-colors"
                              >
                                <span>{truncateTxHash(txHash)}</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            <Check className="w-5 h-5 text-green-400" />
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <Button
                onClick={onClose}
                className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-6 text-lg border border-white/20"
              >
                Done
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CompletionCelebration;
