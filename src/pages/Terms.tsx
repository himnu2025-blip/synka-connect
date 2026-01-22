import { BrandLogo } from '@/components/BrandLogo';

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-center mb-8">
          <BrandLogo size="lg" asLink={true} />
        </div>

        {/* Content */}
        <div className="space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground mb-2">📄 TERMS</h1>
            <p className="text-xl text-muted-foreground">Welcome to SYNKA</p>
            <p className="text-muted-foreground">By using SYNKA, you agree to the following terms.</p>
          </div>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">1. Service Overview</h2>
            <p className="text-muted-foreground">
              SYNKA provides digital business cards, CRM tools, NFC card services, analytics, and sharing features.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">2. User Accounts</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>You are responsible for maintaining the confidentiality of your account.</li>
              <li>All information provided must be accurate.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">3. Free & Orange Plans</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Free plan includes limited features.</li>
              <li>Orange plan unlocks premium features including multiple cards, analytics, downloads, and documents.</li>
              <li>Pricing and features may change with prior notice.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">4. NFC Cards</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Physical cards are non-refundable once written or customized.</li>
              <li>SYNKA is not responsible for device NFC limitations.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">5. Acceptable Use</h2>
            <p className="text-muted-foreground">You agree not to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Misuse the platform</li>
              <li>Share illegal, harmful, or misleading content</li>
              <li>Attempt to hack or disrupt the service</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">6. Termination</h2>
            <p className="text-muted-foreground">
              We reserve the right to suspend or terminate accounts violating these terms.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">7. Updates</h2>
            <p className="text-muted-foreground">
              Terms may be updated from time to time. Continued use means acceptance.
            </p>
          </section>

          {/* Free Replacement Policy */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">8. Free Replacement Policy</h2>
            
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-foreground">PVC NFC Cards</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>One free replacement is provided within 6 months of delivery if the card is lost or misplaced.</li>
                <li>Replacement is limited to one time per card.</li>
                <li>Courier / shipping charges must be borne by the customer.</li>
                <li>Damage due to misuse, bending, or intentional harm is not covered.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-medium text-foreground">Metal NFC Cards</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Metal cards are built for lifetime durability.</li>
                <li>One free replacement is available within 6 months of delivery in case of loss or manufacturing defects.</li>
                <li>Courier charges apply.</li>
                <li>Cosmetic wear over time (scratches, patina) is normal and not considered a defect.</li>
              </ul>
            </div>

            <div className="space-y-3 p-4 rounded-xl bg-primary/10 border border-primary/20">
              <h3 className="text-lg font-medium text-foreground">🟧 Orange Plan – NFC Card Free Forever</h3>
              <p className="text-muted-foreground">For Orange plan users, we go further:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>NFC card is free for life as long as the user remains on the Orange plan.</li>
                <li>Includes free replacement or reprint every 6 months.</li>
                <li>Covers: Lost card, Reprint due to design update, Wear & tear</li>
                <li>Courier charges apply for each dispatch.</li>
                <li>Replacement eligibility resets every 6 months.</li>
                <li>Benefits stop if the Orange plan is cancelled or downgraded.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-medium text-foreground">⚠️ Important Notes</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Replacement requests must be raised from the registered account.</li>
                <li>Design approval is mandatory before reprint.</li>
                <li>Synka reserves the right to verify eligibility before processing replacement.</li>
              </ul>
            </div>
          </section>

          {/* Cancellation & Refund Policy */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">9. Cancellation & Refund Policy</h2>
            
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-foreground">Order Cancellation</h3>
              <p className="text-muted-foreground">Because all NFC cards are custom-made, cancellations depend on the order stage.</p>
              
              <div className="pl-4 space-y-3">
                <div>
                  <h4 className="font-medium text-foreground">Before Design Approval</h4>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Orders can be cancelled within 24 hours of placing the order or before design approval, whichever is earlier.</li>
                    <li>A full refund will be issued (excluding payment gateway charges, if applicable).</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-foreground">After Design Approval</h4>
                  <p className="text-muted-foreground">Once the design is approved and production has started:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>❌ Order cannot be cancelled</li>
                    <li>❌ No refunds will be provided</li>
                  </ul>
                  <p className="text-muted-foreground text-sm mt-1">This applies to both PVC and Metal NFC cards.</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-medium text-foreground">🎨 Design Approval Responsibility</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Designs are shared via WhatsApp / Email / Dashboard for approval.</li>
                <li>Once approved by the customer, all responsibility for design accuracy rests with the customer.</li>
                <li>Minor color or engraving variations may occur due to material or production processes.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-medium text-foreground">🚚 Shipping & Delivery</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Orders already shipped cannot be cancelled or refunded.</li>
                <li>Delivery timelines are estimates and may vary due to logistics or external factors.</li>
                <li>Shipping delays do not qualify for refunds.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-medium text-foreground">🔁 Replacement vs Refund</h3>
              <p className="text-muted-foreground">Replacement policies apply instead of refunds for:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Lost cards</li>
                <li>Misplacement</li>
                <li>Wear & tear</li>
              </ul>
              <p className="text-muted-foreground text-sm">Please refer to the Replacement Policy for eligibility.</p>
            </div>

            <div className="space-y-3 p-4 rounded-xl bg-primary/10 border border-primary/20">
              <h3 className="text-lg font-medium text-foreground">🟧 Orange Plan – Subscription Policy</h3>
              
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">Subscription Cancellation</h4>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Orange plan can be cancelled anytime from account settings.</li>
                  <li>Cancellation stops future billing only.</li>
                  <li>Already paid subscription periods are non-refundable.</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">Orange Plan Refunds</h4>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>❌ No refunds for partially used subscription periods.</li>
                  <li>❌ No refunds for benefits already availed (including free NFC cards, reprints, or replacements).</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">If Orange Plan Is Cancelled</h4>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Free NFC card and replacement benefits are discontinued.</li>
                  <li>Previously issued cards remain active.</li>
                </ul>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-medium text-foreground">⚠️ Non-Refundable Cases</h3>
              <p className="text-muted-foreground">Refunds will not be issued for:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Change of mind</li>
                <li>Incorrect details shared by the customer</li>
                <li>Design approved by customer</li>
                <li>Color variation due to material differences</li>
                <li>NFC compatibility issues caused by unsupported devices</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-medium text-foreground">💳 Refund Processing Timeline</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Approved refunds (if applicable) are processed within 5–7 business days.</li>
                <li>Refunds are credited to the original payment method.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-medium text-foreground">📩 Support & Escalation</h3>
              <p className="text-muted-foreground">For cancellation or refund requests:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Contact us at support@synka.in</li>
                <li>Or raise a request from your dashboard</li>
              </ul>
              <p className="text-muted-foreground text-sm">All requests are reviewed on a case-by-case basis.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
