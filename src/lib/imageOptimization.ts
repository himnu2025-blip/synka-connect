/**
 * Image optimization utilities for profile photos and logos
 * Target: ~200KB max, JPEG format for maximum crawler/preview compatibility
 * JPEG is used instead of WebP for compatibility with WhatsApp, Facebook, Twitter, iMessage crawlers
 */

interface OptimizedResult {
  blob: Blob;
  width: number;
  height: number;
  sizeKB: number;
}

const TARGET_SIZE_KB = 200;
const MAX_QUALITY = 0.92;
const MIN_QUALITY = 0.6;

/**
 * Loads an image from a file and returns a promise with the Image element
 */
const loadImage = (file: File | Blob): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Compress image to target size using JPEG format for maximum compatibility
 * JPEG is preferred over WebP for social media crawlers
 */
const compressToTargetSize = async (
  canvas: HTMLCanvasElement,
  targetKB: number = TARGET_SIZE_KB
): Promise<Blob> => {
  // Always use JPEG for maximum crawler compatibility
  const format = 'image/jpeg';
  let quality = MAX_QUALITY;
  let blob: Blob | null = null;

  // Binary search for optimal quality
  let minQ = MIN_QUALITY;
  let maxQ = MAX_QUALITY;
  
  for (let i = 0; i < 6; i++) {
    quality = (minQ + maxQ) / 2;
    
    blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), format, quality);
    });

    if (!blob) break;

    const sizeKB = blob.size / 1024;
    
    if (sizeKB > targetKB) {
      maxQ = quality;
    } else if (sizeKB < targetKB * 0.7) {
      minQ = quality;
    } else {
      break;
    }
  }

  if (!blob) {
    blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Failed to create blob')), format, 0.85);
    });
  }

  return blob;
};

/**
 * Optimizes a profile photo to 512x512, optionally centering on face position
 * Output: JPEG ~200KB for crawler compatibility
 */
export async function optimizeProfilePhoto(
  file: File | Blob,
  faceX?: number,
  faceY?: number
): Promise<OptimizedResult> {
  const img = await loadImage(file instanceof Blob ? file as File : file);
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  const targetSize = 512;
  canvas.width = targetSize;
  canvas.height = targetSize;
  
  // Calculate crop area
  const minDim = Math.min(img.width, img.height);
  let sx = 0, sy = 0;
  
  if (faceX !== undefined && faceY !== undefined) {
    const faceCenterX = (faceX / 100) * img.width;
    const faceCenterY = (faceY / 100) * img.height;
    
    sx = Math.max(0, Math.min(faceCenterX - minDim / 2, img.width - minDim));
    sy = Math.max(0, Math.min(faceCenterY - minDim / 2, img.height - minDim));
  } else {
    sx = (img.width - minDim) / 2;
    sy = (img.height - minDim) / 2;
  }
  
  ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);
  
  URL.revokeObjectURL(img.src);
  
  const blob = await compressToTargetSize(canvas, TARGET_SIZE_KB);
  
  return { 
    blob, 
    width: targetSize, 
    height: targetSize,
    sizeKB: Math.round(blob.size / 1024)
  };
}

/**
 * Optimizes a pre-cropped blob (from ImageCropPopup)
 * Output: JPEG ~200KB
 */
export async function optimizeCroppedImage(
  blob: Blob
): Promise<OptimizedResult> {
  const img = await loadImage(blob as File);
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);
  
  URL.revokeObjectURL(img.src);
  
  const optimizedBlob = await compressToTargetSize(canvas, TARGET_SIZE_KB);
  
  return { 
    blob: optimizedBlob, 
    width: img.width, 
    height: img.height,
    sizeKB: Math.round(optimizedBlob.size / 1024)
  };
}

/**
 * Optimizes a logo to max 600x300, maintaining aspect ratio
 * Output: PNG for transparency, JPEG otherwise ~200KB
 */
export async function optimizeLogo(file: File): Promise<OptimizedResult> {
  const img = await loadImage(file);
  
  const maxWidth = 600;
  const maxHeight = 300;
  
  let width = img.width;
  let height = img.height;
  
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = width;
  canvas.height = height;
  
  ctx.drawImage(img, 0, 0, width, height);
  
  URL.revokeObjectURL(img.src);
  
  const isPng = file.type === 'image/png';
  
  let blob: Blob;
  if (isPng) {
    blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => b ? resolve(b) : reject(new Error('Failed to create blob')),
        'image/png'
      );
    });
  } else {
    blob = await compressToTargetSize(canvas, TARGET_SIZE_KB);
  }

  return { 
    blob, 
    width, 
    height,
    sizeKB: Math.round(blob.size / 1024)
  };
}

/**
 * Converts a file to an optimized base64 string for API calls
 */
export async function fileToOptimizedBase64(
  file: File,
  maxSize: number = 1600
): Promise<string> {
  const img = await loadImage(file);
  
  let width = img.width;
  let height = img.height;
  
  if (width > maxSize || height > maxSize) {
    const ratio = Math.min(maxSize / width, maxSize / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = width;
  canvas.height = height;
  
  ctx.drawImage(img, 0, 0, width, height);
  
  URL.revokeObjectURL(img.src);
  
  return canvas.toDataURL('image/jpeg', 0.85);
}

/**
 * Delete an image from Supabase storage
 */
export async function deleteStorageImage(
  supabase: any,
  imageUrl: string,
  bucket: string = 'profiles'
): Promise<boolean> {
  if (!imageUrl) return false;
  
  try {
    const urlObj = new URL(imageUrl);
    const pathParts = urlObj.pathname.split(`/storage/v1/object/public/${bucket}/`);
    
    if (pathParts.length < 2) return false;
    
    const filePath = pathParts[1];
    
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);
    
    if (error) {
      console.warn('Failed to delete old image:', error);
      return false;
    }
    
    return true;
  } catch (err) {
    console.warn('Error deleting storage image:', err);
    return false;
  }
}
