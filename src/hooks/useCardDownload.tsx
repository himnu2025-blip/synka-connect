import { useState, useRef, useCallback } from 'react';
import { toPng } from 'html-to-image';
import { toast } from '@/hooks/use-toast';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { hapticFeedback } from '@/lib/haptics';

// Public site URL - always use production URL for links
const PUBLIC_SITE_URL = import.meta.env.VITE_PUBLIC_SITE_URL || 'https://synka.in';

interface CardDownloadOptions {
  name: string;
  designation?: string;
  company?: string;
  photoUrl?: string;
  logoUrl?: string;
  publicUrl: string;
  slug: string;
  isPremium?: boolean;
  /** Optional caption to be baked into the exported image (used for social posting) */
  shareCaption?: string;
}

async function dataUrlToFile(dataUrl: string, fileName: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], fileName, { type: blob.type || 'image/png' });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function bakeBrandingUnderImage(dataUrl: string) {
  const img = new Image();
  img.crossOrigin = 'anonymous';

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });

  const footerHeight = 80; // enough space - no cut
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;

  canvas.width = img.width;
  canvas.height = img.height + footerHeight;

  // Background
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Image
  ctx.drawImage(img, 0, 0);

  // Branding
  const centerX = canvas.width / 2;
  const y = img.height + 26;

  // "Powered by"
  ctx.fillStyle = '#111111';
  ctx.font =
    '500 26px -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText('Powered by', centerX - 6, y);

  // "SYNKA"
  ctx.fillStyle = '#F97316';
  ctx.font =
    '700 26px -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('SYNKA', centerX + 6, y);

  return canvas.toDataURL('image/png', 1);
}

export function useCardDownload() {
  const [isGenerating, setIsGenerating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Generate card image and return data URL (for social sharing - no download)
  const generateCardImage = useCallback(
    async (options: CardDownloadOptions): Promise<string | null> => {
      if (!cardRef.current) {
        console.error('Card ref not available');
        return null;
      }

      const element = cardRef.current;

      try {
        // Wait for images to load with extended timeout for iOS base64 conversion
        const images = element.querySelectorAll('img');
        const imageLoadPromises = Array.from(images).map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete && img.naturalHeight !== 0) {
                resolve();
              } else {
                // Extended timeout for iOS base64 conversion
                const timeout = setTimeout(() => resolve(), 5000);
                img.onload = () => {
                  clearTimeout(timeout);
                  resolve();
                };
                img.onerror = () => {
                  clearTimeout(timeout);
                  resolve();
                };
              }
            })
        );

        await Promise.all(imageLoadPromises);
        // Extra delay for iOS Safari to process base64 images
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Use style option to override positioning on the cloned node during capture
        // This avoids moving the original element and prevents flicker
        const baseDataUrl = await toPng(element, {
          quality: 1,
          pixelRatio: 2,
          cacheBust: true,
          skipFonts: false,
          backgroundColor: '#f8f9fa',
          width: 1080,
          height: 1350,
          includeQueryParams: true,
          style: {
            position: 'static',
            left: 'auto',
            top: 'auto',
            transform: 'none',
          },
        });

        return await bakeBrandingUnderImage(baseDataUrl);
      } catch (error) {
        console.error('Error generating card image:', error);
        return null;
      }
    },
    []
  );

  // Download card image to device (with native share support)
  const downloadCard = useCallback(
    async (options: CardDownloadOptions) => {
      if (!cardRef.current) {
        console.error('Card ref not available');
        toast({
          title: 'Download failed',
          description: 'Card element not ready. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      setIsGenerating(true);

      try {
        const dataUrl = await generateCardImage(options);

        if (!dataUrl) {
          throw new Error('Failed to generate image');
        }

        const fileName = `${options.name.replace(/\s+/g, '-').toLowerCase()}-synka-card.png`;

        // On native platform, use Share API
        if (Capacitor.isNativePlatform()) {
          try {
            // Convert data URL to base64
            const base64Data = dataUrl.split(',')[1];
            
            // Save to filesystem first
            const savedFile = await Filesystem.writeFile({
              path: fileName,
              data: base64Data,
              directory: Directory.Cache,
            });
            
            // Build the public URL for sharing
            const publicUrl = options.publicUrl || `${PUBLIC_SITE_URL}/c/${options.slug}`;
            
            // Share the file
            await Share.share({
              title: 'My Digital Card',
              text: `Check out my digital business card: ${publicUrl}`,
              files: [savedFile.uri],
              dialogTitle: 'Share your card',
            });
            
            await hapticFeedback.success();
            toast({
              title: 'Card ready to share!',
              description: 'Choose where to save or share.',
            });
          } catch (error: any) {
            console.error('Native share error:', error);
            toast({
              title: 'Share failed',
              description: 'Could not share card image.',
              variant: 'destructive',
            });
          }
          return;
        }

        // Web: standard download
        const link = document.createElement('a');
        link.download = fileName;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
          title: 'Card image downloaded',
          description: 'Share it on WhatsApp, LinkedIn, or anywhere!',
        });
      } catch (error) {
        console.error('Error generating card image:', error);
        toast({
          title: 'Download failed',
          description: 'Could not generate card image. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsGenerating(false);
      }
    },
    [generateCardImage]
  );

  // Convenience for sharing: return a File that apps can accept via Web Share
  const generateCardFile = useCallback(
    async (options: CardDownloadOptions) => {
      const dataUrl = await generateCardImage(options);
      if (!dataUrl) return null;
      const fileName = `${options.name.replace(/\s+/g, '-').toLowerCase()}-synka-card.png`;
      return await dataUrlToFile(dataUrl, fileName);
    },
    [generateCardImage]
  );

  return {
    cardRef,
    isGenerating,
    downloadCard,
    generateCardImage,
    generateCardFile,
  };
}
