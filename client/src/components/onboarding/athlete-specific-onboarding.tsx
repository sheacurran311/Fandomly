import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Trophy, 
  Medal, 
  School, 
  Calendar,
  MapPin,
  Users,
  Shield,
  DollarSign,
  Award,
  Target
} from "lucide-react";

interface AthleteOnboardingProps {
  athleteType: "college" | "olympic";
  onComplete: (data: any) => void;
  onBack: () => void;
}

export default function AthleteSpecificOnboarding({ athleteType, onComplete, onBack }: AthleteOnboardingProps) {
  const [athleteData, setAthleteData] = useState({
    sport: "",
    position: "",
    school: "",
    class: "", // Freshman, Sophomore, Junior, Senior
    achievements: [] as string[],
    nilCompliance: {
      state: "",
      schoolApproval: false,
      hasAgent: false
    },
    socialMetrics: {
      followers: "",
      engagement: ""
    }
  });

  const collegeSports = [
    "Football", "Basketball", "Baseball", "Soccer", "Track & Field", 
    "Swimming", "Wrestling", "Tennis", "Golf", "Volleyball", "Gymnastics"
  ];

  const olympicSports = [
    "Aerial Skiing", "Alpine Skiing", "Figure Skating", "Speed Skating", 
    "Swimming", "Track & Field", "Gymnastics", "Wrestling", "Boxing", 
    "Cycling", "Rowing", "Diving", "Weightlifting"
  ];

  const sports = athleteType === "college" ? collegeSports : olympicSports;

  const handleSubmit = () => {
    onComplete({
      athleteType,
      ...athleteData,
      category: athleteType === "college" ? "college-athlete" : "olympic-athlete"
    });
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center mx-auto mb-6">
          {athleteType === "college" ? <School className="h-10 w-10 text-white" /> : <Medal className="h-10 w-10 text-white" />}
        </div>
        <h2 className="text-3xl font-bold gradient-text mb-4">
          {athleteType === "college" ? "College Athlete Setup" : "Olympic Athlete Setup"}
        </h2>
        <p className="text-gray-300 text-lg">
          {athleteType === "college" 
            ? "Set up your NIL-compliant fan engagement platform"
            : "Monetize your Olympic success and connect with fans globally"
          }
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Trophy className="h-5 w-5 mr-2 text-brand-primary" />
              Athletic Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Sport *</label>
              <Select value={athleteData.sport} onValueChange={(value) => setAthleteData(prev => ({ ...prev, sport: value }))}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Select your sport" />
                </SelectTrigger>
                <SelectContent>
                  {sports.map(sport => (
                    <SelectItem key={sport} value={sport}>{sport}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {athleteType === "college" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">School *</label>
                  <Input
                    placeholder="University name"
                    value={athleteData.school}
                    onChange={(e) => setAthleteData(prev => ({ ...prev, school: e.target.value }))}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Class Year *</label>
                  <Select value={athleteData.class} onValueChange={(value) => setAthleteData(prev => ({ ...prev, class: value }))}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Select class year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="freshman">Freshman</SelectItem>
                      <SelectItem value="sophomore">Sophomore</SelectItem>
                      <SelectItem value="junior">Junior</SelectItem>
                      <SelectItem value="senior">Senior</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Position (Optional)</label>
              <Input
                placeholder="e.g., Quarterback, Point Guard"
                value={athleteData.position}
                onChange={(e) => setAthleteData(prev => ({ ...prev, position: e.target.value }))}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          </CardContent>
        </Card>

        {athleteType === "college" && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Shield className="h-5 w-5 mr-2 text-green-400" />
                NIL Compliance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-green-500/20 bg-green-500/10">
                <Shield className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-gray-300">
                  Fandomly helps ensure your fan engagement activities comply with NCAA, state, and institutional NIL rules.
                </AlertDescription>
              </Alert>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">State *</label>
                <Input
                  placeholder="e.g., Texas, California"
                  value={athleteData.nilCompliance.state}
                  onChange={(e) => setAthleteData(prev => ({ 
                    ...prev, 
                    nilCompliance: { ...prev.nilCompliance, state: e.target.value }
                  }))}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <div className="space-y-3">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={athleteData.nilCompliance.schoolApproval}
                    onChange={(e) => setAthleteData(prev => ({ 
                      ...prev, 
                      nilCompliance: { ...prev.nilCompliance, schoolApproval: e.target.checked }
                    }))}
                    className="rounded border-white/20"
                  />
                  <span className="text-gray-300">School requires NIL activity approval</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={athleteData.nilCompliance.hasAgent}
                    onChange={(e) => setAthleteData(prev => ({ 
                      ...prev, 
                      nilCompliance: { ...prev.nilCompliance, hasAgent: e.target.checked }
                    }))}
                    className="rounded border-white/20"
                  />
                  <span className="text-gray-300">I have a NIL agent/representative</span>
                </label>
              </div>
            </CardContent>
          </Card>
        )}

        {athleteType === "olympic" && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Award className="h-5 w-5 mr-2 text-yellow-400" />
                Olympic Achievements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-yellow-500/20 bg-yellow-500/10">
                <Medal className="h-4 w-4 text-yellow-400" />
                <AlertDescription className="text-gray-300">
                  Showcase your Olympic journey and connect with fans who admire your dedication to excellence.
                </AlertDescription>
              </Alert>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Olympic Games Participated</label>
                <Input
                  placeholder="e.g., Beijing 2022, Tokyo 2020"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Medals/Rankings</label>
                <Input
                  placeholder="e.g., Gold Medal, 4th Place"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">National Team</label>
                <Input
                  placeholder="e.g., USA, Team USA"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Users className="h-5 w-5 mr-2 text-brand-secondary" />
            Fan Engagement Goals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Current Social Media Followers</label>
              <Input
                placeholder="e.g., 5000"
                value={athleteData.socialMetrics.followers}
                onChange={(e) => setAthleteData(prev => ({ 
                  ...prev, 
                  socialMetrics: { ...prev.socialMetrics, followers: e.target.value }
                }))}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Monthly Revenue Goal</label>
              <Input
                placeholder="e.g., $500"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-white/5">
              <Target className="h-8 w-8 text-brand-primary mx-auto mb-2" />
              <div className="text-sm text-gray-300">Grow Fanbase</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-white/5">
              <DollarSign className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <div className="text-sm text-gray-300">Monetize Brand</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-white/5">
              <Shield className="h-8 w-8 text-blue-400 mx-auto mb-2" />
              <div className="text-sm text-gray-300">Stay Compliant</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-white/5">
              <Users className="h-8 w-8 text-purple-400 mx-auto mb-2" />
              <div className="text-sm text-gray-300">Engage Fans</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          onClick={onBack}
          variant="outline"
          className="border-white/20 text-gray-300 hover:bg-white/5"
        >
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!athleteData.sport || (athleteType === "college" && (!athleteData.school || !athleteData.class))}
          className="bg-brand-primary hover:bg-brand-primary/80 px-8"
        >
          Complete Setup
        </Button>
      </div>
    </div>
  );
}