import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

export type LayoutType =
  | 'photo-logo'        // Classic Pro
  | 'wave-split'        // Wave Split
  | 'minimal-circle'    // Minimal
  | 'logo-photo'        // Brand First
  | 'dark-professional' // Dark Executive
  | 'photo-only'        // Portrait
  | 'logo-only'         // Corporate
  | 'color';            // Color

interface CardImageSectionProps {
  layout: LayoutType;
  photoUrl?: string | null;
  logoUrl?: string | null;
  name: string;
  designation?: string;
  company?: string;
  themeColor?: string | null;
  faceX?: number | null;
  faceY?: number | null;
  logoX?: number | null;
  logoY?: number | null;
  className?: string;
  // ✅ ADDED: External photo loaded state from MyCard.tsx
  isPhotoLoaded?: boolean;
}

const THEME_COLORS: Record<string, { text: string }> = {
  '#6366f1': { text: '#ffffff' },
  '#10b981': { text: '#ffffff' },
  '#f43f5e': { text: '#ffffff' },
  '#f59e0b': { text: '#1f2937' },
  '#06b6d4': { text: '#ffffff' },
  '#8b5cf6': { text: '#ffffff' },
  '#475569': { text: '#ffffff' },
  '#1e3a5f': { text: '#ffffff' },
};

// Clamp a value between min and max
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

// Smart face positioning with Apple-like behavior
const getSmartFacePosition = (
  faceX: number | null | undefined,
  faceY: number | null | undefined,
  isPortrait: boolean
): string => {
  // Raw values or defaults
  let x = faceX ?? 50;
  let y = faceY ?? 38; // Apple-style default

  // Safe fallback: if face_y is extreme, use Apple-style top focus
  if (faceY !== null && faceY !== undefined && (faceY < 25 || faceY > 65)) {
    y = 38;
  }

  // Clamp face coordinates to safe zones
  x = clamp(x, 35, 65);
  y = clamp(y, 28, 55);

  // Portrait adjustment: push focus down and add headroom
  if (isPortrait) {
    y = Math.min(y + 8, 60);
  }

  return `${x}% ${y}%`;
};

// Valid layout types for validation
const VALID_LAYOUTS: LayoutType[] = [
  'photo-logo', 'wave-split', 'minimal-circle', 'logo-photo',
  'dark-professional', 'photo-only', 'logo-only', 'color'
];

export function CardImageSection({
  layout: rawLayout,
  photoUrl,
  logoUrl,
  name,
  designation,
  company,
  themeColor,
  faceX,
  faceY,
  logoX,
  logoY,
  className,
  // ✅ ADDED: External photo loaded state
  isPhotoLoaded: externalPhotoLoaded = true,
}: CardImageSectionProps) {
  // ✅ FIX: Fallback to 'photo-logo' for invalid/legacy layout values like 'classic'
  const layout: LayoutType = VALID_LAYOUTS.includes(rawLayout) ? rawLayout : 'photo-logo';
  
  const [isPortrait, setIsPortrait] = useState(false);
  // ✅ ADDED: Internal photo loaded state
  const [internalPhotoLoaded, setInternalPhotoLoaded] = useState(false);
  
  // ✅ Combined photo loaded state (external takes precedence)
  const photoLoaded = externalPhotoLoaded !== undefined 
    ? externalPhotoLoaded 
    : internalPhotoLoaded;

  // ✅ Preload and detect portrait in ONE operation
  useEffect(() => {
    if (!photoUrl) {
      setIsPortrait(false);
      setInternalPhotoLoaded(true); // No photo to load
      return;
    }

    // Reset state for new photo
    setInternalPhotoLoaded(false);
    setIsPortrait(false);

    const img = new Image();
    
    img.onload = () => {
      // Set loaded state FIRST
      setInternalPhotoLoaded(true);
      
      // Then detect portrait
      const ratio = img.height / img.width;
      setIsPortrait(ratio > 1.1);
    };
    
    img.onerror = () => {
      // Even if error, mark as loaded to avoid infinite loading
      setInternalPhotoLoaded(true);
    };
    
    img.src = photoUrl;

    // Optional: Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (!img.complete) {
        setInternalPhotoLoaded(true);
      }
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [photoUrl]);

  const getInitials = (n: string) =>
    n
      .split(' ')
      .filter(Boolean)
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';

  const textColor = themeColor
    ? THEME_COLORS[themeColor]?.text || '#ffffff'
    : '#ffffff';

  // Smart object-position for logo
  const getLogoPosition = () => {
    const x = logoX ?? 50;
    const y = logoY ?? 50;
    return `${x}% ${y}%`;
  };

  const facePosition = getSmartFacePosition(faceX, faceY, isPortrait);
  const logoPosition = getLogoPosition();

  /* =====================================================
     1. CLASSIC PRO — FULL PHOTO WITH SMART POSITIONING
     ===================================================== */
  if (layout === 'photo-logo') {
    return (
      <div className={cn('w-full overflow-hidden rounded-3xl', className)}>
        <div className="w-full h-80 md:h-96 relative overflow-hidden bg-muted">
          {/* ✅ FIX: Show initials ONLY when no photoUrl */}
          {!photoUrl ? (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-6xl font-bold text-muted-foreground/40">
                {getInitials(name)}
              </span>
            </div>
          ) : (
            <>
              {/* Blur background */}
              <img
                src={photoUrl}
                aria-hidden
                className={cn(
                  "absolute inset-0 w-full h-full object-cover blur-2xl scale-125 opacity-50 transition-opacity duration-300",
                  !photoLoaded && "opacity-0"
                )}
              />
              {/* Main photo - FADES IN when loaded */}
              <img
                src={photoUrl}
                alt={name}
                className={cn(
                  "relative z-10 w-full h-full object-cover transition-opacity duration-300",
                  !photoLoaded && "opacity-0"
                )}
                style={{ 
                  objectPosition: facePosition, 
                  transition: 'object-position 0.4s ease-out, opacity 0.3s ease-in' 
                }}
                onLoad={() => {
                  // Backup loading trigger
                  if (!photoLoaded) {
                    setInternalPhotoLoaded(true);
                  }
                }}
              />
            </>
          )}
        </div>
      </div>
    );
  }

  /* =====================================================
     2. WAVE SPLIT — FULL PHOTO WITH SMART POSITIONING
     ===================================================== */
  if (layout === 'wave-split') {
    return (
      <div className={cn('relative w-full', className)}>
        <div className="w-full h-80 md:h-96 overflow-hidden relative bg-muted">
          {/* ✅ FIX: Show initials ONLY when no photoUrl */}
          {!photoUrl ? (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-6xl font-bold text-muted-foreground/40">
                {getInitials(name)}
              </span>
            </div>
          ) : (
            <>
              {/* Blur background */}
              <img
                src={photoUrl}
                aria-hidden
                className={cn(
                  "absolute inset-0 w-full h-full object-cover blur-2xl scale-125 opacity-50 transition-opacity duration-300",
                  !photoLoaded && "opacity-0"
                )}
              />
              {/* Main photo - FADES IN when loaded */}
              <img
                src={photoUrl}
                alt={name}
                className={cn(
                  "relative z-10 w-full h-full object-cover transition-opacity duration-300",
                  !photoLoaded && "opacity-0"
                )}
                style={{ 
                  objectPosition: facePosition, 
                  transition: 'object-position 0.4s ease-out, opacity 0.3s ease-in' 
                }}
                onLoad={() => {
                  // Backup loading trigger
                  if (!photoLoaded) {
                    setInternalPhotoLoaded(true);
                  }
                }}
              />
            </>
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

  /* =====================================================
     3. MINIMAL CIRCLE — SMART FACE POSITIONING
     ===================================================== */
  if (layout === 'minimal-circle') {
    return (
      <div className={cn('flex justify-center pt-4', className)}>
        <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-primary/20 shadow-lg bg-primary/10">
          {/* ✅ FIX: Show initials ONLY when no photoUrl */}
          {!photoUrl ? (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-3xl font-bold text-primary">
                {getInitials(name)}
              </span>
            </div>
          ) : (
            /* Photo fades in when loaded - NO INITIALS FLASH */
            <img 
              src={photoUrl} 
              alt={name}
              className={cn(
                "w-full h-full object-cover transition-opacity duration-300",
                !photoLoaded && "opacity-0"
              )}
              style={{ 
                objectPosition: facePosition, 
                transition: 'object-position 0.4s ease-out, opacity 0.3s ease-in' 
              }}
              onLoad={() => {
                // Backup loading trigger
                if (!photoLoaded) {
                  setInternalPhotoLoaded(true);
                }
              }}
            />
          )}
        </div>
      </div>
    );
  }

  /* =====================================================
   BRAND FIRST — LOGO WITH SMART PHOTO
   ===================================================== */
  if (layout === 'logo-photo') {
    return (
      <div className={cn('w-full flex justify-center pt-6 pb-4', className)}>
        <div className="relative">
          {/* Logo as actual rounded square */}
          <div className="w-44 h-44 rounded-3xl overflow-hidden shadow-lg bg-muted">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                className="w-full h-full object-cover"
                style={{ objectPosition: logoPosition }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-3xl font-bold text-muted-foreground">
                  LOGO
                </span>
              </div>
            )}
          </div>

          {/* Small round photo with smart positioning */}
          {photoUrl && (
            <div className="absolute -bottom-3 -left-3 w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-lg bg-white">
              {/* ✅ FIX: No initials when photoUrl exists */}
              <img
                src={photoUrl}
                alt={name}
                className={cn(
                  "w-full h-full object-cover transition-opacity duration-300",
                  !photoLoaded && "opacity-0"
                )}
                style={{ 
                  objectPosition: facePosition, 
                  transition: 'object-position 0.4s ease-out, opacity 0.3s ease-in' 
                }}
                onLoad={() => {
                  // Backup loading trigger
                  if (!photoLoaded) {
                    setInternalPhotoLoaded(true);
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  /* =====================================================
   5. DARK EXECUTIVE — DESKTOP SQUARE BLUR, MOBILE SAME
   ===================================================== */
  if (layout === 'dark-professional') {
    return (
      <div
        className={cn(
          'relative w-full h-72 rounded-3xl bg-muted',
          className
        )}
      >
        {/* BLUR WRAPPER (LIMIT WIDTH ON DESKTOP) */}
        <div
          className="
            absolute inset-0
            overflow-hidden
            rounded-3xl

            md:left-12
            md:right-12
          "
        >
          {photoUrl && (
            <img
              src={photoUrl}
              aria-hidden
              className={cn(
                "absolute inset-0 w-full h-full object-cover blur-xl scale-110 opacity-70 transition-opacity duration-300",
                !photoLoaded && "opacity-0"
              )}
              style={{ objectPosition: facePosition }}
            />
          )}
        </div>

        {/* SHARP FOREGROUND IMAGE */}
        <div className="absolute inset-0 flex items-center justify-center p-4 z-10">
          {/* ✅ FIX: Show initials ONLY when no photoUrl */}
          {!photoUrl ? (
            <div className="w-32 h-32 rounded-2xl bg-muted-foreground/20 flex items-center justify-center">
              <span className="text-3xl font-bold text-muted-foreground">
                {getInitials(name)}
              </span>
            </div>
          ) : (
            /* Photo fades in when loaded - NO INITIALS FLASH */
            <img
              src={photoUrl}
              alt={name}
              className={cn(
                "max-h-full max-w-full object-contain rounded-2xl shadow-xl transition-opacity duration-300",
                !photoLoaded && "opacity-0"
              )}
              onLoad={() => {
                // Backup loading trigger
                if (!photoLoaded) {
                  setInternalPhotoLoaded(true);
                }
              }}
            />
          )}
        </div>

        {/* LOGO */}
        {logoUrl && (
          <div
            className="
              absolute bottom-4 right-4
              md:right-16
              w-12 h-12
              rounded-full overflow-hidden
              shadow-lg z-20
              bg-black/20 backdrop-blur-md
            "
          >
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

  /* =====================================================
   6. PORTRAIT — HERO CARD WITH BLUR FILL (APPLE STYLE)
   ===================================================== */
  if (layout === 'photo-only') {
  return (
    <div className={cn('relative w-full rounded-3xl overflow-hidden', className)}>
      {!photoUrl ? (
        <div className="w-full h-80 flex items-center justify-center bg-muted">
          <span className="text-4xl font-bold text-muted-foreground">
            {getInitials(name)}
          </span>
        </div>
      ) : (
        <>
          {/* BLUR BACKGROUND (BIGGER) */}
          <img
            src={photoUrl}
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover blur-3xl scale-125 opacity-60"
            style={{ objectPosition: facePosition }}
          />

          {/* FOREGROUND IMAGE WRAPPER — CREATES SPACE FOR BLUR */}
          <div className="relative z-10 p-6">
            <img
              src={photoUrl}
              alt={name}
              className="w-full h-auto object-contain rounded-2xl shadow-2xl"
            />
          </div>

          {/* TEXT */}
          <div className="absolute bottom-4 left-0 right-0 px-6 text-center z-20 pointer-events-none">
            <h2 className="text-xl font-semibold text-white drop-shadow-md">
  {name}
</h2>

{(designation || company) && (
  <p className="text-sm text-white/90 mt-1 drop-shadow-sm">
    {designation}
    {designation && company && (
      <span className="mx-1 opacity-70">•</span>
    )}
    {company}
  </p>
)}
            )}
          </div>
        </>
      )}
    </div>
  );
}
  
  /* =====================================================
   7. CORPORATE — CENTER PHOTO WITH SMART POSITIONING
   ===================================================== */
  if (layout === 'logo-only') {
    return (
      <div
  className={cn(
    'w-full rounded-3xl overflow-hidden bg-transparent flex justify-center pt-6 pb-4',
    className
  )}
>
        {/* ✅ FIX: Show initials ONLY when no photoUrl */}
        {!photoUrl ? (
          <div className="w-36 h-36 rounded-3xl bg-muted flex items-center justify-center">
            <span className="text-3xl font-bold text-muted-foreground">
              {getInitials(name)}
            </span>
          </div>
        ) : (
          /* Photo container with background that matches initials style */
          <div className="w-36 h-36 rounded-3xl overflow-hidden shadow-lg bg-muted">
            {/* Photo fades in when loaded - NO INITIALS FLASH */}
            <img
              src={photoUrl}
              alt={name}
              className={cn(
                "w-full h-full object-cover transition-opacity duration-300",
                !photoLoaded && "opacity-0"
              )}
              style={{ 
                objectPosition: facePosition, 
                transition: 'object-position 0.4s ease-out, opacity 0.3s ease-in' 
              }}
              onLoad={() => {
                // Backup loading trigger
                if (!photoLoaded) {
                  setInternalPhotoLoaded(true);
                }
              }}
            />
          </div>
        )}
      </div>
    );
  }

  /* =====================================================
     8. COLOR — INITIALS ONLY (NO NAME)
     ===================================================== */
  if (layout === 'color' && themeColor) {
    return (
      <div
  className={cn(
    'w-full rounded-3xl overflow-hidden bg-transparent flex justify-center pt-6 pb-4',
    className
  )}
>
        <div
          className="w-36 h-36 rounded-3xl flex items-center justify-center shadow-lg"
          style={{ backgroundColor: themeColor }}
        >
          <span
            className="text-3xl font-bold select-none"
            style={{ color: textColor }}
          >
            {getInitials(name)}
          </span>
        </div>
      </div>
    );
  }

  return null;
}
