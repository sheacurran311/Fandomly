/**
 * ProgramBuilderModeToggle - Simple/Advanced mode switcher
 * 
 * Features:
 * - Toggle between Simple and Advanced modes
 * - Persists preference to localStorage
 * - Uses ToggleGroup for consistent styling
 */

import { useEffect } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Sparkles, Settings2 } from "lucide-react";

export type BuilderMode = 'simple' | 'advanced';

const STORAGE_KEY = 'programBuilderMode';

export interface ProgramBuilderModeToggleProps {
  mode: BuilderMode;
  onModeChange: (mode: BuilderMode) => void;
}

/**
 * Get the saved builder mode from localStorage
 */
export function getSavedBuilderMode(): BuilderMode {
  if (typeof window === 'undefined') return 'simple';
  const saved = localStorage.getItem(STORAGE_KEY);
  return (saved === 'advanced' ? 'advanced' : 'simple');
}

/**
 * Save builder mode to localStorage
 */
export function saveBuilderMode(mode: BuilderMode): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, mode);
  }
}

export function ProgramBuilderModeToggle({ mode, onModeChange }: ProgramBuilderModeToggleProps) {
  // Save to localStorage when mode changes
  useEffect(() => {
    saveBuilderMode(mode);
  }, [mode]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-400">Mode:</span>
      <ToggleGroup 
        type="single" 
        value={mode} 
        onValueChange={(value) => {
          if (value) onModeChange(value as BuilderMode);
        }}
        className="bg-white/5 rounded-lg p-1"
      >
        <ToggleGroupItem 
          value="simple" 
          aria-label="Simple mode"
          className="data-[state=on]:bg-brand-primary data-[state=on]:text-white px-3 py-1.5 text-sm rounded-md transition-all"
        >
          <Sparkles className="h-4 w-4 mr-1.5" />
          Simple
        </ToggleGroupItem>
        <ToggleGroupItem 
          value="advanced" 
          aria-label="Advanced mode"
          className="data-[state=on]:bg-brand-primary data-[state=on]:text-white px-3 py-1.5 text-sm rounded-md transition-all"
        >
          <Settings2 className="h-4 w-4 mr-1.5" />
          Advanced
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

export default ProgramBuilderModeToggle;
