import { useAuth } from "@/hooks/use-auth";
import { useCreatorStats, useCreatorActivity } from "@/hooks/use-creator-dashboard";
import DashboardLayout from "@/components/layout/dashboard-layout";
import DashboardCard from "@/components/dashboard/dashboard-card";
import CreatorFacebookConnect from "@/components/social/creator-facebook-connect";
import CreatorInstagramWidget from "@/components/social/creator-instagram-widget";
import CreatorTwitterWidget from "@/components/social/creator-twitter-widget";
import CreatorTikTokWidget from "@/components/social/creator-tiktok-widget";
import CreatorYouTubeWidget from "@/components/social/creator-youtube-widget";
import CreatorSpotifyWidget from "@/components/social/creator-spotify-widget";
import RevenueWidget from "@/components/dashboard/revenue-widget";
import LeaderboardWidget from "@/components/dashboard/leaderboard-widget";
import NewFansWidget from "@/components/dashboard/new-fans-widget";
import { useInstagramConnection } from "@/contexts/instagram-connection-context";
import InstagramSDKManager from "@/lib/instagram";
import { useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { useCreatorVerification } from "@/hooks/useCreatorVerification";
import { CreatorVerificationProgress } from "@/components/creator/CreatorVerificationProgress";
import { calculateCreatorVerification } from "@shared/creatorVerificationSchema";
// Removed unused FacebookSDK.getCreatorData reference
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
  Gift
} from "lucide-react";

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
                              <span className="font-medium">{activity.user || activity.fanName || 'A fan'}</span> {activity.action || activity.description}
                            </p>
                            <p className="text-xs text-gray-400">{activity.time || activity.timestamp}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      // Fallback mock data
                      [
                        { user: "Sarah M.", action: "joined your loyalty program", time: "2 hours ago", type: "join" },
                        { user: "Mike R.", action: "redeemed VIP Discord Access", time: "4 hours ago", type: "redeem" },
                        { user: "Emma L.", action: "earned 500 points from Instagram follow", time: "6 hours ago", type: "earn" },
                        { user: "Alex K.", action: "joined your loyalty program", time: "1 day ago", type: "join" },
                        { user: "Taylor B.", action: "completed Twitter follow task", time: "1 day ago", type: "earn" },
                        { user: "Jordan C.", action: "redeemed Exclusive Merch", time: "2 days ago", type: "redeem" },
                        { user: "Casey D.", action: "joined your loyalty program", time: "2 days ago", type: "join" },
                        { user: "Morgan E.", action: "earned 300 points from campaign", time: "3 days ago", type: "earn" },
                        { user: "Riley F.", action: "completed Instagram follow task", time: "3 days ago", type: "earn" },
                        { user: "Avery G.", action: "joined your loyalty program", time: "4 days ago", type: "join" },
                      ].map((activity, index) => (
                        <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                            activity.type === 'join' ? 'bg-green-400' : 
                            activity.type === 'redeem' ? 'bg-yellow-400' : 'bg-blue-400'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white">
                              <span className="font-medium">{activity.user}</span> {activity.action}
                            </p>
                            <p className="text-xs text-gray-400">{activity.time}</p>
                          </div>
                        </div>
                      ))
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

              {/* Top Performing Content */}
              <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Top Performing</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-300">Instagram Posts</span>
                        <span className="text-sm font-medium text-white">1,247 likes</span>
                      </div>
                      <Progress value={85} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-300">TikTok Videos</span>
                        <span className="text-sm font-medium text-white">892 views</span>
                      </div>
                      <Progress value={65} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-300">Twitter Engagement</span>
                        <span className="text-sm font-medium text-white">543 interactions</span>
                      </div>
                      <Progress value={45} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}