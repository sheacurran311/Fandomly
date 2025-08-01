import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Medal, 
  Trophy, 
  Users, 
  DollarSign, 
  Target,
  Star,
  Award,
  School
} from "lucide-react";

interface FamilyAthleteTemplatesProps {
  onSelectTemplate: (template: any) => void;
}

export default function FamilyAthleteTemplates({ onSelectTemplate }: FamilyAthleteTemplatesProps) {
  const athleteTemplates = [
    {
      id: "olympic-aerial-jumper",
      title: "Olympic Aerial Jumper",
      description: "Perfect for Olympic skiing athletes and aerial sports",
      icon: Medal,
      gradient: "from-yellow-400 to-orange-500",
      features: [
        "Olympic achievement showcase",
        "International fan engagement",
        "Sponsor-friendly content",
        "Training journey sharing"
      ],
      revenueGoals: "$2,000-$10,000/month",
      fanEngagement: "Global audience of skiing enthusiasts",
      template: {
        category: "olympic-athlete",
        sport: "Aerial Skiing",
        achievements: ["Olympic Medalist", "USA Team Member"],
        contentTypes: ["Training videos", "Competition highlights", "Behind-the-scenes"],
        rewardTiers: [
          { name: "Bronze Fan", points: 100, rewards: ["Signed photo", "Training tips"] },
          { name: "Silver Supporter", points: 500, rewards: ["Video call", "Exclusive content"] },
          { name: "Gold Champion", points: 1000, rewards: ["Meet & greet", "Custom merchandise"] }
        ]
      }
    },
    {
      id: "college-football-junior",
      title: "College Football (Junior Year)",
      description: "NIL-optimized for experienced college players",
      icon: Trophy,
      gradient: "from-orange-500 to-red-600",
      features: [
        "Advanced NIL compliance",
        "Draft preparation content",
        "Leadership role showcase",
        "Community engagement"
      ],
      revenueGoals: "$1,500-$8,000/month",
      fanEngagement: "Local + national college football fans",
      template: {
        category: "college-athlete",
        sport: "Football",
        class: "junior",
        nilCompliance: {
          experienceLevel: "advanced",
          marketingReady: true
        },
        contentTypes: ["Game highlights", "Training regimen", "Campus life"],
        rewardTiers: [
          { name: "Rookie Fan", points: 50, rewards: ["Game day photos", "Stats updates"] },
          { name: "Starter", points: 250, rewards: ["Autographed gear", "Practice videos"] },
          { name: "Team Captain", points: 750, rewards: ["Game tickets", "Personal workout"] }
        ]
      }
    },
    {
      id: "college-football-freshman",
      title: "College Football (Freshman Year)",
      description: "Perfect for athletes starting their NIL journey",
      icon: School,
      gradient: "from-blue-500 to-purple-600",
      features: [
        "NIL education & compliance",
        "Brand building foundation",
        "Academic balance",
        "Future potential showcase"
      ],
      revenueGoals: "$500-$3,000/month",
      fanEngagement: "Building local fanbase and family support",
      template: {
        category: "college-athlete",
        sport: "Football",
        class: "freshman",
        nilCompliance: {
          experienceLevel: "beginner",
          needsGuidance: true
        },
        contentTypes: ["College transition", "Training progress", "Academic achievements"],
        rewardTiers: [
          { name: "New Fan", points: 25, rewards: ["Welcome message", "Schedule updates"] },
          { name: "Supporter", points: 100, rewards: ["Practice clips", "Q&A access"] },
          { name: "MVP Fan", points: 400, rewards: ["Signed photo", "Video shoutout"] }
        ]
      }
    }
  ];

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold gradient-text mb-4">
          Templates for Your Family Athletes
        </h2>
        <p className="text-gray-300 text-lg max-w-2xl mx-auto">
          Pre-configured setups perfect for Olympic medalists and college football players. 
          Choose a template that matches your family member's athletic profile.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {athleteTemplates.map((template) => {
          const Icon = template.icon;
          
          return (
            <Card 
              key={template.id}
              className="bg-white/5 backdrop-blur-lg border-white/10 hover:border-brand-primary/50 transition-all duration-300 hover:scale-105"
            >
              <CardHeader>
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${template.gradient} flex items-center justify-center mb-4`}>
                  <Icon className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-white text-xl">{template.title}</CardTitle>
                <p className="text-gray-300">{template.description}</p>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <h4 className="text-white font-medium flex items-center">
                    <Target className="h-4 w-4 mr-2 text-brand-primary" />
                    Key Features
                  </h4>
                  <div className="space-y-2">
                    {template.features.map((feature, index) => (
                      <div key={index} className="flex items-center text-sm text-gray-300">
                        <Star className="h-3 w-3 mr-2 text-brand-secondary" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 text-sm flex items-center">
                      <DollarSign className="h-4 w-4 mr-1 text-green-400" />
                      Revenue Goal
                    </span>
                    <Badge variant="outline" className="text-green-400 border-green-400/20">
                      {template.revenueGoals}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 text-sm flex items-center">
                      <Users className="h-4 w-4 mr-1 text-blue-400" />
                      Fan Base
                    </span>
                    <Badge variant="outline" className="text-blue-400 border-blue-400/20 text-xs">
                      {template.fanEngagement}
                    </Badge>
                  </div>
                </div>

                <Button
                  onClick={() => onSelectTemplate(template.template)}
                  className="w-full bg-brand-primary hover:bg-brand-primary/80"
                >
                  Use This Template
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="text-center">
        <div className="bg-white/5 rounded-2xl p-8 max-w-2xl mx-auto">
          <Award className="h-12 w-12 text-brand-secondary mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-white mb-4">Perfect for Your Family</h3>
          <p className="text-gray-300 mb-6">
            Your Olympic aerial jumper brother and college football nephews can start monetizing 
            their athletic achievements immediately with these NIL-compliant, fan-engaging templates.
          </p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-2">
              <div className="text-2xl font-bold text-brand-secondary">🥇</div>
              <div className="text-sm text-gray-300">Olympic Level</div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-brand-primary">🏈</div>
              <div className="text-sm text-gray-300">College Ready</div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-green-400">✅</div>
              <div className="text-sm text-gray-300">NIL Compliant</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}