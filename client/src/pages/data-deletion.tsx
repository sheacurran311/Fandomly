import { Link } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, Shield, Clock, CheckCircle } from "lucide-react";

export default function DataDeletion() {
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would normally send the deletion request to your backend
    console.log("Deletion request submitted:", { email, reason });
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Link href="/" className="text-primary hover:underline mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold mb-4">Data Deletion Instructions</h1>
          <p className="text-muted-foreground">How to request deletion of your personal data from Fandomly</p>
        </div>

        <div className="space-y-8">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              We respect your right to data deletion. This page provides multiple ways to request removal of your personal information from our platform.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Quick Data Deletion Methods
              </CardTitle>
              <CardDescription>
                Choose the method that works best for you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Option 1: Self-Service Deletion</h3>
                  <p className="text-sm text-muted-foreground">
                    If you have an active account, you can delete your data directly from your dashboard.
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Log into your Fandomly account</li>
                    <li>Go to Settings → Privacy & Data</li>
                    <li>Click "Delete My Account"</li>
                    <li>Confirm deletion via email</li>
                  </ol>
                  <Button asChild className="w-full">
                    <Link href="/dashboard">Go to Dashboard</Link>
                  </Button>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Option 2: Email Request</h3>
                  <p className="text-sm text-muted-foreground">
                    Send us an email with your deletion request.
                  </p>
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <p><strong>Email:</strong> privacy@fandomly.ai</p>
                    <p><strong>Subject:</strong> Data Deletion Request</p>
                    <p className="text-sm">Include your registered email address and wallet address (if applicable).</p>
                  </div>
                  <Button asChild variant="outline" className="w-full">
                    <a href="mailto:privacy@fandomly.ai?subject=Data%20Deletion%20Request">Send Email</a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Online Deletion Request Form</CardTitle>
              <CardDescription>
                Submit your deletion request directly through this form
              </CardDescription>
            </CardHeader>
            <CardContent>
              {submitted ? (
                <div className="text-center space-y-4">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                  <h3 className="text-lg font-semibold">Request Submitted Successfully</h3>
                  <p className="text-muted-foreground">
                    We've received your data deletion request. You'll receive a confirmation email within 24 hours, and we'll complete the deletion within 30 days.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-2">
                      Email Address *
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your registered email address"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="reason" className="block text-sm font-medium mb-2">
                      Reason for Deletion (Optional)
                    </label>
                    <Textarea
                      id="reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Help us improve by sharing why you're deleting your data"
                      rows={3}
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    Submit Deletion Request
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Processing Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">1</div>
                    <div>
                      <h4 className="font-medium">Request Received</h4>
                      <p className="text-sm text-muted-foreground">We acknowledge your request within 24 hours</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">2</div>
                    <div>
                      <h4 className="font-medium">Identity Verification</h4>
                      <p className="text-sm text-muted-foreground">We verify your identity to protect your data (1-3 days)</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">3</div>
                    <div>
                      <h4 className="font-medium">Data Deletion</h4>
                      <p className="text-sm text-muted-foreground">Complete removal from all systems (up to 30 days)</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">4</div>
                    <div>
                      <h4 className="font-medium">Confirmation</h4>
                      <p className="text-sm text-muted-foreground">We confirm completion via email</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>What Gets Deleted</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-green-600 mb-2">✓ Removed Immediately:</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Personal profile information</li>
                      <li>• Email address and contact details</li>
                      <li>• Social media connection data</li>
                      <li>• Loyalty program participation</li>
                      <li>• Point balances and transaction history</li>
                      <li>• Reward redemption records</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-amber-600 mb-2">⚠ Retained for Legal Compliance:</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Financial transaction records (7 years)</li>
                      <li>• Tax-related information (as required by law)</li>
                      <li>• Fraud prevention records (5 years)</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-blue-600 mb-2">ℹ Blockchain Data:</h4>
                    <p className="text-sm text-muted-foreground">
                      Blockchain transactions are immutable and cannot be deleted, but we remove any linking information that connects them to your identity.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Special Considerations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">For NIL Athletes:</h4>
                <p className="text-sm text-muted-foreground">
                  NIL compliance and earnings data will be securely deleted. However, you may need to maintain certain records for NCAA compliance. We recommend consulting with your compliance officer before deletion.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">For Creators with Active Programs:</h4>
                <p className="text-sm text-muted-foreground">
                  If you have active loyalty programs with fans, we'll help transition or close these programs before completing your data deletion.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Tenant/Store Data:</h4>
                <p className="text-sm text-muted-foreground">
                  If you own a creator store/tenant, deleting your account will also remove all associated store data, including member information and program history.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Alternative Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Before requesting complete deletion, consider these alternatives:
              </p>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Account Deactivation</h4>
                  <p className="text-sm text-muted-foreground">
                    Temporarily disable your account while keeping your data safe for future reactivation.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Data Export</h4>
                  <p className="text-sm text-muted-foreground">
                    Download a copy of your data before deletion for your records.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Privacy Settings</h4>
                  <p className="text-sm text-muted-foreground">
                    Adjust your privacy settings to limit data collection and sharing.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Disconnect Social Media</h4>
                  <p className="text-sm text-muted-foreground">
                    Remove social media integrations while keeping your core account.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold">Need Help?</h3>
            <p className="text-muted-foreground">
              If you have questions about data deletion or need assistance with the process, our privacy team is here to help.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="outline" asChild>
                <a href="mailto:privacy@fandomly.ai">Contact Privacy Team</a>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/privacy-policy">View Privacy Policy</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}