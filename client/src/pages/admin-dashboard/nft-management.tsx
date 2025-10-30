import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Image, Award, Send } from "lucide-react";
import AdminBadgeManager from "@/components/admin/AdminBadgeManager";
import AdminNftDistribution from "@/components/admin/AdminNftDistribution";

export default function AdminNftManagement() {
  return (
    <AdminLayout
      title="NFT Management"
      description="Manage platform NFTs, badges, and distribution"
    >
      <Tabs defaultValue="badges" className="space-y-6">
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="badges" className="data-[state=active]:bg-brand-primary">
            <Award className="h-4 w-4 mr-2" />
            Badge Templates
          </TabsTrigger>
          <TabsTrigger value="platform-nfts" className="data-[state=active]:bg-brand-primary">
            <Image className="h-4 w-4 mr-2" />
            Platform NFTs
          </TabsTrigger>
          <TabsTrigger value="distribution" className="data-[state=active]:bg-brand-primary">
            <Send className="h-4 w-4 mr-2" />
            Distribution
          </TabsTrigger>
        </TabsList>

        <TabsContent value="badges">
          <AdminBadgeManager />
        </TabsContent>

        <TabsContent value="platform-nfts">
          <AdminNftDistribution type="platform" />
        </TabsContent>

        <TabsContent value="distribution">
          <AdminNftDistribution type="distribution" />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}

