import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingUp, DollarSign, Users, Instagram, Twitter, Facebook, Award, Zap, Target, Sparkles, Play } from "lucide-react";
import { motion } from "framer-motion";

interface CalculatorInputs {
  creatorType: string; // athlete, content_creator, musician, brand
  platform: string; // primary platform
  specialty: string; // sport, genre, niche, industry
  instagramFollowers: number;
  twitterFollowers: number;
  tiktokFollowers: number;
  youtubeSubscribers: number;
  influence: number; // 1-10 scale
  marketSize: string;
  engagementRate: number; // percentage
}

export default function CreatorEarningsCalculator() {
  const [inputs, setInputs] = useState<CalculatorInputs>({
    creatorType: "",
    platform: "",
    specialty: "",
    instagramFollowers: 0,
    twitterFollowers: 0,
    tiktokFollowers: 0,
    youtubeSubscribers: 0,
    influence: 5,
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

  const calculateCreatorValue = () => {
    // Creator Earnings Calculation Algorithm
    const socialMediaScore = (
      (inputs.instagramFollowers * 0.5) + 
      (inputs.twitterFollowers * 0.3) + 
      (inputs.tiktokFollowers * 0.7) +
      (inputs.youtubeSubscribers * 0.8)
    ) * (inputs.engagementRate / 100);

    const creatorTypeMultipliers: Record<string, number> = {
      "athlete": 1.4,
      "content_creator": 1.3,
      "musician": 1.2,
      "brand": 1.5
    };

    const platformMultipliers: Record<string, number> = {
      "facebook": 1.2,
      "instagram": 1.1,
      "twitter": 1.0,
      "tiktok": 1.2,
      "youtube": 1.3,
      "spotify": 1.2,
      "discord": 1.1,
      "twitch": 1.3
    };

    const marketMultipliers: Record<string, number> = {
      "global": 1.4,
      "national": 1.2,
      "regional": 1.0,
      "local": 0.8
    };

    // Calculate component contributions directly (non-negative values)
    const typeBonus = socialMediaScore * ((creatorTypeMultipliers[inputs.creatorType] || 1.0) - 1.0);
    const platformBonus = (socialMediaScore + typeBonus) * ((platformMultipliers[inputs.platform] || 1.0) - 1.0);
    const influenceBonus = (socialMediaScore + typeBonus + platformBonus) * ((inputs.influence / 10) * 0.5);
    const marketBonus = (socialMediaScore + typeBonus + platformBonus + influenceBonus) * ((marketMultipliers[inputs.marketSize] || 1.0) - 1.0);

    const finalValue = Math.round(socialMediaScore + typeBonus + platformBonus + influenceBonus + marketBonus);

    setCalculatedValue(finalValue);
    setBreakdown({
      socialMedia: Math.round(Math.max(0, socialMediaScore)),
      performance: Math.round(Math.max(0, influenceBonus)),
      market: Math.round(Math.max(0, marketBonus)),
      sport: Math.round(Math.max(0, typeBonus + platformBonus))
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
            Calculate Your Earning Potential
          </h2>
          <p className="text-lg lg:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Get an instant, data-driven estimate of your creator value. Our algorithm analyzes social metrics, audience engagement, and market reach to calculate your monetization potential across 8 platforms.
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
                  Your Creator Profile
                </CardTitle>
              </CardHeader>
            <CardContent className="space-y-6">
              {/* Creator Type & Platform */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="creatorType" className="text-gray-300">Creator Type</Label>
                  <Select value={inputs.creatorType} onValueChange={(value) => setInputs({...inputs, creatorType: value})}>
                    <SelectTrigger className="bg-white/5 border-white/20 text-white">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="athlete">Athlete</SelectItem>
                      <SelectItem value="content_creator">Content Creator</SelectItem>
                      <SelectItem value="musician">Musician</SelectItem>
                      <SelectItem value="brand">Brand/Agency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="platform" className="text-gray-300">Primary Platform</Label>
                  <Select value={inputs.platform} onValueChange={(value) => setInputs({...inputs, platform: value})}>
                    <SelectTrigger className="bg-white/5 border-white/20 text-white">
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="twitter">X (Twitter)</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="spotify">Spotify</SelectItem>
                      <SelectItem value="discord">Discord</SelectItem>
                      <SelectItem value="twitch">Twitch</SelectItem>
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

              {/* YouTube Subscribers */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Play className="h-5 w-5 text-red-500" />
                  <div className="flex-1">
                    <Label htmlFor="youtube" className="text-sm text-gray-400">YouTube Subscribers</Label>
                    <Input
                      id="youtube"
                      type="number"
                      value={inputs.youtubeSubscribers}
                      onChange={(e) => setInputs({...inputs, youtubeSubscribers: parseInt(e.target.value) || 0})}
                      className="bg-white/5 border-white/20 text-white"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Influence Rating */}
              <div>
                <Label className="text-gray-300 mb-3 block">
                  Influence Level (1-10): {inputs.influence}
                </Label>
                <Slider
                  value={[inputs.influence]}
                  onValueChange={(value) => setInputs({...inputs, influence: value[0]})}
                  max={10}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Rising</span>
                  <span>Established</span>
                  <span>Elite</span>
                </div>
              </div>

              {/* Market Size */}
              <div>
                <Label htmlFor="market" className="text-gray-300">Audience Reach</Label>
                <Select value={inputs.marketSize} onValueChange={(value) => setInputs({...inputs, marketSize: value})}>
                  <SelectTrigger className="bg-white/5 border-white/20 text-white">
                    <SelectValue placeholder="Select reach" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global (Worldwide)</SelectItem>
                    <SelectItem value="national">National (Countrywide)</SelectItem>
                    <SelectItem value="regional">Regional (Multi-State)</SelectItem>
                    <SelectItem value="local">Local (City/Community)</SelectItem>
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
                onClick={calculateCreatorValue}
                className="w-full bg-gradient-to-r from-brand-primary to-brand-accent text-white py-3 px-4 rounded-lg font-bold text-base transition-all shadow-lg hover:shadow-xl"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                data-testid="button-calculate-value"
              >
                <div className="flex items-center justify-center gap-2">
                  <Zap className="h-5 w-5" />
                  Calculate My Creator Value
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
                  Your Earning Estimate
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
                            { label: "Creator Type Boost", value: breakdown.sport, icon: Award },
                            { label: "Influence Bonus", value: breakdown.performance, icon: TrendingUp },
                            { label: "Market Reach Factor", value: breakdown.market, icon: Target }
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
                      Complete the form on the left to discover your creator earnings potential
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