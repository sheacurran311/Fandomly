/**
 * Multiplier Configuration Component
 *
 * Allows creators to configure task-specific multipliers:
 * - Base multiplier (e.g., 1.5x for premium tasks)
 * - Stacking rules (additive vs multiplicative)
 * - Max multiplier cap
 * - Event multiplier compatibility
 */

import { useState } from "react";
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
import { Zap, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface MultiplierConfigData {
  enabled: boolean;
  baseMultiplier: number;
  multiplierConfig?: {
    stackingType: 'additive' | 'multiplicative';
    maxMultiplier?: number;
    allowEventMultipliers: boolean;
  };
}

interface MultiplierConfigProps {
  value: MultiplierConfigData;
  onChange: (config: MultiplierConfigData) => void;
}

export function MultiplierConfig({ value, onChange }: MultiplierConfigProps) {
  const handleEnabledChange = (enabled: boolean) => {
    onChange({
      ...value,
      enabled,
      baseMultiplier: enabled ? (value.baseMultiplier || 1.0) : 1.0,
    });
  };

  const handleBaseMultiplierChange = (newValue: string) => {
    const multiplier = parseFloat(newValue) || 1.0;
    onChange({
      ...value,
      baseMultiplier: Math.max(1.0, Math.min(10.0, multiplier)), // Clamp between 1.0 and 10.0
    });
  };

  const handleStackingTypeChange = (stackingType: 'additive' | 'multiplicative') => {
    onChange({
      ...value,
      multiplierConfig: {
        ...value.multiplierConfig,
        stackingType,
        maxMultiplier: value.multiplierConfig?.maxMultiplier,
        allowEventMultipliers: value.multiplierConfig?.allowEventMultipliers ?? true,
      },
    });
  };

  const handleMaxMultiplierChange = (newValue: string) => {
    const maxMultiplier = parseFloat(newValue) || undefined;
    onChange({
      ...value,
      multiplierConfig: {
        ...value.multiplierConfig,
        stackingType: value.multiplierConfig?.stackingType || 'multiplicative',
        maxMultiplier: maxMultiplier && maxMultiplier >= value.baseMultiplier ? maxMultiplier : undefined,
        allowEventMultipliers: value.multiplierConfig?.allowEventMultipliers ?? true,
      },
    });
  };

  const handleEventMultipliersChange = (allowEventMultipliers: boolean) => {
    onChange({
      ...value,
      multiplierConfig: {
        ...value.multiplierConfig,
        stackingType: value.multiplierConfig?.stackingType || 'multiplicative',
        maxMultiplier: value.multiplierConfig?.maxMultiplier,
        allowEventMultipliers,
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            <CardTitle>Point Multipliers</CardTitle>
          </div>
          <Switch
            checked={value.enabled}
            onCheckedChange={handleEnabledChange}
          />
        </div>
        <CardDescription>
          Configure point multipliers for this task
        </CardDescription>
      </CardHeader>
      {value.enabled && (
        <CardContent className="space-y-4">
          {/* Base Multiplier */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="baseMultiplier">Base Multiplier</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Task-specific multiplier applied to base points.
                      Example: 2.0x means this task awards double points.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center gap-2">
              <Input
                id="baseMultiplier"
                type="number"
                min="1.0"
                max="10.0"
                step="0.1"
                value={value.baseMultiplier}
                onChange={(e) => handleBaseMultiplierChange(e.target.value)}
                className="max-w-[120px]"
              />
              <span className="text-sm text-muted-foreground">x</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Range: 1.0x - 10.0x
            </p>
          </div>

          {/* Stacking Type */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="stackingType">Stacking Type</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      <strong>Multiplicative:</strong> 2x × 1.5x = 3x<br />
                      <strong>Additive:</strong> 2x + 1.5x = 3.5x
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select
              value={value.multiplierConfig?.stackingType || 'multiplicative'}
              onValueChange={(val) => handleStackingTypeChange(val as 'additive' | 'multiplicative')}
            >
              <SelectTrigger id="stackingType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="multiplicative">
                  Multiplicative (multiply multipliers)
                </SelectItem>
                <SelectItem value="additive">
                  Additive (add multipliers)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              How to combine with other active multipliers
            </p>
          </div>

          {/* Max Multiplier Cap */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="maxMultiplier">Max Multiplier Cap (Optional)</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Prevents total multiplier from exceeding this value.
                      Leave empty for no cap.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center gap-2">
              <Input
                id="maxMultiplier"
                type="number"
                min={value.baseMultiplier}
                max="20.0"
                step="0.5"
                value={value.multiplierConfig?.maxMultiplier || ''}
                onChange={(e) => handleMaxMultiplierChange(e.target.value)}
                placeholder="No cap"
                className="max-w-[120px]"
              />
              <span className="text-sm text-muted-foreground">x</span>
            </div>
          </div>

          {/* Allow Event Multipliers */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="allowEventMultipliers">Allow Event Multipliers</Label>
              <p className="text-xs text-muted-foreground">
                Let platform-wide event multipliers apply to this task
              </p>
            </div>
            <Switch
              id="allowEventMultipliers"
              checked={value.multiplierConfig?.allowEventMultipliers ?? true}
              onCheckedChange={handleEventMultipliersChange}
            />
          </div>

          {/* Preview */}
          <div className="rounded-lg bg-muted p-3 space-y-1">
            <p className="text-sm font-medium">Preview</p>
            <p className="text-xs text-muted-foreground">
              Base points: 100 → With {value.baseMultiplier}x = {Math.round(100 * value.baseMultiplier)} points
            </p>
            {value.multiplierConfig?.maxMultiplier && (
              <p className="text-xs text-muted-foreground">
                Max possible: {Math.round(100 * value.multiplierConfig.maxMultiplier)} points
              </p>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
