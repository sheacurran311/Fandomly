import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { AdminSidebar } from "./AdminSidebar";
import { Button } from "@/components/ui/button";
import { Home, LogOut, Shield, Wallet } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
}

export function AdminLayout({ children, title, description, actions }: AdminLayoutProps) {
  const { user, isLoading } = useAuth();
  const { user: dynamicUser, setShowAuthFlow, handleLogOut } = useDynamicContext();
  const [, setLocation] = useLocation();
  
  const logout = () => {
    handleLogOut();
  };
  
  // Redirect non-admins to home
  useEffect(() => {
    if (!isLoading && user && user.role !== 'fandomly_admin') {
      // Don't redirect, let the UI handle it
    }
  }, [user, isLoading]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-brand-dark-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated with Dynamic - show login prompt
  if (!dynamicUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-brand-dark-bg p-4">
        <Card className="max-w-md w-full bg-white/5 border-white/10">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-primary to-purple-600 flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl text-white">Admin Access Required</CardTitle>
            <CardDescription className="text-gray-400">
              Please connect your wallet to access the Fandomly Admin Dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => setShowAuthFlow(true)} 
              className="w-full bg-brand-primary hover:bg-brand-primary/90"
              size="lg"
            >
              <Wallet className="h-5 w-5 mr-2" />
              Connect Wallet
            </Button>
            <Link href="/">
              <Button variant="outline" className="w-full border-white/20">
                <Home className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Authenticated but not admin
  if (user && user.role !== 'fandomly_admin') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-brand-dark-bg p-4">
        <Card className="max-w-md w-full bg-white/5 border-white/10">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-red-400" />
            </div>
            <CardTitle className="text-2xl text-white">Access Denied</CardTitle>
            <CardDescription className="text-gray-400">
              You don't have permission to access the admin dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-sm text-yellow-400">
                <strong>Current Role:</strong> {user.role}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Only Fandomly administrators can access this area.
              </p>
            </div>
            <Link href="/">
              <Button variant="outline" className="w-full border-white/20">
                <Home className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User is admin - show dashboard
  return (
    <div className="flex h-screen bg-brand-dark-bg overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 flex-shrink-0">
        <AdminSidebar />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-brand-dark-purple/50 border-b border-white/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {title && (
                <div>
                  <h1 className="text-2xl font-bold text-white">{title}</h1>
                  {description && (
                    <p className="text-sm text-gray-400 mt-1">{description}</p>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {actions}
              
              <Link href="/">
                <Button variant="outline" size="sm" className="border-white/20">
                  <Home className="h-4 w-4 mr-2" />
                  Home
                </Button>
              </Link>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={logout}
                className="border-white/20 text-red-400 hover:bg-red-500/10"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

