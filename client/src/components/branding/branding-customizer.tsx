import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Palette, Upload, Code, Eye, RotateCcw, Save,
  Image, Type, Sparkles, Monitor, Smartphone, Tablet, Loader2
} from "lucide-react";
import { useTenantTheme } from "./tenant-theme-provider";
import DynamicThemeInjector from "./dynamic-theme-injector";
import { useBrandingUpload } from "@/hooks/use-file-upload";

const fontOptions = [
  { value: "Inter, system-ui, sans-serif", name: "Inter (Default)" },
  { value: "ui-serif, Georgia, serif", name: "Georgia" },
  { value: "ui-monospace, Monaco, monospace", name: "Monaco" },
  { value: "'Poppins', sans-serif", name: "Poppins" },
  { value: "'Roboto', sans-serif", name: "Roboto" },
  { value: "'Open Sans', sans-serif", name: "Open Sans" },
  { value: "'Playfair Display', serif", name: "Playfair Display" },
  { value: "'Montserrat', sans-serif", name: "Montserrat" }
];

const gradientDirections = [
  { value: "to-right", name: "Left to Right" },
  { value: "to-bottom", name: "Top to Bottom" },
  { value: "to-bottom-right", name: "Diagonal" },
  { value: "radial", name: "Radial" }
];

const colorPresets = [
  { name: "Purple Dream", primary: "#8B5CF6", secondary: "#06B6D4", accent: "#10B981" },
  { name: "Ocean Blue", primary: "#0EA5E9", secondary: "#8B5CF6", accent: "#F59E0B" },
  { name: "Sunset Orange", primary: "#F97316", secondary: "#EF4444", accent: "#8B5CF6" },
  { name: "Forest Green", primary: "#059669", secondary: "#0D9488", accent: "#F59E0B" },
  { name: "Rose Gold", primary: "#EC4899", secondary: "#F59E0B", accent: "#8B5CF6" },
  { name: "Midnight", primary: "#1F2937", secondary: "#374151", accent: "#60A5FA" },
  { name: "NIL Gold", primary: "#D97706", secondary: "#B45309", accent: "#059669" },
  { name: "Athletic Red", primary: "#DC2626", secondary: "#B91C1C", accent: "#0EA5E9" }
];

interface BrandingCustomizerProps {
  tenantId: string;
  onSave?: (branding: any) => void;
}

export default function BrandingCustomizer({ tenantId, onSave }: BrandingCustomizerProps) {
  const { currentBranding, previewBranding, resetBranding } = useTenantTheme();
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [activeTab, setActiveTab] = useState('colors');
  const [customCSS, setCustomCSS] = useState(currentBranding?.customCSS || '');
  const [isLivePreview, setIsLivePreview] = useState(true);

  const [brandingData, setBrandingData] = useState({
    primaryColor: currentBranding?.primaryColor || "#8B5CF6",
    secondaryColor: currentBranding?.secondaryColor || "#06B6D4",
    accentColor: currentBranding?.accentColor || "#10B981",
    fontFamily: currentBranding?.fontFamily || "Inter, system-ui, sans-serif",
    gradientDirection: currentBranding?.gradientDirection || "to-bottom-right",
    logo: currentBranding?.logo || "",
    favicon: currentBranding?.favicon || "",
    backgroundImage: currentBranding?.backgroundImage || "",
    customCSS: currentBranding?.customCSS || ""
  });

  // File upload hooks and refs
  const logoFileRef = useRef<HTMLInputElement>(null);
  const faviconFileRef = useRef<HTMLInputElement>(null);
  const backgroundFileRef = useRef<HTMLInputElement>(null);

  const logoUpload = useBrandingUpload((url) => handleBrandingChange('logo', url));
  const faviconUpload = useBrandingUpload((url) => handleBrandingChange('favicon', url));
  const backgroundUpload = useBrandingUpload((url) => handleBrandingChange('backgroundImage', url));

  const handleBrandingChange = useCallback((field: string, value: any) => {
    const newBranding = { ...brandingData, [field]: value };
    setBrandingData(newBranding);
    
    if (isLivePreview) {
      previewBranding(newBranding);
    }
  }, [brandingData, isLivePreview, previewBranding]);

  const applyColorPreset = (preset: typeof colorPresets[0]) => {
    const newBranding = {
      ...brandingData,
      primaryColor: preset.primary,
      secondaryColor: preset.secondary,
      accentColor: preset.accent
    };
    setBrandingData(newBranding);
    
    if (isLivePreview) {
      previewBranding(newBranding);
    }
  };

  const handleSave = () => {
    onSave?.(brandingData);
  };

  const handleReset = () => {
    resetBranding();
    setBrandingData({
      primaryColor: "#8B5CF6",
      secondaryColor: "#06B6D4", 
      accentColor: "#10B981",
      fontFamily: "Inter, system-ui, sans-serif",
      gradientDirection: "to-bottom-right",
      logo: "",
      favicon: "",
      backgroundImage: "",
      customCSS: ""
    });
  };

  return (
    <div className="h-full flex">
      {/* Dynamic Theme Injection */}
      <DynamicThemeInjector
        primaryColor={brandingData.primaryColor}
        secondaryColor={brandingData.secondaryColor}
        accentColor={brandingData.accentColor}
        fontFamily={brandingData.fontFamily}
        customCSS={brandingData.customCSS}
        backgroundImage={brandingData.backgroundImage}
        gradientDirection={brandingData.gradientDirection}
      />
      
      {/* Customizer Panel */}
      <div className="w-80 bg-white/10 border-r border-white/20 p-6 overflow-y-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Palette className="h-5 w-5 text-brand-primary" />
              Branding
            </h2>
            <div className="flex items-center gap-2">
              <Switch
                checked={isLivePreview}
                onCheckedChange={setIsLivePreview}
                className="data-[state=checked]:bg-brand-primary"
              />
              <Label className="text-gray-300 text-sm">Live Preview</Label>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1 gradient-primary text-[#101636] font-bold">
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button onClick={handleReset} variant="outline" className="border-white/20 text-white">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 bg-white/10">
            <TabsTrigger value="colors" className="text-xs">Colors</TabsTrigger>
            <TabsTrigger value="assets" className="text-xs">Assets</TabsTrigger>
            <TabsTrigger value="typography" className="text-xs">Type</TabsTrigger>
            <TabsTrigger value="advanced" className="text-xs">CSS</TabsTrigger>
          </TabsList>

          <TabsContent value="colors" className="space-y-6 mt-6">
            {/* Color Presets */}
            <div>
              <Label className="text-gray-300 mb-3 block">Color Presets</Label>
              <div className="grid grid-cols-2 gap-2">
                {colorPresets.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => applyColorPreset(preset)}
                    className="p-2 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex gap-1 mb-1">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: preset.primary }}
                      />
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: preset.secondary }}
                      />
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: preset.accent }}
                      />
                    </div>
                    <span className="text-gray-300 text-xs">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Colors */}
            <div className="space-y-4">
              <div>
                <Label className="text-gray-300">Primary Color</Label>
                <div className="flex items-center gap-3 mt-2">
                  <input
                    type="color"
                    value={brandingData.primaryColor}
                    onChange={(e) => handleBrandingChange('primaryColor', e.target.value)}
                    className="w-12 h-10 rounded-lg border border-white/20 cursor-pointer"
                  />
                  <Input
                    value={brandingData.primaryColor}
                    onChange={(e) => handleBrandingChange('primaryColor', e.target.value)}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              </div>

              <div>
                <Label className="text-gray-300">Secondary Color</Label>
                <div className="flex items-center gap-3 mt-2">
                  <input
                    type="color"
                    value={brandingData.secondaryColor}
                    onChange={(e) => handleBrandingChange('secondaryColor', e.target.value)}
                    className="w-12 h-10 rounded-lg border border-white/20 cursor-pointer"
                  />
                  <Input
                    value={brandingData.secondaryColor}
                    onChange={(e) => handleBrandingChange('secondaryColor', e.target.value)}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              </div>

              <div>
                <Label className="text-gray-300">Accent Color</Label>
                <div className="flex items-center gap-3 mt-2">
                  <input
                    type="color"
                    value={brandingData.accentColor}
                    onChange={(e) => handleBrandingChange('accentColor', e.target.value)}
                    className="w-12 h-10 rounded-lg border border-white/20 cursor-pointer"
                  />
                  <Input
                    value={brandingData.accentColor}
                    onChange={(e) => handleBrandingChange('accentColor', e.target.value)}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              </div>

              <div>
                <Label className="text-gray-300">Gradient Direction</Label>
                <Select 
                  value={brandingData.gradientDirection} 
                  onValueChange={(value) => handleBrandingChange('gradientDirection', value)}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {gradientDirections.map((direction) => (
                      <SelectItem key={direction.value} value={direction.value}>
                        {direction.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="assets" className="space-y-6 mt-6">
            <div>
              <Label className="text-gray-300">Logo URL</Label>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  value={brandingData.logo}
                  onChange={(e) => handleBrandingChange('logo', e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="bg-white/10 border-white/20 text-white"
                />
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="border-white/20 text-white"
                  onClick={() => logoFileRef.current?.click()}
                  disabled={logoUpload.isUploading}
                >
                  {logoUpload.isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                </Button>
                <input
                  ref={logoFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) logoUpload.handleFileSelect(file);
                  }}
                />
              </div>
            </div>

            <div>
              <Label className="text-gray-300">Favicon URL</Label>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  value={brandingData.favicon}
                  onChange={(e) => handleBrandingChange('favicon', e.target.value)}
                  placeholder="https://example.com/favicon.ico"
                  className="bg-white/10 border-white/20 text-white"
                />
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="border-white/20 text-white"
                  onClick={() => faviconFileRef.current?.click()}
                  disabled={faviconUpload.isUploading}
                >
                  {faviconUpload.isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                </Button>
                <input
                  ref={faviconFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) faviconUpload.handleFileSelect(file);
                  }}
                />
              </div>
            </div>

            <div>
              <Label className="text-gray-300">Background Image URL</Label>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  value={brandingData.backgroundImage}
                  onChange={(e) => handleBrandingChange('backgroundImage', e.target.value)}
                  placeholder="https://example.com/background.jpg"
                  className="bg-white/10 border-white/20 text-white"
                />
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="border-white/20 text-white"
                  onClick={() => backgroundFileRef.current?.click()}
                  disabled={backgroundUpload.isUploading}
                >
                  {backgroundUpload.isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                </Button>
                <input
                  ref={backgroundFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) backgroundUpload.handleFileSelect(file);
                  }}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="typography" className="space-y-6 mt-6">
            <div>
              <Label className="text-gray-300">Font Family</Label>
              <Select 
                value={brandingData.fontFamily} 
                onValueChange={(value) => handleBrandingChange('fontFamily', value)}
              >
                <SelectTrigger className="bg-white/10 border-white/20 text-white mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fontOptions.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      <span style={{ fontFamily: font.value }}>{font.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 bg-white/5 rounded-lg">
              <Label className="text-gray-300 text-sm">Typography Preview</Label>
              <div className="mt-3 space-y-2" style={{ fontFamily: brandingData.fontFamily }}>
                <h1 className="text-2xl font-bold text-white">Heading 1</h1>
                <h2 className="text-xl font-semibold text-white">Heading 2</h2>
                <p className="text-gray-300">Body text preview with the selected font family. This is how regular paragraph text will appear.</p>
                <p className="text-sm text-gray-400">Small text for captions and labels.</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6 mt-6">
            <div>
              <Label className="text-gray-300">Custom CSS</Label>
              <Textarea
                value={customCSS}
                onChange={(e) => {
                  setCustomCSS(e.target.value);
                  handleBrandingChange('customCSS', e.target.value);
                }}
                placeholder="/* Custom CSS rules */
.custom-button {
  background: linear-gradient(45deg, var(--brand-primary), var(--brand-secondary));
}

:root {
  --custom-spacing: 2rem;
}"
                className="bg-white/10 border-white/20 text-white font-mono text-sm h-64 resize-none mt-2"
              />
              <p className="text-gray-400 text-xs mt-2">
                Use CSS custom properties like --brand-primary, --brand-secondary, --brand-accent
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Preview Area */}
      <div className="flex-1 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Live Preview</h3>
          <div className="flex items-center gap-2">
            <Button
              variant={previewMode === 'desktop' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPreviewMode('desktop')}
              className="border-white/20"
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button
              variant={previewMode === 'tablet' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPreviewMode('tablet')}
              className="border-white/20"
            >
              <Tablet className="h-4 w-4" />
            </Button>
            <Button
              variant={previewMode === 'mobile' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPreviewMode('mobile')}
              className="border-white/20"
            >
              <Smartphone className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className={`bg-white/5 rounded-lg p-4 ${
          previewMode === 'mobile' ? 'max-w-sm mx-auto' :
          previewMode === 'tablet' ? 'max-w-2xl mx-auto' :
          'w-full'
        }`}>
          {/* Preview Content */}
          <Card className="bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-3">
                {brandingData.logo && (
                  <img src={brandingData.logo} alt="Logo" className="w-8 h-8 rounded" />
                )}
                <span style={{ color: brandingData.primaryColor }}>
                  Your Loyalty Store
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div 
                    className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: brandingData.primaryColor }}
                  >
                    1K
                  </div>
                  <p className="text-gray-300 text-sm">Members</p>
                </div>
                <div className="text-center">
                  <div 
                    className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: brandingData.secondaryColor }}
                  >
                    15
                  </div>
                  <p className="text-gray-300 text-sm">Campaigns</p>
                </div>
                <div className="text-center">
                  <div 
                    className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: brandingData.accentColor }}
                  >
                    50
                  </div>
                  <p className="text-gray-300 text-sm">Rewards</p>
                </div>
              </div>

              <div className="space-y-2">
                <Button 
                  className="w-full text-white"
                  style={{ 
                    background: `linear-gradient(${brandingData.gradientDirection === 'radial' ? 'radial-gradient' : brandingData.gradientDirection}, ${brandingData.primaryColor}, ${brandingData.secondaryColor})` 
                  }}
                >
                  Join Loyalty Program
                </Button>
                
                <div className="flex gap-2">
                  <Badge style={{ backgroundColor: brandingData.primaryColor, color: 'white' }}>
                    VIP Member
                  </Badge>
                  <Badge 
                    variant="outline" 
                    style={{ borderColor: brandingData.accentColor, color: brandingData.accentColor }}
                  >
                    {brandingData.accentColor} Accent
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}