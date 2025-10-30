import { useState } from 'react';
import { Plus, Coins, Image, AlertCircle, ExternalLink, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import {
  useNftCollections,
  useCreateNftCollection,
  getChainDisplayName,
  getChainColor,
  formatTokenType,
  type NftCollection,
} from '@/hooks/useCrossmint';

export default function NftCollectionsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { data, isLoading } = useNftCollections();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const collections = data?.collections || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">NFT Collections</h1>
          <p className="text-gray-400 mt-1">Create and manage your NFT collections</p>
        </div>
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-brand-primary hover:bg-brand-primary/80"
          data-testid="button-create-collection"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Collection
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-500/10 border-blue-500/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-400 mb-1">About NFT Collections</h3>
              <p className="text-sm text-gray-300">
                Collections are containers for your NFTs. Each collection can have multiple NFT templates that you can
                mint and distribute to your fans. Choose between EVM chains (Polygon, Base, Arbitrum) or Solana for
                your collection.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Collections Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-white/5 border-white/10">
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : collections.length === 0 ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Image className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No collections yet</h3>
            <p className="text-gray-400 text-center max-w-md mb-6">
              Create your first NFT collection to start minting and distributing NFTs to your community.
            </p>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-brand-primary hover:bg-brand-primary/80"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Collection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      )}

      {/* Create Collection Dialog */}
      <CreateCollectionDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={() => {
          setIsCreateDialogOpen(false);
          toast({
            title: 'Collection Created',
            description: 'Your NFT collection is being deployed. This may take a few minutes.',
          });
        }}
      />
    </div>
  );
}

// ============================================================================
// COLLECTION CARD COMPONENT
// ============================================================================

function CollectionCard({ collection }: { collection: NftCollection }) {
  const navigate = useNavigate();

  const metadata = collection.metadata as any;
  const totalSupply = metadata?.totalSupply || 0;
  const maxSupply = metadata?.maxSupply;

  return (
    <Card
      className="bg-white/5 border-white/10 hover:border-brand-primary/50 transition-all duration-300 cursor-pointer group"
      onClick={() => setLocation(`/creator-dashboard/nft-collections/${collection.id}`)}
    >
      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <CardTitle className="text-lg group-hover:text-brand-primary transition-colors">
              {collection.name}
            </CardTitle>
            {collection.symbol && (
              <p className="text-sm text-gray-400 mt-1">${collection.symbol}</p>
            )}
          </div>
          {!collection.isActive && (
            <Badge variant="secondary" className="text-xs">
              Inactive
            </Badge>
          )}
        </div>
        {collection.description && (
          <CardDescription className="line-clamp-2">{collection.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Chain Badge */}
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${getChainColor(collection.chain)}`} />
          <span className="text-sm text-gray-300">{getChainDisplayName(collection.chain)}</span>
        </div>

        {/* Token Type */}
        <div className="flex items-center gap-2 text-sm">
          <Coins className="w-4 h-4 text-gray-400" />
          <span className="text-gray-300">{formatTokenType(collection.tokenType)}</span>
        </div>

        {/* Supply Stats */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{totalSupply}</p>
            <p className="text-xs text-gray-400">Minted</p>
          </div>
          {maxSupply && (
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-400">{maxSupply}</p>
              <p className="text-xs text-gray-400">Max Supply</p>
            </div>
          )}
        </div>

        {/* Contract Address */}
        {collection.contractAddress && (
          <div className="flex items-center gap-2 text-xs text-gray-400 pt-2">
            <span className="truncate">{collection.contractAddress}</span>
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              setLocation(`/creator-dashboard/nft-collections/${collection.id}/templates`);
            }}
          >
            <Image className="w-4 h-4 mr-2" />
            Templates
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setLocation(`/creator-dashboard/nft-collections/${collection.id}/settings`);
            }}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// CREATE COLLECTION DIALOG
// ============================================================================

interface CreateCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function CreateCollectionDialog({ open, onOpenChange, onSuccess }: CreateCollectionDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    symbol: '',
    chain: 'polygon-amoy',
    tokenType: 'ERC721',
  });

  const createMutation = useCreateNftCollection();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.chain) {
      toast({
        title: 'Validation Error',
        description: 'Name and chain are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: formData.name,
        description: formData.description || undefined,
        symbol: formData.symbol || undefined,
        chain: formData.chain,
        tokenType: formData.tokenType,
      });

      onSuccess();
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        symbol: '',
        chain: 'polygon-amoy',
        tokenType: 'ERC721',
      });
    } catch (error: any) {
      toast({
        title: 'Creation Failed',
        description: error.message || 'Failed to create collection',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create NFT Collection</DialogTitle>
          <DialogDescription>
            Deploy a new NFT collection on your chosen blockchain. This will create a smart contract for your NFTs.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Collection Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Collection Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Fan Badges Collection"
              required
              data-testid="input-collection-name"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your NFT collection..."
              rows={3}
              data-testid="input-collection-description"
            />
          </div>

          {/* Symbol */}
          <div className="space-y-2">
            <Label htmlFor="symbol">Symbol</Label>
            <Input
              id="symbol"
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
              placeholder="e.g., BADGE"
              maxLength={10}
              data-testid="input-collection-symbol"
            />
            <p className="text-xs text-gray-400">Short identifier for your collection (optional)</p>
          </div>

          {/* Chain Selection */}
          <div className="space-y-2">
            <Label htmlFor="chain">Blockchain *</Label>
            <Select value={formData.chain} onValueChange={(value) => setFormData({ ...formData, chain: value })}>
              <SelectTrigger data-testid="select-chain">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="polygon-amoy">Polygon Amoy (Testnet) - Recommended</SelectItem>
                <SelectItem value="polygon">Polygon Mainnet</SelectItem>
                <SelectItem value="base-sepolia">Base Sepolia (Testnet)</SelectItem>
                <SelectItem value="base">Base Mainnet</SelectItem>
                <SelectItem value="solana">Solana</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-400">Choose the blockchain to deploy your collection</p>
          </div>

          {/* Token Type */}
          <div className="space-y-2">
            <Label htmlFor="tokenType">Token Standard *</Label>
            <Select value={formData.tokenType} onValueChange={(value) => setFormData({ ...formData, tokenType: value })}>
              <SelectTrigger data-testid="select-token-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ERC721">ERC-721 (NFT) - Unique tokens</SelectItem>
                <SelectItem value="ERC1155">ERC-1155 - Multi-token</SelectItem>
                {formData.chain.includes('solana') && (
                  <>
                    <SelectItem value="SOLANA">Solana NFT - Standard</SelectItem>
                    <SelectItem value="SOLANA_COMPRESSED">Solana cNFT - Compressed (Low Cost)</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-brand-primary hover:bg-brand-primary/80"
              data-testid="button-submit-collection"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Collection'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

