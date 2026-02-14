import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Loader2,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Platform handle validation patterns
 */
const HANDLE_PATTERNS: Record<string, {
  pattern: RegExp;
  placeholder: string;
  example: string;
  profileUrlTemplate: string;
  description: string;
}> = {
  instagram: {
    pattern: /^@?[a-zA-Z0-9._]{1,30}$/,
    placeholder: "@username",
    example: "johndoe_official",
    profileUrlTemplate: "https://instagram.com/{handle}",
    description: "Your Instagram username (1-30 characters)",
  },
  tiktok: {
    pattern: /^@?[a-zA-Z0-9._]{2,24}$/,
    placeholder: "@username",
    example: "creator_name",
    profileUrlTemplate: "https://tiktok.com/@{handle}",
    description: "Your TikTok username (2-24 characters)",
  },
  twitter: {
    pattern: /^@?[a-zA-Z0-9_]{1,15}$/,
    placeholder: "@handle",
    example: "myhandle",
    profileUrlTemplate: "https://twitter.com/{handle}",
    description: "Your X/Twitter handle (1-15 characters)",
  },
  youtube: {
    pattern: /^(UC[a-zA-Z0-9_-]{22}|@[a-zA-Z0-9_.-]{3,30})$/,
    placeholder: "@channelname or Channel ID",
    example: "@MyChannel",
    profileUrlTemplate: "https://youtube.com/{handle}",
    description: "Your YouTube handle (@name) or channel ID",
  },
  facebook: {
    pattern: /^[a-zA-Z0-9.]{5,50}$/,
    placeholder: "profile.name",
    example: "john.doe.12345",
    profileUrlTemplate: "https://facebook.com/{handle}",
    description: "Your Facebook profile URL name",
  },
  twitch: {
    pattern: /^[a-zA-Z0-9_]{4,25}$/,
    placeholder: "username",
    example: "streamer_name",
    profileUrlTemplate: "https://twitch.tv/{handle}",
    description: "Your Twitch username (4-25 characters)",
  },
  kick: {
    pattern: /^[a-zA-Z0-9_]{3,25}$/,
    placeholder: "username",
    example: "streamer_name",
    profileUrlTemplate: "https://kick.com/{handle}",
    description: "Your Kick username (3-25 characters)",
  },
  discord: {
    pattern: /^.{2,32}#[0-9]{4}$|^[a-zA-Z0-9_.]{2,32}$/,
    placeholder: "username or username#1234",
    example: "myusername",
    profileUrlTemplate: "",
    description: "Your Discord username",
  },
};

/**
 * Props for PlatformHandleInput component
 */
interface PlatformHandleInputProps {
  /** Platform to input handle for */
  platform: string;
  /** Current handle value */
  value: string;
  /** Callback when handle changes */
  onChange: (value: string) => void;
  /** Callback when handle is submitted/saved */
  onSubmit?: (handle: string, normalized: string) => void;
  /** Whether the handle has been verified by creator */
  isVerified?: boolean;
  /** Whether input is disabled */
  disabled?: boolean;
  /** Error message to display */
  error?: string;
  /** Show "I don't have an account" option */
  showSkipOption?: boolean;
  /** Callback when skip is clicked */
  onSkip?: () => void;
  /** Optional class name */
  className?: string;
}

/**
 * Normalize a handle (remove @, lowercase)
 */
function normalizeHandle(handle: string, platform: string): string {
  let normalized = handle.trim();
  
  // Remove @ prefix for most platforms
  if (normalized.startsWith('@')) {
    normalized = normalized.slice(1);
  }
  
  // Lowercase for most platforms (except YouTube channel IDs)
  if (platform !== 'youtube' || !normalized.startsWith('UC')) {
    normalized = normalized.toLowerCase();
  }
  
  return normalized;
}

/**
 * PlatformHandleInput Component
 * 
 * Input component for fans to enter their social media handles
 * for platforms where OAuth isn't available (T3 verification).
 * 
 * Features:
 * - Platform-specific format validation
 * - Direct link preview to profile
 * - Real-time validation feedback
 * - Skip option for fans without accounts
 */
export function PlatformHandleInput({
  platform,
  value,
  onChange,
  onSubmit,
  isVerified = false,
  disabled = false,
  error,
  showSkipOption = false,
  onSkip,
  className,
}: PlatformHandleInputProps) {
  const [touched, setTouched] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  
  const config = HANDLE_PATTERNS[platform.toLowerCase()] || {
    pattern: /.+/,
    placeholder: "username",
    example: "username",
    profileUrlTemplate: "",
    description: "Your username on this platform",
  };

  // Validate handle
  const isValid = config.pattern.test(value);
  const showError = touched && value && !isValid;
  const normalized = normalizeHandle(value, platform);
  
  // Generate profile URL for preview
  const profileUrl = config.profileUrlTemplate && normalized
    ? config.profileUrlTemplate.replace('{handle}', normalized)
    : null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setTouched(true);
  };

  const handleSubmit = () => {
    if (isValid && onSubmit) {
      onSubmit(value, normalized);
    }
  };

  // Platform display info
  const platformEmoji: Record<string, string> = {
    instagram: "📷",
    tiktok: "🎵",
    twitter: "𝕏",
    youtube: "▶️",
    facebook: "📘",
    twitch: "🎮",
    kick: "🟢",
    discord: "💬",
  };

  return (
    <div className={cn("space-y-3", className)}>
      <Label className="flex items-center gap-2">
        <span>{platformEmoji[platform.toLowerCase()] || "🌐"}</span>
        {platform.charAt(0).toUpperCase() + platform.slice(1)} Handle
        {isVerified && (
          <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        )}
      </Label>
      
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <User className="h-4 w-4" />
        </div>
        <Input
          value={value}
          onChange={handleChange}
          onBlur={() => setTouched(true)}
          placeholder={config.placeholder}
          disabled={disabled || isVerified}
          className={cn(
            "pl-9",
            showError && "border-destructive",
            isValid && value && "border-green-500"
          )}
        />
        {isValidating && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {isValid && value && !isValidating && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <CheckCircle className="h-4 w-4 text-green-500" />
          </div>
        )}
      </div>

      {/* Validation feedback */}
      {showError && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>Invalid format. Example: {config.example}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Description */}
      <p className="text-xs text-muted-foreground">
        {config.description}
      </p>

      {/* Profile preview link */}
      {profileUrl && isValid && value && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => window.open(profileUrl, "_blank")}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          View profile: {normalized}
        </Button>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {onSubmit && !isVerified && (
          <Button
            onClick={handleSubmit}
            disabled={!isValid || !value || disabled}
            className="flex-1"
          >
            Save Handle
          </Button>
        )}
        
        {showSkipOption && onSkip && (
          <Button
            variant="ghost"
            onClick={onSkip}
            disabled={disabled}
            className="text-muted-foreground"
          >
            I don't have an account
          </Button>
        )}
      </div>
    </div>
  );
}

export default PlatformHandleInput;
