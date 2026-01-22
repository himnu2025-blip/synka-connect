import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

interface SmartAppBannerProps {
  slug?: string;
}

/**
 * Smart App Banner Component
 * 
 * Displays a banner prompting users to open the page in the Synka app
 * when viewing on mobile web.
 * 
 * On iOS: Uses native Smart App Banner via meta tag
 * On Android: Uses custom banner with intent link
 */
export function SmartAppBanner({ slug }: SmartAppBannerProps) {
  const params = useParams<{ slug: string }>();
  const cardSlug = slug || params.slug;

  useEffect(() => {
    // Don't show on native app
    if (Capacitor.isNativePlatform()) {
      return;
    }

    // Add iOS Smart App Banner meta tag
    const existingMeta = document.querySelector('meta[name="apple-itunes-app"]');
    if (!existingMeta) {
      const meta = document.createElement('meta');
      meta.name = 'apple-itunes-app';
      // Replace YOUR_APP_STORE_ID with actual App Store ID when published
      const appArgument = cardSlug ? `synka://u/${cardSlug}` : 'synka://';
      meta.content = `app-id=YOUR_APP_STORE_ID, app-argument=${appArgument}`;
      document.head.appendChild(meta);

      return () => {
        meta.remove();
      };
    }
  }, [cardSlug]);

  // Don't render anything visible - iOS handles the banner natively
  // For Android, we could add a custom banner here if needed
  return null;
}

/**
 * Try to open the native app with a deep link
 * Falls back to the current page if app is not installed
 */
export function tryOpenInApp(path: string): void {
  if (Capacitor.isNativePlatform()) {
    // Already in app, just navigate
    window.location.href = path;
    return;
  }

  const deepLink = `synka:/${path}`;
  const webFallback = window.location.href;

  // Create a hidden iframe to try the deep link
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = deepLink;
  document.body.appendChild(iframe);

  // Set up fallback timer
  const startTime = Date.now();
  const timeout = setTimeout(() => {
    // If we're still on the page after 1.5s, app probably isn't installed
    if (Date.now() - startTime < 2000) {
      // App didn't open, stay on web
      console.log('[SmartAppBanner] App not installed, staying on web');
    }
    iframe.remove();
  }, 1500);

  // Clean up on page visibility change (app opened)
  const handleVisibilityChange = () => {
    if (document.hidden) {
      clearTimeout(timeout);
      iframe.remove();
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange, { once: true });
}

/**
 * Generate an intent URL for Android
 * This allows Android to show "Open in app" or fall back to Play Store
 */
export function getAndroidIntentUrl(path: string): string {
  const packageName = 'com.synka.app';
  const fallbackUrl = encodeURIComponent(window.location.href);
  
  // Intent URL format for Android
  // intent://path#Intent;scheme=synka;package=com.synka.app;S.browser_fallback_url=fallback;end
  return `intent:/${path}#Intent;scheme=synka;package=${packageName};S.browser_fallback_url=${fallbackUrl};end`;
}
