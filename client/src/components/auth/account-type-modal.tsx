import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Star, Sparkles } from "lucide-react";

interface AccountTypeModalProps {
  open: boolean;
  onSelect: (type: 'fan' | 'creator') => void;
}

export default function AccountTypeModal({ open, onSelect }: AccountTypeModalProps) {
  const [selectedType, setSelectedType] = useState<'fan' | 'creator' | null>(null);

  const handleSelect = (type: 'fan' | 'creator') => {
    setSelectedType(type);
    // Store the selection for future logins
    localStorage.setItem('userType', type);
    onSelect(type);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md bg-brand-dark-purple border-brand-primary/20">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold text-white mb-2">
            Choose Your Account Type
          </DialogTitle>
          <p className="text-center text-gray-300 text-sm">
            This determines your dashboard experience and available features
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-6">
          <Card 
            className={`cursor-pointer transition-all duration-300 border-2 ${
              selectedType === 'fan' 
                ? 'border-brand-primary bg-brand-primary/10' 
                : 'border-white/20 bg-white/5 hover:border-brand-primary/50'
            }`}
            onClick={() => handleSelect('fan')}
          >
            <CardContent className="p-6 text-center">
              <Users className="h-12 w-12 text-brand-secondary mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">I'm a Fan</h3>
              <p className="text-gray-300 text-sm mb-4">
                Join loyalty programs, earn points, and claim exclusive rewards from your favorite creators
              </p>
              <div className="text-xs text-gray-400">
                • Join multiple creator programs<br/>
                • Earn points for engagement<br/>
                • Claim NFTs and exclusive rewards
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all duration-300 border-2 ${
              selectedType === 'creator' 
                ? 'border-brand-primary bg-brand-primary/10' 
                : 'border-white/20 bg-white/5 hover:border-brand-primary/50'
            }`}
            onClick={() => handleSelect('creator')}
          >
            <CardContent className="p-6 text-center">
              <Star className="h-12 w-12 text-brand-accent mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">I'm a Creator</h3>
              <p className="text-gray-300 text-sm mb-4">
                Build loyalty programs, reward your fans, and grow your community with Web3 features
              </p>
              <div className="text-xs text-gray-400">
                • Create custom loyalty programs<br/>
                • Design tier-based rewards<br/>
                • Distribute NFTs to fans
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 pt-4 border-t border-white/20">
          <p className="text-xs text-gray-400 text-center">
            <Sparkles className="h-4 w-4 inline mr-1" />
            You can change this later in your account settings
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}