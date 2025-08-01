import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import AuthModal from "@/components/auth/auth-modal";

export default function Navigation() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { user, setShowAuthFlow } = useDynamicContext();

  const handleConnectWallet = () => {
    if (user) {
      // User is already connected, maybe show user menu
      return;
    }
    setShowAuthFlow(true);
  };

  return (
    <>
      <nav className="bg-brand-dark-purple/90 backdrop-blur-lg border-b border-brand-primary/20 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-3">
                <img src="/logo.svg" alt="Fandomly" className="h-8 w-auto" />
              </Link>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/#features" className="text-gray-300 hover:text-brand-secondary transition-colors">
                Features
              </Link>
              <Link href="/marketplace" className="text-gray-300 hover:text-brand-secondary transition-colors">
                Marketplace
              </Link>
              <Link href="/#pricing" className="text-gray-300 hover:text-brand-secondary transition-colors">
                Pricing
              </Link>
              {user ? (
                <div className="flex items-center space-x-4">
                  <Link href="/dashboard">
                    <Button variant="outline" className="border-brand-secondary text-brand-secondary hover:bg-brand-secondary hover:text-brand-dark-bg">
                      Dashboard
                    </Button>
                  </Link>
                  <div className="w-8 h-8 bg-brand-primary rounded-full flex items-center justify-center">
                    {user.alias?.[0] || user.email?.[0] || "U"}
                  </div>
                </div>
              ) : (
                <Button 
                  onClick={handleConnectWallet}
                  className="bg-brand-primary hover:bg-brand-primary/80 text-white font-medium transition-all duration-200 hover:scale-105"
                >
                  Connect Wallet
                </Button>
              )}
            </div>
            
            <button 
              className="md:hidden text-white"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-brand-primary/20">
              <div className="flex flex-col space-y-4">
                <Link href="/#features" className="text-gray-300 hover:text-brand-secondary transition-colors">
                  Features
                </Link>
                <Link href="/marketplace" className="text-gray-300 hover:text-brand-secondary transition-colors">
                  Marketplace
                </Link>
                <Link href="/#pricing" className="text-gray-300 hover:text-brand-secondary transition-colors">
                  Pricing
                </Link>
                {user ? (
                  <Link href="/dashboard">
                    <Button className="w-full bg-brand-primary hover:bg-brand-primary/80">
                      Dashboard
                    </Button>
                  </Link>
                ) : (
                  <Button 
                    onClick={handleConnectWallet}
                    className="w-full bg-brand-primary hover:bg-brand-primary/80"
                  >
                    Connect Wallet
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      <AuthModal open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen} />
    </>
  );
}
