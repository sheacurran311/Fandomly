import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Filter, X } from "lucide-react";

interface BlockchainFilterProps {
  selectedChains: string[];
  onChainToggle: (chain: string) => void;
  onClear: () => void;
}

const SUPPORTED_CHAINS = [
  { id: "ethereum", name: "Ethereum", color: "bg-blue-500", icon: "Ξ" },
  { id: "solana", name: "Solana", color: "bg-purple-500", icon: "◎" },
  { id: "polygon", name: "Polygon", color: "bg-violet-500", icon: "⬟" },
  { id: "bsc", name: "BSC", color: "bg-yellow-500", icon: "◈" },
  { id: "arbitrum", name: "Arbitrum", color: "bg-cyan-500", icon: "⬟" },
  { id: "optimism", name: "Optimism", color: "bg-red-500", icon: "⭕" },
];

export default function BlockchainFilter({ selectedChains, onChainToggle, onClear }: BlockchainFilterProps) {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-brand-primary" />
            <h3 className="font-semibold text-white">Blockchain Networks</h3>
          </div>
          {selectedChains.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="text-gray-400 hover:text-white p-2"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {SUPPORTED_CHAINS.map((chain) => {
            const isSelected = selectedChains.includes(chain.id);
            return (
              <Button
                key={chain.id}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => onChainToggle(chain.id)}
                className={`justify-start space-x-2 ${
                  isSelected 
                    ? `${chain.color} hover:opacity-80 text-white border-0` 
                    : "border-white/20 text-gray-300 hover:text-white hover:border-white/40"
                }`}
              >
                <span className="font-bold text-lg">{chain.icon}</span>
                <span>{chain.name}</span>
              </Button>
            );
          })}
        </div>

        {selectedChains.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="text-sm text-gray-400 mb-2">Active Filters:</div>
            <div className="flex flex-wrap gap-2">
              {selectedChains.map((chainId) => {
                const chain = SUPPORTED_CHAINS.find(c => c.id === chainId);
                if (!chain) return null;
                return (
                  <Badge
                    key={chainId}
                    className={`${chain.color} text-white cursor-pointer`}
                    onClick={() => onChainToggle(chainId)}
                  >
                    {chain.icon} {chain.name}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}