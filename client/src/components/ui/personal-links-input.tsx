import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PersonalLinksInputProps {
  value: string[];
  onChange: (links: string[]) => void;
  label?: string;
  placeholder?: string;
  maxLinks?: number;
  className?: string;
}

export function PersonalLinksInput({
  value,
  onChange,
  label = "Personal Links",
  placeholder = "Personal page, 247 Sports, Rivals, ESPN bio...",
  maxLinks = 5,
  className
}: PersonalLinksInputProps) {
  const links = value || [];
  
  const handleAddLink = () => {
    if (links.length < maxLinks) {
      onChange([...links, ""]);
    }
  };
  
  const handleRemoveLink = (index: number) => {
    const newLinks = links.filter((_, i) => i !== index);
    onChange(newLinks);
  };
  
  const handleLinkChange = (index: number, newValue: string) => {
    const newLinks = [...links];
    newLinks[index] = newValue;
    onChange(newLinks);
  };
  
  return (
    <div className={className}>
      {label && (
        <Label className="text-gray-300 mb-2 block">
          {label}
          <span className="text-gray-500 text-xs ml-2">(Optional)</span>
        </Label>
      )}
      
      <div className="space-y-2">
        {links.map((link, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              type="url"
              value={link}
              onChange={(e) => handleLinkChange(index, e.target.value)}
              placeholder={index === 0 ? placeholder : "Add another link..."}
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleRemoveLink(index)}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        
        {links.length < maxLinks && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddLink}
            className="w-full border-white/20 text-gray-300 hover:bg-white/10"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Link {links.length > 0 && `(${links.length}/${maxLinks})`}
          </Button>
        )}
        
        <p className="text-xs text-gray-500 mt-1">
          Add links to your recruiting profiles, personal pages, or athletic bios
        </p>
      </div>
    </div>
  );
}

