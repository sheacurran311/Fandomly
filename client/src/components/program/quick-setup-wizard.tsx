/**
 * QuickSetupWizard - 3-step onboarding wizard for first-time program creation
 * 
 * Steps:
 * 1. Choose Style - Select a theme template
 * 2. Basic Info - Name, bio, points name
 * 3. Connect Platforms - Connect top platforms for creator type
 * 
 * Features:
 * - Step indicator with progress
 * - Skip options at each step
 * - Pre-filled suggestions based on creator type
 * - Compact, focused interface
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  FileText, 
  Share2,
  Check,
  Palette
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  getRecommendedThemes,
  type ThemeTemplate,
  type CreatorTypeForTheme 
} from "@shared/theme-templates";
import { getCreatorTemplate, type CreatorType } from "./creator-program-templates";
import { PlatformConnectionPriority, type SocialConnection } from "./platform-connection-priority";

export interface QuickSetupData {
  displayName: string;
  bio: string;
  pointsName: string;
  selectedTheme: ThemeTemplate | null;
}

export interface QuickSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  creatorType: CreatorType;
  creatorName?: string;
  /** Callback when wizard completes */
  onComplete: (data: QuickSetupData) => void;
  /** Social connection props */
  connectedPlatforms: Set<string>;
  socialConnections?: SocialConnection[];
  recentlyConnected?: Set<string>;
  connectingPlatform: string | null;
  onConnect: (platformId: string) => void;
}

const STEPS = [
  { id: 1, title: 'Choose Style', icon: Palette },
  { id: 2, title: 'Basic Info', icon: FileText },
  { id: 3, title: 'Connect Platforms', icon: Share2 },
];

const CREATOR_LABELS: Record<CreatorType, string> = {
  athlete: 'Athletes',
  musician: 'Musicians',
  content_creator: 'Content Creators',
};

export function QuickSetupWizard({
  isOpen,
  onClose,
  creatorType,
  creatorName = '',
  onComplete,
  connectedPlatforms,
  socialConnections = [],
  recentlyConnected = new Set(),
  connectingPlatform,
  onConnect,
}: QuickSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const template = getCreatorTemplate(creatorType);
  const recommendedThemes = getRecommendedThemes(creatorType as CreatorTypeForTheme);
  
  const [setupData, setSetupData] = useState<QuickSetupData>({
    displayName: creatorName ? `${creatorName}'s Fan Program` : '',
    bio: '',
    pointsName: template.pointsNameSuggestion,
    selectedTheme: null,
  });

  const progress = (currentStep / STEPS.length) * 100;

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete the wizard
      onComplete(setupData);
      onClose();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    if (currentStep === STEPS.length) {
      onComplete(setupData);
      onClose();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-white mb-2">
                Choose Your Style
              </h3>
              <p className="text-gray-400">
                Select a theme to get started. You can customize it later.
              </p>
            </div>
            
            {/* Recommended themes label */}
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span className="text-sm text-amber-400 font-medium">
                Recommended for {CREATOR_LABELS[creatorType]}
              </span>
            </div>

            {/* Theme grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {recommendedThemes.slice(0, 6).map((theme) => {
                const isSelected = setupData.selectedTheme?.templateId === theme.templateId;
                
                return (
                  <button
                    key={theme.templateId}
                    onClick={() => setSetupData({ ...setupData, selectedTheme: theme })}
                    className={cn(
                      "relative p-3 rounded-xl border-2 transition-all text-left",
                      isSelected
                        ? "border-brand-primary bg-brand-primary/10 ring-2 ring-brand-primary/30"
                        : "border-white/20 bg-white/5 hover:border-brand-primary/50"
                    )}
                  >
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 bg-brand-primary rounded-full p-1">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                    
                    {/* Theme Preview */}
                    <div 
                      className="h-14 rounded-lg mb-2 overflow-hidden"
                      style={{
                        background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
                      }}
                    />
                    
                    <p className="text-white font-medium text-sm truncate">{theme.name}</p>
                    <div className="flex gap-1 mt-1">
                      <div 
                        className="w-3 h-3 rounded-full border border-white/20" 
                        style={{ backgroundColor: theme.colors.primary }}
                      />
                      <div 
                        className="w-3 h-3 rounded-full border border-white/20" 
                        style={{ backgroundColor: theme.colors.secondary }}
                      />
                      <div 
                        className="w-3 h-3 rounded-full border border-white/20" 
                        style={{ backgroundColor: theme.colors.accent }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
        
      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-white mb-2">
                Program Details
              </h3>
              <p className="text-gray-400">
                Set up the basics. You can change these anytime.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-white">Program Name</Label>
                <Input
                  value={setupData.displayName}
                  onChange={(e) => setSetupData({ ...setupData, displayName: e.target.value })}
                  placeholder="e.g., My Fan Program"
                  className="bg-white/5 border-white/10 text-white mt-1"
                />
              </div>

              <div>
                <Label className="text-white">Description (Optional)</Label>
                <Textarea
                  value={setupData.bio}
                  onChange={(e) => setSetupData({ ...setupData, bio: e.target.value })}
                  placeholder="Tell fans what your program is about..."
                  className="bg-white/5 border-white/10 text-white mt-1"
                  rows={3}
                />
              </div>
            </div>
          </div>
        );
        
      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-white mb-2">
                Connect Your Platforms
              </h3>
              <p className="text-gray-400">
                Connect your social accounts to build network-specific tasks. You can add more later.
              </p>
            </div>

            <PlatformConnectionPriority
              creatorType={creatorType}
              connectedPlatforms={connectedPlatforms}
              socialConnections={socialConnections}
              recentlyConnected={recentlyConnected}
              connectingPlatform={connectingPlatform}
              onConnect={onConnect}
              asCard={false}
              compactMode={true}
            />

            <div className="text-center pt-2">
              <Badge variant="outline" className="border-white/20 text-gray-400">
                {connectedPlatforms.size} platforms connected
              </Badge>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-white/10 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-primary" />
            Quick Setup
          </DialogTitle>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-3">
          <Progress value={progress} className="h-2" />
          
          {/* Step indicators */}
          <div className="flex justify-between">
            {STEPS.map((step) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.id;
              const isComplete = currentStep > step.id;
              
              return (
                <div key={step.id} className="flex items-center gap-2">
                  <div 
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                      isComplete && "bg-green-500/20 text-green-400",
                      isActive && "bg-brand-primary/20 text-brand-primary",
                      !isComplete && !isActive && "bg-white/10 text-gray-500"
                    )}
                  >
                    {isComplete ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <StepIcon className="h-4 w-4" />
                    )}
                  </div>
                  <span 
                    className={cn(
                      "text-sm hidden md:block",
                      isActive ? "text-white font-medium" : "text-gray-500"
                    )}
                  >
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="min-h-[300px] py-4">
          {renderStepContent()}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <div>
            {currentStep > 1 ? (
              <Button
                variant="ghost"
                onClick={handleBack}
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            ) : (
              <Button
                variant="ghost"
                onClick={onClose}
                className="text-gray-400 hover:text-white"
              >
                Cancel
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="text-gray-400 hover:text-white"
            >
              {currentStep === STEPS.length ? 'Skip & Finish' : 'Skip'}
            </Button>
            <Button
              onClick={handleNext}
              className="bg-brand-primary hover:bg-brand-primary/80"
            >
              {currentStep === STEPS.length ? (
                <>
                  Finish Setup
                  <Check className="h-4 w-4 ml-2" />
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default QuickSetupWizard;
