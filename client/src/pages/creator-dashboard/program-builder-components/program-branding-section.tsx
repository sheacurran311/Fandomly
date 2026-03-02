import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Palette, AlertCircle } from 'lucide-react';

interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
}

interface Theme {
  mode: 'light' | 'dark' | 'custom';
  backgroundColor?: string;
  textColor?: string;
  templateId?: string;
}

interface ProgramBrandingSectionProps {
  brandColors: BrandColors;
  theme: Theme;
  onBrandColorsChange: (colors: BrandColors) => void;
  onThemeChange: (theme: Theme) => void;
}

export function ProgramBrandingSection({
  brandColors,
  theme,
  onBrandColorsChange,
  onThemeChange,
}: ProgramBrandingSectionProps) {
  const handleColorChange = (field: keyof BrandColors, value: string) => {
    onBrandColorsChange({ ...brandColors, [field]: value });
  };

  const handleThemePresetChange = (mode: 'light' | 'dark' | 'custom') => {
    if (mode === 'light') {
      onThemeChange({
        ...theme,
        mode: 'light',
        backgroundColor: '#ffffff',
        textColor: '#111827',
      });
    } else if (mode === 'dark') {
      onThemeChange({
        ...theme,
        mode: 'dark',
        backgroundColor: '#0f172a',
        textColor: '#ffffff',
      });
    } else {
      onThemeChange({ ...theme, mode: 'custom' });
    }
  };

  const handleCustomThemeChange = (field: 'backgroundColor' | 'textColor', value: string) => {
    onThemeChange({ ...theme, [field]: value });
  };

  return (
    <>
      {/* Brand Colors */}
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Brand Colors
          </CardTitle>
          <p className="text-sm text-gray-400">
            Customize colors used throughout your program page
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Primary Color */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-white">Primary Color</Label>
                <span className="text-xs text-gray-500 italic">Banner, Buttons, Highlights</span>
              </div>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={brandColors.primary}
                  onChange={(e) => handleColorChange('primary', e.target.value)}
                  className="w-16 h-10 p-1 bg-white/5 border-white/10 cursor-pointer"
                />
                <Input
                  value={brandColors.primary}
                  onChange={(e) => handleColorChange('primary', e.target.value)}
                  className="flex-1 bg-white/5 border-white/10 text-white"
                  placeholder="#6366f1"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Used for primary CTAs, badges, and active states
              </p>
            </div>

            {/* Secondary Color */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-white">Secondary Color</Label>
                <span className="text-xs text-gray-500 italic">Banner Gradient, Accents</span>
              </div>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={brandColors.secondary}
                  onChange={(e) => handleColorChange('secondary', e.target.value)}
                  className="w-16 h-10 p-1 bg-white/5 border-white/10 cursor-pointer"
                />
                <Input
                  value={brandColors.secondary}
                  onChange={(e) => handleColorChange('secondary', e.target.value)}
                  className="flex-1 bg-white/5 border-white/10 text-white"
                  placeholder="#8b5cf6"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Used in banner gradients and secondary accents
              </p>
            </div>

            {/* Accent Color */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-white">Accent Color</Label>
                <span className="text-xs text-gray-500 italic">Links, Hover States</span>
              </div>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={brandColors.accent}
                  onChange={(e) => handleColorChange('accent', e.target.value)}
                  className="w-16 h-10 p-1 bg-white/5 border-white/10 cursor-pointer"
                />
                <Input
                  value={brandColors.accent}
                  onChange={(e) => handleColorChange('accent', e.target.value)}
                  className="flex-1 bg-white/5 border-white/10 text-white"
                  placeholder="#f59e0b"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Used for links, hover states, and call-to-actions
              </p>
            </div>
          </div>

          <Alert className="border-blue-500/20 bg-blue-500/10">
            <AlertCircle className="h-4 w-4 text-blue-400" />
            <AlertDescription className="text-gray-300 text-sm">
              <strong>Brand Colors:</strong> These colors are applied to buttons, badges, banners,
              and interactive elements throughout your program page. Changes here will override the
              theme template colors.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Page Theme - Background & Text Colors */}
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Page Theme
          </CardTitle>
          <p className="text-sm text-gray-400">
            Choose a preset theme or customize background and text colors
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme Mode Selector */}
          <div>
            <Label className="text-white mb-3 block">Theme Preset</Label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handleThemePresetChange('light')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  theme?.mode === 'light'
                    ? 'border-brand-primary bg-brand-primary/10'
                    : 'border-white/20 bg-white/5 hover:border-white/40'
                }`}
              >
                <div className="w-full h-20 rounded bg-white border border-gray-300 mb-2"></div>
                <p className="text-white font-medium text-sm">Light</p>
                <p className="text-gray-400 text-xs">White background</p>
              </button>

              <button
                onClick={() => handleThemePresetChange('dark')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  theme?.mode === 'dark'
                    ? 'border-brand-primary bg-brand-primary/10'
                    : 'border-white/20 bg-white/5 hover:border-white/40'
                }`}
              >
                <div className="w-full h-20 rounded bg-slate-900 border border-gray-700 mb-2"></div>
                <p className="text-white font-medium text-sm">Dark</p>
                <p className="text-gray-400 text-xs">Dark background</p>
              </button>

              <button
                onClick={() => handleThemePresetChange('custom')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  theme?.mode === 'custom'
                    ? 'border-brand-primary bg-brand-primary/10'
                    : 'border-white/20 bg-white/5 hover:border-white/40'
                }`}
              >
                <div className="w-full h-20 rounded bg-gradient-to-br from-purple-500 to-pink-500 mb-2"></div>
                <p className="text-white font-medium text-sm">Custom</p>
                <p className="text-gray-400 text-xs">Your colors</p>
              </button>
            </div>
          </div>

          {/* Custom Color Pickers (shown when Custom is selected) */}
          {theme?.mode === 'custom' && (
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div>
                <Label className="text-white mb-2 block">Background Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={theme.backgroundColor || '#ffffff'}
                    onChange={(e) => handleCustomThemeChange('backgroundColor', e.target.value)}
                    className="w-16 h-10 p-1 bg-white/5 border-white/10 cursor-pointer"
                  />
                  <Input
                    value={theme.backgroundColor || '#ffffff'}
                    onChange={(e) => handleCustomThemeChange('backgroundColor', e.target.value)}
                    className="flex-1 bg-white/5 border-white/10 text-white"
                    placeholder="#ffffff"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Main page background color</p>
              </div>

              <div>
                <Label className="text-white mb-2 block">Text Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={theme.textColor || '#111827'}
                    onChange={(e) => handleCustomThemeChange('textColor', e.target.value)}
                    className="w-16 h-10 p-1 bg-white/5 border-white/10 cursor-pointer"
                  />
                  <Input
                    value={theme.textColor || '#111827'}
                    onChange={(e) => handleCustomThemeChange('textColor', e.target.value)}
                    className="flex-1 bg-white/5 border-white/10 text-white"
                    placeholder="#111827"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Primary text color for headings and body
                </p>
              </div>

              <Alert className="border-yellow-500/20 bg-yellow-500/10">
                <AlertCircle className="h-4 w-4 text-yellow-400" />
                <AlertDescription className="text-gray-300 text-sm">
                  <strong>Tip:</strong> Ensure good contrast between background and text colors for
                  readability. Light backgrounds pair best with dark text, and dark backgrounds with
                  light text.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Color Preview Box */}
          <div
            className="p-6 rounded-lg border-2 border-white/20"
            style={{
              backgroundColor: theme?.backgroundColor || '#ffffff',
              color: theme?.textColor || '#111827',
            }}
          >
            <h3 className="font-bold text-lg mb-2">Preview</h3>
            <p className="text-sm opacity-80">
              This is how your text will look on your page background.
            </p>
            <div className="flex gap-2 mt-3 flex-wrap">
              <Badge
                style={{
                  backgroundColor: brandColors.primary + '20',
                  color: brandColors.primary,
                  borderColor: brandColors.primary + '40',
                }}
                className="border"
              >
                Primary Badge
              </Badge>
              <Badge
                style={{
                  backgroundColor: brandColors.secondary + '20',
                  color: brandColors.secondary,
                  borderColor: brandColors.secondary + '40',
                }}
                className="border"
              >
                Secondary Badge
              </Badge>
              <Badge
                style={{
                  backgroundColor: brandColors.accent + '20',
                  color: brandColors.accent,
                  borderColor: brandColors.accent + '40',
                }}
                className="border"
              >
                Accent Badge
              </Badge>
            </div>
            <div className="mt-3 space-y-2">
              <Button size="sm" style={{ backgroundColor: brandColors.primary, color: '#ffffff' }}>
                Primary Button
              </Button>
              <p className="text-xs opacity-60">
                <strong>Applied to:</strong> Program name badge, Active Campaign badges, Task
                badges, Enroll button, Share button, Tab highlights
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
