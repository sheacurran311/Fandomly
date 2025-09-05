import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Users, TrendingUp, Star, ExternalLink, Instagram, Twitter } from "lucide-react";

interface NILAthlete {
  id: string;
  name: string;
  sport: string;
  school: string;
  profileImage: string;
  nilValue: number;
  fanCount: number;
  socialFollowers: {
    instagram: number;
    twitter: number;
  };
  recentDeals: {
    brand: string;
    value: number;
    type: string;
  }[];
  loyaltyStats: {
    programName: string;
    activeMembers: number;
    monthlyGrowth: number;
  };
}

const featuredAthletes: NILAthlete[] = [
  {
    id: "1",
    name: "Sarah Mitchell",
    sport: "Basketball",
    school: "Duke University",
    profileImage: "",
    nilValue: 45000,
    fanCount: 12500,
    socialFollowers: {
      instagram: 8500,
      twitter: 4000
    },
    recentDeals: [
      { brand: "Nike", value: 15000, type: "Endorsement" },
      { brand: "Gatorade", value: 8000, type: "Social Campaign" }
    ],
    loyaltyStats: {
      programName: "Blue Devil Rewards",
      activeMembers: 2100,
      monthlyGrowth: 25
    }
  },
  {
    id: "2",
    name: "Marcus Johnson",
    sport: "Football",
    school: "Ohio State",
    profileImage: "",
    nilValue: 78000,
    fanCount: 18700,
    socialFollowers: {
      instagram: 15200,
      twitter: 3500
    },
    recentDeals: [
      { brand: "Under Armour", value: 25000, type: "Apparel Deal" },
      { brand: "Local Dealership", value: 12000, type: "Appearance" }
    ],
    loyaltyStats: {
      programName: "Buckeye Nation",
      activeMembers: 3400,
      monthlyGrowth: 42
    }
  }
];

export default function NILAthleteSpotlight() {
  return (
    <section className="py-16 bg-gradient-to-b from-brand-dark-bg to-brand-dark-purple/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4 gradient-text">
            NIL Success Stories
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            See how college athletes are building their personal brands and monetizing their NIL through Fandomly loyalty programs.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {featuredAthletes.map((athlete) => (
            <Card key={athlete.id} className="bg-white/5 backdrop-blur-lg border-white/10 hover:border-brand-primary/50 transition-all duration-300">
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={athlete.profileImage} alt={athlete.name} />
                    <AvatarFallback className="bg-brand-primary text-white font-bold text-lg">
                      {athlete.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CardTitle className="text-white text-xl">{athlete.name}</CardTitle>
                    <p className="text-gray-300">{athlete.sport} • {athlete.school}</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <Badge variant="secondary" className="bg-brand-secondary/20 text-brand-secondary">
                        ${athlete.nilValue.toLocaleString()} NIL Value
                      </Badge>
                      <div className="flex items-center text-gray-400 text-sm">
                        <Users className="h-4 w-4 mr-1" />
                        {athlete.fanCount.toLocaleString()} fans
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Social Media Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <Instagram className="h-4 w-4 text-pink-400" />
                      <span className="text-sm text-gray-300">Instagram</span>
                    </div>
                    <p className="text-lg font-semibold text-white">
                      {athlete.socialFollowers.instagram.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <Twitter className="h-4 w-4 text-blue-400" />
                      <span className="text-sm text-gray-300">Twitter</span>
                    </div>
                    <p className="text-lg font-semibold text-white">
                      {athlete.socialFollowers.twitter.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Recent NIL Deals */}
                <div>
                  <h4 className="font-semibold text-white mb-3 flex items-center">
                    <Trophy className="h-4 w-4 mr-2 text-amber-400" />
                    Recent NIL Deals
                  </h4>
                  <div className="space-y-2">
                    {athlete.recentDeals.map((deal, index) => (
                      <div key={index} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                        <div>
                          <p className="font-medium text-white">{deal.brand}</p>
                          <p className="text-sm text-gray-400">{deal.type}</p>
                        </div>
                        <Badge variant="outline" className="border-brand-accent text-brand-accent">
                          ${deal.value.toLocaleString()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Loyalty Program Stats */}
                <div>
                  <h4 className="font-semibold text-white mb-3 flex items-center">
                    <Star className="h-4 w-4 mr-2 text-brand-primary" />
                    Fandomly Program Performance
                  </h4>
                  <div className="bg-brand-primary/10 border border-brand-primary/20 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-brand-primary">{athlete.loyaltyStats.programName}</p>
                      <TrendingUp className="h-4 w-4 text-brand-secondary" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-300">Active Members</p>
                        <p className="font-semibold text-white">{athlete.loyaltyStats.activeMembers.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-300">Monthly Growth</p>
                        <p className="font-semibold text-brand-secondary">+{athlete.loyaltyStats.monthlyGrowth}%</p>
                      </div>
                    </div>
                  </div>
                </div>

                <Button className="w-full bg-brand-primary hover:bg-brand-primary/80 text-white">
                  View Full Profile
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button 
            variant="outline" 
            size="lg"
            className="border-2 border-[#101636] text-[#101636] hover:bg-[#101636] hover:text-white"
          >
            See All NIL Success Stories
          </Button>
        </div>
      </div>
    </section>
  );
}