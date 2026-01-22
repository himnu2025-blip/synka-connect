import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { getPublicCardUrl } from '@/lib/publicUrls';

/**
 * Deep Link Handler Hook
 * 
 * Handles incoming deep links from:
 * - Custom URL scheme: synka://u/username
 * - Universal Links (iOS): https://synka.in/u/username
 * - App Links (Android): https://synka.in/u/username
 * 
 * Routes:
 * - /u/:slug -> Public card view (canonical)
 * - /dashboard -> Dashboard
 * - /crm -> CRM page
 * - /my-card -> My card editor
 */
export function useDeepLinkHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  // Parse deep link URL and extract path
  const parseDeepLink = useCallback((url: string): string | null => {
    try {
      // Handle custom scheme: synka://path
      if (url.startsWith('synka://')) {
        const path = url.replace('synka://', '/');
        return path.startsWith('/') ? path : `/${path}`;
      }

      // Handle https URLs
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();

      // Verify it's our domain
      const validDomains = [
        'synka.in',
        'www.synka.in',
        'lovableproject.com',
        'f179cf0b-9d7d-4683-9a9f-315f6ad3e5bb.lovableproject.com',
      ];

      const isValidDomain = validDomains.some(
        domain => hostname === domain || hostname.endsWith(`.${domain}`)
      );

      if (!isValidDomain) {
        console.log('[DeepLink] Invalid domain:', hostname);
        return null;
      }

      return urlObj.pathname + urlObj.search;
    } catch (error) {
      console.error('[DeepLink] Failed to parse URL:', url, error);
      return null;
    }
  }, []);

  // Handle the deep link navigation
  const handleDeepLink = useCallback(
    (url: string) => {
      console.log('[DeepLink] Received:', url);

      const path = parseDeepLink(url);
      if (!path) return;

      const current = location.pathname + location.search;
      if (current === path) {
        console.log('[DeepLink] Already on this URL');
        return;
      }

      console.log('[DeepLink] Navigating to:', path);

      // Delay navigation to avoid cold-start race condition
      setTimeout(() => {
        navigate(path, { replace: true });
      }, 0);
    },
    [navigate, location.pathname, location.search, parseDeepLink]
  );

  useEffect(() => {
    // Only set up native deep link listeners on native platforms
    if (!Capacitor.isNativePlatform()) return;

    console.log('[DeepLink] Setting up native deep link listeners');

    const setupListeners = async () => {
      try {
        // Cold start
        const launchUrl = await App.getLaunchUrl();
        if (launchUrl?.url) {
          console.log('[DeepLink] App launched with URL:', launchUrl.url);
          handleDeepLink(launchUrl.url);
        }

        // Warm start
        const listener = await App.addListener(
          'appUrlOpen',
          (event: URLOpenListenerEvent) => {
            console.log('[DeepLink] App URL opened:', event.url);
            handleDeepLink(event.url);
          }
        );

        return () => listener.remove();
      } catch (error) {
        console.error('[DeepLink] Failed to set up listeners:', error);
      }
    };

    const cleanupPromise = setupListeners();

    return () => {
      cleanupPromise.then(cleanup => cleanup?.());
    };
  }, [handleDeepLink]);
}

/**
 * Check if the Synka app is installed (for web)
 */
export async function checkAppInstalled(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) return true;

  try {
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
    if ((navigator as any).standalone === true) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Generate a deep link URL for a public card
 */
export function generateCardDeepLink(slug: string, preferNative = true): string {
  const webUrl = getPublicCardUrl(slug);

  if (preferNative && Capacitor.isNativePlatform()) {
    return `synka://u/${slug}`;
  }

  return webUrl;
}

/**
 * Generate smart app banner meta tags content
 */
export function getSmartAppBannerMeta(slug?: string): {
  ios: string;
  android: string;
} {
  const appPath = slug ? `/u/${slug}` : '/';

  return {
    ios: `app-id=YOUR_APP_STORE_ID, app-argument=synka://${appPath}`,
    android: `app-id=com.synka.app, app-argument=synka://${appPath}`,
  };
}
