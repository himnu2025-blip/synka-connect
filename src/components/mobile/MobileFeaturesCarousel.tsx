// Compact features carousel for mobile landing - interactive like web version
import { useEffect, useRef } from 'react';
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
  const trackRef = useRef<HTMLDivElement>(null);
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const velocity = useRef(0);
  const lastX = useRef(0);
  const raf = useRef<number>();

  const AUTO_SPEED = 1.0; // Normal speed
  const FRICTION = 0.95;

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
    if (!trackRef.current) return;
    isDown.current = true;
    trackRef.current.setPointerCapture(e.pointerId);
    startX.current = e.clientX;
    lastX.current = e.clientX;
    scrollLeft.current = trackRef.current.scrollLeft;
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
    if (!trackRef.current) return;
    isDown.current = false;
    trackRef.current.releasePointerCapture(e.pointerId);
    glide();
  };

  return (
    <div className="relative overflow-hidden py-2 select-none">
      {/* Edge fades */}
      <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

      <div
        ref={trackRef}
        className="flex gap-3 px-4 overflow-hidden cursor-grab active:cursor-grabbing"
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
        {/* Triple items for seamless loop */}
        {[...features, ...features, ...features].map((feature, index) => (
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
  );
}