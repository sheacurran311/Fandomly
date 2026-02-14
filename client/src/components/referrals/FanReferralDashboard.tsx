/**
 * Fan Referral Dashboard
 * 
 * Shows fan's referral stats for inviting friends to Fandomly
 * Features:
 * - Unique referral link and code
 * - Fandomly Points rewards (platform currency)
 * - Tiered rewards: signup, first task, profile complete
 * - Percentage earnings (5% of friend's points for 30 days)
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Copy, 
  Check, 
  MousePointer, 
  UserPlus, 
  Coins,
  TrendingUp,
  Users,
  ExternalLink,
  Gift,
  Sparkles,
  Clock
} from "lucide-react";
import { useFanReferral } from "@/hooks/useReferrals";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function FanReferralDashboard() {
  const { toast } = useToast();
  const { data, isLoading, error } = useFanReferral();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const copyToClipboard = async (text: string, type: 'link' | 'code') => {
    try {
      await navigator.clipboard.writeText(text);
      
      if (type === 'link') {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } else {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      }
      
      toast({
        title: "Copied!",
        description: `Referral ${type} copied to clipboard`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    const err = error as { response?: { data?: { message?: string } }; message?: string };
    const errorMessage = err?.response?.data?.message || err?.message || "Failed to load referral data";
    
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          <div>
            <p>Failed to load referral data. Please try again later.</p>
            <p className="text-sm text-gray-300 mt-2">
              Error details: {errorMessage}
            </p>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  const stats = data?.stats;
  const daysLeft = stats?.percentageExpiresAt 
    ? Math.max(0, Math.ceil((new Date(stats.percentageExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl text-white flex items-center gap-2">
                <Gift className="h-6 w-6" />
                Invite Friends
              </CardTitle>
              <CardDescription className="text-gray-300 mt-2">
                Earn Fandomly Points when friends join and complete tasks
              </CardDescription>
            </div>
            <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
              <Coins className="h-3 w-3 mr-1" />
              {stats?.totalPointsEarned || 0} Points
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Rewards Info */}
      <Alert className="bg-yellow-500/10 border-yellow-500/20">
        <Sparkles className="h-4 w-4 text-yellow-400" />
        <AlertTitle className="text-yellow-300">Earn Fandomly Points</AlertTitle>
        <AlertDescription>
          <ul className="list-disc list-inside space-y-1 mt-2 text-gray-300">
            <li><strong>50 points</strong> when a friend signs up</li>
            <li><strong>100 points</strong> when they complete their first task</li>
            <li><strong>150 points</strong> when they complete their profile</li>
            {stats?.percentageRewardsActive && (
              <li className="text-emerald-300">
                <strong>+ {stats.percentageValue}%</strong> of all points they earn for {daysLeft} more days!
              </li>
            )}
          </ul>
        </AlertDescription>
      </Alert>

      {/* Referral Links */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Your Referral Links</CardTitle>
          <CardDescription>Share these with friends to earn rewards</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Referral URL */}
          <div>
            <Label className="text-white">Referral Link</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={stats?.referralUrl || ''}
                readOnly
                className="bg-white/10 border-white/20 text-white font-mono text-sm"
              />
              <Button
                onClick={() => copyToClipboard(stats?.referralUrl || '', 'link')}
                variant="outline"
                className="border-white/20 hover:bg-white/10 shrink-0"
              >
                {copiedLink ? (
                  <Check className="h-4 w-4 text-green-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Referral Code */}
          <div>
            <Label className="text-white">Referral Code</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={stats?.referralCode || ''}
                readOnly
                className="bg-white/10 border-white/20 text-white font-mono text-lg font-bold"
              />
              <Button
                onClick={() => copyToClipboard(stats?.referralCode || '', 'code')}
                variant="outline"
                className="border-white/20 hover:bg-white/10 shrink-0"
              >
                {copiedCode ? (
                  <Check className="h-4 w-4 text-green-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Friends can enter this code during signup
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Link Clicks"
          value={stats?.totalClicks || 0}
          icon={<MousePointer className="h-5 w-5 text-blue-400" />}
          bgColor="bg-blue-500/10"
          borderColor="border-blue-500/20"
        />
        <StatCard
          title="Friends Joined"
          value={stats?.totalFriends || 0}
          icon={<UserPlus className="h-5 w-5 text-green-400" />}
          bgColor="bg-green-500/10"
          borderColor="border-green-500/20"
        />
        <StatCard
          title="Completed First Task"
          value={stats?.friendsWithFirstTask || 0}
          icon={<TrendingUp className="h-5 w-5 text-purple-400" />}
          bgColor="bg-purple-500/10"
          borderColor="border-purple-500/20"
        />
        <StatCard
          title="Total Points Earned"
          value={stats?.totalPointsEarned || 0}
          icon={<Coins className="h-5 w-5 text-yellow-400" />}
          bgColor="bg-yellow-500/10"
          borderColor="border-yellow-500/20"
        />
      </div>

      {/* Percentage Earnings Timer */}
      {stats?.percentageRewardsActive && (
        <Card className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-emerald-400" />
                  Bonus Earnings Active!
                </h3>
                <p className="text-sm text-gray-300">
                  You're earning {stats.percentageValue}% of all points your friends earn
                </p>
              </div>
              <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300">
                <Clock className="h-3 w-3 mr-1" />
                {daysLeft} days left
              </Badge>
            </div>
            <Progress value={(daysLeft / 30) * 100} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Friends List */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Your Friends</CardTitle>
              <CardDescription>Friends you've invited to Fandomly</CardDescription>
            </div>
            <Badge variant="secondary" className="bg-white/10">
              <Users className="h-3 w-3 mr-1" />
              {stats?.referredFans?.length || 0} Total
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {!stats?.referredFans || stats.referredFans.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Friends Yet</h3>
              <p className="text-gray-400 mb-4">
                Start inviting friends to earn Fandomly Points!
              </p>
              <Button
                onClick={() => copyToClipboard(stats?.referralUrl || '', 'link')}
                className="bg-brand-primary hover:bg-brand-primary/80"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Referral Link
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.referredFans.map((friend, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-white font-medium">Friend {index + 1}</p>
                      <p className="text-sm text-gray-400">
                        Joined {new Date(friend.signupDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {friend.profileCompleted && (
                      <Badge className="bg-purple-500/20 text-purple-300 text-xs">
                        Profile Complete
                      </Badge>
                    )}
                    {friend.firstTaskCompleted && (
                      <Badge className="bg-green-500/20 text-green-300 text-xs">
                        Active User
                      </Badge>
                    )}
                    {!friend.firstTaskCompleted && !friend.profileCompleted && (
                      <Badge variant="secondary" className="bg-gray-500/20 text-gray-300 text-xs">
                        New
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Share Options */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Share Your Link</CardTitle>
          <CardDescription>Spread the word on social media</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => {
                const url = encodeURIComponent(stats?.referralUrl || '');
                const text = encodeURIComponent('Join me on Fandomly and support your favorite creators! 🎉');
                window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
              }}
              className="bg-[#1DA1F2] hover:bg-[#1DA1F2]/80"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Share on X (Twitter)
            </Button>
            <Button
              onClick={() => {
                const url = encodeURIComponent(stats?.referralUrl || '');
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
              }}
              className="bg-[#1877F2] hover:bg-[#1877F2]/80"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Share on Facebook
            </Button>
            <Button
              onClick={() => copyToClipboard(stats?.referralUrl || '', 'link')}
              variant="outline"
              className="border-white/20 hover:bg-white/10"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Stat Card Component
function StatCard({ 
  title, 
  value, 
  icon, 
  bgColor, 
  borderColor 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ReactNode;
  bgColor: string;
  borderColor: string;
}) {
  return (
    <Card className={`${bgColor} ${borderColor}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-white mt-2">{value}</p>
          </div>
          <div className="p-3 bg-white/10 rounded-lg">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-48 w-full" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

