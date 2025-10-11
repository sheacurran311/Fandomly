import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Trophy,
  CheckCircle,
  MapPin,
  Users,
  Star,
  Target,
  Clock,
  Gift,
  ShoppingBag,
  Heart,
  Share2,
  ExternalLink,
  Facebook,
  Twitter,
  Instagram,
  Music as MusicIcon,
  Video,
  Sparkles,
  TrendingUp,
  Calendar,
  Award,
  Zap,
} from "lucide-react";
import { type Creator, type Campaign, type Reward, type Task } from "@shared/schema";
import { transformImageUrl } from "@/lib/image-utils";

interface CreatorStoreData {
  creator: Creator & {
    user: {
      username: string;
      displayName: string;
      profileData: any;
    };
    tenant: {
      slug: string;
      branding: any;
    };
  };
  campaigns: Campaign[];
  rewards: Reward[];
  fanCount: number;
  totalRewards: number;
}

export default function CreatorStore() {
  const { creatorUrl } = useParams<{ creatorUrl: string }>();
  const [selectedTab, setSelectedTab] = useState("overview");
  const [isFollowing, setIsFollowing] = useState(false);

  // Fetch creator store data
  const { data: storeData, isLoading } = useQuery<CreatorStoreData>({
    queryKey: ["/api/store", creatorUrl],
    queryFn: async () => {
      const response = await fetch(`/api/store/${creatorUrl}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch creator store');
      }
      return response.json();
    },
    enabled: !!creatorUrl,
  });

  // Fetch creator's published tasks
  const { data: creatorTasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks/creator", storeData?.creator?.id],
    queryFn: async () => {
      if (!storeData?.creator?.id) return [];
      const response = await fetch(`/api/tasks/creator/${storeData.creator.id}`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!storeData?.creator?.id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-gray-400">Loading creator store...</p>
        </div>
      </div>
    );
  }

  if (!storeData) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold text-white mb-2">Creator Not Found</h2>
          <p className="text-gray-400 mb-6">The creator store you're looking for doesn't exist.</p>
          <Link href="/marketplace">
            <Button variant="outline" className="border-brand-primary text-brand-primary">
              Browse Creators
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { creator, campaigns, rewards, fanCount, totalRewards } = storeData;
  const branding = creator.tenant?.branding;

  // Filter only published/active campaigns
  const activeCampaigns = campaigns.filter((c: any) => c.status === 'active');

  return (
    <div className="min-h-screen bg-brand-dark-bg">
      {/* Hero Section with Banner */}
      <section className="relative h-[400px] md:h-[500px]">
        {/* Banner Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: creator.bannerImage 
              ? `url(${transformImageUrl(creator.bannerImage)})`
              : `linear-gradient(135deg, ${branding?.primaryColor || '#1a1f3a'}, ${branding?.secondaryColor || '#0f1629'})`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-dark-bg/50 to-brand-dark-bg"></div>
        </div>

        {/* Creator Profile Info - Overlay on Banner */}
        <div className="absolute bottom-0 left-0 right-0">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6 pb-8">
              {/* Profile Photo */}
              <div className="relative">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white/20 bg-white/10 backdrop-blur-lg overflow-hidden">
                  {creator.imageUrl ? (
                    <img 
                      src={transformImageUrl(creator.imageUrl) || creator.imageUrl} 
                      alt={creator.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl text-white">
                      {creator.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                {creator.verificationData && (
                  <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-2 border-4 border-brand-dark-bg">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                )}
              </div>

              {/* Creator Info */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white">
                    {creator.displayName}
                  </h1>
                  {creator.verificationData && (
                    <Badge className="bg-green-500/20 text-green-400 border-green-400">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>

                <p className="text-lg text-gray-300 mb-3">@{creator.user?.username}</p>

                {creator.bio && (
                  <p className="text-gray-400 max-w-2xl mb-4">{creator.bio}</p>
                )}

                {/* Stats Row */}
                <div className="flex items-center justify-center md:justify-start gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-brand-secondary" />
                    <span className="text-white font-semibold">{fanCount.toLocaleString()}</span>
                    <span className="text-gray-400">Fans</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-brand-accent" />
                    <span className="text-white font-semibold">{activeCampaigns.length}</span>
                    <span className="text-gray-400">Active Campaigns</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-purple-400" />
                    <span className="text-white font-semibold">{totalRewards.toLocaleString()}</span>
                    <span className="text-gray-400">Rewards Given</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <Button
                  size="lg"
                  className={isFollowing 
                    ? "bg-white/10 text-white hover:bg-white/20" 
                    : "bg-brand-primary hover:bg-brand-primary/90 text-white"}
                  onClick={() => setIsFollowing(!isFollowing)}
                >
                  {isFollowing ? (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Following
                    </>
                  ) : (
                    <>
                      <Heart className="h-5 w-5 mr-2" />
                      Follow
                    </>
                  )}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-8">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid bg-white/5 backdrop-blur-lg border border-white/10">
              <TabsTrigger value="overview" className="data-[state=active]:bg-brand-primary">
                Overview
              </TabsTrigger>
              <TabsTrigger value="campaigns" className="data-[state=active]:bg-brand-primary">
                Campaigns ({activeCampaigns.length})
              </TabsTrigger>
              <TabsTrigger value="rewards" className="data-[state=active]:bg-brand-primary">
                Rewards
              </TabsTrigger>
              <TabsTrigger value="shop" className="data-[state=active]:bg-brand-primary">
                Shop
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-8">
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Left Column - Main Content */}
                <div className="lg:col-span-2 space-y-8">
                  {/* About Section */}
                  <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Sparkles className="h-5 w-5" />
                        About {creator.displayName}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-gray-400 mb-1 block">Type</label>
                          <div className="text-white flex items-center gap-2">
                            {creator.category === 'athlete' && (
                              <>
                                <Trophy className="h-4 w-4 text-amber-400" />
                                <span>Athlete</span>
                              </>
                            )}
                            {creator.category === 'musician' && (
                              <>
                                <MusicIcon className="h-4 w-4 text-purple-400" />
                                <span>Musician</span>
                              </>
                            )}
                            {creator.category === 'content_creator' && (
                              <>
                                <Video className="h-4 w-4 text-blue-400" />
                                <span>Content Creator</span>
                              </>
                            )}
                          </div>
                        </div>

                        {creator.user?.profileData?.location && (
                          <div>
                            <label className="text-sm text-gray-400 mb-1 block">Location</label>
                            <div className="text-white flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              {creator.user.profileData.location}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Type-Specific Info */}
                      {creator.category === 'athlete' && (creator.typeSpecificData as any)?.athlete && (
                        <>
                          <Separator className="bg-white/10" />
                          <div>
                            <h4 className="text-white font-semibold mb-3">Athletic Profile</h4>
                            <div className="grid md:grid-cols-2 gap-3">
                              {(creator.typeSpecificData as any).athlete.sport && (
                                <div className="flex items-center gap-2 text-gray-300">
                                  <Trophy className="h-4 w-4 text-amber-400" />
                                  <span>{(creator.typeSpecificData as any).athlete.sport}</span>
                                </div>
                              )}
                              {(creator.typeSpecificData as any).athlete.position && (
                                <div className="flex items-center gap-2 text-gray-300">
                                  <Target className="h-4 w-4 text-blue-400" />
                                  <span>{(creator.typeSpecificData as any).athlete.position}</span>
                                </div>
                              )}
                              {(creator.typeSpecificData as any).athlete.education?.school && (
                                <div className="flex items-center gap-2 text-gray-300">
                                  <Award className="h-4 w-4 text-green-400" />
                                  <span>{(creator.typeSpecificData as any).athlete.education.school}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      {creator.category === 'musician' && (creator.typeSpecificData as any)?.musician && (
                        <>
                          <Separator className="bg-white/10" />
                          <div>
                            <h4 className="text-white font-semibold mb-3">Musical Profile</h4>
                            {(creator.typeSpecificData as any).musician.musicGenre && (
                              <div className="flex flex-wrap gap-2">
                                {(creator.typeSpecificData as any).musician.musicGenre.map((genre: string) => (
                                  <Badge key={genre} variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-400">
                                    {genre}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {creator.category === 'content_creator' && (creator.typeSpecificData as any)?.contentCreator && (
                        <>
                          <Separator className="bg-white/10" />
                          <div>
                            <h4 className="text-white font-semibold mb-3">Content Profile</h4>
                            {(creator.typeSpecificData as any).contentCreator.contentType && (
                              <div className="flex flex-wrap gap-2 mb-3">
                                {(creator.typeSpecificData as any).contentCreator.contentType.map((type: string) => (
                                  <Badge key={type} variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-400">
                                    {type}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {(creator.typeSpecificData as any).contentCreator.platforms && (
                              <div className="flex flex-wrap gap-2">
                                {(creator.typeSpecificData as any).contentCreator.platforms.map((platform: string) => (
                                  <Badge key={platform} variant="outline" className="bg-green-500/10 text-green-400 border-green-400">
                                    {platform}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Featured Campaigns */}
                  {activeCampaigns.length > 0 && (
                    <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-white flex items-center gap-2">
                            <Zap className="h-5 w-5 text-brand-accent" />
                            Featured Campaigns
                          </CardTitle>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-brand-primary hover:text-brand-primary/80"
                            onClick={() => setSelectedTab("campaigns")}
                          >
                            View All
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4">
                          {activeCampaigns.slice(0, 3).map((campaign: any) => (
                            <div
                              key={campaign.id}
                              className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <h4 className="text-white font-semibold mb-1">{campaign.title || campaign.name}</h4>
                                  <p className="text-sm text-gray-400">{campaign.description}</p>
                                </div>
                                <Badge variant="outline" className="border-brand-accent/30 text-brand-accent">
                                  Active
                                </Badge>
                              </div>
                              {campaign.endDate && (
                                <div className="flex items-center gap-2 text-sm text-gray-400 mt-3">
                                  <Clock className="h-4 w-4" />
                                  <span>Ends {new Date(campaign.endDate).toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Right Sidebar */}
                <div className="space-y-6">
                  {/* Quick Stats */}
                  <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Stats
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Total Fans</span>
                        <span className="text-white font-semibold">{fanCount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Active Campaigns</span>
                        <span className="text-white font-semibold">{activeCampaigns.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Rewards Distributed</span>
                        <span className="text-white font-semibold">{totalRewards.toLocaleString()}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Social Links */}
                  <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Share2 className="h-5 w-5" />
                        Connect
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <Button
                          variant="outline"
                          className="w-full border-white/20 text-white hover:bg-white/10 justify-start"
                        >
                          <Facebook className="h-4 w-4 mr-2 text-blue-400" />
                          Facebook
                          <ExternalLink className="h-3 w-3 ml-auto" />
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full border-white/20 text-white hover:bg-white/10 justify-start"
                        >
                          <Twitter className="h-4 w-4 mr-2 text-blue-400" />
                          Twitter
                          <ExternalLink className="h-3 w-3 ml-auto" />
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full border-white/20 text-white hover:bg-white/10 justify-start"
                        >
                          <Instagram className="h-4 w-4 mr-2 text-pink-400" />
                          Instagram
                          <ExternalLink className="h-3 w-3 ml-auto" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Campaigns Tab */}
            <TabsContent value="campaigns" className="space-y-8">
              {/* Active Campaigns Section */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">
                    Active Campaigns ({activeCampaigns.length})
                  </h2>
                </div>

                {activeCampaigns.length === 0 ? (
                  <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                    <CardContent className="text-center py-16">
                      <Trophy className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-white mb-2">No Active Campaigns</h3>
                      <p className="text-gray-400">Check back soon for new campaigns!</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeCampaigns.map((campaign: any) => (
                      <Card
                        key={campaign.id}
                        className="bg-white/5 backdrop-blur-lg border-white/10 hover:bg-white/10 transition-all hover:scale-105"
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-white text-lg">
                              {campaign.title || campaign.name}
                            </CardTitle>
                            <Badge variant="outline" className="border-brand-accent/30 text-brand-accent">
                              Active
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-gray-300 text-sm">{campaign.description}</p>

                          {campaign.rules && campaign.rules.length > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                              <Star className="h-4 w-4 text-brand-secondary" />
                              <span className="text-brand-secondary font-medium">
                                Earn rewards for participating!
                              </span>
                            </div>
                          )}

                          {campaign.endDate && (
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <Clock className="h-4 w-4" />
                              <span>Ends {new Date(campaign.endDate).toLocaleDateString()}</span>
                            </div>
                          )}

                          <Button className="w-full bg-brand-primary hover:bg-brand-primary/90">
                            Join Campaign
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Available Tasks Section */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">
                    Available Tasks ({creatorTasks.length})
                  </h2>
                </div>

                {tasksLoading ? (
                  <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                    <CardContent className="text-center py-16">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
                      <p className="text-gray-400">Loading tasks...</p>
                    </CardContent>
                  </Card>
                ) : creatorTasks.length === 0 ? (
                  <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                    <CardContent className="text-center py-16">
                      <Target className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-white mb-2">No Tasks Available</h3>
                      <p className="text-gray-400">This creator hasn't published any tasks yet. Check back soon!</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {creatorTasks.map((task: Task) => (
                      <Card
                        key={task.id}
                        className="bg-white/5 backdrop-blur-lg border-white/10 hover:bg-white/10 transition-all"
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-white text-base">
                              {task.name}
                            </CardTitle>
                            <Badge variant="outline" className="border-green-500/30 text-green-400">
                              <Zap className="h-3 w-3 mr-1" />
                              {task.points || 0} pts
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-gray-300 text-sm line-clamp-2">{task.description}</p>
                          
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Target className="h-3 w-3" />
                            <span className="capitalize">{task.taskType?.replace('_', ' ') || 'Task'}</span>
                          </div>

                          {task.rewardFrequency && task.rewardFrequency !== 'one_time' && (
                            <Badge variant="outline" className="text-xs border-brand-primary/30 text-brand-primary">
                              {task.rewardFrequency === 'daily' && '📅 Daily'}
                              {task.rewardFrequency === 'weekly' && '📅 Weekly'}
                              {task.rewardFrequency === 'monthly' && '📅 Monthly'}
                            </Badge>
                          )}

                          <Button className="w-full bg-brand-accent hover:bg-brand-accent/90">
                            Start Task
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Rewards Tab */}
            <TabsContent value="rewards" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">
                  Available Rewards
                </h2>
              </div>

              <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                <CardContent className="text-center py-16">
                  <Gift className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Rewards Coming Soon</h3>
                  <p className="text-gray-400">Follow this creator to be notified when rewards are available!</p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Shop Tab */}
            <TabsContent value="shop" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">
                  Marketplace
                </h2>
              </div>

              <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                <CardContent className="text-center py-16">
                  <ShoppingBag className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Marketplace Coming Soon</h3>
                  <p className="text-gray-400">Physical items, digital products, and subscriptions will be available here!</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  );
}

