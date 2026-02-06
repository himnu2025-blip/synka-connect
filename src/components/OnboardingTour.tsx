import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useOnboarding, OnboardingStep } from '@/hooks/useOnboarding';
import { cn } from '@/lib/utils';
import { X, ChevronRight, Sparkles } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

interface TourStep {
  id: OnboardingStep;
  title: string;
  description: string;
  targetSelector: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  action?: string;
  route?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'mycard-edit',
    title: '✏️ Edit Your Card',
    description: 'Tap here to customize your digital business card. Add your photo, contact info, social links, and more!',
    targetSelector: '[data-tour="edit-button"]',
    position: 'bottom',
    action: 'Next',
    route: '/my-card',
  },
  {
    id: 'mycard-share',
    title: '📤 Share Your Card',
    description: 'Share your digital card instantly via QR code, link, or directly to contacts. Network smarter!',
    targetSelector: '[data-tour="share-button"]',
    position: 'bottom',
    action: 'Got it!',
    route: '/my-card',
  },
];

interface SpotlightPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function OnboardingTour() {
  const location = useLocation();
  const { shouldShowTour, currentStep, skipTour, nextStep, isLoading } = useOnboarding();
  const [spotlight, setSpotlight] = useState<SpotlightPosition | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const observerRef = useRef<MutationObserver | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentTourStep = TOUR_STEPS.find(step => step.id === currentStep);

  // Find and highlight target element
  const updateSpotlight = useCallback(() => {
    if (!currentTourStep) return;

    const targetElement = document.querySelector(currentTourStep.targetSelector);
    
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      const padding = 8;

      const newSpotlight = {
        top: rect.top - padding + window.scrollY,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      };

      setSpotlight(newSpotlight);

      // Calculate tooltip position
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const tooltipHeight = 180;
      const tooltipWidth = Math.min(320, viewportWidth - 32);

      let tooltipTop = 0;
      let tooltipLeft = 0;

      if (currentTourStep.position === 'bottom') {
        tooltipTop = rect.bottom + 16 + window.scrollY;
        tooltipLeft = Math.max(16, Math.min(rect.left + rect.width / 2 - tooltipWidth / 2, viewportWidth - tooltipWidth - 16));
      } else if (currentTourStep.position === 'top') {
        tooltipTop = rect.top - tooltipHeight - 16 + window.scrollY;
        tooltipLeft = Math.max(16, Math.min(rect.left + rect.width / 2 - tooltipWidth / 2, viewportWidth - tooltipWidth - 16));
      }

      // Ensure tooltip stays in viewport
      if (tooltipTop + tooltipHeight > viewportHeight + window.scrollY) {
        tooltipTop = rect.top - tooltipHeight - 16 + window.scrollY;
      }
      if (tooltipTop < window.scrollY + 80) {
        tooltipTop = rect.bottom + 16 + window.scrollY;
      }

      setTooltipPosition({ top: tooltipTop, left: tooltipLeft });
      setIsVisible(true);

      // Scroll element into view
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      setSpotlight(null);
      setIsVisible(false);
    }
  }, [currentTourStep]);

  // Set up observer and initial positioning
  useEffect(() => {
    if (!shouldShowTour || isLoading || !currentTourStep) {
      setIsVisible(false);
      return;
    }

    // Check if we're on the correct route
    if (currentTourStep.route && !location.pathname.includes(currentTourStep.route.replace('/', ''))) {
      setIsVisible(false);
      return;
    }

    // Initial delay to let DOM settle
    timeoutRef.current = setTimeout(() => {
      updateSpotlight();
    }, 500);

    // Observe DOM changes
    observerRef.current = new MutationObserver(() => {
      updateSpotlight();
    });

    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    // Update on resize
    window.addEventListener('resize', updateSpotlight);
    window.addEventListener('scroll', updateSpotlight);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (observerRef.current) observerRef.current.disconnect();
      window.removeEventListener('resize', updateSpotlight);
      window.removeEventListener('scroll', updateSpotlight);
    };
  }, [shouldShowTour, isLoading, currentTourStep, updateSpotlight, location.pathname]);

  // Haptic feedback for native
  const triggerHaptic = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch (e) {
        // Haptics not available
      }
    }
  }, []);

  const handleNext = async () => {
    await triggerHaptic();
    nextStep();
  };

  const handleSkip = async () => {
    await triggerHaptic();
    skipTour();
  };

  if (!shouldShowTour || isLoading || !isVisible || !spotlight || !currentTourStep) {
    return null;
  }

  const currentStepIndex = TOUR_STEPS.findIndex(s => s.id === currentStep);
  const totalSteps = TOUR_STEPS.length;

  return (
    <>
      {/* Overlay with cutout */}
      <div 
        className="fixed inset-0 z-[9998] pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${spotlight.left + spotlight.width / 2}px ${spotlight.top + spotlight.height / 2}px, transparent ${Math.max(spotlight.width, spotlight.height)}px, rgba(0,0,0,0.8) ${Math.max(spotlight.width, spotlight.height) + 50}px)`,
        }}
      />

      {/* Spotlight border */}
      <div
        className="fixed z-[9999] pointer-events-none rounded-xl transition-all duration-300 ease-out"
        style={{
          top: spotlight.top,
          left: spotlight.left,
          width: spotlight.width,
          height: spotlight.height,
          boxShadow: `0 0 0 3px hsl(var(--primary)), 0 0 20px 4px hsl(var(--primary) / 0.4)`,
        }}
      >
        {/* Pulsing glow effect */}
        <div className="absolute inset-0 rounded-xl animate-pulse" style={{
          boxShadow: '0 0 30px 8px hsl(var(--primary) / 0.3)',
        }} />
      </div>

      {/* Tooltip */}
      <div
        className={cn(
          "fixed z-[10000] w-[calc(100%-32px)] max-w-[320px] animate-fade-in",
          "bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl",
          "transition-all duration-300 ease-out"
        )}
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">
              Step {currentStepIndex + 1} of {totalSteps}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-muted"
            onClick={handleSkip}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="px-4 pb-2">
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {currentTourStep.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {currentTourStep.description}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 py-2">
          {TOUR_STEPS.map((_, index) => (
            <div
              key={index}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                index === currentStepIndex
                  ? "bg-primary w-6"
                  : index < currentStepIndex
                  ? "bg-primary/50"
                  : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between p-4 pt-2 border-t border-border/30">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={handleSkip}
          >
            Skip Tour
          </Button>
          <Button
            variant="default"
            size="sm"
            className="gap-1.5 bg-primary hover:bg-primary/90"
            onClick={handleNext}
          >
            {currentTourStep.action || 'Next'}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
