import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Copy,
  Check,
  Clock,
  RefreshCw,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Props for VerificationCodeDisplay component
 */
interface VerificationCodeDisplayProps {
  /** The unique verification code */
  code: string;
  /** Platform for platform-specific instructions */
  platform: string;
  /** Optional expiration time */
  expiresAt?: Date;
  /** Whether the code has been used/verified */
  isUsed?: boolean;
  /** Callback when user clicks "I posted my code" */
  onVerifyClick?: () => void;
  /** Whether verification is in progress */
  isVerifying?: boolean;
  /** Target URL where user should post the code */
  targetUrl?: string;
  /** Additional instructions */
  instructions?: string;
  /** Optional class name */
  className?: string;
}

/**
 * Platform-specific instructions for posting codes
 */
const PLATFORM_INSTRUCTIONS: Record<string, {
  title: string;
  steps: string[];
  emoji: string;
  placeholder: string;
}> = {
  instagram: {
    title: "Post on Instagram",
    steps: [
      "Go to the post below",
      "Add a comment with your code",
      "Make sure the comment is public",
    ],
    emoji: "📷",
    placeholder: "Include your code in a comment on the post",
  },
  youtube: {
    title: "Comment on YouTube",
    steps: [
      "Go to the video below",
      "Leave a comment with your code",
      "Make sure your comment is visible",
    ],
    emoji: "▶️",
    placeholder: "Include your code in a comment on the video",
  },
  facebook: {
    title: "Comment on Facebook",
    steps: [
      "Go to the post below",
      "Add a comment with your code",
      "Make sure the comment is public",
    ],
    emoji: "📘",
    placeholder: "Include your code in a comment on the post",
  },
  twitter: {
    title: "Quote Tweet or Reply",
    steps: [
      "Go to the tweet below",
      "Quote tweet or reply with your code",
      "Make sure your post is public",
    ],
    emoji: "𝕏",
    placeholder: "Include your code in a quote tweet or reply",
  },
  tiktok: {
    title: "Comment on TikTok",
    steps: [
      "Go to the video below",
      "Leave a comment with your code",
      "Make sure your comment is visible",
    ],
    emoji: "🎵",
    placeholder: "Include your code in a comment on the video",
  },
  twitch: {
    title: "Chat on Twitch",
    steps: [
      "Go to the stream below",
      "Type your code in chat",
      "The creator must be live for verification",
    ],
    emoji: "🎮",
    placeholder: "Type your code in the stream chat",
  },
  kick: {
    title: "Chat on Kick",
    steps: [
      "Go to the stream below",
      "Type your code in chat",
      "The creator must be live for verification",
    ],
    emoji: "🟢",
    placeholder: "Type your code in the stream chat",
  },
  discord: {
    title: "Message on Discord",
    steps: [
      "Join the Discord server",
      "Post your code in the designated channel",
      "Make sure you have the correct role",
    ],
    emoji: "💬",
    placeholder: "Post your code in the verification channel",
  },
};

/**
 * VerificationCodeDisplay Component
 * 
 * Shows a verification code to fans for T2 (code-based) tasks.
 * Includes copy functionality, platform-specific instructions,
 * and optional expiration countdown.
 */
export function VerificationCodeDisplay({
  code,
  platform,
  expiresAt,
  isUsed = false,
  onVerifyClick,
  isVerifying = false,
  targetUrl,
  instructions,
  className,
}: VerificationCodeDisplayProps) {
  const [copied, setCopied] = useState(false);
  
  const platformInfo = PLATFORM_INSTRUCTIONS[platform.toLowerCase()] || {
    title: `Post your code`,
    steps: ["Go to the specified location", "Post your code", "Click verify"],
    emoji: "🌐",
    placeholder: "Include your code in your post",
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Calculate time remaining if expiration is set
  const getTimeRemaining = () => {
    if (!expiresAt) return null;
    const now = new Date();
    const diff = new Date(expiresAt).getTime() - now.getTime();
    if (diff <= 0) return "Expired";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m remaining`;
  };

  const timeRemaining = getTimeRemaining();
  const isExpired = timeRemaining === "Expired";

  if (isUsed) {
    return (
      <Card className={cn("bg-green-500/10 border-green-500/30", className)}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Check className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-green-500 font-semibold">Code Verified!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your code has been found and verified
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <span>{platformInfo.emoji}</span>
            {platformInfo.title}
          </CardTitle>
          {timeRemaining && !isExpired && (
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {timeRemaining}
            </Badge>
          )}
          {isExpired && (
            <Badge variant="destructive" className="text-xs">
              <AlertCircle className="h-3 w-3 mr-1" />
              Expired
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Large code display */}
        <div className="relative">
          <div className={cn(
            "bg-muted rounded-lg p-4 text-center",
            isExpired && "opacity-50"
          )}>
            <p className="text-xs text-muted-foreground mb-1">Your unique code</p>
            <p className="text-3xl font-mono font-bold tracking-widest">
              {code}
            </p>
          </div>
          
          {/* Copy button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={handleCopy}
                  disabled={isExpired}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {copied ? "Copied!" : "Copy code"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Instructions */}
        <div className="space-y-2">
          <p className="text-sm font-medium">How to verify:</p>
          <ol className="text-sm text-muted-foreground space-y-1">
            {platformInfo.steps.map((step, index) => (
              <li key={index} className="flex gap-2">
                <span className="text-primary font-medium">{index + 1}.</span>
                {step}
              </li>
            ))}
          </ol>
          {instructions && (
            <p className="text-sm text-muted-foreground italic mt-2">
              {instructions}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          {targetUrl && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open(targetUrl, "_blank")}
              disabled={isExpired}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Go to {platformInfo.title.replace("Post on ", "").replace("Comment on ", "")}
            </Button>
          )}
          
          <Button
            className="w-full"
            onClick={onVerifyClick}
            disabled={isExpired || isVerifying}
          >
            {isVerifying ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                I posted my code
              </>
            )}
          </Button>
        </div>

        {/* Helper text */}
        <p className="text-xs text-muted-foreground text-center">
          After posting, click the button above. We'll check for your code automatically.
        </p>
      </CardContent>
    </Card>
  );
}

export default VerificationCodeDisplay;
