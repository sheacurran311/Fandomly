/**
 * Shared Task Completion Modal Layout
 *
 * Provides consistent header, step indicator, reward badge, and footer
 * across all platform-specific task completion modals.
 */

import { ReactNode } from "react";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Trophy,
  Twitter,
  Instagram,
  Youtube,
  Facebook,
  Music,
  Video,
  Target,
  HelpCircle,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StepConfig {
  label: string;
}

interface TaskCompletionModalLayoutProps {
  /** Platform identifier for icon/color theming */
  platform: string;
  /** Custom icon override (otherwise uses platform default) */
  icon?: ReactNode;
  /** Task display name */
  taskName: string;
  /** Brief description */
  taskDescription: string;
  /** Points reward */
  pointsReward: number;
  /** Step definitions */
  steps?: StepConfig[];
  /** Active step index (0-based) */
  currentStep?: number;
  /** Modal body content */
  children: ReactNode;
  /** Cancel handler */
  onCancel?: () => void;
  /** Submit handler */
  onSubmit?: () => void;
  /** Primary button label */
  submitLabel?: string;
  /** Loading state */
  isSubmitting?: boolean;
  /** Whether submit is allowed */
  canSubmit?: boolean;
  /** Optional points label override */
  pointsLabel?: string;
  /** Hide footer (for modals that manage their own footer, like poll/quiz) */
  hideFooter?: boolean;
  /** Custom footer override */
  customFooter?: ReactNode;
}

/** Platform color config */
const platformColors: Record<string, { accent: string; bg: string; border: string; text: string }> = {
  twitter: { accent: "bg-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400" },
  x: { accent: "bg-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400" },
  instagram: { accent: "bg-pink-500", bg: "bg-pink-500/10", border: "border-pink-500/30", text: "text-pink-400" },
  youtube: { accent: "bg-red-500", bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400" },
  tiktok: { accent: "bg-cyan-400", bg: "bg-cyan-400/10", border: "border-cyan-400/30", text: "text-cyan-400" },
  facebook: { accent: "bg-blue-600", bg: "bg-blue-600/10", border: "border-blue-600/30", text: "text-blue-400" },
  spotify: { accent: "bg-green-500", bg: "bg-green-500/10", border: "border-green-500/30", text: "text-green-400" },
  twitch: { accent: "bg-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400" },
  discord: { accent: "bg-indigo-500", bg: "bg-indigo-500/10", border: "border-indigo-500/30", text: "text-indigo-400" },
  interactive: { accent: "bg-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400" },
  generic: { accent: "bg-brand-primary", bg: "bg-brand-primary/10", border: "border-brand-primary/30", text: "text-brand-primary" },
};

function getPlatformColors(platform: string) {
  return platformColors[platform.toLowerCase()] || platformColors.generic;
}

function getPlatformIcon(platform: string) {
  switch (platform.toLowerCase()) {
    case "twitter":
    case "x":
      return <Twitter className="h-5 w-5" />;
    case "instagram":
      return <Instagram className="h-5 w-5" />;
    case "youtube":
      return <Youtube className="h-5 w-5" />;
    case "facebook":
      return <Facebook className="h-5 w-5" />;
    case "spotify":
      return <Music className="h-5 w-5" />;
    case "tiktok":
      return <Video className="h-5 w-5" />;
    case "interactive":
      return <HelpCircle className="h-5 w-5" />;
    default:
      return <Target className="h-5 w-5" />;
  }
}

/** Step indicator dots with connecting lines */
function StepIndicator({
  steps,
  currentStep,
  colors,
}: {
  steps: StepConfig[];
  currentStep: number;
  colors: ReturnType<typeof getPlatformColors>;
}) {
  if (steps.length <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-1 py-3">
      {steps.map((step, i) => {
        const isActive = i === currentStep;
        const isComplete = i < currentStep;

        return (
          <div key={i} className="flex items-center gap-1">
            {/* Step circle */}
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all",
                  isComplete
                    ? "bg-green-500/20 border border-green-500/50 text-green-400"
                    : isActive
                      ? `${colors.bg} border ${colors.border} ${colors.text}`
                      : "bg-white/5 border border-white/10 text-white/30"
                )}
              >
                {isComplete ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium leading-none",
                  isActive ? "text-white/80" : "text-white/30"
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "w-8 h-px mb-4",
                  isComplete ? "bg-green-500/40" : "bg-white/10"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function TaskCompletionModalLayout({
  platform,
  icon,
  taskName,
  taskDescription,
  pointsReward,
  steps,
  currentStep = 0,
  children,
  onCancel = () => {},
  onSubmit = () => {},
  submitLabel = "Submit",
  isSubmitting = false,
  canSubmit = true,
  pointsLabel = "pts",
  hideFooter = false,
  customFooter,
}: TaskCompletionModalLayoutProps) {
  const colors = getPlatformColors(platform);

  return (
    <div className="flex flex-col">
      {/* Header with platform icon, title, and reward */}
      <DialogHeader className="pb-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                colors.bg,
                "border",
                colors.border
              )}
            >
              <span className={colors.text}>
                {icon || getPlatformIcon(platform)}
              </span>
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg font-semibold text-white truncate">
                {taskName}
              </DialogTitle>
              <DialogDescription className="text-sm text-white/50 line-clamp-1 mt-0.5">
                {taskDescription}
              </DialogDescription>
            </div>
          </div>

          {/* Reward Badge */}
          {pointsReward > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/25 shrink-0">
              <Trophy className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-sm font-bold text-yellow-400">
                +{pointsReward}
              </span>
              <span className="text-xs text-yellow-400/60">{pointsLabel}</span>
            </div>
          )}
        </div>
      </DialogHeader>

      {/* Step Indicator */}
      {steps && steps.length > 1 && (
        <div className="border-b border-white/5 mx-0">
          <StepIndicator steps={steps} currentStep={currentStep} colors={colors} />
        </div>
      )}

      {/* Content area */}
      <div className="space-y-4 py-5">
        {children}
      </div>

      {/* Footer */}
      {customFooter ? (
        customFooter
      ) : !hideFooter ? (
        <div className="flex gap-3 pt-2 border-t border-white/5">
          <Button
            variant="ghost"
            onClick={onCancel}
            className="flex-1 text-white/60 hover:text-white hover:bg-white/5"
          >
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!canSubmit || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** Reusable connection status banner for social platforms */
export function ConnectionStatusBanner({
  isConnected,
  isConnecting,
  onConnect,
  platformName,
  connectedUsername,
}: {
  isConnected: boolean;
  isConnecting?: boolean;
  onConnect?: () => void;
  platformName: string;
  connectedUsername?: string;
}) {
  if (isConnected) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
        <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
        <p className="text-sm text-green-400">
          Connected{connectedUsername ? <> as <span className="font-semibold">@{connectedUsername}</span></> : null}
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-yellow-500/8 border border-yellow-500/20">
      <div className="min-w-0">
        <p className="text-sm font-medium text-yellow-300">
          Connect {platformName}
        </p>
        <p className="text-xs text-yellow-300/60 mt-0.5">
          Enable automatic verification
        </p>
      </div>
      {onConnect && (
        <Button
          onClick={onConnect}
          disabled={isConnecting}
          size="sm"
          variant="outline"
          className="shrink-0 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 hover:text-yellow-300"
        >
          {isConnecting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            "Connect"
          )}
        </Button>
      )}
    </div>
  );
}

/** Reusable info/hint message for modals */
export function ModalHint({ children, variant = "info" }: { children: ReactNode; variant?: "info" | "success" | "warning" }) {
  const variantStyles = {
    info: "bg-white/5 border-white/10 text-white/60",
    success: "bg-green-500/10 border-green-500/20 text-green-400",
    warning: "bg-yellow-500/8 border-yellow-500/20 text-yellow-400",
  };

  return (
    <div className={cn("flex items-start gap-2 p-3 rounded-lg border text-sm", variantStyles[variant])}>
      {children}
    </div>
  );
}

/** Proof input section with consistent styling */
export function ProofSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40">
        {title}
      </h4>
      <div className="space-y-3 p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
        {children}
      </div>
    </div>
  );
}
