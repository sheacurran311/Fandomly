import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRoute } from 'wouter';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  useCampaignDetail,
  useCampaignProgress,
  useCampaignEligibility,
  useJoinCampaign,
  useCompleteTaskInCampaign,
  useClaimCompletionBonus,
} from '@/hooks/useCampaignParticipation';
import {
  Trophy,
  Clock,
  Target,
  Star,
  Calendar,
  ArrowLeft,
  Check,
  Lock,
  Loader2,
  AlertCircle,
  Zap,
  Shield,
  Gift,
  Hash,
  Award,
  CheckCircle2,
  Circle,
  Timer,
} from 'lucide-react';
import { useLocation } from 'wouter';

function getPlatformIcon(taskType: string) {
  if (taskType.startsWith('twitter')) return 'X';
  if (taskType.startsWith('instagram')) return 'IG';
  if (taskType.startsWith('youtube')) return 'YT';
  if (taskType.startsWith('tiktok')) return 'TT';
  if (taskType.startsWith('spotify')) return 'SP';
  if (taskType.startsWith('discord')) return 'DC';
  if (taskType.startsWith('twitch')) return 'TW';
  if (taskType.startsWith('facebook')) return 'FB';
  if (taskType.startsWith('kick')) return 'KK';
  return 'WEB';
}

function getPlatformColor(taskType: string) {
  if (taskType.startsWith('twitter')) return 'bg-gray-700';
  if (taskType.startsWith('instagram')) return 'bg-pink-600';
  if (taskType.startsWith('youtube')) return 'bg-red-600';
  if (taskType.startsWith('tiktok')) return 'bg-gray-800';
  if (taskType.startsWith('spotify')) return 'bg-green-600';
  if (taskType.startsWith('discord')) return 'bg-indigo-600';
  if (taskType.startsWith('twitch')) return 'bg-purple-600';
  if (taskType.startsWith('facebook')) return 'bg-blue-600';
  return 'bg-brand-primary';
}

export default function CampaignDetail() {
  useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/fan-dashboard/campaigns/:id');
  const campaignId = params?.id || null;
  const { toast } = useToast();

  const [accessCode, setAccessCode] = useState('');

  const { data: detailData, isLoading: detailLoading } = useCampaignDetail(campaignId);
  const { data: progressData } = useCampaignProgress(campaignId);
  const { data: eligibilityData } = useCampaignEligibility(campaignId);
  const joinCampaign = useJoinCampaign();
  const completeTask = useCompleteTaskInCampaign();
  const claimBonus = useClaimCompletionBonus();

  const campaign = detailData?.campaign;
  const hasJoined = !!progressData;

  const handleJoin = async () => {
    if (!campaignId) return;
    try {
      await joinCampaign.mutateAsync({
        campaignId,
        accessCode: accessCode || undefined,
      });
      toast({
        title: 'Joined campaign!',
        description: "You've successfully joined this campaign.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to join campaign';
      toast({ title: 'Cannot join', description: msg, variant: 'destructive' });
    }
  };

  const handleCompleteTask = async (assignmentId: string) => {
    if (!campaignId) return;
    try {
      await completeTask.mutateAsync({ campaignId, assignmentId });
      toast({ title: 'Task completed!', description: 'Points have been awarded.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not complete task';
      toast({ title: 'Task failed', description: msg, variant: 'destructive' });
    }
  };

  const handleClaimBonus = async () => {
    if (!campaignId) return;
    try {
      await claimBonus.mutateAsync(campaignId);
      toast({ title: 'Bonus claimed!', description: 'Completion bonus has been awarded!' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not claim bonus';
      toast({ title: 'Claim failed', description: msg, variant: 'destructive' });
    }
  };

  if (detailLoading) {
    return (
      <DashboardLayout userType="fan">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!campaign) {
    return (
      <DashboardLayout userType="fan">
        <div className="text-center py-20">
          <h2 className="text-xl text-white mb-2">Campaign not found</h2>
          <Button onClick={() => setLocation('/fan-dashboard/campaigns')} className="mt-4">
            Back to Campaigns
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const campaignExt = campaign as Record<string, unknown>;
  const accentColor = (campaignExt.accentColor as string) || '#8B5CF6';

  return (
    <DashboardLayout userType="fan">
      <div className="max-w-4xl mx-auto space-y-6 p-6">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => setLocation('/fan-dashboard/campaigns')}
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Campaigns
        </Button>

        {/* Banner & Header */}
        <div className="relative overflow-hidden rounded-xl" style={{ borderColor: accentColor }}>
          {campaignExt.bannerImageUrl ? (
            <img
              src={String(campaignExt.bannerImageUrl)}
              alt={campaign.name || 'Campaign'}
              className="w-full h-48 object-cover"
            />
          ) : (
            <div
              className="w-full h-48"
              style={{ background: `linear-gradient(135deg, ${accentColor}40, ${accentColor}10)` }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <h1 className="text-3xl font-bold text-white mb-1">{campaign.name}</h1>
            {campaign.description && (
              <p className="text-gray-300 text-sm max-w-2xl">{campaign.description}</p>
            )}
          </div>
        </div>

        {/* Campaign Info Bar */}
        <div className="flex flex-wrap items-center gap-3">
          {campaign.endDate && (
            <Badge variant="outline" className="border-white/20 text-gray-300">
              <Calendar className="h-3 w-3 mr-1" />
              Ends {new Date(campaign.endDate).toLocaleDateString()}
            </Badge>
          )}
          <Badge variant="outline" className="border-white/20 text-gray-300">
            <Target className="h-3 w-3 mr-1" />
            {campaign.totalTasks} tasks
          </Badge>
          <Badge variant="outline" className="border-white/20 text-gray-300">
            <Star className="h-3 w-3 mr-1" />
            {campaign.totalPoints} total points
          </Badge>
          {Number(campaignExt.campaignMultiplier) > 1 && (
            <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
              <Zap className="h-3 w-3 mr-1" />
              {campaignExt.campaignMultiplier}x multiplier
            </Badge>
          )}
        </div>

        {/* Sponsors */}
        {campaign.sponsors && campaign.sponsors.length > 0 && (
          <div className="flex items-center gap-3 p-4 bg-white/5 rounded-lg border border-white/10">
            <span className="text-xs text-gray-400 uppercase tracking-wider">Sponsored by</span>
            <div className="flex gap-3">
              {campaign.sponsors
                .filter((s) => s.showInCampaignBanner !== false)
                .map((sponsor) => (
                  <div key={sponsor.id} className="flex items-center gap-2">
                    {sponsor.logoUrl ? (
                      <img
                        src={String(sponsor.logoUrl)}
                        alt={String(sponsor.name)}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-brand-primary/30 flex items-center justify-center text-xs text-white font-bold">
                        {String(sponsor.name)[0]}
                      </div>
                    )}
                    <span className="text-white text-sm font-medium">{String(sponsor.name)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Eligibility Gate / Join Section */}
        {!hasJoined && (
          <Card className="bg-white/5 backdrop-blur-lg border-white/10">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5" style={{ color: accentColor }} />
                Join This Campaign
              </h2>

              {/* Gating info */}
              {campaign.gatingInfo && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {campaign.gatingInfo.hasAccessCode && (
                    <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                      <Hash className="h-3 w-3 mr-1" /> Code Required
                    </Badge>
                  )}
                  {campaign.gatingInfo.hasNftGating && (
                    <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                      <Award className="h-3 w-3 mr-1" /> NFT Required
                    </Badge>
                  )}
                  {campaign.gatingInfo.hasBadgeGating && (
                    <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                      <Award className="h-3 w-3 mr-1" /> Badge Required
                    </Badge>
                  )}
                  {campaign.gatingInfo.hasReputationGating && (
                    <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                      <Zap className="h-3 w-3 mr-1" /> Min Reputation
                    </Badge>
                  )}
                </div>
              )}

              {/* Access code input */}
              {campaign.gatingInfo?.hasAccessCode && (
                <div className="mb-4">
                  <Input
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    placeholder="Enter access code"
                    className="bg-white/5 border-white/20 text-white"
                  />
                </div>
              )}

              {eligibilityData && !eligibilityData.eligible && (
                <Alert className="bg-red-500/10 border-red-500/30 mb-4">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <AlertDescription className="text-red-200">
                    {eligibilityData.reasons.join('. ')}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleJoin}
                disabled={joinCampaign.isPending || (eligibilityData && !eligibilityData.eligible)}
                className="w-full"
                style={{ backgroundColor: accentColor }}
              >
                {joinCampaign.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Target className="h-4 w-4 mr-2" />
                )}
                Join Campaign
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Progress Section (after joining) */}
        {hasJoined && progressData && (
          <>
            {/* Progress Bar */}
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-semibold">Your Progress</h3>
                  <span className="text-sm font-bold" style={{ color: accentColor }}>
                    {progressData.completedCount}/{progressData.totalRequired} tasks
                  </span>
                </div>
                <Progress value={progressData.progressPercentage} className="h-3" />
                {progressData.campaignCompleted && !progressData.completionBonusAwarded && (
                  <div
                    className="mt-4 p-4 rounded-lg border-2"
                    style={{ borderColor: accentColor, backgroundColor: `${accentColor}10` }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold flex items-center gap-2">
                          <Trophy className="h-5 w-5 text-yellow-400" />
                          Campaign Complete!
                        </p>
                        <p className="text-sm text-gray-300 mt-1">
                          Claim your completion bonus of {campaignExt.completionBonusPoints || 0}{' '}
                          points
                        </p>
                      </div>
                      <Button
                        onClick={handleClaimBonus}
                        disabled={claimBonus.isPending}
                        className="bg-yellow-500 hover:bg-yellow-600 text-black"
                      >
                        {claimBonus.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Gift className="h-4 w-4 mr-2" />
                        )}
                        Claim Bonus
                      </Button>
                    </div>
                  </div>
                )}
                {progressData.completionBonusAwarded && (
                  <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <p className="text-green-300 text-sm flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Completion bonus awarded! Congratulations!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Task Lists */}
            <div className="space-y-4">
              {/* Completed Tasks */}
              {progressData.tasksCompleted.length > 0 && (
                <div>
                  <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                    Completed ({progressData.tasksCompleted.length})
                  </h3>
                  <div className="space-y-2">
                    {progressData.tasksCompleted.map((task) => (
                      <div
                        key={task.assignmentId}
                        className="flex items-center gap-3 p-3 bg-green-500/5 rounded-lg border border-green-500/20"
                      >
                        <div
                          className={`w-8 h-8 rounded-lg ${getPlatformColor(task.taskType)} flex items-center justify-center text-white text-xs font-bold`}
                        >
                          {getPlatformIcon(task.taskType)}
                        </div>
                        <div className="flex-1">
                          <p className="text-white text-sm font-medium">{task.taskName}</p>
                        </div>
                        <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                          <Check className="h-3 w-3 mr-1" /> +{task.points} pts
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Verification Tasks */}
              {progressData.tasksPendingVerification.length > 0 && (
                <div>
                  <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                    <Timer className="h-4 w-4 text-yellow-400" />
                    Pending Verification ({progressData.tasksPendingVerification.length})
                  </h3>
                  <div className="space-y-2">
                    {progressData.tasksPendingVerification.map((task) => (
                      <div
                        key={task.assignmentId}
                        className="flex items-center gap-3 p-3 bg-yellow-500/5 rounded-lg border border-yellow-500/20"
                      >
                        <Timer className="h-5 w-5 text-yellow-400" />
                        <div className="flex-1">
                          <p className="text-white text-sm font-medium">{task.taskName}</p>
                          <p className="text-xs text-gray-400">
                            Completed {new Date(task.completedAt).toLocaleDateString()} - will be
                            verified at campaign end
                          </p>
                        </div>
                        <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                          Pending
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Tasks */}
              {progressData.tasksAvailable.length > 0 && (
                <div>
                  <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                    <Circle className="h-4 w-4 text-brand-primary" />
                    Available ({progressData.tasksAvailable.length})
                  </h3>
                  <div className="space-y-2">
                    {progressData.tasksAvailable.map((task) => (
                      <div
                        key={task.assignmentId}
                        className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10 hover:border-white/30 transition-colors"
                      >
                        <div
                          className={`w-8 h-8 rounded-lg ${getPlatformColor(task.taskType)} flex items-center justify-center text-white text-xs font-bold`}
                        >
                          {getPlatformIcon(task.taskType)}
                        </div>
                        <div className="flex-1">
                          <p className="text-white text-sm font-medium">{task.taskName}</p>
                          <div className="flex gap-2 mt-1">
                            <span className="text-xs text-gray-400">{task.points} pts</span>
                            {task.isOptional && (
                              <Badge
                                variant="outline"
                                className="text-xs border-white/20 text-gray-400"
                              >
                                Optional
                              </Badge>
                            )}
                            {task.sponsorName && (
                              <Badge
                                variant="outline"
                                className="text-xs border-purple-500/30 text-purple-300"
                              >
                                {task.sponsorName}
                              </Badge>
                            )}
                            {task.verificationTiming === 'deferred' && (
                              <Badge
                                variant="outline"
                                className="text-xs border-yellow-500/30 text-yellow-300"
                              >
                                <Clock className="h-3 w-3 mr-1" /> Deferred
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleCompleteTask(task.assignmentId)}
                          disabled={completeTask.isPending}
                          style={{ backgroundColor: accentColor }}
                          className="text-white"
                        >
                          {completeTask.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : task.verificationTiming === 'deferred' ? (
                            'Mark Done'
                          ) : (
                            'Complete'
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Locked Tasks */}
              {progressData.tasksLocked.length > 0 && (
                <div>
                  <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                    <Lock className="h-4 w-4 text-gray-500" />
                    Locked ({progressData.tasksLocked.length})
                  </h3>
                  <div className="space-y-2">
                    {progressData.tasksLocked.map((task) => (
                      <div
                        key={task.assignmentId}
                        className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10 opacity-50"
                      >
                        <Lock className="h-5 w-5 text-gray-500" />
                        <div className="flex-1">
                          <p className="text-gray-400 text-sm font-medium">{task.taskName}</p>
                          <p className="text-xs text-gray-500">
                            Complete first: {task.dependsOnNames.join(', ')}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs border-gray-600 text-gray-500">
                          {task.points} pts
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
