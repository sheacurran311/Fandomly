import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingUp, DollarSign, Users, Instagram, Twitter, Facebook, Award, Zap, Target, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

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
    <section className="py-24 bg-gradient-to-b from-brand-dark-purple/20 to-brand-dark-bg">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-black mb-6 gradient-text">
            Discover Your NIL Worth
          </h2>
          <p className="text-lg lg:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Get an instant, data-driven estimate of your Name, Image, and Likeness value. Our algorithm analyzes social metrics, athletic performance, and market dynamics to calculate your monetization potential.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* Enhanced Calculator Form */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card className="bg-white/5 backdrop-blur-lg border-white/10 hover:border-brand-primary/30 transition-all h-full">
              <CardHeader className="bg-gradient-to-r from-brand-primary/10 to-brand-accent/10 border-b border-white/10">
                <CardTitle className="text-white flex items-center gap-2">
                  <Zap className="h-5 w-5 text-brand-primary" />
                  Your NIL Profile
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

              <motion.button
                onClick={calculateNILValue}
                className="w-full bg-gradient-to-r from-brand-primary to-brand-accent text-white py-3 px-4 rounded-lg font-bold text-base transition-all shadow-lg hover:shadow-xl"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-center gap-2">
                  <Zap className="h-5 w-5" />
                  Calculate My NIL Value
                  <TrendingUp className="h-5 w-5" />
                </div>
              </motion.button>
            </CardContent>
            </Card>
          </motion.div>

          {/* Enhanced Results Panel */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card className="bg-white/5 backdrop-blur-lg border-white/10 hover:border-brand-secondary/30 transition-all h-full">
              <CardHeader className="bg-gradient-to-r from-brand-secondary/10 to-brand-accent/10 border-b border-white/10">
                <CardTitle className="text-white flex items-center gap-2">
                  <Target className="h-5 w-5 text-brand-secondary" />
                  Your NIL Estimate
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {calculatedValue !== null ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6 }}
                    className="space-y-6"
                  >
                    {/* Main Value with Animation */}
                    <div className="text-center p-6 bg-gradient-to-b from-white/5 to-transparent rounded-xl">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                      >
                        <div className={`text-5xl md:text-6xl font-black mb-3 ${getValueRange(calculatedValue).color}`}>
                          ${calculatedValue.toLocaleString()}
                        </div>
                        <Badge className={`bg-gradient-to-r from-brand-primary/30 to-brand-accent/30 text-white text-base px-6 py-2 border border-brand-primary/50`}>
                          <Sparkles className="w-4 h-4 mr-2" />
                          {getValueRange(calculatedValue).label}
                        </Badge>
                      </motion.div>
                    </div>

                    {/* Animated Breakdown */}
                    {breakdown && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.6 }}
                        className="space-y-3"
                      >
                        <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                          <Target className="w-4 h-4" />
                          Value Breakdown
                        </h4>
                        <div className="space-y-2">
                          {[
                            { label: "Social Media Impact", value: breakdown.socialMedia, icon: Users },
                            { label: "Sport Premium", value: breakdown.sport, icon: Award },
                            { label: "Performance Bonus", value: breakdown.performance, icon: TrendingUp },
                            { label: "Market Factor", value: breakdown.market, icon: Target }
                          ].map((item, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.4 + idx * 0.1, duration: 0.4 }}
                              className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                            >
                              <span className="text-gray-300 flex items-center gap-2">
                                <item.icon className="h-4 w-4 text-brand-accent" />
                                {item.label}
                              </span>
                              <span className="text-white font-bold">${item.value.toLocaleString()}</span>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Enhanced CTA */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6, duration: 0.6 }}
                      className="bg-gradient-to-r from-brand-primary/15 to-brand-accent/15 border border-brand-primary/30 rounded-xl p-4 mt-6"
                    >
                      <h4 className="font-bold text-brand-accent mb-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Next Steps
                      </h4>
                      <p className="text-gray-300 text-sm mb-4">
                        Launch your loyalty program on Fandomly and start monetizing your personal brand today.
                      </p>
                      <motion.button
                        className="w-full bg-gradient-to-r from-brand-primary to-brand-accent text-white py-2 px-3 rounded-lg font-semibold text-sm transition-all"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Unlock My Earning Potential
                      </motion.button>
                    </motion.div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6 }}
                    className="text-center py-12"
                  >
                    <motion.div
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Calculator className="h-16 w-16 text-brand-accent/50 mx-auto mb-4" />
                    </motion.div>
                    <p className="text-gray-400 font-medium">
                      Complete the form on the left to discover your NIL value
                    </p>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}