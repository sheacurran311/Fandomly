/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Token Factory Page — Creator token launch and management.
 *
 * Route: /creator-dashboard/token (creator only)
 * State A: No token → reputation gate + launch form
 * State B: Token exists → token info + stats
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Coins,
  Sparkles,
  Copy,
  CheckCircle,
  Lock,
  Rocket,
  BarChart3,
  Users,
  ExternalLink,
  Loader2,
  Shield,
  Send,
  History,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { useAuth } from '@/contexts/auth-context';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAccount } from '@particle-network/connectkit';
import { REPUTATION_THRESHOLDS, FANDOMLY_CHAIN } from '@shared/blockchain-config';
import { useTransferToken } from '@/hooks/use-blockchain';

// ============================================================================
// TYPES
// ============================================================================

interface TokenInfo {
  hasToken: boolean;
  tokenAddress: string | null;
  name?: string;
  symbol?: string;
  totalSupply?: string;
  decimals?: number;
  totalStaked?: string;
  creatorBalance?: string;
}

interface ReputationData {
  score: number;
  thresholds: { fanStaking: boolean; creatorToken: boolean };
}

interface CommunityMember {
  userId: string;
  username: string;
  displayName: string | null;
  walletAddress: string;
}

interface Distribution {
  id: string;
  recipientAddress: string;
  recipientUserId: string | null;
  amount: string;
  txHash: string;
  distributionType: string;
  createdAt: string;
}

// ============================================================================
// COMPONENTS
// ============================================================================

function CopyableAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    toast({ title: 'Address copied', description: address });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-2 text-sm font-mono text-gray-300 hover:text-white bg-white/5 px-3 py-1.5 rounded-lg transition-colors"
    >
      {address.slice(0, 6)}...{address.slice(-4)}
      {copied ? (
        <CheckCircle className="w-3.5 h-3.5 text-green-400" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

function ReputationGate({ score, threshold }: { score: number; threshold: number }) {
  const progress = Math.min((score / threshold) * 100, 100);

  return (
    <Card className="bg-white/5 border-yellow-500/20">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center shrink-0">
            <Lock className="w-6 h-6 text-yellow-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-1">Reputation Required</h3>
            <p className="text-sm text-gray-400 mb-4">
              You need a reputation score of {threshold}+ to create a token. Your current score is{' '}
              {score}.
            </p>
            <div className="w-full bg-white/5 rounded-full h-3 mb-2">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-yellow-500 to-purple-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>
                {score} / {threshold}
              </span>
              <span>{Math.max(0, threshold - score)} points to go</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TokenLaunchForm({
  onSuccess,
  walletAddress,
}: {
  onSuccess: () => void;
  walletAddress: string;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const defaultName = user?.username ? `${user.username} Fan Token` : 'My Fan Token';
  const defaultSymbol = user?.username
    ? user.username
        .replace(/[^a-zA-Z]/g, '')
        .slice(0, 3)
        .toUpperCase() + 'FAN'
    : 'TOKEN';

  const [name, setName] = useState(defaultName);
  const [symbol, setSymbol] = useState(defaultSymbol);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/blockchain/create-token', {
        name,
        symbol,
        walletAddress,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Token creation failed');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Token created!',
        description: `${name} (${symbol}) is live on Avalanche Fuji.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/blockchain/token'] });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: 'Creation failed', description: error.message, variant: 'destructive' });
    },
  });

  return (
    <Card className="bg-white/5 border-purple-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Rocket className="w-5 h-5 text-purple-400" />
          Launch Your Creator Token
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-400">
          Create a unique ERC-20 token for your fans. They can hold it, stake it, and earn rewards.
          1,000,000 tokens will be minted to your wallet.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-300 mb-1.5 block">Token Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Creator Fan Token"
              className="bg-white/5 border-white/10 text-white"
              maxLength={32}
            />
          </div>
          <div>
            <label className="text-sm text-gray-300 mb-1.5 block">Token Symbol</label>
            <Input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="e.g. CRFAN"
              className="bg-white/5 border-white/10 text-white"
              maxLength={8}
            />
          </div>
        </div>

        {/* Preview */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Preview</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Coins className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{name || 'Token Name'}</p>
              <p className="text-xs text-gray-400">{symbol || 'SYM'} &middot; 1,000,000 supply</p>
            </div>
          </div>
        </div>

        <Button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending || !name || !symbol}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
        >
          {createMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating on-chain...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Launch Token
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function DistributeTokens({ token }: { token: TokenInfo }) {
  const { toast } = useToast();
  const [selectedWallet, setSelectedWallet] = useState('');
  const [amount, setAmount] = useState('');
  const transferMutation = useTransferToken();

  const { data: membersData } = useQuery<{ members: CommunityMember[] }>({
    queryKey: ['/api/blockchain/community-wallets'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/blockchain/community-wallets');
      return res.json();
    },
  });

  const { data: historyData, refetch: refetchHistory } = useQuery<{
    distributions: Distribution[];
  }>({
    queryKey: ['/api/blockchain/token-distributions'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/blockchain/token-distributions');
      return res.json();
    },
  });

  const members = membersData?.members || [];
  const distributions = historyData?.distributions || [];
  const selectedMember = members.find((m) => m.walletAddress === selectedWallet);

  const handleSend = async () => {
    if (!token.tokenAddress || !selectedWallet || !amount) return;

    try {
      const receipt = await transferMutation.mutateAsync({
        tokenAddress: token.tokenAddress,
        recipientAddress: selectedWallet,
        amount,
      });

      await apiRequest('POST', '/api/blockchain/token-distributions', {
        tokenAddress: token.tokenAddress,
        recipientAddress: selectedWallet,
        recipientUserId: selectedMember?.userId,
        amount,
        txHash: receipt.transactionHash,
        distributionType: 'single',
      });

      toast({
        title: 'Tokens sent!',
        description: `${amount} ${token.symbol} sent to ${selectedMember?.username || selectedWallet.slice(0, 8) + '...'}`,
      });
      setAmount('');
      setSelectedWallet('');
      refetchHistory();
    } catch (error: any) {
      toast({
        title: 'Transfer failed',
        description: error.message || 'Transaction was rejected or failed',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Send Tokens */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Send className="w-4 h-4 text-purple-400" />
            Send Tokens to Fan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-gray-300 mb-1.5 block">Select Fan</label>
            {members.length === 0 ? (
              <p className="text-sm text-gray-500">
                No fans with wallets found in your community yet.
              </p>
            ) : (
              <select
                value={selectedWallet}
                onChange={(e) => setSelectedWallet(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white rounded-md px-3 py-2 text-sm"
              >
                <option value="">Choose a fan...</option>
                {members.map((m) => (
                  <option key={m.walletAddress} value={m.walletAddress}>
                    {m.displayName || m.username} ({m.walletAddress.slice(0, 6)}...
                    {m.walletAddress.slice(-4)})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="text-sm text-gray-300 mb-1.5 block">Amount</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 100"
              className="bg-white/5 border-white/10 text-white"
              min="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              Your balance: {Number(token.creatorBalance || 0).toLocaleString()} {token.symbol}
            </p>
          </div>

          <Button
            onClick={handleSend}
            disabled={
              !selectedWallet ||
              !amount ||
              Number(amount) <= 0 ||
              Number(amount) > Number(token.creatorBalance || 0) ||
              transferMutation.isPending
            }
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            {transferMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send {amount ? `${amount} ${token.symbol || ''}` : 'Tokens'}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Distribution History */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <History className="w-4 h-4 text-blue-400" />
            Distribution History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {distributions.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No distributions yet. Send tokens to fans to see history here.
            </p>
          ) : (
            <div className="space-y-2">
              {distributions.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between bg-white/5 rounded-lg p-3 text-sm"
                >
                  <div>
                    <p className="text-white font-mono text-xs">
                      {d.recipientAddress.slice(0, 8)}...{d.recipientAddress.slice(-6)}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {new Date(d.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-purple-400 font-semibold">
                      {Number(d.amount).toLocaleString()} {token.symbol}
                    </p>
                    <a
                      href={`${FANDOMLY_CHAIN.blockExplorer}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-500 hover:text-white"
                    >
                      View tx
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TokenDashboard({ token }: { token: TokenInfo }) {
  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList className="bg-white/5 border border-white/10">
        <TabsTrigger
          value="overview"
          className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-400"
        >
          <Coins className="w-4 h-4 mr-2" />
          Overview
        </TabsTrigger>
        <TabsTrigger
          value="distribute"
          className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-400"
        >
          <Send className="w-4 h-4 mr-2" />
          Distribute
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        {/* Token Info */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center">
                <Coins className="w-7 h-7 text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{token.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                    {token.symbol}
                  </Badge>
                  {token.tokenAddress && <CopyableAddress address={token.tokenAddress} />}
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">Total Supply</p>
                <p className="text-lg font-semibold text-white">
                  {Number(token.totalSupply || 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">Your Balance</p>
                <p className="text-lg font-semibold text-white">
                  {Number(token.creatorBalance || 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">Total Staked</p>
                <p className="text-lg font-semibold text-emerald-400">
                  {Number(token.totalStaked || 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">Circulating</p>
                <p className="text-lg font-semibold text-blue-400">
                  {Number(
                    (Number(token.totalSupply || 0) - Number(token.creatorBalance || 0)).toFixed(0)
                  ).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-white/5 border-white/10 hover:border-white/20 transition-colors">
            <CardContent className="p-4 flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">View on Explorer</p>
                <p className="text-xs text-gray-500">See transactions on Avalanche Fuji</p>
              </div>
              <a
                href={`${FANDOMLY_CHAIN.blockExplorer}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10 hover:border-white/20 transition-colors">
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="w-5 h-5 text-green-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Fan Staking</p>
                <p className="text-xs text-gray-500">Fans can stake your token to earn FAN</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="distribute">
        <DistributeTokens token={token} />
      </TabsContent>
    </Tabs>
  );
}

// ============================================================================
// PAGE
// ============================================================================

export default function TokenFactoryPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { address } = useAccount();
  const walletAddress =
    address ||
    ((user as unknown as Record<string, unknown>)?.avalancheL1Address as string | undefined);

  useEffect(() => {
    if (user && user.userType === 'fan') {
      navigate('/reputation');
    }
  }, [user, navigate]);

  const { data: reputation, isLoading: repLoading } = useQuery<ReputationData>({
    queryKey: ['/api/reputation/me'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/reputation/me');
      return res.json();
    },
    enabled: !!user,
  });

  const {
    data: tokenInfo,
    isLoading: tokenLoading,
    refetch,
  } = useQuery<TokenInfo>({
    queryKey: ['/api/blockchain/token', walletAddress],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/blockchain/token/${walletAddress}`);
      return res.json();
    },
    enabled: !!walletAddress,
  });

  const isLoading = repLoading || tokenLoading;
  const hasToken = tokenInfo?.hasToken === true;
  // fandomly_admin bypasses reputation gate for full platform access
  const meetsThreshold =
    user?.role === 'fandomly_admin' ||
    (reputation?.score ?? 0) >= REPUTATION_THRESHOLDS.CREATOR_TOKEN;

  return (
    <DashboardLayout userType="creator">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Coins className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">My Token</h1>
            <p className="text-sm text-gray-400">
              {hasToken ? 'Manage your creator token' : 'Launch your own creator token'}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full bg-white/5" />
            <Skeleton className="h-32 w-full bg-white/5" />
          </div>
        ) : !walletAddress ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-8 text-center">
              <Shield className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Wallet Required</h3>
              <p className="text-sm text-gray-400">
                Connect your wallet to create a token on Avalanche Fuji.
              </p>
            </CardContent>
          </Card>
        ) : hasToken && tokenInfo ? (
          <TokenDashboard token={tokenInfo} />
        ) : !meetsThreshold ? (
          <ReputationGate
            score={reputation?.score ?? 0}
            threshold={REPUTATION_THRESHOLDS.CREATOR_TOKEN}
          />
        ) : (
          <TokenLaunchForm onSuccess={() => refetch()} walletAddress={walletAddress!} />
        )}
      </div>
    </DashboardLayout>
  );
}
