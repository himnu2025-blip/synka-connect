/**
 * Phone number formatting utility
 * 
 * Formats phone numbers in human-readable, country-specific patterns
 * while keeping raw numbers unchanged for tel: links, WhatsApp, vCard, etc.
 */

import { COUNTRY_CODES, getCountryCode } from '@/components/ui/floating-input';

// Country-specific formatting patterns
// Each function receives digits-only string (without country code) and returns formatted string
const FORMAT_PATTERNS: Record<string, (digits: string) => string> = {
  // India: +91 98765 43210
  '+91': (d) => {
    if (d.length === 10) {
      return `${d.slice(0, 5)} ${d.slice(5)}`;
    }
    return groupDigits(d, [5, 5]);
  },

  // USA/Canada: +1 415 555 2671
  '+1': (d) => {
    if (d.length === 10) {
      return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
    }
    return groupDigits(d, [3, 3, 4]);
  },

  // UK: +44 7911 123 456
  '+44': (d) => {
    if (d.length === 10) {
      return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
    }
    return groupDigits(d, [4, 3, 3]);
  },

  // UAE: +971 50 123 4567
  '+971': (d) => {
    if (d.length >= 9) {
      return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
    }
    return groupDigits(d, [2, 3, 4]);
  },

  // Australia: +61 4 1234 5678
  '+61': (d) => {
    if (d.length === 9) {
      return `${d.slice(0, 1)} ${d.slice(1, 5)} ${d.slice(5)}`;
    }
    return groupDigits(d, [1, 4, 4]);
  },

  // Saudi Arabia: +966 50 123 4567
  '+966': (d) => {
    if (d.length >= 9) {
      return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
    }
    return groupDigits(d, [2, 3, 4]);
  },

  // Singapore: +65 9123 4567
  '+65': (d) => {
    if (d.length === 8) {
      return `${d.slice(0, 4)} ${d.slice(4)}`;
    }
    return groupDigits(d, [4, 4]);
  },

  // Germany: +49 170 1234567
  '+49': (d) => {
    if (d.length >= 10) {
      return `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7)}`;
    }
    return groupDigits(d, [3, 4, 4]);
  },

  // France: +33 6 12 34 56 78
  '+33': (d) => {
    if (d.length === 9) {
      return `${d.slice(0, 1)} ${d.slice(1, 3)} ${d.slice(3, 5)} ${d.slice(5, 7)} ${d.slice(7)}`;
    }
    return groupDigits(d, [1, 2, 2, 2, 2]);
  },

  // China: +86 138 1234 5678
  '+86': (d) => {
    if (d.length === 11) {
      return `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7)}`;
    }
    return groupDigits(d, [3, 4, 4]);
  },

  // Japan: +81 90 1234 5678
  '+81': (d) => {
    if (d.length === 10) {
      return `${d.slice(0, 2)} ${d.slice(2, 6)} ${d.slice(6)}`;
    }
    return groupDigits(d, [2, 4, 4]);
  },

  // South Korea: +82 10 1234 5678
  '+82': (d) => {
    if (d.length >= 9) {
      return `${d.slice(0, 2)} ${d.slice(2, 6)} ${d.slice(6)}`;
    }
    return groupDigits(d, [2, 4, 4]);
  },

  // Brazil: +55 11 98765 4321
  '+55': (d) => {
    if (d.length >= 10) {
      return `${d.slice(0, 2)} ${d.slice(2, 7)} ${d.slice(7)}`;
    }
    return groupDigits(d, [2, 5, 4]);
  },

  // Russia: +7 916 123 45 67
  '+7': (d) => {
    if (d.length === 10) {
      return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}`;
    }
    return groupDigits(d, [3, 3, 2, 2]);
  },

  // Qatar: +974 3312 3456
  '+974': (d) => {
    if (d.length === 8) {
      return `${d.slice(0, 4)} ${d.slice(4)}`;
    }
    return groupDigits(d, [4, 4]);
  },

  // Kuwait: +965 5512 3456
  '+965': (d) => {
    if (d.length === 8) {
      return `${d.slice(0, 4)} ${d.slice(4)}`;
    }
    return groupDigits(d, [4, 4]);
  },

  // Bahrain: +973 3312 3456
  '+973': (d) => {
    if (d.length === 8) {
      return `${d.slice(0, 4)} ${d.slice(4)}`;
    }
    return groupDigits(d, [4, 4]);
  },

  // Oman: +968 9123 4567
  '+968': (d) => {
    if (d.length === 8) {
      return `${d.slice(0, 4)} ${d.slice(4)}`;
    }
    return groupDigits(d, [4, 4]);
  },

  // Pakistan: +92 300 1234567
  '+92': (d) => {
    if (d.length === 10) {
      return `${d.slice(0, 3)} ${d.slice(3)}`;
    }
    return groupDigits(d, [3, 7]);
  },

  // Bangladesh: +880 1712 345678
  '+880': (d) => {
    if (d.length === 10) {
      return `${d.slice(0, 4)} ${d.slice(4)}`;
    }
    return groupDigits(d, [4, 6]);
  },
};

/**
 * Helper: Group digits into chunks of specified sizes
 */
function groupDigits(digits: string, sizes: number[]): string {
  const parts: string[] = [];
  let offset = 0;

  for (const size of sizes) {
    if (offset >= digits.length) break;
    parts.push(digits.slice(offset, offset + size));
    offset += size;
  }

  // Append remaining digits if any
  if (offset < digits.length) {
    parts.push(digits.slice(offset));
  }

  return parts.join(' ');
}

/**
 * Default formatter for countries without specific pattern
 * Groups digits in 3-3-4 pattern (most common international format)
 */
function defaultFormat(digits: string): string {
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return groupDigits(digits, [3, 3, 4]);
}

/**
 * Format a phone number for display based on country code
 * 
 * @param phone - Full phone number (e.g., "+919876543210")
 * @param countryCode - Optional country code override (e.g., "+91")
 * @returns Formatted phone string (e.g., "+91 98765 43210")
 * 
 * @example
 * formatPhoneByCountry("+919876543210") // "+91 98765 43210"
 * formatPhoneByCountry("+14155552671") // "+1 415 555 2671"
 * formatPhoneByCountry("+447911123456") // "+44 7911 123 456"
 */
export function formatPhoneByCountry(phone: string | null | undefined, countryCode?: string): string {
  if (!phone) return '';

  // Normalize: remove all non-digit characters except leading +
  const hasPlus = phone.startsWith('+');
  const digitsOnly = phone.replace(/\D/g, '');

  if (!digitsOnly) return '';

  // Detect country code if not provided
  const detectedCode = countryCode || getCountryCode(phone);

  // Get digits without country code
  const codeDigits = detectedCode.replace(/\D/g, '');
  let localDigits = digitsOnly;

  // If phone starts with country code digits, strip them
  if (digitsOnly.startsWith(codeDigits)) {
    localDigits = digitsOnly.slice(codeDigits.length);
  }

  // If no local digits after stripping, return the original
  if (!localDigits) return phone;

  // Get formatter for this country code, or use default
  const formatter = FORMAT_PATTERNS[detectedCode] || defaultFormat;
  const formattedLocal = formatter(localDigits);

  // Return with country code prefix
  return `${detectedCode} ${formattedLocal}`;
}

/**
 * Get raw phone number suitable for tel: links, WhatsApp, vCard
 * Just cleans the number, doesn't format it
 * 
 * @param phone - Phone number in any format
 * @returns Clean phone number with + prefix (e.g., "+919876543210")
 */
export function getRawPhone(phone: string | null | undefined): string {
  if (!phone) return '';

  const digitsOnly = phone.replace(/\D/g, '');
  if (!digitsOnly) return '';

  // Ensure + prefix
  return phone.startsWith('+') ? `+${digitsOnly}` : `+${digitsOnly}`;
}

/**
 * Format phone for WhatsApp link (without + prefix)
 * 
 * @param phone - Phone number in any format
 * @returns Clean digits for wa.me link (e.g., "919876543210")
 */
export function getWhatsAppNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

/**
 * Check if a string looks like a valid phone number
 */
export function isValidPhoneNumber(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

// Re-export getCountryCode for convenience
export { getCountryCode };
