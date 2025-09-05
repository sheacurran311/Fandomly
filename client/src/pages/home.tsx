import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Palette, Share2, Coins, BarChart3, Layers, Smartphone, Play, CheckCircle, X, ArrowRight, Trophy, Camera, Music, Users, Shield } from "lucide-react";
import CreatorCard from "@/components/creator/creator-card";
import NILAthleteSpotlight from "@/components/nil/nil-athlete-spotlight";
import NILValueCalculator from "@/components/nil/nil-value-calculator";
import { type Creator } from "@shared/schema";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import ConnectWalletButton from "@/components/auth/connect-wallet-button";

export default function Home() {
  const { user } = useDynamicContext();

  const { data: creators = [] } = useQuery<Creator[]>({
    queryKey: ["/api/creators"],
    enabled: true,
  });



  const handleStartCreatorSignup = () => {
    if (!user) {
      // User needs to connect wallet first
      return;
    }
    // Navigate to enhanced creator onboarding
    window.location.href = "/creator-onboarding";
  };

  return (
    <div className="min-h-screen bg-brand-dark-bg">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/20 via-brand-dark-bg to-brand-accent/20"></div>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=1080')] bg-cover bg-center opacity-10"></div>
        
        {/* Floating Elements for Visual Interest */}
        <div className="absolute top-20 left-4 md:left-10 w-20 md:w-32 h-20 md:h-32 bg-brand-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-4 md:right-10 w-24 md:w-40 h-24 md:h-40 bg-brand-secondary/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/4 w-16 md:w-24 h-16 md:h-24 bg-brand-accent/10 rounded-full blur-2xl animate-pulse delay-500" />
        
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-32">
          <div className="text-center max-w-5xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-2 mb-6 bg-white/10 backdrop-blur-lg rounded-full border border-white/20">
              <span className="text-xs sm:text-sm font-medium text-brand-secondary mr-2">🏆</span>
              <span className="text-xs sm:text-sm font-medium text-white">Trusted by 10,000+ Athletes & Creators</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-6 sm:mb-8 leading-tight tracking-tight">
              <span className="gradient-text block">AI-Powered Loyalty</span>
              <span className="text-white block mt-2">That Grows Your Fandom</span>
            </h1>
            
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 mb-10 sm:mb-12 max-w-4xl mx-auto leading-relaxed font-light px-4">
              Create AI-powered loyalty programs for athletes and creators, with built-in fan engagement, monetization tools, and optional Web3 rewards designed for the NIL era.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-stretch sm:items-center mb-12 sm:mb-16 px-4">
              <ConnectWalletButton 
                className="w-full sm:w-auto gradient-primary text-[#101636] px-8 sm:px-10 lg:px-12 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-lg sm:text-xl transition-all duration-300 hover:scale-105 shadow-2xl hover:shadow-brand-primary/25 min-h-[48px] sm:min-h-[56px]"
              >
                Start Now
              </ConnectWalletButton>
              <Button 
                onClick={() => window.location.href = "/marketplace"}
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-2 border-[#101636] text-[#101636] hover:scale-105 px-8 sm:px-10 lg:px-12 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-lg sm:text-xl transition-all duration-300 h-auto min-h-[48px] sm:min-h-[56px]"
              >
                Explore Programs
              </Button>
            </div>
            
            {/* Trust Indicators */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 opacity-70">
              <div className="text-center p-4 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="text-2xl md:text-3xl font-bold text-brand-secondary mb-1">50K+</div>
                <div className="text-xs md:text-sm text-gray-400">Active Creators</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="text-2xl md:text-3xl font-bold text-brand-secondary mb-1">2M+</div>
                <div className="text-xs md:text-sm text-gray-400">Fans Engaged</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="text-2xl md:text-3xl font-bold text-brand-secondary mb-1">$10M+</div>
                <div className="text-xs md:text-sm text-gray-400">Rewards Distributed</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="text-2xl md:text-3xl font-bold text-brand-secondary mb-1">99.9%</div>
                <div className="text-xs md:text-sm text-gray-400">Uptime</div>
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
              Built for NIL athletes, content creators, and musicians who want to build lasting relationships with their audience and monetize their personal brand through innovative loyalty programs.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            <Card className="group bg-white/5 backdrop-blur-lg border-white/10 hover:border-brand-primary/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-brand-primary/10">
              <CardContent className="p-6 lg:p-8">
                <div className="w-14 h-14 lg:w-16 lg:h-16 gradient-primary rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Palette className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
                </div>
                <h3 className="text-xl lg:text-2xl font-bold mb-4 text-white">Custom Branding</h3>
                <p className="text-gray-300 leading-relaxed text-sm lg:text-base">
                  White-label customization lets each creator build their unique brand experience. Custom colors, logos, and messaging for every program.
                </p>
              </CardContent>
            </Card>
            
            <Card className="group bg-white/5 backdrop-blur-lg border-white/10 hover:border-brand-primary/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-brand-primary/10">
              <CardContent className="p-6 lg:p-8">
                <div className="w-14 h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-blue-400/20 to-purple-400/20 border border-brand-primary/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Share2 className="h-6 w-6 lg:h-8 lg:w-8 text-brand-primary" />
                </div>
                <h3 className="text-xl lg:text-2xl font-bold mb-4 text-white">Social Integration</h3>
                <p className="text-gray-300 leading-relaxed text-sm lg:text-base">
                  Connect Instagram, TikTok, X, and Facebook. Reward fans for engagement, shares, and user-generated content automatically.
                </p>
              </CardContent>
            </Card>
            
            <Card className="group bg-white/5 backdrop-blur-lg border-white/10 hover:border-brand-accent/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-brand-accent/10">
              <CardContent className="p-6 lg:p-8">
                <div className="w-14 h-14 lg:w-16 lg:h-16 gradient-accent rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Coins className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
                </div>
                <h3 className="text-xl lg:text-2xl font-bold mb-4 text-white">Web3 Rewards</h3>
                <p className="text-gray-300 leading-relaxed text-sm lg:text-base">
                  Issue NFTs, tokens, and digital collectibles. Multi-chain support for Bitcoin, Ethereum, Solana, and more through Dynamic.xyz integration.
                </p>
              </CardContent>
            </Card>
            
            <Card className="group bg-white/5 backdrop-blur-lg border-white/10 hover:border-brand-primary/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-brand-primary/10">
              <CardContent className="p-6 lg:p-8">
                <div className="w-14 h-14 lg:w-16 lg:h-16 bg-brand-primary rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
                </div>
                <h3 className="text-xl lg:text-2xl font-bold mb-4 text-white">Analytics Dashboard</h3>
                <p className="text-gray-300 leading-relaxed text-sm lg:text-base">
                  Track fan engagement, reward redemption rates, and program performance with real-time analytics and actionable insights.
                </p>
              </CardContent>
            </Card>
            
            <Card className="group bg-white/5 backdrop-blur-lg border-white/10 hover:border-brand-secondary/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-brand-secondary/10">
              <CardContent className="p-6 lg:p-8">
                <div className="w-14 h-14 lg:w-16 lg:h-16 bg-brand-secondary rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Layers className="h-6 w-6 lg:h-8 lg:w-8 text-brand-dark-bg" />
                </div>
                <h3 className="text-xl lg:text-2xl font-bold mb-4 text-white">Tiered Programs</h3>
                <p className="text-gray-300 leading-relaxed text-sm lg:text-base">
                  Create multiple reward tiers with exclusive perks. VIP access, early releases, meet-and-greets, and personalized experiences.
                </p>
              </CardContent>
            </Card>
            
            <Card className="group bg-white/5 backdrop-blur-lg border-white/10 hover:border-brand-accent/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-brand-accent/10">
              <CardContent className="p-6 lg:p-8">
                <div className="w-14 h-14 lg:w-16 lg:h-16 bg-brand-accent rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Smartphone className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
                </div>
                <h3 className="text-xl lg:text-2xl font-bold mb-4 text-white">Mobile-First</h3>
                <p className="text-gray-300 leading-relaxed text-sm lg:text-base">
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
              Join loyalty programs from your favorite NIL athletes, musicians, and creators. Earn exclusive rewards, NFTs, and get closer to the action.
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
                className="border-2 border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-200"
              >
                View All Creators
                <Coins className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Who Fandomly Is For Section */}
      <section id="ideal-users" className="py-24 bg-gradient-to-b from-brand-dark-purple/20 to-brand-dark-bg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 gradient-text">
              Who Fandomly Is For
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Built specifically for NIL athletes, content creators, and musicians who want to monetize their personal brand and build lasting relationships with their fans through innovative Web3 loyalty programs.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
            {/* Athletes */}
            <Card className="bg-white/5 backdrop-blur-lg border-white/10 hover:border-amber-500/50 transition-all duration-300 hover:scale-105 group">
              <CardContent className="p-6 lg:p-8">
                <div className="text-center mb-6 lg:mb-8">
                  <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 lg:mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Trophy className="h-8 w-8 lg:h-10 lg:w-10 text-white" />
                  </div>
                  <h3 className="text-xl lg:text-2xl font-bold text-white mb-3 lg:mb-4">Athletes</h3>
                  <p className="text-gray-300 mb-4 lg:mb-6 text-sm lg:text-base">
                    Monetize your Name, Image, and Likeness with loyal fan programs. Perfect for NIL opportunities and building your personal sports brand.
                  </p>
                </div>
                
                <div className="space-y-3 mb-8">
                  <div className="flex items-center text-gray-300">
                    <CheckCircle className="h-4 w-4 text-amber-400 mr-3 flex-shrink-0" />
                    <span className="text-sm">Professional & Olympic Athletes</span>
                  </div>
                  <div className="flex items-center text-gray-300">
                    <CheckCircle className="h-4 w-4 text-amber-400 mr-3 flex-shrink-0" />
                    <span className="text-sm">College & University Sports</span>
                  </div>
                  <div className="flex items-center text-gray-300">
                    <CheckCircle className="h-4 w-4 text-amber-400 mr-3 flex-shrink-0" />
                    <span className="text-sm">High School Athletes</span>
                  </div>
                  <div className="flex items-center text-gray-300">
                    <CheckCircle className="h-4 w-4 text-amber-400 mr-3 flex-shrink-0" />
                    <span className="text-sm font-semibold">NIL Monetization Opportunities</span>
                  </div>
                </div>
                
                {user ? (
                  <Button
                    onClick={handleStartCreatorSignup}
                    className="w-full bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white py-3 rounded-2xl font-semibold transition-all duration-200"
                  >
                    Start as Athlete
                  </Button>
                ) : (
                  <ConnectWalletButton
                    className="w-full bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white py-3 rounded-2xl font-semibold transition-all duration-200"
                  >
                    Start Now
                  </ConnectWalletButton>
                )}
              </CardContent>
            </Card>
            
            {/* Content Creators */}
            <Card className="bg-white/5 backdrop-blur-lg border-2 border-blue-500 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-blue-500 text-white px-4 py-1 text-sm font-semibold">
                Popular
              </div>
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <div className="w-20 h-20 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Camera className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Content Creators</h3>
                  <p className="text-gray-300 mb-6">
                    Turn your content into a thriving community with rewards that keep fans coming back for more.
                  </p>
                </div>
                
                <div className="space-y-3 mb-8">
                  <div className="flex items-center text-gray-300">
                    <CheckCircle className="h-4 w-4 text-blue-400 mr-3 flex-shrink-0" />
                    <span className="text-sm">Social Media Influencers</span>
                  </div>
                  <div className="flex items-center text-gray-300">
                    <CheckCircle className="h-4 w-4 text-blue-400 mr-3 flex-shrink-0" />
                    <span className="text-sm">Video Content & Vloggers</span>
                  </div>
                  <div className="flex items-center text-gray-300">
                    <CheckCircle className="h-4 w-4 text-blue-400 mr-3 flex-shrink-0" />
                    <span className="text-sm">Photographers & Visual Artists</span>
                  </div>
                  <div className="flex items-center text-gray-300">
                    <CheckCircle className="h-4 w-4 text-blue-400 mr-3 flex-shrink-0" />
                    <span className="text-sm">Videographers & Filmmakers</span>
                  </div>
                </div>
                
                {user ? (
                  <Button
                    onClick={handleStartCreatorSignup}
                    className="w-full bg-gradient-to-r from-blue-400 to-cyan-500 hover:from-blue-500 hover:to-cyan-600 text-white py-3 rounded-2xl font-semibold transition-all duration-200"
                  >
                    Start as Creator
                  </Button>
                ) : (
                  <ConnectWalletButton
                    className="w-full bg-gradient-to-r from-blue-400 to-cyan-500 hover:from-blue-500 hover:to-cyan-600 text-white py-3 rounded-2xl font-semibold transition-all duration-200"
                  >
                    Start Now
                  </ConnectWalletButton>
                )}
              </CardContent>
            </Card>
            
            {/* Musicians */}
            <Card className="bg-white/5 backdrop-blur-lg border-white/10 hover:border-purple-500/50 transition-all duration-300 hover:scale-105">
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <div className="w-20 h-20 bg-gradient-to-r from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Music className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Musicians</h3>
                  <p className="text-gray-300 mb-6">
                    Build deeper connections with your audience and monetize your music in new and exciting ways.
                  </p>
                </div>
                
                <div className="space-y-3 mb-8">
                  <div className="flex items-center text-gray-300">
                    <CheckCircle className="h-4 w-4 text-purple-400 mr-3 flex-shrink-0" />
                    <span className="text-sm">Grammy & Award Winners</span>
                  </div>
                  <div className="flex items-center text-gray-300">
                    <CheckCircle className="h-4 w-4 text-purple-400 mr-3 flex-shrink-0" />
                    <span className="text-sm">Independent Artists</span>
                  </div>
                  <div className="flex items-center text-gray-300">
                    <CheckCircle className="h-4 w-4 text-purple-400 mr-3 flex-shrink-0" />
                    <span className="text-sm">Local & Emerging Artists</span>
                  </div>
                  <div className="flex items-center text-gray-300">
                    <CheckCircle className="h-4 w-4 text-purple-400 mr-3 flex-shrink-0" />
                    <span className="text-sm">Cover Artists & Entertainers</span>
                  </div>
                </div>
                
                {user ? (
                  <Button
                    onClick={handleStartCreatorSignup}
                    className="w-full bg-gradient-to-r from-purple-400 to-pink-500 hover:from-purple-500 hover:to-pink-600 text-white py-3 rounded-2xl font-semibold transition-all duration-200"
                  >
                    Start as Musician
                  </Button>
                ) : (
                  <ConnectWalletButton
                    className="w-full bg-gradient-to-r from-purple-400 to-pink-500 hover:from-purple-500 hover:to-pink-600 text-white py-3 rounded-2xl font-semibold transition-all duration-200"
                  >
                    Start Now
                  </ConnectWalletButton>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="text-center mt-12">
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 max-w-4xl mx-auto">
              <div className="flex items-start space-x-4">
                <Users className="h-8 w-8 text-brand-accent mt-1 flex-shrink-0" />
                <div className="text-left">
                  <h4 className="font-semibold text-brand-accent mb-2">No matter your level or niche</h4>
                  <p className="text-gray-300">
                    Whether you're a college athlete exploring NIL opportunities, an indie creator, or a global superstar, Fandomly scales with you. 
                    Our platform provides the tools you need to monetize your personal brand and build meaningful relationships with your audience through Web3 rewards.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NIL Features Sections */}
      <NILAthleteSpotlight />
      <NILValueCalculator />
      
      {/* Privacy Notice for Protected Features */}
      <section className="py-16 bg-gradient-to-b from-brand-dark-bg to-brand-dark-purple/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Card className="bg-white/5 backdrop-blur-lg border-white/10 max-w-4xl mx-auto">
            <CardContent className="p-8">
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-2xl flex items-center justify-center">
                  <Shield className="h-8 w-8 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">
                Advanced NIL Tools & Compliance Monitoring
              </h3>
              <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                Access personalized social media tracking, earnings analytics, and automated compliance monitoring. 
                Your data is protected and encrypted for your privacy and NCAA eligibility.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/auth">
                  <Button className="bg-brand-primary hover:bg-brand-primary/80 text-white px-8">
                    Connect Wallet to Access
                  </Button>
                </Link>
                <Link href="/nil-dashboard">
                  <Button variant="outline" className="border-2 border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white px-6 py-2 rounded-xl font-semibold transition-all duration-200">
                    View Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
