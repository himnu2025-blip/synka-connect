import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CardImageSection, LayoutType } from './CardImageSection';

export type { LayoutType } from './CardImageSection';

const LAYOUTS: { id: LayoutType; name: string }[] = [
  { id: 'photo-logo', name: 'Classic Pro' },
  { id: 'wave-split', name: 'Wave Split' },
  { id: 'minimal-circle', name: 'Minimal Circle' },
  { id: 'logo-photo', name: 'Brand First' },
  { id: 'dark-professional', name: 'Dark Executive' },
  { id: 'photo-only', name: 'Portrait' },
  { id: 'logo-only', name: 'Corporate' },
  { id: 'color', name: 'Solid Color' },
];

const COLORS = [
  { value: '#6366f1', text: '#ffffff' },
  { value: '#10b981', text: '#ffffff' },
  { value: '#f43f5e', text: '#ffffff' },
  { value: '#f59e0b', text: '#1f2937' },
  { value: '#06b6d4', text: '#ffffff' },
  { value: '#8b5cf6', text: '#ffffff' },
  { value: '#475569', text: '#ffffff' },
  { value: '#1e3a5f', text: '#ffffff' },
];

const CARD_W = 260;
const CARD_H = 360;
const GAP = 20;

interface Props {
  open: boolean;
  currentLayout: LayoutType;
  currentColor: string | null;
  photoUrl?: string;
  logoUrl?: string;
  name: string;
  designation?: string;
  company?: string;
  onClose: () => void;
  onSelect: (layout: LayoutType, color: string | null) => void;
}

export function PremiumLayoutCarousel({
  open,
  currentLayout,
  currentColor,
  photoUrl,
  logoUrl,
  name,
  designation,
  company,
  onClose,
  onSelect,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const [index, setIndex] = useState(
    Math.max(0, LAYOUTS.findIndex(l => l.id === currentLayout))
  );
  const [color, setColor] = useState(currentColor || COLORS[0].value);

  const selectedLayout = LAYOUTS[index];
  const isColorLayout = selectedLayout.id === 'color';

  useEffect(() => {
    scrollRef.current?.scrollTo({
      left: index * (CARD_W + GAP),
      behavior: 'instant' as any,
    });
  }, [open]);

  useEffect(() => {
    if (open) {
      const idx = LAYOUTS.findIndex(l => l.id === currentLayout);
      setIndex(idx >= 0 ? idx : 0);
      setColor(currentColor || COLORS[0].value);
    }
  }, [open, currentLayout, currentColor]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-xl"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md mx-4 h-[85vh] rounded-3xl bg-white/85 dark:bg-black/85 backdrop-blur-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* HEADER */}
        <div className="relative flex items-center justify-center px-5 pt-3 pb-2 shrink-0">
          <h2 className="font-semibold text-foreground">
            {selectedLayout.name}
          </h2>
          <button
            onClick={onClose}
            className="absolute right-4 w-9 h-9 rounded-full bg-muted/40 hover:bg-muted flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CAROUSEL */}
        <div className="relative flex-1 overflow-hidden flex items-center">
          <button
            onClick={() =>
              scrollRef.current?.scrollBy({ left: -(CARD_W + GAP), behavior: 'smooth' })
            }
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/80 hover:bg-background flex items-center justify-center shadow-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div
            ref={scrollRef}
            onScroll={() =>
              setIndex(
                Math.round(
                  (scrollRef.current?.scrollLeft || 0) / (CARD_W + GAP)
                )
              )
            }
            className="flex gap-5 overflow-x-auto px-12 py-2 snap-x snap-mandatory scrollbar-hide h-full items-center"
          >
            {LAYOUTS.map((l, i) => (
              <div
                key={l.id}
                className={cn(
                  'snap-center shrink-0 relative transition-all duration-500 rounded-3xl overflow-hidden bg-card border border-border/40',
                  i === index ? 'scale-100 shadow-xl' : 'scale-[0.88] opacity-40'
                )}
                style={{ width: CARD_W, height: CARD_H }}
              >
                <CardImageSection
                  layout={l.id}
                  photoUrl={photoUrl}
                  logoUrl={logoUrl}
                  name={name}
                  designation={designation}
                  company={company}
                  themeColor={l.id === 'color' ? color : currentColor}
                  className="w-full"
                />
              </div>
            ))}
          </div>

          <button
            onClick={() =>
              scrollRef.current?.scrollBy({ left: CARD_W + GAP, behavior: 'smooth' })
            }
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/80 hover:bg-background flex items-center justify-center shadow-lg"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* COLOR PICKER */}
        {isColorLayout && (
          <div className="flex justify-center gap-3 px-4 pt-2 pb-1 shrink-0">
            {COLORS.map(c => (
              <button
                key={c.value}
                onClick={() => setColor(c.value)}
                className={cn(
                  'w-8 h-8 rounded-full transition-all duration-200 border-2',
                  color === c.value
                    ? 'border-foreground scale-110 shadow-lg'
                    : 'border-transparent hover:scale-105'
                )}
                style={{ backgroundColor: c.value }}
              >
                {color === c.value && (
                  <Check className="w-4 h-4 mx-auto" style={{ color: c.text }} />
                )}
              </button>
            ))}
          </div>
        )}

        {/* APPLY */}
        <div className="px-4 pt-2 pb-3 shrink-0">
          <Button
            type="button"
            variant="gradient"
            size="xl"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(
                selectedLayout.id,
                isColorLayout ? color : currentColor
              );
              onClose();
            }}
          >
            <Check className="w-5 h-5 mr-2" />
            Apply
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
