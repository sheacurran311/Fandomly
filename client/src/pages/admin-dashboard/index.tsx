import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect to overview by default
  useEffect(() => {
    if (user?.role === 'fandomly_admin') {
      setLocation("/admin-dashboard/overview");
    } else if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  // Show loading while redirecting
  return (
    <div className="flex items-center justify-center min-h-screen bg-brand-dark-bg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

