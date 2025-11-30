/**
 * Typography Toolbar - Figma-style visual controls for typography and layout customization
 * 
 * Replaces raw text inputs with intuitive visual controls:
 * - Font family dropdown with live font preview
 * - Font size slider with T+/T- buttons
 * - Visual font weight selector
 * - Line height slider with live preview
 * - Border radius visual picker
 * - Spacing mode toggle cards
 * - Typography template gallery
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Type, 
  Minus, 
  Plus, 
  AlignLeft, 
  Square, 
  Circle,
  Maximize2,
  LayoutGrid
} from "lucide-react";
import { 
  getAllTypographyTemplates, 
  type TypographyTemplate,
  type ThemeTemplate 
} from "@shared/theme-templates";

// Available web-safe and Google fonts
const FONT_OPTIONS = [
  { value: "Inter, -apple-system, BlinkMacSystemFont, sans-serif", label: "Inter", category: "Sans-serif" },
  { value: "'Roboto', 'Helvetica Neue', Arial, sans-serif", label: "Roboto", category: "Sans-serif" },
  { value: "'Open Sans', Arial, sans-serif", label: "Open Sans", category: "Sans-serif" },
  { value: "Montserrat, 'Arial Black', sans-serif", label: "Montserrat", category: "Sans-serif" },
  { value: "'Poppins', sans-serif", label: "Poppins", category: "Sans-serif" },
  { value: "Quicksand, 'Trebuchet MS', sans-serif", label: "Quicksand", category: "Sans-serif" },
  { value: "Nunito, 'Trebuchet MS', sans-serif", label: "Nunito", category: "Sans-serif" },
  { value: "'Playfair Display', Georgia, serif", label: "Playfair Display", category: "Serif" },
  { value: "Georgia, 'Times New Roman', serif", label: "Georgia", category: "Serif" },
  { value: "'Merriweather', Georgia, serif", label: "Merriweather", category: "Serif" },
  { value: "'Lora', Georgia, serif", label: "Lora", category: "Serif" },
  { value: "'Exo 2', sans-serif", label: "Exo 2", category: "Display" },
  { value: "Rajdhani, sans-serif", label: "Rajdhani", category: "Display" },
  { value: "'Orbitron', sans-serif", label: "Orbitron", category: "Display" },
];

const MONO_FONT_OPTIONS = [
  { value: "'SF Mono', 'Fira Code', Consolas, monospace", label: "SF Mono" },
  { value: "'Fira Code', Consolas, monospace", label: "Fira Code" },
  { value: "'Source Code Pro', Consolas, monospace", label: "Source Code Pro" },
  { value: "'Roboto Mono', 'Courier New', monospace", label: "Roboto Mono" },
  { value: "'Share Tech Mono', monospace", label: "Share Tech Mono" },
  { value: "Monaco, Courier, monospace", label: "Monaco" },
];

// Font size presets with labels
const FONT_SIZE_PRESETS = [
  { value: 0.75, label: "XS" },
  { value: 0.875, label: "SM" },
  { value: 1, label: "Base" },
  { value: 1.125, label: "LG" },
  { value: 1.25, label: "XL" },
  { value: 1.5, label: "2XL" },
  { value: 1.875, label: "3XL" },
  { value: 2.25, label: "4XL" },
  { value: 3, label: "5XL" },
];

// Font weight options with visual preview
const FONT_WEIGHT_OPTIONS = [
  { value: 300, label: "Light" },
  { value: 400, label: "Normal" },
  { value: 500, label: "Medium" },
  { value: 600, label: "Semibold" },
  { value: 700, label: "Bold" },
  { value: 800, label: "Extra Bold" },
];

// Border radius presets with visual icons
const BORDER_RADIUS_PRESETS = [
  { value: "none", label: "None", rem: "0" },
  { value: "sm", label: "Small", rem: "0.25rem" },
  { value: "md", label: "Medium", rem: "0.5rem" },
  { value: "lg", label: "Large", rem: "0.75rem" },
  { value: "xl", label: "XL", rem: "1rem" },
  { value: "2xl", label: "2XL", rem: "1.5rem" },
  { value: "full", label: "Full", rem: "9999px" },
];

// Spacing mode options
const SPACING_MODES = [
  { value: "tight", label: "Tight", description: "Compact spacing", scale: 0.85 },
  { value: "normal", label: "Normal", description: "Standard spacing", scale: 1 },
  { value: "relaxed", label: "Relaxed", description: "Generous spacing", scale: 1.25 },
];

interface TypographyToolbarProps {
  value: {
    typography?: ThemeTemplate['typography'];
    layout?: ThemeTemplate['layout'];
  };
  onChange: (updates: {
    typography?: Partial<ThemeTemplate['typography']>;
    layout?: Partial<ThemeTemplate['layout']>;
  }) => void;
}

export function TypographyToolbar({ value, onChange }: TypographyToolbarProps) {
  const typography = value.typography || {
    fontFamily: { heading: "Inter, sans-serif", body: "Inter, sans-serif", mono: "Monaco, monospace" },
    fontSize: { xs: "0.75rem", sm: "0.875rem", base: "1rem", lg: "1.125rem", xl: "1.25rem", "2xl": "1.5rem", "3xl": "1.875rem", "4xl": "2.25rem", "5xl": "3rem" },
    fontWeight: { light: 300, normal: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800 },
    lineHeight: { tight: 1.25, normal: 1.5, relaxed: 1.75, loose: 2 }
  };
  
  const layout = value.layout || {
    borderRadius: { none: "0", sm: "0.25rem", md: "0.5rem", lg: "0.75rem", xl: "1rem", "2xl": "1.5rem", full: "9999px" },
    spacing: { mode: "normal" as const, scale: 1 },
    shadow: { sm: "0 1px 2px rgba(0,0,0,0.05)", md: "0 4px 6px rgba(0,0,0,0.1)", lg: "0 10px 15px rgba(0,0,0,0.1)", xl: "0 20px 25px rgba(0,0,0,0.1)", inner: "inset 0 2px 4px rgba(0,0,0,0.06)" }
  };

  // Parse current base font size for slider
  const baseFontSize = parseFloat(typography.fontSize?.base || "1rem");
  const lineHeightNormal = typography.lineHeight?.normal || 1.5;
  const currentSpacingMode = layout.spacing?.mode || "normal";

  // Helper to get font label from value
  const getFontLabel = (fontValue: string) => {
    const font = FONT_OPTIONS.find(f => f.value === fontValue);
    return font?.label || fontValue.split(",")[0].replace(/['"]/g, "").trim();
  };

  return (
    <div className="space-y-6">
      {/* Typography Templates Gallery */}
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Type className="h-4 w-4" />
            Typography Templates
          </CardTitle>
          <p className="text-sm text-gray-400">Quick-apply a complete typography style</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {getAllTypographyTemplates().map((template) => (
              <button
                key={template.id}
                onClick={() => {
                  onChange({
                    typography: template.typography,
                    layout: template.layout as ThemeTemplate['layout']
                  });
                }}
                className="group p-3 rounded-lg border-2 border-white/20 bg-white/5 hover:border-brand-primary/50 hover:bg-white/10 transition-all text-left"
              >
                {/* Font Preview */}
                <div 
                  className="text-white text-lg mb-2 truncate"
                  style={{ fontFamily: template.typography.fontFamily.heading }}
                >
                  Aa
                </div>
                <p className="text-white font-medium text-sm">{template.name}</p>
                <p className="text-gray-400 text-xs line-clamp-1">{template.description}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Font Family Selectors */}
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Type className="h-4 w-4" />
            Font Families
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Heading Font */}
            <div>
              <Label className="text-gray-300 text-sm mb-2 block">Heading Font</Label>
              <Select
                value={typography.fontFamily?.heading || ""}
                onValueChange={(val) => onChange({
                  typography: {
                    ...typography,
                    fontFamily: { ...typography.fontFamily, heading: val }
                  }
                })}
              >
                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                  <SelectValue>
                    <span style={{ fontFamily: typography.fontFamily?.heading }}>
                      {getFontLabel(typography.fontFamily?.heading || "")}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/20">
                  {FONT_OPTIONS.map((font) => (
                    <SelectItem 
                      key={font.value} 
                      value={font.value}
                      className="text-white hover:bg-white/10"
                    >
                      <span style={{ fontFamily: font.value }}>{font.label}</span>
                      <span className="text-gray-500 text-xs ml-2">({font.category})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p 
                className="text-gray-400 text-sm mt-2 truncate"
                style={{ fontFamily: typography.fontFamily?.heading }}
              >
                The quick brown fox
              </p>
            </div>

            {/* Body Font */}
            <div>
              <Label className="text-gray-300 text-sm mb-2 block">Body Font</Label>
              <Select
                value={typography.fontFamily?.body || ""}
                onValueChange={(val) => onChange({
                  typography: {
                    ...typography,
                    fontFamily: { ...typography.fontFamily, body: val }
                  }
                })}
              >
                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                  <SelectValue>
                    <span style={{ fontFamily: typography.fontFamily?.body }}>
                      {getFontLabel(typography.fontFamily?.body || "")}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/20">
                  {FONT_OPTIONS.map((font) => (
                    <SelectItem 
                      key={font.value} 
                      value={font.value}
                      className="text-white hover:bg-white/10"
                    >
                      <span style={{ fontFamily: font.value }}>{font.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p 
                className="text-gray-400 text-sm mt-2 truncate"
                style={{ fontFamily: typography.fontFamily?.body }}
              >
                The quick brown fox
              </p>
            </div>

            {/* Mono Font */}
            <div>
              <Label className="text-gray-300 text-sm mb-2 block">Monospace Font</Label>
              <Select
                value={typography.fontFamily?.mono || ""}
                onValueChange={(val) => onChange({
                  typography: {
                    ...typography,
                    fontFamily: { ...typography.fontFamily, mono: val }
                  }
                })}
              >
                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                  <SelectValue>
                    <span style={{ fontFamily: typography.fontFamily?.mono }}>
                      {MONO_FONT_OPTIONS.find(f => f.value === typography.fontFamily?.mono)?.label || "Monaco"}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/20">
                  {MONO_FONT_OPTIONS.map((font) => (
                    <SelectItem 
                      key={font.value} 
                      value={font.value}
                      className="text-white hover:bg-white/10"
                    >
                      <span style={{ fontFamily: font.value }}>{font.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p 
                className="text-gray-400 text-sm mt-2 truncate font-mono"
                style={{ fontFamily: typography.fontFamily?.mono }}
              >
                const code = true;
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Font Size Controls */}
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Maximize2 className="h-4 w-4" />
            Font Size Scale
          </CardTitle>
          <p className="text-sm text-gray-400">Adjust the base font size - all sizes scale proportionally</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              className="border-white/20 text-white hover:bg-white/10 h-10 w-10"
              onClick={() => {
                const newBase = Math.max(0.75, baseFontSize - 0.125);
                const scale = newBase / 1; // Scale relative to 1rem base
                onChange({
                  typography: {
                    ...typography,
                    fontSize: {
                      xs: `${0.75 * scale}rem`,
                      sm: `${0.875 * scale}rem`,
                      base: `${newBase}rem`,
                      lg: `${1.125 * scale}rem`,
                      xl: `${1.25 * scale}rem`,
                      "2xl": `${1.5 * scale}rem`,
                      "3xl": `${1.875 * scale}rem`,
                      "4xl": `${2.25 * scale}rem`,
                      "5xl": `${3 * scale}rem`,
                    }
                  }
                });
              }}
            >
              <Minus className="h-4 w-4" />
            </Button>

            <div className="flex-1 space-y-2">
              <Slider
                value={[baseFontSize]}
                min={0.75}
                max={1.5}
                step={0.0625}
                onValueChange={([val]) => {
                  const scale = val / 1;
                  onChange({
                    typography: {
                      ...typography,
                      fontSize: {
                        xs: `${0.75 * scale}rem`,
                        sm: `${0.875 * scale}rem`,
                        base: `${val}rem`,
                        lg: `${1.125 * scale}rem`,
                        xl: `${1.25 * scale}rem`,
                        "2xl": `${1.5 * scale}rem`,
                        "3xl": `${1.875 * scale}rem`,
                        "4xl": `${2.25 * scale}rem`,
                        "5xl": `${3 * scale}rem`,
                      }
                    }
                  });
                }}
                className="[&_[role=slider]]:bg-brand-primary"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Smaller</span>
                <span className="text-white font-medium">{baseFontSize.toFixed(3)}rem</span>
                <span>Larger</span>
              </div>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="border-white/20 text-white hover:bg-white/10 h-10 w-10"
              onClick={() => {
                const newBase = Math.min(1.5, baseFontSize + 0.125);
                const scale = newBase / 1;
                onChange({
                  typography: {
                    ...typography,
                    fontSize: {
                      xs: `${0.75 * scale}rem`,
                      sm: `${0.875 * scale}rem`,
                      base: `${newBase}rem`,
                      lg: `${1.125 * scale}rem`,
                      xl: `${1.25 * scale}rem`,
                      "2xl": `${1.5 * scale}rem`,
                      "3xl": `${1.875 * scale}rem`,
                      "4xl": `${2.25 * scale}rem`,
                      "5xl": `${3 * scale}rem`,
                    }
                  }
                });
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Size Preview */}
          <div className="p-4 bg-white/5 rounded-lg space-y-2">
            <p className="text-gray-400 text-xs">Preview at different sizes:</p>
            <div className="space-y-1">
              <p className="text-white" style={{ fontSize: typography.fontSize?.sm, fontFamily: typography.fontFamily?.body }}>
                Small text (SM)
              </p>
              <p className="text-white" style={{ fontSize: typography.fontSize?.base, fontFamily: typography.fontFamily?.body }}>
                Base text (Base)
              </p>
              <p className="text-white font-semibold" style={{ fontSize: typography.fontSize?.xl, fontFamily: typography.fontFamily?.heading }}>
                Large heading (XL)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Font Weight Selector */}
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Type className="h-4 w-4" />
            Font Weights
          </CardTitle>
          <p className="text-sm text-gray-400">Select the default weight for headings</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {FONT_WEIGHT_OPTIONS.map((weight) => {
              const isSelected = typography.fontWeight?.bold === weight.value;
              return (
                <button
                  key={weight.value}
                  onClick={() => onChange({
                    typography: {
                      ...typography,
                      fontWeight: {
                        light: 300,
                        normal: 400,
                        medium: 500,
                        semibold: Math.min(weight.value, 600),
                        bold: weight.value,
                        extrabold: Math.min(weight.value + 100, 900),
                      }
                    }
                  })}
                  className={`p-3 rounded-lg border-2 transition-all text-center ${
                    isSelected
                      ? 'border-brand-primary bg-brand-primary/10'
                      : 'border-white/20 bg-white/5 hover:border-white/40'
                  }`}
                >
                  <span 
                    className="text-white text-2xl block mb-1"
                    style={{ 
                      fontWeight: weight.value,
                      fontFamily: typography.fontFamily?.heading 
                    }}
                  >
                    Aa
                  </span>
                  <span className="text-gray-400 text-xs">{weight.label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Line Height Control */}
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <AlignLeft className="h-4 w-4" />
            Line Height
          </CardTitle>
          <p className="text-sm text-gray-400">Adjust spacing between lines of text</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm w-16">Tight</span>
            <Slider
              value={[lineHeightNormal]}
              min={1.1}
              max={2.2}
              step={0.05}
              onValueChange={([val]) => {
                onChange({
                  typography: {
                    ...typography,
                    lineHeight: {
                      tight: Math.max(1, val - 0.25),
                      normal: val,
                      relaxed: val + 0.25,
                      loose: val + 0.5,
                    }
                  }
                });
              }}
              className="flex-1 [&_[role=slider]]:bg-brand-primary"
            />
            <span className="text-gray-400 text-sm w-16 text-right">Loose</span>
          </div>
          
          <div className="text-center">
            <Badge className="bg-white/10 text-white border-white/20">
              {lineHeightNormal.toFixed(2)}
            </Badge>
          </div>

          {/* Line Height Preview */}
          <div className="p-4 bg-white/5 rounded-lg">
            <p 
              className="text-white text-sm"
              style={{ 
                lineHeight: lineHeightNormal,
                fontFamily: typography.fontFamily?.body 
              }}
            >
              This is a preview of your line height setting. You can see how the spacing between lines affects readability. Good line height makes text easier to read, especially for longer paragraphs.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Border Radius Picker */}
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Square className="h-4 w-4" />
            Border Radius Style
          </CardTitle>
          <p className="text-sm text-gray-400">Choose the corner roundness for cards and buttons</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
            {BORDER_RADIUS_PRESETS.map((preset) => {
              const currentMd = layout.borderRadius?.md || "0.5rem";
              const isSelected = currentMd === preset.rem || 
                (preset.value === "none" && currentMd === "0") ||
                (preset.value === "full" && currentMd === "9999px");
              
              return (
                <button
                  key={preset.value}
                  onClick={() => {
                    const scales: Record<string, number> = {
                      none: 0,
                      sm: 0.5,
                      md: 1,
                      lg: 1.5,
                      xl: 2,
                      "2xl": 3,
                      full: 1
                    };
                    const baseRem = parseFloat(preset.rem) || 0.5;
                    
                    onChange({
                      layout: {
                        ...layout,
                        borderRadius: preset.value === "full" 
                          ? { none: "0", sm: "0.25rem", md: "0.5rem", lg: "0.75rem", xl: "1rem", "2xl": "1.5rem", full: "9999px" }
                          : preset.value === "none"
                          ? { none: "0", sm: "0", md: "0", lg: "0", xl: "0", "2xl": "0", full: "0" }
                          : {
                              none: "0",
                              sm: `${baseRem * 0.5}rem`,
                              md: preset.rem,
                              lg: `${baseRem * 1.5}rem`,
                              xl: `${baseRem * 2}rem`,
                              "2xl": `${baseRem * 3}rem`,
                              full: "9999px"
                            }
                      }
                    });
                  }}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-brand-primary bg-brand-primary/10'
                      : 'border-white/20 bg-white/5 hover:border-white/40'
                  }`}
                >
                  <div 
                    className="w-10 h-10 mx-auto mb-2 bg-brand-primary/40 border-2 border-brand-primary"
                    style={{ borderRadius: preset.rem }}
                  />
                  <span className="text-gray-400 text-xs block text-center">{preset.label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Spacing Mode */}
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <LayoutGrid className="h-4 w-4" />
            Content Spacing
          </CardTitle>
          <p className="text-sm text-gray-400">Control the overall density of your layout</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {SPACING_MODES.map((mode) => {
              const isSelected = currentSpacingMode === mode.value;
              return (
                <button
                  key={mode.value}
                  onClick={() => onChange({
                    layout: {
                      ...layout,
                      spacing: {
                        mode: mode.value as 'tight' | 'normal' | 'relaxed',
                        scale: mode.scale
                      }
                    }
                  })}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? 'border-brand-primary bg-brand-primary/10'
                      : 'border-white/20 bg-white/5 hover:border-white/40'
                  }`}
                >
                  {/* Visual representation of spacing */}
                  <div className="flex flex-col gap-1 mb-3" style={{ gap: `${mode.scale * 4}px` }}>
                    <div className="h-2 bg-white/30 rounded" style={{ width: '80%' }} />
                    <div className="h-2 bg-white/30 rounded" style={{ width: '60%' }} />
                    <div className="h-2 bg-white/30 rounded" style={{ width: '70%' }} />
                  </div>
                  <p className="text-white font-medium text-sm">{mode.label}</p>
                  <p className="text-gray-400 text-xs">{mode.description}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default TypographyToolbar;

