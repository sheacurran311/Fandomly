import { useState, useEffect } from "react";
import { 
  Trophy, Camera, Music, Users, Shield, Zap, Rocket, Sparkles, 
  TrendingUp, Target, Building2, ArrowRight, CheckCircle, Coins,
  Play, Globe, Lock, Smartphone, BarChart3, Palette, X
} from "lucide-react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { motion } from "framer-motion";

export default function Home() {
  const { user, setShowAuthFlow } = useDynamicContext();
  const [liveStats, setLiveStats] = useState({ wallets: 47832, quests: 234891, payouts: 8234 });

  // Simul animated live stats ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveStats(prev => ({
        wallets: prev.wallets + Math.floor(Math.random() * 10),
        quests: prev.quests + Math.floor(Math.random() * 50),
        payouts: prev.payouts + Math.floor(Math.random() * 20)
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

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

        {/* Left: NIL Athlete Visual */}
        <div className="relative z-10 flex items-center justify-center p-8 lg:p-16">
          <motion.div
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="relative w-full max-w-lg"
          >
            {/* Floating Athlete Card */}
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
                        <Trophy className="w-10 h-10 text-[#14feee]" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white">NIL Athlete</h3>
                      <p className="text-[#14feee] font-semibold">D1 Football • Junior</p>
                    </div>
                  </div>
                  
                  {/* Live Stats */}
                  <div className="grid grid-cols-3 gap-4 p-4 bg-white/5 rounded-xl border border-[#14feee]/20" data-testid="hero-athlete-stats">
                    <div data-testid="stat-nil-earnings">
                      <div className="text-3xl font-black bg-gradient-to-r from-[#14feee] to-[#8B5CF6] bg-clip-text text-transparent">$24K</div>
                      <div className="text-xs text-gray-400">NIL Earnings</div>
                    </div>
                    <div data-testid="stat-fans">
                      <div className="text-3xl font-black bg-gradient-to-r from-[#8B5CF6] to-[#e10698] bg-clip-text text-transparent">12K</div>
                      <div className="text-xs text-gray-400">Fans</div>
                    </div>
                    <div data-testid="stat-engagement">
                      <div className="text-3xl font-black bg-gradient-to-r from-[#e10698] to-[#14feee] bg-clip-text text-transparent">98%</div>
                      <div className="text-xs text-gray-400">Engagement</div>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {["NCAA Compliant", "Multi-Chain", "Social Verified"].map((badge) => (
                      <span key={badge} className="px-3 py-1 bg-white/10 border border-[#14feee]/30 rounded-full text-xs text-white">
                        {badge}
                      </span>
                    ))}
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

        {/* Right: Manifesto Stack */}
        <div className="relative z-10 flex flex-col justify-center p-8 lg:p-16 lg:pl-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {/* Vertical Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-xl border border-[#14feee]/30 rounded-full mb-6" data-testid="hero-live-badge">
              <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></div>
              <span className="text-sm font-semibold text-[#14feee]">47,832 Wallets Connected Today</span>
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
              The first Web3 loyalty platform built for NIL athletes, creators, and musicians. Launch campaigns, verify social proof, distribute rewards—all in one neural grid.
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

            {/* Live Ticker */}
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-4" data-testid="hero-live-ticker">
              <div className="text-xs text-gray-400 mb-2">LIVE PLATFORM ACTIVITY</div>
              <div className="grid grid-cols-3 gap-4">
                <div data-testid="live-stat-wallets">
                  <div className="text-2xl font-black text-[#14feee]">{liveStats.wallets.toLocaleString()}</div>
                  <div className="text-xs text-gray-400">Wallets</div>
                </div>
                <div data-testid="live-stat-quests">
                  <div className="text-2xl font-black text-[#8B5CF6]">{liveStats.quests.toLocaleString()}</div>
                  <div className="text-xs text-gray-400">Quests</div>
                </div>
                <div data-testid="live-stat-payouts">
                  <div className="text-2xl font-black text-[#e10698]">${liveStats.payouts.toLocaleString()}</div>
                  <div className="text-xs text-gray-400">Payouts</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 🌊 PULSE RAIL - Morphing Blob Marquee */}
      <section className="relative py-12 overflow-hidden border-y border-white/10 bg-black/50" data-testid="pulse-rail">
        <motion.div
          className="flex gap-8"
          animate={{ x: [0, -1920] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        >
          {[...Array(12)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-64 h-32 relative" data-testid={`pulse-blob-${i}`}>
              <div
                className="absolute inset-0 rounded-full blur-xl opacity-60"
                style={{
                  background: `radial-gradient(circle, ${i % 3 === 0 ? '#14feee' : i % 3 === 1 ? '#8B5CF6' : '#e10698'}, transparent)`
                }}
              ></div>
              <div className="relative h-full flex flex-col items-center justify-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
                <div className="text-3xl font-black bg-gradient-to-r from-[#14feee] to-[#e10698] bg-clip-text text-transparent" data-testid={`pulse-stat-value-${i}`}>
                  {i % 3 === 0 ? `${(i + 1) * 234}` : i % 3 === 1 ? `${(i + 1) * 1.2}K` : `$${(i + 1) * 850}`}
                </div>
                <div className="text-xs text-gray-400">
                  {i % 3 === 0 ? "Quests Claimed" : i % 3 === 1 ? "Active Users" : "NIL Payouts"}
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

      {/* 💥 NIL COLLISION COURSE - Split Screen Slider */}
      <section className="relative py-32 px-4 bg-gradient-to-b from-transparent to-[#8B5CF6]/10">
        <div className="max-w-7xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-5xl md:text-6xl font-black text-center mb-4"
          >
            <span className="text-white">NIL </span>
            <span className="bg-gradient-to-r from-[#e10698] to-[#14feee] bg-clip-text text-transparent">Revolution</span>
          </motion.h2>
          <p className="text-center text-xl text-gray-300 mb-16">The old way vs. the Fandomly way</p>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Old World */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-gray-600 to-gray-800 rounded-2xl blur opacity-50"></div>
              <div className="relative bg-gray-900/90 backdrop-blur-xl border border-gray-700 rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                    <X className="w-6 h-6 text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-300">Old World NIL</h3>
                </div>
                <ul className="space-y-3">
                  {[
                    "Complex compliance paperwork",
                    "Limited monetization options",
                    "Manual fan tracking",
                    "Delayed payments",
                    "No direct fan engagement"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-gray-400">
                      <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>

            {/* Fandomly Way */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[#14feee] to-[#e10698] rounded-2xl blur opacity-75 animate-pulse"></div>
              <div className="relative bg-black/90 backdrop-blur-xl border-2 border-[#14feee] rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#14feee] to-[#e10698] flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-black text-white">Fandomly NIL</h3>
                </div>
                <ul className="space-y-3">
                  {[
                    "Built-in NCAA compliance",
                    "Multi-channel monetization",
                    "AI-powered fan insights",
                    "Instant crypto payouts",
                    "Direct loyalty programs"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-white">
                      <CheckCircle className="w-5 h-5 text-[#10B981] flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 📜 PROOF OF FANDOM - Scrollytelling Timeline */}
      <section className="relative py-32 px-4 bg-gradient-to-b from-[#8B5CF6]/10 to-transparent" data-testid="proof-of-fandom">
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
                  Join thousands of athletes and creators monetizing their fanbase with Web3 loyalty programs.
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
                    <h3 className="text-2xl font-black text-white mb-2">For Athletes</h3>
                    <p className="text-white/80 text-sm">Launch your NIL program in minutes</p>
                  </div>
                </motion.button>

                <motion.button
                  onClick={() => setShowAuthFlow(true)}
                  className="group relative p-8 bg-gradient-to-r from-[#8B5CF6] to-[#14feee] rounded-2xl overflow-hidden"
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  data-testid="button-launchpad-creators"
                >
                  <div className="absolute inset-0 bg-gradient-to-l from-[#14feee]/50 to-transparent blur-xl opacity-0 group-hover:opacity-100 transition"></div>
                  <div className="relative z-10">
                    <Camera className="w-12 h-12 text-white mx-auto mb-4" />
                    <h3 className="text-2xl font-black text-white mb-2">For Creators</h3>
                    <p className="text-white/80 text-sm">Build your community empire</p>
                  </div>
                </motion.button>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap justify-center gap-4 mt-12 pt-8 border-t border-white/10">
                {["Multi-Chain", "NCAA Compliant", "SOC 2 Certified", "24/7 Support"].map((badge) => (
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
