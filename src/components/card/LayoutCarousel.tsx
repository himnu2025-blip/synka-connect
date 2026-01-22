import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { LayoutType } from './CardImageSection';

export type { LayoutType } from './CardImageSection';

interface LayoutOption {
  id: LayoutType;
  name: string;
  description: string;
}

const LAYOUT_OPTIONS: LayoutOption[] = [
  { id: 'photo-logo', name: 'Classic Pro', description: 'Full photo with smart positioning' },
  { id: 'wave-split', name: 'Wave Split', description: 'Photo with wave bottom effect' },
  { id: 'minimal-circle', name: 'Minimal', description: 'Circle photo centered' },
  { id: 'logo-photo', name: 'Brand First', description: 'Logo with small photo overlay' },
  { id: 'dark-professional', name: 'Dark Executive', description: 'Blurred background with sharp photo' },
  { id: 'photo-only', name: 'Portrait', description: 'Hero card with blur fill' },
  { id: 'logo-only', name: 'Corporate', description: 'Center photo card' },
  { id: 'color', name: 'Color', description: 'Set your card theme color' },
];

const THEME_COLORS = [
  { name: 'Indigo', value: '#6366f1', text: '#ffffff' },
  { name: 'Emerald', value: '#10b981', text: '#ffffff' },
  { name: 'Rose', value: '#f43f5e', text: '#ffffff' },
  { name: 'Amber', value: '#f59e0b', text: '#1f2937' },
  { name: 'Cyan', value: '#06b6d4', text: '#ffffff' },
  { name: 'Purple', value: '#8b5cf6', text: '#ffffff' },
  { name: 'Slate', value: '#475569', text: '#ffffff' },
  { name: 'Navy', value: '#1e3a5f', text: '#ffffff' },
];

interface LayoutCarouselProps {
  open: boolean;
  onClose: () => void;
  currentLayout: LayoutType;
  currentColor: string | null;
  photoUrl?: string;
  logoUrl?: string;
  name?: string;
  onSelect: (layout: LayoutType, color: string | null) => void;
}

export function LayoutCarousel({
  open,
  onClose,
  currentLayout,
  currentColor,
  photoUrl,
  logoUrl,
  name = 'Your Name',
  onSelect,
}: LayoutCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | null>(currentColor);
  const [previousLayout, setPreviousLayout] = useState<LayoutType>(currentLayout);
  const [previousColor, setPreviousColor] = useState<string | null>(currentColor);

  // Set initial index based on current layout
  useEffect(() => {
    if (open) {
      const idx = LAYOUT_OPTIONS.findIndex(o => o.id === currentLayout);
      setActiveIndex(idx >= 0 ? idx : 0);
      setPreviousLayout(currentLayout);
      setPreviousColor(currentColor);
      setSelectedColor(currentColor);
    }
  }, [open, currentLayout, currentColor]);

  const handlePrev = useCallback(() => {
    setActiveIndex(prev => (prev > 0 ? prev - 1 : LAYOUT_OPTIONS.length - 1));
  }, []);

  const handleNext = useCallback(() => {
    setActiveIndex(prev => (prev < LAYOUT_OPTIONS.length - 1 ? prev + 1 : 0));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'Escape') onClose();
      else if (e.key === 'Enter') handleApply();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, handlePrev, handleNext, onClose]);

  const handleApply = () => {
    const layout = LAYOUT_OPTIONS[activeIndex].id;
    const color = layout === 'color' ? selectedColor : currentColor;
    onSelect(layout, color);
    
    // Show undo toast
    toast({
      title: 'Layout applied',
      description: 'Your card design has been updated.',
      action: (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onSelect(previousLayout, previousColor);
            toast({ title: 'Reverted', description: 'Layout change undone.' });
          }}
        >
          Undo
        </Button>
      ),
      duration: 8000,
    });
    
    onClose();
  };

  const getInitials = (n: string) =>
    n.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';

  if (!open) return null;

  const currentOption = LAYOUT_OPTIONS[activeIndex];

  const renderPreview = () => {
    const themeColor = selectedColor || '#6366f1';
    const textColor = THEME_COLORS.find(c => c.value === themeColor)?.text || '#ffffff';

    // 1. CLASSIC PRO — FULL PHOTO WITH SMART POSITIONING
    if (currentOption.id === 'photo-logo') {
      return (
        <div className="w-full max-w-xs mx-auto overflow-hidden rounded-3xl">
          <div className="w-full h-48 relative overflow-hidden">
            {photoUrl ? (
              <>
                <img
                  src={photoUrl}
                  aria-hidden
                  className="absolute inset-0 w-full h-full object-cover blur-2xl scale-125 opacity-50"
                />
                <img
                  src={photoUrl}
                  alt={name}
                  className="relative z-10 w-full h-full object-cover"
                />
              </>
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <span className="text-4xl font-bold text-muted-foreground/40">
                  {getInitials(name)}
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }

    // 2. WAVE SPLIT — FULL PHOTO WITH WAVE BOTTOM
    if (currentOption.id === 'wave-split') {
      return (
        <div className="relative w-full max-w-xs mx-auto">
          <div className="w-full h-48 overflow-hidden rounded-3xl relative">
            {photoUrl ? (
              <>
                <img
                  src={photoUrl}
                  aria-hidden
                  className="absolute inset-0 w-full h-full object-cover blur-2xl scale-125 opacity-50"
                />
                <img
                  src={photoUrl}
                  alt={name}
                  className="relative z-10 w-full h-full object-cover"
                />
              </>
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <span className="text-4xl font-bold text-muted-foreground/40">
                  {getInitials(name)}
                </span>
              </div>
            )}
          </div>
          <svg
            className="absolute bottom-[-1px] left-0 w-full z-20"
            viewBox="0 0 400 50"
            preserveAspectRatio="none"
          >
            <path
              d="M0,25 Q100,50 200,25 T400,25 L400,50 L0,50 Z"
              className="fill-background"
            />
          </svg>
        </div>
      );
    }

    // 3. MINIMAL CIRCLE — SMART FACE POSITIONING
    if (currentOption.id === 'minimal-circle') {
      return (
        <div className="flex justify-center pt-4">
          <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-primary/20 shadow-lg">
            {photoUrl ? (
              <img 
                src={photoUrl} 
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                <span className="text-3xl font-bold text-primary">
                  {getInitials(name)}
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }

    // 4. BRAND FIRST — LOGO WITH SMART PHOTO
    if (currentOption.id === 'logo-photo') {
      return (
        <div className="w-full flex justify-center pt-6 pb-4">
          <div className="relative">
            <div className="w-36 h-36 rounded-3xl overflow-hidden shadow-lg">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <span className="text-2xl font-bold text-muted-foreground">
                    LOGO
                  </span>
                </div>
              )}
            </div>
            {photoUrl && (
              <div className="absolute -bottom-3 -left-3 w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-lg bg-white">
                <img
                  src={photoUrl}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </div>
      );
    }

    // 5. DARK EXECUTIVE — BLURRED BACKGROUND WITH SHARP PHOTO
    if (currentOption.id === 'dark-professional') {
      return (
        <div className="relative w-full max-w-xs mx-auto h-48 rounded-3xl overflow-hidden">
          {photoUrl && (
            <img
              src={photoUrl}
              aria-hidden
              className="absolute inset-0 h-full object-cover blur-xl scale-110 opacity-70"
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center px-4 py-4">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={name}
                className="max-h-full max-w-full object-contain rounded-2xl shadow-xl z-10"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-muted flex items-center justify-center">
                <span className="text-2xl font-bold text-muted-foreground">
                  {getInitials(name)}
                </span>
              </div>
            )}
          </div>
          {logoUrl && (
            <div className="absolute bottom-3 right-3 w-10 h-10 rounded-full overflow-hidden shadow-lg z-20 bg-black/20 backdrop-blur-md">
              <img
                src={logoUrl}
                alt="Logo"
                className="w-full h-full object-contain"
              />
            </div>
          )}
        </div>
      );
    }

    // 6. PORTRAIT — HERO CARD WITH BLUR FILL (APPLE STYLE)
    if (currentOption.id === 'photo-only') {
      return (
        <div className="relative w-full max-w-xs mx-auto aspect-[3/4] rounded-3xl overflow-hidden">
          {photoUrl && (
            <img
              src={photoUrl}
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover blur-xl scale-110 opacity-70"
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center p-4">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={name}
                className="max-h-full max-w-full object-contain rounded-2xl shadow-xl"
              />
            ) : (
              <div className="w-32 h-32 rounded-2xl bg-muted flex items-center justify-center">
                <span className="text-3xl font-bold text-muted-foreground">
                  {getInitials(name)}
                </span>
              </div>
            )}
          </div>
          <div className="absolute bottom-4 left-0 right-0 px-6 text-center pointer-events-none z-20">
            <h2 className="text-lg font-semibold text-white drop-shadow-md">
              {name}
            </h2>
          </div>
        </div>
      );
    }

    // 7. CORPORATE — CENTER PHOTO WITH SMART POSITIONING
    if (currentOption.id === 'logo-only') {
      return (
        <div className="w-full bg-white flex justify-center pt-4 pb-2 rounded-3xl">
          {photoUrl ? (
            <div className="w-28 h-28 rounded-3xl overflow-hidden shadow-lg">
              <img
                src={photoUrl}
                alt={name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-28 h-28 rounded-3xl bg-muted flex items-center justify-center">
              <span className="text-2xl font-bold text-muted-foreground">
                {getInitials(name)}
              </span>
            </div>
          )}
        </div>
      );
    }

    // 8. COLOR — INITIALS ONLY
    if (currentOption.id === 'color') {
      return (
        <div className="space-y-6">
          <div className="w-full bg-white flex justify-center pt-4 pb-2 rounded-3xl">
            <div
              className="w-28 h-28 rounded-3xl flex items-center justify-center shadow-lg"
              style={{ backgroundColor: themeColor }}
            >
              <span
                className="text-2xl font-bold select-none"
                style={{ color: textColor }}
              >
                {getInitials(name)}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3 max-w-xs mx-auto">
            {THEME_COLORS.map(color => (
              <button
                key={color.value}
                onClick={() => setSelectedColor(color.value)}
                className={cn(
                  'w-12 h-12 rounded-full transition-all duration-200 border-2',
                  selectedColor === color.value
                    ? 'border-foreground scale-110 shadow-lg'
                    : 'border-transparent hover:scale-105'
                )}
                style={{ backgroundColor: color.value }}
                title={color.name}
              >
                {selectedColor === color.value && (
                  <Check className="w-5 h-5 mx-auto" style={{ color: color.text }} />
                )}
              </button>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm animate-fade-in flex items-center justify-center"
      style={{ height: '100dvh' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md mx-auto p-6 max-h-[90dvh] overflow-y-auto flex flex-col items-center"
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-0 right-0 w-10 h-10 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Layout name & description */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">{currentOption.name}</h2>
          <p className="text-muted-foreground">{currentOption.description}</p>
        </div>

        {/* Preview area */}
        <div className="w-full flex items-center justify-center min-h-[280px]">
          {renderPreview()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-6 mt-8">
          <button
            onClick={handlePrev}
            className="w-12 h-12 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </button>

          {/* Dots indicator */}
          <div className="flex items-center gap-2">
            {LAYOUT_OPTIONS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={cn(
                  'w-2 h-2 rounded-full transition-all duration-200',
                  idx === activeIndex ? 'w-6 bg-primary' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                )}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="w-12 h-12 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-6 h-6 text-foreground" />
          </button>
        </div>

        {/* Apply button */}
        <Button
          variant="gradient"
          size="lg"
          className="mt-8 min-w-[200px]"
          onClick={handleApply}
        >
          <Check className="w-5 h-5 mr-2" />
          Apply Layout
        </Button>

        {/* Swipe hint for mobile */}
        <p className="text-xs text-muted-foreground mt-4">
          Swipe or use arrow keys to browse
        </p>
      </div>
    </div>
  );
}
