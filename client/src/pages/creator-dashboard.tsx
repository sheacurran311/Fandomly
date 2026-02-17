import { useAuth } from "@/hooks/use-auth";
import { useCreatorStats, useCreatorActivity } from "@/hooks/use-creator-dashboard";
import { useContentAnalytics } from "@/hooks/use-analytics";
import { useSocialConnections } from "@/hooks/use-social-connections";
import DashboardLayout from "@/components/layout/dashboard-layout";
import DashboardCard from "@/components/dashboard/dashboard-card";
import RevenueWidget from "@/components/dashboard/revenue-widget";
import LeaderboardWidget from "@/components/dashboard/leaderboard-widget";
import NewFansWidget from "@/components/dashboard/new-fans-widget";
import { useInstagramConnection } from "@/contexts/instagram-connection-context";
import InstagramSDKManager from "@/lib/instagram";
import { useEffect, useMemo } from "react";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  DollarSign,
  Loader2,
  CheckCircle2,
  Gift,
  Circle,
  Rocket,
  ChevronRight,
  Activity,
  ExternalLink,
  Link2
} from "lucide-react";
import { 
  FaFacebook, 
  FaTwitter, 
  FaInstagram, 
  FaTiktok, 
  FaYoutube, 
  FaSpotify, 
  FaDiscord, 
  FaTwitch 
} from "react-icons/fa";

// Social platforms configuration
const SOCIAL_PLATFORMS = [
  { id: 'facebook', name: 'Facebook', icon: FaFacebook, color: 'text-blue-500' },
  { id: 'twitter', name: 'X', icon: FaTwitter, color: 'text-gray-400' },
  { id: 'instagram', name: 'Instagram', icon: FaInstagram, color: 'text-pink-500' },
  { id: 'tiktok', name: 'TikTok', icon: FaTiktok, color: 'text-white' },
  { id: 'youtube', name: 'YouTube', icon: FaYoutube, color: 'text-red-500' },
  { id: 'spotify', name: 'Spotify', icon: FaSpotify, color: 'text-green-500' },
  { id: 'discord', name: 'Discord', icon: FaDiscord, color: 'text-indigo-400' },
  { id: 'twitch', name: 'Twitch', icon: FaTwitch, color: 'text-purple-500' },
];

function TopPerformingWidget() {
  const { data, isLoading } = useContentAnalytics('all', 'views', 3);
  const content = data?.content || [];

  if (isLoading) {
    return (
      <Card className="bg-white/5 backdrop-blur-lg border border-white/10 h-full">
        <CardHeader>
          <CardTitle className="text-white text-sm">Top Performing Content</CardTitle>
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
      <Card className="bg-white/5 backdrop-blur-lg border border-white/10 h-full">
        <CardHeader>
          <CardTitle className="text-white text-sm">Top Performing Content</CardTitle>
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
    <Card className="bg-white/5 backdrop-blur-lg border border-white/10 h-full">
      <CardHeader>
        <CardTitle className="text-white text-sm">Top Performing Content</CardTitle>
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

// Compact social connections status row
function ConnectedPlatformsRow() {
  const { isPlatformConnected, isLoading } = useSocialConnections();
  
  const connectedCount = SOCIAL_PLATFORMS.filter(p => isPlatformConnected(p.id)).length;
  const totalCount = SOCIAL_PLATFORMS.length;

  return (
    <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-brand-secondary" />
            <span>Connected Platforms</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-3 text-xs text-brand-primary hover:text-white hover:bg-brand-primary/20"
            onClick={() => window.location.href = '/creator-dashboard/social'}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Manage All
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Platform icons row */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              {SOCIAL_PLATFORMS.map((platform) => {
                const Icon = platform.icon;
                const isConnected = isPlatformConnected(platform.id);
                return (
                  <div 
                    key={platform.id} 
                    className="flex flex-col items-center gap-1.5 min-w-[60px]"
                    title={`${platform.name}: ${isConnected ? 'Connected' : 'Not connected'}`}
                  >
                    <div className={`relative p-2.5 rounded-lg transition-colors ${
                      isConnected 
                        ? 'bg-white/10' 
                        : 'bg-white/5 opacity-50'
                    }`}>
                      <Icon className={`h-5 w-5 ${isConnected ? platform.color : 'text-gray-500'}`} />
                      {/* Status indicator dot */}
                      <div className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-brand-dark-bg ${
                        isConnected ? 'bg-green-400' : 'bg-gray-500'
                      }`} />
                    </div>
                    <span className={`text-[10px] ${isConnected ? 'text-gray-300' : 'text-gray-500'}`}>
                      {platform.name}
                    </span>
                  </div>
                );
              })}
            </div>
            
            {/* Connection summary */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <span className="text-sm text-gray-400">
                {connectedCount} of {totalCount} platforms connected
              </span>
              {connectedCount < totalCount && (
                <span className="text-xs text-brand-secondary">
                  +{(totalCount - connectedCount) * 500} potential points
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CreatorDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { data: creatorStats, isLoading: statsLoading, error: statsError } = useCreatorStats();
  const { data: recentActivity, isLoading: activityLoading } = useCreatorActivity();
  
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
        const errorResult = { success: false, error: errorDescription || error };
        
        // Always store in localStorage for COOP fallback (Cross-Origin-Opener-Policy can null window.opener)
        if (state) {
          try {
            localStorage.setItem(`instagram_oauth_result_${state}`, JSON.stringify(errorResult));
            console.log('[Creator Dashboard] Stored error result in localStorage for state:', state);
          } catch (e) {
            console.error('[Creator Dashboard] Failed to store result in localStorage:', e);
          }
        }
        
        // If opened in popup, communicate result to parent
        if (window.opener) {
          console.log('[Creator Dashboard] Communicating error to parent window');
          window.opener.postMessage({
            type: 'instagram-oauth-result',
            result: errorResult
          }, window.location.origin);
          
          // Store result in parent window for fallback
          (window.opener as any).instagramCallbackData = errorResult;
          
          window.close();
          return;
        }
        
        // If no opener but state looks like popup flow, close the window
        if (state && state.startsWith('instagram_')) {
          console.log('[Creator Dashboard] No opener (likely COOP), closing popup - parent will read localStorage');
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
          
          // Always store in localStorage for COOP fallback
          if (state) {
            try {
              // Augment result with connectionData for parent-side saving
              let augmentedResult: any = result;
              if (result.success && result.accessToken && result.user) {
                augmentedResult = {
                  ...result,
                  connectionData: {
                    platform: 'instagram',
                    platformUserId: result.user.id,
                    platformUsername: result.user.username,
                    platformDisplayName: result.user.name || result.user.username,
                    accessToken: result.accessToken,
                    profileData: {
                      profile_picture_url: result.user.profile_picture_url,
                      followers_count: result.user.followers_count,
                      media_count: result.user.media_count,
                      account_type: result.user.account_type,
                    },
                  }
                };
              }
              localStorage.setItem(`instagram_oauth_result_${state}`, JSON.stringify(augmentedResult));
              console.log('[Creator Dashboard] Stored result in localStorage for state:', state);
            } catch (e) {
              console.error('[Creator Dashboard] Failed to store result in localStorage:', e);
            }
          }

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
            
            // If no opener but state looks like popup flow, close the window
            if (state && state.startsWith('instagram_')) {
              console.log('[Creator Dashboard] No opener (likely COOP), closing popup - parent will read localStorage');
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
            
            // If no opener but state looks like popup flow, close the window
            if (state && state.startsWith('instagram_')) {
              console.log('[Creator Dashboard] No opener (likely COOP), closing popup - parent will read localStorage');
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
          const errorResult = {
            success: false,
            error: error instanceof Error ? error.message : "An error occurred while connecting Instagram"
          };
          
          // Store error in localStorage for COOP fallback
          if (state) {
            try {
              localStorage.setItem(`instagram_oauth_result_${state}`, JSON.stringify(errorResult));
            } catch (e) {
              console.error('[Creator Dashboard] Failed to store error in localStorage:', e);
            }
          }
          
          // If opened in popup, communicate result to parent
          if (window.opener) {
            window.opener.postMessage({
              type: 'instagram-oauth-result',
              result: errorResult
            }, window.location.origin);
            
            // Store result in parent window for fallback
            (window.opener as any).instagramCallbackData = errorResult;
            
            window.close();
            return;
          }
          
          // If no opener but state looks like popup flow, close the window
          if (state && state.startsWith('instagram_')) {
            console.log('[Creator Dashboard] No opener (likely COOP), closing popup - parent will read localStorage');
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
        if (!window.opener && !(state && state.startsWith('instagram_'))) {
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
  const { data: programs = [], isLoading: programsLoading } = useQuery<any[]>({
    queryKey: ["/api/programs"],
    enabled: isAuthenticated && user?.userType === 'creator',
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  });
  const program = programs[0]; // Single-program model
  const programPageConfig = program?.pageConfig || {};

  // Calculate setup completion checklist
  // Each step is tied to actual creator work with clear completion criteria
  const setupChecklist = useMemo(() => {
    if (!program) return null;

    // Check if name has been customized from the auto-generated default
    // Default format is "{DisplayName}'s Program" - we check if it's been changed
    const defaultNamePattern = /'s Program$/;
    const hasCustomName = !!program.name && 
      !defaultNamePattern.test(program.name) && 
      program.name !== `${user?.username}'s Program`;
    
    // Check if description is meaningful (not empty and has some content)
    const hasDescription = !!program.description && program.description.trim().length > 10;
    
    // Check if logo or banner has been uploaded
    const hasPhoto = !!programPageConfig.logo || !!programPageConfig.headerImage;
    
    // Check if theme has been explicitly customized beyond the auto-assigned default
    // Default themes are assigned based on creator type, so having a templateId alone doesn't mean customization
    // We consider it "customized" if they've changed colors from common defaults or added branding
    const defaultColors = ['#8B5CF6', '#06B6D4', '#10B981']; // Common default primaries
    const hasCustomColors = programPageConfig.brandColors && (
      !defaultColors.includes(programPageConfig.brandColors.primary) ||
      !defaultColors.includes(programPageConfig.brandColors.secondary)
    );
    const hasCustomTheme = hasCustomColors || hasPhoto; // Consider theme done if they've added any branding
    
    // Check if any social links have been added
    const hasSocialLinks = programPageConfig.socialLinks && 
      Object.values(programPageConfig.socialLinks).some((v: any) => !!v && String(v).trim() !== '');

    const items = [
      {
        id: 'name',
        label: 'Program name & description',
        completed: hasCustomName && hasDescription,
        required: true,
        link: '/creator-dashboard/program-builder',
      },
      {
        id: 'photo',
        label: 'Add a photo (logo or banner)',
        completed: hasPhoto,
        required: true,
        link: '/creator-dashboard/program-builder',
      },
      {
        id: 'theme',
        label: 'Customize your theme',
        completed: hasCustomTheme, // Complete if colors changed or branding added
        required: false,
        link: '/creator-dashboard/program-builder',
      },
      {
        id: 'social',
        label: 'Connect social platforms',
        completed: hasSocialLinks,
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
  }, [program, programPageConfig, user?.username]);

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
  const requiredItemsComplete = finalChecklist?.filter(i => i.required && !i.completed).length === 0;
  const isPublished = program?.status === 'published';
  
  // Show the setup checklist when:
  // 1. Program exists and is loaded
  // 2. Program is NOT published (once published, they've completed setup)
  // 3. Either: not all required items are complete, OR all items aren't complete yet
  // This ensures the checklist stays visible until the creator publishes or completes all steps
  const showSetupChecklist = !!program && !programsLoading && !isPublished && finalChecklist && (
    !requiredItemsComplete || completedCount < totalCount
  );

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
        
        <div className="relative z-10 p-6 space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome back, {user.username || "Creator"}!
            </h1>
            <p className="text-gray-400">
              Here's what's happening with your community today.
            </p>
          </div>

          {/* Program Setup Checklist - shown for unpublished programs */}
          {showSetupChecklist && finalChecklist && (
            <Card className="bg-gradient-to-br from-brand-primary/10 to-brand-accent/5 backdrop-blur-lg border border-brand-primary/20">
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

          {/* SECTION 1: Key Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

          {/* SECTION 2: Fans & Engagement Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activity - takes 2/3 */}
            <div className="lg:col-span-2">
              <Card className="bg-white/5 backdrop-blur-lg border border-white/10 h-full">
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
                  <div className="max-h-[400px] overflow-y-auto space-y-3 custom-scrollbar pr-2">
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
                      recentActivity.slice(0, 8).map((activity, index) => (
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
            </div>

            {/* Fan widgets stacked - takes 1/3 */}
            <div className="space-y-6">
              <LeaderboardWidget />
              <NewFansWidget />
            </div>
          </div>

          {/* SECTION 3: Social Networks Row */}
          <ConnectedPlatformsRow />

          {/* SECTION 4: Revenue & Performance Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RevenueWidget />
            <TopPerformingWidget />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
