import DashboardLayout from "@/components/layout/dashboard-layout";
import NFTGallery from "@/components/nft/NFTGallery";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Sparkles } from "lucide-react";

export default function FanNftCollection() {
  return (
    <DashboardLayout userType="fan">
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">My NFT Collection</h1>
          <p className="text-gray-400">
            View all your digital collectibles, badges, and rewards
          </p>
        </div>

        <Alert className="mb-6 bg-purple-500/10 border-purple-500/20">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <AlertDescription className="text-purple-400 text-sm">
            Your NFTs are stored securely in your connected wallets across multiple blockchains. Complete more tasks and redeem rewards to grow your collection!
          </AlertDescription>
        </Alert>

        <NFTGallery showFilters={true} />
      </div>
    </DashboardLayout>
  );
}

