/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * NFT Collections Page — Manage on-chain NFT collections.
 *
 * Route: /creator-dashboard/nft-collections (creator only)
 *
 * Features:
 *   - View existing collections (FandomlyNFT + CreatorCollection)
 *   - Create new collection on-chain
 *   - Mint NFTs into collections
 *   - View on-chain stats
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Image,
  Plus,
  ExternalLink,
  Loader2,
  Layers,
  Hash,
  Box,
  Sparkles,
  Upload,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { FANDOMLY_CHAIN, CONTRACTS } from '@shared/blockchain-config';
import {
  useNftCollections,
  useCreateNftCollection,
  useNFTStats,
  useMintNft,
  useUploadImage,
  getExplorerContractUrl,
  ipfsToGateway,
} from '@/hooks/useNFT';

// ============================================================================
// CREATE COLLECTION FORM
// ============================================================================

function CreateCollectionForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [maxSupply, setMaxSupply] = useState('100');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const createCollection = useCreateNftCollection();
  const uploadImage = useUploadImage();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadImage.mutateAsync(file);
      setImageUrl(result.gatewayUrl);
    } catch {
      toast({
        title: 'Upload failed',
        description: 'Could not upload image to IPFS',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !maxSupply) return;

    try {
      await createCollection.mutateAsync({
        name: name.trim(),
        description: description.trim(),
        maxSupply: Number(maxSupply),
        imageUrl: imageUrl || undefined,
      });
      toast({ title: 'Collection created', description: `"${name}" deployed on-chain.` });
      setName('');
      setDescription('');
      setMaxSupply('100');
      setImageUrl('');
      onSuccess();
    } catch (err: any) {
      toast({
        title: 'Creation failed',
        description: err?.message || 'Could not create collection',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Plus className="h-5 w-5 text-purple-400" />
          Create New Collection
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-gray-300">Collection Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My NFT Collection"
              className="bg-white/10 border-white/20 text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your collection..."
              className="bg-white/10 border-white/20 text-white resize-none"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Max Supply</Label>
            <Input
              type="number"
              min="1"
              max="10000"
              value={maxSupply}
              onChange={(e) => setMaxSupply(e.target.value)}
              className="bg-white/10 border-white/20 text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Collection Image</Label>
            {imageUrl && (
              <div className="w-24 h-24 rounded-lg overflow-hidden border border-white/10">
                <img src={imageUrl} alt="Collection" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-md cursor-pointer transition-colors">
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload to IPFS
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Or paste image URL..."
              className="bg-white/10 border-white/20 text-white text-sm"
            />
          </div>

          <Button
            type="submit"
            disabled={createCollection.isPending || !name.trim()}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {createCollection.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Deploying on-chain...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Create Collection
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// COLLECTION CARD
// ============================================================================

function CollectionCard({ collection }: { collection: any }) {
  const metadata = collection.metadata || {};
  const imageUrl = metadata.collectionImageUrl;

  return (
    <Card className="bg-white/5 border-white/10 hover:border-purple-500/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {imageUrl ? (
            <div className="w-16 h-16 rounded-lg overflow-hidden border border-white/10 flex-shrink-0">
              <img
                src={ipfsToGateway(imageUrl)}
                alt={collection.name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-lg bg-purple-500/20 border border-white/10 flex items-center justify-center flex-shrink-0">
              <Image className="h-6 w-6 text-purple-400" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-white font-medium truncate">{collection.name}</h3>
              <Badge variant="outline" className="border-purple-500/30 text-purple-400 text-xs">
                {collection.tokenType || 'ERC-721'}
              </Badge>
              {collection.isActive && (
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-xs">
                  Active
                </Badge>
              )}
            </div>

            {collection.description && (
              <p className="text-sm text-gray-400 truncate mb-2">{collection.description}</p>
            )}

            <div className="flex items-center gap-4 text-xs text-gray-500">
              {metadata.onChainCollectionId !== undefined && (
                <span className="flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  ID: {metadata.onChainCollectionId}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Box className="h-3 w-3" />
                {metadata.totalSupply || 0} / {metadata.maxSupply || '?'} minted
              </span>
              {collection.contractAddress && (
                <a
                  href={getExplorerContractUrl(collection.contractAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-purple-400 hover:text-purple-300"
                >
                  <ExternalLink className="h-3 w-3" />
                  Contract
                </a>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MINT NFT FORM
// ============================================================================

function MintNftForm({ collections }: { collections: any[] }) {
  const [collectionId, setCollectionId] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [tokenName, setTokenName] = useState('');
  const [tokenDescription, setTokenDescription] = useState('');
  const [tokenImageUrl, setTokenImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const mintNft = useMintNft();
  const uploadImage = useUploadImage();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadImage.mutateAsync(file);
      setTokenImageUrl(result.gatewayUrl);
    } catch {
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectionId || !recipientAddress || !tokenName) return;

    try {
      await mintNft.mutateAsync({
        collectionId,
        recipientAddress,
        metadata: {
          name: tokenName,
          description: tokenDescription,
          image: tokenImageUrl,
        },
      });
      toast({
        title: 'NFT Minted',
        description: `"${tokenName}" sent to ${recipientAddress.slice(0, 8)}...`,
      });
      setTokenName('');
      setTokenDescription('');
      setTokenImageUrl('');
      setRecipientAddress('');
    } catch (err: any) {
      toast({
        title: 'Mint failed',
        description: err?.message || 'Could not mint NFT',
        variant: 'destructive',
      });
    }
  };

  if (collections.length === 0) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-6 text-center text-gray-400">
          Create a collection first before minting NFTs.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-pink-400" />
          Mint NFT
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleMint} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-gray-300">Collection</Label>
            <select
              value={collectionId}
              onChange={(e) => setCollectionId(e.target.value)}
              className="w-full bg-white/10 border border-white/20 text-white rounded-md px-3 py-2 text-sm"
              required
            >
              <option value="" className="bg-gray-900">
                Select collection...
              </option>
              {collections.map((c: any) => (
                <option key={c.id} value={c.id} className="bg-gray-900">
                  {c.name} ({c.metadata?.totalSupply || 0}/{c.metadata?.maxSupply || '?'})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Recipient Wallet Address</Label>
            <Input
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="0x..."
              className="bg-white/10 border-white/20 text-white font-mono text-sm"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">NFT Name</Label>
            <Input
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              placeholder="My NFT #1"
              className="bg-white/10 border-white/20 text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Description</Label>
            <Textarea
              value={tokenDescription}
              onChange={(e) => setTokenDescription(e.target.value)}
              placeholder="NFT description..."
              className="bg-white/10 border-white/20 text-white resize-none"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">NFT Image</Label>
            {tokenImageUrl && (
              <div className="w-20 h-20 rounded-lg overflow-hidden border border-white/10">
                <img src={tokenImageUrl} alt="NFT" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-md cursor-pointer transition-colors">
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {uploading ? 'Uploading...' : 'Upload'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
            <Input
              value={tokenImageUrl}
              onChange={(e) => setTokenImageUrl(e.target.value)}
              placeholder="Or paste image URL..."
              className="bg-white/10 border-white/20 text-white text-sm"
            />
          </div>

          <Button
            type="submit"
            disabled={mintNft.isPending || !collectionId || !recipientAddress || !tokenName}
            className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
          >
            {mintNft.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Minting on-chain...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Mint NFT
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// STATS BAR
// ============================================================================

function NftStatsBar() {
  const { data, isLoading } = useNFTStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-6 w-10" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4">
          <p className="text-xs text-gray-400 mb-1">Collections</p>
          <p className="text-xl font-bold text-white">{stats?.totalCollections || '0'}</p>
        </CardContent>
      </Card>
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4">
          <p className="text-xs text-gray-400 mb-1">NFTs Minted</p>
          <p className="text-xl font-bold text-white">{stats?.totalNFTsMinted || '0'}</p>
        </CardContent>
      </Card>
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4">
          <p className="text-xs text-gray-400 mb-1">Badge Types</p>
          <p className="text-xl font-bold text-white">{stats?.totalBadgeTypes || '0'}</p>
        </CardContent>
      </Card>
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4">
          <p className="text-xs text-gray-400 mb-1">Creator Collections</p>
          <p className="text-xl font-bold text-white">{stats?.totalCreatorCollections || '0'}</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function NftCollectionsPage() {
  const { user } = useAuth();
  const { data: collectionsData, isLoading, refetch } = useNftCollections();
  const collections = (collectionsData as any)?.collections || [];

  if (!user) return null;

  return (
    <DashboardLayout userType="creator">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Layers className="h-7 w-7 text-purple-400" />
              NFT Collections
            </h1>
            <p className="text-gray-400 mt-1">
              Create and manage NFT collections on Avalanche Fuji
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={getExplorerContractUrl(CONTRACTS.FandomlyNFT)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              FandomlyNFT Contract
            </a>
          </div>
        </div>

        {/* Stats */}
        <NftStatsBar />

        {/* Tabs */}
        <Tabs defaultValue="collections" className="space-y-4">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger
              value="collections"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              Collections
            </TabsTrigger>
            <TabsTrigger
              value="create"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              Create Collection
            </TabsTrigger>
            <TabsTrigger
              value="mint"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              Mint NFT
            </TabsTrigger>
          </TabsList>

          {/* Collections List */}
          <TabsContent value="collections" className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <Skeleton className="w-16 h-16 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-5 w-40" />
                          <Skeleton className="h-4 w-60" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : collections.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-12 text-center">
                  <Image className="h-12 w-12 text-purple-400/50 mx-auto mb-4" />
                  <h3 className="text-white font-medium mb-2">No Collections Yet</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Create your first NFT collection to start minting tokens for your fans.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {collections.map((collection: any) => (
                  <CollectionCard key={collection.id} collection={collection} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Create Collection */}
          <TabsContent value="create">
            <CreateCollectionForm onSuccess={() => refetch()} />
          </TabsContent>

          {/* Mint NFT */}
          <TabsContent value="mint">
            <MintNftForm collections={collections} />
          </TabsContent>
        </Tabs>

        {/* Chain Info */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                Network: {FANDOMLY_CHAIN.name} (Chain ID: {FANDOMLY_CHAIN.id})
              </span>
              <a
                href={`${FANDOMLY_CHAIN.blockExplorer}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                Block Explorer
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
