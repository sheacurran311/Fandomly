import { useState, useEffect } from "react";
import { 
  Trophy, Camera, Music, Users, Shield, Zap, Rocket, Sparkles, 
  TrendingUp, Target, Building2, ArrowRight, CheckCircle, Coins,
  Play, Globe, Lock, Smartphone, BarChart3, Palette, X as XIcon
} from "lucide-react";
import { 
  FaPalette, FaTag, FaBookOpen, FaGlobe, FaCheckCircle, 
  FaBolt, FaGift, FaChartLine, FaLock, FaMobileAlt, 
  FaBullseye, FaRocket, FaUserPlus, FaBrush, FaUsers,
  FaTrophy, FaChartBar
} from "react-icons/fa";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { motion } from "framer-motion";
import CreatorEarningsCalculator from "@/components/nil/nil-value-calculator";

export default function Home() {
  const { user, setShowAuthFlow } = useDynamicContext();
  // Platform capabilities - real features, no fake metrics
  const platformCapabilities = [
    { label: "Social Platforms", value: "8+", icon: "🌐" },
    { label: "Task Templates", value: "32+", icon: "🎯" },
    { label: "Campaign Templates", value: "12", icon: "📋" },
    { label: "Setup Time", value: "<5min", icon: "⚡" }
  ];

  return (
    <div className="min-h-screen bg-[#0a0118] overflow-x-hidden">
      
      {/* 🎯 HERO - Centered Full-Width */}
      <section className="relative z-20 pt-12 pb-8">
        {/* Background Mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(139,92,246,0.15),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(225,6,152,0.15),transparent_50%)]"></div>
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, transparent 1px, transparent 40px, rgba(255,255,255,0.03) 41px),
                           repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, transparent 1px, transparent 40px, rgba(255,255,255,0.03) 41px)`
        }}></div>

        {/* Centered Hero Content */}
        <div className="relative z-50 max-w-6xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-xl border border-[#14feee]/30 rounded-full mb-6" data-testid="hero-live-badge">
              <Rocket className="w-4 h-4 text-[#14feee]" />
              <span className="text-sm font-semibold text-[#14feee]">Now in Early Access</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-tight mb-6">
              <span className="text-white">Elevate Your Brand.</span>
              <br />
              <span className="bg-gradient-to-r from-[#10B981] via-[#14feee] to-[#8B5CF6] bg-clip-text text-transparent">
                Reward Your Community.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              Turn fans into superfans. Launch your own branded loyalty platform in under 5 minutes—no coding, no crypto wallets, just pure engagement magic across every social platform your fans love.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <motion.button
                onClick={() => setShowAuthFlow(true)}
                className="group relative px-8 py-4 bg-gradient-to-r from-[#14feee] to-[#e10698] rounded-xl font-bold text-white overflow-hidden"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                data-testid="button-launch-program"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
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
                <span className="flex items-center justify-center gap-2">
                  <Users className="w-5 h-5" />
                  Join as Fan
                </span>
              </motion.button>
            </div>

            {/* Platform Capabilities */}
            <div className="inline-flex flex-wrap justify-center gap-6 bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl px-6 py-4" data-testid="hero-platform-ticker">
              {platformCapabilities.map((cap, idx) => (
                <div key={idx} className="text-center" data-testid={`capability-${idx}`}>
                  <div className="text-2xl font-black bg-gradient-to-r from-[#14feee] to-[#e10698] bg-clip-text text-transparent">{cap.value}</div>
                  <div className="text-xs text-gray-400">{cap.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* 📊 PRODUCT SHOWCASE - Creator & Fan Views */}
      <section className="relative z-10 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <motion.div 
            className="text-center mb-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-black text-white mb-3">
              See It In <span className="bg-gradient-to-r from-[#14feee] to-[#e10698] bg-clip-text text-transparent">Action</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Powerful dashboards for creators to manage programs and fans to engage & earn rewards</p>
          </motion.div>

          {/* Two-Column Dashboard Showcase */}
          <div className="grid lg:grid-cols-2 gap-8">
            
            {/* Creator Dashboard View */}
            <motion.div 
              className="relative group"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[#e10698] to-[#8B5CF6] rounded-2xl blur opacity-50 group-hover:opacity-75 transition"></div>
              <div className="relative bg-[#0a0d14] border border-white/10 rounded-2xl p-5 h-full">
                {/* Header Badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1 bg-gradient-to-r from-[#e10698] to-[#8B5CF6] rounded-full">
                      <span className="text-xs font-bold text-white">CREATOR VIEW</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#EF4444]"></div>
                    <div className="w-2 h-2 rounded-full bg-[#FBBF24]"></div>
                    <div className="w-2 h-2 rounded-full bg-[#10B981]"></div>
                  </div>
                </div>

                {/* Analytics Overview Header */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="w-5 h-5 text-[#14feee]" />
                    <h3 className="text-lg font-bold text-white">Analytics Overview</h3>
                  </div>
                  <p className="text-xs text-gray-500">Track your performance, growth, and revenue metrics</p>
                </div>

                {/* This Week Stats */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-xs text-gray-400">📅 This Week</div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-gradient-to-br from-[#14feee]/20 to-[#14feee]/5 border border-[#14feee]/30 rounded-lg p-3">
                      <div className="text-[10px] text-[#14feee] mb-1">New Fans</div>
                      <div className="text-xl font-black text-white">+342</div>
                      <div className="text-[9px] text-gray-500">Joined this week</div>
                    </div>
                    <div className="bg-gradient-to-br from-[#10B981]/20 to-[#10B981]/5 border border-[#10B981]/30 rounded-lg p-3">
                      <div className="text-[10px] text-[#10B981] mb-1">Revenue</div>
                      <div className="text-xl font-black text-white">$7,420</div>
                      <div className="text-[9px] text-gray-500">Points redeemed</div>
                    </div>
                    <div className="bg-gradient-to-br from-[#8B5CF6]/20 to-[#8B5CF6]/5 border border-[#8B5CF6]/30 rounded-lg p-3">
                      <div className="text-[10px] text-[#8B5CF6] mb-1">Tasks Completed</div>
                      <div className="text-xl font-black text-white">1,247</div>
                      <div className="text-[9px] text-gray-500">Fan engagement</div>
                    </div>
                    <div className="bg-gradient-to-br from-[#e10698]/20 to-[#e10698]/5 border border-[#e10698]/30 rounded-lg p-3">
                      <div className="text-[10px] text-[#e10698] mb-1">Rewards Redeemed</div>
                      <div className="text-xl font-black text-white">89</div>
                      <div className="text-[9px] text-gray-500">This week</div>
                    </div>
                  </div>
                </div>

                {/* Bottom Stats */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  <div className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <div className="text-[9px] text-gray-500">Total Fans</div>
                      <div className="text-base font-bold text-white">2,847</div>
                    </div>
                    <Users className="w-5 h-5 text-[#14feee]" />
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <div className="text-[9px] text-gray-500">Monthly Revenue</div>
                      <div className="text-base font-bold text-white">$7,420</div>
                    </div>
                    <Coins className="w-5 h-5 text-[#10B981]" />
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <div className="text-[9px] text-gray-500">Engagement Rate</div>
                      <div className="text-base font-bold text-[#10B981]">24.5%</div>
                    </div>
                    <TrendingUp className="w-5 h-5 text-[#10B981]" />
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <div className="text-[9px] text-gray-500">Active Campaigns</div>
                      <div className="text-base font-bold text-white">12</div>
                    </div>
                    <Target className="w-5 h-5 text-[#e10698]" />
                  </div>
                </div>

                {/* Growth & Revenue Analytics Preview */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-[#14feee]" />
                      <span className="text-sm font-bold text-white">Growth Analytics</span>
                    </div>
                    <div className="space-y-1 text-[10px]">
                      <div className="flex justify-between"><span className="text-gray-400">New Fans This Month</span><span className="text-white font-semibold">+342</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Growth Rate</span><span className="text-[#10B981] font-semibold">+18.5%</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Top Source</span><span className="text-white font-semibold">Instagram</span></div>
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Coins className="w-4 h-4 text-[#10B981]" />
                      <span className="text-sm font-bold text-white">Revenue Analytics</span>
                    </div>
                    <div className="space-y-1 text-[10px]">
                      <div className="flex justify-between"><span className="text-gray-400">This Month</span><span className="text-white font-semibold">$7,420</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Last Month</span><span className="text-white font-semibold">$6,850</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Growth</span><span className="text-[#10B981] font-semibold">+8.3%</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Fan Dashboard View */}
            <motion.div 
              className="relative group"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[#14feee] to-[#10B981] rounded-2xl blur opacity-50 group-hover:opacity-75 transition"></div>
              <div className="relative bg-[#0a0d14] border border-white/10 rounded-2xl p-5 h-full">
                {/* Header Badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1 bg-gradient-to-r from-[#14feee] to-[#10B981] rounded-full">
                      <span className="text-xs font-bold text-black">FAN VIEW</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#EF4444]"></div>
                    <div className="w-2 h-2 rounded-full bg-[#FBBF24]"></div>
                    <div className="w-2 h-2 rounded-full bg-[#10B981]"></div>
                  </div>
                </div>

                {/* Program Header - Like the screenshot */}
                <div className="bg-gradient-to-r from-[#14feee]/20 via-[#8B5CF6]/20 to-[#e10698]/20 rounded-xl p-4 mb-4 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-30" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                  }}></div>
                  <div className="relative flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#e10698] to-[#8B5CF6] flex items-center justify-center text-white font-bold text-lg">T</div>
                    <div>
                      <h3 className="text-lg font-black text-white">TruDeF.AI</h3>
                      <p className="text-xs text-gray-400">Loyalty rewards for being my fan!</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <span className="px-2 py-1 bg-[#e10698]/20 border border-[#e10698]/30 rounded text-[9px] text-[#e10698] font-semibold">🏆 TruDeF Points</span>
                    <span className="px-2 py-1 bg-[#14feee]/20 border border-[#14feee]/30 rounded text-[9px] text-[#14feee] font-semibold">📢 3 Campaigns</span>
                    <span className="px-2 py-1 bg-[#10B981]/20 border border-[#10B981]/30 rounded text-[9px] text-[#10B981] font-semibold">✅ 12 Tasks</span>
                  </div>
                </div>

                {/* Task Stats Bar - Updated */}
                <div className="flex gap-4 mb-4 p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded bg-white/10 flex items-center justify-center text-[10px]">📋</div>
                    <span className="text-[11px] text-gray-400">Total: <span className="text-white font-semibold">12</span></span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-[#10B981]" />
                    <span className="text-[11px] text-gray-400">Completed: <span className="text-[#10B981] font-semibold">8</span></span>
                  </div>
                  <div className="flex items-center gap-1 ml-auto">
                    <Sparkles className="w-4 h-4 text-[#FBBF24]" />
                    <span className="text-[11px] text-gray-400">Points: <span className="text-[#FBBF24] font-semibold">1,500</span></span>
                  </div>
                </div>

                {/* Quick Tasks - Matching screenshot style */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-4 h-4 text-[#14feee]" />
                    <span className="text-sm font-bold text-white">Quick Tasks</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { task: "Follow TruDeF.AI on Twitter", desc: "Follow our Twitter account to stay updated!", points: 69 },
                      { task: "Like my Facebook Page", desc: "Like my Facebook page to stay connected!", points: 501 },
                      { task: "Comment on Instagram Post", desc: "Comment with your unique code on our...", points: 192 },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-white">{item.task}</div>
                          <div className="text-[10px] text-gray-500">{item.desc}</div>
                        </div>
                        <span className="px-3 py-1 bg-[#14feee]/20 border border-[#14feee]/30 rounded-full text-xs font-bold text-[#14feee]">+{item.points}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Your Stats & Community Stats Side by Side */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-[#FBBF24]" />
                      <span className="text-sm font-bold text-white">Your Stats</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-gray-400">🏆 TruDeF Points</span>
                        <span className="text-sm font-bold text-[#FBBF24]">1,500</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-gray-400">✅ Tasks Completed</span>
                        <span className="text-sm font-bold text-[#10B981]">8</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-[#14feee]" />
                      <span className="text-sm font-bold text-white">Community</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-gray-400">👥 Total Fans</span>
                        <span className="text-sm font-bold text-white">2,847</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-gray-400">📢 Active Campaigns</span>
                        <span className="text-sm font-bold text-white">3</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Activity Feed Row */}
          <motion.div 
            className="mt-8"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <div className="bg-[#0a0d14] border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <motion.div 
                    className="w-2 h-2 rounded-full bg-[#10B981]"
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <span className="text-sm font-bold text-white">Live Activity Feed</span>
                </div>
                <span className="text-xs text-gray-500">Real-time engagement</span>
              </div>
              <div className="grid md:grid-cols-4 gap-3">
                {[
                  { user: "sheafan", action: "completed", task: "Follow TruDeF.AI on Twitter", points: 69 },
                  { user: "cryptofan_22", action: "earned", task: "Daily Login Bonus", points: 25 },
                  { user: "web3_sarah", action: "redeemed", task: "Exclusive NFT Badge", points: -500 },
                  { user: "trudef_mike", action: "completed", task: "Like my Facebook Page", points: 501 },
                ].map((activity, i) => (
                  <motion.div 
                    key={i}
                    className="flex items-center gap-3 p-3 bg-white/5 rounded-lg"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#e10698] to-[#8B5CF6] flex items-center justify-center text-white text-xs font-bold">
                      {activity.user.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-white truncate">
                        <span className="font-semibold">{activity.user}</span>
                        <span className="text-gray-400"> {activity.action}</span>
                      </div>
                      <div className="text-[9px] text-gray-500 truncate">{activity.task}</div>
                    </div>
                    <div className={`text-xs font-bold ${activity.points > 0 ? 'text-[#10B981]' : 'text-[#e10698]'}`}>
                      {activity.points > 0 ? '+' : ''}{activity.points}
                    </div>
                    <CheckCircle className="w-4 h-4 text-[#10B981] flex-shrink-0" />
                  </motion.div>
                ))}
              </div>
            </div>
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
            { feature: "No-Code", detail: "Setup", icon: FaBrush, color: "#8B5CF6" },
            { feature: "White-Label", detail: "Branding", icon: FaPalette, color: "#14feee" },
            { feature: "32+ Templates", detail: "Pre-Built", icon: FaBookOpen, color: "#e10698" },
            { feature: "8+ Platforms", detail: "Integrated", icon: FaGlobe, color: "#10B981" },
            { feature: "Real-Time", detail: "Verification", icon: FaCheckCircle, color: "#14feee" },
            { feature: "Instant", detail: "Rewards", icon: FaBolt, color: "#FBBF24" },
            { feature: "Auto", detail: "Distribution", icon: FaGift, color: "#e10698" },
            { feature: "Smart", detail: "Analytics", icon: FaChartBar, color: "#8B5CF6" },
            { feature: "Custom", detail: "Auth", icon: FaLock, color: "#10B981" },
            { feature: "Embedded", detail: "Option", icon: FaMobileAlt, color: "#14feee" },
            { feature: "Multi-Campaign", detail: "Support", icon: FaBullseye, color: "#e10698" },
            { feature: "5-Min", detail: "Setup", icon: FaRocket, color: "#FBBF24" }
          ].map((item, i) => (
            <div key={i} className="flex-shrink-0 w-64 h-32 relative" data-testid={`pulse-feature-${i}`}>
              <div
                className="absolute inset-0 rounded-full blur-xl opacity-60"
                style={{
                  background: `radial-gradient(circle, ${i % 3 === 0 ? '#14feee' : i % 3 === 1 ? '#8B5CF6' : '#e10698'}, transparent)`
                }}
              ></div>
              <div className="relative h-full flex flex-col items-center justify-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
                <item.icon className="text-3xl mb-1" style={{ color: item.color }} />
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
                <h3 className="text-2xl font-black text-white mb-4">Instant Verification</h3>
                <p className="text-gray-300 mb-6">Verify X, YouTube, Facebook, Spotify, Discord, and Twitch actions instantly. No manual checking. No fraud. Just authentic engagement, instantly rewarded.</p>
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
                <h3 className="text-2xl font-black text-white mb-4">Rewards That Matter</h3>
                <p className="text-gray-300 mb-6">From digital collectibles to game-worn jerseys. Points, NFTs, raffle entries, and exclusive merch—all automated, all yours to customize. Your fans get rewarded instantly, no crypto expertise needed.</p>
                <div className="flex flex-wrap gap-2">
                  {["Points", "NFTs", "Raffle Tickets", "Physical Goods"].map(reward => (
                    <span key={reward} className="px-3 py-1 bg-[#e10698]/20 border border-[#e10698]/30 rounded-full text-xs text-[#e10698]">
                      {reward}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 🎯 WHO IT'S FOR - Enhanced Creator Cards */}
      <section className="relative py-24 px-4 bg-gradient-to-b from-transparent to-[#8B5CF6]/10" data-testid="creator-types-section">
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
          <p className="text-center text-xl text-gray-300 mb-12">From athletes to brands - one platform powers them all</p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* NIL Athletes Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0 }}
              className="relative group min-h-[420px]"
              data-testid="creator-type-athletes"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[#14feee] to-[#8B5CF6] rounded-2xl blur opacity-60 group-hover:opacity-100 transition"></div>
              <div className="relative h-full bg-gradient-to-br from-[#0a1628] via-[#0f1f3a] to-[#0a0118] backdrop-blur-xl border border-white/10 rounded-2xl p-8 overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2314feee' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}></div>
                
                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#14feee] to-[#8B5CF6] flex items-center justify-center">
                      <Trophy className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white">NIL Athletes</h3>
                      <p className="text-[#14feee] text-sm font-semibold">Name, Image & Likeness</p>
                    </div>
                  </div>
                  
                  <p className="text-gray-300 mb-6 leading-relaxed">
                    Your fans want to be part of your journey. Monetize your NIL with loyalty programs that turn followers into stakeholders.
                  </p>
                  
                  {/* Subcategory Checkmarks */}
                  <div className="grid grid-cols-1 gap-2 mb-6 flex-grow">
                    {["Professional & Olympic Athletes", "College & University Athletes", "High School Athletes & Programs"].map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-[#14feee] flex-shrink-0" />
                        <span className="text-gray-300 text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                  
                  <motion.button
                    onClick={() => setShowAuthFlow(true)}
                    className="w-full py-3 px-6 bg-gradient-to-r from-[#14feee] to-[#8B5CF6] rounded-xl font-bold text-white hover:shadow-lg hover:shadow-cyan-500/25 transition-all"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="flex items-center justify-center gap-2">
                      Get Started <ArrowRight className="w-4 h-4" />
                    </span>
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* Content Creators Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="relative group min-h-[420px]"
              data-testid="creator-type-content"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[#8B5CF6] to-[#e10698] rounded-2xl blur opacity-60 group-hover:opacity-100 transition"></div>
              <div className="relative h-full bg-gradient-to-br from-[#1a0a2e] via-[#2d1045] to-[#0a0118] backdrop-blur-xl border border-white/10 rounded-2xl p-8 overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%238B5CF6' fill-opacity='0.4'%3E%3Cpath d='M50 50c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10s-10-4.477-10-10 4.477-10 10-10zM10 10c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10S0 25.523 0 20s4.477-10 10-10zm10 8c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8zm40 40c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8z' /%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}></div>
                
                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#e10698] flex items-center justify-center">
                      <Camera className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white">Content Creators</h3>
                      <p className="text-[#e10698] text-sm font-semibold">Digital Influence</p>
                    </div>
                  </div>
                  
                  <p className="text-gray-300 mb-6 leading-relaxed">
                    Turn casual viewers into devoted fans. Reward every interaction and watch your audience become your growth engine.
                  </p>
                  
                  {/* Subcategory Checkmarks */}
                  <div className="grid grid-cols-1 gap-2 mb-6 flex-grow">
                    {["Social Media Influencers", "Video Content & Vloggers", "Photographers & Visual Artists", "Models & Actors"].map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-[#e10698] flex-shrink-0" />
                        <span className="text-gray-300 text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                  
                  <motion.button
                    onClick={() => setShowAuthFlow(true)}
                    className="w-full py-3 px-6 bg-gradient-to-r from-[#8B5CF6] to-[#e10698] rounded-xl font-bold text-white hover:shadow-lg hover:shadow-purple-500/25 transition-all"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="flex items-center justify-center gap-2">
                      Get Started <ArrowRight className="w-4 h-4" />
                    </span>
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* Musicians Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="relative group min-h-[420px]"
              data-testid="creator-type-musicians"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[#e10698] to-[#10B981] rounded-2xl blur opacity-60 group-hover:opacity-100 transition"></div>
              <div className="relative h-full bg-gradient-to-br from-[#2d0a1f] via-[#1a0a15] to-[#0a0118] backdrop-blur-xl border border-white/10 rounded-2xl p-8 overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%23e10698' fill-opacity='0.4'%3E%3Cpath opacity='.5' d='M96 95h4v1h-4v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9zm-1 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9z'/%3E%3Cpath d='M6 5V0H5v5H0v1h5v94h1V6h94V5H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}></div>
                
                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#e10698] to-[#10B981] flex items-center justify-center">
                      <Music className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white">Musicians</h3>
                      <p className="text-[#10B981] text-sm font-semibold">Artists & Performers</p>
                    </div>
                  </div>
                  
                  <p className="text-gray-300 mb-6 leading-relaxed">
                    Streaming pays pennies. Your superfans? They're worth gold. Build direct relationships that grow beyond algorithms.
                  </p>
                  
                  {/* Subcategory Checkmarks */}
                  <div className="grid grid-cols-1 gap-2 mb-6 flex-grow">
                    {["Grammy & Award Winners", "Independent Artists", "Local & Emerging Artists", "Cover Artists & Entertainers"].map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-[#10B981] flex-shrink-0" />
                        <span className="text-gray-300 text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                  
                  <motion.button
                    onClick={() => setShowAuthFlow(true)}
                    className="w-full py-3 px-6 bg-gradient-to-r from-[#e10698] to-[#10B981] rounded-xl font-bold text-white hover:shadow-lg hover:shadow-pink-500/25 transition-all"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="flex items-center justify-center gap-2">
                      Get Started <ArrowRight className="w-4 h-4" />
                    </span>
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* Brands & Agencies Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="relative group min-h-[420px]"
              data-testid="creator-type-brands"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[#10B981] to-[#14feee] rounded-2xl blur opacity-60 group-hover:opacity-100 transition"></div>
              <div className="relative h-full bg-gradient-to-br from-[#0a1f1a] via-[#0f2a22] to-[#0a0118] backdrop-blur-xl border border-white/10 rounded-2xl p-8 overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2310B981' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}></div>
                
                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#10B981] to-[#14feee] flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white">Brands & Agencies</h3>
                      <p className="text-[#14feee] text-sm font-semibold">Enterprise Solutions</p>
                    </div>
                  </div>
                  
                  <p className="text-gray-300 mb-6 leading-relaxed">
                    Your brand. Your domain. Your auth. Launch unlimited campaigns with enterprise-grade white-labeling.
                  </p>
                  
                  {/* Subcategory Checkmarks */}
                  <div className="grid grid-cols-1 gap-2 mb-6 flex-grow">
                    {["Enterprise Companies", "Marketing Agencies", "Small & Medium Business", "Sports Teams & Leagues"].map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-[#14feee] flex-shrink-0" />
                        <span className="text-gray-300 text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                  
                  <motion.button
                    onClick={() => setShowAuthFlow(true)}
                    className="w-full py-3 px-6 bg-gradient-to-r from-[#10B981] to-[#14feee] rounded-xl font-bold text-white hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="flex items-center justify-center gap-2">
                      Get Started <ArrowRight className="w-4 h-4" />
                    </span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
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
          <p className="text-center text-xl text-gray-300 mb-6">Meet your fans where they are. Verify every action instantly. Reward across all platforms from one command center.</p>

          {/* Platform Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {[
              { name: "Facebook", icon: "/Social Icons/icons8-facebook-48.png", color: "#1877F2" },
              { name: "Instagram", icon: "/Social Icons/icons8-instagram-48.png", color: "#E4405F" },
              { name: "X (Twitter)", icon: "/Social Icons/icons8-x-48.png", color: "#1DA1F2" },
              { name: "TikTok", icon: "/Social Icons/icons8-tiktok-48.png", color: "#FE2C55" },
              { name: "YouTube", icon: "/Social Icons/icons8-youtube-48.png", color: "#FF0000" },
              { name: "Spotify", icon: "/Social Icons/icons8-spotify-48.png", color: "#1DB954" },
              { name: "Discord", icon: "/Social Icons/icons8-discord-48.png", color: "#5865F2" },
              { name: "Twitch", icon: "/Social Icons/icons8-twitch-48.png", color: "#9146FF" }
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
                  <img src={platform.icon} alt={platform.name} className="w-12 h-12 mx-auto mb-2" />
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
                title: "Verified in Milliseconds",
                desc: "Every like, follow, and share verified instantly via webhooks. No delays, no manual checking, no fraud.",
                testId: "feature-verification"
              },
              {
                icon: BarChart3,
                title: "One Dashboard to Rule Them All",
                desc: "See everything in one place. Engagement, reach, revenue, ROI—across every platform, every campaign, every fan.",
                testId: "feature-analytics"
              },
              {
                icon: Sparkles,
                title: "AI That Actually Helps",
                desc: "Smart suggestions for campaigns, tasks, and rewards. Optimize what's working, fix what's not. Like having a growth team in your pocket.",
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
                title: "Sign Up & Connect",
                description: "Create your account and link your socials in under 60 seconds. No blockchain wallets, no crypto confusion—just your existing social logins.",
                icon: FaUserPlus,
                gradient: "from-[#14feee] to-[#8B5CF6]"
              },
              {
                step: "02",
                title: "Design Your Program",
                description: "Make it yours. Full white-label branding, your domain, your style. Pick from 32+ proven templates or build custom tasks. Live in 5 minutes.",
                icon: FaPalette,
                gradient: "from-[#8B5CF6] to-[#e10698]"
              },
              {
                step: "03",
                title: "Fans Complete & Get Verified",
                description: "Your community follows, likes, subscribes, creates content—and gets instantly verified. Real actions. Real rewards. Real-time.",
                icon: FaCheckCircle,
                gradient: "from-[#e10698] to-[#10B981]"
              },
              {
                step: "04",
                title: "Rewards Deploy Automatically",
                description: "Points, raffle entries, NFT collectibles, access to exclusive drops. Fans redeem for physical merch, game-worn gear, meet-and-greets. You set it, we automate it.",
                icon: FaGift,
                gradient: "from-[#10B981] to-[#14feee]"
              },
              {
                step: "05",
                title: "Watch Your Value Explode",
                description: "Engaged fans = higher valuation. Track every metric, prove ROI, and scale your community into a movement. Your brand equity compounds daily.",
                icon: FaTrophy,
                gradient: "from-[#14feee] to-[#8B5CF6]"
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
                {/* Timeline Dot - Fixed positioning */}
                <div className="hidden md:block absolute left-1/2 -ml-3 w-6 h-6 rounded-full bg-gradient-to-r from-[#14feee] to-[#e10698] border-4 border-[#0a0118] z-10"></div>

                {/* Content Card - Improved spacing */}
                <div className={`flex-1 ${i % 2 === 0 ? 'md:text-right md:pr-24' : 'md:pl-24'}`}>
                  <div className="inline-block p-6 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl">
                    <div className={`text-6xl mb-4 ${i % 2 === 0 ? 'md:justify-end' : ''} flex`}>
                      <item.icon className={`bg-gradient-to-r ${item.gradient} bg-clip-text text-transparent`} />
                    </div>
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
            <span className="text-white">Built for </span>
            <span className="bg-gradient-to-r from-[#8B5CF6] to-[#14feee] bg-clip-text text-transparent">Enterprises</span>
          </motion.h2>
          <p className="text-center text-xl text-gray-300 mb-20">White-label everything. Your brand, your auth, your rules.</p>

          {/* Enterprise Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {[
              {
                icon: Palette,
                title: "100% Your Brand",
                desc: "Not a trace of Fandomly anywhere. Your domain, your logo, your colors, your CSS. White-label so complete, even your dev team won't know you didn't build it.",
                features: ["Custom Domain", "Brand Colors", "Logo Integration", "Custom CSS"],
                gradient: "from-[#14feee] to-[#8B5CF6]"
              },
              {
                icon: Lock,
                title: "Your Auth, Your Users",
                desc: "Already have authentication? Perfect. OAuth, SAML SSO, custom flows—plug in what you've got. Your users stay in your ecosystem, seamlessly.",
                features: ["OAuth 2.0", "SAML SSO", "Custom Auth", "Multi-Tenant"],
                gradient: "from-[#8B5CF6] to-[#e10698]"
              },
              {
                icon: Building2,
                title: "Unlimited Scale",
                desc: "Agencies: manage 50 brands. Enterprises: run 100 campaigns. No limits, no throttling, no surprise fees as you grow. Built for ambition.",
                features: ["Unlimited Campaigns", "Multi-Brand", "Agency Dashboard", "Client Portal"],
                gradient: "from-[#e10698] to-[#10B981]"
              },
              {
                icon: Smartphone,
                title: "Embed or Standalone",
                desc: "iFrame it into your existing app. Hook into our API. Listen to webhooks. Or launch standalone. However you build, we flex to fit.",
                features: ["iFrame Embed", "API Access", "Webhook Events", "Custom Integration"],
                gradient: "from-[#10B981] to-[#14feee]"
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative group h-full"
                data-testid={`enterprise-feature-${i}`}
              >
                <div className={`absolute -inset-0.5 bg-gradient-to-r ${feature.gradient} rounded-2xl blur opacity-60 group-hover:opacity-100 transition`}></div>
                <div className="relative bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl p-8 h-full flex flex-col">
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 flex-shrink-0`}>
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-black text-white mb-4">{feature.title}</h3>
                  <p className="text-gray-300 mb-6 leading-relaxed flex-grow">{feature.desc}</p>
                  <div className="flex flex-wrap gap-2">
                    {feature.features.map((item, idx) => (
                      <span key={idx} className="px-3 py-1 bg-white/10 border border-white/20 rounded-full text-xs text-gray-300">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
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
                  Join the creators turning followers into revenue. Real-time verification. Real rewards. Real growth. Early access is open.
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
                    <p className="text-white/80 text-sm">Get rewarded for supporting who you love</p>
                  </div>
                </motion.button>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap justify-center gap-4 mt-12 pt-8 border-t border-white/10">
                {["No-Code Platform", "Fully White-Labeled", "32+ Task Templates", "8+ Social Integrations"].map((badge) => (
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
