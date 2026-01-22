import { useEffect, useRef } from 'react';
import {
  CreditCard,
  ScanLine,
  MessageCircle,
  Users,
  BarChart3,
  Zap,
  Shield,
} from 'lucide-react';

const carouselFeatures = [
  {
    icon: CreditCard,
    title: 'One-tap card exchange',
    description: 'Instant sharing via NFC or QR. No apps needed.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: ScanLine,
    title: 'Every share becomes a lead',
    description: 'Contacts captured automatically, even if they don’t save.',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: MessageCircle,
    title: 'Follow-ups made effortless',
    description: 'WhatsApp & email follow-ups in one tap.',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: Users,
    title: 'Built for teams & founders',
    description: 'Track employee cards, leads & activity centrally.',
    color: 'from-indigo-500 to-violet-500',
  },
  {
    icon: BarChart3,
    title: 'See what works',
    description: 'Real-time views & engagement analytics.',
    color: 'from-rose-500 to-red-500',
  },
  {
    icon: Zap,
    title: 'AI-powered design',
    description: 'Cards & messages designed for your personality.',
    color: 'from-yellow-500 to-orange-500',
  },
  {
    icon: Shield,
    title: 'Secure by design',
    description: 'Enterprise-grade security & encryption.',
    color: 'from-teal-500 to-cyan-500',
  },
];

export function FeaturesCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);

  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const velocity = useRef(0);
  const lastX = useRef(0);
  const raf = useRef<number>();

  /** Tuned values */
  const AUTO_SPEED = 1.25; // FAST & smooth (matches premium CSS marquee)
  const FRICTION = 0.95;  // momentum decay

  /** Auto-scroll loop */
  const autoScroll = () => {
    if (!trackRef.current || isDown.current) {
      raf.current = requestAnimationFrame(autoScroll);
      return;
    }

    trackRef.current.scrollLeft += AUTO_SPEED;

    if (trackRef.current.scrollLeft >= trackRef.current.scrollWidth / 2) {
      trackRef.current.scrollLeft = 0;
    }

    raf.current = requestAnimationFrame(autoScroll);
  };

  /** Momentum after release */
  const glide = () => {
    if (!trackRef.current) return;

    velocity.current *= FRICTION;
    trackRef.current.scrollLeft += velocity.current;

    if (Math.abs(velocity.current) > 0.1) {
      requestAnimationFrame(glide);
    }
  };

  useEffect(() => {
    raf.current = requestAnimationFrame(autoScroll);
    return () => raf.current && cancelAnimationFrame(raf.current);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    isDown.current = true;
    trackRef.current!.setPointerCapture(e.pointerId);
    startX.current = e.clientX;
    lastX.current = e.clientX;
    scrollLeft.current = trackRef.current!.scrollLeft;
    velocity.current = 0;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDown.current || !trackRef.current) return;

    const x = e.clientX;
    const walk = startX.current - x;
    trackRef.current.scrollLeft = scrollLeft.current + walk;

    velocity.current = lastX.current - x;
    lastX.current = x;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    isDown.current = false;
    trackRef.current!.releasePointerCapture(e.pointerId);
    glide();
  };

  return (
    <section className="py-16 sm:py-20 px-4 bg-gradient-to-b from-muted/30 to-background overflow-hidden w-full">
      <div className="container px-4 sm:px-6">

        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold">
            Everything you need to{' '}
            <span className="gradient-text">network smarter</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mt-4">
            From sharing to follow-up, Synka handles the entire workflow automatically.
          </p>
        </div>

        {/* Carousel */}
        <div className="relative select-none">
          <div className="hidden sm:block absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="hidden sm:block absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

          <div
            ref={trackRef}
            className="flex gap-6 overflow-hidden py-4 cursor-grab active:cursor-grabbing"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            style={{
              userSelect: 'none',
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none',
              touchAction: 'pan-y',
            }}
          >
            {[...carouselFeatures, ...carouselFeatures].map((feature, index) => (
              <div
                key={index}
                className="flex-shrink-0 w-64 p-6 rounded-2xl bg-card border border-border/50 shadow-premium card-hover"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}
                >
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
