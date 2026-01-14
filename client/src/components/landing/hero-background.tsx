import { motion } from "framer-motion";

/**
 * HeroBackground - Animated connectivity visual for the hero section
 * 
 * Creates a layered effect with:
 * 1. Dot grid pattern representing nodes/people
 * 2. Animated connection lines between nodes
 * 3. Flowing wave ribbons for movement and depth
 */
export function HeroBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0118] via-[#0f0a1f] to-[#0a0118]" />
      
      {/* Connection Lines SVG */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradient for connection lines */}
          <linearGradient id="connectionGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#14feee" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#e10698" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.6" />
          </linearGradient>
          
          <linearGradient id="connectionGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e10698" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#14feee" stopOpacity="0.7" />
          </linearGradient>
          
          <linearGradient id="connectionGradient3" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#e10698" stopOpacity="0.6" />
          </linearGradient>

          {/* Wave gradient fills */}
          <linearGradient id="waveGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#14feee" stopOpacity="0.08" />
            <stop offset="50%" stopColor="#e10698" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#14feee" stopOpacity="0.05" />
          </linearGradient>
          
          <linearGradient id="waveGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e10698" stopOpacity="0.06" />
            <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#e10698" stopOpacity="0.04" />
          </linearGradient>

        </defs>

        {/* Connection Lines - Animated paths between nodes */}
        <g className="connection-lines">
          {/* Line 1: Top-left to center */}
          <path
            d="M100,150 Q400,200 600,350"
            fill="none"
            stroke="url(#connectionGradient1)"
            strokeWidth="1.5"
            className="connection-line"
            style={{ animationDelay: "0s" }}
          />
          
          {/* Line 2: Top-right to center */}
          <path
            d="M1100,100 Q900,250 650,320"
            fill="none"
            stroke="url(#connectionGradient2)"
            strokeWidth="1.5"
            className="connection-line"
            style={{ animationDelay: "1s" }}
          />
          
          {/* Line 3: Bottom-left curving up */}
          <path
            d="M50,600 Q300,400 550,380"
            fill="none"
            stroke="url(#connectionGradient3)"
            strokeWidth="1.5"
            className="connection-line"
            style={{ animationDelay: "2s" }}
          />
          
          {/* Line 4: Bottom-right to center */}
          <path
            d="M1150,700 Q850,500 680,400"
            fill="none"
            stroke="url(#connectionGradient1)"
            strokeWidth="1.5"
            className="connection-line"
            style={{ animationDelay: "0.5s" }}
          />
          
          {/* Line 5: Left edge horizontal */}
          <path
            d="M0,400 Q200,350 400,380"
            fill="none"
            stroke="url(#connectionGradient2)"
            strokeWidth="1"
            className="connection-line"
            style={{ animationDelay: "1.5s" }}
          />
          
          {/* Line 6: Right edge horizontal */}
          <path
            d="M1200,450 Q1000,400 800,420"
            fill="none"
            stroke="url(#connectionGradient3)"
            strokeWidth="1"
            className="connection-line"
            style={{ animationDelay: "2.5s" }}
          />
        </g>

      </svg>

      {/* Wave Ribbons - Animated flowing paths */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Wave 1 - Upper flowing ribbon */}
        <motion.path
          d="M-100,250 Q200,180 400,220 T800,180 T1300,250"
          fill="none"
          stroke="url(#waveGradient1)"
          strokeWidth="80"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ 
            pathLength: 1, 
            opacity: 1,
            y: [0, -15, 0]
          }}
          transition={{
            pathLength: { duration: 2, ease: "easeOut" },
            opacity: { duration: 1 },
            y: { duration: 8, repeat: Infinity, ease: "easeInOut" }
          }}
        />
        
        {/* Wave 2 - Middle flowing ribbon */}
        <motion.path
          d="M-50,420 Q250,350 500,400 T950,350 T1250,420"
          fill="none"
          stroke="url(#waveGradient2)"
          strokeWidth="100"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ 
            pathLength: 1, 
            opacity: 1,
            y: [0, 20, 0]
          }}
          transition={{
            pathLength: { duration: 2.5, ease: "easeOut", delay: 0.3 },
            opacity: { duration: 1, delay: 0.3 },
            y: { duration: 10, repeat: Infinity, ease: "easeInOut", delay: 0.3 }
          }}
        />
        
        {/* Wave 3 - Lower flowing ribbon */}
        <motion.path
          d="M-100,580 Q300,520 550,560 T1000,500 T1300,580"
          fill="none"
          stroke="url(#waveGradient1)"
          strokeWidth="60"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ 
            pathLength: 1, 
            opacity: 1,
            y: [0, -10, 0]
          }}
          transition={{
            pathLength: { duration: 2, ease: "easeOut", delay: 0.6 },
            opacity: { duration: 1, delay: 0.6 },
            y: { duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.6 }
          }}
        />
      </svg>

      {/* Ambient glow spots for depth */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#14feee]/5 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#e10698]/5 rounded-full blur-[100px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#8B5CF6]/3 rounded-full blur-[120px]" />

      {/* Vignette overlay for focus on center */}
      <div className="absolute inset-0 bg-radial-vignette" />
    </div>
  );
}

export default HeroBackground;
