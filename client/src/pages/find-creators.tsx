import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Search, Users, Trophy, TrendingUp, Sparkles, Zap, CheckCircle } from "lucide-react";
import CreatorCard from "@/components/creator/creator-card";
import { type Creator } from "@shared/schema";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import { useAuthModal } from "@/hooks/use-auth-modal";

export default function FindCreators() {
  const { user: userData, isAuthenticated } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [sortBy, setSortBy] = useState<"all" | "active" | "verified">("all");
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);

  type CreatorWithExtras = Creator & { user?: { username?: string; profileData?: { avatar?: string; bannerImage?: string } }; tenant?: { slug?: string; branding?: { bannerUrl?: string; logoUrl?: string } }; program?: { id?: string; name?: string }; isLive?: boolean; isVerified?: boolean; hasPublishedProgram?: boolean };
  const { data: creators = [], isLoading, error, isError } = useQuery<CreatorWithExtras[]>({
    queryKey: ["/api/creators"],
    retry: 1,
    staleTime: 30000, // 30 seconds
  });

  // Debug logging
  console.log('Find Creators - Query Status:', { isLoading, isError, error });
  console.log('Find Creators - Total creators from API:', creators.length);
  console.log('Find Creators - User data:', { userData: !!userData, userType: userData?.userType });
  console.log('Find Creators - Filters active:', { 
    showActiveOnly, 
    showVerifiedOnly, 
    selectedCategory,
    sortBy 
  });
  
  // Debug: Log banner image data for first few creators
  if (creators.length > 0) {
    console.log('Find Creators - Image data sample:', creators.slice(0, 3).map((c: CreatorWithExtras) => ({
      displayName: c.displayName,
      imageUrl: c.imageUrl,
      userProfileAvatar: c.user?.profileData?.avatar,
      userProfileBanner: c.user?.profileData?.bannerImage,
      tenantBrandingBanner: c.tenant?.branding?.bannerUrl,
      tenantBrandingLogo: c.tenant?.branding?.logoUrl
    })));
  }

  const handleUnauthenticatedClick = () => {
    // Trigger auth modal for unauthenticated users
    openAuthModal();
  };

  const filteredCreators = creators.filter((creator: any) => {
    const matchesSearch = !searchQuery ||
      creator.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      creator.bio?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || creator.category === selectedCategory;

    // Filter by active status - only apply if toggle is ON
    const matchesActive = !showActiveOnly || (creator as CreatorWithExtras).isLive;

    // Filter by verified status - only apply if toggle is ON
    const matchesVerified = !showVerifiedOnly || (creator as CreatorWithExtras).isVerified;

    // IMPORTANT: Only show creators who have at least one published program
    // This prevents showing creators who haven't set up their program yet
    const hasPublishedProgram = creator.hasPublishedProgram === true;

    return matchesSearch && matchesCategory && matchesActive && matchesVerified && hasPublishedProgram;
  });

  console.log('Find Creators - After filtering:', filteredCreators.length);

  // Sort creators - default is newest first
  const sortedCreators = [...filteredCreators].sort((a, b) => {
    const aDate = (a as Creator).createdAt ? new Date((a as Creator).createdAt!).getTime() : 0;
    const bDate = (b as Creator).createdAt ? new Date((b as Creator).createdAt!).getTime() : 0;
    if (sortBy === "active") {
      const aLive = (a as CreatorWithExtras).isLive;
      const bLive = (b as CreatorWithExtras).isLive;
      if (aLive !== bLive) return bLive ? 1 : -1;
      return bDate - aDate;
    } else if (sortBy === "verified") {
      const aVerified = (a as CreatorWithExtras).isVerified;
      const bVerified = (b as CreatorWithExtras).isVerified;
      if (aVerified !== bVerified) return bVerified ? 1 : -1;
      return bDate - aDate;
    }
    return bDate - aDate;
  });

  const categories = ["athlete", "musician", "creator", "brand"];

  if (isLoading) {
    const loadingContent = (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-gray-300">Loading creators...</p>
        </div>
      </div>
    );
    
    // Only wrap in DashboardLayout if user has a valid userType (not null/pending)
    return userData && userData.userType ? (
      <DashboardLayout userType={userData.userType as "fan" | "creator"}>
        {loadingContent}
      </DashboardLayout>
    ) : loadingContent;
  }

  const content = (
    <div className="min-h-screen bg-brand-dark-bg">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-brand-dark-purple/50 to-brand-dark-bg py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl lg:text-6xl font-bold mb-6 gradient-text">
              Find Creators
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Discover your favorite athletes, musicians, and content creators. Enroll in their programs and participate in exclusive campaigns.
            </p>
          </div>

          {/* Search and Filter */}
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
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

            {/* Advanced Filters */}
            <div className="flex flex-wrap gap-4 mb-8 bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="active-only" 
                  checked={showActiveOnly}
                  onCheckedChange={setShowActiveOnly}
                />
                <Label htmlFor="active-only" className="text-gray-300 cursor-pointer flex items-center gap-1">
                  <Zap className="h-4 w-4 text-green-400" />
                  Active Only
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch 
                  id="verified-only"
                  checked={showVerifiedOnly}
                  onCheckedChange={setShowVerifiedOnly}
                />
                <Label htmlFor="verified-only" className="text-gray-300 cursor-pointer flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-brand-secondary" />
                  Verified Only
                </Label>
              </div>
              <div className="ml-auto text-sm text-gray-400">
                {creators.filter((c: any) => c.isLive).length} active • {creators.filter((c: any) => c.isVerified).length} verified
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6 text-center">
                  <Users className="h-8 w-8 text-brand-secondary mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{creators.length}</div>
                  <div className="text-sm text-gray-400">Total Creators</div>
                </CardContent>
              </Card>
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6 text-center">
                  <Sparkles className="h-8 w-8 text-brand-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{creators.filter(c => c.category === 'athlete').length}</div>
                  <div className="text-sm text-gray-400">Athletes</div>
                </CardContent>
              </Card>
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6 text-center">
                  <Trophy className="h-8 w-8 text-brand-accent mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{creators.filter(c => c.category === 'musician').length}</div>
                  <div className="text-sm text-gray-400">Musicians</div>
                </CardContent>
              </Card>
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6 text-center">
                  <TrendingUp className="h-8 w-8 text-green-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{creators.filter(c => c.category === 'creator').length}</div>
                  <div className="text-sm text-gray-400">Content Creators</div>
                </CardContent>
              </Card>
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6 text-center">
                  <Zap className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{creators.filter(c => c.category === 'brand').length}</div>
                  <div className="text-sm text-gray-400">Brands</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Creators Content */}
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs defaultValue="all" className="w-full" onValueChange={(value) => setSortBy(value as "all" | "active" | "verified")}>
            <div className="flex justify-center mb-8">
              <TabsList className="bg-white/10 border border-white/20">
                <TabsTrigger value="all" className="data-[state=active]:bg-brand-primary">
                  <Users className="h-4 w-4 mr-2" />
                  All Creators
                </TabsTrigger>
                <TabsTrigger value="active" className="data-[state=active]:bg-brand-primary">
                  <Zap className="h-4 w-4 mr-2" />
                  Active
                </TabsTrigger>
                <TabsTrigger value="verified" className="data-[state=active]:bg-brand-primary">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Verified
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="space-y-8">
              {sortedCreators.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-2xl font-bold text-gray-300 mb-2">No creators found</h3>
                  <p className="text-gray-400">
                    {searchQuery || selectedCategory 
                      ? "Try adjusting your search or filter criteria."
                      : "No creators have joined yet."}
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-white">
                      {sortedCreators.length} Creator{sortedCreators.length !== 1 ? 's' : ''} Found
                    </h2>
                    <div className="text-gray-400">
                      {searchQuery && `Search: "${searchQuery}"`}
                      {selectedCategory && ` • Category: ${selectedCategory}`}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {sortedCreators.map((creator) => (
                      <CreatorCard 
                        key={creator.id} 
                        creator={creator as Creator}
                        onUnauthenticatedClick={!userData ? handleUnauthenticatedClick : undefined}
                      />
                    ))}
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="active" className="space-y-8">
              {sortedCreators.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-2xl font-bold text-gray-300 mb-2">No creators found</h3>
                  <p className="text-gray-400">
                    {searchQuery || selectedCategory 
                      ? "Try adjusting your search or filter criteria."
                      : "No creators have joined yet."}
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-white">
                      {sortedCreators.length} Creator{sortedCreators.length !== 1 ? 's' : ''} Found
                    </h2>
                    <div className="text-gray-400">
                      {searchQuery && `Search: "${searchQuery}"`}
                      {selectedCategory && ` • Category: ${selectedCategory}`}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {sortedCreators.map((creator) => (
                      <CreatorCard 
                        key={creator.id} 
                        creator={creator as Creator}
                        onUnauthenticatedClick={!userData ? handleUnauthenticatedClick : undefined}
                      />
                    ))}
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="verified" className="space-y-8">
              {sortedCreators.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-2xl font-bold text-gray-300 mb-2">No creators found</h3>
                  <p className="text-gray-400">
                    {searchQuery || selectedCategory 
                      ? "Try adjusting your search or filter criteria."
                      : "No creators have joined yet."}
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-white">
                      {sortedCreators.length} Creator{sortedCreators.length !== 1 ? 's' : ''} Found
                    </h2>
                    <div className="text-gray-400">
                      {searchQuery && `Search: "${searchQuery}"`}
                      {selectedCategory && ` • Category: ${selectedCategory}`}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {sortedCreators.map((creator) => (
                      <CreatorCard 
                        key={creator.id} 
                        creator={creator as Creator}
                        onUnauthenticatedClick={!userData ? handleUnauthenticatedClick : undefined}
                      />
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

  // Only wrap in DashboardLayout if user has a valid userType (not null/pending)
  return userData && userData.userType ? (
    <DashboardLayout userType={userData.userType as "fan" | "creator"}>
      {content}
    </DashboardLayout>
  ) : content;
}
