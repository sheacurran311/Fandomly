/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Fan Staking Page — Stake creator tokens, earn FAN rewards.
 *
 * Route: /staking (fan, requires wallet)
 * - Reputation gate: 500+ required
 * - Approve + stake two-step flow
 * - Unstake with early withdrawal penalty warning
 * - Claim FAN rewards
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Coins,
  Shield,
  Lock,
  TrendingUp,
  AlertTriangle,
  Loader2,
  Gift,
  Zap,
  ArrowRight,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { useAuth } from '@/contexts/auth-context';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAccount } from '@particle-network/connectkit';
import {
  useStakeInfo,
  usePendingRewards,
  useTokenBalance,
  useTokenMetadata,
  useUserMultiplier,
  useFanBalance,
  useStakeToken,
  useUnstakeToken,
  useClaimRewards,
} from '@/hooks/use-blockchain';
import { REPUTATION_THRESHOLDS } from '@shared/blockchain-config';
import { Link } from 'wouter';

// ============================================================================
// TYPES
// ============================================================================

interface ReputationData {
  score: number;
  thresholds: { fanStaking: boolean; creatorToken: boolean };
}

interface CreatorToken {
  tokenAddress: string;
  name: string;
  symbol: string;
  creatorUsername: string;
  creatorAddress: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MIN_STAKE_DURATION_DAYS = 7;
const EARLY_PENALTY_PERCENT = 5;
const BASE_APY_PERCENT = 5;

// ============================================================================
// COMPONENTS
// ============================================================================

function StakingOverview({
  walletAddress,
  multiplier,
  fanBalance,
}: {
  walletAddress: string;
  multiplier: number;
  fanBalance: string;
}) {
  const multiplierLabel = `${(multiplier / 100).toFixed(1)}x`;
  const effectiveAPY = ((BASE_APY_PERCENT * multiplier) / 100).toFixed(1);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-xs text-gray-500">Effective APY</span>
          </div>
          <p className="text-xl font-bold text-green-400">{effectiveAPY}%</p>
          <p className="text-xs text-gray-500">
            {BASE_APY_PERCENT}% base x {multiplierLabel}
          </p>
        </CardContent>
      </Card>
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-gray-500">Social Multiplier</span>
          </div>
          <p className="text-xl font-bold text-purple-400">{multiplierLabel}</p>
          <p className="text-xs text-gray-500">Connect socials for more</p>
        </CardContent>
      </Card>
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-gray-500">FAN Balance</span>
          </div>
          <p className="text-xl font-bold text-white">{Number(fanBalance).toFixed(2)}</p>
          <p className="text-xs text-gray-500">Native token</p>
        </CardContent>
      </Card>
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-gray-500">Wallet</span>
          </div>
          <p className="text-sm font-mono text-white truncate">
            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </p>
          <p className="text-xs text-gray-500">Fandomly Chain</p>
        </CardContent>
      </Card>
    </div>
  );
}

function StakeTokenCard({ token, walletAddress }: { token: CreatorToken; walletAddress: string }) {
  const { toast } = useToast();
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');

  const { data: balance } = useTokenBalance(token.tokenAddress, walletAddress);
  const { data: stakeInfo, dataUpdatedAt } = useStakeInfo(walletAddress, token.tokenAddress);
  const { data: pendingRewards } = usePendingRewards(walletAddress, token.tokenAddress);
  const { data: metadata } = useTokenMetadata(token.tokenAddress);

  const stakeToken = useStakeToken();
  const unstakeToken = useUnstakeToken();
  const claimRewards = useClaimRewards();

  const stakedAmount = stakeInfo?.amount ? Number(stakeInfo.amount) : 0;
  const availableBalance = balance ? Number(balance) : 0;
  const rewards = pendingRewards ? Number(pendingRewards) : 0;
  const stakedAt = stakeInfo?.stakedAt ?? 0;
  const fetchedAtSeconds = Math.floor(dataUpdatedAt / 1000);
  const daysSinceStake =
    stakedAt > 0 && fetchedAtSeconds > 0 ? (fetchedAtSeconds - stakedAt) / 86400 : 0;
  const isEarlyWithdrawal = daysSinceStake < MIN_STAKE_DURATION_DAYS && stakedAmount > 0;

  const handleStake = () => {
    if (!stakeAmount || Number(stakeAmount) <= 0) return;
    stakeToken.mutate(
      { tokenAddress: token.tokenAddress, amount: stakeAmount },
      {
        onSuccess: () => {
          toast({
            title: 'Staked!',
            description: `${stakeAmount} ${token.symbol} staked successfully.`,
          });
          setStakeAmount('');
        },
        onError: (error: Error) => {
          toast({ title: 'Stake failed', description: error.message, variant: 'destructive' });
        },
      }
    );
  };

  const handleUnstake = () => {
    if (!unstakeAmount || Number(unstakeAmount) <= 0) return;
    unstakeToken.mutate(
      { tokenAddress: token.tokenAddress, amount: unstakeAmount },
      {
        onSuccess: () => {
          toast({
            title: 'Unstaked!',
            description: `${unstakeAmount} ${token.symbol} returned to wallet.`,
          });
          setUnstakeAmount('');
        },
        onError: (error: Error) => {
          toast({ title: 'Unstake failed', description: error.message, variant: 'destructive' });
        },
      }
    );
  };

  const handleClaim = () => {
    claimRewards.mutate(
      { tokenAddress: token.tokenAddress },
      {
        onSuccess: () => {
          toast({
            title: 'Rewards claimed!',
            description: `${rewards.toFixed(4)} FAN sent to your wallet.`,
          });
        },
        onError: (error: Error) => {
          toast({ title: 'Claim failed', description: error.message, variant: 'destructive' });
        },
      }
    );
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Coins className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-white text-base">{metadata?.name || token.name}</CardTitle>
              <p className="text-xs text-gray-500">
                {metadata?.symbol || token.symbol} &middot; by {token.creatorUsername}
              </p>
            </div>
          </div>
          {stakedAmount > 0 && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Staking</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Balances */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-xs text-gray-500">Available</p>
            <p className="text-sm font-semibold text-white">{availableBalance.toFixed(2)}</p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-xs text-gray-500">Staked</p>
            <p className="text-sm font-semibold text-emerald-400">{stakedAmount.toFixed(2)}</p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-xs text-gray-500">Rewards</p>
            <p className="text-sm font-semibold text-yellow-400">{rewards.toFixed(4)} FAN</p>
          </div>
        </div>

        {/* Early withdrawal warning */}
        {isEarlyWithdrawal && (
          <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-yellow-400 font-medium">Early Withdrawal</p>
              <p className="text-xs text-yellow-400/70">
                Staked {daysSinceStake.toFixed(1)} / {MIN_STAKE_DURATION_DAYS} days. Unstaking now
                incurs a {EARLY_PENALTY_PERCENT}% penalty.
              </p>
            </div>
          </div>
        )}

        {/* Stake Input */}
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Amount to stake"
            value={stakeAmount}
            onChange={(e) => setStakeAmount(e.target.value)}
            className="bg-white/5 border-white/10 text-white"
            min="0"
            max={String(availableBalance)}
          />
          <Button
            onClick={handleStake}
            disabled={
              stakeToken.isPending ||
              !stakeAmount ||
              Number(stakeAmount) <= 0 ||
              Number(stakeAmount) > availableBalance
            }
            className="bg-purple-600 hover:bg-purple-700 text-white shrink-0"
          >
            {stakeToken.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Stake'}
          </Button>
        </div>

        {/* Unstake Input */}
        {stakedAmount > 0 && (
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Amount to unstake"
              value={unstakeAmount}
              onChange={(e) => setUnstakeAmount(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
              min="0"
              max={String(stakedAmount)}
            />
            <Button
              onClick={handleUnstake}
              disabled={
                unstakeToken.isPending ||
                !unstakeAmount ||
                Number(unstakeAmount) <= 0 ||
                Number(unstakeAmount) > stakedAmount
              }
              variant="outline"
              className="border-white/10 text-white hover:bg-white/5 shrink-0"
            >
              {unstakeToken.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Unstake'}
            </Button>
          </div>
        )}

        {/* Claim Rewards */}
        {rewards > 0 && (
          <Button
            onClick={handleClaim}
            disabled={claimRewards.isPending}
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            {claimRewards.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Gift className="w-4 h-4 mr-2" />
            )}
            Claim {rewards.toFixed(4)} FAN
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// PAGE
// ============================================================================

export default function StakingPage() {
  const { user } = useAuth();
  const { address } = useAccount();
  const userType = (user?.userType as 'fan' | 'creator') || 'fan';
  const walletAddress = address || ((user as any)?.avalancheL1Address as string | undefined);

  const { data: reputation, isLoading: repLoading } = useQuery<ReputationData>({
    queryKey: ['/api/reputation/me'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/reputation/me');
      return res.json();
    },
    enabled: !!user,
  });

  const { data: tokensData, isLoading: tokensLoading } = useQuery<{
    tokens: CreatorToken[];
    totalCreated: number;
  }>({
    queryKey: ['/api/blockchain/tokens'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/blockchain/tokens');
      return res.json();
    },
    enabled: !!user,
  });

  const { data: multiplier } = useUserMultiplier(walletAddress || undefined);
  const { data: fanBalance } = useFanBalance(walletAddress || undefined);

  const meetsThreshold = (reputation?.score ?? 0) >= REPUTATION_THRESHOLDS.FAN_STAKING;
  const isLoading = repLoading || tokensLoading;

  return (
    <DashboardLayout userType={userType}>
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <Coins className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Staking</h1>
            <p className="text-sm text-gray-400">Stake creator tokens and earn FAN rewards</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 bg-white/5" />
              ))}
            </div>
            <Skeleton className="h-64 bg-white/5" />
          </div>
        ) : !walletAddress ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-8 text-center">
              <Shield className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Wallet Required</h3>
              <p className="text-sm text-gray-400">
                Connect your wallet to start staking on Fandomly Chain.
              </p>
            </CardContent>
          </Card>
        ) : !meetsThreshold ? (
          /* Reputation Gate */
          <Card className="bg-white/5 border-yellow-500/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center shrink-0">
                  <Lock className="w-6 h-6 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">Reputation Required</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    You need a reputation score of {REPUTATION_THRESHOLDS.FAN_STAKING}+ to stake.
                    Your current score is {reputation?.score ?? 0}.
                  </p>
                  <div className="w-full bg-white/5 rounded-full h-3 mb-2">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-yellow-500 to-emerald-500 transition-all"
                      style={{
                        width: `${Math.min(((reputation?.score ?? 0) / REPUTATION_THRESHOLDS.FAN_STAKING) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {reputation?.score ?? 0} / {REPUTATION_THRESHOLDS.FAN_STAKING}
                    </span>
                    <Link
                      href="/reputation"
                      className="text-purple-400 hover:text-purple-300 flex items-center gap-1"
                    >
                      View Reputation <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Overview Stats */}
            <StakingOverview
              walletAddress={walletAddress}
              multiplier={multiplier ?? 100}
              fanBalance={fanBalance ?? '0'}
            />

            {/* Token Cards */}
            {tokensData?.tokens && tokensData.tokens.length > 0 ? (
              <div>
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
                  Creator Tokens ({tokensData.tokens.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tokensData.tokens.map((token) => (
                    <StakeTokenCard
                      key={token.tokenAddress}
                      token={token}
                      walletAddress={walletAddress}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-8 text-center">
                  <Coins className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-white mb-2">No Creator Tokens Yet</h3>
                  <p className="text-sm text-gray-400">
                    When creators launch their tokens, they will appear here for staking.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Multiplier Sync */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-purple-400" />
                  <div>
                    <p className="text-sm font-medium text-white">Social Multiplier</p>
                    <p className="text-xs text-gray-500">
                      Connect social accounts to boost your staking rewards
                    </p>
                  </div>
                </div>
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                  {((multiplier ?? 100) / 100).toFixed(1)}x
                </Badge>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
