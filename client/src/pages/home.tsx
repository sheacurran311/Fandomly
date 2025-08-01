import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Palette, Share2, Coins, BarChart3, Layers, Smartphone, Play, CheckCircle, X, ArrowRight } from "lucide-react";
import CreatorCard from "@/components/creator/creator-card";
import { type Creator } from "@shared/schema";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

export default function Home() {
  const { user, setShowAuthFlow } = useDynamicContext();

  const { data: creators = [] } = useQuery<Creator[]>({
    queryKey: ["/api/creators"],
    enabled: true,
  });

  const handleConnectWallet = () => {
    setShowAuthFlow(true);
  };

  const handleStartCreatorSignup = () => {
    if (!user) {
      setShowAuthFlow(true);
      return;
    }
    // Navigate to enhanced creator onboarding
    window.location.href = "/creator-onboarding";
  };

  return (
    <div className="min-h-screen bg-brand-dark-bg">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/20 via-brand-dark-bg to-brand-accent/20"></div>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=1080')] bg-cover bg-center opacity-10"></div>
        
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold mb-8 leading-tight">
              <span className="gradient-text">Launch Loyalty Programs</span><br />
              <span className="text-white">That Build Your Fanbase</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Create customizable loyalty and rewards programs for your fans. Integrate social media, offer exclusive perks, and build lasting relationships with Web3-powered rewards.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
              <Button 
                onClick={handleStartCreatorSignup}
                size="lg"
                className="gradient-primary text-white px-12 py-6 rounded-2xl font-bold text-xl transition-all duration-300 hover:scale-110 shadow-2xl hover:shadow-brand-primary/25 relative overflow-hidden group"
              >
                <span className="relative z-10">🚀 Build Your Loyalty Empire</span>
                <ArrowRight className="ml-3 h-6 w-6 relative z-10 transition-transform group-hover:translate-x-1" />
                <div className="absolute inset-0 bg-gradient-to-r from-brand-secondary/20 to-brand-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Button>
              <Link href="/marketplace">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-2 border-brand-secondary text-brand-secondary hover:bg-brand-secondary hover:text-brand-dark-bg px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-200"
                >
                  Explore Programs
                  <Coins className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
            
            {/* Trust Indicators */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 opacity-60">
              <div className="text-center">
                <div className="text-3xl font-bold text-brand-secondary">50K+</div>
                <div className="text-sm text-gray-400">Active Creators</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-brand-secondary">2M+</div>
                <div className="text-sm text-gray-400">Fans Engaged</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-brand-secondary">$10M+</div>
                <div className="text-sm text-gray-400">Rewards Distributed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-brand-secondary">99.9%</div>
                <div className="text-sm text-gray-400">Uptime</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gradient-to-b from-brand-dark-bg to-brand-dark-purple/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 gradient-text">
              Everything You Need to Engage Your Fans
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Built for athletes, creators, and musicians who want to build lasting relationships with their audience through innovative loyalty programs.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="bg-white/5 backdrop-blur-lg border-white/10 hover:border-brand-primary/50 transition-all duration-300 hover:scale-105">
              <CardContent className="p-8">
                <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mb-6">
                  <Palette className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-white">Custom Branding</h3>
                <p className="text-gray-300 leading-relaxed">
                  White-label customization lets each creator build their unique brand experience. Custom colors, logos, and messaging for every program.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white/5 backdrop-blur-lg border-white/10 hover:border-brand-secondary/50 transition-all duration-300 hover:scale-105">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-brand-secondary rounded-2xl flex items-center justify-center mb-6">
                  <Share2 className="h-8 w-8 text-brand-dark-bg" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-white">Social Integration</h3>
                <p className="text-gray-300 leading-relaxed">
                  Connect Instagram, TikTok, X, and Facebook. Reward fans for engagement, shares, and user-generated content automatically.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white/5 backdrop-blur-lg border-white/10 hover:border-brand-accent/50 transition-all duration-300 hover:scale-105">
              <CardContent className="p-8">
                <div className="w-16 h-16 gradient-accent rounded-2xl flex items-center justify-center mb-6">
                  <Coins className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-white">Web3 Rewards</h3>
                <p className="text-gray-300 leading-relaxed">
                  Issue NFTs, tokens, and digital collectibles. Multi-chain support for Bitcoin, Ethereum, Solana, and more through Dynamic.xyz integration.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white/5 backdrop-blur-lg border-white/10 hover:border-brand-primary/50 transition-all duration-300 hover:scale-105">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-brand-primary rounded-2xl flex items-center justify-center mb-6">
                  <BarChart3 className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-white">Analytics Dashboard</h3>
                <p className="text-gray-300 leading-relaxed">
                  Track fan engagement, reward redemption rates, and program performance with real-time analytics and actionable insights.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white/5 backdrop-blur-lg border-white/10 hover:border-brand-secondary/50 transition-all duration-300 hover:scale-105">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-brand-secondary rounded-2xl flex items-center justify-center mb-6">
                  <Layers className="h-8 w-8 text-brand-dark-bg" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-white">Tiered Programs</h3>
                <p className="text-gray-300 leading-relaxed">
                  Create multiple reward tiers with exclusive perks. VIP access, early releases, meet-and-greets, and personalized experiences.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white/5 backdrop-blur-lg border-white/10 hover:border-brand-accent/50 transition-all duration-300 hover:scale-105">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-brand-accent rounded-2xl flex items-center justify-center mb-6">
                  <Smartphone className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-white">Mobile-First</h3>
                <p className="text-gray-300 leading-relaxed">
                  Optimized for mobile experiences where your fans spend most of their time. Native app feel with progressive web app technology.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Creator Marketplace Preview */}
      <section id="marketplace" className="py-24 bg-gradient-to-b from-brand-dark-purple/20 to-brand-dark-bg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              <span className="text-brand-secondary">Discover</span>{" "}
              <span className="text-brand-primary">Amazing Creators</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Join loyalty programs from your favorite athletes, musicians, and creators. Earn exclusive rewards and get closer to the action.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {creators.slice(0, 3).map((creator) => (
              <CreatorCard key={creator.id} creator={creator} />
            ))}
          </div>
          
          <div className="text-center">
            <Link href="/marketplace">
              <Button
                variant="outline"
                size="lg"
                className="border-2 border-brand-secondary text-brand-secondary hover:bg-brand-secondary hover:text-brand-dark-bg px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-200"
              >
                View All Creators
                <Coins className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-gradient-to-b from-brand-dark-purple/20 to-brand-dark-bg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 gradient-text">
              Choose Your Plan
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Start free and scale as you grow. All plans include our core loyalty features with increasing customization and analytics.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Starter Plan */}
            <Card className="bg-white/5 backdrop-blur-lg border-white/10 hover:border-brand-secondary/50 transition-all duration-300">
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-white mb-2">Starter</h3>
                  <div className="text-4xl font-bold text-brand-secondary mb-2">Free</div>
                  <p className="text-gray-400">Perfect for getting started</p>
                </div>
                
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center text-gray-300">
                    <CheckCircle className="h-5 w-5 text-brand-secondary mr-3" />
                    Up to 1,000 fans
                  </li>
                  <li className="flex items-center text-gray-300">
                    <CheckCircle className="h-5 w-5 text-brand-secondary mr-3" />
                    Basic loyalty program
                  </li>
                  <li className="flex items-center text-gray-300">
                    <CheckCircle className="h-5 w-5 text-brand-secondary mr-3" />
                    Social media integration
                  </li>
                  <li className="flex items-center text-gray-300">
                    <CheckCircle className="h-5 w-5 text-brand-secondary mr-3" />
                    Standard support
                  </li>
                  <li className="flex items-center text-gray-400">
                    <X className="h-5 w-5 mr-3" />
                    NFT rewards
                  </li>
                </ul>
                
                <Button
                  onClick={handleConnectWallet}
                  className="w-full border-2 border-brand-secondary text-brand-secondary hover:bg-brand-secondary hover:text-brand-dark-bg py-3 rounded-2xl font-semibold transition-all duration-200"
                  variant="outline"
                >
                  Get Started
                </Button>
              </CardContent>
            </Card>
            
            {/* Creator Plan */}
            <Card className="bg-white/5 backdrop-blur-lg border-2 border-brand-primary relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-brand-primary text-white px-4 py-1 text-sm font-semibold">
                Popular
              </div>
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-white mb-2">Creator</h3>
                  <div className="text-4xl font-bold text-brand-primary mb-2">
                    $49<span className="text-lg text-gray-400">/mo</span>
                  </div>
                  <p className="text-gray-400">For serious creators</p>
                </div>
                
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center text-gray-300">
                    <CheckCircle className="h-5 w-5 text-brand-primary mr-3" />
                    Up to 25,000 fans
                  </li>
                  <li className="flex items-center text-gray-300">
                    <CheckCircle className="h-5 w-5 text-brand-primary mr-3" />
                    Advanced analytics
                  </li>
                  <li className="flex items-center text-gray-300">
                    <CheckCircle className="h-5 w-5 text-brand-primary mr-3" />
                    NFT & token rewards
                  </li>
                  <li className="flex items-center text-gray-300">
                    <CheckCircle className="h-5 w-5 text-brand-primary mr-3" />
                    White-label branding
                  </li>
                  <li className="flex items-center text-gray-300">
                    <CheckCircle className="h-5 w-5 text-brand-primary mr-3" />
                    Priority support
                  </li>
                </ul>
                
                <Button
                  onClick={handleConnectWallet}
                  className="w-full bg-brand-primary hover:bg-brand-primary/80 text-white py-3 rounded-2xl font-semibold transition-all duration-200"
                >
                  Start Free Trial
                </Button>
              </CardContent>
            </Card>
            
            {/* Enterprise Plan */}
            <Card className="bg-white/5 backdrop-blur-lg border-white/10 hover:border-brand-accent/50 transition-all duration-300">
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-white mb-2">Enterprise</h3>
                  <div className="text-4xl font-bold text-brand-accent mb-2">Custom</div>
                  <p className="text-gray-400">For organizations</p>
                </div>
                
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center text-gray-300">
                    <CheckCircle className="h-5 w-5 text-brand-accent mr-3" />
                    Unlimited fans
                  </li>
                  <li className="flex items-center text-gray-300">
                    <CheckCircle className="h-5 w-5 text-brand-accent mr-3" />
                    Custom integrations
                  </li>
                  <li className="flex items-center text-gray-300">
                    <CheckCircle className="h-5 w-5 text-brand-accent mr-3" />
                    Multi-chain support
                  </li>
                  <li className="flex items-center text-gray-300">
                    <CheckCircle className="h-5 w-5 text-brand-accent mr-3" />
                    Dedicated account manager
                  </li>
                  <li className="flex items-center text-gray-300">
                    <CheckCircle className="h-5 w-5 text-brand-accent mr-3" />
                    SLA guarantee
                  </li>
                </ul>
                
                <Button
                  variant="outline"
                  className="w-full border-2 border-brand-accent text-brand-accent hover:bg-brand-accent hover:text-white py-3 rounded-2xl font-semibold transition-all duration-200"
                >
                  Contact Sales
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
