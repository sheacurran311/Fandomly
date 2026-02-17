/**
 * PreviewModal - Preview component for program customization
 * Extracted from program-builder.tsx for better maintainability
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { Program } from "@shared/schema";

interface ProgramWithDetails extends Program {
  campaigns?: any[];
  tasks?: any[];
}

interface PreviewModalProps {
  program: ProgramWithDetails;
  customizeData: {
    displayName?: string;
    pointsName?: string;
    bio?: string;
    headerImage?: string;
    logo?: string;
    brandColors?: {
      primary: string;
      secondary: string;
      accent: string;
    };
    theme?: {
      mode?: 'light' | 'dark' | 'custom';
      backgroundColor?: string;
      textColor?: string;
      typography?: {
        fontFamily?: {
          heading?: string;
          body?: string;
        };
      };
    };
    showCampaigns?: boolean;
    showTasks?: boolean;
    showRewards?: boolean;
    showLeaderboard?: boolean;
  };
  isOpen: boolean;
  onClose: () => void;
}

export function PreviewModal({ 
  program, 
  customizeData,
  isOpen, 
  onClose 
}: PreviewModalProps) {
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  
  // Get theme colors
  const theme = customizeData.theme || {};
  const brandColors = customizeData.brandColors || { primary: '#8B5CF6', secondary: '#EC4899', accent: '#F59E0B' };
  const backgroundColor = theme.backgroundColor || (theme.mode === 'dark' ? '#0f172a' : '#ffffff');
  const textColor = theme.textColor || (theme.mode === 'dark' ? '#ffffff' : '#111827');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[95vh] bg-slate-900 border-white/10 p-0 flex flex-col">
        <DialogHeader className="p-4 border-b border-white/10 flex-shrink-0">
          <DialogTitle className="text-white flex items-center justify-between">
            <span>Preview: {customizeData.displayName}</span>
            <div className="flex items-center gap-3">
              {/* Device Toggle */}
              <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
                <button
                  onClick={() => setPreviewMode('desktop')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    previewMode === 'desktop' ? 'bg-brand-primary text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Desktop
                </button>
                <button
                  onClick={() => setPreviewMode('mobile')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    previewMode === 'mobile' ? 'bg-brand-primary text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Mobile
                </button>
              </div>
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                {program.status === 'published' ? 'Live Preview' : 'Draft Preview'}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto flex justify-center p-4 bg-slate-800">
          {/* Preview Container */}
          <div 
            className={`transition-all duration-300 rounded-lg shadow-2xl overflow-auto ${
              previewMode === 'mobile' ? 'w-[375px]' : 'w-full max-w-5xl'
            }`}
            style={{ 
              backgroundColor,
              color: textColor,
              minHeight: '100%'
            }}
          >
            {/* Header Banner */}
            <div 
              className="h-48 relative"
              style={{
                background: customizeData.headerImage 
                  ? `url(${customizeData.headerImage}) center/cover`
                  : `linear-gradient(135deg, ${brandColors.primary}, ${brandColors.secondary})`
              }}
            >
              {/* Logo */}
              {customizeData.logo && (
                <div className="absolute bottom-0 left-6 transform translate-y-1/2">
                  <img 
                    src={customizeData.logo} 
                    alt="Logo" 
                    className="w-24 h-24 rounded-full border-4 object-cover"
                    style={{ borderColor: backgroundColor }}
                  />
                </div>
              )}
            </div>

            {/* Content */}
            <div className={`p-6 ${customizeData.logo ? 'pt-16' : 'pt-6'}`}>
              {/* Program Name */}
              <h1 
                className="text-3xl font-bold mb-2"
                style={{ 
                  color: textColor,
                  fontFamily: theme.typography?.fontFamily?.heading || 'inherit'
                }}
              >
                {customizeData.displayName || 'Your Program Name'}
              </h1>

              {/* Points Badge */}
              <div className="flex items-center gap-2 mb-4">
                <span 
                  className="px-3 py-1 rounded-full text-sm font-medium"
                  style={{ 
                    backgroundColor: brandColors.primary + '20',
                    color: brandColors.primary
                  }}
                >
                  Earn {customizeData.pointsName || 'Points'}
                </span>
              </div>

              {/* Bio */}
              {customizeData.bio && (
                <p 
                  className="text-base mb-6 opacity-80"
                  style={{ 
                    color: textColor,
                    fontFamily: theme.typography?.fontFamily?.body || 'inherit'
                  }}
                >
                  {customizeData.bio}
                </p>
              )}

              {/* Section Previews */}
              <div className="space-y-4">
                {customizeData.showCampaigns && (
                  <div 
                    className="p-4 rounded-lg"
                    style={{ backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                  >
                    <h3 className="font-semibold mb-2" style={{ color: textColor }}>Active Campaigns</h3>
                    <div className="flex gap-2">
                      <div 
                        className="px-4 py-2 rounded text-sm"
                        style={{ backgroundColor: brandColors.primary, color: '#fff' }}
                      >
                        Sample Campaign
                      </div>
                    </div>
                  </div>
                )}

                {customizeData.showTasks && (
                  <div 
                    className="p-4 rounded-lg"
                    style={{ backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                  >
                    <h3 className="font-semibold mb-2" style={{ color: textColor }}>Available Tasks</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 rounded" style={{ backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                        <span>Follow on Twitter</span>
                        <span style={{ color: brandColors.primary }}>+100 {customizeData.pointsName || 'pts'}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded" style={{ backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                        <span>Like a Post</span>
                        <span style={{ color: brandColors.primary }}>+50 {customizeData.pointsName || 'pts'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {customizeData.showRewards && (
                  <div 
                    className="p-4 rounded-lg"
                    style={{ backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                  >
                    <h3 className="font-semibold mb-2" style={{ color: textColor }}>Rewards Store</h3>
                    <div className="flex gap-3">
                      <div 
                        className="p-3 rounded-lg text-center flex-1"
                        style={{ 
                          backgroundColor: brandColors.secondary + '15',
                          borderColor: brandColors.secondary + '30',
                          borderWidth: 1
                        }}
                      >
                        <div className="text-2xl mb-1">🎁</div>
                        <p className="text-sm font-medium">Exclusive Merch</p>
                        <p className="text-xs opacity-70">500 {customizeData.pointsName || 'pts'}</p>
                      </div>
                      <div 
                        className="p-3 rounded-lg text-center flex-1"
                        style={{ 
                          backgroundColor: brandColors.accent + '15',
                          borderColor: brandColors.accent + '30',
                          borderWidth: 1
                        }}
                      >
                        <div className="text-2xl mb-1">🏆</div>
                        <p className="text-sm font-medium">VIP Access</p>
                        <p className="text-xs opacity-70">1000 {customizeData.pointsName || 'pts'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {customizeData.showLeaderboard && (
                  <div 
                    className="p-4 rounded-lg"
                    style={{ backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                  >
                    <h3 className="font-semibold mb-2" style={{ color: textColor }}>Top Fans</h3>
                    <div className="space-y-2">
                      {['1st', '2nd', '3rd'].map((place, i) => (
                        <div key={place} className="flex items-center justify-between p-2 rounded" style={{ backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                          <span>{place} - Fan{i + 1}</span>
                          <span style={{ color: brandColors.primary }}>{(1000 - i * 200)} {customizeData.pointsName || 'pts'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Color Palette Preview */}
              <div className="mt-8 pt-6 border-t" style={{ borderColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                <p className="text-xs opacity-50 mb-2">Color Palette</p>
                <div className="flex gap-2">
                  <div 
                    className="w-8 h-8 rounded-full" 
                    style={{ backgroundColor: brandColors.primary }}
                    title="Primary"
                  />
                  <div 
                    className="w-8 h-8 rounded-full" 
                    style={{ backgroundColor: brandColors.secondary }}
                    title="Secondary"
                  />
                  <div 
                    className="w-8 h-8 rounded-full" 
                    style={{ backgroundColor: brandColors.accent }}
                    title="Accent"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PreviewModal;
