import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  score: number; // 0-100
  className?: string;
  showScore?: boolean;
}

export function StarRating({ score, className, showScore = true }: StarRatingProps) {
  // Convert 0-100 score to 0-5 stars
  // 0-20 = 1 star, 20-40 = 2 stars, 40-60 = 3 stars, 60-80 = 4 stars, 80-100 = 5 stars
  const starCount = Math.min(5, Math.max(0, Math.ceil(score / 20)));
  const partialStar = (score % 20) / 20; // For partial fill on last star
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= starCount;
          const isPartial = star === starCount && partialStar > 0 && partialStar < 1;
          
          return (
            <div key={star} className="relative">
              {/* Background star (outline) */}
              <Star className="h-5 w-5 text-gray-400" strokeWidth={1.5} />
              
              {/* Filled star */}
              {isFilled && (
                <Star 
                  className="absolute top-0 left-0 h-5 w-5 text-yellow-500" 
                  fill="currentColor"
                  strokeWidth={1.5}
                />
              )}
              
              {/* Partial fill for last star */}
              {isPartial && (
                <div 
                  className="absolute top-0 left-0 overflow-hidden"
                  style={{ width: `${partialStar * 100}%` }}
                >
                  <Star 
                    className="h-5 w-5 text-yellow-500" 
                    fill="currentColor"
                    strokeWidth={1.5}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {showScore && (
        <span className="text-sm font-medium text-gray-300">
          {score.toFixed(2)}
        </span>
      )}
    </div>
  );
}

