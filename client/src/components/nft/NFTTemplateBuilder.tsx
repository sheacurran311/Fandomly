import { useState } from 'react';
import { Plus, X, Image as ImageIcon, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useCreateNftTemplate, type NftTemplate } from '@/hooks/useCrossmint';

// ============================================================================
// NFT CATEGORIES (Snag-inspired)
// ============================================================================

const NFT_CATEGORIES = [
  { id: 'badge_credential', name: 'Badges & Credentials', icon: '🏅', description: 'Achievement badges and credentials' },
  { id: 'digital_art', name: 'Digital Art', icon: '🎨', description: 'Artwork and creative pieces' },
  { id: 'collectible', name: 'Collectibles', icon: '💎', description: 'Collectible items and memorabilia' },
  { id: 'reward_perk', name: 'Rewards & Perks', icon: '🎁', description: 'Exclusive perks and benefits' },
  { id: 'event_ticket', name: 'Event Tickets', icon: '🎫', description: 'Access passes and tickets' },
  { id: 'custom', name: 'Custom', icon: '✨', description: 'Custom NFT type' },
];

// ============================================================================
// MAIN TEMPLATE BUILDER DIALOG
// ============================================================================

interface NFTTemplateBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId: string;
  onSuccess?: (template: any) => void;
}

export default function NFTTemplateBuilder({
  open,
  onOpenChange,
  collectionId,
  onSuccess,
}: NFTTemplateBuilderProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<{
    category: string;
    name: string;
    description: string;
    image: string;
    attributes: Array<{ trait_type: string; value: string }>;
    mintPrice: number;
    maxSupply: number | null;
    rarity: string;
    isDraft: boolean;
  }>({
    category: 'custom',
    name: '',
    description: '',
    image: '',
    attributes: [],
    mintPrice: 0,
    maxSupply: null,
    rarity: 'common',
    isDraft: true,
  });

  const createMutation = useCreateNftTemplate();
  const { toast } = useToast();

  const resetForm = () => {
    setFormData({
      category: 'custom',
      name: '',
      description: '',
      image: '',
      attributes: [],
      mintPrice: 0,
      maxSupply: null,
      rarity: 'common',
      isDraft: true,
    });
    setCurrentStep(1);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.image) {
      toast({
        title: 'Validation Error',
        description: 'Name and image are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await createMutation.mutateAsync({
        collectionId,
        name: formData.name,
        description: formData.description || undefined,
        category: formData.category,
        metadata: {
          image: formData.image,
          attributes: formData.attributes,
          rarity: formData.rarity,
        },
        mintPrice: formData.mintPrice,
        maxSupply: formData.maxSupply || undefined,
        isDraft: formData.isDraft,
      });

      toast({
        title: 'Template Created',
        description: 'Your NFT template has been created successfully',
      });

      if (onSuccess) {
        onSuccess(result.template);
      }

      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Creation Failed',
        description: error.message || 'Failed to create template',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create NFT Template</DialogTitle>
          <DialogDescription>
            Design your NFT template with metadata, attributes, and supply settings
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step === currentStep
                    ? 'bg-brand-primary text-white'
                    : step < currentStep
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-700 text-gray-400'
                }`}
              >
                {step}
              </div>
              {step < 3 && <div className={`w-12 h-0.5 ${step < currentStep ? 'bg-green-500' : 'bg-gray-700'}`} />}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="space-y-6">
          {currentStep === 1 && <CategorySelectionStep formData={formData} setFormData={setFormData} />}
          {currentStep === 2 && <MetadataConfigurationStep formData={formData} setFormData={setFormData} />}
          {currentStep === 3 && <SupplyConfigurationStep formData={formData} setFormData={setFormData} />}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t border-white/10">
          <Button
            variant="outline"
            onClick={() => {
              if (currentStep === 1) {
                onOpenChange(false);
                resetForm();
              } else {
                setCurrentStep(currentStep - 1);
              }
            }}
          >
            {currentStep === 1 ? 'Cancel' : 'Previous'}
          </Button>

          <div className="flex gap-2">
            {currentStep < 3 ? (
              <Button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="bg-brand-primary hover:bg-brand-primary/80"
                disabled={!canProceedToNextStep(currentStep, formData)}
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                className="bg-brand-primary hover:bg-brand-primary/80"
                data-testid="button-create-template"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Template'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// STEP 1: CATEGORY SELECTION
// ============================================================================

interface StepProps {
  formData: any;
  setFormData: (data: any) => void;
}

function CategorySelectionStep({ formData, setFormData }: StepProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">Select NFT Category</h3>
        <p className="text-sm text-gray-400">Choose the category that best describes your NFT</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {NFT_CATEGORIES.map((category) => (
          <Card
            key={category.id}
            className={`cursor-pointer transition-all ${
              formData.category === category.id
                ? 'bg-brand-primary/20 border-brand-primary'
                : 'bg-white/5 border-white/10 hover:border-brand-primary/50'
            }`}
            onClick={() => setFormData({ ...formData, category: category.id })}
          >
            <CardContent className="p-4 text-center">
              <div className="text-3xl mb-2">{category.icon}</div>
              <h4 className="font-semibold text-white text-sm mb-1">{category.name}</h4>
              <p className="text-xs text-gray-400">{category.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// STEP 2: METADATA CONFIGURATION
// ============================================================================

function MetadataConfigurationStep({ formData, setFormData }: StepProps) {
  const addAttribute = () => {
    setFormData({
      ...formData,
      attributes: [...formData.attributes, { trait_type: '', value: '' }],
    });
  };

  const removeAttribute = (index: number) => {
    const newAttributes = formData.attributes.filter((_: any, i: number) => i !== index);
    setFormData({ ...formData, attributes: newAttributes });
  };

  const updateAttribute = (index: number, field: 'trait_type' | 'value', value: string) => {
    const newAttributes = [...formData.attributes];
    newAttributes[index][field] = value;
    setFormData({ ...formData, attributes: newAttributes });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">NFT Metadata</h3>
        <p className="text-sm text-gray-400">Define the core information for your NFT</p>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">NFT Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Gold Member Badge"
          required
          data-testid="input-template-name"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe your NFT..."
          rows={3}
          data-testid="input-template-description"
        />
      </div>

      {/* Image URL */}
      <div className="space-y-2">
        <Label htmlFor="image">Image URL *</Label>
        <Input
          id="image"
          value={formData.image}
          onChange={(e) => setFormData({ ...formData, image: e.target.value })}
          placeholder="https://example.com/image.png or ipfs://..."
          required
          data-testid="input-template-image"
        />
        {formData.image && (
          <div className="mt-2">
            <img
              src={formData.image}
              alt="Preview"
              className="w-32 h-32 object-cover rounded-lg border border-white/10"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}
      </div>

      {/* Rarity */}
      <div className="space-y-2">
        <Label htmlFor="rarity">Rarity</Label>
        <Select value={formData.rarity} onValueChange={(value) => setFormData({ ...formData, rarity: value })}>
          <SelectTrigger data-testid="select-rarity">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="common">Common</SelectItem>
            <SelectItem value="uncommon">Uncommon</SelectItem>
            <SelectItem value="rare">Rare</SelectItem>
            <SelectItem value="epic">Epic</SelectItem>
            <SelectItem value="legendary">Legendary</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Attributes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Attributes (Optional)</Label>
          <Button type="button" variant="outline" size="sm" onClick={addAttribute}>
            <Plus className="w-4 h-4 mr-1" />
            Add Attribute
          </Button>
        </div>

        {formData.attributes.map((attr: any, index: number) => (
          <div key={index} className="flex gap-2 items-center">
            <Input
              placeholder="Trait Type (e.g., Level)"
              value={attr.trait_type}
              onChange={(e) => updateAttribute(index, 'trait_type', e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Value (e.g., 5)"
              value={attr.value}
              onChange={(e) => updateAttribute(index, 'value', e.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeAttribute(index)}
              className="text-red-400 hover:text-red-300"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// STEP 3: SUPPLY CONFIGURATION
// ============================================================================

function SupplyConfigurationStep({ formData, setFormData }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">Supply & Pricing</h3>
        <p className="text-sm text-gray-400">Configure how your NFT can be minted</p>
      </div>

      {/* Mint Price */}
      <div className="space-y-2">
        <Label htmlFor="mintPrice">Mint Price (Points)</Label>
        <Input
          id="mintPrice"
          type="number"
          min="0"
          value={formData.mintPrice}
          onChange={(e) => setFormData({ ...formData, mintPrice: parseInt(e.target.value) || 0 })}
          placeholder="0"
          data-testid="input-mint-price"
        />
        <p className="text-xs text-gray-400">Cost in points to mint this NFT (0 = free)</p>
      </div>

      {/* Max Supply */}
      <div className="space-y-2">
        <Label htmlFor="maxSupply">Maximum Supply</Label>
        <Input
          id="maxSupply"
          type="number"
          min="1"
          value={formData.maxSupply || ''}
          onChange={(e) => setFormData({ ...formData, maxSupply: e.target.value ? parseInt(e.target.value) : null })}
          placeholder="Unlimited"
          data-testid="input-max-supply"
        />
        <p className="text-xs text-gray-400">Leave empty for unlimited supply</p>
      </div>

      {/* Draft Status */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isDraft"
          checked={formData.isDraft}
          onChange={(e) => setFormData({ ...formData, isDraft: e.target.checked })}
          className="w-4 h-4"
        />
        <Label htmlFor="isDraft" className="cursor-pointer">
          Save as draft (not published)
        </Label>
      </div>

      {/* Preview Card */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4">
          <h4 className="font-semibold text-white mb-3">Template Preview</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Name:</span>
              <span className="text-white">{formData.name || 'Not set'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Category:</span>
              <Badge variant="secondary">{formData.category}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Rarity:</span>
              <Badge variant="outline">{formData.rarity}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Mint Price:</span>
              <span className="text-white">{formData.mintPrice} points</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Max Supply:</span>
              <span className="text-white">{formData.maxSupply || 'Unlimited'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Attributes:</span>
              <span className="text-white">{formData.attributes.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function canProceedToNextStep(step: number, formData: any): boolean {
  if (step === 1) {
    return !!formData.category;
  }
  if (step === 2) {
    return !!formData.name && !!formData.image;
  }
  return true;
}

