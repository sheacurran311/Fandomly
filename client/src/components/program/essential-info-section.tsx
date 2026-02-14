/**
 * EssentialInfoSection - Combined essential program info inputs
 * 
 * Features:
 * - Program name input
 * - Bio/description textarea
 * - Points name dropdown with suggestions + custom option
 * - Logo upload
 * - Header image upload
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUpload } from "@/components/ui/image-upload";
import { FileText, Image as ImageIcon, Coins, Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCreatorTemplate, type CreatorType } from "./creator-program-templates";

export interface EssentialInfoData {
  displayName: string;
  bio: string;
  pointsName: string;
  logo: string;
  headerImage: string;
}

export interface EssentialInfoSectionProps {
  data: EssentialInfoData;
  creatorType: CreatorType;
  onChange: (updates: Partial<EssentialInfoData>) => void;
  className?: string;
}

export function EssentialInfoSection({
  data,
  creatorType,
  onChange,
  className,
}: EssentialInfoSectionProps) {
  const [customPointsName, setCustomPointsName] = useState(false);
  const template = getCreatorTemplate(creatorType);

  // Check if current points name is a preset or custom
  const isCustomPointsName = !template.pointsNameOptions
    .filter(opt => opt !== 'Custom')
    .includes(data.pointsName);

  const handlePointsNameChange = (value: string) => {
    if (value === 'Custom') {
      setCustomPointsName(true);
      // Keep current value or set empty
      if (template.pointsNameOptions.filter(opt => opt !== 'Custom').includes(data.pointsName)) {
        onChange({ pointsName: '' });
      }
    } else {
      setCustomPointsName(false);
      onChange({ pointsName: value });
    }
  };

  return (
    <Card className={cn("bg-white/5 backdrop-blur-lg border-white/10", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-brand-primary/10">
            <FileText className="h-5 w-5 text-brand-primary" />
          </div>
          <div>
            <CardTitle className="text-white text-lg">Program Details</CardTitle>
            <p className="text-sm text-gray-400">
              Set up the essential information for your program
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Name and Points Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Program Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-white flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-gray-400" />
              Program Name
            </Label>
            <Input
              id="displayName"
              value={data.displayName}
              onChange={(e) => onChange({ displayName: e.target.value })}
              placeholder="My Awesome Program"
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
            />
            <p className="text-xs text-gray-500">This is displayed on your public program page</p>
          </div>

          {/* Points Name */}
          <div className="space-y-2">
            <Label htmlFor="pointsName" className="text-white flex items-center gap-2">
              <Coins className="h-4 w-4 text-gray-400" />
              Points Currency Name
            </Label>
            {customPointsName || isCustomPointsName ? (
              <div className="flex gap-2">
                <Input
                  value={data.pointsName}
                  onChange={(e) => onChange({ pointsName: e.target.value })}
                  placeholder="Enter custom name"
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCustomPointsName(false);
                    onChange({ pointsName: template.pointsNameSuggestion });
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Select
                value={data.pointsName || template.pointsNameSuggestion}
                onValueChange={handlePointsNameChange}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select points name" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/20">
                  {template.pointsNameOptions.map((option) => (
                    <SelectItem 
                      key={option} 
                      value={option}
                      className="text-white hover:bg-white/10"
                    >
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-xs text-gray-500">What fans earn for completing tasks</p>
          </div>
        </div>

        {/* Bio/Description */}
        <div className="space-y-2">
          <Label htmlFor="bio" className="text-white">
            Program Description
          </Label>
          <Textarea
            id="bio"
            value={data.bio}
            onChange={(e) => onChange({ bio: e.target.value })}
            placeholder="Tell your fans what your program is about and what they can earn..."
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 min-h-[100px]"
            rows={4}
          />
          <p className="text-xs text-gray-500">
            This description appears on your public program page
          </p>
        </div>

        {/* Branding Images */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-gray-400" />
            <Label className="text-white">Branding (Optional)</Label>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Logo Upload */}
            <div className="space-y-2">
              <Label className="text-sm text-gray-400">Logo</Label>
              <ImageUpload
                type="avatar"
                currentImageUrl={data.logo}
                onUploadSuccess={(url) => onChange({ logo: url })}
                onRemove={() => onChange({ logo: '' })}
              />
            </div>

            {/* Header Image Upload */}
            <div className="space-y-2">
              <Label className="text-sm text-gray-400">Header Image</Label>
              <ImageUpload
                type="banner"
                currentImageUrl={data.headerImage}
                onUploadSuccess={(url) => onChange({ headerImage: url })}
                onRemove={() => onChange({ headerImage: '' })}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default EssentialInfoSection;
