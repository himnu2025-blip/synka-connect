import { BrandLogo } from '@/components/BrandLogo';

export default function Privacy() {
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
            <h1 className="text-3xl font-bold text-foreground mb-2">🔐 PRIVACY POLICY</h1>
            <p className="text-xl text-muted-foreground">Your Privacy Matters</p>
            <p className="text-muted-foreground">SYNKA is built with privacy by design.</p>
          </div>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">1. Information We Collect</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Name, email, phone number</li>
              <li>Card and profile data</li>
              <li>CRM contacts added by you</li>
              <li>Analytics and usage data</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">2. How We Use Your Data</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>To provide and improve our services</li>
              <li>To sync and share your digital card</li>
              <li>To generate analytics and reports</li>
              <li>To provide support</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">3. Data Sharing</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>We do not sell your data</li>
              <li>Data is shared only when:
                <ul className="list-disc list-inside ml-4 mt-2">
                  <li>You choose to share your card</li>
                  <li>Required by law</li>
                </ul>
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">4. Data Security</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Industry-standard encryption</li>
              <li>Secure servers</li>
              <li>Controlled access</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">5. Your Control</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>You can edit or delete your data anytime</li>
              <li>You control what card is public</li>
              <li>You control who gets your information</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">6. Cookies</h2>
            <p className="text-muted-foreground">We use minimal cookies for:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Authentication</li>
              <li>Performance</li>
              <li>Analytics</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
