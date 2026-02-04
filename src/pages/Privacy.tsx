import { BrandLogo } from '@/components/BrandLogo';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center justify-center mb-12">
          <BrandLogo size="lg" asLink={true} />
        </div>

        {/* Content */}
        <div className="space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-bold text-foreground tracking-tight">Privacy Policy</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Your privacy matters to us. This policy explains how we collect, use, and protect your information.
            </p>
            <p className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-border/50" />

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">1. Information We Collect</h2>
            
            <div className="space-y-4">
              <div className="p-5 rounded-xl bg-muted/30 border border-border/50">
                <h3 className="font-medium text-foreground mb-3">Account Information</h3>
                <ul className="space-y-2 text-muted-foreground text-sm">
                  <li className="flex items-start gap-3">
                    <span className="text-orange-500 mt-0.5">•</span>
                    <span>Name, email address, phone number</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-orange-500 mt-0.5">•</span>
                    <span>Password (encrypted and securely stored)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-orange-500 mt-0.5">•</span>
                    <span>Profile photo and business information</span>
                  </li>
                </ul>
              </div>

              <div className="p-5 rounded-xl bg-muted/30 border border-border/50">
                <h3 className="font-medium text-foreground mb-3">Digital Card Data</h3>
                <ul className="space-y-2 text-muted-foreground text-sm">
                  <li className="flex items-start gap-3">
                    <span className="text-orange-500 mt-0.5">•</span>
                    <span>Business card details (job title, company, social links, documents)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-orange-500 mt-0.5">•</span>
                    <span>Custom card designs and layouts</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-orange-500 mt-0.5">•</span>
                    <span>NFC card associations and configurations</span>
                  </li>
                </ul>
              </div>

              <div className="p-5 rounded-xl bg-muted/30 border border-border/50">
                <h3 className="font-medium text-foreground mb-3">CRM & Contact Data</h3>
                <ul className="space-y-2 text-muted-foreground text-sm">
                  <li className="flex items-start gap-3">
                    <span className="text-orange-500 mt-0.5">•</span>
                    <span>Contacts you save or exchange cards with</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-orange-500 mt-0.5">•</span>
                    <span>Notes, tags, and follow-up reminders you create</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-orange-500 mt-0.5">•</span>
                    <span>Imported contact lists and event data</span>
                  </li>
                </ul>
              </div>

              <div className="p-5 rounded-xl bg-muted/30 border border-border/50">
                <h3 className="font-medium text-foreground mb-3">Usage & Analytics</h3>
                <ul className="space-y-2 text-muted-foreground text-sm">
                  <li className="flex items-start gap-3">
                    <span className="text-orange-500 mt-0.5">•</span>
                    <span>Card views, clicks, and engagement metrics</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-orange-500 mt-0.5">•</span>
                    <span>Device information (type, OS, browser)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-orange-500 mt-0.5">•</span>
                    <span>IP address and general location data (city/country level)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-orange-500 mt-0.5">•</span>
                    <span>Feature usage patterns and session data</span>
                  </li>
                </ul>
              </div>

              <div className="p-5 rounded-xl bg-muted/30 border border-border/50">
                <h3 className="font-medium text-foreground mb-3">Payment Information</h3>
                <ul className="space-y-2 text-muted-foreground text-sm">
                  <li className="flex items-start gap-3">
                    <span className="text-orange-500 mt-0.5">•</span>
                    <span>Billing address and transaction history</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-orange-500 mt-0.5">•</span>
                    <span>Payment details are processed securely by Razorpay (we do not store card numbers)</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">2. How We Use Your Information</h2>
            
            <p className="text-muted-foreground">We use your data to:</p>
            
            <div className="space-y-3 mt-4">
              <div className="p-4 rounded-lg bg-muted/20 border border-border/30">
                <h3 className="font-medium text-foreground mb-2 text-sm">Provide Core Services</h3>
                <ul className="space-y-1.5 text-muted-foreground text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">→</span>
                    <span>Create and manage your digital business cards</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">→</span>
                    <span>Enable card sharing via QR codes, NFC, and links</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">→</span>
                    <span>Facilitate contact management and CRM features</span>
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-lg bg-muted/20 border border-border/30">
                <h3 className="font-medium text-foreground mb-2 text-sm">Analytics & Insights</h3>
                <ul className="space-y-1.5 text-muted-foreground text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">→</span>
                    <span>Generate card performance analytics and reports</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">→</span>
                    <span>Track engagement metrics (views, clicks, saves)</span>
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-lg bg-muted/20 border border-border/30">
                <h3 className="font-medium text-foreground mb-2 text-sm">Communication</h3>
                <ul className="space-y-1.5 text-muted-foreground text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">→</span>
                    <span>Send service updates, notifications, and support responses</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">→</span>
                    <span>Deliver subscription confirmations and billing receipts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">→</span>
                    <span>Share product updates and feature announcements (you can opt out)</span>
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-lg bg-muted/20 border border-border/30">
                <h3 className="font-medium text-foreground mb-2 text-sm">Service Improvement</h3>
                <ul className="space-y-1.5 text-muted-foreground text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">→</span>
                    <span>Improve platform performance and user experience</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">→</span>
                    <span>Develop new features based on usage patterns</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">→</span>
                    <span>Fix bugs and optimize application performance</span>
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-lg bg-muted/20 border border-border/30">
                <h3 className="font-medium text-foreground mb-2 text-sm">Security & Compliance</h3>
                <ul className="space-y-1.5 text-muted-foreground text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">→</span>
                    <span>Prevent fraud, abuse, and unauthorized access</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">→</span>
                    <span>Comply with legal obligations and enforce our Terms of Service</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">3. Data Sharing & Disclosure</h2>
            
            <div className="p-5 rounded-xl bg-green-500/5 border border-green-500/20 mb-4">
              <p className="text-foreground font-medium mb-2">We do not sell your personal data to third parties.</p>
              <p className="text-muted-foreground text-sm">Your information is only shared in the following limited circumstances:</p>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-muted/20 border border-border/30">
                <h3 className="font-medium text-foreground mb-2 text-sm">When You Choose to Share</h3>
                <ul className="space-y-1.5 text-muted-foreground text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 mt-0.5">•</span>
                    <span>When you share your digital card, recipients see the information you choose to include</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 mt-0.5">•</span>
                    <span>Public card links are accessible to anyone with the URL</span>
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-lg bg-muted/20 border border-border/30">
                <h3 className="font-medium text-foreground mb-2 text-sm">Service Providers</h3>
                <ul className="space-y-1.5 text-muted-foreground text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 mt-0.5">•</span>
                    <span>Payment processing (Razorpay) for subscription and order transactions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 mt-0.5">•</span>
                    <span>Cloud hosting providers (Supabase, Vercel) for secure data storage</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 mt-0.5">•</span>
                    <span>Communication services (email delivery, SMS notifications)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 mt-0.5">•</span>
                    <span>Analytics tools (aggregated, anonymized data only)</span>
                  </li>
                </ul>
                <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/30">
                  All service providers are contractually bound to protect your data and use it only for authorized purposes.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-muted/20 border border-border/30">
                <h3 className="font-medium text-foreground mb-2 text-sm">Legal Requirements</h3>
                <ul className="space-y-1.5 text-muted-foreground text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 mt-0.5">•</span>
                    <span>To comply with valid legal requests (court orders, subpoenas)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 mt-0.5">•</span>
                    <span>To protect rights, safety, or property of SYNKA, users, or the public</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 mt-0.5">•</span>
                    <span>To enforce our Terms of Service or investigate violations</span>
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-lg bg-muted/20 border border-border/30">
                <h3 className="font-medium text-foreground mb-2 text-sm">Business Transfers</h3>
                <p className="text-muted-foreground text-sm">
                  In the event of a merger, acquisition, or sale of assets, your data may be transferred to the acquiring entity. You will be notified of any such change.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">4. Data Security</h2>
            
            <p className="text-muted-foreground">We implement industry-standard security measures to protect your data:</p>
            
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/5 to-blue-500/10 border border-blue-500/20">
                <h3 className="font-medium text-foreground mb-2 flex items-center gap-2">
                  <span className="text-blue-500">🔒</span>
                  <span className="text-sm">Encryption</span>
                </h3>
                <p className="text-muted-foreground text-sm">
                  Data encrypted in transit (HTTPS/TLS) and at rest
                </p>
              </div>

              <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/5 to-blue-500/10 border border-blue-500/20">
                <h3 className="font-medium text-foreground mb-2 flex items-center gap-2">
                  <span className="text-blue-500">🛡️</span>
                  <span className="text-sm">Access Controls</span>
                </h3>
                <p className="text-muted-foreground text-sm">
                  Restricted access to authorized personnel only
                </p>
              </div>

              <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/5 to-blue-500/10 border border-blue-500/20">
                <h3 className="font-medium text-foreground mb-2 flex items-center gap-2">
                  <span className="text-blue-500">🔐</span>
                  <span className="text-sm">Secure Infrastructure</span>
                </h3>
                <p className="text-muted-foreground text-sm">
                  Enterprise-grade cloud hosting with automatic backups
                </p>
              </div>

              <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/5 to-blue-500/10 border border-blue-500/20">
                <h3 className="font-medium text-foreground mb-2 flex items-center gap-2">
                  <span className="text-blue-500">🔍</span>
                  <span className="text-sm">Monitoring</span>
                </h3>
                <p className="text-muted-foreground text-sm">
                  Continuous security monitoring and threat detection
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 mt-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Important:</span> While we use best-in-class security measures, no system is 100% secure. Please use strong passwords and enable two-factor authentication when available.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">5. Your Privacy Rights & Control</h2>
            
            <div className="space-y-3">
              <div className="p-5 rounded-xl bg-gradient-to-br from-orange-500/5 to-orange-500/10 border border-orange-500/20">
                <h3 className="font-medium text-foreground mb-3">You have full control over your data:</h3>
                <ul className="space-y-2.5 text-muted-foreground text-sm">
                  <li className="flex items-start gap-3">
                    <span className="text-orange-500 mt-0.5">✓</span>
                    <span><strong className="text-foreground">Access:</strong> View all personal data we have about you</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-orange-500 mt-0.5">✓</span>
                    <span><strong className="text-foreground">Edit:</strong> Update or correct your information anytime from your account settings</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-orange-500 mt-0.5">✓</span>
                    <span><strong className="text-foreground">Delete:</strong> Request permanent deletion of your account and associated data</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-orange-500 mt-0.5">✓</span>
                    <span><strong className="text-foreground">Export:</strong> Download your data in portable formats (contacts, analytics)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-orange-500 mt-0.5">✓</span>
                    <span><strong className="text-foreground">Control Visibility:</strong> Choose which cards are public and what information to share</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-orange-500 mt-0.5">✓</span>
                    <span><strong className="text-foreground">Opt-Out:</strong> Unsubscribe from marketing emails at any time</span>
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-lg bg-muted/20 border border-border/30">
                <h3 className="font-medium text-foreground mb-2 text-sm">Data Retention</h3>
                <p className="text-muted-foreground text-sm">
                  We retain your data as long as your account is active or as needed to provide services. After account deletion, we may retain certain data for legal, tax, or security purposes as required by law, typically for up to 90 days before permanent deletion.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-muted/20 border border-border/30">
                <h3 className="font-medium text-foreground mb-2 text-sm">How to Exercise Your Rights</h3>
                <p className="text-muted-foreground text-sm mb-2">
                  To access, modify, or delete your data, contact us at:
                </p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="text-orange-500">→</span>
                    <span>Email: <span className="font-medium text-foreground">support@synka.in</span></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-orange-500">→</span>
                    <span>Or use the "Account Settings" section in your dashboard</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">6. Cookies & Tracking Technologies</h2>
            
            <p className="text-muted-foreground">We use cookies and similar technologies to enhance your experience:</p>
            
            <div className="space-y-3 mt-4">
              <div className="p-4 rounded-lg bg-muted/20 border border-border/30">
                <h3 className="font-medium text-foreground mb-2 text-sm">Essential Cookies</h3>
                <p className="text-muted-foreground text-sm">
                  Required for authentication, security, and core functionality. These cannot be disabled.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-muted/20 border border-border/30">
                <h3 className="font-medium text-foreground mb-2 text-sm">Performance Cookies</h3>
                <p className="text-muted-foreground text-sm">
                  Help us understand how you use SYNKA to improve performance and fix issues.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-muted/20 border border-border/30">
                <h3 className="font-medium text-foreground mb-2 text-sm">Analytics Cookies</h3>
                <p className="text-muted-foreground text-sm">
                  Track aggregated usage patterns to help us develop new features (anonymized data only).
                </p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mt-4">
              You can control cookie preferences through your browser settings. Note that disabling certain cookies may affect functionality.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">7. Third-Party Services</h2>
            
            <p className="text-muted-foreground">SYNKA integrates with trusted third-party services:</p>
            
            <ul className="space-y-2 mt-4 text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="text-orange-500 mt-1">•</span>
                <span><strong className="text-foreground">Razorpay:</strong> Payment processing (subject to their privacy policy)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-500 mt-1">•</span>
                <span><strong className="text-foreground">Supabase:</strong> Database and authentication services</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-500 mt-1">•</span>
                <span><strong className="text-foreground">Vercel:</strong> Hosting and CDN</span>
              </li>
            </ul>

            <p className="text-sm text-muted-foreground mt-3">
              These services have their own privacy policies. We recommend reviewing them if you have concerns about how they handle data.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">8. Children's Privacy</h2>
            
            <div className="p-5 rounded-xl bg-red-500/5 border border-red-500/20">
              <p className="text-muted-foreground">
                SYNKA is not intended for users under 18 years of age. We do not knowingly collect personal information from children. If you believe we have inadvertently collected data from a minor, please contact us immediately at <span className="font-medium text-foreground">support@synka.in</span> and we will promptly delete it.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">9. International Data Transfers</h2>
            
            <p className="text-muted-foreground">
              Your data may be stored and processed in servers located in different countries. We ensure appropriate safeguards are in place to protect your data in accordance with this privacy policy, regardless of where it is processed.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">10. Changes to This Policy</h2>
            
            <p className="text-muted-foreground">
              We may update this privacy policy periodically to reflect changes in our practices or legal requirements. We will notify you of significant changes via email or prominent notice on the platform. Your continued use of SYNKA after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">11. Contact Us</h2>
            
            <div className="p-6 rounded-xl bg-gradient-to-br from-orange-500/5 to-orange-500/10 border border-orange-500/20">
              <p className="text-muted-foreground mb-4">
                For privacy-related questions, concerns, or requests:
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="text-orange-500 mt-0.5">→</span>
                  <span>Email: <span className="font-medium text-foreground">support@synka.in</span></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-orange-500 mt-0.5">→</span>
                  <span>Dashboard: Account Settings → Privacy & Data</span>
                </li>
              </ul>
              <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-orange-500/20">
                We aim to respond to all privacy requests within 7 business days.
              </p>
            </div>
          </section>
        </div>

        {/* Footer spacing */}
        <div className="h-16" />
      </div>
    </div>
  );
}
