import { BrandLogo } from '@/components/BrandLogo';

export default function Terms() {
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
            <h1 className="text-4xl font-bold text-foreground tracking-tight">Terms of Service</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Welcome to SYNKA™. By using our services, you agree to these terms.
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-border/50" />

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">1. Service Overview</h2>
            <p className="text-muted-foreground leading-relaxed">
              SYNKA™ provides digital business cards, CRM tools, NFC card services, analytics, and sharing features to help you connect and grow your professional network.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">2. User Accounts</h2>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="text-orange-500 mt-1">•</span>
                <span>You are responsible for maintaining the confidentiality of your account credentials.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-500 mt-1">•</span>
                <span>All information provided during registration must be accurate and up to date.</span>
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">3. Service Plans</h2>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="text-orange-500 mt-1">•</span>
                <span>Free plan includes essential features for getting started.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-500 mt-1">•</span>
                <span>Orange plan unlocks premium capabilities including multiple cards, advanced analytics, and exclusive benefits.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-500 mt-1">•</span>
                <span>Pricing and features may be updated with advance notice to users.</span>
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">4. NFC Cards</h2>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="text-orange-500 mt-1">•</span>
                <span>Physical cards are custom-made and non-refundable once production begins.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-500 mt-1">•</span>
                <span>SYNKA™ is not responsible for NFC compatibility limitations on certain devices.</span>
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">5. Acceptable Use</h2>
            <p className="text-muted-foreground">By using SYNKA™, you agree not to:</p>
            <ul className="space-y-3 text-muted-foreground mt-3">
              <li className="flex items-start gap-3">
                <span className="text-orange-500 mt-1">•</span>
                <span>Misuse the platform or violate any applicable laws.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-500 mt-1">•</span>
                <span>Share illegal, harmful, defamatory, or misleading content.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-500 mt-1">•</span>
                <span>Attempt to compromise, hack, or disrupt the service.</span>
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">6. Account Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              SYNKA™ reserves the right to suspend or terminate accounts that violate these terms or engage in activities that compromise the platform's integrity.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">7. Updates to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              These terms may be updated periodically. Continued use of SYNKA™ after changes constitutes acceptance of the updated terms.
            </p>
          </section>

          {/* Divider */}
          <div className="border-t border-border/50" />

          {/* Replacement Policy */}
          <section className="space-y-6">
            <h2 className="text-2xl font-semibold text-foreground">8. Replacement Policy</h2>

            <div className="space-y-4 p-6 rounded-xl bg-muted/30 border border-border/50">
              <h3 className="text-lg font-medium text-foreground">Applicable to All NFC Cards</h3>
              <p className="text-muted-foreground text-sm">Free replacement is provided for:</p>
              <ul className="space-y-2.5 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>NFC chip malfunction due to manufacturing defect</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Card damaged during delivery</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Printing or engraving errors caused by SYNKA™</span>
                </li>
              </ul>
              <p className="text-sm text-muted-foreground pt-2 border-t border-border/30">
                No courier charges apply. No time limit for reporting manufacturing defects or delivery damage.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-foreground">Not Covered</h3>
              <ul className="space-y-2.5 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="text-muted-foreground/40 mt-1">×</span>
                  <span>Lost or misplaced cards</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-muted-foreground/40 mt-1">×</span>
                  <span>Physical damage from bending, scratching, water exposure, or misuse</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-muted-foreground/40 mt-1">×</span>
                  <span>Customer-requested design changes or reprints</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-muted-foreground/40 mt-1">×</span>
                  <span>Normal cosmetic wear over time</span>
                </li>
              </ul>
            </div>

            <div className="space-y-4 p-6 rounded-xl bg-gradient-to-br from-orange-500/5 to-orange-500/10 border border-orange-500/20">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
                <h3 className="text-lg font-medium text-foreground">Orange Plan – Free NFC Card Benefit</h3>
              </div>
              <ul className="space-y-2.5 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="text-orange-500 mt-1">•</span>
                  <span>Complimentary PVC NFC card upon Annual Orange Plan activation</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-orange-500 mt-1">•</span>
                  <span>One additional free card each year after successful renewal</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-orange-500 mt-1">•</span>
                  <span>No courier charges for this benefit</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-orange-500 mt-1">•</span>
                  <span>Valid only while Orange Annual subscription remains active</span>
                </li>
              </ul>
              <div className="pt-3 border-t border-orange-500/20">
                <p className="text-sm text-muted-foreground">
                  To claim: Email from your registered account to <span className="font-medium text-foreground">orders@synka.in</span>
                </p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-muted-foreground p-4 rounded-lg bg-muted/20">
              <p className="font-medium text-foreground">Important Notes</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">→</span>
                  <span>Replacement requests must originate from the registered account email</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">→</span>
                  <span>SYNKA™ reserves the right to verify eligibility before processing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">→</span>
                  <span>Replacements use the same design unless requested otherwise (charges may apply)</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Divider */}
          <div className="border-t border-border/50" />

          {/* Cancellation & Refund Policy */}
          <section className="space-y-6">
            <h2 className="text-2xl font-semibold text-foreground">9. Cancellation & Refund Policy</h2>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-foreground">Order Cancellation</h3>
              <p className="text-muted-foreground text-sm">All NFC cards are custom-made. Cancellation eligibility depends on production stage:</p>
              
              <div className="space-y-4 mt-4">
                <div className="p-5 rounded-xl bg-green-500/5 border border-green-500/20">
                  <h4 className="font-medium text-foreground mb-3">Before Design Approval</h4>
                  <ul className="space-y-2 text-muted-foreground text-sm">
                    <li className="flex items-start gap-3">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>Cancellable within 24 hours of order placement or before design approval (whichever is earlier)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>Full refund issued (excluding payment gateway charges if applicable)</span>
                    </li>
                  </ul>
                </div>
                
                <div className="p-5 rounded-xl bg-red-500/5 border border-red-500/20">
                  <h4 className="font-medium text-foreground mb-3">After Design Approval</h4>
                  <p className="text-muted-foreground text-sm mb-3">Once design is approved and production begins:</p>
                  <ul className="space-y-2 text-muted-foreground text-sm">
                    <li className="flex items-start gap-3">
                      <span className="text-red-500 mt-0.5">×</span>
                      <span>Order cannot be cancelled</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-red-500 mt-0.5">×</span>
                      <span>No refunds provided</span>
                    </li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-red-500/20">
                    Applies to both PVC and Metal NFC cards
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 p-5 rounded-xl bg-muted/20 border border-border/50">
              <h3 className="text-lg font-medium text-foreground">Design Approval Responsibility</h3>
              <ul className="space-y-2.5 text-muted-foreground text-sm">
                <li className="flex items-start gap-3">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span>Designs shared via WhatsApp, Email, or Dashboard for approval</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span>Customer assumes full responsibility for design accuracy post-approval</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span>Minor variations may occur due to material or production processes</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-medium text-foreground">Shipping & Delivery</h3>
              <ul className="space-y-2.5 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="text-orange-500 mt-1">•</span>
                  <span>Shipped orders cannot be cancelled or refunded</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-orange-500 mt-1">•</span>
                  <span>Delivery timelines are estimates and may vary due to logistics</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-orange-500 mt-1">•</span>
                  <span>Shipping delays do not qualify for refunds</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3 p-4 rounded-lg bg-muted/20">
              <h3 className="text-base font-medium text-foreground">Replacement vs Refund</h3>
              <p className="text-muted-foreground text-sm">
                For manufacturing defects or delivery damage, replacement is provided instead of refunds. Refer to Section 8 for full eligibility details.
              </p>
            </div>

            <div className="space-y-4 p-6 rounded-xl bg-gradient-to-br from-orange-500/5 to-orange-500/10 border border-orange-500/20">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
                <h3 className="text-lg font-medium text-foreground">Orange Plan – Subscription Policy</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-foreground mb-2 text-sm">Subscription Cancellation</h4>
                  <ul className="space-y-2 text-muted-foreground text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-orange-500 mt-0.5">•</span>
                      <span>Cancel anytime from account settings</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-500 mt-0.5">•</span>
                      <span>Cancellation stops future billing only</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-500 mt-0.5">•</span>
                      <span>Paid periods are non-refundable</span>
                    </li>
                  </ul>
                </div>
                
                <div className="pt-3 border-t border-orange-500/20">
                  <h4 className="font-medium text-foreground mb-2 text-sm">Refund Policy</h4>
                  <ul className="space-y-2 text-muted-foreground text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-muted-foreground/40 mt-0.5">×</span>
                      <span>No refunds for partially used subscription periods</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-muted-foreground/40 mt-0.5">×</span>
                      <span>No refunds for benefits already claimed (free cards, premium features)</span>
                    </li>
                  </ul>
                </div>
                
                <div className="pt-3 border-t border-orange-500/20">
                  <h4 className="font-medium text-foreground mb-2 text-sm">Post-Cancellation</h4>
                  <ul className="space-y-2 text-muted-foreground text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-orange-500 mt-0.5">→</span>
                      <span>Free NFC card benefit discontinued for future renewals</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-500 mt-0.5">→</span>
                      <span>Previously issued cards remain active</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-3 p-5 rounded-xl bg-red-500/5 border border-red-500/20">
              <h3 className="text-base font-medium text-foreground">Non-Refundable Cases</h3>
              <p className="text-sm text-muted-foreground mb-3">Refunds will not be issued for:</p>
              <div className="grid sm:grid-cols-2 gap-2">
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-red-500 mt-0.5">×</span>
                  <span>Change of mind</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-red-500 mt-0.5">×</span>
                  <span>Incorrect customer details</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-red-500 mt-0.5">×</span>
                  <span>Customer-approved designs</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-red-500 mt-0.5">×</span>
                  <span>Material color variations</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-red-500 mt-0.5">×</span>
                  <span>Device NFC compatibility</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-red-500 mt-0.5">×</span>
                  <span>Lost or misplaced cards</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-medium text-foreground">Refund Processing</h3>
              <ul className="space-y-2.5 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="text-orange-500 mt-1">•</span>
                  <span>Approved refunds processed within 5–7 business days</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-orange-500 mt-1">•</span>
                  <span>Credited to original payment method</span>
                </li>
              </ul>
            </div>

            <div className="p-5 rounded-xl bg-muted/30 border border-border/50">
              <h3 className="text-base font-medium text-foreground mb-3">Support & Escalation</h3>
              <p className="text-sm text-muted-foreground mb-3">For cancellation or refund requests:</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">→</span>
                  <span>Email <span className="font-medium text-foreground">support@synka.in</span></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">→</span>
                  <span>Raise a request from your dashboard</span>
                </li>
              </ul>
              <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/30">
                All requests are reviewed on a case-by-case basis
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
