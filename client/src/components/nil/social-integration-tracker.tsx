import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Instagram, 
  Twitter, 
  Facebook, 
  Youtube, 
  TrendingUp, 
  Users, 
  Heart, 
  MessageCircle, 
  Share2, 
  Eye,
  Target,
  Award,
  CheckCircle
} from "lucide-react";

interface SocialMetrics {
  platform: string;
  icon: any;
  color: string;
  connected: boolean;
  followers: number;
  engagement: number;
  recentPosts: {
    id: string;
    content: string;
    likes: number;
    comments: number;
    shares: number;
    nilValue: number;
    timestamp: string;
  }[];
  nilEarnings: {
    month: number;
    sponsored: number;
    organic: number;
  };
}

export default function SocialIntegrationTracker() {
  const [activeTab, setActiveTab] = useState("overview");
  
  const socialPlatforms: SocialMetrics[] = [
    {
      platform: "Instagram",
      icon: Instagram,
      color: "text-pink-400",
      connected: true,
      followers: 12500,
      engagement: 4.2,
      recentPosts: [
        {
          id: "1",
          content: "Game day ready! 🏀 #GameDay #NIL",
          likes: 890,
          comments: 67,
          shares: 23,
          nilValue: 150,
          timestamp: "2 hours ago"
        },
        {
          id: "2", 
          content: "Training session with @nike gear 💪",
          likes: 1205,
          comments: 89,
          shares: 45,
          nilValue: 275,
          timestamp: "1 day ago"
        }
      ],
      nilEarnings: {
        month: 1250,
        sponsored: 800,
        organic: 450
      }
    },
    {
      platform: "Twitter",
      icon: Twitter,
      color: "text-blue-400",
      connected: true,
      followers: 8200,
      engagement: 3.8,
      recentPosts: [
        {
          id: "1",
          content: "Excited for tonight's game! See you all there 🔥",
          likes: 445,
          comments: 34,
          shares: 67,
          nilValue: 85,
          timestamp: "4 hours ago"
        }
      ],
      nilEarnings: {
        month: 680,
        sponsored: 400,
        organic: 280
      }
    },
    {
      platform: "TikTok",
      icon: Youtube,
      color: "text-purple-400",
      connected: false,
      followers: 0,
      engagement: 0,
      recentPosts: [],
      nilEarnings: {
        month: 0,
        sponsored: 0,
        organic: 0
      }
    }
  ];

  const totalEarnings = socialPlatforms.reduce((sum, platform) => sum + platform.nilEarnings.month, 0);
  const connectedPlatforms = socialPlatforms.filter(p => p.connected).length;

  const nilGoals = [
    { title: "Reach 15K Instagram Followers", current: 12500, target: 15000, reward: "$500 bonus" },
    { title: "Post 20 NIL-Tagged Content", current: 14, target: 20, reward: "Premium features" },
    { title: "Connect TikTok Account", current: 0, target: 1, reward: "Unlock TikTok tracking" }
  ];

  return (
    <section className="py-16 bg-gradient-to-b from-brand-dark-bg to-brand-dark-purple/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4 gradient-text">
            Social Media NIL Tracker
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Track your social media performance and NIL earnings across all platforms. Optimize your content strategy for maximum monetization.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-7xl mx-auto">
          <TabsList className="grid w-full grid-cols-4 bg-white/5 border border-white/10">
            <TabsTrigger value="overview" className="data-[state=active]:bg-brand-primary">Overview</TabsTrigger>
            <TabsTrigger value="platforms" className="data-[state=active]:bg-brand-primary">Platforms</TabsTrigger>
            <TabsTrigger value="content" className="data-[state=active]:bg-brand-primary">Content</TabsTrigger>
            <TabsTrigger value="goals" className="data-[state=active]:bg-brand-primary">NIL Goals</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-8">
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {/* Total NIL Earnings */}
              <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-white">Monthly NIL Earnings</h3>
                    <TrendingUp className="h-5 w-5 text-brand-secondary" />
                  </div>
                  <div className="text-3xl font-bold text-brand-secondary mb-2">
                    ${totalEarnings.toLocaleString()}
                  </div>
                  <p className="text-sm text-gray-400">+24% from last month</p>
                </CardContent>
              </Card>

              {/* Connected Platforms */}
              <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-white">Connected Platforms</h3>
                    <Share2 className="h-5 w-5 text-brand-primary" />
                  </div>
                  <div className="text-3xl font-bold text-brand-primary mb-2">
                    {connectedPlatforms}/3
                  </div>
                  <p className="text-sm text-gray-400">Connect TikTok to unlock more value</p>
                </CardContent>
              </Card>

              {/* Average Engagement */}
              <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-white">Avg. Engagement Rate</h3>
                    <Heart className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="text-3xl font-bold text-red-400 mb-2">
                    {(socialPlatforms.filter(p => p.connected).reduce((sum, p) => sum + p.engagement, 0) / connectedPlatforms).toFixed(1)}%
                  </div>
                  <p className="text-sm text-gray-400">Above industry average</p>
                </CardContent>
              </Card>
            </div>

            {/* Platform Overview */}
            <div className="grid md:grid-cols-3 gap-6">
              {socialPlatforms.map((platform) => {
                const Icon = platform.icon;
                return (
                  <Card key={platform.platform} className="bg-white/5 backdrop-blur-lg border-white/10">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Icon className={`h-5 w-5 ${platform.color}`} />
                          <span className="text-white">{platform.platform}</span>
                        </div>
                        {platform.connected ? (
                          <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                            Connected
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-gray-500/20 text-gray-400">
                            Disconnected
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {platform.connected ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-400">Followers</p>
                              <p className="text-lg font-semibold text-white">
                                {platform.followers.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Engagement</p>
                              <p className="text-lg font-semibold text-white">
                                {platform.engagement}%
                              </p>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-gray-400 mb-1">Monthly NIL Earnings</p>
                            <p className="text-xl font-bold text-brand-secondary">
                              ${platform.nilEarnings.month}
                            </p>
                            <div className="text-xs text-gray-500 mt-1">
                              Sponsored: ${platform.nilEarnings.sponsored} | Organic: ${platform.nilEarnings.organic}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-gray-400 mb-4">Connect to start tracking NIL value</p>
                          <Button className="bg-brand-primary hover:bg-brand-primary/80">
                            Connect {platform.platform}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="content" className="mt-8">
            <div className="space-y-6">
              {socialPlatforms.filter(p => p.connected).map((platform) => {
                const Icon = platform.icon;
                return (
                  <Card key={platform.platform} className="bg-white/5 backdrop-blur-lg border-white/10">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Icon className={`h-5 w-5 ${platform.color}`} />
                        <span className="text-white">{platform.platform} Recent Posts</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {platform.recentPosts.map((post) => (
                          <div key={post.id} className="bg-white/5 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-3">
                              <p className="text-white flex-1 mr-4">{post.content}</p>
                              <Badge variant="secondary" className="bg-brand-primary/20 text-brand-primary">
                                +${post.nilValue}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-4 gap-4 text-sm">
                              <div className="flex items-center space-x-1">
                                <Heart className="h-4 w-4 text-red-400" />
                                <span className="text-gray-300">{post.likes}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <MessageCircle className="h-4 w-4 text-blue-400" />
                                <span className="text-gray-300">{post.comments}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Share2 className="h-4 w-4 text-green-400" />
                                <span className="text-gray-300">{post.shares}</span>
                              </div>
                              <div className="text-gray-400 text-right">
                                {post.timestamp}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="goals" className="mt-8">
            <div className="space-y-6">
              <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Target className="h-5 w-5 mr-2 text-brand-primary" />
                    NIL Growth Goals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {nilGoals.map((goal, index) => (
                      <div key={index} className="space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium text-white">{goal.title}</h4>
                          <Badge variant="secondary" className="bg-brand-accent/20 text-brand-accent">
                            {goal.reward}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">
                              {goal.current.toLocaleString()} / {goal.target.toLocaleString()}
                            </span>
                            <span className="text-gray-300">
                              {Math.round((goal.current / goal.target) * 100)}%
                            </span>
                          </div>
                          <Progress 
                            value={(goal.current / goal.target) * 100} 
                            className="h-2"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}