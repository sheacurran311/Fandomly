import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import DynamicProvider from "@/components/auth/dynamic-provider";
import Navigation from "@/components/layout/navigation";
import Footer from "@/components/layout/footer";
import Home from "@/pages/home";
import Marketplace from "@/pages/marketplace";
import CreatorOnboarding from "@/pages/creator-onboarding";

import CreatorDashboard from "@/pages/creator-dashboard";
import FanDashboard from "@/pages/fan-dashboard";
import NILDashboard from "@/pages/nil-dashboard";
import RBACDashboard from "@/pages/rbac-dashboard";
import Auth from "@/pages/auth";
import NotFound from "@/pages/not-found";
import DashboardRouter from "@/components/auth/dashboard-router";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/marketplace" component={Marketplace} />
      <Route path="/creator-onboarding" component={CreatorOnboarding} />

      <Route path="/creator-dashboard" component={CreatorDashboard} />
      <Route path="/fan-dashboard" component={FanDashboard} />
      <Route path="/nil-dashboard" component={NILDashboard} />
      <Route path="/rbac-dashboard" component={RBACDashboard} />
      <Route path="/dashboard" component={DashboardRouter} />
      <Route path="/auth" component={Auth} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <DynamicProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <div className="min-h-screen bg-brand-dark-bg">
            <Navigation />
            <main>
              <Router />
            </main>
            <Footer />
          </div>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </DynamicProvider>
  );
}

export default App;
