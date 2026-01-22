import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Calculate relative luminance of a hex color
 * Returns true if the color is dark (text should be white)
 */
export function isColorDark(hexColor: string): boolean {
  // Default to dark if no color provided
  if (!hexColor) return true;
  
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  // Calculate relative luminance using sRGB formula
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  
  // Threshold of 0.5 for determining light vs dark
  return luminance < 0.5;
}

/**
 * Get contrasting text color (white or black) based on background color
 */
export function getContrastTextColor(bgColor: string): string {
  return isColorDark(bgColor) ? '#ffffff' : '#000000';
}

/**
 * Get a subtle/muted version of a hex color (30% opacity as solid color)
 * This creates a lighter tint of the color for backgrounds
 */
export function getSubtleBackground(hexColor: string): string {
  if (!hexColor) return '#f3f4f6';
  
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Mix with white at 30% opacity (0.3 * color + 0.7 * white)
  const mixR = Math.round(r * 0.3 + 255 * 0.7);
  const mixG = Math.round(g * 0.3 + 255 * 0.7);
  const mixB = Math.round(b * 0.3 + 255 * 0.7);
  
  return `rgb(${mixR}, ${mixG}, ${mixB})`;
}

// Local Timezone Utilities - uses browser's local timezone

/**
 * Convert a datetime-local string (YYYY-MM-DDTHH:mm) to ISO string
 * The input is treated as local time and converted to UTC for storage
 */
export function localToISO(datetimeLocal: string): string {
  if (!datetimeLocal) return '';
  // datetime-local gives us "YYYY-MM-DDTHH:mm" format (no timezone)
  // Browser interprets this as local time, so we just convert to ISO
  return new Date(datetimeLocal).toISOString();
}

// Alias for backward compatibility
export const localToIST = localToISO;

/**
 * Convert a UTC/ISO date string to local Date object
 */
export function toLocalDate(isoString: string): Date {
  if (!isoString) return new Date();
  return new Date(isoString);
}

// Alias for backward compatibility
export const toIST = toLocalDate;

/**
 * Format a UTC/ISO date string to local display format
 */
export function formatLocal(isoString: string): string {
  if (!isoString) return '';
  const localDate = new Date(isoString);
  
  const day = String(localDate.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[localDate.getMonth()];
  const year = localDate.getFullYear();
  const hours = localDate.getHours();
  const minutes = String(localDate.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  
  return `${day} ${month} ${year}, ${String(hour12).padStart(2, '0')}:${minutes} ${ampm}`;
}

// Alias for backward compatibility
export const formatIST = formatLocal;

/**
 * Convert an ISO date string to datetime-local format for form inputs
 */
export function toDatetimeLocal(isoString: string): string {
  if (!isoString) return '';
  const localDate = new Date(isoString);
  
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, '0');
  const day = String(localDate.getDate()).padStart(2, '0');
  const hours = String(localDate.getHours()).padStart(2, '0');
  const minutes = String(localDate.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Alias for backward compatibility
export const toDatetimeLocalIST = toDatetimeLocal;
