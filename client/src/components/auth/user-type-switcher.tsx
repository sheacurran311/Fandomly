import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { useUserTypeSwitch } from "@/hooks/use-user-type-switch";
import { Users, Star, ArrowRight } from "lucide-react";

interface UserTypeSwitcherProps {
  userId: string;
  currentUserType: "fan" | "creator";
  onTypeSwitch?: (newType: "fan" | "creator") => void;
}

export default function UserTypeSwitcher({ userId, currentUserType, onTypeSwitch }: UserTypeSwitcherProps) {
  const [open, setOpen] = useState(false);
  const switchUserType = useUserTypeSwitch();

  console.log("UserTypeSwitcher - Current user type:", currentUserType);

  const handleSwitch = (newType: "fan" | "creator") => {
    switchUserType.mutate(
      { userId, userType: newType },
      {
        onSuccess: () => {
          setOpen(false);
          onTypeSwitch?.(newType);
        },
      }
    );
  };

  const getTargetType = () => currentUserType === "fan" ? "creator" : "fan";
  const targetType = getTargetType();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-[#101636] border-[#101636]/30 hover:bg-[#101636]/10">
          Switch to {targetType === "creator" ? "Creator" : "Fan"}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-brand-dark-bg border-white/10 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold gradient-text">
            Switch Account Type
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            Choose the account type that best fits your needs. You can always switch back later.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Fan Option */}
          <Card className={`border cursor-pointer transition-all hover:scale-105 ${
            currentUserType === "fan" 
              ? "border-brand-secondary bg-brand-secondary/10" 
              : "border-white/20 bg-white/5 hover:border-brand-secondary/50"
          }`}>
            <CardContent className="p-6 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-brand-secondary" />
              <h3 className="text-lg font-semibold mb-2">Fan Account</h3>
              <p className="text-sm text-gray-300 mb-4">
                Join loyalty programs, earn points, and redeem exclusive rewards from your favorite creators.
              </p>
              <ul className="text-xs text-gray-400 space-y-1 mb-4">
                <li>• Join multiple creator programs</li>
                <li>• Earn points for engagement</li>
                <li>• Redeem exclusive rewards</li>
                <li>• Track your fan status</li>
              </ul>
              {currentUserType !== "fan" && (
                <Button
                  onClick={() => handleSwitch("fan")}
                  disabled={switchUserType.isPending}
                  className="w-full bg-brand-secondary hover:bg-brand-secondary/80"
                >
                  Switch to Fan
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
              {currentUserType === "fan" && (
                <div className="text-brand-secondary font-medium">Current Account</div>
              )}
            </CardContent>
          </Card>

          {/* Creator Option */}
          <Card className={`border cursor-pointer transition-all hover:scale-105 ${
            currentUserType === "creator" 
              ? "border-brand-primary bg-brand-primary/10" 
              : "border-white/20 bg-white/5 hover:border-brand-primary/50"
          }`}>
            <CardContent className="p-6 text-center">
              <Star className="h-12 w-12 mx-auto mb-4 text-brand-primary" />
              <h3 className="text-lg font-semibold mb-2">Creator Account</h3>
              <p className="text-sm text-gray-300 mb-4">
                Build your own loyalty program, engage fans, and grow your community with rewards.
              </p>
              <ul className="text-xs text-gray-400 space-y-1 mb-4">
                <li>• Create loyalty programs</li>
                <li>• Design custom rewards</li>
                <li>• Track fan engagement</li>
                <li>• Monetize your fanbase</li>
              </ul>
              {currentUserType !== "creator" && (
                <Button
                  onClick={() => handleSwitch("creator")}
                  disabled={switchUserType.isPending}
                  className="w-full bg-brand-primary hover:bg-brand-primary/80"
                >
                  Switch to Creator
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
              {currentUserType === "creator" && (
                <div className="text-brand-primary font-medium">Current Account</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-yellow-200 text-sm">
            <strong>Note:</strong> Switching account types will reset your onboarding progress. 
            You'll be guided through the setup process for your new account type.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}