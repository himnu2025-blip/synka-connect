import { useEffect } from 'react';

// Cache for preloaded images
const imageCache = new Set<string>();

/**
 * Preloads images in the background for faster display
 */
export const preloadImage = (src: string): Promise<void> => {
  if (imageCache.has(src)) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      imageCache.add(src);
      resolve();
    };
    img.onerror = () => resolve(); // Don't block on errors
    img.src = src;
  });
};

/**
 * Preloads multiple images in parallel
 */
export const preloadImages = (srcs: string[]): Promise<void[]> => {
  return Promise.all(srcs.map(preloadImage));
};

/**
 * Hook to preload images when component mounts
 */
export const useImagePreloader = (imageSrcs: string[]) => {
  useEffect(() => {
    // Preload images in background after a small delay
    // to not block critical rendering
    const timeout = setTimeout(() => {
      preloadImages(imageSrcs);
    }, 100);

    return () => clearTimeout(timeout);
  }, [imageSrcs]);
};

/**
 * Preload critical landing page images
 */
export const preloadLandingImages = () => {
  const criticalImages = [
    '/images/ai/Card-phone.webp',
    '/images/ai/cofounder-primary.webp',
  ];
  
  // Use requestIdleCallback for non-critical preloading
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => preloadImages(criticalImages));
  } else {
    setTimeout(() => preloadImages(criticalImages), 200);
  }
};
