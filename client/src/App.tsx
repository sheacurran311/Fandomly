import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import DynamicProvider from "@/components/auth/dynamic-provider";
import WalletAuthRouter from "@/components/auth/wallet-auth-router";
import Navigation from "@/components/layout/navigation";
import Footer from "@/components/layout/footer";
import Home from "@/pages/home";
import Marketplace from "@/pages/marketplace";
import CreatorOnboarding from "@/pages/creator-onboarding";
import CampaignBuilder from "@/pages/campaign-builder";
import TenantSetup from "@/pages/tenant-setup";
import BrandingStudio from "@/pages/branding-studio";
import CreatorDashboard from "@/pages/creator-dashboard";
import FanDashboard from "@/pages/fan-dashboard";
import NILDashboard from "@/pages/nil-dashboard";
import RBACDashboard from "@/pages/rbac-dashboard";
import Auth from "@/pages/auth";
import PrivacyPolicy from "@/pages/privacy-policy";
import DataDeletion from "@/pages/data-deletion";
import NotFound from "@/pages/not-found";
import DashboardRouter from "@/components/auth/dashboard-router";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/marketplace" component={Marketplace} />
      <Route path="/creator-onboarding" component={CreatorOnboarding} />
      <Route path="/campaign-builder" component={CampaignBuilder} />
      <Route path="/tenant-setup" component={TenantSetup} />
      <Route path="/branding-studio" component={BrandingStudio} />
      <Route path="/creator-dashboard" component={CreatorDashboard} />
      <Route path="/fan-dashboard" component={FanDashboard} />
      <Route path="/nil-dashboard" component={NILDashboard} />
      <Route path="/rbac-dashboard" component={RBACDashboard} />
      <Route path="/dashboard" component={DashboardRouter} />
      <Route path="/auth" component={Auth} />
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
          <WalletAuthRouter>
            <div className="min-h-screen bg-brand-dark-bg">
              <Navigation />
              <main>
                <Router />
              </main>
              <Footer />
            </div>
            <Toaster />
          </WalletAuthRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </DynamicProvider>
  );
}

export default App;
