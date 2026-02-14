/**
 * QuickThemePicker - Simplified theme selector for Program Builder
 * 
 * Features:
 * - Shows recommended themes for creator type first
 * - "See all themes" expansion
 * - Visual preview with color dots
 * - Highlights currently selected theme
 * - One-click apply
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Palette, ChevronDown, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  getAllThemeTemplates, 
  getRecommendedThemes,
  type ThemeTemplate,
  type CreatorTypeForTheme 
} from "@shared/theme-templates";

export interface QuickThemePickerProps {
  /** Creator type for filtering recommendations */
  creatorType: CreatorTypeForTheme;
  /** Currently selected theme template ID */
  selectedThemeId: string | null;
  /** Callback when a theme is selected */
  onSelectTheme: (template: ThemeTemplate) => void;
  /** Show in compact mode (fewer visible by default) */
  compact?: boolean;
}

const CREATOR_LABELS: Record<CreatorTypeForTheme, string> = {
  athlete: 'Athletes',
  musician: 'Musicians',
  content_creator: 'Content Creators',
};

export function QuickThemePicker({
  creatorType,
  selectedThemeId,
  onSelectTheme,
  compact = false,
}: QuickThemePickerProps) {
  const [showAllThemes, setShowAllThemes] = useState(false);
  
  const allThemes = getAllThemeTemplates();
  const recommendedThemes = getRecommendedThemes(creatorType);
  const otherThemes = allThemes.filter(t => !t.recommendedFor?.includes(creatorType));
  
  // In compact mode, show 4 recommended; otherwise show 6
  const visibleCount = compact ? 4 : 6;
  const initialThemes = recommendedThemes.slice(0, visibleCount);
  const remainingRecommended = recommendedThemes.slice(visibleCount);
  
  const renderThemeCard = (template: ThemeTemplate, isRecommended: boolean = false) => {
    const isSelected = selectedThemeId === template.templateId;
    
    return (
      <button
        key={template.templateId}
        onClick={() => onSelectTheme(template)}
        className={cn(
          "relative group p-3 rounded-xl border-2 transition-all text-left",
          isSelected
            ? "border-brand-primary bg-brand-primary/10 ring-2 ring-brand-primary/30"
            : "border-white/20 bg-white/5 hover:border-brand-primary/50 hover:bg-white/10"
        )}
      >
        {/* Selection indicator */}
        {isSelected && (
          <div className="absolute -top-2 -right-2 bg-brand-primary rounded-full p-1">
            <Check className="h-3 w-3 text-white" />
          </div>
        )}
        
        {/* Recommended badge */}
        {isRecommended && !isSelected && (
          <div className="absolute -top-2 left-2">
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50 text-xs px-1.5 py-0">
              <Sparkles className="h-2.5 w-2.5 mr-0.5" />
              Recommended
            </Badge>
          </div>
        )}
        
        {/* Theme Preview */}
        <div 
          className="h-16 rounded-lg mb-3 overflow-hidden relative"
          style={{
            background: `linear-gradient(135deg, ${template.colors.primary}, ${template.colors.secondary})`,
          }}
        >
          <div 
            className="absolute inset-2 rounded flex flex-col justify-center items-center gap-1 p-2" 
            style={{ backgroundColor: template.colors.background + 'E6' }}
          >
            <div 
              className="h-2 rounded-full" 
              style={{ backgroundColor: template.colors.text.primary, width: '70%' }}
            />
            <div 
              className="h-1.5 rounded-full" 
              style={{ backgroundColor: template.colors.text.secondary, width: '50%' }}
            />
            <div 
              className="h-1.5 rounded-full" 
              style={{ backgroundColor: template.colors.text.tertiary, width: '60%' }}
            />
          </div>
        </div>
        
        {/* Theme Info */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-white font-semibold text-sm truncate flex-1">{template.name}</p>
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs px-1.5 py-0",
                template.mode === 'dark' 
                  ? "border-gray-600 text-gray-400" 
                  : "border-gray-400 text-gray-300"
              )}
            >
              {template.mode === 'dark' ? '🌙' : '☀️'}
            </Badge>
          </div>
          <p className="text-gray-400 text-xs line-clamp-1">{template.description}</p>
          
          {/* Color Dots */}
          <div className="flex gap-1.5 pt-1">
            <div 
              className="w-4 h-4 rounded-full border border-white/20" 
              style={{ backgroundColor: template.colors.primary }}
              title="Primary"
            />
            <div 
              className="w-4 h-4 rounded-full border border-white/20" 
              style={{ backgroundColor: template.colors.secondary }}
              title="Secondary"
            />
            <div 
              className="w-4 h-4 rounded-full border border-white/20" 
              style={{ backgroundColor: template.colors.accent }}
              title="Accent"
            />
          </div>
        </div>
      </button>
    );
  };

  return (
    <Card className="bg-white/5 backdrop-blur-lg border-white/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brand-primary/10">
              <Palette className="h-5 w-5 text-brand-primary" />
            </div>
            <div>
              <CardTitle className="text-white text-lg">Choose Your Style</CardTitle>
              <p className="text-sm text-gray-400">
                Select a theme to instantly apply colors and styling
              </p>
            </div>
          </div>
          {selectedThemeId && (
            <Badge className="bg-brand-primary/20 text-brand-primary border-brand-primary/50">
              {allThemes.find(t => t.templateId === selectedThemeId)?.name || 'Custom'}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Recommended section label */}
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span className="text-sm text-amber-400 font-medium">
            Recommended for {CREATOR_LABELS[creatorType]}
          </span>
        </div>
        
        {/* Initial visible themes */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {initialThemes.map((template) => renderThemeCard(template, true))}
        </div>
        
        {/* See All expansion */}
        {(remainingRecommended.length > 0 || otherThemes.length > 0) && (
          <Collapsible open={showAllThemes} onOpenChange={setShowAllThemes}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full text-gray-400 hover:text-white hover:bg-white/5"
              >
                <span>
                  {showAllThemes ? 'Show less' : `See all ${allThemes.length} themes`}
                </span>
                <ChevronDown className={cn(
                  "h-4 w-4 ml-2 transition-transform",
                  showAllThemes && "rotate-180"
                )} />
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="space-y-4 pt-4">
              {/* Remaining recommended themes */}
              {remainingRecommended.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {remainingRecommended.map((template) => renderThemeCard(template, true))}
                </div>
              )}
              
              {/* Other themes section */}
              {otherThemes.length > 0 && (
                <>
                  <div className="flex items-center gap-2 pt-2">
                    <span className="text-sm text-gray-500">More themes</span>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {otherThemes.map((template) => renderThemeCard(template, false))}
                  </div>
                </>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}
        
        {/* Tip */}
        <div className="text-xs text-gray-500 bg-white/5 rounded-lg p-3">
          <strong className="text-gray-400">Tip:</strong> Selecting a theme applies colors, typography, and layout. 
          You can customize individual settings in the advanced options below.
        </div>
      </CardContent>
    </Card>
  );
}

export default QuickThemePicker;
