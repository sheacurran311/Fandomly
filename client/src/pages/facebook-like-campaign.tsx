import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  ThumbsUp, 
  MessageSquare, 
  Share2, 
  Trophy, 
  Target,
  CheckCircle,
  Clock,
  Facebook,
  Star,
  Zap
} from "lucide-react";

interface FacebookPost {
  id: string;
  message: string;
  created_time: string;
  likes: { summary: { total_count: number } };
  comments: { summary: { total_count: number } };
  shares: { count: number };
  permalink_url: string;
}

interface Campaign {
  id: string;
  title: string;
  description: string;
  pointReward: number;
  type: 'like' | 'comment' | 'share';
  targetPostId: string;
  isCompleted: boolean;
  creatorName: string;
  creatorAvatar: string;
}

export default function FacebookLikeCampaign() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [athletePosts, setAthletePosts] = useState<FacebookPost[]>([]);

  // Mock data for demonstration
  useEffect(() => {
    // Mock athlete posts
    setAthletePosts([
      {
        id: "post_123456789",
        message: "Just got signed by Nike on a 2-year deal! Stoked! 🏈⚡ This wouldn't be possible without all the incredible support from my fans. Ready to take my game to the next level! #NIL #Nike #FootballLife",
        created_time: "2024-12-03T18:00:00Z",
        likes: { summary: { total_count: 247 } },
        comments: { summary: { total_count: 38 } },
        shares: { count: 15 },
        permalink_url: "https://www.facebook.com/shea.curran.kicker/posts/123456789"
      },
      {
        id: "post_987654321", 
        message: "Game day prep! Hit 9/10 field goals from 45+ yards at practice today. Feeling ready for Saturday's championship game! 🎯 #GameDay #FieldGoals #ChampionshipBound",
        created_time: "2024-12-02T15:30:00Z",
        likes: { summary: { total_count: 189 } },
        comments: { summary: { total_count: 24 } },
        shares: { count: 8 },
        permalink_url: "https://www.facebook.com/shea.curran.kicker/posts/987654321"
      }
    ]);

    // Mock campaigns
    setCampaigns([
      {
        id: "camp_001",
        title: "Like My Nike Announcement!",
        description: "Show some love on my big Nike signing announcement post",
        pointReward: 50,
        type: 'like',
        targetPostId: "post_123456789",
        isCompleted: false,
        creatorName: "Shea Curran",
        creatorAvatar: "/api/placeholder/avatar/shea-curran.jpg"
      },
      {
        id: "camp_002", 
        title: "Support My Practice Update",
        description: "Like my practice update post to earn bonus points",
        pointReward: 25,
        type: 'like',
        targetPostId: "post_987654321",
        isCompleted: true,
        creatorName: "Shea Curran",
        creatorAvatar: "/api/placeholder/avatar/shea-curran.jpg"
      }
    ]);
  }, []);

  const handleLikePost = async (campaign: Campaign, post: FacebookPost) => {
    // This would integrate with Facebook API to like the post
    console.log(`Liking post ${post.id} for campaign ${campaign.id}`);
    
    // Mock the like action and point reward
    setTimeout(() => {
      setCampaigns(prev => 
        prev.map(c => 
          c.id === campaign.id 
            ? { ...c, isCompleted: true }
            : c
        )
      );
      
      // Would trigger point award in real implementation
      alert(`🎉 Congratulations! You earned ${campaign.pointReward} points for liking ${campaign.creatorName}'s post!`);
    }, 1000);
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <div className="text-white">Please connect your wallet to access campaigns.</div>
      </div>
    );
  }

  return (
    <DashboardLayout userType="creator">
      <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Facebook Like Campaigns</h1>
            <p className="text-gray-400">
              Earn points by engaging with your favorite athlete's Facebook posts
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Available Campaigns */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white">Available Campaigns</h2>
              
              {campaigns.map((campaign) => {
                const post = athletePosts.find(p => p.id === campaign.targetPostId);
                if (!post) return null;

                return (
                  <Card key={campaign.id} className="bg-white/5 backdrop-blur-lg border-white/10">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={campaign.creatorAvatar} alt={campaign.creatorName} />
                            <AvatarFallback className="bg-purple-600 text-white">
                              SC
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-white text-lg">{campaign.title}</CardTitle>
                            <p className="text-gray-400 text-sm">by {campaign.creatorName}</p>
                          </div>
                        </div>
                        <Badge 
                          variant={campaign.isCompleted ? "default" : "secondary"}
                          className={campaign.isCompleted ? "bg-green-600" : "bg-brand-primary"}
                        >
                          <Trophy className="h-3 w-3 mr-1" />
                          {campaign.pointReward} pts
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <p className="text-gray-300 text-sm">{campaign.description}</p>
                      
                      {/* Campaign Task */}
                      <div className="flex items-center gap-2 p-3 bg-white/5 rounded-lg">
                        <ThumbsUp className="h-4 w-4 text-blue-400" />
                        <span className="text-white text-sm font-medium">Like Facebook Post</span>
                        {campaign.isCompleted ? (
                          <CheckCircle className="h-4 w-4 text-green-400 ml-auto" />
                        ) : (
                          <Clock className="h-4 w-4 text-yellow-400 ml-auto" />
                        )}
                      </div>

                      <Button
                        onClick={() => handleLikePost(campaign, post)}
                        disabled={campaign.isCompleted}
                        className={`w-full ${
                          campaign.isCompleted 
                            ? 'bg-green-600 hover:bg-green-600' 
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                        data-testid={`button-like-campaign-${campaign.id}`}
                      >
                        <Facebook className="h-4 w-4 mr-2" />
                        {campaign.isCompleted ? 'Completed!' : 'Like Post & Earn Points'}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Facebook Posts Preview */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white">Shea Curran's Recent Posts</h2>
              
              {athletePosts.map((post) => {
                const campaign = campaigns.find(c => c.targetPostId === post.id);
                
                return (
                  <Card key={post.id} className="bg-white/5 backdrop-blur-lg border-white/10">
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-purple-600 text-white">
                            SC
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-white font-semibold">Shea Curran</h3>
                            <Badge variant="outline" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              Athlete
                            </Badge>
                          </div>
                          <p className="text-gray-400 text-sm">{formatTimeAgo(post.created_time)}</p>
                        </div>
                        {campaign && (
                          <Badge className="bg-brand-primary">
                            <Target className="h-3 w-3 mr-1" />
                            Campaign Active
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <p className="text-white">{post.message}</p>
                      
                      {/* Engagement Stats */}
                      <div className="flex items-center gap-6 text-gray-400 text-sm">
                        <div className="flex items-center gap-1">
                          <ThumbsUp className="h-4 w-4" />
                          <span>{post.likes.summary.total_count}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          <span>{post.comments.summary.total_count}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Share2 className="h-4 w-4" />
                          <span>{post.shares.count}</span>
                        </div>
                      </div>

                      {/* Campaign Info */}
                      {campaign && (
                        <div className={`p-3 rounded-lg border-2 ${
                          campaign.isCompleted 
                            ? 'bg-green-500/10 border-green-500/30' 
                            : 'bg-brand-primary/10 border-brand-primary/30'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Zap className="h-4 w-4 text-brand-primary" />
                              <span className="text-white font-medium">
                                {campaign.isCompleted ? 'Campaign Completed!' : 'Like for Points!'}
                              </span>
                            </div>
                            <Badge variant="secondary">
                              {campaign.pointReward} pts
                            </Badge>
                          </div>
                          <p className="text-gray-300 text-sm mt-1">
                            {campaign.isCompleted 
                              ? 'You already earned points for this post' 
                              : 'Like this post to earn loyalty points'}
                          </p>
                        </div>
                      )}

                      {/* Mock Facebook Actions */}
                      <div className="border-t border-gray-600 pt-3">
                        <div className="flex items-center gap-4">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className={`text-gray-400 hover:text-blue-400 ${
                              campaign?.isCompleted ? 'text-blue-400' : ''
                            }`}
                            data-testid={`button-like-post-${post.id}`}
                          >
                            <ThumbsUp className="h-4 w-4 mr-1" />
                            {campaign?.isCompleted ? 'Liked' : 'Like'}
                          </Button>
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Comment
                          </Button>
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                            <Share2 className="h-4 w-4 mr-1" />
                            Share
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
    </DashboardLayout>
  );
}