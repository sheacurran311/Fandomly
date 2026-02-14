import { useAuth } from "@/hooks/use-auth";
import { useCreatorStats, useCreatorActivity } from "@/hooks/use-creator-dashboard";
import { useContentAnalytics } from "@/hooks/use-analytics";
import DashboardLayout from "@/components/layout/dashboard-layout";
import DashboardCard from "@/components/dashboard/dashboard-card";
import CreatorFacebookConnect from "@/components/social/creator-facebook-connect";
import CreatorInstagramWidget from "@/components/social/creator-instagram-widget";
import CreatorTwitterWidget from "@/components/social/creator-twitter-widget";
import CreatorTikTokWidget from "@/components/social/creator-tiktok-widget";
import CreatorYouTubeWidget from "@/components/social/creator-youtube-widget";
import CreatorSpotifyWidget from "@/components/social/creator-spotify-widget";
import CreatorDiscordWidget from "@/components/social/creator-discord-widget";
import CreatorTwitchWidget from "@/components/social/creator-twitch-widget";
import RevenueWidget from "@/components/dashboard/revenue-widget";
import LeaderboardWidget from "@/components/dashboard/leaderboard-widget";
import NewFansWidget from "@/components/dashboard/new-fans-widget";
import { useInstagramConnection } from "@/contexts/instagram-connection-context";
import InstagramSDKManager from "@/lib/instagram";
import { useEffect, useMemo } from "react";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useCreatorVerification } from "@/hooks/useCreatorVerification";
import { CreatorVerificationProgress } from "@/components/creator/CreatorVerificationProgress";
import { calculateCreatorVerification } from "@shared/creatorVerificationSchema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  DollarSign,
  TrendingUp,
  Eye,
  Heart,
  MessageSquare,
  Target,
  Plus,
  BarChart3,
  Facebook,
  Instagram,
  Loader2,
  CheckCircle2,
  Gift,
  Sparkles,
  ArrowRight,
  Circle,
  Image,
  Palette,
  Link2,
  ListChecks,
  Rocket,
  ChevronRight,
  Activity
} from "lucide-react";

function TopPerformingWidget() {
  const { data, isLoading } = useContentAnalytics('all', 'views', 3);
  const content = data?.content || [];

  if (isLoading) {
    return (
      <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
        <CardHeader>
          <CardTitle className="text-white text-sm">Top Performing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-3 bg-white/10 rounded w-2/3 mb-2" />
                <div className="h-2 bg-white/10 rounded w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (content.length === 0) {
    return (
      <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
        <CardHeader>
          <CardTitle className="text-white text-sm">Top Performing</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400 text-center py-4">
            Connect platforms and enable syncing to see top content.
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxViews = Math.max(...content.map((c: any) => c.totalViews || 0), 1);

  return (
    <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
      <CardHeader>
        <CardTitle className="text-white text-sm">Top Performing</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {content.map((item: any) => (
            <div key={item.id}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-300 truncate max-w-[60%]">
                  {item.title || `${item.platform} ${item.contentType}`}
                </span>
                <span className="text-sm font-medium text-white">
                  {(item.totalViews || 0).toLocaleString()} views
                </span>
              </div>
              <Progress value={((item.totalViews || 0) / maxViews) * 100} className="h-2" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function CreatorDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { data: creatorStats, isLoading: statsLoading, error: statsError } = useCreatorStats();
  const { data: recentActivity, isLoading: activityLoading } = useCreatorActivity();
  const { creator, verificationData, isLoading: verificationLoading } = useCreatorVerification();
  
  // Only use Instagram connection for creators
  const instagramConnection = user?.userType === 'creator' ? useInstagramConnection() : null;
  const { completeConnection } = instagramConnection || { completeConnection: async () => {} };

  // Immediate callback detection (before useEffect)
  if (user?.userType === 'creator') {
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const hasInstagramCallback = code && state?.includes('instagram');
    
    if (hasInstagramCallback) {
      console.log('[Creator Dashboard] 🚀 IMMEDIATE Instagram callback detected:', {
        codeLength: code?.length,
        state: state,
        fullUrl: window.location.href
      });
    }
  }

  // Handle Instagram OAuth callback (only for creators)
  useEffect(() => {
    const handleInstagramCallback = async () => {
      // Only process Instagram callbacks for creators
      if (user?.userType !== 'creator') {
        console.log('[Creator Dashboard] Not a creator user, skipping Instagram callback processing');
        return;
      }

      // Add a small delay to ensure URL is fully loaded
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log('[Creator Dashboard] 🔍 FULL URL ANALYSIS:');
      console.log('- Full URL:', window.location.href);
      console.log('- Pathname:', window.location.pathname);
      console.log('- Search:', window.location.search);
      console.log('- Hash:', window.location.hash);
      console.log('- Is popup:', !!window.opener);
      
      // Check for parameters in both search and hash (some OAuth flows use hash)
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      
      const code = searchParams.get('code') || hashParams.get('code');
      const state = searchParams.get('state') || hashParams.get('state');
      const error = searchParams.get('error') || hashParams.get('error');

      console.log('[Creator Dashboard] 🔍 PARAMETER DETECTION:');
      console.log('- Code (search):', searchParams.get('code') ? 'FOUND' : 'NOT_FOUND');
      console.log('- Code (hash):', hashParams.get('code') ? 'FOUND' : 'NOT_FOUND');
      console.log('- State (search):', searchParams.get('state') ? 'FOUND' : 'NOT_FOUND');
      console.log('- State (hash):', hashParams.get('state') ? 'FOUND' : 'NOT_FOUND');
      console.log('- Final code:', code ? code.substring(0, 10) + '...' : 'NONE');
      console.log('- Final state:', state || 'NONE');

      // Check if this looks like an Instagram callback URL structure
      const hasInstagramIndicators = 
        window.location.href.includes('code=') || 
        window.location.href.includes('error=') ||
        (state && state.includes('instagram'));

      console.log('[Creator Dashboard] Instagram callback indicators:', {
        hasCodeInURL: window.location.href.includes('code='),
        hasErrorInURL: window.location.href.includes('error='),
        hasInstagramState: state?.includes('instagram'),
        overallDetection: hasInstagramIndicators
      });

      // Only process if we have Instagram callback parameters
      if (!code && !error && !hasInstagramIndicators) {
        console.log('[Creator Dashboard] No Instagram callback parameters found, skipping');
        return;
      }

      // Process Instagram callbacks (even if state is missing for debugging)
      if (code || error || hasInstagramIndicators) {
        console.log('[Creator Dashboard] 🎯 PROCESSING INSTAGRAM CALLBACK');
      }

      if (error) {
        const errorDescription = searchParams.get('error_description') || hashParams.get('error_description');
        
        // If opened in popup, communicate result to parent
        if (window.opener) {
          console.log('[Creator Dashboard] Communicating error to parent window');
          window.opener.postMessage({
            type: 'instagram-oauth-result',
            result: {
              success: false,
              error: errorDescription || error
            }
          }, window.location.origin);
          
          // Store result in parent window for fallback
          (window.opener as any).instagramCallbackData = {
            success: false,
            error: errorDescription || error
          };
          
          window.close();
          return;
        }
        
        toast({
          title: "Instagram Connection Failed",
          description: errorDescription || "Authorization was cancelled or failed",
          variant: "destructive"
        });
        
        // Clean up URL
        window.history.replaceState({}, document.title, '/creator-dashboard');
        return;
      }

      if (code && state) {
        try {
          console.log('[Creator Dashboard] Processing Instagram OAuth callback');
          console.log('[Creator Dashboard] About to call InstagramSDKManager.handleCallback...');
          const result = await InstagramSDKManager.handleCallback(code, state);
          console.log('[Creator Dashboard] handleCallback result:', result);
          
          if (result.success) {
            console.log('[Creator Dashboard] Callback successful, calling global handler...');
            
            // Use the global callback handler (similar to Facebook pattern)
            if ((window as any).handleInstagramConnectionResult) {
              (window as any).handleInstagramConnectionResult(result);
            } else {
              // Fallback to direct completeConnection
              await completeConnection(result);
            }
            
            console.log('[Creator Dashboard] Instagram connection processing finished');
            
            // If opened in popup, communicate result to parent and close
            if (window.opener) {
              console.log('[Creator Dashboard] Communicating success to parent window');
              window.opener.postMessage({
                type: 'instagram-oauth-result',
                result: result
              }, window.location.origin);
              
              // Store result in parent window for fallback
              (window.opener as any).instagramCallbackData = result;
              
              window.close();
              return;
            }
            
            toast({
              title: "Instagram Connected! 📸",
              description: `Successfully connected @${result.user?.username}`,
              duration: 4000
            });
          } else {
            console.error('[Creator Dashboard] Callback failed:', result.error);
            
            // If opened in popup, communicate result to parent
            if (window.opener) {
              window.opener.postMessage({
                type: 'instagram-oauth-result',
                result: result
              }, window.location.origin);
              
              // Store result in parent window for fallback
              (window.opener as any).instagramCallbackData = result;
              
              window.close();
              return;
            }
            
            toast({
              title: "Instagram Connection Failed",
              description: result.error || "Failed to complete connection",
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error('[Creator Dashboard] Instagram callback error:', error);
          
          // If opened in popup, communicate result to parent
          if (window.opener) {
            window.opener.postMessage({
              type: 'instagram-oauth-result',
              result: {
                success: false,
                error: error instanceof Error ? error.message : "An error occurred while connecting Instagram"
              }
            }, window.location.origin);
            
            // Store result in parent window for fallback
            (window.opener as any).instagramCallbackData = {
              success: false,
              error: error instanceof Error ? error.message : "An error occurred while connecting Instagram"
            };
            
            window.close();
            return;
          }
          
          toast({
            title: "Instagram Connection Error",
            description: "An error occurred while connecting Instagram",
            variant: "destructive"
          });
        }
        
        // Clean up URL after processing (only if not in popup)
        if (!window.opener) {
          console.log('[Creator Dashboard] Cleaning up URL parameters');
          window.history.replaceState({}, document.title, '/creator-dashboard');
        }
      }
    };

    handleInstagramCallback();
  }, [user?.userType, completeConnection]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Fetch creator's program for setup checklist
  const { data: programs = [] } = useQuery<any[]>({
    queryKey: ["/api/programs"],
    enabled: isAuthenticated && user?.userType === 'creator',
  });
  const program = programs[0]; // Single-program model
  const programPageConfig = program?.pageConfig || {};

  // Calculate setup completion checklist
  const setupChecklist = useMemo(() => {
    if (!program) return null;

    const items = [
      {
        id: 'name',
        label: 'Program name & description',
        completed: !!program.name && !program.name.endsWith("'s Program") && !!program.description,
        required: true,
        link: '/creator-dashboard/program-builder',
      },
      {
        id: 'photo',
        label: 'Add a photo (logo or banner)',
        completed: !!programPageConfig.logo || !!programPageConfig.headerImage,
        required: true,
        link: '/creator-dashboard/program-builder',
      },
      {
        id: 'theme',
        label: 'Customize your theme',
        completed: !!programPageConfig.theme?.templateId,
        required: false,
        link: '/creator-dashboard/program-builder',
      },
      {
        id: 'social',
        label: 'Connect social platforms',
        completed: programPageConfig.socialLinks && Object.values(programPageConfig.socialLinks).some((v: any) => !!v),
        required: false,
        link: '/creator-dashboard/social',
      },
      {
        id: 'task',
        label: 'Create your first task',
        completed: false, // Will be checked below
        required: true,
        link: '/creator-dashboard/tasks/create',
      },
    ];

    return items;
  }, [program, programPageConfig]);

  // Check if any tasks exist
  const { data: tasksData } = useQuery<any[]>({
    queryKey: ["/api/tasks"],
    enabled: isAuthenticated && user?.userType === 'creator',
  });
  
  // Update task checklist item
  const finalChecklist = useMemo(() => {
    if (!setupChecklist) return null;
    return setupChecklist.map(item => {
      if (item.id === 'task') {
        return { ...item, completed: (tasksData || []).length > 0 };
      }
      return item;
    });
  }, [setupChecklist, tasksData]);

  const completedCount = finalChecklist?.filter(i => i.completed).length || 0;
  const totalCount = finalChecklist?.length || 0;
  const setupProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isPublished = program?.status === 'published';
  const showSetupChecklist = !!program && !isPublished && finalChecklist;

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <div className="text-white">Please connect your wallet to access the dashboard.</div>
      </div>
    );
  }

  return (
    <DashboardLayout userType="creator">
      <div className="relative">
        {/* Background layers */}
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(225,6,152,0.10),transparent_60%),radial-gradient(40%_40%_at_90%_10%,rgba(20,254,238,0.10),transparent_60%)]" />
        <div className="absolute inset-0 gradient-primary opacity-[0.03]" />
        
        <div className="relative z-10 p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome back, {user.username || "Creator"}!
            </h1>
            <p className="text-gray-400">
              Here's what's happening with your community today.
            </p>
          </div>

          {/* Program Setup Checklist - shown for unpublished programs */}
          {showSetupChecklist && finalChecklist && (
            <Card className="bg-gradient-to-br from-brand-primary/10 to-brand-accent/5 backdrop-blur-lg border border-brand-primary/20 mb-8">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-primary/20 flex items-center justify-center">
                      <Rocket className="h-5 w-5 text-brand-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-white text-lg">Complete Your Program</CardTitle>
                      <p className="text-gray-400 text-sm mt-0.5">
                        {completedCount === totalCount 
                          ? "You're ready to publish!" 
                          : `${completedCount} of ${totalCount} steps complete`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-brand-primary font-semibold text-sm">{setupProgress}%</span>
                    {completedCount === totalCount && (
                      <Button 
                        size="sm"
                        className="bg-brand-primary hover:bg-brand-primary/80"
                        onClick={() => window.location.href = '/creator-dashboard/program-builder'}
                      >
                        <Rocket className="h-4 w-4 mr-1" />
                        Publish
                      </Button>
                    )}
                  </div>
                </div>
                <Progress value={setupProgress} className="h-2 mt-3" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {finalChecklist.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => window.location.href = item.link}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-colors text-left w-full ${
                        item.completed 
                          ? 'bg-green-500/10 border border-green-500/20' 
                          : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-brand-primary/30'
                      }`}
                    >
                      {item.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-500 flex-shrink-0" />
                      )}
                      <span className={`text-sm flex-1 ${
                        item.completed ? 'text-green-300 line-through' : 'text-gray-300'
                      }`}>
                        {item.label}
                      </span>
                      {item.required && !item.completed && (
                        <span className="text-[10px] text-brand-primary font-medium bg-brand-primary/10 px-1.5 py-0.5 rounded">
                          Required
                        </span>
                      )}
                      {!item.completed && (
                        <ChevronRight className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Key Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="bg-white/5 backdrop-blur-lg border border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-center h-16">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : statsError ? (
              <div className="col-span-4 text-center text-red-400">
                Failed to load stats. Please try again.
              </div>
            ) : (
              <>
                <DashboardCard
                  title="Total Fans"
                  value={creatorStats?.totalFans?.toLocaleString() || "0"}
                  change={creatorStats?.fansChange}
                  icon={<Users className="h-5 w-5" />}
                  gradient
                />
                <DashboardCard
                  title="Total Revenue"
                  value={`$${creatorStats?.totalRevenue?.toLocaleString() || "0"}`}
                  change={creatorStats?.revenueChange}
                  icon={<DollarSign className="h-5 w-5" />}
                  description="all-time"
                />
                <DashboardCard
                  title="Tasks Completed"
                  value={creatorStats?.tasksCompleted?.toLocaleString() || "0"}
                  change={creatorStats?.tasksChange}
                  icon={<CheckCircle2 className="h-5 w-5" />}
                  description="all-time"
                />
                <DashboardCard
                  title="Rewards Redeemed"
                  value={creatorStats?.rewardsRedeemed?.toLocaleString() || "0"}
                  change={creatorStats?.rewardsChange}
                  icon={<Gift className="h-5 w-5" />}
                  description="all-time"
                />
              </>
            )}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content - Recent Activity + Social Widgets */}
            <div className="lg:col-span-2 space-y-6">
              {/* Recent Activity */}
              <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    <span>Recent Activity</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10"
                      onClick={() => window.location.href = '/creator-dashboard/activity'}
                    >
                      View All
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[600px] overflow-y-auto space-y-4 custom-scrollbar pr-2">
                    {activityLoading ? (
                      // Loading skeleton
                      Array.from({ length: 5 }).map((_, index) => (
                        <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-white/5 animate-pulse">
                          <div className="w-2 h-2 rounded-full mt-2 bg-gray-600" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-600 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-700 rounded w-1/4"></div>
                          </div>
                        </div>
                      ))
                    ) : recentActivity && recentActivity.length > 0 ? (
                      recentActivity.slice(0, 10).map((activity, index) => (
                        <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                            activity.type === 'join' ? 'bg-green-400' : 
                            activity.type === 'redeem' ? 'bg-yellow-400' : 'bg-blue-400'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white">
                              <span className="font-medium">{activity.fan || 'A fan'}</span> {activity.description}
                            </p>
                            <p className="text-xs text-gray-400">{activity.timestamp}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      // Empty state - no activity yet
                      <div className="text-center py-8">
                        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                          <Activity className="h-6 w-6 text-gray-400" />
                        </div>
                        <h3 className="text-white font-medium mb-2">No activity yet</h3>
                        <p className="text-gray-400 text-sm max-w-xs mx-auto">
                          When fans join your program, complete tasks, or redeem rewards, their activity will appear here.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Social Media Integrations Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <CreatorFacebookConnect />
                <CreatorTwitterWidget />
                <CreatorInstagramWidget />
                <CreatorTikTokWidget />
                <CreatorYouTubeWidget />
                <CreatorSpotifyWidget />
                <CreatorDiscordWidget />
                <CreatorTwitchWidget />
              </div>
            </div>

            {/* Right Sidebar - New Widgets */}
            <div className="space-y-6">
              {/* Creator Verification Status */}
              {!verificationLoading && creator && verificationData && (
                <CreatorVerificationProgress
                  creator={creator}
                  verificationData={verificationData}
                  onStartWizard={() => window.location.href = '/creator-dashboard/profile'}
                  compact={true}
                />
              )}
              
              {/* Revenue Widget */}
              <RevenueWidget />
              
              {/* Leaderboard Widget */}
              <LeaderboardWidget />
              
              {/* New Fans Widget */}
              <NewFansWidget />

              {/* Quick Actions */}
              <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    className="w-full bg-brand-primary hover:bg-brand-primary/80 justify-start"
                    onClick={() => window.location.href = '/campaign-builder'}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Campaign
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full border-[#101636]/30 text-[#101636] hover:bg-[#101636]/10 justify-start"
                    onClick={() => {
                      // Placeholder: open Social page to manage Facebook campaigns
                      window.location.href = '/creator-dashboard/social';
                    }}
                    data-testid="button-facebook-campaign"
                  >
                    <Facebook className="h-4 w-4 mr-2" />
                    Facebook Campaign
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full border-pink-400/30 text-pink-400 hover:bg-pink-400/10 justify-start"
                    onClick={() => {
                      window.location.href = '/creator-dashboard/social';
                    }}
                    data-testid="button-instagram-campaign"
                  >
                    <Instagram className="h-4 w-4 mr-2" />
                    Instagram Campaign
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full border-white/20 text-gray-300 hover:bg-white/10 justify-start"
                    onClick={() => window.location.href = '/creator-dashboard/analytics'}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Analytics
                  </Button>
                </CardContent>
              </Card>

              {/* Top Performing Content - Real Data */}
              <TopPerformingWidget />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}