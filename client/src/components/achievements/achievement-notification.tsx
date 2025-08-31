import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  X, 
  Trophy, 
  Star, 
  Gift,
  CheckCircle,
  Sparkles
} from "lucide-react";
import { type Achievement } from "@shared/schema";

interface AchievementNotificationProps {
  achievement: Achievement;
  isVisible: boolean;
  onClose: () => void;
  onClaim?: () => void;
}

export default function AchievementNotification({ 
  achievement, 
  isVisible, 
  onClose, 
  onClaim 
}: AchievementNotificationProps) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setAnimate(true);
      // Auto-close after 10 seconds if no interaction
      const timer = setTimeout(() => {
        onClose();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  const getTierColor = (type: string) => {
    switch (type) {
      case "diamond": return "from-cyan-400 to-blue-500";
      case "platinum": return "from-gray-300 to-gray-500";
      case "gold": return "from-yellow-400 to-yellow-600";
      case "silver": return "from-gray-400 to-gray-600";
      case "bronze": return "from-orange-400 to-orange-600";
      default: return "from-gray-400 to-gray-600";
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case "diamond": return "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";
      case "platinum": return "bg-gray-300/20 text-gray-300 border-gray-300/30";
      case "gold": return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
      case "silver": return "bg-gray-400/20 text-gray-300 border-gray-400/30";
      case "bronze": return "bg-orange-500/20 text-orange-300 border-orange-500/30";
      default: return "bg-gray-400/20 text-gray-300 border-gray-400/30";
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <Card className={`
        bg-gradient-to-r from-brand-primary/20 to-brand-secondary/20 
        backdrop-blur-lg border border-brand-primary/30 shadow-2xl
        max-w-sm transition-all duration-500 ease-out
        ${animate ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`
                w-12 h-12 rounded-full bg-gradient-to-br ${getTierColor(achievement.type)} 
                flex items-center justify-center relative overflow-hidden animate-pulse
              `}>
                <CheckCircle className="h-6 w-6 text-white" />
                <div className="absolute inset-0 rounded-full border-2 border-white/30 animate-ping" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-4 w-4 text-brand-secondary" />
                  <span className="text-sm font-medium text-brand-secondary">Achievement Unlocked!</span>
                </div>
                <h3 className="text-lg font-bold text-white">{achievement.name}</h3>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-white h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-gray-300 text-sm mb-4">{achievement.description}</p>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className={`text-xs ${getBadgeColor(achievement.type)}`}>
                {achievement.type}
              </Badge>
              {(achievement.rewardPoints ?? 0) > 0 && (
                <div className="flex items-center space-x-1 text-brand-secondary">
                  <Gift className="h-3 w-3" />
                  <span className="text-xs font-medium">{achievement.rewardPoints} pts</span>
                </div>
              )}
            </div>
            {onClaim && (
              <Button
                onClick={onClaim}
                size="sm"
                className="bg-brand-secondary hover:bg-brand-secondary/80 text-brand-dark-bg"
              >
                Claim Reward
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}