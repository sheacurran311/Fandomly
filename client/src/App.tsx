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
import CreatorOnboarding from "@/pages/creator-onboarding";
import CampaignBuilder from "@/pages/campaign-builder";
import TenantSetup from "@/pages/tenant-setup";
import BrandingStudio from "@/pages/branding-studio";
import CreatorDashboard from "@/pages/creator-dashboard";
import CreatorAnalytics from "@/pages/creator-dashboard/analytics";
import CreatorSocial from "@/pages/creator-dashboard/social";
import FanDashboard from "@/pages/fan-dashboard";
import FanCampaigns from "@/pages/fan-dashboard/campaigns";
import FanFollowing from "@/pages/fan-dashboard/following";
import FanAchievements from "@/pages/fan-dashboard/achievements";
import NILDashboard from "@/pages/nil-dashboard";
import RBACDashboard from "@/pages/rbac-dashboard";
import FanOnboardingProfile from "@/pages/fan-onboarding-profile";
import FanChooseCreators from "@/pages/fan-choose-creators";

import PrivacyPolicy from "@/pages/privacy-policy";
import DataDeletion from "@/pages/data-deletion";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/marketplace" component={Marketplace} />
      <Route path="/user-type-selection" component={UserTypeSelection} />
      <Route path="/creator-onboarding" component={CreatorOnboarding} />
      <Route path="/campaign-builder" component={CampaignBuilder} />
      <Route path="/tenant-setup" component={TenantSetup} />
      <Route path="/branding-studio" component={BrandingStudio} />
      <Route path="/creator-dashboard" component={CreatorDashboard} />
      <Route path="/creator-dashboard/analytics" component={CreatorAnalytics} />
      <Route path="/creator-dashboard/social" component={CreatorSocial} />
      <Route path="/fan-dashboard" component={FanDashboard} />
      <Route path="/fan-dashboard/campaigns" component={FanCampaigns} />
      <Route path="/fan-dashboard/following" component={FanFollowing} />
      <Route path="/fan-dashboard/achievements" component={FanAchievements} />
      <Route path="/fan-onboarding/profile" component={FanOnboardingProfile} />
      <Route path="/fan-onboarding/choose-creators" component={FanChooseCreators} />
      <Route path="/nil-dashboard" component={NILDashboard} />
      <Route path="/rbac-dashboard" component={RBACDashboard} />
      <Route path="/dashboard" component={RBACDashboard} />

      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/data-deletion" component={DataDeletion} />
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
