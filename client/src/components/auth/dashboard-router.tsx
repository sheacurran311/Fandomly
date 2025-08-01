import { useState, useEffect } from "react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useLocation } from "wouter";
import AccountTypeModal from "./account-type-modal";
import FanDashboard from "@/pages/fan-dashboard";
import CreatorDashboard from "@/pages/creator-dashboard";
import ComprehensiveCreatorFlow from "@/components/onboarding/comprehensive-creator-flow";
import SimpleFanFlow from "@/components/onboarding/simple-fan-flow";

export default function DashboardRouter() {
  const { user } = useDynamicContext();
  const [, setLocation] = useLocation();
  const [showAccountTypeModal, setShowAccountTypeModal] = useState(false);
  const [userType, setUserType] = useState<'fan' | 'creator' | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!user) {
      // Not authenticated, redirect to home
      setLocation('/');
      return;
    }

    // Check if user has already selected an account type
    const storedType = localStorage.getItem('userType') as 'fan' | 'creator' | null;
    
    if (storedType) {
      setUserType(storedType);
    } else {
      // Show account type selection modal
      setShowAccountTypeModal(true);
    }
  }, [user, setLocation]);

  const handleAccountTypeSelect = (type: 'fan' | 'creator') => {
    setUserType(type);
    setShowAccountTypeModal(false);
    setShowOnboarding(true);
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    // Redirect to appropriate dashboard
    if (userType === 'creator') {
      setLocation('/creator-dashboard');
    } else {
      setLocation('/fan-dashboard');
    }
  };

  // Show loading while determining user type
  if (!user || (!userType && !showAccountTypeModal)) {
    return (
      <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <AccountTypeModal 
        open={showAccountTypeModal}
        onSelect={handleAccountTypeSelect}
      />
      
      {showOnboarding ? (
        userType === 'creator' ? (
          <ComprehensiveCreatorFlow onComplete={handleOnboardingComplete} />
        ) : (
          <SimpleFanFlow onComplete={handleOnboardingComplete} />
        )
      ) : (
        userType === 'creator' ? <CreatorDashboard /> : <FanDashboard />
      )}
    </>
  );
}