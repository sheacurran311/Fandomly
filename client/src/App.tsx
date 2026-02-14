import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
// New Auth System - JWT-based with Google + Social Logins
import AuthProvider from "@/components/auth/auth-provider";
import NewAuthRouter from "@/components/auth/new-auth-router";
import { AuthModalProvider } from "@/hooks/use-auth-modal";
import ErrorBoundary from "@/components/error-boundary";
import { useEffect } from "react";
import { initTikTokErrorHandler } from "@/lib/tiktok-error-handler";
import Navigation from "@/components/layout/navigation";
import Footer from "@/components/layout/footer";
import Home from "@/pages/home";
import Marketplace from "@/pages/marketplace";
import FindCreators from "@/pages/find-creators";
import UserTypeSelection from "@/pages/user-type-selection";
import CreatorTypeSelection from "@/pages/creator-type-selection";
import BrandTypeSelection from "@/pages/brand-type-selection";
import BrandOnboarding from "@/pages/brand-onboarding";
// CreatorOnboarding is deprecated - replaced by program builder with setup checklist
// Old route redirects to creator-dashboard via auth router
import CampaignBuilder from "@/pages/campaign-builder";
import TenantSetup from "@/pages/tenant-setup";
import BrandingStudio from "@/pages/branding-studio";
import CreatorDashboard from "@/pages/creator-dashboard";
import CreatorAnalytics from "@/pages/creator-dashboard/analytics";
import CreatorSocial from "@/pages/creator-dashboard/social";
import CreatorFans from "@/pages/creator-dashboard/fans";
import CreatorGrowth from "@/pages/creator-dashboard/growth";
import CreatorRevenue from "@/pages/creator-dashboard/revenue";
import CreatorRewards from "@/pages/creator-dashboard/rewards";
import CreatorTasks from "@/pages/creator-dashboard/tasks";
import CreatorActivity from "@/pages/creator-dashboard/activity";
import NftCollections from "@/pages/creator-dashboard/nft-collections";
import CreatorNIL from "@/pages/creator-dashboard/nil";
import CreatorCampaigns from "@/pages/creator-dashboard/campaigns";
import CreatorSettings from "@/pages/creator-dashboard/settings";
import ProgramBuilder from "@/pages/creator-dashboard/program-builder";
import CampaignBuilderNew from "@/pages/creator-dashboard/campaign-builder-new";
import ProgramPublic from "@/pages/program-public";
import BillingPage from "@/pages/billing";
import FanDashboard from "@/pages/fan-dashboard";
import FanCampaigns from "@/pages/fan-dashboard/campaigns";
import FanTasks from "@/pages/fan-dashboard/tasks";
import FanSocial from "@/pages/fan-dashboard/social";
import FanJoined from "@/pages/fan-dashboard/joined";
import FanAchievements from "@/pages/fan-dashboard/achievements";
import FanPoints from "@/pages/fan-dashboard/points";
import FanNotifications from "@/pages/fan-dashboard/notifications";
import FanNftCollection from "@/pages/fan-dashboard/nft-collection";
import FanSettings from "@/pages/fan-dashboard/settings";
import NILDashboard from "@/pages/nil-dashboard";
// RBAC Dashboard removed - users now route to type-specific dashboards
import FanOnboardingProfile from "@/pages/fan-onboarding-profile";
import FanChooseCreators from "@/pages/fan-choose-creators";
import Profile from "@/pages/profile";
import FanProfile from "@/pages/fan-profile";
import FacebookLikeCampaign from "@/pages/facebook-like-campaign";
import CreatorShowcase from "@/pages/creator-showcase";
import MetaGraphDebugger from "@/pages/meta-graph-debugger";
// Removed obsolete Facebook test login pages

import PrivacyPolicy from "@/pages/privacy-policy";
import DataDeletion from "@/pages/data-deletion";
import DataDeletionInfo from "@/pages/privacy/data-deletion";
import TermsOfService from "@/pages/terms-of-service";
import NotFound from "@/pages/not-found";
import InstagramCallback from "@/pages/instagram-callback";
import TikTokCallback from "@/pages/tiktok-callback";
import XCallback from "@/pages/x-callback";
import YouTubeCallback from "@/pages/youtube-callback";
import SpotifyCallback from "@/pages/spotify-callback";
import DiscordCallback from "@/pages/discord-callback";
import TwitchCallback from "@/pages/twitch-callback";
import KickCallback from "@/pages/kick-callback";
import PatreonCallback from "@/pages/patreon-callback";
import Login from "@/pages/login";
import GoogleCallback from "@/pages/auth/google-callback";
import CreatorPublic from "@/pages/creator-public";
import TaskBuilder from "@/pages/creator-dashboard/task-builder";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminOverview from "@/pages/admin-dashboard/overview";
import AdminUsers from "@/pages/admin-dashboard/users";
import AdminCreators from "@/pages/admin-dashboard/creators";
import AdminAgencies from "@/pages/admin-dashboard/agencies";
import AdminTasks from "@/pages/admin-dashboard/tasks";
import AdminPlatformTaskCreate from "@/pages/admin-dashboard/platform-tasks/create";
import AdminProfile from "@/pages/admin-dashboard/profile";
import AdminAnalytics from "@/pages/admin-dashboard/analytics";
import AdminNftManagement from "@/pages/admin-dashboard/nft-management";
import AgencyDashboard from "@/pages/agency-dashboard";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/find-creators" component={FindCreators} />
      <Route path="/marketplace" component={Marketplace} />
      <Route path="/user-type-selection" component={UserTypeSelection} />
      <Route path="/creator-type-selection" component={CreatorTypeSelection} />
      <Route path="/brand-type-selection" component={BrandTypeSelection} />
      <Route path="/brand-onboarding" component={BrandOnboarding} />
      {/* /creator-onboarding is deprecated - auth router redirects to /creator-dashboard */}
      <Route path="/creator-onboarding">{() => { window.location.href = '/creator-dashboard'; return null; }}</Route>
      <Route path="/campaign-builder" component={CampaignBuilder} />
      <Route path="/tenant-setup" component={TenantSetup} />
      <Route path="/branding-studio" component={BrandingStudio} />
      <Route path="/creator-dashboard">
        {() => {
          // Instagram OAuth redirects to /creator-dashboard with code + state params
          // Detect this and render the Instagram callback handler instead of the dashboard
          const params = new URLSearchParams(window.location.search);
          if (params.get('code') && params.get('state')?.startsWith('instagram_')) {
            return <InstagramCallback />;
          }
          return <CreatorDashboard />;
        }}
      </Route>
      <Route path="/creator-dashboard/program-builder" component={ProgramBuilder} />
      <Route path="/programs/:programId/preview" component={ProgramPublic} />
      <Route path="/creator-dashboard/analytics" component={CreatorAnalytics} />
      <Route path="/creator-dashboard/activity" component={CreatorActivity} />
      <Route path="/creator-dashboard/social" component={CreatorSocial} />
      <Route path="/creator-dashboard/fans" component={CreatorFans} />
      <Route path="/creator-dashboard/growth" component={CreatorGrowth} />
      <Route path="/creator-dashboard/revenue" component={CreatorRevenue} />
      <Route path="/creator-dashboard/rewards" component={CreatorRewards} />
      <Route path="/creator-dashboard/nft-collections" component={NftCollections} />
      <Route path="/creator-dashboard/tasks" component={CreatorTasks} />
      <Route path="/creator-dashboard/tasks/create" component={TaskBuilder} />
      <Route path="/creator-dashboard/tasks/edit/:id" component={TaskBuilder} />
      <Route path="/creator-dashboard/nil" component={CreatorNIL} />
      <Route path="/creator-dashboard/campaigns" component={CreatorCampaigns} />
      <Route path="/creator-dashboard/campaign-builder" component={CampaignBuilderNew} />
      <Route path="/creator-dashboard/billing" component={BillingPage} />
      <Route path="/creator-dashboard/settings" component={CreatorSettings} />
      <Route path="/fan-dashboard" component={FanDashboard} />
      <Route path="/fan-dashboard/campaigns" component={FanCampaigns} />
      <Route path="/fan-dashboard/tasks" component={FanTasks} />
      <Route path="/fan-dashboard/social" component={FanSocial} />
      <Route path="/fan-dashboard/joined" component={FanJoined} />
      {/* Redirect old route to new route */}
      <Route path="/fan-dashboard/following">
        {() => {
          window.location.href = "/fan-dashboard/joined";
          return null;
        }}
      </Route>
      <Route path="/fan-dashboard/nfts" component={FanNftCollection} />
      <Route path="/fan-dashboard/achievements" component={FanAchievements} />
      <Route path="/fan-dashboard/points" component={FanPoints} />
      <Route path="/fan-dashboard/notifications" component={FanNotifications} />
      <Route path="/fan-dashboard/billing" component={BillingPage} />
      <Route path="/fan-dashboard/settings" component={FanSettings} />
      <Route path="/fan-onboarding/profile" component={FanOnboardingProfile} />
      <Route path="/fan-onboarding/choose-creators" component={FanChooseCreators} />
      <Route path="/profile" component={Profile} />
      <Route path="/fan-profile" component={FanProfile} />
      <Route path="/facebook-like-campaign" component={FacebookLikeCampaign} />
      <Route path="/creator-showcase" component={CreatorShowcase} />
      <Route path="/meta-graph-debugger" component={MetaGraphDebugger} />
      {/* Deprecated facebook-login routes removed */}
      
      <Route path="/login" component={Login} />
      <Route path="/auth/google/callback" component={GoogleCallback} />
      <Route path="/instagram-callback" component={InstagramCallback} />
      <Route path="/tiktok-callback" component={TikTokCallback} />
      <Route path="/x-callback" component={XCallback} />
      <Route path="/youtube-callback" component={YouTubeCallback} />
      <Route path="/spotify-callback" component={SpotifyCallback} />
      <Route path="/discord-callback" component={DiscordCallback} />
      <Route path="/twitch-callback" component={TwitchCallback} />
      <Route path="/kick-callback" component={KickCallback} />
      <Route path="/patreon-callback" component={PatreonCallback} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/data-deletion" component={DataDeletion} />
      <Route path="/privacy/data-deletion" component={DataDeletionInfo} />
      <Route path="/terms-of-service" component={TermsOfService} />
      
      {/* Admin Dashboard Routes - Must come before creator store catch-all */}
      <Route path="/admin-dashboard" component={AdminDashboard} />
      <Route path="/admin-dashboard/overview" component={AdminOverview} />
      <Route path="/admin-dashboard/users" component={AdminUsers} />
      <Route path="/admin-dashboard/creators" component={AdminCreators} />
      <Route path="/admin-dashboard/agencies" component={AdminAgencies} />
      <Route path="/admin-dashboard/platform-tasks" component={AdminTasks} />
      <Route path="/admin-dashboard/platform-tasks/create" component={AdminPlatformTaskCreate} />
      <Route path="/admin-dashboard/platform-tasks/edit/:id" component={AdminPlatformTaskCreate} />
      <Route path="/admin-dashboard/tasks" component={() => { window.location.href = '/admin-dashboard/platform-tasks'; return null; }} />
      <Route path="/admin-dashboard/profile" component={AdminProfile} />
      <Route path="/admin-dashboard/nft-management" component={AdminNftManagement} />
      <Route path="/admin-dashboard/analytics" component={AdminAnalytics} />
      
      {/* Agency Dashboard */}
      <Route path="/agency-dashboard" component={AgencyDashboard} />
      
      {/* Program Public Page */}
      <Route path="/programs/:slug" component={ProgramPublic} />
      
      {/* Creator Public Page - Must be last before 404 to avoid catching other routes */}
      <Route path="/@:creatorUrl" component={CreatorPublic} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation();
  
  // Initialize TikTok error handler on app start
  useEffect(() => {
    initTikTokErrorHandler();
  }, []);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  // Define public routes that should show the full footer
  const publicRoutes = [
    '/',
    '/find-creators',
    '/privacy-policy',
    '/data-deletion',
    '/privacy/data-deletion',
    '/terms-of-service',
    '/creator-showcase',
  ];

  // Define onboarding routes that should hide navigation
  const onboardingRoutes = [
    '/user-type-selection',
    '/creator-type-selection',
    '/fan-onboarding-profile',
    '/fan-choose-creators',
  ];

  // Check if current route is public or onboarding
  const isPublicRoute = publicRoutes.some(route => location === route);
  const isOnboardingRoute = onboardingRoutes.some(route => location === route);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <AuthModalProvider>
              <NewAuthRouter>
                <div className="min-h-screen bg-brand-dark-bg">
                    {!isOnboardingRoute && <Navigation />}
                    <main>
                      <Router />
                    </main>
                    {isPublicRoute && <Footer />}
                </div>
                <Toaster />
              </NewAuthRouter>
            </AuthModalProvider>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
