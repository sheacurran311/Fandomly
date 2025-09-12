import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CreditCard, 
  TrendingUp,
  Gift,
  Star,
  Trophy,
  Calendar,
  History,
  Target,
  Coins,
  Award
} from "lucide-react";
import SidebarNavigation from "@/components/dashboard/sidebar-navigation";

export default function FanPoints() {
  // Mock points data - in production this would come from API
  const pointsData = {
    totalPoints: 12450,
    availablePoints: 8230,
    spentPoints: 4220,
    monthlyEarned: 1850,
    currentTier: "Gold",
    nextTier: "Platinum",
    pointsToNextTier: 2550
  };

  const recentActivity = [
    { id: "1", action: "Followed on Instagram", points: 50, date: "2024-01-15", creator: "Aerial Ace Athletics" },
    { id: "2", action: "Liked Campaign Post", points: 25, date: "2024-01-14", creator: "Luna Music" },
    { id: "3", action: "Completed Survey", points: 100, date: "2024-01-14", creator: "Tech Creator Hub" },
    { id: "4", action: "Shared Content", points: 75, date: "2024-01-13", creator: "Aerial Ace Athletics" },
    { id: "5", action: "Weekly Bonus", points: 200, date: "2024-01-13", creator: "System Reward" }
  ];

  const pointsByCreator = [
    { creator: "Aerial Ace Athletics", points: 4250, campaigns: 5, color: "text-brand-primary" },
    { creator: "Luna Music", points: 3100, campaigns: 3, color: "text-brand-secondary" },
    { creator: "Tech Creator Hub", points: 5100, campaigns: 8, color: "text-yellow-400" }
  ];

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "Platinum": return "text-purple-400";
      case "Gold": return "text-yellow-400";
      case "Silver": return "text-gray-400";
      default: return "text-green-400";
    }
  };

  const tierProgress = ((pointsData.totalPoints % 10000) / 10000) * 100;

  return (
    <div className="min-h-screen bg-brand-dark-bg flex">
      <SidebarNavigation userType="fan" />
      
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
              <CreditCard className="mr-3 h-8 w-8 text-brand-primary" />
              Points Dashboard
            </h1>
            <p className="text-gray-400">
              Track your points, view earning history, and manage your rewards.
            </p>
          </div>

          {/* Points Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Points</p>
                    <p className="text-2xl font-bold text-white">{pointsData.totalPoints.toLocaleString()}</p>
                  </div>
                  <Coins className="h-8 w-8 text-brand-primary" />
                </div>
                <div className="mt-2 flex items-center text-sm">
                  <TrendingUp className="h-4 w-4 text-green-400 mr-1" />
                  <span className="text-green-400">+{pointsData.monthlyEarned.toLocaleString()}</span>
                  <span className="text-gray-400 ml-1">this month</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Available</p>
                    <p className="text-2xl font-bold text-white">{pointsData.availablePoints.toLocaleString()}</p>
                  </div>
                  <Gift className="h-8 w-8 text-brand-secondary" />
                </div>
                <div className="mt-2">
                  <Button size="sm" className="bg-brand-secondary hover:bg-brand-secondary/80 text-black text-xs">
                    Redeem
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Current Tier</p>
                    <p className={`text-2xl font-bold ${getTierColor(pointsData.currentTier)}`}>
                      {pointsData.currentTier}
                    </p>
                  </div>
                  <Trophy className="h-8 w-8 text-yellow-400" />
                </div>
                <div className="mt-2">
                  <p className="text-xs text-gray-400">Next: {pointsData.nextTier}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">This Month</p>
                    <p className="text-2xl font-bold text-white">{pointsData.monthlyEarned.toLocaleString()}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-purple-400" />
                </div>
                <div className="mt-2">
                  <p className="text-xs text-gray-400">+18% vs last month</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Tier Progress */}
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Target className="mr-2 h-5 w-5 text-brand-primary" />
                  Tier Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className={`font-medium ${getTierColor(pointsData.currentTier)}`}>
                      {pointsData.currentTier} Tier
                    </span>
                    <span className="text-sm text-gray-400">
                      {pointsData.pointsToNextTier.toLocaleString()} to {pointsData.nextTier}
                    </span>
                  </div>
                  <Progress value={tierProgress} className="h-3" />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{Math.floor(pointsData.totalPoints / 10000) * 10000}</span>
                    <span>{(Math.floor(pointsData.totalPoints / 10000) + 1) * 10000}</span>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <h4 className="text-white font-medium">{pointsData.nextTier} Benefits:</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• 2x points multiplier on all activities</li>
                    <li>• Exclusive platinum-tier rewards</li>
                    <li>• Priority customer support</li>
                    <li>• Early access to new campaigns</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Points by Creator */}
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Award className="mr-2 h-5 w-5 text-brand-secondary" />
                  Points by Creator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pointsByCreator.map((creator, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full bg-current ${creator.color}`}></div>
                        <div>
                          <p className="text-white font-medium">{creator.creator}</p>
                          <p className="text-xs text-gray-400">{creator.campaigns} campaigns</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-medium">{creator.points.toLocaleString()}</p>
                        <p className="text-xs text-gray-400">points</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="bg-white/5 backdrop-blur-lg border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span className="flex items-center">
                  <History className="mr-2 h-5 w-5" />
                  Recent Activity
                </span>
                <Button variant="outline" size="sm" className="border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10">
                  View All History
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-brand-primary/20 rounded-full flex items-center justify-center">
                        <Star className="h-5 w-5 text-brand-primary" />
                      </div>
                      <div>
                        <h4 className="text-white font-medium">{activity.action}</h4>
                        <p className="text-sm text-gray-400">{activity.creator}</p>
                        <p className="text-xs text-gray-500">{activity.date}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-lg font-bold text-brand-secondary">+{activity.points}</p>
                      <p className="text-xs text-gray-400">points</p>
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
