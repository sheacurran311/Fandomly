/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  AnimatePresence,
  useMotionValue,
  animate,
} from 'framer-motion';
import {
  ArrowRight,
  Check,
  Mail,
  Loader2,
  Sparkles,
  PartyPopper,
  X,
  Menu,
  ShieldCheck,
  Gift,
  Crown,
  BarChart3,
  Palette,
  Zap,
  LogIn,
  ExternalLink,
  FileText,
  Coins,
  Award,
  Users,
  Trophy,
} from 'lucide-react';
import {
  SiFacebook,
  SiInstagram,
  SiX,
  SiTiktok,
  SiYoutube,
  SiSpotify,
  SiDiscord,
  SiTwitch,
  SiPatreon,
} from 'react-icons/si';
import { Link } from 'wouter';
import { SectionGeometry } from '@/components/landing/section-geometry';

// ============================================================
// SIGN-IN PANEL — shown below hero signup, links to /login
// ============================================================
function SignInPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.55 }}
      className="mt-6 pt-6 border-t border-white/[0.08]"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/[0.08]" />
        <span className="text-xs text-gray-500 font-medium uppercase tracking-wider px-2 flex items-center gap-1.5">
          <LogIn className="w-3 h-3" />
          Already have an account?
        </span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/[0.08]" />
      </div>
      <Link href="/login">
        <button className="w-full h-11 rounded-xl bg-brand-primary/20 border border-brand-primary/30 text-brand-primary hover:bg-brand-primary/30 transition-colors font-semibold text-sm flex items-center justify-center gap-2">
          <LogIn className="w-4 h-4" />
          Sign in to Dashboard
        </button>
      </Link>
    </motion.div>
  );
}

// ============================================================
// HACKATHON JUDGE GUIDE — sticky banner + quick-nav for judges
// ============================================================
function HackathonJudgeGuide() {
  const [isExpanded, setIsExpanded] = useState(false);

  const CONTRACTS = [
    {
      name: 'ReputationRegistry',
      address: '0x9a0f05d971bb5bb908fc45ce51e948712265e518',
      desc: 'On-chain reputation scores (0-1000) gating staking and token creation',
      icon: ShieldCheck,
    },
    {
      name: 'CreatorTokenFactory',
      address: '0xd8d942262792dd1d794b52137f93359ef530dcd9',
      desc: 'Deploys one ERC-20 per creator with 1M supply',
      icon: Coins,
    },
    {
      name: 'FanStaking',
      address: '0xfca2572ed381cfc8d7cca205f9da0b4e2b7d6d89',
      desc: 'Stake creator tokens for AVAX rewards with social multiplier',
      icon: Trophy,
    },
    {
      name: 'FandomlyBadge (ERC-1155)',
      address: '0x4ad8bbb28fba6beaee346e61ac03d18903331356',
      desc: 'Soulbound achievement badges with batch minting',
      icon: Award,
    },
    {
      name: 'FandomlyNFT (ERC-721)',
      address: '0x1cfb20643302b88c1291a950f263b5c17d8f7aa6',
      desc: 'Platform NFT collections for reward redemptions',
      icon: Sparkles,
    },
    {
      name: 'CreatorCollectionFactory',
      address: '0xc0e2fc4eac83b421856527992de427a01aeeea7b',
      desc: 'Per-creator ERC-721 contracts with royalties',
      icon: Users,
    },
  ];

  return (
    <div className="relative z-50">
      {/* Collapsed banner */}
      <div className="bg-gradient-to-r from-[#E84142]/90 to-[#E84142]/70 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">
                Avalanche Build Games 2025 -- Judge Guide
              </p>
              <p className="text-white/70 text-xs hidden sm:block">
                6 contracts live on Fuji C-Chain (43113) -- Click to explore
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://43113.testnet.snowtrace.io/address/0x95A6bEb968633D1440e89F462a133519808f8015"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Snowtrace
            </a>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition-colors"
            >
              {isExpanded ? 'Close' : 'View Contracts'}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden bg-[#0e0520]/95 backdrop-blur-xl border-b border-white/10"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {CONTRACTS.map((c) => (
                  <a
                    key={c.name}
                    href={`https://43113.testnet.snowtrace.io/address/${c.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-3 p-4 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:border-[#E84142]/40 hover:bg-white/[0.06] transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#E84142]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <c.icon className="w-4 h-4 text-[#E84142]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-semibold truncate group-hover:text-[#E84142] transition-colors">
                        {c.name}
                      </p>
                      <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{c.desc}</p>
                      <p className="text-gray-600 text-[10px] font-mono mt-1 truncate">
                        {c.address}
                      </p>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-gray-600 group-hover:text-[#E84142] flex-shrink-0 mt-1 transition-colors" />
                  </a>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-white/[0.06] flex flex-wrap items-center gap-4 text-xs text-gray-500">
                <span>
                  Chain: <span className="text-gray-400">Avalanche Fuji C-Chain (43113)</span>
                </span>
                <span>
                  Deployer: <span className="text-gray-400 font-mono">0x95A6...8015</span>
                </span>
                <span>
                  Native: <span className="text-gray-400">AVAX</span>
                </span>
                <span>
                  Compiler: <span className="text-gray-400">Solidity 0.8.20</span>
                </span>
                <Link
                  href="/login"
                  className="ml-auto text-[#E84142] hover:text-[#E84142]/80 font-semibold transition-colors flex items-center gap-1"
                >
                  <LogIn className="w-3 h-3" />
                  Sign in to test the app
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Kick doesn't have an official simple-icons entry, so we use a custom SVG
function KickIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M1.333 0h21.334C23.403 0 24 .597 24 1.333v21.334c0 .736-.597 1.333-1.333 1.333H1.333C.597 24 0 23.403 0 22.667V1.333C0 .597.597 0 1.333 0zm4.89 5.14h3.428v4.27l1.26-1.552h3.864l-3.052 3.473L15.077 18.86h-3.972l-2.454-4.742v4.742H5.223V5.14h1z" />
    </svg>
  );
}

// ============================================================
// SUCCESS MODAL (enhanced with Points, confetti, differentiated copy)
// ============================================================
function AnimatedPointsCounter() {
  const count = useMotionValue(0);
  const [displayValue, setDisplayValue] = useState('0');

  useEffect(() => {
    const controls = animate(count, 1000, {
      duration: 1.2,
      ease: 'easeOut',
    });
    const unsubscribe = count.on('change', (v) => setDisplayValue(Math.round(v).toLocaleString()));
    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [count]);

  return <motion.span>{displayValue}</motion.span>;
}

function SuccessModalContent({
  successMessage,
  isAlreadyRegistered,
  onClose,
}: {
  successMessage: string;
  isAlreadyRegistered: boolean;
  onClose: () => void;
}) {
  const confettiColors = ['#e10698', '#14feee', '#8B5CF6', '#F59E0B', '#10B981', '#3B82F6'];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.85, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative z-10 w-full max-w-md bg-[#1a1a2e] border border-white/10 rounded-3xl p-8 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Confetti particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-3xl">
          {confettiColors.map((color, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
              animate={{
                scale: 1,
                x: (i % 2 === 0 ? 1 : -1) * (40 + i * 15),
                y: (i % 3 === 0 ? -1 : 1) * (30 + (i % 2) * 20),
                opacity: 0,
              }}
              transition={{ delay: 0.3 + i * 0.08, duration: 0.8, ease: 'easeOut' }}
              className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 0.1 }}
          className="mx-auto w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-6"
        >
          <PartyPopper className="w-10 h-10 text-emerald-400" />
        </motion.div>

        <h3 className="text-2xl font-bold text-white mb-2 font-display">
          You&apos;re on the list!
        </h3>
        <p className="text-gray-300 mb-2">{successMessage}</p>

        {isAlreadyRegistered ? (
          <p className="text-sm text-gray-500 mb-6">
            Thanks for your interest — we&apos;ll be in touch!
          </p>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mb-4 px-4 py-3 rounded-2xl bg-gradient-to-r from-[#e10698]/20 to-[#14feee]/20 border border-[#e10698]/30"
            >
              <p className="text-[#14feee] font-bold text-lg">
                <AnimatedPointsCounter /> Fandomly Points
              </p>
              <p className="text-gray-400 text-xs mt-0.5">
                Will be credited when you sign up with this email
              </p>
            </motion.div>
            <ul className="text-left text-sm text-gray-400 mb-6 space-y-1.5 max-w-xs mx-auto">
              <li className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#14feee] flex-shrink-0" />
                Creator monthly fee credits
              </li>
              <li className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-[#e10698] flex-shrink-0" />
                Fandomly swag
              </li>
            </ul>
          </>
        )}

        {!isAlreadyRegistered && (
          <p className="text-sm text-gray-500 mb-6">
            Check your inbox for updates. We can&apos;t wait to have you!
          </p>
        )}

        <motion.button
          onClick={onClose}
          className="px-8 py-3 bg-emerald-500 text-white rounded-2xl font-semibold hover:bg-emerald-600 transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Check className="w-4 h-4 inline mr-2" />
          Awesome!
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// INLINE BETA SIGNUP (kept self-contained for the landing page)
// ============================================================
function LandingSignup({ variant = 'hero' }: { variant?: 'hero' | 'bottom' }) {
  const [email, setEmail] = useState('');
  const [userType, setUserType] = useState<'creator' | 'fan'>('creator');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setStatus('error');
      setMessage('Please enter a valid email address');
      return;
    }

    // Client-side duplicate check (localStorage fallback for prod landing page)
    const STORAGE_KEY = 'fandomly_beta_signups';
    const storedEmails: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const normalizedEmail = email.toLowerCase().trim();
    const isLocalDuplicate = storedEmails.includes(normalizedEmail);

    setStatus('loading');
    try {
      const response = await fetch('/api/beta-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          userType,
          source: 'landing_page',
          metadata: {
            referrer: document.referrer || undefined,
            utmSource: new URLSearchParams(window.location.search).get('utm_source') || undefined,
            utmMedium: new URLSearchParams(window.location.search).get('utm_medium') || undefined,
            utmCampaign:
              new URLSearchParams(window.location.search).get('utm_campaign') || undefined,
          },
        }),
      });
      const data = await response.json();
      if (data.success) {
        // Persist in localStorage so we can detect duplicates even if API is down
        if (!storedEmails.includes(normalizedEmail)) {
          storedEmails.push(normalizedEmail);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(storedEmails));
        }
        setStatus('idle');
        setSuccessMessage(data.message);
        setIsAlreadyRegistered(!!data.alreadyRegistered || isLocalDuplicate);
        setShowSuccessModal(true);
        setEmail('');
      } else {
        setStatus('error');
        const err = data.error;
        setMessage(typeof err === 'string' ? err : 'Something went wrong');
      }
    } catch {
      // API unreachable — still show the success modal with localStorage tracking.
      // This ensures the 1,000 point modal always appears even in landing-only mode
      // where the backend may not be running.
      if (!storedEmails.includes(normalizedEmail)) {
        storedEmails.push(normalizedEmail);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storedEmails));
      }
      setStatus('idle');
      setSuccessMessage(
        isLocalDuplicate
          ? "You're already on the list! We'll be in touch soon."
          : "Welcome to the beta! We'll notify you when access is available."
      );
      setIsAlreadyRegistered(isLocalDuplicate);
      setShowSuccessModal(true);
      setEmail('');
    }
  };

  return (
    <>
      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <SuccessModalContent
            successMessage={successMessage}
            isAlreadyRegistered={isAlreadyRegistered}
            onClose={() => setShowSuccessModal(false)}
          />
        )}
      </AnimatePresence>

      <div className={variant === 'hero' ? 'w-full max-w-2xl' : 'w-full max-w-xl mx-auto'}>
        {variant === 'hero' && (
          <div className="flex gap-3 mb-5">
            {(['creator', 'fan'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setUserType(type)}
                className={`px-5 py-2 rounded-full text-sm font-medium tracking-wide transition-all duration-300 ${
                  userType === type
                    ? type === 'creator'
                      ? 'bg-[#e10698] text-white shadow-lg shadow-[#e10698]/20'
                      : 'bg-[#14feee] text-[#0b0b0f] shadow-lg shadow-[#14feee]/20'
                    : 'bg-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.1]'
                }`}
              >
                {type === 'creator' ? "I'm a Creator" : "I'm a Fan"}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status === 'error') setStatus('idle');
              }}
              placeholder="Enter your email for early access"
              className="w-full pl-12 pr-4 py-4 bg-white/[0.06] border border-white/[0.08] rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-[#e10698]/50 focus:bg-white/[0.08] transition-all text-[15px]"
              disabled={status === 'loading'}
            />
          </div>
          <motion.button
            type="submit"
            disabled={status === 'loading'}
            className="group px-7 py-4 bg-gradient-to-r from-[#e10698] to-[#14feee] text-white rounded-2xl font-semibold hover:from-[#c90589] hover:to-[#00e8d5] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-[15px] whitespace-nowrap"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {status === 'loading' ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Join the Beta
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </motion.button>
        </form>

        {status === 'error' && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 text-sm text-red-400"
          >
            {message}
          </motion.p>
        )}

        {variant === 'hero' && (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-gray-400">
              <span className="text-gray-500">💡 Tip:</span> Use the email from your social account
              (Google, X, Facebook, TikTok, etc.) to ensure your 1,000 welcome points are
              automatically credited when you join.
            </p>
            <p className="text-xs text-gray-600">
              Join 500+ creators on the waitlist. No spam, ever.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

// ============================================================
// PLATFORM DATA
// ============================================================
const PLATFORMS = [
  { name: 'Instagram', icon: SiInstagram, color: '#E4405F' },
  { name: 'TikTok', icon: SiTiktok, color: '#ff0050' },
  { name: 'X / Twitter', icon: SiX, color: '#ffffff' },
  { name: 'YouTube', icon: SiYoutube, color: '#FF0000' },
  { name: 'Spotify', icon: SiSpotify, color: '#1DB954' },
  { name: 'Discord', icon: SiDiscord, color: '#5865F2' },
  { name: 'Twitch', icon: SiTwitch, color: '#9146FF' },
  { name: 'Facebook', icon: SiFacebook, color: '#1877F2' },
  { name: 'Kick', icon: KickIcon, color: '#53FC18' },
  { name: 'Patreon', icon: SiPatreon, color: '#FF424D' },
];

// ============================================================
// ANIMATED COUNTER
// ============================================================
function AnimatedNumber({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          let start = 0;
          const duration = 1500;
          const startTime = performance.now();
          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            start = Math.floor(eased * target);
            setCount(start);
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5, rootMargin: '-50px' }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, hasAnimated]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function Home() {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.8], [1, 0.95]);

  return (
    <div className="min-h-screen bg-[#0a0118] overflow-x-hidden selection:bg-[#e10698]/30 selection:text-white">
      {/* ===== HACKATHON JUDGE GUIDE BANNER ===== */}
      <HackathonJudgeGuide />

      {/* ===== LANDING PAGE NAV BAR ===== */}
      <nav className="sticky top-0 z-40 bg-[#0a0118]/80 backdrop-blur-lg border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center">
            <img src="/fandomly2.png" alt="Fandomly" className="h-14 w-auto" />
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <a
              href="#features"
              className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
            >
              How It Works
            </a>
            <Link
              href="/find-creators"
              className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
            >
              Explore
            </Link>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login">
              <button className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors">
                Sign In
              </button>
            </Link>
            <Link href="/login">
              <button className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-[#e10698] to-[#14feee] rounded-xl hover:opacity-90 transition-opacity">
                Get Started
              </button>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-white p-2"
            onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            aria-label={isMobileNavOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileNavOpen}
          >
            {isMobileNavOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {isMobileNavOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden overflow-hidden border-t border-white/[0.05]"
            >
              <div className="px-4 py-4 space-y-1 bg-[#0a0118]/95 backdrop-blur-xl">
                <a
                  href="#features"
                  onClick={() => setIsMobileNavOpen(false)}
                  className="block px-3 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors"
                >
                  Features
                </a>
                <a
                  href="#how-it-works"
                  onClick={() => setIsMobileNavOpen(false)}
                  className="block px-3 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors"
                >
                  How It Works
                </a>
                <Link
                  href="/find-creators"
                  onClick={() => setIsMobileNavOpen(false)}
                  className="block px-3 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors"
                >
                  Explore
                </Link>
                <div className="pt-3 flex flex-col gap-2">
                  <Link href="/login" onClick={() => setIsMobileNavOpen(false)}>
                    <button className="w-full px-4 py-2.5 text-sm font-medium text-gray-300 hover:text-white border border-white/10 rounded-xl transition-colors">
                      Sign In
                    </button>
                  </Link>
                  <Link href="/login" onClick={() => setIsMobileNavOpen(false)}>
                    <button className="w-full px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-[#e10698] to-[#14feee] rounded-xl hover:opacity-90 transition-opacity">
                      Get Started
                    </button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ===== HERO ===== */}
      <section
        ref={heroRef}
        className="relative min-h-[100vh] flex flex-col justify-center px-6 md:px-12 lg:px-20 pt-24 pb-20 overflow-hidden"
      >
        <SectionGeometry variant="hero" />
        {/* Ambient background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-[#e10698]/[0.04] blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#14feee]/[0.03] blur-[100px]" />
          {/* Grain overlay */}
          <div
            className="absolute inset-0 opacity-[0.015]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'repeat',
            }}
          />
        </div>

        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="relative z-10 max-w-7xl mx-auto w-full grid lg:grid-cols-[1fr,1fr] gap-12 lg:gap-16 items-center"
        >
          {/* Left column - text content */}
          <div>
            {/* Beta badge */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2.5 px-4 py-2 bg-[#e10698]/10 border border-[#e10698]/20 rounded-full mb-8"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#e10698] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#e10698]" />
              </span>
              <span className="text-sm text-[#e10698] font-medium tracking-wide">
                Beta Access Open
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-[clamp(2.5rem,5.5vw,4.5rem)] font-extrabold leading-[1.05] tracking-tight mb-6 font-display"
            >
              <span className="text-white">Elevate Your Brand.</span>
              <br />
              <span className="bg-gradient-to-r from-[#e10698] via-[#ff47b0] to-[#e10698] bg-clip-text text-transparent">
                Reward Your Community.
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="text-lg md:text-xl text-gray-400 mb-10 max-w-xl leading-relaxed"
            >
              Launch your own loyalty program in minutes. Verify social engagement automatically.
              Reward fans with points, NFTs, and exclusive perks across 10 platforms.
            </motion.p>

            {/* Signup form */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <LandingSignup variant="hero" />
              <SignInPanel />
            </motion.div>
          </div>

          {/* Right column - Dashboard mockup */}
          <motion.div
            initial={{ opacity: 0, x: 40, rotateY: -8 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
            className="hidden lg:block relative"
          >
            {/* Floating glow behind card */}
            <div className="absolute -inset-8 bg-gradient-to-br from-[#e10698]/20 via-transparent to-[#14feee]/10 rounded-[40px] blur-[60px] opacity-40" />

            {/* Main dashboard card */}
            <div className="relative bg-[#111116]/80 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-6 shadow-2xl">
              {/* Top bar */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#e10698] to-[#ff47b0] flex items-center justify-center">
                    <span className="text-white font-extrabold text-xs">F</span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">Creator Dashboard</p>
                    <p className="text-gray-500 text-xs">@alexrivera</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#14feee]/60" />
                  <span className="text-[#14feee] text-xs font-medium">Live</span>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: 'Total Fans', value: '2,847', change: '+12%' },
                  { label: 'Engagement', value: '89.2%', change: '+5.4%' },
                  { label: 'Points Given', value: '45.2K', change: '+28%' },
                ].map((stat, i) => (
                  <div
                    key={i}
                    className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3"
                  >
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                      {stat.label}
                    </p>
                    <p className="text-white font-bold text-lg leading-tight">{stat.value}</p>
                    <p className="text-[#14feee] text-[10px] font-semibold mt-0.5">{stat.change}</p>
                  </div>
                ))}
              </div>

              {/* Activity feed */}
              <div className="space-y-2.5 mb-5">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                  Recent Activity
                </p>
                {[
                  {
                    platform: 'Instagram',
                    action: 'Liked post',
                    user: 'fan_sarah',
                    points: '+15',
                    color: '#E4405F',
                    icon: SiInstagram,
                  },
                  {
                    platform: 'YouTube',
                    action: 'Subscribed',
                    user: 'musiclover99',
                    points: '+50',
                    color: '#FF0000',
                    icon: SiYoutube,
                  },
                  {
                    platform: 'TikTok',
                    action: 'Shared video',
                    user: 'dance_mike',
                    points: '+25',
                    color: '#ffffff',
                    icon: SiTiktok,
                  },
                  {
                    platform: 'X',
                    action: 'Retweeted',
                    user: 'crypto_jen',
                    points: '+20',
                    color: '#ffffff',
                    icon: SiX,
                  },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.15 }}
                    className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.04] rounded-xl px-3 py-2.5"
                  >
                    <item.icon
                      className="w-3.5 h-3.5 flex-shrink-0"
                      style={{ color: item.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate">{item.user}</p>
                      <p className="text-gray-500 text-[10px]">{item.action}</p>
                    </div>
                    <span className="text-[#14feee] text-xs font-bold flex-shrink-0">
                      {item.points}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Connected platforms bar */}
              <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.04] rounded-xl px-4 py-3">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                  Connected
                </span>
                <div className="flex items-center gap-2">
                  {[
                    { icon: SiInstagram, color: '#E4405F' },
                    { icon: SiYoutube, color: '#FF0000' },
                    { icon: SiTiktok, color: '#69C9D0' },
                    { icon: SiX, color: '#fff' },
                    { icon: SiSpotify, color: '#1DB954' },
                    { icon: SiDiscord, color: '#5865F2' },
                  ].map((p, i) => (
                    <p.icon
                      key={i}
                      className="w-3.5 h-3.5 opacity-60 hover:opacity-100 transition-opacity"
                      style={{ color: p.color }}
                    />
                  ))}
                  <span className="text-gray-600 text-[10px] ml-1">+4</span>
                </div>
              </div>
            </div>

            {/* Floating notification card - top right */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 1.2, duration: 0.5 }}
              className="absolute -top-4 -right-4 bg-[#111116] border border-white/[0.08] rounded-2xl px-4 py-3 shadow-xl"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[#e10698]/20 flex items-center justify-center">
                  <PartyPopper className="w-3.5 h-3.5 text-[#e10698]" />
                </div>
                <div>
                  <p className="text-white text-xs font-semibold">New milestone!</p>
                  <p className="text-gray-500 text-[10px]">1,000 fans reached</p>
                </div>
              </div>
            </motion.div>

            {/* Floating reward card - bottom left */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 1.5, duration: 0.5 }}
              className="absolute -bottom-3 -left-6 bg-[#111116] border border-white/[0.08] rounded-2xl px-4 py-3 shadow-xl"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[#14feee]/15 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-[#14feee]" />
                </div>
                <div>
                  <p className="text-white text-xs font-semibold">+250 points</p>
                  <p className="text-gray-500 text-[10px]">Reward claimed</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-6 h-10 border-2 border-white/20 rounded-full flex items-start justify-center p-1.5"
          >
            <motion.div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
          </motion.div>
        </motion.div>
      </section>

      {/* ===== SOCIAL PROOF BAR ===== */}
      <section
        className="relative z-10 border-y border-white/[0.04]"
        style={{ backgroundColor: 'rgba(255,255,255,0.008)' }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {[
              { value: 500, suffix: '+', label: 'Creators on waitlist' },
              { value: 10, suffix: '', label: 'Platforms integrated' },
              { value: 35, suffix: '+', label: 'Task templates' },
              { value: 3, suffix: '', label: 'Verification tiers' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: i * 0.07 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-extrabold text-white font-display mb-1">
                  <AnimatedNumber target={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-sm text-gray-500 tracking-wide">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PLATFORMS ===== */}
      <section className="relative z-10 py-24 md:py-32 px-6 md:px-12">
        <SectionGeometry variant="platforms" />
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="mb-16"
          >
            <p className="text-[#e10698] text-sm font-semibold tracking-widest uppercase mb-4">
              Integrations
            </p>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white font-display leading-tight mb-4">
              One dashboard.
              <br />
              Ten platforms.
            </h2>
            <p className="text-gray-400 max-w-xl text-lg">
              Verify fan engagement across every major social and creator platform. Every follow,
              like, and share -- confirmed automatically.
            </p>
          </motion.div>

          {/* Platform pills */}
          <div className="flex flex-wrap gap-3 mb-16">
            {PLATFORMS.map((platform, i) => (
              <motion.div
                key={platform.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: i * 0.04 }}
                whileHover={{ scale: 1.05, y: -2 }}
                className="group flex items-center gap-3 px-5 py-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl transition-all duration-300 cursor-default"
              >
                <platform.icon
                  className="w-5 h-5 transition-all duration-300 opacity-60 group-hover:opacity-100"
                  style={{ color: platform.color }}
                />
                <span className="text-sm text-gray-400 group-hover:text-white transition-colors font-medium">
                  {platform.name}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Feature trio */}
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                num: '01',
                title: 'Instant Verification',
                desc: 'Every follow, like, and share is verified via API. No screenshots. No honor system.',
                icon: 'bolt',
                accent: '#14feee',
                iconBg: 'bg-[#14feee]/10',
                topBorder: 'border-t-2 border-[#14feee]/40',
                cardHover: 'hover:border-[#14feee]/30',
                numColor: 'text-[#14feee]',
              },
              {
                num: '02',
                title: 'Unified Analytics',
                desc: 'Track engagement, growth, and ROI across all platforms from a single dashboard.',
                icon: 'chart',
                accent: '#e10698',
                iconBg: 'bg-[#e10698]/10',
                topBorder: 'border-t-2 border-[#e10698]/40',
                cardHover: 'hover:border-[#e10698]/30',
                numColor: 'text-[#e10698]',
              },
              {
                num: '03',
                title: 'Smart Campaigns',
                desc: 'Build cross-platform campaigns that reward fans for engaging where it matters most.',
                icon: 'spark',
                accent: '#8B5CF6',
                iconBg: 'bg-[#8B5CF6]/10',
                topBorder: 'border-t-2 border-[#8B5CF6]/40',
                cardHover: 'hover:border-[#8B5CF6]/30',
                numColor: 'text-[#8B5CF6]',
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: i * 0.07 }}
                className={`group p-7 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.05] ${feature.cardHover} ${feature.topBorder} rounded-3xl transition-all duration-500`}
              >
                <div className="flex items-center justify-between mb-5">
                  <div
                    className={`w-10 h-10 rounded-xl ${feature.iconBg} flex items-center justify-center`}
                  >
                    {feature.icon === 'bolt' && (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke={feature.accent}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                        />
                      </svg>
                    )}
                    {feature.icon === 'chart' && (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke={feature.accent}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                        />
                      </svg>
                    )}
                    {feature.icon === 'spark' && (
                      <Sparkles className="w-5 h-5" style={{ color: feature.accent }} />
                    )}
                  </div>
                  <span
                    className={`text-xs font-bold tracking-widest ${feature.numColor} opacity-60`}
                  >
                    {feature.num}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section
        id="how-it-works"
        className="relative z-10 py-24 md:py-32 px-6 md:px-12"
        style={{ backgroundColor: 'rgba(255,255,255,0.008)' }}
      >
        <SectionGeometry variant="howItWorks" />
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="text-center mb-20"
          >
            <p className="text-[#14feee] text-sm font-semibold tracking-widest uppercase mb-4">
              How it works
            </p>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white font-display">
              From zero to loyalty program
              <br className="hidden md:block" /> in five minutes
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-5 gap-4 md:gap-2">
            {[
              {
                step: '01',
                title: 'Sign up',
                desc: 'Create your account and connect your social profiles.',
                pink: true,
              },
              {
                step: '02',
                title: 'Design',
                desc: 'Pick from 35+ templates or build custom tasks for fans.',
                pink: false,
              },
              {
                step: '03',
                title: 'Launch',
                desc: 'Share your program link. Fans join in seconds.',
                pink: true,
              },
              {
                step: '04',
                title: 'Reward',
                desc: 'Points, NFTs, merch, raffle entries -- all automated.',
                pink: false,
              },
              {
                step: '05',
                title: 'Grow',
                desc: 'Track every metric and scale your community.',
                pink: true,
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: i * 0.06 }}
                className="relative group"
              >
                <div
                  className={`p-6 md:p-5 rounded-3xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] transition-all duration-500 h-full border-l-2 ${item.pink ? 'border-l-[#e10698]/50 hover:border-l-[#e10698]/80' : 'border-l-[#14feee]/50 hover:border-l-[#14feee]/80'}`}
                >
                  {/* Circular step badge */}
                  <div
                    className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-extrabold tracking-widest mb-4 border ${
                      item.pink
                        ? 'bg-[#e10698]/15 text-[#e10698] border-[#e10698]/30'
                        : 'bg-[#14feee]/15 text-[#14feee] border-[#14feee]/30'
                    }`}
                  >
                    {item.step}
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2 font-display">{item.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
                {i < 4 && (
                  <div className="hidden md:flex absolute top-1/2 -right-3.5 -translate-y-1/2 z-10">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M2 7 L12 7 M8 3 L12 7 L8 11"
                        stroke="url(#chevron-grad)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <defs>
                        <linearGradient id="chevron-grad" x1="0" y1="0" x2="14" y2="0">
                          <stop offset="0%" stopColor="#e10698" stopOpacity="0.5" />
                          <stop offset="100%" stopColor="#14feee" stopOpacity="0.5" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRODUCT SHOWCASE ===== */}
      <section className="relative z-10 py-24 md:py-32 px-6 md:px-12 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="mb-16"
          >
            <p className="text-[#e10698] text-sm font-semibold tracking-widest uppercase mb-4">
              The Platform
            </p>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white font-display leading-tight mb-4">
              Two sides.
              <br />
              One platform.
            </h2>
            <p className="text-gray-400 max-w-xl text-lg">
              Powerful tools for creators. A rewarding experience for fans.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Creator Dashboard Preview */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-3xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.06] p-6 md:p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="px-3 py-1 bg-[#e10698]/15 text-[#e10698] rounded-full text-xs font-semibold tracking-wide">
                  CREATOR VIEW
                </div>
                <div className="flex gap-1.5 ml-auto">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 mb-6">
                {[
                  { label: 'Fans', value: '2,847', change: '+12%' },
                  { label: 'Revenue', value: '$7.4k', change: '+8%' },
                  { label: 'Tasks', value: '1,247', change: '+23%' },
                  { label: 'Rewards', value: '89', change: '+5%' },
                ].map((stat, i) => (
                  <div key={i} className="p-3 bg-white/[0.03] rounded-xl">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">
                      {stat.label}
                    </div>
                    <div className="text-base font-bold text-white">{stat.value}</div>
                    <div className="text-[10px] text-emerald-400">{stat.change}</div>
                  </div>
                ))}
              </div>

              <div className="h-28 bg-white/[0.02] rounded-xl flex items-end justify-around p-4 gap-1">
                {[35, 55, 42, 70, 65, 80, 58, 90, 72, 85, 95, 78].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-gradient-to-t from-[#e10698]/30 to-[#e10698]/80 rounded-t transition-all duration-500"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </motion.div>

            {/* Fan Dashboard Preview */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
              className="rounded-3xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.06] p-6 md:p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="px-3 py-1 bg-[#14feee]/15 text-[#14feee] rounded-full text-xs font-semibold tracking-wide">
                  FAN VIEW
                </div>
                <div className="flex gap-1.5 ml-auto">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                </div>
              </div>

              {/* Points card */}
              <div className="p-5 bg-gradient-to-br from-[#e10698]/10 via-transparent to-[#14feee]/10 rounded-2xl border border-white/[0.05] mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-400 mb-1 tracking-wide">Your Points</div>
                    <div className="text-3xl font-extrabold text-white font-display">1,500</div>
                    <div className="text-xs text-emerald-400 mt-0.5">Level 4 -- Gold Fan</div>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-[#14feee]/10 flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-[#14feee]" />
                  </div>
                </div>
              </div>

              {/* Task list */}
              <div className="space-y-2.5">
                {[
                  { task: 'Follow on Instagram', points: 150, done: true },
                  { task: 'Subscribe on YouTube', points: 250, done: true },
                  { task: 'Share TikTok post', points: 100, done: false },
                  { task: 'Join Discord server', points: 200, done: false },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-white/[0.03] rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center ${
                          item.done ? 'bg-emerald-500/20' : 'border border-white/10'
                        }`}
                      >
                        {item.done && <Check className="w-3 h-3 text-emerald-400" />}
                      </div>
                      <span
                        className={`text-sm ${item.done ? 'text-gray-500 line-through' : 'text-white'}`}
                      >
                        {item.task}
                      </span>
                    </div>
                    <span className="text-xs text-[#14feee] font-semibold">+{item.points}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== WHO IT'S FOR ===== */}
      <section
        className="relative z-10 py-24 md:py-32 px-6 md:px-12"
        style={{ backgroundColor: 'rgba(255,255,255,0.008)' }}
      >
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          >
            <div className="text-center mb-16">
              <p className="text-[#14feee] text-sm font-semibold tracking-widest uppercase mb-4">
                Built for creators
              </p>
              <h2 className="text-3xl md:text-5xl font-extrabold text-white font-display mb-4">
                Your audience. Your rules.
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto text-lg">
                Whether you have 1,000 followers or 10 million, Fandomly gives you the tools to turn
                passive audiences into active communities.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {[
                {
                  title: 'NIL Athletes',
                  subtitle: 'Monetize your name, image & likeness',
                  desc: 'Turn your fanbase into a loyalty program. Reward fans for wearing your merch, attending games, and engaging with sponsors.',
                  tags: ['Pro Athletes', 'College Athletes', 'Olympic Athletes'],
                  accent: '#14feee',
                  gradient: 'from-[#14feee]/[0.06] to-transparent',
                },
                {
                  title: 'Content Creators',
                  subtitle: 'Reward every interaction',
                  desc: 'Your followers already engage with your content. Now you can track it, reward it, and grow faster because of it.',
                  tags: ['Influencers', 'Video Creators', 'Podcasters'],
                  accent: '#e10698',
                  gradient: 'from-[#e10698]/[0.06] to-transparent',
                },
                {
                  title: 'Musicians & Artists',
                  subtitle: "Streaming pays pennies. Your superfans don't.",
                  desc: 'Identify your most dedicated listeners. Reward streams, shares, and playlist adds with exclusive drops and NFTs.',
                  tags: ['Independent Artists', 'Bands', 'DJs & Producers'],
                  accent: '#8B5CF6',
                  gradient: 'from-[#8B5CF6]/[0.06] to-transparent',
                },
                {
                  title: 'Brands & Agencies',
                  subtitle: 'White-label everything',
                  desc: 'Your brand. Your domain. Your auth. Multi-tenant SaaS that scales with your portfolio of creators.',
                  tags: ['Marketing Agencies', 'Sports Teams', 'Enterprises'],
                  accent: '#10B981',
                  gradient: 'from-[#10B981]/[0.06] to-transparent',
                },
              ].map((card, i) => (
                <div
                  key={i}
                  className={`group p-7 md:p-8 rounded-3xl bg-gradient-to-br ${card.gradient} border border-white/[0.05] hover:border-white/[0.1] transition-all duration-500`}
                >
                  <div
                    className="text-xs font-bold tracking-widest uppercase mb-3"
                    style={{ color: card.accent }}
                  >
                    {card.subtitle}
                  </div>
                  <h3 className="text-2xl font-extrabold text-white font-display mb-3">
                    {card.title}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-5">{card.desc}</p>
                  <div className="flex flex-wrap gap-2">
                    {card.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 rounded-full text-xs font-medium border"
                        style={{
                          color: card.accent,
                          borderColor: `${card.accent}30`,
                          backgroundColor: `${card.accent}08`,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== FEATURES GRID ===== */}
      <section id="features" className="relative z-10 py-24 md:py-32 px-6 md:px-12">
        <SectionGeometry variant="features" />
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          >
            <div className="text-center mb-16">
              <p className="text-[#e10698] text-sm font-semibold tracking-widest uppercase mb-4">
                Features
              </p>
              <h2 className="text-3xl md:text-5xl font-extrabold text-white font-display mb-4">
                Everything you need.
                <br className="hidden md:block" /> Nothing you don&apos;t.
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                {
                  title: 'Fraud Protection',
                  desc: 'Real-time verification prevents fake engagement and bot activity. Three verification tiers for every trust level.',
                  Icon: ShieldCheck,
                  accent: '#14feee',
                  iconBg: 'bg-[#14feee]/10',
                  hoverBorder: 'hover:border-[#14feee]/25',
                  hoverGlow: 'group-hover:shadow-[0_0_20px_rgba(20,254,238,0.12)]',
                },
                {
                  title: 'Flexible Rewards',
                  desc: 'Points, NFTs, raffle entries, physical merch, exclusive access -- all in one system.',
                  Icon: Gift,
                  accent: '#e10698',
                  iconBg: 'bg-[#e10698]/10',
                  hoverBorder: 'hover:border-[#e10698]/25',
                  hoverGlow: 'group-hover:shadow-[0_0_20px_rgba(225,6,152,0.12)]',
                },
                {
                  title: 'Fan Tiers',
                  desc: 'Automatically segment fans by engagement level. Reward your most loyal supporters differently.',
                  Icon: Crown,
                  accent: '#F59E0B',
                  iconBg: 'bg-[#F59E0B]/10',
                  hoverBorder: 'hover:border-[#F59E0B]/25',
                  hoverGlow: 'group-hover:shadow-[0_0_20px_rgba(245,158,11,0.12)]',
                },
                {
                  title: 'Deep Analytics',
                  desc: 'Track engagement, conversion rates, and ROI across every platform and campaign in real-time.',
                  Icon: BarChart3,
                  accent: '#3B82F6',
                  iconBg: 'bg-[#3B82F6]/10',
                  hoverBorder: 'hover:border-[#3B82F6]/25',
                  hoverGlow: 'group-hover:shadow-[0_0_20px_rgba(59,130,246,0.12)]',
                },
                {
                  title: 'White-Label',
                  desc: 'Your brand, your domain, your colors. Remove every trace of Fandomly. Full multi-tenant SaaS.',
                  Icon: Palette,
                  accent: '#8B5CF6',
                  iconBg: 'bg-[#8B5CF6]/10',
                  hoverBorder: 'hover:border-[#8B5CF6]/25',
                  hoverGlow: 'group-hover:shadow-[0_0_20px_rgba(139,92,246,0.12)]',
                },
                {
                  title: 'No-Code Setup',
                  desc: 'Launch a complete loyalty program in 5 minutes. 35+ templates. Zero developers required.',
                  Icon: Zap,
                  accent: '#10B981',
                  iconBg: 'bg-[#10B981]/10',
                  hoverBorder: 'hover:border-[#10B981]/25',
                  hoverGlow: 'group-hover:shadow-[0_0_20px_rgba(16,185,129,0.12)]',
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  className={`group p-7 rounded-3xl bg-white/[0.02] border border-white/[0.05] ${feature.hoverBorder} ${feature.hoverGlow} transition-all duration-500`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl ${feature.iconBg} flex items-center justify-center mb-5`}
                  >
                    <feature.Icon className="w-5 h-5" style={{ color: feature.accent }} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="relative z-10 py-24 md:py-32 px-6 md:px-12">
        <SectionGeometry variant="cta" />
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-[2rem] bg-gradient-to-br from-[#e10698]/10 via-transparent to-[#14feee]/5 border border-white/[0.06] p-10 md:p-16 text-center relative overflow-hidden"
          >
            {/* Subtle glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[50%] h-32 bg-[#e10698]/10 blur-[80px] rounded-full" />

            <h2 className="text-3xl md:text-5xl font-extrabold text-white font-display mb-4 relative">
              Ready to build your community?
            </h2>
            <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto relative">
              Join the creators who are turning followers into loyal fans. Get early access to
              Fandomly.
            </p>

            <div className="relative">
              <LandingSignup variant="bottom" />
              <p className="text-sm text-gray-500 mt-4 max-w-xl mx-auto">
                <span className="text-gray-400">💡 Tip:</span> Use the email from your social
                account (Google, X, Facebook, TikTok, etc.) so your 1,000 welcome points are
                automatically credited.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-3 mt-10 relative">
              {['No-Code Setup', 'White-Label', '35+ Templates', '10 Platforms', 'NFT Rewards'].map(
                (badge) => (
                  <span
                    key={badge}
                    className="px-4 py-2 bg-white/[0.04] border border-white/[0.06] rounded-full text-xs text-gray-500 font-medium tracking-wide"
                  >
                    {badge}
                  </span>
                )
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== FOOTER (minimal) ===== */}
      <footer className="relative z-10 border-t border-white/[0.05] bg-[#0a0118]">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <Link href="/" className="flex-shrink-0">
              <img src="/fandomly2.png" alt="Fandomly" className="h-12 w-auto" />
            </Link>
            <div className="flex items-center gap-4">
              {[
                { icon: SiX, href: '#', label: 'X' },
                { icon: SiInstagram, href: '#', label: 'Instagram' },
                { icon: SiDiscord, href: '#', label: 'Discord' },
              ].map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] flex items-center justify-center text-gray-500 hover:text-white transition-all"
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
            <div className="flex items-center gap-4 text-sm">
              <Link
                href="/privacy-policy"
                className="text-gray-500 hover:text-white transition-colors"
              >
                Privacy Policy
              </Link>
              <span className="text-gray-600">·</span>
              <Link
                href="/terms-of-service"
                className="text-gray-500 hover:text-white transition-colors"
              >
                Terms of Service
              </Link>
              <span className="text-gray-600">·</span>
              <Link
                href="/data-deletion"
                className="text-gray-500 hover:text-white transition-colors"
              >
                Data Deletion
              </Link>
            </div>
            <p className="text-gray-600 text-sm">&copy; {new Date().getFullYear()} Fandomly, LLC</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
