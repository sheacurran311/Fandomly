import { motion } from "framer-motion";
import { 
  Trophy, Camera, Music, Building2, ArrowRight, CheckCircle,
  Users, Zap, BarChart3, Sparkles, Shield, Coins
} from "lucide-react";
import { 
  SiFacebook, SiInstagram, SiX, SiTiktok, 
  SiYoutube, SiSpotify, SiDiscord, SiTwitch 
} from "react-icons/si";
import { 
  FaUserPlus, FaPalette, FaCheckCircle, FaGift, FaTrophy
} from "react-icons/fa";
import { BetaSignupForm } from "@/components/landing/beta-signup-form";
import { HeroBackground } from "@/components/landing/hero-background";

// Consistent section styling
const SECTION_PADDING = "py-24 px-4";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0118] overflow-x-hidden">
      {/* Fixed Animated Background - stays in place on scroll */}
      <HeroBackground />
      
      {/* ===== HERO SECTION ===== */}
      <section className="relative z-10 pt-16 pb-24 px-4 overflow-hidden min-h-[85vh] flex items-center">
        
        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-8">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-sm text-gray-300">Beta Access Open</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
              <span className="text-white">Elevate Your Brand.</span>
              <br />
              <span className="text-[#e10698]">Reward Your Community.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Launch your own loyalty program in minutes. Verify social engagement automatically. 
              Reward fans with points, NFTs, and exclusive perks.
            </p>

            {/* Beta Signup Form */}
            <BetaSignupForm variant="hero" showUserType={true} />
          </motion.div>
        </div>
      </section>

      {/* ===== PLATFORM INTEGRATIONS ===== */}
      <section className={`${SECTION_PADDING} bg-[#0d0a15] relative z-10`}>
        <div className="max-w-6xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              One dashboard. Eight platforms.
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Verify fan engagement across all major social platforms automatically.
            </p>
          </motion.div>

          {/* Platform Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-16">
            {[
              { name: "Facebook", icon: SiFacebook, color: "#1877F2" },
              { name: "Instagram", icon: SiInstagram, color: "#E4405F" },
              { name: "X", icon: SiX, color: "#ffffff" },
              { name: "TikTok", icon: SiTiktok, color: "#ff0050" },
              { name: "YouTube", icon: SiYoutube, color: "#FF0000" },
              { name: "Spotify", icon: SiSpotify, color: "#1DB954" },
              { name: "Discord", icon: SiDiscord, color: "#5865F2" },
              { name: "Twitch", icon: SiTwitch, color: "#9146FF" },
            ].map((platform, i) => (
              <motion.div
                key={platform.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="group p-6 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 rounded-xl transition-all cursor-default"
              >
                <div className="flex flex-col items-center gap-3">
                  <platform.icon 
                    className="w-8 h-8 transition-transform group-hover:scale-110" 
                    style={{ color: platform.color }} 
                  />
                  <span className="text-sm text-gray-400 group-hover:text-white transition-colors">
                    {platform.name}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Zap,
                title: "Instant Verification",
                desc: "Every follow, like, and share is verified automatically via API. No screenshots needed.",
              },
              {
                icon: BarChart3,
                title: "Unified Analytics",
                desc: "Track engagement, growth, and ROI across all platforms from a single dashboard.",
              },
              {
                icon: Sparkles,
                title: "Smart Campaigns",
                desc: "AI-powered suggestions help you create campaigns that resonate with your audience.",
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 bg-white/[0.02] border border-white/5 rounded-xl"
              >
                <feature.icon className="w-8 h-8 text-[#e10698] mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRODUCT SHOWCASE ===== */}
      <section className={`${SECTION_PADDING} relative z-10`}>
        <div className="max-w-6xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Built for creators and fans
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Powerful tools to manage your community and reward engagement.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Creator Dashboard Preview */}
            <motion.div 
              className="relative"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="bg-[#0f0f1a] border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1 bg-[#e10698]/20 text-[#e10698] rounded-full text-xs font-medium">
                      CREATOR DASHBOARD
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-4 gap-3 mb-6">
                  {[
                    { label: "Fans", value: "2,847", color: "text-[#14feee]" },
                    { label: "Revenue", value: "$7,420", color: "text-emerald-400" },
                    { label: "Tasks Done", value: "1,247", color: "text-purple-400" },
                    { label: "Rewards", value: "89", color: "text-[#e10698]" },
                  ].map((stat, i) => (
                    <div key={i} className="p-3 bg-white/[0.03] rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">{stat.label}</div>
                      <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
                    </div>
                  ))}
                </div>

                {/* Chart placeholder */}
                <div className="h-32 bg-white/[0.02] rounded-lg flex items-end justify-around p-4">
                  {[40, 65, 45, 80, 55, 70, 90].map((h, i) => (
                    <div 
                      key={i} 
                      className="w-6 bg-gradient-to-t from-[#e10698]/50 to-[#e10698] rounded-t"
                      style={{ height: `${h}%` }}
                    ></div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Fan Dashboard Preview */}
            <motion.div 
              className="relative"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="bg-[#0f0f1a] border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1 bg-[#14feee]/20 text-[#14feee] rounded-full text-xs font-medium">
                      FAN DASHBOARD
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
                  </div>
                </div>

                {/* Points Display */}
                <div className="p-4 bg-gradient-to-r from-[#e10698]/10 to-[#14feee]/10 rounded-xl mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Your Points</div>
                      <div className="text-3xl font-bold text-white">1,500</div>
                    </div>
                    <Sparkles className="w-8 h-8 text-[#14feee]" />
                  </div>
                </div>

                {/* Task List */}
                <div className="space-y-3">
                  {[
                    { task: "Follow on Twitter", points: 69, done: true },
                    { task: "Like Facebook Page", points: 501, done: false },
                    { task: "Comment on Instagram", points: 192, done: false },
                  ].map((item, i) => (
                    <div 
                      key={i} 
                      className="flex items-center justify-between p-3 bg-white/[0.03] rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {item.done ? (
                          <CheckCircle className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-gray-600"></div>
                        )}
                        <span className={item.done ? "text-gray-500 line-through" : "text-white text-sm"}>
                          {item.task}
                        </span>
                      </div>
                      <span className="text-xs text-[#14feee] font-medium">+{item.points}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== WHO IT'S FOR ===== */}
      <section className={`${SECTION_PADDING} bg-[#0d0a15] relative z-10`}>
        <div className="max-w-6xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Built for every creator
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              From athletes to musicians—one platform powers them all.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: Trophy,
                title: "NIL Athletes",
                subtitle: "Name, Image & Likeness",
                desc: "Monetize your NIL with loyalty programs that turn followers into stakeholders.",
                items: ["Pro & Olympic Athletes", "College Athletes", "High School Athletes"],
                accent: "#14feee",
              },
              {
                icon: Camera,
                title: "Content Creators",
                subtitle: "Digital Influence",
                desc: "Turn casual viewers into devoted fans. Reward every interaction.",
                items: ["Social Media Influencers", "Video Creators", "Photographers"],
                accent: "#e10698",
              },
              {
                icon: Music,
                title: "Musicians",
                subtitle: "Artists & Performers",
                desc: "Streaming pays pennies. Your superfans? They're worth gold.",
                items: ["Independent Artists", "Signed Artists", "Cover Artists"],
                accent: "#8B5CF6",
              },
              {
                icon: Building2,
                title: "Brands & Agencies",
                subtitle: "Enterprise Solutions",
                desc: "Your brand. Your domain. Your auth. Full white-label solution.",
                items: ["Marketing Agencies", "Enterprise Companies", "Sports Teams"],
                accent: "#10B981",
              },
            ].map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-white/10 transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${card.accent}20` }}
                  >
                    <card.icon className="w-5 h-5" style={{ color: card.accent }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{card.title}</h3>
                    <p className="text-xs" style={{ color: card.accent }}>{card.subtitle}</p>
                  </div>
                </div>
                
                <p className="text-gray-400 text-sm mb-4 leading-relaxed">{card.desc}</p>
                
                <div className="space-y-1.5">
                  {card.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: card.accent }} />
                      <span className="text-sm text-gray-300">{item}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className={`${SECTION_PADDING} relative z-10`}>
        <div className="max-w-4xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              How it works
            </h2>
            <p className="text-gray-400">From launch to payout in five simple steps.</p>
          </motion.div>

          <div className="relative">
            {/* Vertical Line - Gradient */}
            <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#14feee] via-[#e10698] to-[#8B5CF6] -translate-x-1/2"></div>

            {[
              {
                step: "01",
                title: "Sign Up & Connect",
                desc: "Create your account and link your socials in under 60 seconds.",
                icon: FaUserPlus,
                color: "#14feee",
              },
              {
                step: "02",
                title: "Design Your Program",
                desc: "Pick from 32+ proven templates or build custom tasks. Live in 5 minutes.",
                icon: FaPalette,
                color: "#10B981",
              },
              {
                step: "03",
                title: "Fans Complete Tasks",
                desc: "Your community follows, likes, subscribes—and gets instantly verified.",
                icon: FaCheckCircle,
                color: "#e10698",
              },
              {
                step: "04",
                title: "Rewards Deploy",
                desc: "Points, NFTs, raffle entries, exclusive merch—all automated.",
                icon: FaGift,
                color: "#8B5CF6",
              },
              {
                step: "05",
                title: "Watch Growth",
                desc: "Track every metric, prove ROI, and scale your community.",
                icon: FaTrophy,
                color: "#14feee",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className={`relative flex items-start gap-6 mb-12 ${
                  i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                }`}
              >
                {/* Timeline Dot - Colored */}
                <div 
                  className="absolute left-6 md:left-1/2 w-4 h-4 rounded-full -translate-x-1/2 mt-1.5 z-10 ring-4 ring-[#0a0118]"
                  style={{ backgroundColor: item.color }}
                ></div>

                {/* Content */}
                <div className={`flex-1 ml-14 md:ml-0 ${i % 2 === 0 ? 'md:pr-16 md:text-right' : 'md:pl-16'}`}>
                  <div 
                    className={`inline-block p-5 rounded-xl border ${
                      i % 2 === 0 ? 'md:ml-auto' : ''
                    }`}
                    style={{ 
                      backgroundColor: `${item.color}08`,
                      borderColor: `${item.color}30`
                    }}
                  >
                    <div className={`flex items-center gap-3 mb-2 ${i % 2 === 0 ? 'md:justify-end' : ''}`}>
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${item.color}20` }}
                      >
                        <item.icon className="w-4 h-4" style={{ color: item.color }} />
                      </div>
                      <span className="text-xs font-semibold" style={{ color: item.color }}>STEP {item.step}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">{item.title}</h3>
                    <p className="text-gray-400 text-sm max-w-sm">{item.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURES GRID ===== */}
      <section className={`${SECTION_PADDING} bg-[#0d0a15] relative z-10`}>
        <div className="max-w-6xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Everything you need
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              A complete toolkit for building engaged communities.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Shield,
                title: "Fraud Protection",
                desc: "Real-time verification prevents fake engagement and bot activity.",
              },
              {
                icon: Coins,
                title: "Flexible Rewards",
                desc: "Points, NFTs, raffle entries, physical merch—all in one system.",
              },
              {
                icon: Users,
                title: "Fan Tiers",
                desc: "Automatically segment fans by engagement level and reward loyalty.",
              },
              {
                icon: BarChart3,
                title: "Deep Analytics",
                desc: "Track engagement, conversion rates, and ROI in real-time.",
              },
              {
                icon: Sparkles,
                title: "White-Label",
                desc: "Your brand, your domain, your colors. Zero Fandomly branding.",
              },
              {
                icon: Zap,
                title: "No-Code Setup",
                desc: "Launch your program in 5 minutes. No developers required.",
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="p-6 bg-white/[0.02] border border-white/5 rounded-xl hover:border-white/10 transition-all"
              >
                <feature.icon className="w-8 h-8 text-[#14feee] mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className={`${SECTION_PADDING} relative z-10`}>
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              Ready to build your community?
            </h2>
            <p className="text-lg text-gray-400 mb-10 max-w-xl mx-auto">
              Join creators who are turning followers into loyal fans. 
              Get early access to Fandomly.
            </p>
            
            <BetaSignupForm variant="section" showUserType={false} />

            {/* Trust badges */}
            <div className="flex flex-wrap justify-center gap-3 mt-10">
              {["No-Code Setup", "White-Label", "32+ Templates", "8+ Platforms"].map((badge) => (
                <span 
                  key={badge} 
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-gray-400"
                >
                  {badge}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
