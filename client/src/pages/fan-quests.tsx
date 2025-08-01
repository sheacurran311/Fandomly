import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Search,
  Filter,
  Trophy,
  Users,
  Clock,
  Zap,
  Star,
  Instagram,
  Twitter,
  Music2,
  Heart,
  Share2,
  MessageCircle,
  CheckCircle,
  Gift,
  Coins,
  Calendar,
  Target,
  Sparkles
} from "lucide-react";

interface FanQuest {
  id: string;
  title: string;
  description: string;
  questType: string;
  requirements: {
    platforms?: string[];
    actions?: string[];
    hashtags?: string[];
    mentions?: string[];
    customInstructions?: string;
    duration?: number;
  };
  rewards: {
    points: number;
    tier?: string;
    exclusiveContent?: string;
    nft?: string;
    badgeId?: string;
  };
  difficultyLevel: string;
  maxParticipants?: number;
  currentParticipants: number;
  startDate?: string;
  endDate?: string;
  creator: {
    displayName: string;
    category: string;
    avatar?: string;
  };
}

export default function FanQuests() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("discover");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");

  const { data: quests = [], isLoading } = useQuery<FanQuest[]>({
    queryKey: ['/api/fan-quests'],
  });

  const { data: myParticipations = [] } = useQuery({
    queryKey: ['/api/my-quest-participations'],
  });

  const joinQuestMutation = useMutation({
    mutationFn: async (questId: string) => {
      return apiRequest("POST", `/api/fan-quests/${questId}/join`, {});
    },
    onSuccess: () => {
      toast({
        title: "Quest Joined! 🎯",
        description: "Check your active quests to track progress and submit when complete.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/my-quest-participations'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to Join Quest",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const submitQuestMutation = useMutation({
    mutationFn: async ({ questId, submissionData }: { questId: string; submissionData: any }) => {
      return apiRequest("POST", `/api/fan-quests/${questId}/submit`, submissionData);
    },
    onSuccess: () => {
      toast({
        title: "Quest Submitted! ✅",
        description: "Your submission is being reviewed. You'll be notified when approved.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/my-quest-participations'] });
    },
  });

  const filteredQuests = quests.filter(quest => {
    const matchesSearch = quest.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         quest.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         quest.creator.displayName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDifficulty = selectedDifficulty === "all" || quest.difficultyLevel === selectedDifficulty;
    
    return matchesSearch && matchesDifficulty;
  });

  const getQuestIcon = (questType: string) => {
    switch (questType) {
      case 'social_follow': return Users;
      case 'social_share': return Share2;
      case 'social_post': return MessageCircle;
      case 'engagement': return Heart;
      default: return Target;
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'instagram': return Instagram;
      case 'twitter': return Twitter;
      case 'tiktok': return Music2;
      default: return Sparkles;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500/20 text-green-400';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400';
      case 'hard': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const QuestCard = ({ quest, isParticipating = false, participationStatus = "not_started" }: { 
    quest: FanQuest; 
    isParticipating?: boolean; 
    participationStatus?: string;
  }) => {
    const QuestIcon = getQuestIcon(quest.questType);
    
    return (
      <Card className="bg-white/5 backdrop-blur-lg border-white/10 hover:border-brand-primary/30 transition-all duration-200">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-brand-primary/20 rounded-lg flex items-center justify-center">
                <QuestIcon className="h-5 w-5 text-brand-primary" />
              </div>
              <div>
                <CardTitle className="text-white text-lg">{quest.title}</CardTitle>
                <p className="text-sm text-gray-400">by {quest.creator.displayName}</p>
              </div>
            </div>
            <Badge className={getDifficultyColor(quest.difficultyLevel)}>
              {quest.difficultyLevel}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <p className="text-gray-300 text-sm">{quest.description}</p>
          
          {/* Platforms required */}
          {quest.requirements.platforms && (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-400">Platforms:</span>
              {quest.requirements.platforms.map(platform => {
                const PlatformIcon = getPlatformIcon(platform);
                return (
                  <div key={platform} className="flex items-center space-x-1">
                    <PlatformIcon className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-400 capitalize">{platform}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quest details */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Coins className="h-4 w-4 text-yellow-400" />
                <span className="text-yellow-400">{quest.rewards.points} pts</span>
              </div>
              {quest.maxParticipants && (
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-400">
                    {quest.currentParticipants}/{quest.maxParticipants}
                  </span>
                </div>
              )}
              {quest.endDate && (
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-400">
                    {new Date(quest.endDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Rewards preview */}
          {(quest.rewards.exclusiveContent || quest.rewards.nft || quest.rewards.badgeId) && (
            <div className="bg-brand-primary/10 rounded-lg p-3 border border-brand-primary/20">
              <div className="flex items-center space-x-2 mb-2">
                <Gift className="h-4 w-4 text-brand-primary" />
                <span className="text-sm font-medium text-brand-primary">Bonus Rewards</span>
              </div>
              <div className="text-xs text-gray-300 space-y-1">
                {quest.rewards.exclusiveContent && <div>• {quest.rewards.exclusiveContent}</div>}
                {quest.rewards.nft && <div>• Exclusive NFT: {quest.rewards.nft}</div>}
                {quest.rewards.badgeId && <div>• Achievement Badge</div>}
              </div>
            </div>
          )}

          {/* Action button */}
          <div className="pt-2">
            {!isParticipating ? (
              <Button
                onClick={() => joinQuestMutation.mutate(quest.id)}
                disabled={joinQuestMutation.isPending || 
                         (quest.maxParticipants && quest.currentParticipants >= quest.maxParticipants)}
                className="w-full bg-brand-primary hover:bg-brand-primary/80"
              >
                {joinQuestMutation.isPending ? "Joining..." : "Join Quest"}
              </Button>
            ) : (
              <div className="space-y-2">
                {participationStatus === "started" && (
                  <Button
                    onClick={() => {
                      // In a real app, this would open a submission modal
                      toast({
                        title: "Quest Submission",
                        description: "Submission modal would open here with quest-specific fields.",
                      });
                    }}
                    className="w-full bg-brand-secondary hover:bg-brand-secondary/80"
                  >
                    Submit Quest
                  </Button>
                )}
                {participationStatus === "submitted" && (
                  <div className="text-center text-yellow-400 text-sm">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Under Review
                  </div>
                )}
                {participationStatus === "completed" && (
                  <div className="text-center text-green-400 text-sm">
                    <CheckCircle className="h-4 w-4 inline mr-1" />
                    Completed
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-white">Loading fan quests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark-bg">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-dark-purple to-brand-dark-bg border-b border-white/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-white">Fan Quests</h1>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
              Complete challenges from your favorite creators, earn points, and unlock exclusive rewards!
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search quests by title, creator, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-gray-400"
            />
          </div>
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/20 rounded-md text-white"
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white/5 border border-white/10">
            <TabsTrigger value="discover" className="data-[state=active]:bg-brand-primary">
              <Target className="h-4 w-4 mr-2" />
              Discover
            </TabsTrigger>
            <TabsTrigger value="active" className="data-[state=active]:bg-brand-primary">
              <Zap className="h-4 w-4 mr-2" />
              Active
            </TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-brand-primary">
              <Trophy className="h-4 w-4 mr-2" />
              Completed
            </TabsTrigger>
          </TabsList>

          <TabsContent value="discover" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredQuests.map(quest => (
                <QuestCard key={quest.id} quest={quest} />
              ))}
            </div>
            {filteredQuests.length === 0 && (
              <div className="text-center py-12">
                <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">No Quests Found</h3>
                <p className="text-gray-400">Try adjusting your search or filters to find more quests.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="active" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Active quests would be filtered from myParticipations */}
              <div className="text-center py-12 col-span-full">
                <Zap className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">No Active Quests</h3>
                <p className="text-gray-400">Join some quests to start earning rewards!</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="completed" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Completed quests would be shown here */}
              <div className="text-center py-12 col-span-full">
                <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">No Completed Quests</h3>
                <p className="text-gray-400">Complete your first quest to see it here!</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}