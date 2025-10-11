import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, Users, Trophy, Star, Grid, List, Sparkles, Coins, Lock } from "lucide-react";
import CreatorCard from "@/components/creator/creator-card";
import NFTCard from "@/components/marketplace/nft-card";
import BlockchainFilter from "@/components/marketplace/blockchain-filter";
import { type Creator, type Reward } from "@shared/schema";
import { sampleNFTRewards } from "@/data/sampleNFTs";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import ConnectWalletButton from "@/components/auth/connect-wallet-button";

export default function Marketplace() {
  const { user } = useDynamicContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedChains, setSelectedChains] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [rarityFilter, setRarityFilter] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: creators = [], isLoading: creatorsLoading } = useQuery<Creator[]>({
    queryKey: ["/api/creators"],
  });

  const { data: rewards = sampleNFTRewards, isLoading: rewardsLoading } = useQuery<Reward[]>({
    queryKey: ["/api/rewards"],
    initialData: sampleNFTRewards,
  });

  const filteredCreators = creators.filter((creator) => {
    const matchesSearch = creator.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         creator.bio?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || creator.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Filter NFT rewards
  const nftRewards = rewards.filter(reward => reward.rewardType === "nft" && reward.rewardData?.nftMetadata);

  const filteredNFTs = nftRewards.filter((reward) => {
    const nftData = reward.rewardData?.nftMetadata;
    if (!nftData) return false;

    const matchesSearch = reward.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         reward.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         nftData.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesChain = selectedChains.length === 0 || selectedChains.includes(nftData.blockchain.toLowerCase());
    const matchesPrice = reward.pointsCost >= priceRange[0] && reward.pointsCost <= priceRange[1];
    const matchesRarity = !rarityFilter || nftData.rarity?.toLowerCase() === rarityFilter.toLowerCase();

    return matchesSearch && matchesChain && matchesPrice && matchesRarity;
  });

  const categories = ["athlete", "musician", "creator"];
  const rarities = ["common", "uncommon", "rare", "epic", "legendary"];

  const handleChainToggle = (chain: string) => {
    setSelectedChains(prev => 
      prev.includes(chain) 
        ? prev.filter(c => c !== chain)
        : [...prev, chain]
    );
  };

  const clearChainFilters = () => setSelectedChains([]);

  // Route protection: Only authenticated users can access Rewards Store
  if (!user) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mb-6">
            <Lock className="h-16 w-16 text-brand-primary mx-auto mb-4" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Rewards Store Access</h2>
          <p className="text-gray-300 mb-8">
            Please sign in to access the Rewards Store and browse exclusive NFT rewards from your favorite creators.
          </p>
          <ConnectWalletButton 
            className="w-full bg-brand-primary hover:bg-brand-primary/80 text-white font-medium px-8 py-3 rounded-xl transition-all duration-200 hover:scale-105"
            text="Sign In to Continue"
          />
        </div>
      </div>
    );
  }

  if (creatorsLoading || rewardsLoading) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-gray-300">Loading marketplace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark-bg">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-brand-dark-purple/50 to-brand-dark-bg py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl lg:text-6xl font-bold mb-6 gradient-text">
              Rewards Store
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Redeem your points for exclusive NFTs and rewards from your favorite creators across multiple blockchains.
            </p>
          </div>

          {/* Search and Filter */}
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search creators..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={selectedCategory === "" ? "default" : "outline"}
                  onClick={() => setSelectedCategory("")}
                  className={selectedCategory === "" ? "bg-brand-primary" : "border-white/20 text-gray-300"}
                >
                  All
                </Button>
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    onClick={() => setSelectedCategory(category)}
                    className={selectedCategory === category ? "bg-brand-primary" : "border-white/20 text-gray-300"}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6 text-center">
                  <Users className="h-8 w-8 text-brand-secondary mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{creators.length}</div>
                  <div className="text-sm text-gray-400">Active Creators</div>
                </CardContent>
              </Card>
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6 text-center">
                  <Sparkles className="h-8 w-8 text-brand-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{nftRewards.length}</div>
                  <div className="text-sm text-gray-400">Exclusive NFTs</div>
                </CardContent>
              </Card>
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6 text-center">
                  <Trophy className="h-8 w-8 text-brand-accent mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">2.1M</div>
                  <div className="text-sm text-gray-400">Total Fans</div>
                </CardContent>
              </Card>
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6 text-center">
                  <Coins className="h-8 w-8 text-brand-secondary mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">850K</div>
                  <div className="text-sm text-gray-400">Rewards Claimed</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Marketplace Content */}
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs defaultValue="nfts" className="w-full">
            <div className="flex justify-center mb-8">
              <TabsList className="bg-white/10 border border-white/20">
                <TabsTrigger value="nfts" className="data-[state=active]:bg-brand-primary">
                  <Sparkles className="h-4 w-4 mr-2" />
                  NFT Rewards ({filteredNFTs.length})
                </TabsTrigger>
                <TabsTrigger value="creators" className="data-[state=active]:bg-brand-primary">
                  <Users className="h-4 w-4 mr-2" />
                  Creators ({filteredCreators.length})
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="nfts" className="space-y-8">
              <div className="grid lg:grid-cols-4 gap-8">
                {/* Filters Sidebar */}
                <div className="lg:col-span-1 space-y-6">
                  <BlockchainFilter 
                    selectedChains={selectedChains}
                    onChainToggle={handleChainToggle}
                    onClear={clearChainFilters}
                  />
                  
                  {/* Rarity Filter */}
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-white mb-4">Rarity</h3>
                      <div className="space-y-2">
                        <Button
                          variant={rarityFilter === "" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setRarityFilter("")}
                          className="w-full justify-start"
                        >
                          All Rarities
                        </Button>
                        {rarities.map((rarity) => (
                          <Button
                            key={rarity}
                            variant={rarityFilter === rarity ? "default" : "outline"}
                            size="sm"
                            onClick={() => setRarityFilter(rarity)}
                            className="w-full justify-start capitalize"
                          >
                            {rarity}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Price Range */}
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-white mb-4">Point Cost</h3>
                      <div className="space-y-4">
                        <div className="flex space-x-2">
                          <Input
                            type="number"
                            placeholder="Min"
                            value={priceRange[0]}
                            onChange={(e) => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])}
                            className="bg-white/10 border-white/20 text-white"
                          />
                          <Input
                            type="number"
                            placeholder="Max"
                            value={priceRange[1]}
                            onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value) || 10000])}
                            className="bg-white/10 border-white/20 text-white"
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPriceRange([0, 10000])}
                          className="w-full"
                        >
                          Reset Price
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* NFTs Grid */}
                <div className="lg:col-span-3">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white">
                      {filteredNFTs.length} NFT{filteredNFTs.length !== 1 ? 's' : ''} Available
                    </h2>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant={viewMode === "grid" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setViewMode("grid")}
                      >
                        <Grid className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === "list" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setViewMode("list")}
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {filteredNFTs.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="text-6xl mb-4">✨</div>
                      <h3 className="text-2xl font-bold text-gray-300 mb-2">No NFTs found</h3>
                      <p className="text-gray-400">
                        Try adjusting your filters or check back later for new drops.
                      </p>
                    </div>
                  ) : (
                    <div className={`grid gap-6 ${viewMode === "grid" ? "md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"}`}>
                      {filteredNFTs.map((reward) => (
                        <NFTCard 
                          key={reward.id} 
                          reward={reward}
                          onClaim={() => console.log("Claim NFT:", reward.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="creators" className="space-y-8">
              {filteredCreators.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-2xl font-bold text-gray-300 mb-2">No creators found</h3>
                  <p className="text-gray-400">
                    {searchQuery || selectedCategory 
                      ? "Try adjusting your search or filter criteria."
                      : "No creators have joined the marketplace yet."}
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-white">
                      {filteredCreators.length} Creator{filteredCreators.length !== 1 ? 's' : ''} Found
                    </h2>
                    <div className="text-gray-400">
                      {searchQuery && `Search: "${searchQuery}"`}
                      {selectedCategory && ` • Category: ${selectedCategory}`}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {filteredCreators.map((creator) => (
                      <CreatorCard key={creator.id} creator={creator} />
                    ))}
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  );
}
