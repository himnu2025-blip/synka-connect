// Compact features carousel for mobile landing
import {
  CreditCard,
  ScanLine,
  MessageCircle,
  Calendar,
  Users,
  BarChart3,
  Zap,
  Shield,
} from 'lucide-react';

const features = [
  { icon: CreditCard, title: 'NFC & QR Sharing', color: 'from-blue-500 to-cyan-500' },
  { icon: ScanLine, title: 'Auto Lead Capture', color: 'from-purple-500 to-pink-500' },
  { icon: MessageCircle, title: 'One-Click Follow-up', color: 'from-green-500 to-emerald-500' },
  { icon: Calendar, title: 'Event Tagging', color: 'from-orange-500 to-amber-500' },
  { icon: Users, title: 'Built-in CRM', color: 'from-indigo-500 to-violet-500' },
  { icon: BarChart3, title: 'Analytics', color: 'from-rose-500 to-red-500' },
  { icon: Zap, title: 'AI Templates', color: 'from-yellow-500 to-orange-500' },
  { icon: Shield, title: 'Secure', color: 'from-teal-500 to-cyan-500' },
];

export function MobileFeaturesCarousel() {
  return (
    <div className="relative overflow-hidden">
      <div className="flex gap-3 overflow-hidden py-2 px-4">
        <div
          className="flex gap-3"
          style={{ animation: 'mobileScroll 20s linear infinite' }}
        >
          {[...features, ...features].map((feature, index) => (
            <div
              key={index}
              className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-full bg-card border border-border/50 shadow-sm"
            >
              <div
                className={`w-7 h-7 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center`}
              >
                <feature.icon className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-xs font-medium text-foreground whitespace-nowrap">
                {feature.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes mobileScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
