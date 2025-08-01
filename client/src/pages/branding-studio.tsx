import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Palette, Sparkles, Wand2, Eye, Download, Share2,
  Crown, Zap, Star, ArrowLeft
} from "lucide-react";
import BrandingCustomizer from "@/components/branding/branding-customizer";
import { TenantThemeProvider } from "@/components/branding/tenant-theme-provider";

const brandingFeatures = [
  {
    icon: Palette,
    title: "Custom Color Schemes",
    description: "Choose from preset palettes or create your own brand colors",
    color: "from-pink-500 to-rose-500"
  },
  {
    icon: Sparkles,
    title: "Live Preview",
    description: "See changes instantly across desktop, tablet, and mobile",
    color: "from-purple-500 to-indigo-500"
  },
  {
    icon: Wand2,
    title: "Advanced CSS",
    description: "Add custom CSS for complete design control",
    color: "from-blue-500 to-cyan-500"
  },
  {
    icon: Crown,
    title: "White Label Ready",
    description: "Remove Fandomly branding for enterprise customers",
    color: "from-amber-500 to-orange-500"
  }
];

const inspirationGallery = [
  {
    name: "Athletic Thunder",
    category: "Football",
    colors: { primary: "#1F2937", secondary: "#F59E0B", accent: "#EF4444" },
    preview: "Thunder-themed loyalty program with bold orange and red accents"
  },
  {
    name: "Luna Vibes",
    category: "Music",
    colors: { primary: "#8B5CF6", secondary: "#EC4899", accent: "#06B6D4" },
    preview: "Dreamy purple and pink theme perfect for musicians and creators"
  },
  {
    name: "Aerial Ace",
    category: "Olympic",
    colors: { primary: "#059669", secondary: "#0D9488", accent: "#F59E0B" },
    preview: "Clean, athletic design inspired by aerial sports"
  },
  {
    name: "Victory Gold",
    category: "Basketball", 
    colors: { primary: "#D97706", secondary: "#B45309", accent: "#1F2937" },
    preview: "Champion-inspired gold and black color scheme"
  }
];

export default function BrandingStudio() {
  const [currentView, setCurrentView] = useState<'gallery' | 'customizer'>('gallery');
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);

  if (currentView === 'customizer' && selectedTenant) {
    return (
      <TenantThemeProvider tenantId={selectedTenant}>
        <div className="min-h-screen bg-brand-dark-bg">
          <div className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <Button
                onClick={() => setCurrentView('gallery')}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Studio
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-white">Branding Customizer</h1>
                <p className="text-gray-300">Customize your store's visual identity</p>
              </div>
            </div>
          </div>
          
          <div className="h-[calc(100vh-120px)]">
            <BrandingCustomizer
              tenantId={selectedTenant}
              onSave={(branding) => {
                console.log('Saving branding:', branding);
                // TODO: Save to API
              }}
            />
          </div>
        </div>
      </TenantThemeProvider>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark-bg p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold gradient-text mb-4">
            Branding Studio
          </h1>
          <p className="text-gray-300 text-lg max-w-3xl mx-auto">
            Create stunning, personalized branding for your loyalty store. 
            Every detail customizable, from colors to typography to custom CSS.
          </p>
        </div>

        {/* Features Overview */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {brandingFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="bg-white/10 border-white/20 hover:scale-105 transition-transform">
                <CardContent className="p-6 text-center">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mx-auto mb-4`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-300 text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-4 justify-center mb-12">
          <Button 
            onClick={() => {
              setSelectedTenant('demo-tenant');
              setCurrentView('customizer');
            }}
            className="gradient-primary text-white"
          >
            <Wand2 className="h-4 w-4 mr-2" />
            Start Customizing
          </Button>
          <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
            <Eye className="h-4 w-4 mr-2" />
            Preview Templates
          </Button>
          <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
            <Download className="h-4 w-4 mr-2" />
            Export Theme
          </Button>
          <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
            <Share2 className="h-4 w-4 mr-2" />
            Share Design
          </Button>
        </div>

        {/* Inspiration Gallery */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Design Inspiration</h2>
            <Badge className="bg-brand-primary text-white">
              <Sparkles className="h-3 w-3 mr-1" />
              Featured Themes
            </Badge>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {inspirationGallery.map((theme, index) => (
              <Card 
                key={index}
                className="bg-white/10 border-white/20 cursor-pointer hover:scale-105 transition-all duration-300 group"
                onClick={() => {
                  // Apply this theme as a starting point
                  setSelectedTenant('demo-tenant');
                  setCurrentView('customizer');
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex gap-2 mb-3">
                    <div 
                      className="w-6 h-6 rounded-full" 
                      style={{ backgroundColor: theme.colors.primary }}
                    />
                    <div 
                      className="w-6 h-6 rounded-full" 
                      style={{ backgroundColor: theme.colors.secondary }}
                    />
                    <div 
                      className="w-6 h-6 rounded-full" 
                      style={{ backgroundColor: theme.colors.accent }}
                    />
                  </div>
                  <CardTitle className="text-white text-lg">{theme.name}</CardTitle>
                  <Badge variant="secondary" className="w-fit">
                    {theme.category}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 text-sm mb-4">{theme.preview}</p>
                  
                  {/* Mini preview */}
                  <div className="bg-white/5 rounded-lg p-3 space-y-2">
                    <div 
                      className="h-2 rounded-full"
                      style={{ 
                        background: `linear-gradient(to right, ${theme.colors.primary}, ${theme.colors.secondary})` 
                      }}
                    />
                    <div className="flex gap-1">
                      <div 
                        className="h-1 flex-1 rounded"
                        style={{ backgroundColor: theme.colors.primary }}
                      />
                      <div 
                        className="h-1 flex-1 rounded"
                        style={{ backgroundColor: theme.colors.accent }}
                      />
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full mt-3 opacity-0 group-hover:opacity-100 transition-opacity"
                    size="sm"
                    style={{ 
                      backgroundColor: theme.colors.primary,
                      color: 'white'
                    }}
                  >
                    Use This Theme
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Capabilities Showcase */}
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Star className="h-6 w-6 text-brand-primary" />
                Professional Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-brand-primary rounded-full" />
                  <span className="text-gray-300">Real-time color customization</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-brand-secondary rounded-full" />
                  <span className="text-gray-300">Custom logo and favicon upload</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-brand-accent rounded-full" />
                  <span className="text-gray-300">Typography and font selection</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  <span className="text-gray-300">Advanced CSS customization</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                  <span className="text-gray-300">Responsive design preview</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Zap className="h-6 w-6 text-brand-secondary" />
                Enterprise Ready
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-brand-primary rounded-full" />
                  <span className="text-gray-300">White-label solution</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-brand-secondary rounded-full" />
                  <span className="text-gray-300">Custom domain support</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-brand-accent rounded-full" />
                  <span className="text-gray-300">Brand consistency across platforms</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  <span className="text-gray-300">Export and import themes</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                  <span className="text-gray-300">Multi-tenant isolation</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}