import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Coins, ExternalLink, Sparkles, Zap } from "lucide-react";
import { type Reward } from "@shared/schema";

interface NFTCardProps {
  reward: Reward;
  onClaim?: () => void;
  showClaimButton?: boolean;
}

function NFTCard({ reward, onClaim, showClaimButton = true }: NFTCardProps) {
  const nftData = reward.rewardData?.nftMetadata;
  
  if (!nftData) return null;

  const getBlockchainColor = (blockchain: string) => {
    switch (blockchain.toLowerCase()) {
      case "ethereum": return "bg-blue-500";
      case "solana": return "bg-purple-500"; 
      case "polygon": return "bg-violet-500";
      case "bsc": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  const getRarityColor = (rarity?: string) => {
    switch (rarity?.toLowerCase()) {
      case "legendary": return "text-yellow-400 border-yellow-400";
      case "epic": return "text-purple-400 border-purple-400";
      case "rare": return "text-blue-400 border-blue-400";
      case "uncommon": return "text-green-400 border-green-400";
      default: return "text-gray-400 border-gray-400";
    }
  };

  return (
    <Card className="group bg-white/5 border-white/10 hover:border-brand-primary/50 transition-all duration-300 hover:scale-105 overflow-hidden">
      <div className="relative">
        <img 
          src={nftData.image} 
          alt={nftData.name}
          className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="%23374151"/><text x="150" y="150" text-anchor="middle" dy=".3em" fill="%23fff" font-size="16">NFT Image</text></svg>`;
          }}
        />
        
        {/* Blockchain Badge */}
        <div className="absolute top-3 left-3">
          <Badge className={`${getBlockchainColor(nftData.blockchain)} text-white border-0`}>
            {nftData.blockchain.toUpperCase()}
          </Badge>
        </div>

        {/* Rarity Badge */}
        {nftData.rarity && (
          <div className="absolute top-3 right-3">
            <Badge variant="outline" className={`${getRarityColor(nftData.rarity)} backdrop-blur-sm bg-black/20`}>
              <Sparkles className="h-3 w-3 mr-1" />
              {nftData.rarity}
            </Badge>
          </div>
        )}

        {/* Collection Badge */}
        {nftData.collection && (
          <div className="absolute bottom-3 left-3">
            <Badge variant="outline" className="text-white border-white/30 backdrop-blur-sm bg-black/20">
              {nftData.collection}
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">{nftData.name}</h3>
            <p className="text-gray-300 text-sm line-clamp-2">{nftData.description}</p>
          </div>

          {/* Attributes */}
          {nftData.attributes && nftData.attributes.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-300">Attributes</h4>
              <div className="grid grid-cols-2 gap-2">
                {nftData.attributes.slice(0, 4).map((attr, index) => (
                  <div key={index} className="bg-white/5 rounded-lg p-2">
                    <div className="text-xs text-gray-400">{attr.trait_type}</div>
                    <div className="text-sm font-medium text-white">{attr.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cost */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Coins className="h-5 w-5 text-brand-secondary" />
              <span className="text-lg font-bold text-brand-secondary">
                {reward.pointsCost.toLocaleString()}
              </span>
              <span className="text-sm text-gray-400">points</span>
            </div>
            
            {nftData.contractAddress && (
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white p-2"
                onClick={() => window.open(`https://etherscan.io/address/${nftData.contractAddress}`, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Claim Button */}
          {showClaimButton && (
            <Button 
              onClick={onClaim}
              className="w-full bg-gradient-to-r from-brand-primary to-brand-accent hover:from-brand-primary/80 hover:to-brand-accent/80 text-white font-semibold"
              disabled={reward.maxRedemptions !== null && (reward.currentRedemptions || 0) >= reward.maxRedemptions}
            >
              <Zap className="h-4 w-4 mr-2" />
              {reward.maxRedemptions !== null && (reward.currentRedemptions || 0) >= reward.maxRedemptions 
                ? "Sold Out" 
                : "Claim NFT"
              }
            </Button>
          )}

          {/* Availability */}
          {reward.maxRedemptions !== null && (
            <div className="text-xs text-gray-400 text-center">
              {reward.maxRedemptions - (reward.currentRedemptions || 0)} of {reward.maxRedemptions} remaining
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default memo(NFTCard);