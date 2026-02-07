import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpotlightStep {
  targetId: string;
  title: string;
  description: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
}

const STEPS: SpotlightStep[] = [
  {
    targetId: 'nav-my-card',
    title: 'Your Digital Card',
    description: 'Edit your details, upload photo or logo here.',
    placement: 'top',
  },
];

const STORAGE_KEY = 'synka_first_login_guide_done';

export function FirstLoginGuide() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Check if guide should show
  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      // Delay to let the page render
      const timer = setTimeout(() => setIsVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  // Measure target element position
  const measureTarget = useCallback(() => {
    if (!isVisible) return;
    const step = STEPS[currentStep];
    if (!step) return;

    // Try mobile nav first, then desktop nav
    let el = document.getElementById(step.targetId);
    if (!el || el.offsetParent === null) {
      el = document.getElementById(step.targetId + '-desktop');
    }
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    }
  }, [isVisible, currentStep]);

  useEffect(() => {
    measureTarget();
    window.addEventListener('resize', measureTarget);
    window.addEventListener('scroll', measureTarget, true);
    return () => {
      window.removeEventListener('resize', measureTarget);
      window.removeEventListener('scroll', measureTarget, true);
    };
  }, [measureTarget]);

  const dismiss = useCallback(() => {
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      dismiss();
    }
  }, [currentStep, dismiss]);

  if (!isVisible || !targetRect) return null;

  const step = STEPS[currentStep];
  const padding = 8;

  // Spotlight cutout dimensions
  const cutout = {
    x: targetRect.left - padding,
    y: targetRect.top - padding,
    width: targetRect.width + padding * 2,
    height: targetRect.height + padding * 2,
    rx: 14,
  };

  // Tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    const gap = 12;
    switch (step.placement) {
      case 'top':
        return {
          left: Math.max(16, cutout.x + cutout.width / 2 - 140),
          bottom: window.innerHeight - cutout.y + gap,
        };
      case 'bottom':
        return {
          left: Math.max(16, cutout.x + cutout.width / 2 - 140),
          top: cutout.y + cutout.height + gap,
        };
      case 'left':
        return {
          right: window.innerWidth - cutout.x + gap,
          top: cutout.y + cutout.height / 2 - 40,
        };
      case 'right':
        return {
          left: cutout.x + cutout.width + gap,
          top: cutout.y + cutout.height / 2 - 40,
        };
    }
  };

  // Arrow pointing toward the target
  const getArrowStyle = (): React.CSSProperties & { className: string } => {
    switch (step.placement) {
      case 'top':
        return {
          left: '50%',
          bottom: -6,
          transform: 'translateX(-50%) rotate(45deg)',
          className: '',
        };
      case 'bottom':
        return {
          left: '50%',
          top: -6,
          transform: 'translateX(-50%) rotate(45deg)',
          className: '',
        };
      default:
        return { left: 0, top: 0, className: '' };
    }
  };

  const arrowProps = getArrowStyle();

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] animate-fade-in"
      onClick={dismiss}
    >
      {/* SVG overlay with spotlight cutout */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={cutout.x}
              y={cutout.y}
              width={cutout.width}
              height={cutout.height}
              rx={cutout.rx}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.65)"
          mask="url(#spotlight-mask)"
          style={{ pointerEvents: 'auto' }}
        />
      </svg>

      {/* Glowing ring around target */}
      <div
        className="absolute rounded-[14px] ring-2 ring-primary/60 shadow-[0_0_20px_rgba(var(--primary-rgb,255,109,0),0.3)]"
        style={{
          left: cutout.x,
          top: cutout.y,
          width: cutout.width,
          height: cutout.height,
          pointerEvents: 'none',
        }}
      />

      {/* Tooltip card */}
      <div
        className="absolute w-[280px] max-w-[calc(100vw-32px)] bg-background border border-border/60 rounded-2xl p-4 shadow-2xl animate-scale-in"
        style={getTooltipStyle()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Arrow */}
        <div
          className="absolute w-3 h-3 bg-background border-b border-r border-border/60"
          style={{
            left: arrowProps.left,
            top: arrowProps.top,
            bottom: (arrowProps as any).bottom,
            transform: arrowProps.transform,
          }}
        />

        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <p className="text-sm font-semibold text-foreground mb-1 pr-6">{step.title}</p>
        <p className="text-[13px] text-muted-foreground leading-relaxed">{step.description}</p>

        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-muted-foreground/60">
            {currentStep + 1} / {STEPS.length}
          </span>
          <button
            onClick={handleNext}
            className="px-4 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors active:scale-95"
          >
            {currentStep < STEPS.length - 1 ? 'Next' : 'Got it'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
