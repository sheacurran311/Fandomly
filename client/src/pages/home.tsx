import { useState, useEffect } from "react";
import { 
  Trophy, Camera, Music, Users, Shield, Zap, Rocket, Sparkles, 
  TrendingUp, Target, Building2, ArrowRight, CheckCircle, Coins,
  Play, Globe, Lock, Smartphone, BarChart3, Palette, X as XIcon
} from "lucide-react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { motion } from "framer-motion";
import CreatorEarningsCalculator from "@/components/nil/nil-value-calculator";

export default function Home() {
  const { user, setShowAuthFlow } = useDynamicContext();
  // Platform capabilities - real features, no fake metrics
  const platformCapabilities = [
    { label: "Social Platforms", value: "8", icon: "🌐" },
    { label: "Blockchains", value: "4+", icon: "⛓️" },
    { label: "Campaign Templates", value: "12", icon: "🎯" },
    { label: "Setup Time", value: "<5min", icon: "⚡" }
  ];

  return (
    <div className="min-h-screen bg-[#0a0118] overflow-x-hidden">
      
      {/* 🎯 ASYMMETRICAL HERO - Split Canvas */}
      <section className="relative min-h-screen grid lg:grid-cols-2 gap-0 overflow-hidden">
        {/* Background Mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(139,92,246,0.15),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(225,6,152,0.15),transparent_50%)]"></div>
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, transparent 1px, transparent 40px, rgba(255,255,255,0.03) 41px),
                           repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, transparent 1px, transparent 40px, rgba(255,255,255,0.03) 41px)`
        }}></div>

        {/* Left: Manifesto Stack */}
        <div className="relative z-10 flex flex-col justify-center p-8 lg:p-16 lg:pr-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {/* Vertical Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-xl border border-[#14feee]/30 rounded-full mb-6" data-testid="hero-live-badge">
              <Rocket className="w-4 h-4 text-[#14feee]" />
              <span className="text-sm font-semibold text-[#14feee]">Now in Early Access</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black leading-none mb-8">
              <span className="block text-white mb-2">Turn</span>
              <span className="block bg-gradient-to-r from-[#8B5CF6] via-[#14feee] to-[#e10698] bg-clip-text text-transparent">
                Fans Into
              </span>
              <span className="block text-white mt-2">Fortune</span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl text-gray-300 mb-8 max-w-xl leading-relaxed">
              The first Web3 loyalty platform for athletes, content creators, musicians, and brands. Launch campaigns across 8 social platforms, verify engagement, and distribute rewards—all powered by AI.
            </p>

            {/* CTA Stack */}
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <motion.button
                onClick={() => setShowAuthFlow(true)}
                className="group relative px-8 py-4 bg-gradient-to-r from-[#14feee] to-[#e10698] rounded-xl font-bold text-white overflow-hidden"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                data-testid="button-launch-program"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Rocket className="w-5 h-5" />
                  Launch Your Program
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </motion.button>

              <motion.button
                onClick={() => setShowAuthFlow(true)}
                className="px-8 py-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl font-bold text-white hover:bg-white/20 transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                data-testid="button-join-fan"
              >
                <span className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Join as Fan
                </span>
              </motion.button>
            </div>

            {/* Platform Capabilities Ticker */}
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-4" data-testid="hero-platform-ticker">
              <div className="text-xs text-gray-400 mb-2">PLATFORM CAPABILITIES</div>
              <div className="grid grid-cols-4 gap-4">
                {platformCapabilities.map((cap, idx) => (
                  <div key={idx} data-testid={`capability-${idx}`}>
                    <div className="text-2xl font-black bg-gradient-to-r from-[#14feee] to-[#e10698] bg-clip-text text-transparent">{cap.value}</div>
                    <div className="text-xs text-gray-400">{cap.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right: Creator Showcase Visual */}
        <div className="relative z-10 flex items-center justify-center p-8 lg:p-16">
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="relative w-full max-w-lg"
          >
            {/* Floating Creator Card */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#14feee] via-[#8B5CF6] to-[#e10698] rounded-3xl blur-2xl opacity-75 group-hover:opacity-100 transition duration-1000 animate-pulse"></div>
              <div className="relative bg-black/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 overflow-hidden">
                {/* Animated Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#14feee]/20 to-[#e10698]/20 opacity-50"></div>
                
                {/* Content */}
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#14feee] to-[#e10698] p-1">
                      <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                        <Zap className="w-10 h-10 text-[#14feee]" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white">Your Platform Stack</h3>
                      <p className="text-[#14feee] font-semibold">All-in-One • Web3-Powered</p>
                    </div>
                  </div>
                  
                  {/* Platform Capabilities */}
                  <div className="space-y-3" data-testid="hero-platform-features">
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-[#14feee]/20" data-testid="feature-platforms">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#14feee] to-[#8B5CF6] flex items-center justify-center flex-shrink-0">
                        <Globe className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">8 Social Platforms</div>
                        <div className="text-xs text-gray-400">Real-time verification across all networks</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-[#8B5CF6]/20" data-testid="feature-blockchain">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#e10698] flex items-center justify-center flex-shrink-0">
                        <Shield className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">Multi-Chain Rewards</div>
                        <div className="text-xs text-gray-400">Ethereum, Solana, Polygon & more</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-[#e10698]/20" data-testid="feature-ai">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#e10698] to-[#14feee] flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">AI Campaign Builder</div>
                        <div className="text-xs text-gray-400">Smart templates & optimization</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Particles */}
            <motion.div
              className="absolute -top-10 -right-10 w-32 h-32 rounded-full"
              style={{
                background: "radial-gradient(circle, #14feee, #e10698)"
              }}
              animate={{
                y: [0, -20, 0],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{ duration: 4, repeat: Infinity }}
            />
          </motion.div>
        </div>
      </section>

      {/* 🌊 PULSE RAIL - Platform Features Marquee */}
      <section className="relative py-12 overflow-hidden border-y border-white/10 bg-black/50" data-testid="pulse-rail">
        <motion.div
          className="flex gap-8"
          animate={{ x: [0, -1920] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        >
          {[
            { feature: "Real-Time", detail: "Social Verification", icon: "✓" },
            { feature: "Multi-Chain", detail: "Rewards", icon: "⛓️" },
            { feature: "8 Platforms", detail: "Integrated", icon: "🌐" },
            { feature: "AI-Powered", detail: "Campaigns", icon: "🤖" },
            { feature: "Instant", detail: "Payouts", icon: "⚡" },
            { feature: "Smart", detail: "Analytics", icon: "📊" },
            { feature: "Web3", detail: "Native", icon: "🔐" },
            { feature: "Template", detail: "Library", icon: "📚" },
            { feature: "Auto", detail: "Compliance", icon: "🛡️" },
            { feature: "Cross-Platform", detail: "Tracking", icon: "🎯" },
            { feature: "Blockchain", detail: "Verified", icon: "✨" },
            { feature: "5-Min", detail: "Setup", icon: "🚀" }
          ].map((item, i) => (
            <div key={i} className="flex-shrink-0 w-64 h-32 relative" data-testid={`pulse-feature-${i}`}>
              <div
                className="absolute inset-0 rounded-full blur-xl opacity-60"
                style={{
                  background: `radial-gradient(circle, ${i % 3 === 0 ? '#14feee' : i % 3 === 1 ? '#8B5CF6' : '#e10698'}, transparent)`
                }}
              ></div>
              <div className="relative h-full flex flex-col items-center justify-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
                <div className="text-3xl mb-1">{item.icon}</div>
                <div className="text-lg font-black bg-gradient-to-r from-[#14feee] to-[#e10698] bg-clip-text text-transparent" data-testid={`pulse-feature-name-${i}`}>
                  {item.feature}
                </div>
                <div className="text-xs text-gray-400">
                  {item.detail}
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ⚡ OPS COMMAND DECK - Diagonal Grid */}
      <section className="relative py-32 px-4">
        {/* Background Grid */}
        <div className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `linear-gradient(rgba(139,92,246,0.5) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(139,92,246,0.5) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
            transform: 'rotate(-12deg) scale(1.5)'
          }}
        ></div>

        <div className="relative max-w-7xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-5xl md:text-6xl font-black text-center mb-20"
          >
            <span className="bg-gradient-to-r from-[#8B5CF6] via-[#14feee] to-[#e10698] bg-clip-text text-transparent">
              Mission Control
            </span>
          </motion.h2>

          {/* Central Command Panel */}
          <div className="grid lg:grid-cols-3 gap-8 items-center">
            {/* Left Capsule: Social Proof */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative group"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[#14feee] to-[#8B5CF6] rounded-2xl blur opacity-60 group-hover:opacity-100 transition"></div>
              <div className="relative bg-black/90 backdrop-blur-xl border border-[#14feee]/30 rounded-2xl p-8">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#14feee] to-[#8B5CF6] flex items-center justify-center mb-6">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-black text-white mb-4">Social Proof</h3>
                <p className="text-gray-300 mb-6">Verify Instagram, TikTok, X, YouTube actions with blockchain-backed proof.</p>
                <div className="flex flex-wrap gap-2">
                  {["Instagram", "TikTok", "X", "YouTube"].map(platform => (
                    <span key={platform} className="px-3 py-1 bg-[#14feee]/20 border border-[#14feee]/30 rounded-full text-xs text-[#14feee]">
                      {platform}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Center: AI Orchestration */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative lg:scale-110"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-[#8B5CF6] via-[#14feee] to-[#e10698] rounded-3xl blur-xl opacity-75 animate-pulse"></div>
              <div className="relative bg-black/90 backdrop-blur-xl border-2 border-[#8B5CF6] rounded-3xl p-10">
                <div className="flex items-center justify-center mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#e10698] flex items-center justify-center">
                    <Zap className="w-10 h-10 text-white" />
                  </div>
                </div>
                <h3 className="text-3xl font-black text-center text-white mb-4">AI Task Engine</h3>
                <p className="text-gray-300 text-center mb-8">Automated campaign orchestration with smart triggers and real-time verification.</p>
                <div className="flex justify-center">
                  <motion.button
                    className="px-6 py-3 bg-gradient-to-r from-[#8B5CF6] to-[#e10698] rounded-xl font-bold text-white"
                    whileHover={{ scale: 1.05 }}
                    onClick={() => setShowAuthFlow(true)}
                    data-testid="button-start-building"
                  >
                    Start Building
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* Right Capsule: Web3 Rewards */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative group"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[#e10698] to-[#10B981] rounded-2xl blur opacity-60 group-hover:opacity-100 transition"></div>
              <div className="relative bg-black/90 backdrop-blur-xl border border-[#e10698]/30 rounded-2xl p-8">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#e10698] to-[#10B981] flex items-center justify-center mb-6">
                  <Coins className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-black text-white mb-4">Web3 Rewards</h3>
                <p className="text-gray-300 mb-6">Distribute NFTs, tokens, and exclusive perks across multiple blockchains.</p>
                <div className="flex flex-wrap gap-2">
                  {["Ethereum", "Solana", "Polygon", "Base"].map(chain => (
                    <span key={chain} className="px-3 py-1 bg-[#e10698]/20 border border-[#e10698]/30 rounded-full text-xs text-[#e10698]">
                      {chain}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 🎯 WHO IT'S FOR - Creator Types Grid */}
      <section className="relative py-32 px-4 bg-gradient-to-b from-transparent to-[#8B5CF6]/10" data-testid="creator-types-section">
        <div className="max-w-7xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-5xl md:text-6xl font-black text-center mb-4"
          >
            <span className="text-white">Built For </span>
            <span className="bg-gradient-to-r from-[#e10698] to-[#14feee] bg-clip-text text-transparent">Every Creator</span>
          </motion.h2>
          <p className="text-center text-xl text-gray-300 mb-16">From athletes to brands - one platform powers them all</p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Trophy,
                type: "Athletes",
                desc: "Monetize your fanbase with loyalty programs, exclusive content, and Web3 rewards",
                gradient: "from-[#14feee] to-[#8B5CF6]",
                testId: "creator-type-athletes"
              },
              {
                icon: Camera,
                type: "Content Creators",
                desc: "Turn views into revenue with cross-platform campaigns and engagement rewards",
                gradient: "from-[#8B5CF6] to-[#e10698]",
                testId: "creator-type-content"
              },
              {
                icon: Music,
                type: "Musicians",
                desc: "Build superfans with exclusive drops, concert perks, and streaming rewards",
                gradient: "from-[#e10698] to-[#10B981]",
                testId: "creator-type-musicians"
              },
              {
                icon: Building2,
                type: "Brands & Agencies",
                desc: "Launch influencer campaigns, track ROI, and manage creator partnerships at scale",
                gradient: "from-[#10B981] to-[#14feee]",
                testId: "creator-type-brands"
              }
            ].map((creator, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative group"
                data-testid={creator.testId}
              >
                <div className={`absolute -inset-0.5 bg-gradient-to-r ${creator.gradient} rounded-2xl blur opacity-60 group-hover:opacity-100 transition`}></div>
                <div className="relative bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 h-full">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${creator.gradient} flex items-center justify-center mb-4`}>
                    <creator.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-black text-white mb-3">{creator.type}</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">{creator.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 🌐 SOCIAL PLATFORM INTEGRATIONS - 8-Platform Grid */}
      <section className="relative py-32 px-4 bg-gradient-to-b from-[#8B5CF6]/10 to-black" data-testid="social-integrations">
        <div className="max-w-7xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-5xl md:text-6xl font-black text-center mb-4"
          >
            <span className="bg-gradient-to-r from-[#14feee] via-[#8B5CF6] to-[#e10698] bg-clip-text text-transparent">
              8 Platforms, One Dashboard
            </span>
          </motion.h2>
          <p className="text-center text-xl text-gray-300 mb-6">Real-time verification, aggregated analytics, and AI-powered insights across all major social networks</p>

          {/* Platform Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {[
              { name: "Facebook", icon: "📘", color: "#1877F2" },
              { name: "Instagram", icon: "📷", color: "#E4405F" },
              { name: "X (Twitter)", icon: "𝕏", color: "#1DA1F2" },
              { name: "TikTok", icon: "🎵", color: "#FE2C55" },
              { name: "YouTube", icon: "▶️", color: "#FF0000" },
              { name: "Spotify", icon: "🎧", color: "#1DB954" },
              { name: "Discord", icon: "💬", color: "#5865F2" },
              { name: "Twitch", icon: "🎮", color: "#9146FF" }
            ].map((platform, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="relative group cursor-pointer"
                data-testid={`platform-${platform.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div
                  className="absolute -inset-0.5 rounded-xl blur opacity-0 group-hover:opacity-100 transition"
                  style={{ background: `radial-gradient(circle, ${platform.color}, transparent)` }}
                ></div>
                <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 text-center group-hover:border-white/30 transition">
                  <div className="text-4xl mb-2">{platform.icon}</div>
                  <div className="text-sm font-bold text-white">{platform.name}</div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Zap,
                title: "Real-Time Verification",
                desc: "Instant task completion tracking with webhook-based proof across all platforms",
                testId: "feature-verification"
              },
              {
                icon: BarChart3,
                title: "Aggregated Analytics",
                desc: "Unified dashboard showing engagement, reach, and ROI across all connected platforms",
                testId: "feature-analytics"
              },
              {
                icon: Sparkles,
                title: "AI Creator Toolkit",
                desc: "Smart campaign suggestions, content optimization, and audience insights powered by AI",
                testId: "feature-ai-toolkit"
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl"
                data-testid={feature.testId}
              >
                <feature.icon className="w-10 h-10 text-[#14feee] mb-4" />
                <h3 className="text-xl font-black text-white mb-3">{feature.title}</h3>
                <p className="text-gray-300 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 📜 PROOF OF FANDOM - Scrollytelling Timeline */}
      <section className="relative py-32 px-4 bg-gradient-to-b from-black to-[#8B5CF6]/10" data-testid="proof-of-fandom">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-5xl md:text-6xl font-black text-center mb-4"
          >
            <span className="bg-gradient-to-r from-[#14feee] to-[#e10698] bg-clip-text text-transparent">How It Works</span>
          </motion.h2>
          <p className="text-center text-xl text-gray-300 mb-20">From launch to payout in four steps</p>

          {/* Vertical Timeline */}
          <div className="relative">
            {/* Vertical Line */}
            <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-[#14feee] via-[#8B5CF6] to-[#e10698]"></div>

            {[
              {
                step: "01",
                title: "Connect Wallet",
                description: "Link your blockchain wallet (Ethereum, Solana, Cosmos) in 15 seconds. No crypto knowledge required.",
                icon: "🔗",
                gradient: "from-[#14feee] to-[#8B5CF6]"
              },
              {
                step: "02",
                title: "Design Your Campaign",
                description: "Use AI templates or build custom quests. Set points, rewards, and verification rules for Instagram, TikTok, X, and YouTube.",
                icon: "🎨",
                gradient: "from-[#8B5CF6] to-[#e10698]"
              },
              {
                step: "03",
                title: "Fans Complete Tasks",
                description: "Fans follow, like, share, or create content. Our AI verifies proof-of-action in real time with blockchain receipts.",
                icon: "⚡",
                gradient: "from-[#e10698] to-[#10B981]"
              },
              {
                step: "04",
                title: "Distribute Rewards",
                description: "Auto-pay points, NFTs, or tokens to winners. Track analytics and watch your community grow exponentially.",
                icon: "🎁",
                gradient: "from-[#10B981] to-[#14feee]"
              }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className={`relative flex items-center gap-8 mb-16 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                data-testid={`timeline-step-${i}`}
              >
                {/* Timeline Dot */}
                <div className="absolute left-8 md:left-1/2 -ml-3 md:-ml-3 w-6 h-6 rounded-full bg-gradient-to-r from-[#14feee] to-[#e10698] border-4 border-[#0a0118] z-10"></div>

                {/* Content Card */}
                <div className={`flex-1 ${i % 2 === 0 ? 'md:text-right md:pr-20' : 'md:pl-20'} ml-20 md:ml-0`}>
                  <div className="inline-block p-6 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl">
                    <div className={`text-6xl mb-4 ${i % 2 === 0 ? 'md:justify-end' : ''} flex`}>{item.icon}</div>
                    <div className={`text-sm font-bold bg-gradient-to-r ${item.gradient} bg-clip-text text-transparent mb-2`}>
                      STEP {item.step}
                    </div>
                    <h3 className="text-2xl font-black text-white mb-3">{item.title}</h3>
                    <p className="text-gray-300 leading-relaxed max-w-sm">{item.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 🌌 CHAIN CONSTELLATION - Multi-Chain Canvas */}
      <section className="relative py-32 px-4 overflow-hidden bg-black" data-testid="chain-constellation">
        <div className="max-w-7xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-5xl md:text-6xl font-black text-center mb-4"
          >
            <span className="text-white">One Platform, </span>
            <span className="bg-gradient-to-r from-[#8B5CF6] to-[#14feee] bg-clip-text text-transparent">Every Chain</span>
          </motion.h2>
          <p className="text-center text-xl text-gray-300 mb-20">Multi-chain verification without the complexity</p>

          {/* Constellation Grid */}
          <div className="relative h-[500px]">
            {/* Connection Lines */}
            <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
              <defs>
                <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#14feee" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#e10698" stopOpacity="0.3" />
                </linearGradient>
              </defs>
              <line x1="20%" y1="30%" x2="50%" y2="50%" stroke="url(#line-gradient)" strokeWidth="2" />
              <line x1="80%" y1="30%" x2="50%" y2="50%" stroke="url(#line-gradient)" strokeWidth="2" />
              <line x1="20%" y1="70%" x2="50%" y2="50%" stroke="url(#line-gradient)" strokeWidth="2" />
              <line x1="80%" y1="70%" x2="50%" y2="50%" stroke="url(#line-gradient)" strokeWidth="2" />
            </svg>

            {/* Chain Nodes */}
            {[
              { name: "Ethereum", position: { top: "30%", left: "20%" }, color: "#627EEA", logo: "Ξ" },
              { name: "Solana", position: { top: "30%", right: "20%" }, color: "#14F195", logo: "◎" },
              { name: "Polygon", position: { bottom: "30%", left: "20%" }, color: "#8247E5", logo: "⬡" },
              { name: "Base", position: { bottom: "30%", right: "20%" }, color: "#0052FF", logo: "▲" }
            ].map((chain, i) => (
              <motion.div
                key={chain.name}
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="absolute"
                style={chain.position}
                data-testid={`chain-node-${chain.name.toLowerCase()}`}
              >
                <motion.div
                  className="relative w-24 h-24 cursor-pointer"
                  whileHover={{ scale: 1.2, rotate: 360 }}
                  transition={{ type: "spring", stiffness: 200 }}
                >
                  <div
                    className="absolute inset-0 rounded-full blur-xl opacity-60"
                    style={{ background: `radial-gradient(circle, ${chain.color}, transparent)` }}
                  ></div>
                  <div
                    className="relative w-full h-full rounded-full border-2 flex items-center justify-center bg-black/90 backdrop-blur-xl"
                    style={{ borderColor: chain.color }}
                  >
                    <span className="text-3xl font-black" style={{ color: chain.color }}>{chain.logo}</span>
                  </div>
                </motion.div>
                <div className="text-center mt-3">
                  <div className="text-sm font-bold text-white">{chain.name}</div>
                </div>
              </motion.div>
            ))}

            {/* Center Hub */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              data-testid="chain-hub-center"
            >
              <div className="relative">
                <div className="absolute -inset-8 bg-gradient-to-r from-[#14feee] via-[#8B5CF6] to-[#e10698] rounded-full blur-2xl opacity-50 animate-pulse"></div>
                <div className="relative w-40 h-40 rounded-full border-4 border-white/20 bg-gradient-to-br from-[#1a0a2e] to-[#0a0118] flex items-center justify-center backdrop-blur-xl">
                  <div className="text-center">
                    <Zap className="w-12 h-12 text-white mx-auto mb-2" />
                    <div className="text-sm font-black text-white">FANDOMLY</div>
                    <div className="text-xs text-gray-400">Hub</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mt-20">
            {[
              { title: "Instant Verification", desc: "Cross-chain transaction confirmation in milliseconds", icon: <Shield className="w-8 h-8" /> },
              { title: "Gas Optimization", desc: "Smart routing minimizes fees across all networks", icon: <Zap className="w-8 h-8" /> },
              { title: "Universal Wallet", desc: "One login works across Ethereum, Solana, and more", icon: <Coins className="w-8 h-8" /> }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl text-center"
                data-testid={`chain-feature-${i}`}
              >
                <div className="text-[#14feee] mb-4 flex justify-center">{feature.icon}</div>
                <h3 className="text-xl font-black text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 💰 CREATOR EARNINGS CALCULATOR */}
      <CreatorEarningsCalculator />

      {/* 🎯 LAUNCH PAD - Perspective CTA Footer */}
      <section className="relative py-32 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="relative" style={{ perspective: '1000px' }}>
            {/* Glow Effect */}
            <div className="absolute -inset-4 bg-gradient-to-r from-[#e10698] via-[#8B5CF6] to-[#14feee] rounded-3xl blur-3xl opacity-40"></div>
            
            {/* Card */}
            <motion.div
              initial={{ opacity: 0, rotateX: 20 }}
              whileInView={{ opacity: 1, rotateX: 0 }}
              viewport={{ once: true }}
              className="relative bg-gradient-to-br from-[#1a0a2e] to-[#0a0118] border-2 border-white/20 rounded-3xl p-12 md:p-16"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="text-center mb-12">
                <h2 className="text-4xl md:text-6xl font-black mb-6">
                  <span className="bg-gradient-to-r from-[#14feee] via-[#8B5CF6] to-[#e10698] bg-clip-text text-transparent">
                    Ready to Launch?
                  </span>
                </h2>
                <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                  Be among the first creators to build Web3 loyalty programs with real-time social verification across 8 platforms. Early access starts now.
                </p>
              </div>

              {/* Split CTAs */}
              <div className="grid md:grid-cols-2 gap-6">
                <motion.button
                  onClick={() => setShowAuthFlow(true)}
                  className="group relative p-8 bg-gradient-to-r from-[#e10698] to-[#8B5CF6] rounded-2xl overflow-hidden"
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  data-testid="button-launchpad-athletes"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#e10698]/50 to-transparent blur-xl opacity-0 group-hover:opacity-100 transition"></div>
                  <div className="relative z-10">
                    <Trophy className="w-12 h-12 text-white mx-auto mb-4" />
                    <h3 className="text-2xl font-black text-white mb-2">For Creators</h3>
                    <p className="text-white/80 text-sm">Launch your loyalty program in minutes</p>
                  </div>
                </motion.button>

                <motion.button
                  onClick={() => setShowAuthFlow(true)}
                  className="group relative p-8 bg-gradient-to-r from-[#8B5CF6] to-[#14feee] rounded-2xl overflow-hidden"
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  data-testid="button-launchpad-fans"
                >
                  <div className="absolute inset-0 bg-gradient-to-l from-[#14feee]/50 to-transparent blur-xl opacity-0 group-hover:opacity-100 transition"></div>
                  <div className="relative z-10">
                    <Users className="w-12 h-12 text-white mx-auto mb-4" />
                    <h3 className="text-2xl font-black text-white mb-2">For Fans</h3>
                    <p className="text-white/80 text-sm">Earn rewards for your fandom</p>
                  </div>
                </motion.button>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap justify-center gap-4 mt-12 pt-8 border-t border-white/10">
                {["Multi-Chain", "Enterprise-Grade Security", "8 Platform Integrations", "24/7 Support"].map((badge) => (
                  <span key={badge} className="px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full text-sm text-white">
                    {badge}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

    </div>
  );
}
