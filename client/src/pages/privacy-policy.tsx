import { Link } from 'wouter';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Link href="/" className="text-primary hover:underline mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="prose prose-lg max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p>
              Fandomly (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates the Fandomly.ai
              platform (&quot;Service&quot;) that provides Web3-enabled loyalty rewards for
              athletes, creators, and musicians. This Privacy Policy explains how we collect, use,
              disclose, and safeguard your information when you use our Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>

            <h3 className="text-xl font-medium mb-2">2.1 Personal Information</h3>
            <ul className="list-disc list-inside space-y-2 mb-4">
              <li>Name, email address, and profile information</li>
              <li>Wallet addresses and blockchain transaction data</li>
              <li>Profile photos and biographical information</li>
              <li>Communication preferences and settings</li>
            </ul>

            <h3 className="text-xl font-medium mb-2">2.2 Social Media Data</h3>
            <p className="mb-4">
              When you connect your social media accounts (Facebook, Instagram, Twitter, TikTok,
              YouTube, Spotify), we may collect:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4">
              <li>Follower counts and audience demographics</li>
              <li>Engagement metrics (likes, comments, shares)</li>
              <li>Content performance analytics</li>
              <li>Public profile information</li>
            </ul>

            <h3 className="text-xl font-medium mb-2">2.3 Usage Data</h3>
            <ul className="list-disc list-inside space-y-2">
              <li>Device information and IP addresses</li>
              <li>Browser type and version</li>
              <li>Pages visited and time spent on the Service</li>
              <li>Click-through rates and user interactions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Provide and maintain our loyalty rewards platform</li>
              <li>Process point transactions and reward redemptions</li>
              <li>Generate analytics and insights for creators</li>
              <li>Facilitate fan engagement and community building</li>
              <li>Ensure NIL compliance for college athletes</li>
              <li>Send notifications about program updates and rewards</li>
              <li>Improve our Service and develop new features</li>
              <li>Comply with legal obligations and prevent fraud</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Data Sharing and Disclosure</h2>

            <h3 className="text-xl font-medium mb-2">4.1 With Your Consent</h3>
            <p className="mb-4">
              We share your information with third parties only when you explicitly consent, such as
              when connecting social media accounts or participating in creator programs.
            </p>

            <h3 className="text-xl font-medium mb-2">4.2 Service Providers</h3>
            <p className="mb-4">
              We work with trusted service providers who assist us in operating our platform:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4">
              <li>Particle Network for wallet authentication</li>
              <li>Neon Database for secure data storage</li>
              <li>Social media platforms for API access</li>
              <li>Analytics and monitoring services</li>
            </ul>

            <h3 className="text-xl font-medium mb-2">4.3 Legal Requirements</h3>
            <p>
              We may disclose your information when required by law, to protect our rights, or to
              ensure the safety of our users and the public.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              5. NIL Compliance and Student-Athlete Privacy
            </h2>
            <p className="mb-4">
              For college athletes using our platform for Name, Image, and Likeness (NIL)
              activities:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>We implement additional privacy protections for NIL-related data</li>
              <li>Compliance monitoring data is encrypted and access-restricted</li>
              <li>We provide tools to help maintain NCAA eligibility</li>
              <li>NIL earnings and compliance data require authentication to access</li>
              <li>We do not share NIL compliance information with unauthorized parties</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Data Security</h2>
            <p className="mb-4">
              We implement industry-standard security measures to protect your information:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>Encryption of data in transit and at rest</li>
              <li>Multi-factor authentication for sensitive operations</li>
              <li>Regular security audits and monitoring</li>
              <li>Access controls and role-based permissions</li>
              <li>Secure blockchain integration protocols</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Your Privacy Rights</h2>
            <p className="mb-4">You have the right to:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>Access your personal information</li>
              <li>Correct inaccurate or incomplete data</li>
              <li>Request deletion of your data (see our Data Deletion Instructions)</li>
              <li>Opt-out of marketing communications</li>
              <li>Disconnect social media accounts</li>
              <li>Export your data in a portable format</li>
              <li>Withdraw consent for data processing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Third-Party Integrations</h2>

            <h3 className="text-xl font-medium mb-2">8.1 Social Media Platforms</h3>
            <p className="mb-4">
              Our integrations with social media platforms are governed by their respective privacy
              policies:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4">
              <li>
                Facebook/Instagram:{' '}
                <a
                  href="https://www.facebook.com/policy.php"
                  className="text-primary hover:underline"
                >
                  Facebook Privacy Policy
                </a>
              </li>
              <li>
                Twitter:{' '}
                <a href="https://twitter.com/privacy" className="text-primary hover:underline">
                  Twitter Privacy Policy
                </a>
              </li>
              <li>
                TikTok:{' '}
                <a
                  href="https://www.tiktok.com/legal/privacy-policy"
                  className="text-primary hover:underline"
                >
                  TikTok Privacy Policy
                </a>
              </li>
              <li>
                YouTube:{' '}
                <a
                  href="https://policies.google.com/privacy"
                  className="text-primary hover:underline"
                >
                  Google Privacy Policy
                </a>
              </li>
              <li>
                Spotify:{' '}
                <a
                  href="https://www.spotify.com/legal/privacy-policy/"
                  className="text-primary hover:underline"
                >
                  Spotify Privacy Policy
                </a>
              </li>
            </ul>

            <h3 className="text-xl font-medium mb-2">8.2 Blockchain Networks</h3>
            <p>
              Blockchain transactions are public and immutable. While we don&apos;t control
              blockchain networks, we implement privacy-preserving practices in our Web3
              integrations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Data Retention</h2>
            <p className="mb-4">
              We retain your information only as long as necessary to provide our services and
              comply with legal obligations:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>Account data: Retained while your account is active</li>
              <li>Transaction history: 7 years for tax and compliance purposes</li>
              <li>Marketing data: Until you opt-out or request deletion</li>
              <li>Analytics data: Aggregated and anonymized after 2 years</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your own.
              We implement appropriate safeguards to ensure your data receives adequate protection
              in accordance with applicable data protection laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Children&apos;s Privacy</h2>
            <p>
              Our Service is not intended for individuals under 13 years of age. We do not knowingly
              collect personal information from children under 13. If we become aware that we have
              collected such information, we will take steps to delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy periodically. We will notify you of any material
              changes by posting the new policy on this page and updating the &quot;Last
              updated&quot; date. Your continued use of the Service after such changes constitutes
              acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Contact Us</h2>
            <p className="mb-4">
              If you have questions about this Privacy Policy or our data practices, please contact
              us:
            </p>
            <div className="bg-muted p-4 rounded-lg">
              <p>
                <strong>Email:</strong> privacy@fandomly.ai
              </p>
              <p>
                <strong>Address:</strong> [Your Business Address]
              </p>
              <p>
                <strong>Data Protection Officer:</strong> dpo@fandomly.ai
              </p>
            </div>
            <p className="mt-4">
              For data deletion requests, please visit our{' '}
              <Link href="/data-deletion" className="text-primary hover:underline">
                Data Deletion Instructions
              </Link>{' '}
              page.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
