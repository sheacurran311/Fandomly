import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  Search, 
  Filter, 
  TrendingUp,
  Heart,
  Star,
  MoreVertical,
  UserPlus,
  MessageCircle
} from "lucide-react";
import SidebarNavigation from "@/components/dashboard/sidebar-navigation";

export default function CreatorFans() {
  // Mock fan data - in production this would come from API
  const fans = [
    {
      id: "1",
      name: "Alex Johnson",
      email: "alex@example.com",
      joinDate: "2024-01-15",
      totalPoints: 2450,
      tier: "Gold",
      lastActive: "2 hours ago",
      campaigns: 5
    },
    {
      id: "2", 
      name: "Sarah Chen",
      email: "sarah@example.com",
      joinDate: "2024-02-03",
      totalPoints: 1890,
      tier: "Silver",
      lastActive: "1 day ago",
      campaigns: 3
    },
    {
      id: "3",
      name: "Mike Rodriguez",
      email: "mike@example.com", 
      joinDate: "2024-01-28",
      totalPoints: 3200,
      tier: "Platinum",
      lastActive: "30 minutes ago",
      campaigns: 8
    }
  ];

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "Platinum": return "bg-purple-500/20 text-purple-400";
      case "Gold": return "bg-yellow-500/20 text-yellow-400";
      case "Silver": return "bg-gray-500/20 text-gray-400";
      default: return "bg-green-500/20 text-green-400";
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark-bg flex">
      <SidebarNavigation userType="creator" />
      
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
              <Users className="mr-3 h-8 w-8 text-brand-primary" />
              Fan Management
            </h1>
            <p className="text-gray-400">
              Manage your fan community and track engagement across campaigns.
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Fans</p>
                    <p className="text-2xl font-bold text-white">2,847</p>
                  </div>
                  <Users className="h-8 w-8 text-brand-primary" />
                </div>
                <div className="mt-2 flex items-center text-sm">
                  <TrendingUp className="h-4 w-4 text-green-400 mr-1" />
                  <span className="text-green-400">+12.5%</span>
                  <span className="text-gray-400 ml-1">this month</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Active Fans</p>
                    <p className="text-2xl font-bold text-white">1,923</p>
                  </div>
                  <Heart className="h-8 w-8 text-red-400" />
                </div>
                <div className="mt-2">
                  <p className="text-xs text-gray-400">67% engagement rate</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Top Tier Fans</p>
                    <p className="text-2xl font-bold text-white">156</p>
                  </div>
                  <Star className="h-8 w-8 text-yellow-400" />
                </div>
                <div className="mt-2">
                  <p className="text-xs text-gray-400">Platinum & Gold</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">New This Week</p>
                    <p className="text-2xl font-bold text-white">47</p>
                  </div>
                  <UserPlus className="h-8 w-8 text-brand-secondary" />
                </div>
                <div className="mt-2">
                  <p className="text-xs text-gray-400">+8% vs last week</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Fan Management */}
          <Card className="bg-white/5 backdrop-blur-lg border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span>Fan Community</span>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search fans..."
                      className="pl-10 bg-white/10 border-white/20 text-white w-64"
                    />
                  </div>
                  <Button variant="outline" size="sm" className="border-white/20 text-white">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fans.map((fan) => (
                  <div key={fan.id} className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-full flex items-center justify-center">
                          <span className="text-white font-medium">{fan.name[0]}</span>
                        </div>
                        <div>
                          <h4 className="text-white font-medium">{fan.name}</h4>
                          <p className="text-sm text-gray-400">{fan.email}</p>
                          <div className="flex items-center space-x-3 mt-1">
                            <span className="text-xs text-gray-500">Joined {fan.joinDate}</span>
                            <span className="text-xs text-gray-500">•</span>
                            <span className="text-xs text-gray-500">Last active {fan.lastActive}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-sm font-medium text-white">{fan.totalPoints.toLocaleString()} pts</p>
                          <Badge className={getTierColor(fan.tier)}>{fan.tier}</Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-400">{fan.campaigns} campaigns</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="outline" className="border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10">
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
