import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RotateCcw, Focus, Loader2 } from 'lucide-react';
import { detectFacePosition } from '@/lib/faceDetection';

interface ImageCropPopupProps {
  open: boolean;
  imageFile: File;
  onClose: () => void;
  onSave: (blob: Blob) => void;
}

const OUTPUT = 512;
const MAX_ZOOM = 3;

export default function ImageCropPopup({
  open,
  imageFile,
  onClose,
  onSave,
}: ImageCropPopupProps) {
  const [url, setUrl] = useState<string>('');
  const [loadingFace, setLoadingFace] = useState(false);
  const [ready, setReady] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // State for transform
  const scaleRef = useRef(1);
  const minScaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });

  // Gesture tracking
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const pinchStart = useRef<number | null>(null);
  const rafId = useRef<number | null>(null);

  // Get dimensions
  const getDimensions = useCallback(() => {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img) return null;
    
    const containerRect = container.getBoundingClientRect();
    const containerSize = containerRect.width; // Square container
    const imgW = img.naturalWidth || 1;
    const imgH = img.naturalHeight || 1;
    
    return { containerSize, imgW, imgH };
  }, []);

  // Calculate minimum scale to cover container
  const calcMinScale = useCallback(() => {
    const dims = getDimensions();
    if (!dims) return 1;
    const { containerSize, imgW, imgH } = dims;
    // Scale needed so smallest dimension fills container
    return Math.max(containerSize / imgW, containerSize / imgH);
  }, [getDimensions]);

  // Clamp offset so image edges never go inside container
  const clampOffset = useCallback(() => {
    const dims = getDimensions();
    if (!dims) return;
    
    const { containerSize, imgW, imgH } = dims;
    const scale = scaleRef.current;
    
    // Scaled image dimensions
    const scaledW = imgW * scale;
    const scaledH = imgH * scale;
    
    // How much the image extends beyond container on each side
    const excessX = Math.max(0, (scaledW - containerSize) / 2);
    const excessY = Math.max(0, (scaledH - containerSize) / 2);
    
    // Clamp offset
    offsetRef.current.x = Math.max(-excessX, Math.min(excessX, offsetRef.current.x));
    offsetRef.current.y = Math.max(-excessY, Math.min(excessY, offsetRef.current.y));
  }, [getDimensions]);

  // Apply transform to image
  const applyTransform = useCallback(() => {
  const img = imgRef.current;
  if (!img) return;

  clampOffset();
  const { x, y } = offsetRef.current;
  const scale = scaleRef.current;

  img.style.transform = `
    translate(-50%, -50%)
    translate(${x}px, ${y}px)
    scale(${scale})
  `;
}, [clampOffset]);

  // Schedule transform update
  const scheduleUpdate = useCallback(() => {
    if (rafId.current) return;
    rafId.current = requestAnimationFrame(() => {
      applyTransform();
      rafId.current = null;
    });
  }, [applyTransform]);

  // Initialize on image load
  const initImage = useCallback(() => {
    const dims = getDimensions();
    if (!dims || dims.containerSize === 0) {
      requestAnimationFrame(initImage);
      return;
    }
    
    minScaleRef.current = calcMinScale();
    scaleRef.current = minScaleRef.current;
    offsetRef.current = { x: 0, y: 0 };
    applyTransform();
    setReady(true);
  }, [getDimensions, calcMinScale, applyTransform]);

  // Load image URL
  useEffect(() => {
    if (!imageFile) return;
    setReady(false);
    const objectUrl = URL.createObjectURL(imageFile);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  // Handle image load
  const handleImageLoad = useCallback(() => {
    // Double RAF to ensure container is laid out
    requestAnimationFrame(() => {
      requestAnimationFrame(initImage);
    });
  }, [initImage]);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStart.current = Math.hypot(dx, dy);
      dragStart.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 1 && dragStart.current) {
      const dx = e.touches[0].clientX - dragStart.current.x;
      const dy = e.touches[0].clientY - dragStart.current.y;
      offsetRef.current.x += dx;
      offsetRef.current.y += dy;
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      scheduleUpdate();
    } else if (e.touches.length === 2 && pinchStart.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const scaleFactor = dist / pinchStart.current;
      
      const newScale = Math.max(minScaleRef.current, Math.min(MAX_ZOOM, scaleRef.current * scaleFactor));
      scaleRef.current = newScale;
      pinchStart.current = dist;
      scheduleUpdate();
    }
  };

  const handleTouchEnd = () => {
    dragStart.current = null;
    pinchStart.current = null;
  };

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragStart.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragStart.current) return;
    e.preventDefault();
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    offsetRef.current.x += dx;
    offsetRef.current.y += dy;
    dragStart.current = { x: e.clientX, y: e.clientY };
    scheduleUpdate();
  };

  const handleMouseUp = () => {
    dragStart.current = null;
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(minScaleRef.current, Math.min(MAX_ZOOM, scaleRef.current * factor));
    scaleRef.current = newScale;
    scheduleUpdate();
  };

  // Reset to initial state
  const handleReset = () => {
    minScaleRef.current = calcMinScale();
    scaleRef.current = minScaleRef.current;
    offsetRef.current = { x: 0, y: 0 };
    applyTransform();
  };

  // Center on detected face
  const handleCenterFace = async () => {
    if (!url) return;
    setLoadingFace(true);
    try {
      const face = await detectFacePosition(url);
      if (!face) return;
      
      const dims = getDimensions();
      if (!dims) return;
      
      const { containerSize, imgW, imgH } = dims;
      
      // Zoom in slightly for face
      minScaleRef.current = calcMinScale();
      scaleRef.current = minScaleRef.current * 1.2;
      
      // Calculate offset to center face
      // face.x and face.y are percentages (0-100)
      const faceXPx = (face.x / 100) * imgW * scaleRef.current;
      const faceYPx = (face.y / 100) * imgH * scaleRef.current;
      const centerX = (imgW * scaleRef.current) / 2;
      const centerY = (imgH * scaleRef.current) / 2;
      
      offsetRef.current = {
        x: centerX - faceXPx,
        y: centerY - faceYPx,
      };
      
      applyTransform();
    } finally {
      setLoadingFace(false);
    }
  };

  // Save cropped image
  const handleSave = () => {
    const img = imgRef.current;
    const dims = getDimensions();
    if (!img || !dims) return;
    
    const { containerSize, imgW, imgH } = dims;
    const scale = scaleRef.current;
    const { x, y } = offsetRef.current;
    
    // Calculate the visible region in original image coordinates
    // The image is centered in container, then offset and scaled
    const scaledW = imgW * scale;
    const scaledH = imgH * scale;
    
    // Top-left of visible area relative to scaled image center
    const visibleLeft = (scaledW - containerSize) / 2 - x;
    const visibleTop = (scaledH - containerSize) / 2 - y;
    
    // Convert to original image coordinates
    const srcX = visibleLeft / scale;
    const srcY = visibleTop / scale;
    const srcSize = containerSize / scale;
    
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext('2d')!;
    
    ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, OUTPUT, OUTPUT);
    canvas.toBlob(blob => blob && onSave(blob), 'image/webp', 0.85);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="p-4">
          <DialogTitle>Adjust Profile Photo</DialogTitle>
        </DialogHeader>

        <div className="px-4">
          <div
            ref={containerRef}
            className="relative w-full aspect-square overflow-hidden rounded-xl bg-black cursor-grab active:cursor-grabbing"
            style={{ touchAction: 'none' }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            {url && (
              <img
                ref={imgRef}
                src={url}
                alt="Crop preview"
                draggable={false}
                onLoad={handleImageLoad}
                className={`absolute top-1/2 left-1/2 max-w-none select-none ${
                  ready ? 'opacity-100' : 'opacity-0'
                }`}
                style={{ transformOrigin: 'center center' }}
              />
            )}

            {/* Grid overlay */}
            <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="border border-white/30" />
              ))}
            </div>
          </div>
        </div>

        <div className="px-4 py-3 flex gap-2">
          <Button variant="outline" onClick={handleCenterFace} disabled={loadingFace}>
            {loadingFace ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Focus className="h-4 w-4 mr-1" />}
            Face
          </Button>
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1" /> Reset
          </Button>
        </div>

        <div className="flex gap-2 p-4 pt-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
