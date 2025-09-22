import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Trash2, CheckCircle, Mail } from "lucide-react";
import { Link } from "wouter";

export default function DataDeletion() {
  return (
    <div className="relative min-h-screen bg-brand-dark-bg overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(225,6,152,0.14),transparent_60%),radial-gradient(40%_40%_at_80%_20%,rgba(20,254,238,0.12),transparent_60%)]" />
      <div className="absolute inset-0 gradient-primary opacity-[0.04]" />

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-brand-primary/10 px-4 py-2 rounded-full border border-brand-primary/20 mb-6">
              <Shield className="h-5 w-5 text-brand-primary" />
              <span className="text-brand-primary font-medium">Data Privacy</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Data Deletion Information
            </h1>
            
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Information about data deletion when you deauthorize Fandomly from Facebook or Instagram
            </p>
          </div>

          {/* Main Content */}
          <div className="space-y-8">
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-2xl flex items-center gap-3">
                  <Trash2 className="h-6 w-6 text-brand-primary" />
                  What Happens When You Deauthorize Fandomly
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-gray-300">
                  When you remove Fandomly's access to your Facebook or Instagram account, we automatically delete the following data:
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-brand-secondary mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="text-white font-semibold">Facebook Profile Data</h4>
                      <p className="text-gray-300 text-sm">Your Facebook profile information, including name, profile picture, and basic details</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-brand-secondary mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="text-white font-semibold">Social Connection Data</h4>
                      <p className="text-gray-300 text-sm">Any stored tokens and connection information for Facebook/Instagram integration</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-brand-secondary mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="text-white font-semibold">Campaign Participation Data</h4>
                      <p className="text-gray-300 text-sm">Records of Facebook/Instagram campaign activities and engagement</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-2xl">
                  Data That Remains
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 mb-4">
                  The following data is retained to maintain your Fandomly account functionality:
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-brand-accent rounded-full flex-shrink-0" />
                    <span className="text-gray-300">Your Fandomly account and profile</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-brand-accent rounded-full flex-shrink-0" />
                    <span className="text-gray-300">Loyalty program memberships and points</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-brand-accent rounded-full flex-shrink-0" />
                    <span className="text-gray-300">Reward redemption history</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-brand-accent rounded-full flex-shrink-0" />
                    <span className="text-gray-300">Wallet connections and Web3 data</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-2xl flex items-center gap-3">
                  <Mail className="h-6 w-6 text-brand-primary" />
                  Complete Account Deletion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 mb-6">
                  If you want to delete your entire Fandomly account and all associated data, please contact our support team. We'll permanently remove all your data within 30 days.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    variant="neon"
                    onClick={() => window.open('mailto:support@fandomly.com?subject=Account Deletion Request', '_blank')}
                  >
                    Request Account Deletion
                  </Button>
                  
                  <Link href="/privacy-policy">
                    <Button variant="outline" className="border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white">
                      View Privacy Policy
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Back to Home */}
            <div className="text-center pt-8">
              <Link href="/">
                <Button variant="ghost" className="text-gray-400 hover:text-white">
                  ← Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
