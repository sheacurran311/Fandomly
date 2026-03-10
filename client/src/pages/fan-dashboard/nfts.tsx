/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * My NFTs Page — Display NFTs a fan has earned through reward redemptions.
 *
 * Route: /fan-dashboard/nfts
 * Data: GET /api/nft/my-nfts
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ImageIcon,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Wallet,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { useAuth } from '@/contexts/auth-context';
import { apiRequest } from '@/lib/queryClient';
import { getExplorerTxUrl, ipfsToGateway } from '@/hooks/useNFT';

interface MyNft {
  id: string;
  collectionId: string | null;
  templateId: string | null;
  badgeTemplateId: string | null;
  recipientWalletAddress: string;
  recipientChain: string;
  mintReason: string;
  contextData: {
    rewardId?: string;
    pointsSpent?: number;
    metadataUri?: string;
    [key: string]: unknown;
  } | null;
  tokenId: string | null;
  txHash: string | null;
  contractAddress: string | null;
  status: string;
  completedAt: string | null;
  createdAt: string;
  collectionName: string | null;
  collectionDescription: string | null;
  collectionSymbol: string | null;
  collectionMetadata: Record<string, any> | null;
  metadataSnapshot: {
    name: string;
    description?: string;
    image: string;
    attributes?: Array<{ trait_type: string; value: string }>;
  } | null;
  isViewed: boolean;
  deliveredAt: string | null;
}

function getStatusInfo(status: string) {
  switch (status) {
    case 'success':
      return { label: 'Minted', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle };
    case 'pending':
      return { label: 'Pending', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock };
    case 'processing':
      return { label: 'Processing', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Loader2 };
    case 'failed':
      return { label: 'Failed', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle };
    default:
      return { label: status, color: 'bg-white/5 text-gray-400 border-white/10', icon: Clock };
  }
}

function getMintReasonLabel(reason: string) {
  const labels: Record<string, string> = {
    reward_redemption: 'Reward Redemption',
    task_completion: 'Task Reward',
    badge_achievement: 'Achievement Badge',
    direct_mint: 'Direct Mint',
    admin_issued: 'Platform Reward',
  };
  return labels[reason] || reason;
}

function NftCard({ nft }: { nft: MyNft }) {
  const [copied, setCopied] = useState(false);
  const statusInfo = getStatusInfo(nft.status);
  const StatusIcon = statusInfo.icon;

  const imageUrl =
    nft.metadataSnapshot?.image
      ? ipfsToGateway(nft.metadataSnapshot.image)
      : nft.collectionMetadata?.collectionImageUrl
        ? ipfsToGateway(nft.collectionMetadata.collectionImageUrl as string)
        : null;

  const nftName =
    nft.metadataSnapshot?.name || nft.collectionName || 'NFT';

  const handleCopyTx = () => {
    if (!nft.txHash) return;
    navigator.clipboard.writeText(nft.txHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="bg-white/5 border-white/10 overflow-hidden hover:border-white/20 transition-colors">
      {/* Image */}
      <div className="aspect-square bg-white/5 relative">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={nftName}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-gray-600" />
          </div>
        )}
        {/* Status badge overlay */}
        <div className="absolute top-2 right-2">
          <Badge className={`${statusInfo.color} text-xs`}>
            <StatusIcon className={`w-3 h-3 mr-1 ${nft.status === 'processing' ? 'animate-spin' : ''}`} />
            {statusInfo.label}
          </Badge>
        </div>
        {nft.badgeTemplateId && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              Badge
            </Badge>
          </div>
        )}
      </div>

      {/* Info */}
      <CardContent className="p-4 space-y-2">
        <h3 className="font-semibold text-white text-sm truncate" title={nftName}>
          {nftName}
        </h3>

        {nft.collectionName && nft.metadataSnapshot?.name && nft.metadataSnapshot.name !== nft.collectionName && (
          <p className="text-xs text-gray-500 truncate">{nft.collectionName}</p>
        )}

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">{getMintReasonLabel(nft.mintReason)}</span>
          {nft.contextData?.pointsSpent && (
            <span className="text-xs text-gray-600">
              &middot; {nft.contextData.pointsSpent} pts
            </span>
          )}
        </div>

        {nft.tokenId && (
          <p className="text-xs text-gray-500">
            Token #{nft.tokenId}
          </p>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-gray-600">
            {new Date(nft.completedAt || nft.createdAt).toLocaleDateString()}
          </span>
          <div className="flex items-center gap-1">
            {nft.txHash && (
              <>
                <button
                  onClick={handleCopyTx}
                  className="p-1 rounded hover:bg-white/10 transition-colors"
                  title="Copy transaction hash"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-gray-500" />
                  )}
                </button>
                <a
                  href={getExplorerTxUrl(nft.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded hover:bg-white/10 transition-colors"
                  title="View on explorer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
                </a>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FanNftsPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery<{ nfts: MyNft[] }>({
    queryKey: ['/api/nft/my-nfts'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/nft/my-nfts');
      return res.json();
    },
    enabled: !!user,
  });

  const nfts = data?.nfts || [];
  const completed = nfts.filter((n) => n.status === 'success');
  const pending = nfts.filter((n) => n.status === 'pending' || n.status === 'processing');
  const failed = nfts.filter((n) => n.status === 'failed');

  return (
    <DashboardLayout userType="fan">
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">My NFTs</h1>
            <p className="text-sm text-gray-400">
              NFTs and badges you've earned from rewards and achievements
            </p>
          </div>
        </div>

        {/* Stats */}
        {!isLoading && nfts.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-white">{completed.length}</p>
                <p className="text-xs text-gray-400">Collected</p>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-yellow-400">{pending.length}</p>
                <p className="text-xs text-gray-400">Pending</p>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-purple-400">
                  {nfts.filter((n) => n.badgeTemplateId).length}
                </p>
                <p className="text-xs text-gray-400">Badges</p>
              </CardContent>
            </Card>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-square w-full bg-white/5" />
                <Skeleton className="h-4 w-3/4 bg-white/5" />
                <Skeleton className="h-3 w-1/2 bg-white/5" />
              </div>
            ))}
          </div>
        ) : nfts.length === 0 ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-12 text-center">
              <Wallet className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">No NFTs Yet</h3>
              <p className="text-sm text-gray-400 max-w-md mx-auto">
                Earn NFTs by redeeming rewards from the Rewards Store. Your collected
                NFTs and badges will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList className="bg-white/5 border-white/10">
              <TabsTrigger value="all" className="data-[state=active]:bg-white/10">
                All ({nfts.length})
              </TabsTrigger>
              <TabsTrigger value="collected" className="data-[state=active]:bg-white/10">
                Collected ({completed.length})
              </TabsTrigger>
              {pending.length > 0 && (
                <TabsTrigger value="pending" className="data-[state=active]:bg-white/10">
                  Pending ({pending.length})
                </TabsTrigger>
              )}
              {failed.length > 0 && (
                <TabsTrigger value="failed" className="data-[state=active]:bg-white/10">
                  Failed ({failed.length})
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="all">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {nfts.map((nft) => (
                  <NftCard key={nft.id} nft={nft} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="collected">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {completed.map((nft) => (
                  <NftCard key={nft.id} nft={nft} />
                ))}
              </div>
            </TabsContent>

            {pending.length > 0 && (
              <TabsContent value="pending">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {pending.map((nft) => (
                    <NftCard key={nft.id} nft={nft} />
                  ))}
                </div>
              </TabsContent>
            )}

            {failed.length > 0 && (
              <TabsContent value="failed">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {failed.map((nft) => (
                    <NftCard key={nft.id} nft={nft} />
                  ))}
                </div>
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
