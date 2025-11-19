/**
 * Website Visit Configuration Component
 *
 * Allows creators to configure website visit tasks:
 * - Destination URL
 * - Minimum time on site requirement
 * - Required action completion (form submit, video watch, etc.)
 */

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Clock, CheckCircle2, Info, AlertCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";

export interface WebsiteVisitConfig {
  destinationUrl: string;
  requireMinTimeOnSite?: boolean;
  minTimeOnSiteSeconds?: number;
  requireActionCompletion?: boolean;
  actionType?: 'form_submit' | 'video_watch' | 'button_click' | 'custom';
}

interface WebsiteVisitConfigProps {
  value: WebsiteVisitConfig;
  onChange: (config: WebsiteVisitConfig) => void;
}

export function WebsiteVisitConfig({ value, onChange }: WebsiteVisitConfigProps) {
  const handleUrlChange = (url: string) => {
    onChange({ ...value, destinationUrl: url });
  };

  const handleTimeRequirementChange = (enabled: boolean) => {
    onChange({
      ...value,
      requireMinTimeOnSite: enabled,
      minTimeOnSiteSeconds: enabled ? (value.minTimeOnSiteSeconds || 30) : undefined,
    });
  };

  const handleMinTimeChange = (seconds: string) => {
    onChange({
      ...value,
      minTimeOnSiteSeconds: parseInt(seconds) || 30,
    });
  };

  const handleActionRequirementChange = (enabled: boolean) => {
    onChange({
      ...value,
      requireActionCompletion: enabled,
      actionType: enabled ? (value.actionType || 'button_click') : undefined,
    });
  };

  const handleActionTypeChange = (actionType: WebsiteVisitConfig['actionType']) => {
    onChange({ ...value, actionType });
  };

  // Validate URL
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const urlValid = value.destinationUrl ? isValidUrl(value.destinationUrl) : true;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ExternalLink className="w-5 h-5 text-blue-500" />
          <CardTitle>Website Visit Configuration</CardTitle>
        </div>
        <CardDescription>
          Configure auto-verified link tracking task
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Destination URL */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="destinationUrl">Destination URL</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    The website URL users will visit. Can be your website, landing page,
                    product page, or any external link.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Input
            id="destinationUrl"
            type="url"
            value={value.destinationUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="https://example.com/your-page"
            className={!urlValid ? 'border-destructive' : ''}
          />
          {!urlValid && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Please enter a valid URL (must start with http:// or https://)
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Users will click a tracked link that redirects to this URL
          </p>
        </div>

        {/* Minimum Time on Site */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label htmlFor="requireMinTime">Require Minimum Time on Site</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Users must stay on the destination page for at least this long.
                        Prevents instant click-throughs.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-xs text-muted-foreground">
                Ensure users actually view the content
              </p>
            </div>
            <Switch
              id="requireMinTime"
              checked={value.requireMinTimeOnSite ?? false}
              onCheckedChange={handleTimeRequirementChange}
            />
          </div>

          {value.requireMinTimeOnSite && (
            <div className="ml-6 space-y-2">
              <Label htmlFor="minTime">Minimum Time (seconds)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="minTime"
                  type="number"
                  min="5"
                  max="600"
                  value={value.minTimeOnSiteSeconds || 30}
                  onChange={(e) => handleMinTimeChange(e.target.value)}
                  className="max-w-[120px]"
                />
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {value.minTimeOnSiteSeconds || 30} seconds
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Range: 5-600 seconds (10 minutes max)
              </p>
            </div>
          )}
        </div>

        {/* Require Action Completion */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label htmlFor="requireAction">Require Action Completion</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Users must complete a specific action on the destination page
                        (form submit, video watch, button click, etc.)
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-xs text-muted-foreground">
                Verify users completed a specific action
              </p>
            </div>
            <Switch
              id="requireAction"
              checked={value.requireActionCompletion ?? false}
              onCheckedChange={handleActionRequirementChange}
            />
          </div>

          {value.requireActionCompletion && (
            <div className="ml-6 space-y-2">
              <Label htmlFor="actionType">Action Type</Label>
              <Select
                value={value.actionType || 'button_click'}
                onValueChange={handleActionTypeChange}
              >
                <SelectTrigger id="actionType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="button_click">
                    <div className="flex flex-col items-start">
                      <span>Button Click</span>
                      <span className="text-xs text-muted-foreground">
                        User clicks a specific button
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="form_submit">
                    <div className="flex flex-col items-start">
                      <span>Form Submission</span>
                      <span className="text-xs text-muted-foreground">
                        User submits a form (signup, contact, etc.)
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="video_watch">
                    <div className="flex flex-col items-start">
                      <span>Video Watch</span>
                      <span className="text-xs text-muted-foreground">
                        User watches video to completion
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="custom">
                    <div className="flex flex-col items-start">
                      <span>Custom Action</span>
                      <span className="text-xs text-muted-foreground">
                        Custom event via JavaScript
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {value.actionType === 'custom' && (
                <Alert>
                  <Info className="w-4 h-4" />
                  <AlertDescription>
                    <p className="text-xs">
                      Custom actions require JavaScript integration on your destination page.
                      See documentation for implementation details.
                    </p>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="rounded-lg bg-muted p-3 space-y-2">
          <p className="text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            Verification Summary
          </p>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>✓ Auto-verified upon link click</p>
            {value.requireMinTimeOnSite && (
              <p>✓ Must stay for {value.minTimeOnSiteSeconds}+ seconds</p>
            )}
            {value.requireActionCompletion && (
              <p>✓ Must complete: {value.actionType?.replace('_', ' ')}</p>
            )}
            {!value.requireMinTimeOnSite && !value.requireActionCompletion && (
              <p className="text-muted-foreground">
                No additional requirements - instant verification on click
              </p>
            )}
          </div>
        </div>

        {/* Implementation Note */}
        {(value.requireMinTimeOnSite || value.requireActionCompletion) && (
          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription>
              <p className="text-xs">
                <strong>Implementation required:</strong> Your destination page must include
                the Fandomly tracking script to report time on site and action completion.
                See integration docs for details.
              </p>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
