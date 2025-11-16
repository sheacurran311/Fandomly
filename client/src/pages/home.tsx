import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Palette, Share2, Coins, BarChart3, Layers, Smartphone, Play, CheckCircle, X, ArrowRight, Trophy, Camera, Music, Users, Shield, Zap, Rocket, Sparkles, TrendingUp, Target, Building2 } from "lucide-react";
import CreatorCard from "@/components/creator/creator-card";
import NILAthleteSpotlight from "@/components/nil/nil-athlete-spotlight";
import NILValueCalculator from "@/components/nil/nil-value-calculator";
import { type Creator } from "@shared/schema";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import ConnectWalletButton from "@/components/auth/connect-wallet-button";
import { motion } from "framer-motion";

export default function Home() {
  const { user, setShowAuthFlow } = useDynamicContext();

  const { data: creators = [] } = useQuery<Creator[]>({
    queryKey: ["/api/creators"],
    enabled: true,
  });

  const handleUnauthenticatedClick = () => {
    // Trigger Dynamic auth modal for unauthenticated users
    setShowAuthFlow(true);
  };

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
      {/* ENHANCED HERO SECTION */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Dynamic Background with Gradient Mesh */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/15 via-brand-dark-bg to-brand-accent/15"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(225,6,152,0.1),rgba(20,254,238,0.05))]"></div>

        {/* Animated Floating Orbs */}
        <motion.div
          className="absolute top-10 left-5 w-40 h-40 bg-brand-primary/15 rounded-full blur-3xl"
          animate={{
            y: [0, -30, 0],
            x: [0, 15, 0]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-20 right-10 w-80 h-80 bg-brand-accent/10 rounded-full blur-3xl"
          animate={{
            y: [0, 40, 0],
            x: [0, -20, 0]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/3 left-1/3 w-48 h-48 bg-brand-secondary/8 rounded-full blur-3xl"
          animate={{
            y: [0, 25, 0],
            x: [0, 25, 0]
          }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />

        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-32 z-10">
          <div className="text-center max-w-6xl mx-auto">
            {/* Enhanced Badge with Animation */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="inline-flex items-center px-4 py-2 sm:px-5 sm:py-3 mb-8 glass-effect rounded-full border border-brand-accent/30 hover:border-brand-primary/50 transition-all"
            >
              <Sparkles className="w-5 h-5 text-brand-accent mr-2 animate-pulse" />
              <span className="text-sm sm:text-base font-semibold text-transparent bg-clip-text bg-gradient-to-r from-brand-accent to-brand-primary">
                #1 Platform for Creator & Athlete Monetization
              </span>
            </motion.div>

            {/* Main Headline with Staggered Animation */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
            >
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-8 leading-tight tracking-tighter">
                <motion.span
                  className="block bg-gradient-to-r from-brand-primary via-brand-accent to-brand-primary bg-clip-text text-transparent gradient-shift"
                  style={{
                    backgroundSize: "200% 200%"
                  }}
                >
                  AI-Powered Loyalty
                </motion.span>
                <motion.span
                  className="block text-white mt-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  That Powers Your Fandom
                </motion.span>
              </h1>
            </motion.div>

            {/* Enhanced Subheadline */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-lg sm:text-xl md:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed font-light px-4"
            >
              Build unforgettable fan loyalty programs with AI-powered engagement, seamless monetization, NFT rewards, and enterprise branding tools. Made for athletes, creators, musicians, and brands—no setup needed.
            </motion.p>

            {/* Enhanced CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center mb-16 px-4"
            >
              <motion.button
                onClick={() => setShowAuthFlow(true)}
                className="btn-gradient-accent text-brand-dark-bg px-8 py-4 rounded-xl font-bold transition-all duration-300 shadow-lg h-14 sm:h-16 flex items-center justify-center gap-3 min-w-max"
                whileHover={{ scale: 1.05, y: -4 }}
                whileTap={{ scale: 0.95 }}
              >
                <Users className="w-5 h-5" />
                <span>Start as Fan</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>

              <motion.button
                onClick={() => setShowAuthFlow(true)}
                className="btn-gradient-primary text-white px-8 py-4 rounded-xl font-bold transition-all duration-300 shadow-lg h-14 sm:h-16 flex items-center justify-center gap-3 min-w-max"
                whileHover={{ scale: 1.05, y: -4 }}
                whileTap={{ scale: 0.95 }}
              >
                <Rocket className="w-5 h-5" />
                <span>Launch Loyalty Program</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </motion.div>

            {/* Animated Stats Grid */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-4xl mx-auto"
            >
              {[
                { value: "50K+", label: "Active Creators", icon: Users },
                { value: "2M+", label: "Engaged Fans", icon: Target },
                { value: "$10M+", label: "Rewards Issued", icon: TrendingUp },
                { value: "99.9%", label: "Platform Uptime", icon: Zap }
              ].map((stat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + idx * 0.1 }}
                  className="p-4 md:p-6 rounded-xl glass-effect hover:glass-effect border-brand-accent/30 hover:border-brand-primary/50 transition-all"
                >
                  <stat.icon className="w-5 h-5 text-brand-accent mb-2 mx-auto" />
                  <div className="text-2xl md:text-3xl font-bold text-brand-secondary mb-1">{stat.value}</div>
                  <div className="text-xs md:text-sm text-gray-400">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gradient-to-b from-brand-dark-bg to-brand-dark-purple/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 gradient-text">
              Everything You Need to Engage Your Fans and Monetize Your Brand
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Built for NIL athletes, content creators, and musicians who want to build and scale lasting relationships with their audience and monetize their personal brand through innovative loyalty programs. Powered by AI and Web3 technology.
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
                  Connect Facebook Instagram, TikTok, X, YouTube, Spotify, and more. Reward fans for engagement, shares, and user-generated content automatically.
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
                  Issue NFTs and other digital collectibles from our no-code interface. Reward fans with unique digital assets and exclusive experiences. 
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
                  Track fan engagement, reward redemption rates, and program performance with real-time analytics and actionable AI-powered insights.
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
                  Create multiple reward tiers with exclusive perks. Token-gated VIP access, early releases, meet-and-greets, and personalized experiences.
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
              <span className="text-brand-accent font-black">Fans</span>{" "}
              <span className="text-white">-</span>{" "}
              <span className="text-brand-secondary">Discover</span>{" "}
              <span className="text-brand-primary">Amazing Creators</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Join loyalty programs from your favorite NIL athletes, musicians, and creators. Earn exclusive rewards, NFTs, and get closer to the action.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {creators.slice(0, 3).map((creator) => (
              <CreatorCard 
                key={creator.id} 
                creator={creator} 
                onUnauthenticatedClick={!user ? handleUnauthenticatedClick : undefined}
              />
            ))}
          </div>
          
          <div className="text-center">
            <Link href="/find-creators">
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

      {/* ENHANCED Who Fandomly Is For Section */}
      <section id="ideal-users" className="py-24 bg-gradient-to-b from-brand-dark-purple/20 to-brand-dark-bg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-black mb-6 gradient-text">
              Who Fandomly Powers
            </h2>
            <p className="text-lg lg:text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
              Whether you're a rising college athlete, streaming sensation, chart-topping artist, or Fortune 500 brand, Fandomly unlocks unprecedented fan loyalty and monetization at scale.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 max-w-7xl mx-auto">
            {/* Athletes Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0 }}
            >
              <Card className="relative group overflow-hidden h-full bg-white/5 backdrop-blur-lg border-white/10 hover:border-amber-500/50 hover:shadow-xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <CardContent className="relative z-10 p-6 flex flex-col h-full">
                  <div className="text-center mb-6">
                    <motion.div
                      className="w-16 h-16 bg-gradient-to-r from-amber-400 to-orange-500 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <Trophy className="h-8 w-8 text-white" />
                    </motion.div>
                    <h3 className="text-xl font-bold text-white mb-2">Athletes</h3>
                    <p className="text-gray-300 text-sm">NIL monetization for all levels</p>
                  </div>
                  <div className="space-y-2 flex-grow">
                    {["D1, D2, D3 Athletes", "High School & Amateur", "Olympic Athletes", "NIL Compliance Built-In"].map((item, i) => (
                      <div key={i} className="flex items-center text-gray-300 text-sm">
                        <CheckCircle className="h-4 w-4 text-amber-400 mr-3 flex-shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                  <motion.button
                    onClick={() => setShowAuthFlow(true)}
                    className="w-full mt-6 bg-gradient-to-r from-amber-400 to-orange-500 text-white py-2 px-4 rounded-lg font-semibold text-sm transition-all"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Get Started
                  </motion.button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Content Creators Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card className="relative group overflow-hidden h-full bg-white/5 backdrop-blur-lg border-2 border-blue-500 hover:shadow-2xl transition-all duration-300 lg:scale-105">
                <div className="absolute top-0 right-0 bg-blue-500 text-white px-3 py-1 text-xs font-bold z-20">MOST POPULAR</div>
                <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <CardContent className="relative z-10 p-6 flex flex-col h-full">
                  <div className="text-center mb-6">
                    <motion.div
                      className="w-16 h-16 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <Camera className="h-8 w-8 text-white" />
                    </motion.div>
                    <h3 className="text-xl font-bold text-white mb-2">Content Creators</h3>
                    <p className="text-gray-300 text-sm">Turn fans into loyal community</p>
                  </div>
                  <div className="space-y-2 flex-grow">
                    {["Influencers & Streamers", "YouTubers & Podcasters", "TikTok & Instagram Stars", "Models & Actors"].map((item, i) => (
                      <div key={i} className="flex items-center text-gray-300 text-sm">
                        <CheckCircle className="h-4 w-4 text-blue-400 mr-3 flex-shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                  <motion.button
                    onClick={() => setShowAuthFlow(true)}
                    className="w-full mt-6 bg-gradient-to-r from-blue-400 to-cyan-500 text-white py-2 px-4 rounded-lg font-semibold text-sm transition-all"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Get Started
                  </motion.button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Musicians Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="relative group overflow-hidden h-full bg-white/5 backdrop-blur-lg border-white/10 hover:border-purple-500/50 hover:shadow-xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <CardContent className="relative z-10 p-6 flex flex-col h-full">
                  <div className="text-center mb-6">
                    <motion.div
                      className="w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <Music className="h-8 w-8 text-white" />
                    </motion.div>
                    <h3 className="text-xl font-bold text-white mb-2">Musicians</h3>
                    <p className="text-gray-300 text-sm">Monetize music & fanbase</p>
                  </div>
                  <div className="space-y-2 flex-grow">
                    {["Independent Artists", "Emerging Talent", "Established Musicians", "Festival Performers"].map((item, i) => (
                      <div key={i} className="flex items-center text-gray-300 text-sm">
                        <CheckCircle className="h-4 w-4 text-purple-400 mr-3 flex-shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                  <motion.button
                    onClick={() => setShowAuthFlow(true)}
                    className="w-full mt-6 bg-gradient-to-r from-purple-400 to-pink-500 text-white py-2 px-4 rounded-lg font-semibold text-sm transition-all"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Get Started
                  </motion.button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Brands & Agencies Card - NEW */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card className="relative group overflow-hidden h-full bg-white/5 backdrop-blur-lg border-white/10 hover:border-brand-primary/50 hover:shadow-xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-b from-brand-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <CardContent className="relative z-10 p-6 flex flex-col h-full">
                  <div className="text-center mb-6">
                    <motion.div
                      className="w-16 h-16 bg-gradient-to-r from-brand-primary to-brand-accent rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <Building2 className="h-8 w-8 text-white" />
                    </motion.div>
                    <h3 className="text-xl font-bold text-white mb-2">Brands & Agencies</h3>
                    <p className="text-gray-300 text-sm">Enterprise fan engagement</p>
                  </div>
                  <div className="space-y-2 flex-grow">
                    {["Campaign Management", "Multi-Creator Programs", "Analytics Dashboard", "White-Label Solutions"].map((item, i) => (
                      <div key={i} className="flex items-center text-gray-300 text-sm">
                        <CheckCircle className="h-4 w-4 text-brand-primary mr-3 flex-shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                  <motion.button
                    onClick={() => setShowAuthFlow(true)}
                    className="w-full mt-6 bg-gradient-to-r from-brand-primary to-brand-accent text-white py-2 px-4 rounded-lg font-semibold text-sm transition-all"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Get Started
                  </motion.button>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Highlighted info box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-center mt-16"
          >
            <div className="glass-effect rounded-xl p-6 max-w-3xl mx-auto border-brand-accent/30">
              <div className="flex items-center justify-center gap-3 mb-3">
                <Sparkles className="w-5 h-5 text-brand-accent" />
                <h4 className="font-bold text-brand-accent">For Everyone, At Every Scale</h4>
              </div>
              <p className="text-gray-300 text-sm">
                From day-one creators building their first 100 fans to enterprises reaching millions—Fandomly scales infinitely without complexity. Our AI handles the heavy lifting while you focus on what matters: authentic connection with your audience.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ENHANCED Unlock Your Potential Section - Replaces Success Stories */}
      <section className="py-24 bg-gradient-to-b from-brand-dark-bg to-brand-dark-purple/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-black mb-6 gradient-text">
              Unlock Your Monetization Potential
            </h2>
            <p className="text-lg lg:text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
              As a brand new creator on Fandomly, you'll gain access to industry-leading tools and strategies that have helped thousands scale their personal brand from day one.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto mb-12">
            {[
              {
                icon: Rocket,
                title: "Fast Launch",
                description: "Get your loyalty program live in minutes, not weeks. Zero coding required.",
                color: "from-brand-primary to-brand-accent"
              },
              {
                icon: Target,
                title: "AI-Powered Growth",
                description: "Intelligent algorithms recommend rewards and engagement strategies tailored to your fanbase.",
                color: "from-cyan-400 to-blue-500"
              },
              {
                icon: TrendingUp,
                title: "Monetize Day One",
                description: "Earn from fan loyalty programs immediately. Multiple revenue streams built-in.",
                color: "from-green-400 to-emerald-500"
              },
              {
                icon: Shield,
                title: "Athletes Protected",
                description: "Built-in NIL compliance ensures you're always protected with NCAA and state regulations.",
                color: "from-amber-400 to-orange-500"
              },
              {
                icon: Coins,
                title: "NFT Ready",
                description: "Issue digital collectibles, NFTs, and exclusive digital rewards without technical complexity.",
                color: "from-purple-400 to-pink-500"
              },
              {
                icon: Users,
                title: "Community First",
                description: "Build genuine connections with your fans through gamified engagement and exclusive perks.",
                color: "from-blue-400 to-cyan-500"
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1, duration: 0.6 }}
                className="group relative overflow-hidden"
              >
                <Card className="h-full bg-white/5 backdrop-blur-lg border-white/10 hover:border-white/30 hover:shadow-2xl transition-all duration-300">
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
                  <CardContent className="relative z-10 p-6">
                    <motion.div
                      className={`w-12 h-12 rounded-lg bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4`}
                      whileHover={{ rotate: 360, scale: 1.1 }}
                      transition={{ duration: 0.6 }}
                    >
                      <feature.icon className="w-6 h-6 text-white" />
                    </motion.div>
                    <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                    <p className="text-gray-300 text-sm leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-center"
          >
            <div className="bg-gradient-to-r from-brand-primary/10 via-brand-accent/5 to-brand-primary/10 border border-brand-primary/20 rounded-2xl p-8 md:p-12 max-w-3xl mx-auto">
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">Ready to Build Your Fan Empire?</h3>
              <p className="text-gray-300 mb-8">Join thousands of creators, athletes, musicians, and brands who are already monetizing their fandom with Fandomly.</p>
              <motion.button
                onClick={() => setShowAuthFlow(true)}
                className="btn-gradient-primary text-white px-10 py-4 rounded-xl font-bold transition-all inline-flex items-center gap-2"
                whileHover={{ scale: 1.05, y: -4 }}
                whileTap={{ scale: 0.95 }}
              >
                <Sparkles className="w-5 h-5" />
                Launch Your Program Now
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ENHANCED NIL Value Calculator Section */}
      <NILValueCalculator />

    </div>
  );
}
