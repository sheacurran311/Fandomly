import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUserNFTs, type UserNFT } from "@/hooks/useUserNFTs";
import { Image as ImageIcon, Award, Gift, Sparkles, ExternalLink, Filter, Grid3x3, List } from "lucide-react";

interface NFTGalleryProps {
  userId?: string;
  showFilters?: boolean;
}

export default function NFTGallery({ userId, showFilters = true }: NFTGalleryProps) {
  const { data: nfts = [], isLoading } = useUserNFTs(userId);
  const [selectedNFT, setSelectedNFT] = useState<UserNFT | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterChain, setFilterChain] = useState<string>('all');

  // Filter NFTs
  const filteredNFTs = nfts.filter(nft => {
    if (filterType !== 'all' && nft.type !== filterType) return false;
    if (filterChain !== 'all' && nft.chain !== filterChain) return false;
    return true;
  });

  // Get unique chains for filter
  const chains = Array.from(new Set(nfts.map(nft => nft.chain)));

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'badge': return Award;
      case 'reward': return Gift;
      case 'platform': return Sparkles;
      default: return ImageIcon;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'badge': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'reward': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'platform': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="animate-pulse space-y-4">
                <div className="aspect-square bg-gray-700 rounded-lg"></div>
                <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-700 rounded w-full"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      {showFilters && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'bg-brand-primary' : ''}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-brand-primary' : ''}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[140px] bg-white/10 border-white/20 text-white">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="badge">Badges</SelectItem>
                <SelectItem value="reward">Rewards</SelectItem>
                <SelectItem value="platform">Platform</SelectItem>
                <SelectItem value="creator">Creator</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterChain} onValueChange={setFilterChain}>
              <SelectTrigger className="w-[140px] bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Chains</SelectItem>
                {chains.map(chain => (
                  <SelectItem key={chain} value={chain}>
                    {chain.charAt(0).toUpperCase() + chain.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-brand-primary">{nfts.length}</p>
              <p className="text-sm text-gray-400">Total NFTs</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-400">{nfts.filter(n => n.type === 'badge').length}</p>
              <p className="text-sm text-gray-400">Badges</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-400">{nfts.filter(n => n.type === 'reward').length}</p>
              <p className="text-sm text-gray-400">Rewards</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">{chains.length}</p>
              <p className="text-sm text-gray-400">Chains</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* NFT Grid/List */}
      {filteredNFTs.length === 0 ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-12 text-center">
            <ImageIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No NFTs Found</h3>
            <p className="text-gray-400">
              {filterType !== 'all' || filterChain !== 'all'
                ? 'Try adjusting your filters'
                : 'Start earning NFTs by completing tasks and redeeming rewards!'}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredNFTs.map((nft) => (
            <NFTCard key={nft.id} nft={nft} onClick={() => setSelectedNFT(nft)} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNFTs.map((nft) => (
            <NFTListItem key={nft.id} nft={nft} onClick={() => setSelectedNFT(nft)} />
          ))}
        </div>
      )}

      {/* NFT Detail Modal */}
      <Dialog open={!!selectedNFT} onOpenChange={() => setSelectedNFT(null)}>
        <DialogContent className="sm:max-w-2xl bg-brand-dark-bg border-white/10 max-h-[90vh] overflow-y-auto">
          {selectedNFT && (
            <>
              <DialogHeader>
                <DialogTitle className="text-white">{selectedNFT.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <img
                      src={selectedNFT.image}
                      alt={selectedNFT.name}
                      className="w-full aspect-square object-cover rounded-lg border border-white/10"
                    />
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Collection</p>
                      <p className="text-white font-medium">{selectedNFT.collection.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Description</p>
                      <p className="text-gray-300 text-sm">{selectedNFT.description || 'No description available'}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Badge className={getTypeColor(selectedNFT.type)}>
                        {selectedNFT.type.charAt(0).toUpperCase() + selectedNFT.type.slice(1)}
                      </Badge>
                      <Badge className="bg-white/10 text-white">
                        {selectedNFT.chain}
                      </Badge>
                      {selectedNFT.metadata?.category && (
                        <Badge variant="outline" className="text-brand-primary border-brand-primary/50">
                          {selectedNFT.metadata.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {selectedNFT.metadata?.attributes && selectedNFT.metadata.attributes.length > 0 && (
                  <div>
                    <h4 className="text-white font-semibold mb-3">Attributes</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {selectedNFT.metadata.attributes.map((attr, idx) => (
                        <div key={idx} className="p-3 bg-white/5 rounded-lg border border-white/10">
                          <p className="text-xs text-gray-400 mb-1">{attr.trait_type}</p>
                          <p className="text-white font-medium">{attr.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t border-white/10">
                  {selectedNFT.contractAddress && (
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <a
                        href={`https://${selectedNFT.chain === 'solana' ? 'solscan.io' : selectedNFT.chain === 'polygon' ? 'polygonscan.com' : 'etherscan.io'}/address/${selectedNFT.contractAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View on Explorer
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// NFT Card Component (Grid View)
function NFTCard({ nft, onClick }: { nft: UserNFT; onClick: () => void }) {
  const TypeIcon = getTypeIcon(nft.type);
  const typeColor = getTypeColor(nft.type);

  return (
    <Card 
      className="bg-white/5 border-white/10 hover:border-brand-primary/50 transition-all cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        <div className="relative aspect-square rounded-lg overflow-hidden border border-white/10">
          <img
            src={nft.image}
            alt={nft.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
          <div className="absolute top-2 right-2">
            <Badge className={`${typeColor} backdrop-blur-sm`}>
              <TypeIcon className="h-3 w-3" />
            </Badge>
          </div>
        </div>
        <div>
          <h3 className="text-white font-medium truncate">{nft.name}</h3>
          <p className="text-gray-400 text-sm truncate">{nft.collection.name}</p>
        </div>
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs text-gray-400">
            {nft.chain}
          </Badge>
          {nft.metadata?.rarity && (
            <Badge variant="outline" className="text-xs text-brand-primary border-brand-primary/50">
              {nft.metadata.rarity}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// NFT List Item Component (List View)
function NFTListItem({ nft, onClick }: { nft: UserNFT; onClick: () => void }) {
  const TypeIcon = getTypeIcon(nft.type);
  const typeColor = getTypeColor(nft.type);

  return (
    <Card 
      className="bg-white/5 border-white/10 hover:border-brand-primary/50 transition-all cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <img
            src={nft.image}
            alt={nft.name}
            className="w-20 h-20 rounded-lg object-cover border border-white/10"
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-medium truncate">{nft.name}</h3>
            <p className="text-gray-400 text-sm truncate">{nft.collection.name}</p>
            <div className="flex gap-2 mt-2">
              <Badge className={typeColor}>
                <TypeIcon className="h-3 w-3 mr-1" />
                {nft.type}
              </Badge>
              <Badge variant="outline" className="text-xs text-gray-400">
                {nft.chain}
              </Badge>
            </div>
          </div>
          <ExternalLink className="h-5 w-5 text-gray-400" />
        </div>
      </CardContent>
    </Card>
  );
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'badge': return Award;
    case 'reward': return Gift;
    case 'platform': return Sparkles;
    default: return ImageIcon;
  }
}

function getTypeColor(type: string) {
  switch (type) {
    case 'badge': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'reward': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'platform': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
}

