import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Loader2, CheckCircle, Sparkles, PartyPopper, X } from "lucide-react";

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

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Success Modal Component
  const SuccessModal = () => (
    <AnimatePresence>
      {showSuccessModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={() => setShowSuccessModal(false)}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-md bg-gray-900 border border-white/10 rounded-2xl p-8 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowSuccessModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Success icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 15, stiffness: 200, delay: 0.1 }}
              className="mx-auto w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 15, stiffness: 200, delay: 0.25 }}
              >
                <PartyPopper className="w-10 h-10 text-emerald-400" />
              </motion.div>
            </motion.div>

            {/* Title */}
            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-bold text-white mb-2"
            >
              You're on the list!
            </motion.h3>

            {/* Message */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-gray-300 mb-2"
            >
              {successMessage}
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-sm text-gray-500 mb-6"
            >
              Check your inbox for updates. We can't wait to have you!
            </motion.p>

            {/* Confetti-like decorative elements */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex justify-center gap-1 mb-6"
            >
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, rotate: 0 }}
                  animate={{ scale: 1, rotate: 360 }}
                  transition={{ delay: 0.4 + i * 0.08, type: "spring", stiffness: 200 }}
                  className={`w-2 h-2 rounded-full ${
                    ["bg-emerald-400", "bg-[#e10698]", "bg-blue-400", "bg-yellow-400", "bg-purple-400"][i]
                  }`}
                />
              ))}
            </motion.div>

            {/* Close button */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              onClick={() => setShowSuccessModal(false)}
              className="px-8 py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <CheckCircle className="w-4 h-4 inline mr-2" />
              Awesome!
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Wrap handleSubmit to show modal on success
  const handleSubmitWithModal = async (e: React.FormEvent) => {
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
        setStatus("idle");
        setSuccessMessage(data.message);
        setShowSuccessModal(true);
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

  // Hero variant - larger, more prominent
  if (variant === "hero") {
    return (
      <>
        <SuccessModal />
        <div className={`w-full max-w-xl mx-auto ${className}`}>
          {showUserType && (
            <div className="flex justify-center gap-3 mb-4">
              <button
                type="button"
                onClick={() => setUserType("creator")}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                  userType === "creator"
                    ? "bg-[#e10698] text-white border-[#e10698] shadow-lg shadow-[#e10698]/25"
                    : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:border-white/20"
                }`}
              >
                I'm a Creator
              </button>
              <button
                type="button"
                onClick={() => setUserType("fan")}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                  userType === "fan"
                    ? "bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/25"
                    : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:border-white/20"
                }`}
              >
                I'm a Fan
              </button>
            </div>
          )}

          <form onSubmit={handleSubmitWithModal} className="relative">
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
      </>
    );
  }

  // Section variant - for bottom CTA
  if (variant === "section") {
    return (
      <>
        <SuccessModal />
        <div className={`w-full max-w-lg mx-auto ${className}`}>
          <form onSubmit={handleSubmitWithModal} className="flex flex-col sm:flex-row gap-3">
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
      </>
    );
  }

  // Inline variant - minimal
  return (
    <>
      <SuccessModal />
      <form onSubmit={handleSubmitWithModal} className={`flex gap-2 ${className}`}>
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
    </>
  );
}
