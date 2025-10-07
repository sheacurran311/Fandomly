/**
 * Creator Referral Dashboard
 * 
 * Shows creator's referral stats for inviting other creators
 * Features:
 * - Unique referral link and code
 * - Revenue share tracking (10% commission)
 * - List of referred creators
 * - Stats: clicks, signups, total commission
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Copy, 
  Check, 
  MousePointer, 
  UserPlus, 
  DollarSign, 
  TrendingUp,
  Users,
  ExternalLink,
  Info
} from "lucide-react";
import { useCreatorReferral } from "@/hooks/useReferrals";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function CreatorReferralDashboard() {
  const { toast } = useToast();
  const { data, isLoading, error } = useCreatorReferral();
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
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to load referral data";
    const isCreatorProfileMissing = error?.response?.data?.error === "Creator profile not found";
    
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {isCreatorProfileMissing ? (
            <div>
              <p>Creator profile not found. Please complete your creator profile setup first.</p>
              <p className="text-sm text-gray-300 mt-2">
                Error details: {errorMessage}
              </p>
            </div>
          ) : (
            <div>
              <p>Failed to load referral data. Please try again later.</p>
              <p className="text-sm text-gray-300 mt-2">
                Error details: {errorMessage}
              </p>
            </div>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl text-white">Invite Other Creators</CardTitle>
              <CardDescription className="text-gray-300 mt-2">
                Earn 10% revenue share when you refer paid creators to Fandomly
              </CardDescription>
            </div>
            <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
              10% Commission
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Info Alert */}
      <Alert className="bg-blue-500/10 border-blue-500/20">
        <Info className="h-4 w-4 text-blue-400" />
        <AlertTitle className="text-blue-300">How It Works</AlertTitle>
        <AlertDescription className="text-gray-300">
          Share your unique referral link with other creators. When they sign up and upgrade to a paid account,
          you'll earn 10% of their subscription fees for life!
        </AlertDescription>
      </Alert>

      {/* Referral Links */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Your Referral Links</CardTitle>
          <CardDescription>Share these with other creators to earn commissions</CardDescription>
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
              Creators can enter this code during signup
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
          title="Signups"
          value={stats?.totalSignups || 0}
          icon={<UserPlus className="h-5 w-5 text-green-400" />}
          bgColor="bg-green-500/10"
          borderColor="border-green-500/20"
        />
        <StatCard
          title="Total Revenue Generated"
          value={`$${(stats?.totalRevenue || 0).toFixed(2)}`}
          icon={<TrendingUp className="h-5 w-5 text-purple-400" />}
          bgColor="bg-purple-500/10"
          borderColor="border-purple-500/20"
        />
        <StatCard
          title="Commission Earned"
          value={`$${(stats?.totalCommission || 0).toFixed(2)}`}
          icon={<DollarSign className="h-5 w-5 text-yellow-400" />}
          bgColor="bg-yellow-500/10"
          borderColor="border-yellow-500/20"
        />
      </div>

      {/* Referred Creators List */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Your Referrals</CardTitle>
              <CardDescription>Creators you've invited to Fandomly</CardDescription>
            </div>
            <Badge variant="secondary" className="bg-white/10">
              <Users className="h-3 w-3 mr-1" />
              {stats?.referredCreators?.length || 0} Total
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {!stats?.referredCreators || stats.referredCreators.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Referrals Yet</h3>
              <p className="text-gray-400 mb-4">
                Start sharing your referral link to invite other creators!
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
              {stats.referredCreators.map((creator, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-white font-medium">Creator {index + 1}</p>
                      <p className="text-sm text-gray-400">
                        Joined {new Date(creator.signupDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-semibold">
                      ${creator.commission.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-400">
                      from ${creator.revenue.toFixed(2)} revenue
                    </p>
                    {creator.firstPaidDate && (
                      <Badge variant="secondary" className="mt-1 bg-green-500/20 text-green-300 text-xs">
                        Paid Customer
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
                const text = encodeURIComponent('Join me on Fandomly - the best platform for creator monetization! 🚀');
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
              onClick={() => {
                const url = encodeURIComponent(stats?.referralUrl || '');
                const text = encodeURIComponent('Check out Fandomly - amazing platform for creators!');
                window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}&summary=${text}`, '_blank');
              }}
              className="bg-[#0A66C2] hover:bg-[#0A66C2]/80"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Share on LinkedIn
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

