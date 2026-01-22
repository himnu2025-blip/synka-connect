import { useState, useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Button } from '@/components/ui/button';

interface IOSPWAPromptProps {
  /** Current path to redirect to when opening PWA */
  path?: string;
}

/**
 * iOS PWA Redirect Prompt
 * 
 * iOS does NOT support universal links or deep links to PWAs.
 * Unlike native apps, Safari will never auto-redirect to an installed PWA.
 * 
 * This component shows a prompt to iOS Safari users instructing them
 * to open the PWA from their home screen for the best experience.
 */
export function IOSPWAPrompt({ path }: IOSPWAPromptProps) {
  const [dismissed, setDismissed] = useState(false);
  const [isIOSSafari, setIsIOSSafari] = useState(false);
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);

  useEffect(() => {
    // Don't show if already in native app or PWA
    if (Capacitor.isNativePlatform()) return;
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if ((navigator as any).standalone === true) return;

    // Check if iOS Safari
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua);
    
    if (isIOS && isSafari) {
      setIsIOSSafari(true);
      
      // Check if PWA might be installed (user has visited before)
      const pwaInstalled = localStorage.getItem('synka_pwa_installed') === 'true';
      setIsPWAInstalled(pwaInstalled);
    }
  }, []);

  // Don't show if not iOS Safari or dismissed
  if (!isIOSSafari || dismissed) return null;

  // Store current path for when they open PWA
  const handleOpenPWA = () => {
    // Store the intended destination
    if (path) {
      localStorage.setItem('synka_deep_link_path', path);
    }
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-[env(safe-area-inset-bottom)] bg-gradient-to-t from-background via-background to-transparent">
      <div className="max-w-md mx-auto bg-card border border-border rounded-2xl shadow-2xl p-4 animate-in slide-in-from-bottom-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <img 
              src="/logos/synka-logo.png" 
              alt="Synka" 
              className="w-8 h-8 rounded-lg"
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-sm">
              {isPWAInstalled ? 'Open in Synka App' : 'Install Synka App'}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isPWAInstalled 
                ? 'For the best experience, open this card from your home screen app.'
                : 'Add Synka to your home screen for instant access.'}
            </p>
            
            {!isPWAInstalled && (
              <p className="text-xs text-muted-foreground mt-2">
                Tap <span className="inline-flex items-center"><ExternalLink className="w-3 h-3 mx-0.5" /></span> then "Add to Home Screen"
              </p>
            )}
          </div>
          
          <button
            onClick={() => setDismissed(true)}
            className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center shrink-0"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        
        {isPWAInstalled && (
          <Button
            variant="gradient"
            size="sm"
            className="w-full mt-3"
            onClick={handleOpenPWA}
          >
            Got it, I'll open from home screen
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Hook to check for pending deep link path when PWA opens
 * Call this in App.tsx or main layout
 */
export function useIOSDeepLinkRestore() {
  useEffect(() => {
    // Only run in PWA/standalone mode
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
      (navigator as any).standalone === true;
    
    if (!isPWA) return;

    // Mark that PWA is installed for future prompts
    localStorage.setItem('synka_pwa_installed', 'true');

    // Check for pending deep link
    const pendingPath = localStorage.getItem('synka_deep_link_path');
    if (pendingPath) {
      localStorage.removeItem('synka_deep_link_path');
      
      // Only navigate if we're not already on the path
      if (window.location.pathname !== pendingPath) {
        window.location.href = pendingPath;
      }
    }
  }, []);
}
