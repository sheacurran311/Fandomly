/**
 * Reputation Page — View your on-chain reputation score, tier, breakdown, and gate status.
 *
 * Route: /reputation (both fans and creators)
 * Data: GET /api/reputation/me (existing) + GET /api/reputation/me/history (new)
 */

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Shield,
  Lock,
  CheckCircle,
  TrendingUp,
  Coins,
  Sparkles,
  ArrowRight,
  Clock,
  Zap,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { useAuth } from '@/contexts/auth-context';
import { apiRequest } from '@/lib/queryClient';
import { Link } from 'wouter';
import { REPUTATION_THRESHOLDS } from '@shared/blockchain-config';

// ============================================================================
// TYPES
// ============================================================================

interface ReputationData {
  score: number;
  onChainScore: number;
  breakdown: Record<string, { score: number; rawValue: number }>;
  syncStatus: string;
  lastSyncedAt: string | null;
  walletAddress: string | null;
  thresholds: { fanStaking: boolean; creatorToken: boolean };
  maxScore: number;
  signalWeights: Record<string, { weight: number; description: string }>;
}

interface HistoryEntry {
  date: string;
  oldScore: number;
  newScore: number;
  syncType: string;
}

// ============================================================================
// TIER HELPERS
// ============================================================================

function getTier(score: number) {
  if (score >= 750)
    return {
      name: 'Platinum',
      color: 'text-purple-400',
      bg: 'bg-purple-500/20',
      border: 'border-purple-500/30',
    };
  if (score >= 500)
    return {
      name: 'Gold',
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/20',
      border: 'border-yellow-500/30',
    };
  if (score >= 250)
    return {
      name: 'Silver',
      color: 'text-gray-300',
      bg: 'bg-gray-500/20',
      border: 'border-gray-500/30',
    };
  return {
    name: 'Bronze',
    color: 'text-orange-400',
    bg: 'bg-orange-500/20',
    border: 'border-orange-500/30',
  };
}

// ============================================================================
// COMPONENTS
// ============================================================================

function ScoreGauge({ score, maxScore }: { score: number; maxScore: number }) {
  const percentage = Math.min((score / maxScore) * 100, 100);
  const tier = getTier(score);
  // SVG arc: 270-degree arc from 135deg to 405deg
  const radius = 80;
  const circumference = 2 * Math.PI * radius * (270 / 360);
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-48 h-48 mx-auto">
      <svg viewBox="0 0 200 200" className="w-full h-full -rotate-[135deg]">
        {/* Background arc */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="12"
          strokeDasharray={`${circumference} ${2 * Math.PI * radius}`}
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="currentColor"
          className={tier.color}
          strokeWidth="12"
          strokeDasharray={`${circumference} ${2 * Math.PI * radius}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-white">{score}</span>
        <span className={`text-sm font-medium ${tier.color}`}>{tier.name}</span>
      </div>
    </div>
  );
}

function ReputationGateCard({
  title,
  threshold,
  currentScore,
  unlocked,
  description,
  href,
  icon: Icon,
}: {
  title: string;
  threshold: number;
  currentScore: number;
  unlocked: boolean;
  description: string;
  href: string;
  icon: typeof Coins;
}) {
  return (
    <Card className={`bg-white/5 border ${unlocked ? 'border-green-500/30' : 'border-white/10'}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center ${unlocked ? 'bg-green-500/20' : 'bg-white/5'}`}
            >
              <Icon className={`w-5 h-5 ${unlocked ? 'text-green-400' : 'text-gray-500'}`} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">{title}</h3>
              <p className="text-xs text-gray-400">{threshold}+ required</p>
            </div>
          </div>
          {unlocked ? (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              <CheckCircle className="w-3 h-3 mr-1" />
              Unlocked
            </Badge>
          ) : (
            <Badge className="bg-white/5 text-gray-400 border-white/10">
              <Lock className="w-3 h-3 mr-1" />
              Locked
            </Badge>
          )}
        </div>
        <p className="text-xs text-gray-400 mb-3">{description}</p>
        {/* Progress bar */}
        <div className="w-full bg-white/5 rounded-full h-2 mb-2">
          <div
            className={`h-2 rounded-full transition-all ${unlocked ? 'bg-green-500' : 'bg-purple-500'}`}
            style={{ width: `${Math.min((currentScore / threshold) * 100, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {currentScore} / {threshold}
          </span>
          {unlocked && (
            <Link
              href={href}
              className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
            >
              Go <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function BreakdownCard({
  signal,
  data,
  weight,
  description,
}: {
  signal: string;
  data: { score: number; rawValue: number };
  weight: number;
  description: string;
}) {
  const labels: Record<string, string> = {
    // Fan signals
    totalPoints: 'Points Earned',
    taskCompletions: 'Tasks Completed',
    socialConnections: 'Social Connections',
    streakDays: 'Streak Days',
    referralCount: 'Referrals',
    accountAgeDays: 'Account Age',
    // Creator signals
    activeFanCount: 'Active Fans',
    programEngagement: 'Program Engagement',
    verifiedStatus: 'Verification Status',
    creatorSocialConnections: 'Social Connections',
    fanRewardRedemptions: 'Fan Redemptions',
    creatorAccountAgeDays: 'Account Age',
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-300">{labels[signal] || signal}</span>
          <span className="text-sm font-semibold text-white">+{data.score}</span>
        </div>
        <p className="text-xs text-gray-500 mb-2">{description}</p>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Raw: {data.rawValue}</span>
          <span className="text-gray-500">Weight: {weight}%</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// PAGE
// ============================================================================

export default function ReputationPage() {
  const { user } = useAuth();
  const userType = (user?.userType as 'fan' | 'creator') || 'fan';

  const { data: reputation, isLoading } = useQuery<ReputationData>({
    queryKey: ['/api/reputation/me'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/reputation/me');
      return res.json();
    },
    enabled: !!user,
  });

  const { data: history } = useQuery<{ history: HistoryEntry[] }>({
    queryKey: ['/api/reputation/me/history'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/reputation/me/history');
      return res.json();
    },
    enabled: !!user,
  });

  return (
    <DashboardLayout userType={userType}>
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Reputation Score</h1>
            <p className="text-sm text-gray-400">
              Your on-chain reputation unlocks staking and token creation
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-64 w-full bg-white/5" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-40 bg-white/5" />
              <Skeleton className="h-40 bg-white/5" />
            </div>
          </div>
        ) : reputation ? (
          <>
            {/* Score Card */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <ScoreGauge score={reputation.score} maxScore={reputation.maxScore} />
                  <div className="flex-1 space-y-3 text-center md:text-left">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                      <Badge
                        className={`${getTier(reputation.score).bg} ${getTier(reputation.score).color} ${getTier(reputation.score).border}`}
                      >
                        <Sparkles className="w-3 h-3 mr-1" />
                        {getTier(reputation.score).name} Tier
                      </Badge>
                      {reputation.syncStatus === 'synced' ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          <Zap className="w-3 h-3 mr-1" />
                          On-chain synced
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                          <Clock className="w-3 h-3 mr-1" />
                          Sync {reputation.syncStatus}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">
                      Score: {reputation.score} / {reputation.maxScore}
                      {reputation.onChainScore > 0 &&
                        reputation.onChainScore !== reputation.score && (
                          <span className="text-gray-500 ml-2">
                            (on-chain: {reputation.onChainScore})
                          </span>
                        )}
                    </p>
                    {reputation.lastSyncedAt && (
                      <p className="text-xs text-gray-500">
                        Last synced: {new Date(reputation.lastSyncedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gates */}
            <div>
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
                Reputation Gates
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ReputationGateCard
                  title="Fan Staking"
                  threshold={REPUTATION_THRESHOLDS.FAN_STAKING}
                  currentScore={reputation.score}
                  unlocked={reputation.thresholds.fanStaking}
                  description="Stake creator tokens and earn FAN rewards with social multipliers."
                  href="/staking"
                  icon={Coins}
                />
                <ReputationGateCard
                  title="Token Creation"
                  threshold={REPUTATION_THRESHOLDS.CREATOR_TOKEN}
                  currentScore={reputation.score}
                  unlocked={reputation.thresholds.creatorToken}
                  description="Launch your own creator token for fans to hold and stake."
                  href="/creator-dashboard/token"
                  icon={Sparkles}
                />
              </div>
            </div>

            {/* Breakdown */}
            {reputation.breakdown && Object.keys(reputation.breakdown).length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
                  Score Breakdown
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(reputation.breakdown)
                    .filter(([key]) => key !== 'weightedScores' && key !== 'normalizedScore')
                    .map(([signal, data]) => (
                      <BreakdownCard
                        key={signal}
                        signal={signal}
                        data={data as { score: number; rawValue: number }}
                        weight={reputation.signalWeights[signal]?.weight ?? 0}
                        description={reputation.signalWeights[signal]?.description ?? ''}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* History */}
            {history?.history && history.history.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
                  Score History
                </h2>
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-0">
                    <div className="divide-y divide-white/5">
                      {history.history.map((entry, i) => (
                        <div key={i} className="flex items-center justify-between px-4 py-3">
                          <div className="flex items-center gap-3">
                            <TrendingUp
                              className={`w-4 h-4 ${entry.newScore > entry.oldScore ? 'text-green-400' : 'text-red-400'}`}
                            />
                            <div>
                              <p className="text-sm text-white">
                                {entry.oldScore} &rarr; {entry.newScore}
                              </p>
                              <p className="text-xs text-gray-500">{entry.syncType}</p>
                            </div>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(entry.date).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        ) : (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-8 text-center">
              <Shield className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Unable to load reputation data. Please try again.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
