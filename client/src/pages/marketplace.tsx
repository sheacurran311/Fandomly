import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Filter, Users, Trophy, Star } from "lucide-react";
import CreatorCard from "@/components/creator/creator-card";
import { type Creator } from "@shared/schema";

export default function Marketplace() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const { data: creators = [], isLoading } = useQuery<Creator[]>({
    queryKey: ["/api/creators"],
  });

  const filteredCreators = creators.filter((creator) => {
    const matchesSearch = creator.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         creator.bio?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || creator.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ["athlete", "musician", "creator"];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-gray-300">Loading creators...</p>
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
              Creator Marketplace
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Discover amazing creators and join their exclusive loyalty programs. Earn rewards, get exclusive access, and support your favorites.
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6 text-center">
                  <Users className="h-8 w-8 text-brand-secondary mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{creators.length}</div>
                  <div className="text-sm text-gray-400">Active Creators</div>
                </CardContent>
              </Card>
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6 text-center">
                  <Trophy className="h-8 w-8 text-brand-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">2.1M</div>
                  <div className="text-sm text-gray-400">Total Fans</div>
                </CardContent>
              </Card>
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6 text-center">
                  <Star className="h-8 w-8 text-brand-accent mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">850K</div>
                  <div className="text-sm text-gray-400">Rewards Claimed</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Creators Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
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
        </div>
      </section>
    </div>
  );
}
