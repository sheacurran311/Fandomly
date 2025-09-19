import { Link } from "wouter";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Link href="/" className="text-primary hover:underline mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
          <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="prose prose-lg max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Agreement to Terms</h2>
            <p>
              By accessing or using Fandomly's Web3-enabled loyalty rewards platform ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these Terms, you may not access or use our Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="mb-4">
              Fandomly provides a loyalty rewards platform that enables creators, athletes, and musicians to build lasting relationships with their fans through:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>Customizable point-based loyalty programs</li>
              <li>Exclusive reward systems and tier benefits</li>
              <li>Social media campaign integration</li>
              <li>Multi-chain wallet connectivity</li>
              <li>NIL (Name, Image, Likeness) compliance for college athletes</li>
              <li>Analytics and fan engagement tools</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts and Registration</h2>
            
            <h3 className="text-xl font-medium mb-2">3.1 Account Creation</h3>
            <p className="mb-4">
              To use our Service, you must create an account by connecting a supported Web3 wallet. You are responsible for maintaining the security of your wallet and account credentials.
            </p>

            <h3 className="text-xl font-medium mb-2">3.2 User Types</h3>
            <ul className="list-disc list-inside space-y-2 mb-4">
              <li><strong>Creators:</strong> Athletes, musicians, and content creators who establish loyalty programs</li>
              <li><strong>Fans:</strong> Users who participate in creator loyalty programs and earn rewards</li>
              <li><strong>Administrators:</strong> Users with elevated permissions to manage tenant operations</li>
            </ul>

            <h3 className="text-xl font-medium mb-2">3.3 Account Responsibilities</h3>
            <p>
              You agree to provide accurate information, maintain account security, and notify us immediately of any unauthorized use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use</h2>
            
            <h3 className="text-xl font-medium mb-2">4.1 Permitted Uses</h3>
            <p className="mb-4">You may use our Service to:</p>
            <ul className="list-disc list-inside space-y-2 mb-4">
              <li>Create and manage legitimate loyalty programs</li>
              <li>Participate in creator programs and earn rewards</li>
              <li>Connect social media accounts for campaign participation</li>
              <li>Track performance analytics and fan engagement</li>
            </ul>

            <h3 className="text-xl font-medium mb-2">4.2 Prohibited Activities</h3>
            <p className="mb-4">You agree not to:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>Use the Service for any illegal or unauthorized purpose</li>
              <li>Create fake accounts or manipulate engagement metrics</li>
              <li>Violate any applicable laws or regulations, including NIL compliance requirements</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Attempt to gain unauthorized access to other user accounts</li>
              <li>Use automated tools to artificially inflate engagement or points</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. NIL Compliance for College Athletes</h2>
            <p className="mb-4">
              For college athlete users, additional compliance requirements apply:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4">
              <li>All activities must comply with NCAA regulations</li>
              <li>State-specific NIL laws and institutional policies must be followed</li>
              <li>Earnings and activities may be subject to reporting requirements</li>
              <li>Users are responsible for ensuring compliance with their educational institution's policies</li>
            </ul>
            <p>
              Fandomly provides compliance monitoring tools but ultimate responsibility for adherence to NIL regulations rests with the individual athlete.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Payment and Subscription Terms</h2>
            
            <h3 className="text-xl font-medium mb-2">6.1 Subscription Plans</h3>
            <p className="mb-4">
              Creators may subscribe to paid plans for enhanced features. Subscription fees are processed through Stripe and are non-refundable except as required by law.
            </p>

            <h3 className="text-xl font-medium mb-2">6.2 Billing</h3>
            <p className="mb-4">
              Subscriptions are billed in advance on a monthly or annual basis. You authorize us to charge your payment method for applicable fees.
            </p>

            <h3 className="text-xl font-medium mb-2">6.3 Cancellation</h3>
            <p>
              You may cancel your subscription at any time. Cancellation will take effect at the end of your current billing period.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Intellectual Property</h2>
            
            <h3 className="text-xl font-medium mb-2">7.1 Your Content</h3>
            <p className="mb-4">
              You retain ownership of content you submit to the Service, but grant us a license to use, display, and distribute it as necessary to provide the Service.
            </p>

            <h3 className="text-xl font-medium mb-2">7.2 Our Platform</h3>
            <p>
              The Fandomly platform, including all software, text, images, and trademarks, is owned by us or our licensors and protected by intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Privacy and Data Protection</h2>
            <p>
              Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your information. By using our Service, you also agree to our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Third-Party Services</h2>
            <p className="mb-4">
              Our Service integrates with third-party platforms including:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4">
              <li>Dynamic Labs for wallet authentication</li>
              <li>Facebook Business API for social campaign tracking</li>
              <li>Stripe for payment processing</li>
              <li>Various blockchain networks for Web3 functionality</li>
            </ul>
            <p>
              Your use of these third-party services is subject to their respective terms of service and privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Limitation of Liability</h2>
            <p className="mb-4">
              To the maximum extent permitted by law, Fandomly shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or other intangible losses.
            </p>
            <p>
              Our total liability for any claims arising from your use of the Service shall not exceed the amount you paid us in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless Fandomly from any claims, losses, damages, or expenses arising from your use of the Service, violation of these Terms, or infringement of any rights of another party.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Termination</h2>
            <p className="mb-4">
              We reserve the right to suspend or terminate your account at any time for violation of these Terms or for any other reason at our discretion.
            </p>
            <p>
              Upon termination, your right to access and use the Service will cease immediately, but these Terms will remain in effect regarding past use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. We will notify users of significant changes via email or through the Service. Continued use of the Service after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Governing Law</h2>
            <p>
              These Terms are governed by and construed in accordance with the laws of the State of Delaware, without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">15. Contact Information</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p><strong>Fandomly</strong></p>
              <p>Email: legal@fandomly.ai</p>
              <p>Web: https://fandomly.ai</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">16. Severability</h2>
            <p>
              If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in full force and effect.
            </p>
          </section>

          <div className="mt-12 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground">
              These Terms of Service are effective as of the date last updated above and govern your use of the Fandomly platform.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}