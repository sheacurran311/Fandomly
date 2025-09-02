import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Facebook, 
  Heart, 
  MessageCircle, 
  Share2, 
  Users, 
  Trophy,
  Zap,
  Target,
  Clock
} from 'lucide-react';

interface CampaignBuilderProps {
  onCampaignCreate?: (campaign: any) => void;
  facebookPageConnected?: boolean;
}

export function CampaignBuilder({ onCampaignCreate, facebookPageConnected }: CampaignBuilderProps) {
  const [campaignType, setCampaignType] = useState<string>('');
  const [campaignName, setCampaignName] = useState('');
  const [description, setDescription] = useState('');
  const [rewards, setRewards] = useState('');
  const [duration, setDuration] = useState('7');
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const campaignTypes = [
    {
      id: 'facebook_like',
      name: 'Facebook Like Campaign',
      description: 'Reward fans for liking your Facebook posts',
      icon: <Heart className="h-4 w-4" />,
      color: 'bg-red-500/10 text-red-400 border-red-500/20',
      requiresFacebook: true,
      points: 50
    },
    {
      id: 'facebook_comment',
      name: 'Facebook Comment Campaign', 
      description: 'Reward fans for commenting on your posts',
      icon: <MessageCircle className="h-4 w-4" />,
      color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      requiresFacebook: true,
      points: 100
    },
    {
      id: 'facebook_share',
      name: 'Facebook Share Campaign',
      description: 'Reward fans for sharing your content',
      icon: <Share2 className="h-4 w-4" />,
      color: 'bg-green-500/10 text-green-400 border-green-500/20',
      requiresFacebook: true,
      points: 200
    },
    {
      id: 'engagement_challenge',
      name: 'Engagement Challenge',
      description: 'Multi-platform engagement rewards',
      icon: <Zap className="h-4 w-4" />,
      color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      requiresFacebook: false,
      points: 150
    },
    {
      id: 'referral_bonus',
      name: 'Referral Bonus',
      description: 'Reward fans for bringing new members',
      icon: <Users className="h-4 w-4" />,
      color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      requiresFacebook: false,
      points: 500
    },
    {
      id: 'milestone_reward',
      name: 'Milestone Reward',
      description: 'Celebrate follower milestones together',
      icon: <Trophy className="h-4 w-4" />,
      color: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      requiresFacebook: false,
      points: 300
    }
  ];

  const selectedCampaignType = campaignTypes.find(type => type.id === campaignType);

  const handleCreateCampaign = async () => {
    if (!campaignType || !campaignName || !description) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (selectedCampaignType?.requiresFacebook && !facebookPageConnected) {
      toast({
        title: "Facebook Required",
        description: "This campaign type requires a connected Facebook page",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      const campaign = {
        id: `campaign_${Date.now()}`,
        type: campaignType,
        name: campaignName,
        description,
        rewards,
        duration: parseInt(duration),
        points: selectedCampaignType?.points || 100,
        status: 'active',
        createdAt: new Date().toISOString(),
        requiresFacebook: selectedCampaignType?.requiresFacebook || false
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      onCampaignCreate?.(campaign);
      
      toast({
        title: "Campaign Created!",
        description: `Your ${selectedCampaignType?.name} is now live`,
      });

      // Reset form
      setCampaignType('');
      setCampaignName('');
      setDescription('');
      setRewards('');
      setDuration('7');

    } catch (error) {
      toast({
        title: "Creation Failed",
        description: "Failed to create campaign. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="bg-white/5 backdrop-blur-lg border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Target className="h-5 w-5 text-brand-primary" />
          Create New Campaign
        </CardTitle>
        <p className="text-gray-300 text-sm">
          Set up automated campaigns to reward fan engagement and grow your community
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Campaign Type Selection */}
        <div>
          <label className="text-white font-medium mb-3 block">Campaign Type</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {campaignTypes.map((type) => {
              const isDisabled = type.requiresFacebook && !facebookPageConnected;
              
              return (
                <button
                  key={type.id}
                  onClick={() => !isDisabled && setCampaignType(type.id)}
                  disabled={isDisabled}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    campaignType === type.id
                      ? 'border-brand-primary bg-brand-primary/10'
                      : isDisabled
                      ? 'border-gray-600 bg-gray-800/50 opacity-50 cursor-not-allowed'
                      : 'border-gray-600 hover:border-gray-500 bg-white/5 hover:bg-white/10'
                  }`}
                  data-testid={`button-campaign-type-${type.id}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className={`p-2 rounded-lg ${type.color}`}>
                      {type.icon}
                    </div>
                    <div className="flex items-center gap-2">
                      {type.requiresFacebook && (
                        <Facebook className="h-3 w-3 text-blue-400" />
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {type.points} pts
                      </Badge>
                    </div>
                  </div>
                  <h4 className="text-white font-medium text-sm">{type.name}</h4>
                  <p className="text-gray-400 text-xs mt-1">{type.description}</p>
                  {isDisabled && (
                    <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                      <Facebook className="h-3 w-3" />
                      Requires Facebook connection
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {selectedCampaignType && (
          <>
            {/* Campaign Details */}
            <div className="space-y-4">
              <div>
                <label className="text-white font-medium mb-2 block">Campaign Name</label>
                <Input
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Enter campaign name..."
                  className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                  data-testid="input-campaign-name"
                />
              </div>

              <div>
                <label className="text-white font-medium mb-2 block">Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what fans need to do and what they'll get..."
                  className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                  rows={3}
                  data-testid="input-campaign-description"
                />
              </div>

              <div>
                <label className="text-white font-medium mb-2 block">Rewards (Optional)</label>
                <Input
                  value={rewards}
                  onChange={(e) => setRewards(e.target.value)}
                  placeholder="e.g., Exclusive Discord access, merch discount..."
                  className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                  data-testid="input-campaign-rewards"
                />
              </div>

              <div>
                <label className="text-white font-medium mb-2 block">Duration (Days)</label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Day</SelectItem>
                    <SelectItem value="3">3 Days</SelectItem>
                    <SelectItem value="7">1 Week</SelectItem>
                    <SelectItem value="14">2 Weeks</SelectItem>
                    <SelectItem value="30">1 Month</SelectItem>
                    <SelectItem value="0">Ongoing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Campaign Preview */}
            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Campaign Preview
              </h4>
              <div className="space-y-2 text-sm">
                <p className="text-gray-300">
                  <strong>Type:</strong> {selectedCampaignType.name}
                </p>
                <p className="text-gray-300">
                  <strong>Reward:</strong> {selectedCampaignType.points} points per action
                </p>
                <p className="text-gray-300">
                  <strong>Duration:</strong> {duration === '0' ? 'Ongoing' : `${duration} days`}
                </p>
                {rewards && (
                  <p className="text-gray-300">
                    <strong>Extra Rewards:</strong> {rewards}
                  </p>
                )}
              </div>
            </div>

            {/* Create Button */}
            <Button
              onClick={handleCreateCampaign}
              disabled={isCreating}
              className="w-full bg-brand-primary hover:bg-brand-primary/80"
              data-testid="button-create-campaign"
            >
              {isCreating ? "Creating Campaign..." : "Create Campaign"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default CampaignBuilder;