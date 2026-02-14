/**
 * Website Visit Configuration Component
 *
 * Allows creators to configure website visit tasks:
 * - Destination URL (with click tracking auto-verification)
 */

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, CheckCircle2, Info, AlertCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

        {/* Summary */}
        <div className="rounded-lg bg-muted p-3 space-y-2">
          <p className="text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            Verification Summary
          </p>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Auto-verified upon link click - instant verification when fans visit the URL</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
