import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { fetchApi } from '@/lib/queryClient';
import { Gift, Image, Ticket, Award, Plus, Check, Sparkles } from 'lucide-react';

export interface CompletionReward {
  type: 'nft' | 'raffle_entry' | 'badge' | 'reward';
  rewardId?: string;
  value?: number;
  metadata?: Record<string, unknown>;
  displayName?: string;
  displayImage?: string;
}

interface RewardPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddReward: (reward: CompletionReward) => void;
  existingRewards?: CompletionReward[];
}

interface CatalogReward {
  id: string;
  name: string;
  type: string;
  pointsCost: number;
  imageUrl?: string;
  rewardType?: string;
}

interface NFTCollection {
  id: string;
  name: string;
  imageUrl?: string;
  supply: number;
  maxSupply?: number;
}

interface BadgeType {
  id: string;
  name: string;
  imageUrl?: string;
  soulbound?: boolean;
}

export function RewardPickerDialog({
  open,
  onOpenChange,
  onAddReward,
  existingRewards: _existingRewards = [],
}: RewardPickerDialogProps) {
  const [selectedTab, setSelectedTab] = useState('existing');
  const [selectedReward, setSelectedReward] = useState<string | null>(null);
  const [nftMode, setNftMode] = useState<'existing' | 'create'>('existing');
  const [raffleMode, setRaffleMode] = useState<'existing' | 'create'>('existing');

  // New NFT form state
  const [newNft, setNewNft] = useState({
    name: '',
    description: '',
    imageUrl: '',
    maxSupply: '',
    soulbound: false,
  });

  // New raffle form state
  const [newRaffle, setNewRaffle] = useState({
    prizeDescription: '',
    drawDate: '',
    winnerCount: '',
    entriesPerCompletion: '1',
  });

  // Fetch rewards catalog
  const { data: catalogRewards = [], isLoading: isLoadingCatalog } = useQuery<CatalogReward[]>({
    queryKey: ['rewards', 'catalog'],
    queryFn: () => fetchApi('/api/rewards/catalog') as Promise<CatalogReward[]>,
    enabled: open && selectedTab === 'existing',
  });

  // Fetch NFT collections
  const { data: nftCollections = [], isLoading: isLoadingNfts } = useQuery<NFTCollection[]>({
    queryKey: ['nft', 'collections'],
    queryFn: () => fetchApi('/api/nft/collections') as Promise<NFTCollection[]>,
    enabled: open && selectedTab === 'nft' && nftMode === 'existing',
  });

  // Fetch raffle rewards
  const { data: raffleRewards = [], isLoading: isLoadingRaffles } = useQuery<CatalogReward[]>({
    queryKey: ['rewards', 'catalog', 'raffle'],
    queryFn: async () => {
      const data = (await fetchApi('/api/rewards/catalog')) as CatalogReward[];
      return data.filter((r: CatalogReward) => r.rewardType === 'raffle');
    },
    enabled: open && selectedTab === 'raffle' && raffleMode === 'existing',
  });

  // Fetch badge types
  const { data: badgeTypes = [], isLoading: isLoadingBadges } = useQuery<BadgeType[]>({
    queryKey: ['badges', 'types'],
    queryFn: () => fetchApi('/api/badges/types') as Promise<BadgeType[]>,
    enabled: open && selectedTab === 'badge',
  });

  const handleAddExistingReward = () => {
    const reward = catalogRewards.find((r: CatalogReward) => r.id === selectedReward);
    if (!reward) return;

    onAddReward({
      type: 'reward',
      rewardId: reward.id,
      displayName: reward.name,
      displayImage: reward.imageUrl,
      metadata: {
        pointsCost: reward.pointsCost,
        rewardType: reward.type,
      },
    });
    resetAndClose();
  };

  const handleAddNftCollection = (collection: NFTCollection) => {
    onAddReward({
      type: 'nft',
      displayName: collection.name,
      displayImage: collection.imageUrl,
      metadata: {
        collectionId: collection.id,
        supply: collection.supply,
        maxSupply: collection.maxSupply,
      },
    });
    resetAndClose();
  };

  const handleCreateNft = () => {
    if (!newNft.name) return;

    onAddReward({
      type: 'nft',
      displayName: newNft.name,
      displayImage: newNft.imageUrl || undefined,
      metadata: {
        name: newNft.name,
        description: newNft.description,
        imageUrl: newNft.imageUrl,
        maxSupply: newNft.maxSupply ? parseInt(newNft.maxSupply) : undefined,
        soulbound: newNft.soulbound,
        isNew: true,
      },
    });
    resetAndClose();
  };

  const handleAddRaffleReward = (raffle: CatalogReward) => {
    onAddReward({
      type: 'raffle_entry',
      rewardId: raffle.id,
      displayName: raffle.name,
      displayImage: raffle.imageUrl,
      metadata: {
        raffleId: raffle.id,
      },
    });
    resetAndClose();
  };

  const handleCreateRaffle = () => {
    if (!newRaffle.prizeDescription) return;

    onAddReward({
      type: 'raffle_entry',
      displayName: `Raffle: ${newRaffle.prizeDescription}`,
      metadata: {
        prizeDescription: newRaffle.prizeDescription,
        drawDate: newRaffle.drawDate,
        winnerCount: newRaffle.winnerCount ? parseInt(newRaffle.winnerCount) : 1,
        entriesPerCompletion: parseInt(newRaffle.entriesPerCompletion) || 1,
        isNew: true,
      },
    });
    resetAndClose();
  };

  const handleAddBadge = (badge: BadgeType) => {
    onAddReward({
      type: 'badge',
      rewardId: badge.id,
      displayName: badge.name,
      displayImage: badge.imageUrl,
      metadata: {
        badgeId: badge.id,
        soulbound: badge.soulbound,
      },
    });
    resetAndClose();
  };

  const resetAndClose = () => {
    setSelectedReward(null);
    setNewNft({
      name: '',
      description: '',
      imageUrl: '',
      maxSupply: '',
      soulbound: false,
    });
    setNewRaffle({
      prizeDescription: '',
      drawDate: '',
      winnerCount: '',
      entriesPerCompletion: '1',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden bg-white/5 backdrop-blur border-white/10 text-white">
        <DialogHeader>
          <h2 className="text-2xl font-bold text-white">Add Completion Reward</h2>
          <p className="text-gray-400 text-sm">
            Choose a reward to give users when they complete this campaign
          </p>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-4 bg-white/5">
            <TabsTrigger value="existing" className="data-[state=active]:bg-brand-primary">
              <Gift className="w-4 h-4 mr-2" />
              Existing
            </TabsTrigger>
            <TabsTrigger value="nft" className="data-[state=active]:bg-brand-primary">
              <Image className="w-4 h-4 mr-2" />
              NFT
            </TabsTrigger>
            <TabsTrigger value="raffle" className="data-[state=active]:bg-brand-primary">
              <Ticket className="w-4 h-4 mr-2" />
              Raffle
            </TabsTrigger>
            <TabsTrigger value="badge" className="data-[state=active]:bg-brand-primary">
              <Award className="w-4 h-4 mr-2" />
              Badge
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Existing Rewards */}
          <TabsContent value="existing" className="flex-1 overflow-y-auto space-y-4 mt-4">
            {isLoadingCatalog ? (
              <div className="text-center py-8 text-gray-400">Loading rewards...</div>
            ) : catalogRewards.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No rewards available</div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {catalogRewards.map((reward: CatalogReward) => (
                    <Card
                      key={reward.id}
                      className={`p-4 cursor-pointer transition-all bg-white/5 hover:bg-white/10 border ${
                        selectedReward === reward.id
                          ? 'border-brand-primary ring-2 ring-brand-primary'
                          : 'border-white/10'
                      }`}
                      onClick={() => setSelectedReward(reward.id)}
                    >
                      {reward.imageUrl && (
                        <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-white/5">
                          <img
                            src={reward.imageUrl}
                            alt={reward.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <h3 className="font-semibold text-white mb-2">{reward.name}</h3>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="bg-white/10 text-white">
                          {reward.type}
                        </Badge>
                        <span className="text-sm text-gray-400">{reward.pointsCost} pts</span>
                      </div>
                      {selectedReward === reward.id && (
                        <Check className="absolute top-2 right-2 w-5 h-5 text-brand-primary" />
                      )}
                    </Card>
                  ))}
                </div>
                <Button
                  onClick={handleAddExistingReward}
                  disabled={!selectedReward}
                  className="w-full bg-brand-primary hover:bg-brand-primary/80"
                >
                  Add as Completion Reward
                </Button>
              </>
            )}
          </TabsContent>

          {/* Tab 2: NFT Reward */}
          <TabsContent value="nft" className="flex-1 overflow-y-auto space-y-4 mt-4">
            <RadioGroup
              value={nftMode}
              onValueChange={(v) => setNftMode(v as 'existing' | 'create')}
            >
              <div className="flex items-center space-x-2 mb-4">
                <RadioGroupItem value="existing" id="nft-existing" />
                <Label htmlFor="nft-existing" className="text-white cursor-pointer">
                  Select Existing Collection
                </Label>
              </div>
              <div className="flex items-center space-x-2 mb-4">
                <RadioGroupItem value="create" id="nft-create" />
                <Label htmlFor="nft-create" className="text-white cursor-pointer">
                  Create New NFT
                </Label>
              </div>
            </RadioGroup>

            {nftMode === 'existing' ? (
              isLoadingNfts ? (
                <div className="text-center py-8 text-gray-400">Loading collections...</div>
              ) : nftCollections.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No NFT collections available</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {nftCollections.map((collection: NFTCollection) => (
                    <Card
                      key={collection.id}
                      className="p-4 cursor-pointer transition-all bg-white/5 hover:bg-white/10 border border-white/10"
                      onClick={() => handleAddNftCollection(collection)}
                    >
                      {collection.imageUrl && (
                        <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-white/5">
                          <img
                            src={collection.imageUrl}
                            alt={collection.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <h3 className="font-semibold text-white mb-2">{collection.name}</h3>
                      <div className="flex items-center justify-between text-sm text-gray-400">
                        <span>
                          {collection.supply}
                          {collection.maxSupply ? `/${collection.maxSupply}` : ''} minted
                        </span>
                        <Sparkles className="w-4 h-4" />
                      </div>
                    </Card>
                  ))}
                </div>
              )
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nft-name" className="text-white">
                    NFT Name
                  </Label>
                  <Input
                    id="nft-name"
                    value={newNft.name}
                    onChange={(e) => setNewNft({ ...newNft, name: e.target.value })}
                    placeholder="Enter NFT name"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nft-description" className="text-white">
                    Description
                  </Label>
                  <Input
                    id="nft-description"
                    value={newNft.description}
                    onChange={(e) => setNewNft({ ...newNft, description: e.target.value })}
                    placeholder="Enter description"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nft-image" className="text-white">
                    Image URL
                  </Label>
                  <Input
                    id="nft-image"
                    value={newNft.imageUrl}
                    onChange={(e) => setNewNft({ ...newNft, imageUrl: e.target.value })}
                    placeholder="https://..."
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nft-supply" className="text-white">
                    Max Supply (optional)
                  </Label>
                  <Input
                    id="nft-supply"
                    type="number"
                    value={newNft.maxSupply}
                    onChange={(e) => setNewNft({ ...newNft, maxSupply: e.target.value })}
                    placeholder="Unlimited"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="nft-soulbound"
                    checked={newNft.soulbound}
                    onCheckedChange={(checked) =>
                      setNewNft({ ...newNft, soulbound: checked as boolean })
                    }
                  />
                  <Label htmlFor="nft-soulbound" className="text-white cursor-pointer">
                    Soulbound (non-transferable)
                  </Label>
                </div>
                <Button
                  onClick={handleCreateNft}
                  disabled={!newNft.name}
                  className="w-full bg-brand-primary hover:bg-brand-primary/80"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create & Add NFT Reward
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Tab 3: Raffle */}
          <TabsContent value="raffle" className="flex-1 overflow-y-auto space-y-4 mt-4">
            <RadioGroup
              value={raffleMode}
              onValueChange={(v) => setRaffleMode(v as 'existing' | 'create')}
            >
              <div className="flex items-center space-x-2 mb-4">
                <RadioGroupItem value="existing" id="raffle-existing" />
                <Label htmlFor="raffle-existing" className="text-white cursor-pointer">
                  Link Existing Raffle
                </Label>
              </div>
              <div className="flex items-center space-x-2 mb-4">
                <RadioGroupItem value="create" id="raffle-create" />
                <Label htmlFor="raffle-create" className="text-white cursor-pointer">
                  Create Campaign Raffle
                </Label>
              </div>
            </RadioGroup>

            {raffleMode === 'existing' ? (
              isLoadingRaffles ? (
                <div className="text-center py-8 text-gray-400">Loading raffles...</div>
              ) : raffleRewards.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No raffles available</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {raffleRewards.map((raffle: CatalogReward) => (
                    <Card
                      key={raffle.id}
                      className="p-4 cursor-pointer transition-all bg-white/5 hover:bg-white/10 border border-white/10"
                      onClick={() => handleAddRaffleReward(raffle)}
                    >
                      {raffle.imageUrl && (
                        <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-white/5">
                          <img
                            src={raffle.imageUrl}
                            alt={raffle.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <h3 className="font-semibold text-white mb-2">{raffle.name}</h3>
                      <Badge variant="secondary" className="bg-white/10 text-white">
                        Raffle Entry
                      </Badge>
                    </Card>
                  ))}
                </div>
              )
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="raffle-prize" className="text-white">
                    Prize Description
                  </Label>
                  <Input
                    id="raffle-prize"
                    value={newRaffle.prizeDescription}
                    onChange={(e) =>
                      setNewRaffle({ ...newRaffle, prizeDescription: e.target.value })
                    }
                    placeholder="e.g., $100 Gift Card"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="raffle-date" className="text-white">
                    Draw Date
                  </Label>
                  <Input
                    id="raffle-date"
                    type="date"
                    value={newRaffle.drawDate}
                    onChange={(e) => setNewRaffle({ ...newRaffle, drawDate: e.target.value })}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="raffle-winners" className="text-white">
                    Number of Winners
                  </Label>
                  <Input
                    id="raffle-winners"
                    type="number"
                    value={newRaffle.winnerCount}
                    onChange={(e) => setNewRaffle({ ...newRaffle, winnerCount: e.target.value })}
                    placeholder="1"
                    min="1"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="raffle-entries" className="text-white">
                    Entries Per Completion
                  </Label>
                  <Input
                    id="raffle-entries"
                    type="number"
                    value={newRaffle.entriesPerCompletion}
                    onChange={(e) =>
                      setNewRaffle({ ...newRaffle, entriesPerCompletion: e.target.value })
                    }
                    placeholder="1"
                    min="1"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <Button
                  onClick={handleCreateRaffle}
                  disabled={!newRaffle.prizeDescription}
                  className="w-full bg-brand-primary hover:bg-brand-primary/80"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create & Add Raffle
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Tab 4: Badge */}
          <TabsContent value="badge" className="flex-1 overflow-y-auto space-y-4 mt-4">
            {isLoadingBadges ? (
              <div className="text-center py-8 text-gray-400">Loading badges...</div>
            ) : badgeTypes.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No badges available</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {badgeTypes.map((badge: BadgeType) => (
                  <Card
                    key={badge.id}
                    className="p-4 cursor-pointer transition-all bg-white/5 hover:bg-white/10 border border-white/10"
                    onClick={() => handleAddBadge(badge)}
                  >
                    {badge.imageUrl && (
                      <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-white/5">
                        <img
                          src={badge.imageUrl}
                          alt={badge.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <h3 className="font-semibold text-white mb-2">{badge.name}</h3>
                    {badge.soulbound && (
                      <Badge variant="secondary" className="bg-white/10 text-white">
                        Soulbound
                      </Badge>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
