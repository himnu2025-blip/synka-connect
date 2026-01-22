import { BrandLogo } from '@/components/BrandLogo';
import { Mail, Building2, Globe, Clock } from 'lucide-react';

export default function Contact() {
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
            <h1 className="text-3xl font-bold text-foreground mb-2">📞 CONTACT US</h1>
            <p className="text-xl text-muted-foreground">We'd love to hear from you.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">📧 Email</h2>
              </div>
              <div className="space-y-2 text-muted-foreground">
                <p><span className="font-medium">Support:</span> <a href="mailto:support@synka.in" className="text-primary hover:underline">support@synka.in</a></p>
                <p><span className="font-medium">Sales & Orders:</span> <a href="mailto:orders@synka.in" className="text-primary hover:underline">orders@synka.in</a></p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">🏢 Business Name</h2>
              </div>
              <div className="text-muted-foreground">
                <p>SYNKA Technologies Pvt Ltd,</p>
                <p>India</p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">🌐 Website</h2>
              </div>
              <div className="text-muted-foreground">
                <a href="https://synka.in" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  https://synka.in
                </a>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">🕘 Support Hours</h2>
              </div>
              <div className="text-muted-foreground">
                <p>Monday – Saturday</p>
                <p>09:00 AM – 7:00 PM IST</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
