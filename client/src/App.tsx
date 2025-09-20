import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import DynamicProvider from "@/components/auth/dynamic-provider";
import AuthRouter from "@/components/auth/auth-router";
import Navigation from "@/components/layout/navigation";
import Footer from "@/components/layout/footer";
import Home from "@/pages/home";
import Marketplace from "@/pages/marketplace";
import UserTypeSelection from "@/pages/user-type-selection";
import CreatorTypeSelection from "@/pages/creator-type-selection";
import CreatorOnboarding from "@/pages/creator-onboarding";
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
import CreatorNIL from "@/pages/creator-dashboard/nil";
import CreatorCampaigns from "@/pages/creator-dashboard/campaigns";
import CreatorSettings from "@/pages/creator-dashboard/settings";
import BillingPage from "@/pages/billing";
import FanDashboard from "@/pages/fan-dashboard";
import FanCampaigns from "@/pages/fan-dashboard/campaigns";
import FanSocial from "@/pages/fan-dashboard/social";
import FanFollowing from "@/pages/fan-dashboard/following";
import FanAchievements from "@/pages/fan-dashboard/achievements";
import FanPoints from "@/pages/fan-dashboard/points";
import FanNotifications from "@/pages/fan-dashboard/notifications";
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
import TermsOfService from "@/pages/terms-of-service";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/marketplace" component={Marketplace} />
      <Route path="/user-type-selection" component={UserTypeSelection} />
      <Route path="/creator-type-selection" component={CreatorTypeSelection} />
      <Route path="/creator-onboarding" component={CreatorOnboarding} />
      <Route path="/campaign-builder" component={CampaignBuilder} />
      <Route path="/tenant-setup" component={TenantSetup} />
      <Route path="/branding-studio" component={BrandingStudio} />
      <Route path="/creator-dashboard" component={CreatorDashboard} />
      <Route path="/creator-dashboard/analytics" component={CreatorAnalytics} />
      <Route path="/creator-dashboard/social" component={CreatorSocial} />
      <Route path="/creator-dashboard/fans" component={CreatorFans} />
      <Route path="/creator-dashboard/growth" component={CreatorGrowth} />
      <Route path="/creator-dashboard/revenue" component={CreatorRevenue} />
      <Route path="/creator-dashboard/rewards" component={CreatorRewards} />
      <Route path="/creator-dashboard/nil" component={CreatorNIL} />
      <Route path="/creator-dashboard/campaigns" component={CreatorCampaigns} />
      <Route path="/creator-dashboard/billing" component={BillingPage} />
      <Route path="/creator-dashboard/settings" component={CreatorSettings} />
      <Route path="/fan-dashboard" component={FanDashboard} />
      <Route path="/fan-dashboard/campaigns" component={FanCampaigns} />
      <Route path="/fan-dashboard/social" component={FanSocial} />
      <Route path="/fan-dashboard/following" component={FanFollowing} />
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
      
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/data-deletion" component={DataDeletion} />
      <Route path="/terms-of-service" component={TermsOfService} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <DynamicProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthRouter>
            <div className="min-h-screen bg-brand-dark-bg">
                <Navigation />
                <main>
                  <Router />
                </main>
                <Footer />
            </div>
            <Toaster />
          </AuthRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </DynamicProvider>
  );
}

export default App;
