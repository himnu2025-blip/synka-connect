import { forwardRef, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface ShareableCardImageProps {
  name: string;
  designation?: string;
  company?: string;
  photoUrl?: string;
  logoUrl?: string;
  publicUrl: string;
  slug: string;
  isPremium?: boolean;
}

/**
 * Hidden component that renders a premium shareable card image (1080x1350)
 * Branding is intentionally NOT included here.
 * Branding is added only during export in useCardDownload.tsx
 */
const ShareableCardImage = forwardRef<HTMLDivElement, ShareableCardImageProps>(
  ({ name, designation, company, photoUrl, publicUrl, slug }, ref) => {
    // Preload photo as base64 to avoid CORS issues on iOS
    const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
    const [photoLoaded, setPhotoLoaded] = useState(false);

    useEffect(() => {
      if (!photoUrl) {
        setPhotoLoaded(true);
        return;
      }

      // Convert external URL to base64 for reliable rendering
      const loadPhoto = async () => {
        try {
          // Try fetching with CORS
          const response = await fetch(photoUrl, { mode: 'cors' });
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            setPhotoDataUrl(reader.result as string);
            setPhotoLoaded(true);
          };
          reader.onerror = () => {
            // Fallback: use original URL
            setPhotoDataUrl(photoUrl);
            setPhotoLoaded(true);
          };
          reader.readAsDataURL(blob);
        } catch (error) {
          console.error('Failed to preload photo:', error);
          // Fallback: use original URL
          setPhotoDataUrl(photoUrl);
          setPhotoLoaded(true);
        }
      };

      loadPhoto();
    }, [photoUrl]);

    const getInitials = (n: string) =>
      n.split(' ')
        .filter(Boolean)
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'U';

    // Clean display URL
    const displayUrl = slug.startsWith('/u/')
      ? `synka.in${slug}`
      : slug;

    return (
      <div
        ref={ref}
        style={{
          width: 1080,
          height: 1350,
          background: 'linear-gradient(180deg, #f8f9fa 0%, #e9ecef 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '80px 60px',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
          position: 'absolute',
          left: '-9999px',
          top: '-9999px',
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        {/* Main Card */}
        <div
          style={{
            width: '100%',
            maxWidth: 900,
            background: '#ffffff',
            borderRadius: 48,
            boxShadow:
              '0 20px 60px rgba(0, 0, 0, 0.07), 0 6px 18px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '56px 48px 48px',
            flex: 1,
          }}
        >
          {/* Profile Photo */}
          <div
            style={{
              width: 200,
              height: 200,
              borderRadius: '50%',
              overflow: 'hidden',
              border: '6px solid #f1f3f4',
              background: 'linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 32px rgba(0, 0, 0, 0.1)',
              marginBottom: 32,
            }}
          >
            {photoDataUrl ? (
              <img
                src={photoDataUrl}
                alt={name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <span
                style={{
                  fontSize: 72,
                  fontWeight: 600,
                  color: '#9ca3af',
                }}
              >
                {getInitials(name)}
              </span>
            )}
          </div>

          {/* Name */}
          <h1
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: '#1a1a1a',
              margin: 0,
              textAlign: 'center',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            {name}
          </h1>

          {/* Designation */}
          {designation && (
            <p
              style={{
                fontSize: 36,
                fontWeight: 500,
                color: '#4b5563',
                margin: '18px 0 0',
                textAlign: 'center',
              }}
            >
              {designation}
            </p>
          )}

          {/* Company */}
          {company && (
            <p
              style={{
                fontSize: 32,
                fontWeight: 500,
                color: '#9ca3af',
                margin: '10px 0 0',
                textAlign: 'center',
                letterSpacing: '0.02em',
              }}
            >
              {company}
            </p>
          )}

          {/* QR Section */}
          <div
            style={{
              marginTop: 36,
              background: '#ffffff',
              borderRadius: 32,
              padding: 36,
              boxShadow:
                '0 6px 24px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0, 0, 0, 0.06)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <QRCodeSVG
              value={publicUrl}
              size={320}
              level="H"
              includeMargin={false}
              bgColor="#ffffff"
              fgColor="#1a1a1a"
            />

            {/* CTA */}
            <p
              style={{
                fontSize: 30,
                fontWeight: 600,
                color: '#111827',
                margin: '28px 0 10px',
                textAlign: 'center',
                letterSpacing: '-0.01em',
              }}
            >
              Scan to connect instantly
            </p>

            {/* Link */}
            <p
              style={{
                fontSize: 26,
                fontWeight: 500,
                color: '#6b7280',
                margin: 0,
                textAlign: 'center',
              }}
            >
              SYNKA.in
            </p>
          </div>
        </div>
      </div>
    );
  }
);

ShareableCardImage.displayName = 'ShareableCardImage';

export default ShareableCardImage;
