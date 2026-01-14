import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Loader2, CheckCircle, Sparkles } from "lucide-react";

interface BetaSignupFormProps {
  variant?: "hero" | "section" | "inline";
  showUserType?: boolean;
  className?: string;
}

export function BetaSignupForm({ 
  variant = "hero", 
  showUserType = true,
  className = "" 
}: BetaSignupFormProps) {
  const [email, setEmail] = useState("");
  const [userType, setUserType] = useState<"creator" | "fan">("creator");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      setStatus("error");
      setMessage("Please enter a valid email address");
      return;
    }

    setStatus("loading");

    try {
      const response = await fetch("/api/beta-signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          userType,
          source: "landing_page",
          metadata: {
            referrer: document.referrer || undefined,
            utmSource: new URLSearchParams(window.location.search).get("utm_source") || undefined,
            utmMedium: new URLSearchParams(window.location.search).get("utm_medium") || undefined,
            utmCampaign: new URLSearchParams(window.location.search).get("utm_campaign") || undefined,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus("success");
        setMessage(data.message);
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  };

  // Success state
  if (status === "success") {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl ${className}`}
      >
        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <p className="text-white font-medium">{message}</p>
          <p className="text-sm text-gray-400">Check your inbox for updates.</p>
        </div>
      </motion.div>
    );
  }

  // Hero variant - larger, more prominent
  if (variant === "hero") {
    return (
      <div className={`w-full max-w-xl mx-auto ${className}`}>
        {showUserType && (
          <div className="flex justify-center gap-2 mb-4">
            <button
              type="button"
              onClick={() => setUserType("creator")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                userType === "creator"
                  ? "bg-white text-gray-900"
                  : "bg-white/10 text-gray-300 hover:bg-white/15"
              }`}
            >
              I'm a Creator
            </button>
            <button
              type="button"
              onClick={() => setUserType("fan")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                userType === "fan"
                  ? "bg-white text-gray-900"
                  : "bg-white/10 text-gray-300 hover:bg-white/15"
              }`}
            >
              I'm a Fan
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status === "error") setStatus("idle");
                }}
                placeholder="Enter your email for early access"
                className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                disabled={status === "loading"}
              />
            </div>
            <motion.button
              type="submit"
              disabled={status === "loading"}
              className="px-8 py-4 bg-white text-gray-900 rounded-xl font-semibold hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {status === "loading" ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Join Beta
                </>
              )}
            </motion.button>
          </div>

          {status === "error" && (
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-sm text-red-400"
            >
              {message}
            </motion.p>
          )}
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Join 500+ creators and fans on the waitlist. No spam, ever.
        </p>
      </div>
    );
  }

  // Section variant - for bottom CTA
  if (variant === "section") {
    return (
      <div className={`w-full max-w-lg mx-auto ${className}`}>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status === "error") setStatus("idle");
              }}
              placeholder="your@email.com"
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-white/30 transition-all"
              disabled={status === "loading"}
            />
          </div>
          <motion.button
            type="submit"
            disabled={status === "loading"}
            className="px-6 py-3 bg-[#e10698] text-white rounded-xl font-semibold hover:bg-[#c10584] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {status === "loading" ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Get Early Access"
            )}
          </motion.button>
        </form>
        {status === "error" && (
          <p className="mt-2 text-sm text-red-400 text-center">{message}</p>
        )}
      </div>
    );
  }

  // Inline variant - minimal
  return (
    <form onSubmit={handleSubmit} className={`flex gap-2 ${className}`}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-white/30"
        disabled={status === "loading"}
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="px-4 py-2 bg-white text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
      >
        {status === "loading" ? "..." : "Join"}
      </button>
    </form>
  );
}
