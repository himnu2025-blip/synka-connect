import { useState, useEffect } from 'react';
import { MessageCircle, Mail, Phone, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AnimatedCard() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const i = setInterval(() => setStep((s) => (s + 1) % 4), 3500);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="relative w-full max-w-sm mx-auto">
      <div className="absolute inset-0 gradient-bg opacity-20 blur-3xl rounded-full scale-150" />

      <div className="relative glass rounded-3xl p-6 shadow-premium transition-all duration-700">
        {step === 0 && (
          <Block title="Card shared">
            <p className="text-sm text-muted-foreground">Viewed via NFC / QR</p>
          </Block>
        )}
        {step === 1 && (
          <Block title="Lead saved automatically">
            <p className="text-sm text-muted-foreground">Contact added to CRM</p>
          </Block>
        )}
        {step === 2 && (
          <Block title="Interaction logged">
            <div className="flex gap-2 text-muted-foreground text-sm">
              <MessageCircle className="h-4 w-4" /> WhatsApp sent
            </div>
            <div className="flex gap-2 text-muted-foreground text-sm">
              <Mail className="h-4 w-4" /> Email sent
            </div>
            <div className="flex gap-2 text-muted-foreground text-sm">
              <Phone className="h-4 w-4" /> Call logged
            </div>
          </Block>
        )}
        {step === 3 && (
          <Block title="Event tagged">
            <div className="flex gap-2 text-muted-foreground text-sm">
              <Calendar className="h-4 w-4" /> Expo 2025
            </div>
          </Block>
        )}
      </div>

      <div className="flex justify-center gap-2 mt-4">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn("w-2 h-2 rounded-full", step === i ? "bg-primary w-6" : "bg-muted")} />
        ))}
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 animate-fade-up">
      <h4 className="font-semibold">{title}</h4>
      {children}
    </div>
  );
}
