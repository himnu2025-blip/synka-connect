// Public URL utilities
// ALWAYS use these functions to construct public URLs - never use window.location.origin or localhost

const PUBLIC_BASE_URL = import.meta.env.VITE_PUBLIC_BASE_URL || 'https://synka.in';

/**
 * Get the base URL for public-facing URLs (sharing, QR codes, etc.)
 * NEVER use window.location.origin for shareable URLs
 */
export function getPublicBaseUrl(): string {
  return PUBLIC_BASE_URL;
}

/**
 * Generate the public card URL for a user's profile slug
 * Format: https://synka.in/u/{slug}
 */
export function getPublicCardUrl(slug: string): string {
  return `${PUBLIC_BASE_URL}/u/${slug}`;
}

/**
 * Generate the OG image URL for social previews
 * This returns the card meta URL which serves OG tags with the user's photo
 */
export function getOgImageUrl(slug: string): string {
  return `${PUBLIC_BASE_URL}/u/${slug}`;
}

/**
 * Generate a shareable card URL with optional source tracking
 */
export function getShareableCardUrl(slug: string, source?: 'qr' | 'nfc' | 'share'): string {
  const baseUrl = getPublicCardUrl(slug);
  if (source) {
    return `${baseUrl}?src=${source}`;
  }
  return baseUrl;
}

/**
 * Generate meta URL that serves proper OG tags for crawlers
 * Now the same as public card URL since /u/:slug serves OG meta via Vercel rewrite
 */
export function getCardMetaUrl(slug: string): string {
  return `${PUBLIC_BASE_URL}/u/${slug}`;
}
