import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingUp, DollarSign, Users, Instagram, Twitter, Facebook, Award } from "lucide-react";

interface CalculatorInputs {
  sport: string;
  division: string;
  position: string;
  instagramFollowers: number;
  twitterFollowers: number;
  tiktokFollowers: number;
  performance: number; // 1-10 scale
  marketSize: string;
  engagementRate: number; // percentage
}

export default function NILValueCalculator() {
  const [inputs, setInputs] = useState<CalculatorInputs>({
    sport: "",
    division: "",
    position: "",
    instagramFollowers: 0,
    twitterFollowers: 0,
    tiktokFollowers: 0,
    performance: 5,
    marketSize: "",
    engagementRate: 3.5
  });

  const [calculatedValue, setCalculatedValue] = useState<number | null>(null);
  const [breakdown, setBreakdown] = useState<{
    socialMedia: number;
    performance: number;
    market: number;
    sport: number;
  } | null>(null);

  const calculateNILValue = () => {
    // NIL Value Calculation Algorithm
    const socialMediaScore = (
      (inputs.instagramFollowers * 0.5) + 
      (inputs.twitterFollowers * 0.3) + 
      (inputs.tiktokFollowers * 0.7)
    ) * (inputs.engagementRate / 100);

    const sportMultipliers: Record<string, number> = {
      "football": 1.5,
      "basketball": 1.4,
      "baseball": 1.1,
      "soccer": 1.0,
      "tennis": 0.9,
      "track": 0.8,
      "swimming": 0.7
    };

    const divisionMultipliers: Record<string, number> = {
      "d1": 1.0,
      "d2": 0.7,
      "d3": 0.5
    };

    const marketMultipliers: Record<string, number> = {
      "major": 1.3,
      "medium": 1.0,
      "small": 0.8
    };

    const sportScore = socialMediaScore * (sportMultipliers[inputs.sport] || 1.0);
    const divisionScore = sportScore * (divisionMultipliers[inputs.division] || 1.0);
    const performanceScore = divisionScore * (inputs.performance / 10) * 1.5;
    const marketScore = performanceScore * (marketMultipliers[inputs.marketSize] || 1.0);

    const finalValue = Math.round(marketScore);

    setCalculatedValue(finalValue);
    setBreakdown({
      socialMedia: Math.round(socialMediaScore),
      performance: Math.round(performanceScore - divisionScore),
      market: Math.round(marketScore - performanceScore),
      sport: Math.round(sportScore - socialMediaScore)
    });
  };

  const getValueRange = (value: number) => {
    if (value < 5000) return { color: "text-gray-400", label: "Emerging" };
    if (value < 15000) return { color: "text-blue-400", label: "Rising Star" };
    if (value < 35000) return { color: "text-purple-400", label: "Strong Prospect" };
    if (value < 75000) return { color: "text-brand-secondary", label: "Top Tier" };
    return { color: "text-brand-primary", label: "Elite" };
  };

  return (
    <section className="py-16 bg-gradient-to-b from-brand-dark-purple/20 to-brand-dark-bg">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4 gradient-text">
            NIL Value Calculator
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Estimate your Name, Image, and Likeness value based on your social media presence, athletic performance, and market factors.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* Calculator Form */}
          <Card className="bg-white/5 backdrop-blur-lg border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Calculator className="h-5 w-5 mr-2 text-brand-primary" />
                Calculate Your NIL Value
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Sport & Division */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sport" className="text-gray-300">Sport</Label>
                  <Select value={inputs.sport} onValueChange={(value) => setInputs({...inputs, sport: value})}>
                    <SelectTrigger className="bg-white/5 border-white/20 text-white">
                      <SelectValue placeholder="Select sport" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="football">Football</SelectItem>
                      <SelectItem value="basketball">Basketball</SelectItem>
                      <SelectItem value="baseball">Baseball</SelectItem>
                      <SelectItem value="soccer">Soccer</SelectItem>
                      <SelectItem value="tennis">Tennis</SelectItem>
                      <SelectItem value="track">Track & Field</SelectItem>
                      <SelectItem value="swimming">Swimming</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="division" className="text-gray-300">Division</Label>
                  <Select value={inputs.division} onValueChange={(value) => setInputs({...inputs, division: value})}>
                    <SelectTrigger className="bg-white/5 border-white/20 text-white">
                      <SelectValue placeholder="Select division" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="d1">Division I</SelectItem>
                      <SelectItem value="d2">Division II</SelectItem>
                      <SelectItem value="d3">Division III</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Social Media Followers */}
              <div className="space-y-4">
                <Label className="text-gray-300">Social Media Following</Label>
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center space-x-3">
                    <Instagram className="h-5 w-5 text-pink-400" />
                    <div className="flex-1">
                      <Label htmlFor="instagram" className="text-sm text-gray-400">Instagram Followers</Label>
                      <Input
                        id="instagram"
                        type="number"
                        value={inputs.instagramFollowers}
                        onChange={(e) => setInputs({...inputs, instagramFollowers: parseInt(e.target.value) || 0})}
                        className="bg-white/5 border-white/20 text-white"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Twitter className="h-5 w-5 text-blue-400" />
                    <div className="flex-1">
                      <Label htmlFor="twitter" className="text-sm text-gray-400">Twitter Followers</Label>
                      <Input
                        id="twitter"
                        type="number"
                        value={inputs.twitterFollowers}
                        onChange={(e) => setInputs({...inputs, twitterFollowers: parseInt(e.target.value) || 0})}
                        className="bg-white/5 border-white/20 text-white"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="h-5 w-5 bg-gradient-to-r from-pink-400 to-purple-600 rounded-sm" />
                    <div className="flex-1">
                      <Label htmlFor="tiktok" className="text-sm text-gray-400">TikTok Followers</Label>
                      <Input
                        id="tiktok"
                        type="number"
                        value={inputs.tiktokFollowers}
                        onChange={(e) => setInputs({...inputs, tiktokFollowers: parseInt(e.target.value) || 0})}
                        className="bg-white/5 border-white/20 text-white"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Rating */}
              <div>
                <Label className="text-gray-300 mb-3 block">
                  Athletic Performance (1-10): {inputs.performance}
                </Label>
                <Slider
                  value={[inputs.performance]}
                  onValueChange={(value) => setInputs({...inputs, performance: value[0]})}
                  max={10}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Bench Player</span>
                  <span>All-Conference</span>
                  <span>All-American</span>
                </div>
              </div>

              {/* Market Size */}
              <div>
                <Label htmlFor="market" className="text-gray-300">School Market Size</Label>
                <Select value={inputs.marketSize} onValueChange={(value) => setInputs({...inputs, marketSize: value})}>
                  <SelectTrigger className="bg-white/5 border-white/20 text-white">
                    <SelectValue placeholder="Select market size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="major">Major Market (NYC, LA, Chicago)</SelectItem>
                    <SelectItem value="medium">Medium Market (Austin, Nashville)</SelectItem>
                    <SelectItem value="small">Small Market (College Town)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Engagement Rate */}
              <div>
                <Label className="text-gray-300 mb-3 block">
                  Engagement Rate: {inputs.engagementRate}%
                </Label>
                <Slider
                  value={[inputs.engagementRate]}
                  onValueChange={(value) => setInputs({...inputs, engagementRate: value[0]})}
                  max={10}
                  min={0.5}
                  step={0.1}
                  className="w-full"
                />
              </div>

              <Button 
                onClick={calculateNILValue}
                className="w-full bg-brand-primary hover:bg-brand-primary/80 text-white"
                size="lg"
              >
                Calculate My NIL Value
                <TrendingUp className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          <Card className="bg-white/5 backdrop-blur-lg border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-brand-secondary" />
                Your Estimated NIL Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              {calculatedValue !== null ? (
                <div className="space-y-6">
                  {/* Main Value */}
                  <div className="text-center">
                    <div className={`text-6xl font-bold mb-2 ${getValueRange(calculatedValue).color}`}>
                      ${calculatedValue.toLocaleString()}
                    </div>
                    <Badge variant="secondary" className="bg-brand-primary/20 text-brand-primary text-lg px-4 py-2">
                      {getValueRange(calculatedValue).label}
                    </Badge>
                  </div>

                  {/* Breakdown */}
                  {breakdown && (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-white">Value Breakdown:</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-300 flex items-center">
                            <Users className="h-4 w-4 mr-2" />
                            Social Media Impact
                          </span>
                          <span className="text-white font-medium">${breakdown.socialMedia.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-300 flex items-center">
                            <Award className="h-4 w-4 mr-2" />
                            Sport Premium
                          </span>
                          <span className="text-white font-medium">${breakdown.sport.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-300 flex items-center">
                            <TrendingUp className="h-4 w-4 mr-2" />
                            Performance Bonus
                          </span>
                          <span className="text-white font-medium">${breakdown.performance.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-300">Market Factor</span>
                          <span className="text-white font-medium">${breakdown.market.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Call to Action */}
                  <div className="bg-brand-primary/10 border border-brand-primary/20 rounded-lg p-4">
                    <h4 className="font-semibold text-brand-primary mb-2">Ready to Monetize Your NIL?</h4>
                    <p className="text-gray-300 text-sm mb-4">
                      Start building your fan loyalty program on Fandomly and unlock your earning potential.
                    </p>
                    <Button className="w-full bg-brand-primary hover:bg-brand-primary/80 text-white">
                      Start Your NIL Journey
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calculator className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">
                    Fill out the form to calculate your estimated NIL value
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}