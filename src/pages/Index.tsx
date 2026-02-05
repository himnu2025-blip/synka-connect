import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FeaturesCarousel } from '@/components/landing/FeaturesCarousel';
import { Features } from '@/components/landing/Features';
import { Personas } from '@/components/landing/Personas';
import { CardGallery } from '@/components/landing/CardGallery';
import { Footer } from '@/components/landing/Footer';
import { ArrowRight, Check } from 'lucide-react';
import { ScaleSection } from '@/components/landing/ScaleSection';
import { useImagePreloader } from '@/hooks/useImagePreloader';
import { SairaChatWidget } from '@/components/chat/SairaChatWidget';

const HERO_IMAGES = [
  '/images/ai/ai-digital-nfc-business-visiting-card-synka.jpg',
  '/images/ai/cofounder-primary.webp',
];

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

export default function Index() {
  const navigate = useNavigate();
  const [pointerSet, setPointerSet] = useState(0);

  useImagePreloader(HERO_IMAGES);

  useEffect(() => {
    const interval = setInterval(() => {
      setPointerSet((prev) => (prev === 0 ? 1 : 0));
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const activePointers = pointerSet === 0 ? POINTERS_SET_1 : POINTERS_SET_2;

  return (
    <div className="min-h-dvh w-full overflow-x-hidden bg-background">

      {/* HERO */}
      <section className="relative bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="max-w-7xl mx-auto py-10 md:py-16 px-3 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-10 items-center">

            {/* LEFT */}
            <div className="space-y-6 text-center lg:text-left">

              {/* Top Tag */}
              <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
              SYNKA™ — Simply Connected
              </div>

              {/* H1 */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight">
                India’s most powerful{' '}
                <span className="gradient-text">digital business card</span>
              </h1>

              {/* SEO-Optimized Subheading */}
              <div className="space-y-2">
                <p className="text-lg sm:text-xl font-medium text-foreground">
                  Smart NFC & QR business cards that share instantly and capture leads.
                </p>
                <p className="text-base sm:text-lg text-muted-foreground">
                  AI-designed cards with built-in CRM and real-time analytics — all in one platform.
                </p>
              </div>

              {/* Rotating pointers */}
              <div className="relative h-28 max-w-xl mx-auto lg:mx-0">
                <div
                  key={pointerSet}
                  className="absolute inset-0 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 animate-fade"
                >
                  {activePointers.map((point) => (
                    <div key={point} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                      <span className="text-sm sm:text-base text-muted-foreground">
                        {point}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center lg:justify-start">
                <Button
                  size="lg"
                  onClick={() => navigate('/signup')}
                  className="group bg-primary text-primary-foreground px-8 py-6 rounded-full shadow-lg"
                >
                  Create your free card
                  <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate('/contact')}
                  className="px-8 py-6 rounded-full"
                >
                  Talk to us
                </Button>
              </div>

              {/* Trust line */}
              <p className="text-sm text-muted-foreground">
                Free forever digital business card • Lifetime free NFC visiting card on Orange (Pro) plan
              </p>
            </div>

            {/* RIGHT VISUAL */}
            <div className="relative flex justify-center lg:justify-end">
              <div className="relative w-full max-w-sm md:max-w-md">
                <img
                  src="/images/ai/ai-digital-nfc-business-visiting-card-synka.jpg"
                  alt="Synka NFC digital business card"
                  className="w-full rounded-3xl shadow-2xl"
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      <FeaturesCarousel />
      <Features />
      <Personas />
      <ScaleSection />

      {/* AI SECTION */}
      <section className="py-16 bg-muted/30 text-center">
        <div className="container max-w-4xl space-y-6">
          <img
            src="/images/ai/cofounder-primary.webp"
            alt="AI designed digital business card"
            className="mx-auto w-36 h-36 rounded-full shadow-lg"
          />
          <h2 className="text-3xl font-bold">
            Designed by AI. Powered by intelligence.
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            India’s first AI-designed digital business card — tailored to your business,
            role, and personality.
          </p>
        </div>
      </section>

      <CardGallery />

      {/* FINAL CTA */}
      <section className="py-20">
        <div className="container">
          <div className="gradient-bg rounded-3xl p-12 text-center">
            <h2 className="text-4xl font-bold text-primary-foreground">
              Create your digital business card in minutes
            </h2>
            <p className="text-primary-foreground/80 mt-3">
              Replace paper visiting cards forever with NFC-powered networking.
            </p>
            <Button
              size="lg"
              onClick={() => navigate('/signup')}
              className="mt-6 bg-background text-foreground px-10 py-6 rounded-full"
            >
              Get started for free
            </Button>
          </div>
        </div>
      </section>

      <Footer />
      <SairaChatWidget />

      <style>{`
        .animate-fade {
          animation: fadeUp 0.6s ease both;
        }
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
