// Mobile-only landing page for native app (Android / iOS)
// Optimised, conversion-focused, Apple-style

import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Check } from 'lucide-react';
import { MobileFeaturesCarousel } from './MobileFeaturesCarousel';
import { hapticFeedback } from '@/lib/haptics';
import { SairaChatWidget } from '@/components/chat/SairaChatWidget';

const POINTERS_SET_1 = [
  '1-tap digital business card exchange (NFC + QR)',
  'Automatic lead capture',
  'Smart follow-ups & reminders',
  'Real-time analytics',
];

const POINTERS_SET_2 = [
  'Built-in CRM for contacts & notes',
  'Team & employee card tracking',
  'Founder & manager dashboards',
  'AI-designed digital cards & templates',
];

interface MobileLandingProps {
  onBiometricLogin?: () => void;
  biometricInfo?: {
    available: boolean;
    biometryType?: string;
    hasCredentials?: boolean;
  } | null;
  isBiometricLoading?: boolean;
}

export function MobileLanding({
  onBiometricLogin,
  biometricInfo,
  isBiometricLoading,
}: MobileLandingProps) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [pointerSet, setPointerSet] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPointerSet((prev) => (prev === 0 ? 1 : 0));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleNavigate = (path: string) => {
    hapticFeedback.light();
    navigate(path);
  };

  const activePointers =
    pointerSet === 0 ? POINTERS_SET_1 : POINTERS_SET_2;

  return (
    <div
      ref={containerRef}
      className="relative min-h-dvh w-full flex flex-col bg-background"
    >
      {/* ===== BACKGROUND IMAGE ===== */}
      <div
        className="absolute inset-0 -z-10 bg-center bg-cover opacity-[0.05] blur-2xl scale-110"
        style={{
          backgroundImage:
            "url('/images/ai/ai-digital-nfc-business-visiting-card-synka.jpg')",
        }}
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-background/90 to-background" />

      {/* ===== HEADER ===== */}
      <header className="flex items-center justify-between px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <img
            src="/logos/synka-logo.png"
            alt="Synka"
            className="w-8 h-8 object-contain"
          />
          <span className="text-lg font-anta font-bold tracking-tight gradient-text">
            SYNKA<sup className="text-[0.5em] ml-0.5 opacity-70">™</sup>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleNavigate('/login')}
            className="text-sm px-3"
          >
            Login
          </Button>
          <Button
            size="sm"
            onClick={() => handleNavigate('/signup')}
            className="text-sm px-4 rounded-full bg-primary text-primary-foreground"
          >
            Sign up
          </Button>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <main className="px-4 text-center pt-4">
        {/* TAG */}
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
          SYNKA™ — Simply Connected
        </div>

        {/* H1 */}
        <h1 className="text-[1.6rem] font-bold leading-tight tracking-tight">
          India’s most powerful{' '}
          <span className="gradient-text">digital business card</span>
        </h1>

        {/* SUBHEADER */}
        <p className="text-sm text-muted-foreground mt-3 max-w-[22rem] mx-auto">
          Smart NFC & QR business cards that share instantly and capture leads.
          AI-designed cards with built-in CRM and real-time analytics.
        </p>

        {/* POINTERS */}
        <div className="relative mt-6 h-[110px] sm:h-[96px] overflow-hidden">
          <motion.div
            key={pointerSet}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 gap-3 text-left max-w-sm mx-auto"
          >
            {activePointers.map((point) => (
              <div key={point} className="flex items-start gap-2">
                <Check className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">
                  {point}
                </span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* CTA */}
        <Button
          size="lg"
          onClick={() => handleNavigate('/signup')}
          className="w-full mt-6 py-5 text-base rounded-full bg-primary text-primary-foreground shadow-lg active:scale-[0.98] transition-transform"
        >
          Create your free card
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>

        {/* TRUST LINE */}
        <p className="text-xs text-muted-foreground mt-3">
          Free forever digital business card • Lifetime free NFC card on Orange plan
        </p>
      </main>

      {/* ===== FEATURES CAROUSEL ===== */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.25 }}
        className="mt-3"
      >
        <MobileFeaturesCarousel />
      </motion.div>

      {/* ===== NFC CARD PROMO ===== */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
        className="px-4 py-6"
      >
        <button
          onClick={() => handleNavigate('/order-nfc-card')}
          className="w-full overflow-hidden rounded-2xl shadow-lg active:scale-[0.98] transition-transform"
        >
          <img
            src="/images/card/metal-nfc-business-cards.webp"
            alt="Order premium metal NFC business cards"
            className="w-full h-auto object-cover"
          />
          <div className="bg-gradient-to-r from-primary to-primary/80 py-3 px-4 text-center">
            <span className="text-primary-foreground font-semibold text-sm">
              Order NFC Card →
            </span>
          </div>
        </button>
      </motion.div>

      {/* ===== FOOTER LINKS ===== */}
      <div className="flex justify-center gap-6 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <button
          onClick={() => handleNavigate('/support')}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Support
        </button>
        <button
          onClick={() => handleNavigate('/privacy')}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Privacy
        </button>
        <button
          onClick={() => handleNavigate('/terms')}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Terms
        </button>
        <button
          onClick={() => handleNavigate('/contact')}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Contact
        </button>
      </div>

      {/* ===== CHAT ===== */}
      <SairaChatWidget />
    </div>
  );
}
