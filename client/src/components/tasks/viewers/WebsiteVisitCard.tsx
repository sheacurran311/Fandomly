/**
 * Website Visit Card Component
 *
 * Displays tracked link for website visit tasks
 * Handles click tracking and optional time/action requirements
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  ExternalLink,
  Clock,
  CheckCircle,
  Info,
  MousePointerClick,
  Timer,
  Sparkles,
} from "lucide-react";
import type { WebsiteVisitConfig } from "@/components/tasks/config/WebsiteVisitConfig";

interface WebsiteVisitCardProps {
  config: WebsiteVisitConfig;
  taskId: string | number;
  onComplete: () => void;
  onCancel?: () => void;
}

export default function WebsiteVisitCard({
  config,
  taskId,
  onComplete,
  onCancel,
}: WebsiteVisitCardProps) {
  const [isLinkClicked, setIsLinkClicked] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const [actionCompleted, setActionCompleted] = useState(false);
  const [isTracking, setIsTracking] = useState(false);

  const hasTimeRequirement = config.requireMinTimeOnSite && config.minTimeOnSiteSeconds;
  const hasActionRequirement = config.requireActionCompletion;
  const requiresAdditionalSteps = hasTimeRequirement || hasActionRequirement;

  // Timer for time on site tracking
  useEffect(() => {
    if (isTracking && hasTimeRequirement) {
      const interval = setInterval(() => {
        setTimeSpent(prev => prev + 1);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isTracking, hasTimeRequirement]);

  // Check if requirements are met
  const requirementsMet = () => {
    if (!isLinkClicked) return false;
    if (hasTimeRequirement && timeSpent < (config.minTimeOnSiteSeconds || 0)) return false;
    if (hasActionRequirement && !actionCompleted) return false;
    return true;
  };

  // Handle link click
  const handleLinkClick = () => {
    setIsLinkClicked(true);

    if (hasTimeRequirement) {
      setIsTracking(true);
    }

    // Generate tracked URL (in real implementation, this would be a backend-generated tracking URL)
    const trackedUrl = generateTrackedUrl(config.destinationUrl, taskId);

    // Open in new window
    window.open(trackedUrl, '_blank', 'noopener,noreferrer');

    // If no additional requirements, complete immediately
    if (!requiresAdditionalSteps) {
      setTimeout(() => {
        onComplete();
      }, 1000);
    }
  };

  // Generate tracked URL (placeholder - would be backend-generated in production)
  const generateTrackedUrl = (url: string, taskId: string | number): string => {
    const trackingParams = new URLSearchParams({
      fandomly_task: taskId.toString(),
      fandomly_tracking: 'website_visit',
    });

    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${trackingParams.toString()}`;
  };

  // Handle complete button click
  const handleCompleteClick = () => {
    if (requirementsMet()) {
      onComplete();
    }
  };

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const getTimeProgress = (): number => {
    if (!hasTimeRequirement || !config.minTimeOnSiteSeconds) return 100;
    return Math.min((timeSpent / config.minTimeOnSiteSeconds) * 100, 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ExternalLink className="h-5 w-5 text-blue-400" />
        <h2 className="text-xl font-bold text-white">Visit Website</h2>
      </div>

      {/* Destination Card */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <MousePointerClick className="h-5 w-5 text-blue-400" />
            Click the tracked link below
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Destination URL */}
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-sm text-gray-400 mb-2">Destination:</p>
            <p className="text-white font-medium truncate">{config.destinationUrl}</p>
          </div>

          {/* Requirements List */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-300">To earn points:</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                {isLinkClicked ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-gray-500" />
                )}
                <span className={isLinkClicked ? 'text-green-400' : 'text-gray-400'}>
                  Click the tracked link
                </span>
              </div>

              {hasTimeRequirement && (
                <div className="flex items-center gap-2 text-sm">
                  {timeSpent >= (config.minTimeOnSiteSeconds || 0) ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-gray-500" />
                  )}
                  <span className={timeSpent >= (config.minTimeOnSiteSeconds || 0) ? 'text-green-400' : 'text-gray-400'}>
                    Stay for at least {config.minTimeOnSiteSeconds} seconds
                  </span>
                </div>
              )}

              {hasActionRequirement && (
                <div className="flex items-center gap-2 text-sm">
                  {actionCompleted ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-gray-500" />
                  )}
                  <span className={actionCompleted ? 'text-green-400' : 'text-gray-400'}>
                    Complete: {config.actionType?.replace('_', ' ')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Time Tracking (if active) */}
          {isTracking && hasTimeRequirement && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-blue-400 animate-pulse" />
                  <span className="text-gray-400">Time spent:</span>
                </div>
                <span className="text-white font-semibold">
                  {formatTime(timeSpent)} / {formatTime(config.minTimeOnSiteSeconds || 0)}
                </span>
              </div>
              <Progress value={getTimeProgress()} className="h-2" />
            </div>
          )}

          {/* Visit Link Button */}
          <Button
            onClick={handleLinkClick}
            disabled={isLinkClicked}
            className="w-full bg-blue-500 hover:bg-blue-600"
          >
            {isLinkClicked ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Link Opened
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Tracked Link
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Instructions for additional requirements */}
      {requiresAdditionalSteps && isLinkClicked && (
        <Alert className="bg-blue-500/10 border-blue-500/20">
          <Info className="h-4 w-4 text-blue-400" />
          <AlertDescription className="text-blue-400">
            {hasTimeRequirement && timeSpent < (config.minTimeOnSiteSeconds || 0) && (
              <p>Keep the destination page open for {config.minTimeOnSiteSeconds} seconds...</p>
            )}
            {hasActionRequirement && !actionCompleted && (
              <p>
                Complete the required action on the destination page: {config.actionType?.replace('_', ' ')}
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Complete Button (for requirements-based tasks) */}
      {requiresAdditionalSteps && (
        <Button
          onClick={handleCompleteClick}
          disabled={!requirementsMet()}
          className="w-full bg-green-500 hover:bg-green-600"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          {requirementsMet() ? 'Complete Task' : 'Requirements Not Met'}
        </Button>
      )}

      {/* Auto-verification notice */}
      {!requiresAdditionalSteps && isLinkClicked && (
        <Alert className="bg-green-500/10 border-green-500/20">
          <CheckCircle className="h-4 w-4 text-green-400" />
          <AlertDescription className="text-green-400">
            <strong>Task completed!</strong> Points will be awarded shortly.
          </AlertDescription>
        </Alert>
      )}

      {/* Cancel Button */}
      {onCancel && (
        <Button
          variant="ghost"
          onClick={onCancel}
          className="w-full text-gray-400 hover:text-white"
        >
          Cancel
        </Button>
      )}
    </div>
  );
}
