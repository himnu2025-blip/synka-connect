/**
 * Social media link normalization utilities
 * Handles various input formats and normalizes to full URLs
 */

export type SocialPlatform = 'instagram' | 'youtube' | 'twitter' | 'facebook' | 'calendly';

interface NormalizeResult {
  url: string;
  displayValue: string;
  isValid: boolean;
}

// Clean common artifacts from input
const cleanInput = (input: string): string => {
  if (!input) return '';
  return input
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width chars
    .replace(/\s+/g, '') // Remove all whitespace
    .replace(/^@/, ''); // Remove leading @
};

/**
 * Normalize Instagram input
 * Handles: @synka.in | synka.in | instagram.com/synka.in | https://www.instagram.com/synka.in
 * Returns: https://www.instagram.com/synka.in
 */
export const normalizeInstagram = (input: string): NormalizeResult => {
  const cleaned = cleanInput(input);
  if (!cleaned) return { url: '', displayValue: '', isValid: true };

  // Extract username from full URL if present
  const urlMatch = cleaned.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^\/\?#]+)/i);
  if (urlMatch) {
    const username = urlMatch[1];
    return {
      url: `https://www.instagram.com/${username}`,
      displayValue: `@${username}`,
      isValid: true,
    };
  }

  // Assume it's just a username
  const username = cleaned.replace(/\/$/, '');
  return {
    url: `https://www.instagram.com/${username}`,
    displayValue: `@${username}`,
    isValid: username.length > 0,
  };
};

/**
 * Normalize Twitter/X input
 * Handles: @synka | twitter.com/synka | x.com/synka | https://x.com/synka
 * Returns: https://x.com/synka
 */
export const normalizeTwitter = (input: string): NormalizeResult => {
  const cleaned = cleanInput(input);
  if (!cleaned) return { url: '', displayValue: '', isValid: true };

  // Extract username from full URL if present
  const urlMatch = cleaned.match(/(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/([^\/\?#]+)/i);
  if (urlMatch) {
    const username = urlMatch[1];
    return {
      url: `https://x.com/${username}`,
      displayValue: `@${username}`,
      isValid: true,
    };
  }

  // Assume it's just a username
  const username = cleaned.replace(/\/$/, '');
  return {
    url: `https://x.com/${username}`,
    displayValue: `@${username}`,
    isValid: username.length > 0,
  };
};

/**
 * Normalize Facebook input
 * Handles: synka | facebook.com/synka | fb.com/synka | https://www.facebook.com/synka
 * Returns: https://www.facebook.com/synka
 */
export const normalizeFacebook = (input: string): NormalizeResult => {
  const cleaned = cleanInput(input);
  if (!cleaned) return { url: '', displayValue: '', isValid: true };

  // Extract page/profile from full URL if present
  const urlMatch = cleaned.match(/(?:https?:\/\/)?(?:www\.)?(?:facebook\.com|fb\.com)\/([^\/\?#]+)/i);
  if (urlMatch) {
    const pageId = urlMatch[1];
    return {
      url: `https://www.facebook.com/${pageId}`,
      displayValue: pageId,
      isValid: true,
    };
  }

  // Assume it's just a page name/username
  const pageId = cleaned.replace(/\/$/, '');
  return {
    url: `https://www.facebook.com/${pageId}`,
    displayValue: pageId,
    isValid: pageId.length > 0,
  };
};

/**
 * Normalize YouTube input
 * Handles:
 * - @handle → https://www.youtube.com/@handle
 * - channel URL → keep as is (with https)
 * - video URL → keep as is (with https)
 * - channel ID → https://www.youtube.com/channel/ID
 */
export const normalizeYouTube = (input: string): NormalizeResult => {
  const cleaned = cleanInput(input);
  if (!cleaned) return { url: '', displayValue: '', isValid: true };

  // Already a full URL
  if (cleaned.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)/i)) {
    let url = cleaned;
    if (!url.match(/^https?:\/\//i)) {
      url = `https://${url}`;
    }
    // Extract display name from URL
    const handleMatch = url.match(/@([^\/\?#]+)/);
    const channelMatch = url.match(/\/channel\/([^\/\?#]+)/);
    const displayValue = handleMatch ? `@${handleMatch[1]}` : channelMatch ? 'Channel' : 'YouTube';
    
    return {
      url,
      displayValue,
      isValid: true,
    };
  }

  // Starts with @ - it's a handle
  if (cleaned.startsWith('@') || input.trim().startsWith('@')) {
    const handle = cleaned.replace(/^@/, '');
    return {
      url: `https://www.youtube.com/@${handle}`,
      displayValue: `@${handle}`,
      isValid: handle.length > 0,
    };
  }

  // Assume it's a channel handle without @
  return {
    url: `https://www.youtube.com/@${cleaned}`,
    displayValue: `@${cleaned}`,
    isValid: cleaned.length > 0,
  };
};

/**
 * Normalize Calendly input
 * Handles: nitesh | calendly.com/nitesh | https://calendly.com/nitesh
 * Returns: https://calendly.com/nitesh
 */
export const normalizeCalendly = (input: string): NormalizeResult => {
  const cleaned = cleanInput(input);
  if (!cleaned) return { url: '', displayValue: '', isValid: true };

  // Extract username/path from full URL if present
  const urlMatch = cleaned.match(/(?:https?:\/\/)?(?:www\.)?calendly\.com\/([^#]+)/i);
  if (urlMatch) {
    const path = urlMatch[1].replace(/\/$/, '');
    return {
      url: `https://calendly.com/${path}`,
      displayValue: 'Book a meeting',
      isValid: true,
    };
  }

  // Assume it's just a username/path
  const path = cleaned.replace(/\/$/, '');
  return {
    url: `https://calendly.com/${path}`,
    displayValue: 'Book a meeting',
    isValid: path.length > 0,
  };
};

/**
 * Normalize any social platform input
 */
export const normalizeSocialLink = (platform: SocialPlatform, input: string): NormalizeResult => {
  switch (platform) {
    case 'instagram':
      return normalizeInstagram(input);
    case 'twitter':
      return normalizeTwitter(input);
    case 'facebook':
      return normalizeFacebook(input);
    case 'youtube':
      return normalizeYouTube(input);
    case 'calendly':
      return normalizeCalendly(input);
    default:
      return { url: input, displayValue: input, isValid: true };
  }
};

/**
 * Get URL for normalized social link (for storage)
 */
export const getSocialUrl = (platform: SocialPlatform, input: string): string => {
  return normalizeSocialLink(platform, input).url;
};

/**
 * Get placeholder text for each platform
 */
export const getSocialPlaceholder = (platform: SocialPlatform): string => {
  switch (platform) {
    case 'instagram':
      return 'Username or full URL';
    case 'twitter':
      return 'Username or full URL';
    case 'facebook':
      return 'Page name or full URL';
    case 'youtube':
      return '@handle or channel URL';
    case 'calendly':
      return 'Username or booking URL';
    default:
      return 'Enter link';
  }
};

/**
 * Get label for each platform
 */
export const getSocialLabel = (platform: SocialPlatform): string => {
  switch (platform) {
    case 'instagram':
      return 'Instagram';
    case 'twitter':
      return 'Twitter / X';
    case 'facebook':
      return 'Facebook';
    case 'youtube':
      return 'YouTube';
    case 'calendly':
      return 'Calendly';
    default:
      return platform;
  }
};
