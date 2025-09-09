import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Star,
  Trophy,
  Zap,
  Facebook,
  Instagram,
  Twitter,
  Users,
  ThumbsUp,
  Gift,
  CheckCircle
} from "lucide-react";

// Mock creator data for demonstration
const mockCreator = {
  id: "showcase-creator-1",
  name: "Sarah Chen",
  sport: "Track & Field",
  school: "University of California",
  year: "Junior",
  specialties: ["100m Sprint", "200m Sprint"],
  followers: 12500,
  profileImage: "https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=400&h=400&fit=crop&crop=face",
  coverImage: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=400&fit=crop",
  bio: "NCAA Division I sprinter | 3x All-American | Building my NIL brand through fan engagement",
  totalPoints: 2500,
  memberCount: 847,
  isVerified: true,
  socialStats: {
    facebook: { followers: 4200, posts: 156 },
    instagram: { followers: 8300, posts: 234 },
    twitter: { followers: 3100, posts: 89 }
  }
};

// Mock campaign data
const mockCampaigns = [
  {
    id: "facebook-engagement-1",
    type: "facebook_like",
    title: "Like My Training Updates",
    description: "Follow my training journey and earn points for every like!",
    pointReward: 50,
    platform: "facebook",
    icon: ThumbsUp,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    completed: false
  },
  {
    id: "instagram-follow-1", 
    type: "instagram_follow",
    title: "Follow on Instagram",
    description: "Stay updated with my daily training and get 100 points!",
    pointReward: 100,
    platform: "instagram",
    icon: Instagram,
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
    completed: false
  },
  {
    id: "facebook-share-1",
    type: "facebook_share", 
    title: "Share My Race Results",
    description: "Help spread the word about my latest PR and earn big points!",
    pointReward: 150,
    platform: "facebook",
    icon: Share2,
    color: "text-blue-600",
    bgColor: "bg-blue-600/10",
    completed: false
  }
];

// Mock Facebook posts
const mockFacebookPosts = [
  {
    id: "post-1",
    content: "Just hit a new personal record in the 100m! 🏃‍♀️ Training is paying off and I'm ready for the conference championships next month. Thank you to everyone supporting my journey! #TrackAndField #NIL #GoTeam",
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=400&fit=crop",
    timestamp: "2 hours ago",
    likes: 127,
    comments: 23,
    shares: 8,
    canLike: true,
    pointReward: 50
  },
  {
    id: "post-2", 
    content: "Training session complete! 💪 Today focused on sprint starts and acceleration. The difference between winning and losing is often just milliseconds. Every rep counts! Special thanks to my coach and training partners.",
    image: "https://images.unsplash.com/photo-1544887142-6083c3831ea0?w=600&h=400&fit=crop",
    timestamp: "1 day ago",
    likes: 89,
    comments: 15,
    shares: 4,
    canLike: true,
    pointReward: 50
  },
  {
    id: "post-3",
    content: "Excited to announce my partnership with the university's NIL program! This is helping me build my brand while staying focused on my athletic goals. Support from fans like you makes all the difference! 🙏",
    timestamp: "3 days ago", 
    likes: 203,
    comments: 41,
    shares: 18,
    canLike: true,
    pointReward: 50
  }
];

export default function CreatorShowcase() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userPoints, setUserPoints] = useState(750); // Mock user points
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set());

  // Mock mutation for campaign participation
  const participateInCampaign = useMutation({
    mutationFn: async ({ campaignId, actionType }: { campaignId: string; actionType: string }) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { points: 50, success: true };
    },
    onSuccess: (data, variables) => {
      const campaign = mockCampaigns.find(c => c.id === variables.campaignId);
      if (campaign) {
        setUserPoints(prev => prev + campaign.pointReward);
        setCompletedActions(prev => new Set(Array.from(prev).concat([variables.campaignId])));
        
        toast({
          title: "Points Earned! 🎉",
          description: `You earned ${campaign.pointReward} points for ${campaign.title}`,
          duration: 4000,
        });
      }
    }
  });

  const handleLikePost = (postId: string) => {
    const post = mockFacebookPosts.find(p => p.id === postId);
    if (post && !completedActions.has(`like-${postId}`)) {
      participateInCampaign.mutate({ 
        campaignId: `like-${postId}`, 
        actionType: 'facebook_like' 
      });
    }
  };

  const handleCampaignAction = (campaignId: string) => {
    if (!completedActions.has(campaignId)) {
      participateInCampaign.mutate({ campaignId, actionType: 'campaign_action' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-dark-bg via-brand-dark-purple to-brand-dark-bg">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        
        {/* Creator Header */}
        <div className="relative mb-8">
          <div 
            className="h-64 rounded-2xl bg-cover bg-center relative overflow-hidden"
            style={{ backgroundImage: `url(${mockCreator.coverImage})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-6 left-6 flex items-end space-x-6">
              <Avatar className="w-24 h-24 border-4 border-white shadow-xl">
                <AvatarImage src={mockCreator.profileImage} alt={mockCreator.name} />
                <AvatarFallback className="text-2xl">{mockCreator.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
              </Avatar>
              <div className="text-white pb-2">
                <div className="flex items-center space-x-2 mb-2">
                  <h1 className="text-3xl font-bold">{mockCreator.name}</h1>
                  {mockCreator.isVerified && (
                    <CheckCircle className="h-6 w-6 text-blue-400 fill-current" />
                  )}
                </div>
                <p className="text-lg opacity-90">{mockCreator.sport} • {mockCreator.school}</p>
                <p className="opacity-75">{mockCreator.year} • {mockCreator.specialties.join(", ")}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Creator Stats */}
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Users className="h-5 w-5 text-brand-primary" />
                  <span>Creator Stats</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-brand-primary">{mockCreator.memberCount.toLocaleString()}</div>
                    <div className="text-sm text-gray-300">Program Members</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-brand-secondary">{mockCreator.totalPoints.toLocaleString()}</div>
                    <div className="text-sm text-gray-300">Points Distributed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-brand-accent">{mockCreator.followers.toLocaleString()}</div>
                    <div className="text-sm text-gray-300">Total Followers</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Facebook Posts */}
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Facebook className="h-5 w-5 text-blue-500" />
                  <span>Latest Facebook Posts</span>
                  <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">Connected</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {mockFacebookPosts.map((post) => (
                  <div key={post.id} className="border border-white/10 rounded-lg p-4 bg-white/5">
                    <div className="flex items-start space-x-3 mb-4">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={mockCreator.profileImage} />
                        <AvatarFallback>SC</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-white">{mockCreator.name}</span>
                          <CheckCircle className="h-4 w-4 text-blue-400 fill-current" />
                        </div>
                        <span className="text-sm text-gray-400">{post.timestamp}</span>
                      </div>
                    </div>
                    
                    <p className="text-gray-200 mb-4 leading-relaxed">{post.content}</p>
                    
                    {post.image && (
                      <img 
                        src={post.image} 
                        alt="Post content" 
                        className="w-full h-64 object-cover rounded-lg mb-4"
                      />
                    )}
                    
                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                      <div className="flex items-center space-x-6 text-sm text-gray-400">
                        <span>{post.likes} likes</span>
                        <span>{post.comments} comments</span>
                        <span>{post.shares} shares</span>
                      </div>
                      
                      <Button
                        onClick={() => handleLikePost(post.id)}
                        disabled={completedActions.has(`like-${post.id}`) || participateInCampaign.isPending}
                        className={`flex items-center space-x-2 ${
                          completedActions.has(`like-${post.id}`)
                            ? 'bg-blue-500 text-white' 
                            : 'bg-white/10 hover:bg-blue-500/20 text-white border border-blue-500/30'
                        }`}
                        data-testid={`button-like-post-${post.id}`}
                      >
                        <ThumbsUp className={`h-4 w-4 ${completedActions.has(`like-${post.id}`) ? 'fill-current' : ''}`} />
                        <span>
                          {completedActions.has(`like-${post.id}`) ? 'Liked' : 'Like'}
                        </span>
                        {!completedActions.has(`like-${post.id}`) && (
                          <span className="text-brand-secondary font-semibold">+{post.pointReward}</span>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* User Points */}
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <span>Your Points</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-500 mb-2" data-testid="text-user-points">
                    {userPoints.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-300 mb-4">Total Points Earned</div>
                  <Progress value={75} className="h-2 mb-2" />
                  <div className="text-xs text-gray-400">750 points until next reward</div>
                </div>
              </CardContent>
            </Card>

            {/* Available Campaigns */}
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Trophy className="h-5 w-5 text-brand-primary" />
                  <span>Active Campaigns</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {mockCampaigns.map((campaign) => {
                  const Icon = campaign.icon;
                  const isCompleted = completedActions.has(campaign.id);
                  
                  return (
                    <div key={campaign.id} className={`p-4 rounded-lg border ${campaign.bgColor} border-white/10`}>
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg bg-white/10`}>
                          <Icon className={`h-5 w-5 ${campaign.color}`} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-white text-sm mb-1">{campaign.title}</h4>
                          <p className="text-xs text-gray-300 mb-3">{campaign.description}</p>
                          <Button
                            onClick={() => handleCampaignAction(campaign.id)}
                            disabled={isCompleted || participateInCampaign.isPending}
                            size="sm"
                            className={`w-full ${
                              isCompleted
                                ? 'bg-green-500 text-white' 
                                : 'bg-brand-primary hover:bg-brand-primary/80 text-white'
                            }`}
                            data-testid={`button-campaign-${campaign.id}`}
                          >
                            {isCompleted ? (
                              <span className="flex items-center space-x-1">
                                <CheckCircle className="h-4 w-4" />
                                <span>Completed</span>
                              </span>
                            ) : (
                              <span className="flex items-center space-x-1">
                                <Zap className="h-4 w-4" />
                                <span>Earn {campaign.pointReward} pts</span>
                              </span>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Social Stats */}
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Share2 className="h-5 w-5 text-brand-accent" />
                  <span>Social Media</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Facebook className="h-5 w-5 text-blue-500" />
                    <span className="text-white text-sm">Facebook</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-white">{mockCreator.socialStats.facebook.followers.toLocaleString()}</div>
                    <div className="text-xs text-gray-400">{mockCreator.socialStats.facebook.posts} posts</div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Instagram className="h-5 w-5 text-pink-500" />
                    <span className="text-white text-sm">Instagram</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-white">{mockCreator.socialStats.instagram.followers.toLocaleString()}</div>
                    <div className="text-xs text-gray-400">{mockCreator.socialStats.instagram.posts} posts</div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Twitter className="h-5 w-5 text-blue-400" />
                    <span className="text-white text-sm">Twitter</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-white">{mockCreator.socialStats.twitter.followers.toLocaleString()}</div>
                    <div className="text-xs text-gray-400">{mockCreator.socialStats.twitter.posts} posts</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}