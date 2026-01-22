/**
 * NFC Writer Module
 * 
 * IMPORTANT: Native NFC write in Capacitor Android WebView is NOT supported.
 * The Web NFC API (NDEFReader) only works in Chrome browser on Android, NOT in WebView.
 * 
 * For Capacitor apps, NFC writing requires a native plugin, but compatible Capacitor 7
 * plugins are limited. This module provides:
 * 1. Web browser NFC support (Chrome on Android)
 * 2. Graceful fallback with user-friendly messaging for native apps
 * 
 * PRODUCTION SOLUTION: For full NFC support in native apps, consider:
 * - Building a custom Capacitor plugin
 * - Using a third-party service that provides NFC writing capabilities
 * - Pre-programming NFC tags externally
 */

import { Capacitor } from '@capacitor/core';

export interface NfcWriteResult {
  success: boolean;
  error?: string;
}

export interface NfcAvailability {
  isSupported: boolean;
  isNative: boolean;
  message?: string;
}

/**
 * Check if NFC is available
 * Returns detailed info about NFC support status
 */
export function checkNfcAvailability(): NfcAvailability {
  const isNative = Capacitor.isNativePlatform();
  
  // On native platforms, NFC write via WebView is not supported
  if (isNative) {
    return {
      isSupported: false,
      isNative: true,
      message: 'NFC writing is not available in the app. Please use Chrome browser on Android to write NFC tags.',
    };
  }

  // On web, check for NDEFReader support
  const hasNdefReader = 'NDEFReader' in window;
  
  return {
    isSupported: hasNdefReader,
    isNative: false,
    message: hasNdefReader 
      ? undefined 
      : 'NFC is not supported on this browser. Please use Chrome on Android.',
  };
}

/**
 * Write a URL to an NFC tag (Web NFC API only)
 * Only works in Chrome browser on Android, NOT in Capacitor WebView
 * 
 * @param publicUrl - The full URL to write (e.g., https://synka.in/u/john-doe)
 */
export async function writeNfcUrl(publicUrl: string): Promise<NfcWriteResult> {
  const availability = checkNfcAvailability();
  
  if (!availability.isSupported) {
    return { 
      success: false, 
      error: availability.message || 'NFC is not supported on this device' 
    };
  }

  try {
    // @ts-ignore NDEFReader may not be in types
    const ndef = new NDEFReader();
    
    await ndef.write({
      records: [
        { recordType: 'url', data: publicUrl },
      ],
    });

    return { success: true };
  } catch (error: any) {
    console.error('NFC write error:', error);
    
    if (error?.name === 'NotAllowedError') {
      return { success: false, error: 'NFC permission denied. Please allow NFC access.' };
    }
    
    if (error?.name === 'NotSupportedError') {
      return { success: false, error: 'NFC is not supported on this device.' };
    }
    
    return { 
      success: false, 
      error: error?.message || 'Failed to write to NFC tag. Make sure NFC is enabled.' 
    };
  }
}

/**
 * Write URL + vCard data to NFC tag (Web NFC API only)
 */
export async function writeNfcWithVCard(
  publicUrl: string, 
  vCardData: string
): Promise<NfcWriteResult> {
  const availability = checkNfcAvailability();
  
  if (!availability.isSupported) {
    return { 
      success: false, 
      error: availability.message || 'NFC is not supported on this device' 
    };
  }

  try {
    // @ts-ignore NDEFReader may not be in types
    const ndef = new NDEFReader();
    
    const encoder = new TextEncoder();
    const vCardPayload = encoder.encode(vCardData);

    await ndef.write({
      records: [
        { recordType: 'url', data: publicUrl },
        {
          recordType: 'mime',
          mediaType: 'text/vcard',
          data: vCardPayload,
        },
      ],
    });

    return { success: true };
  } catch (error: any) {
    console.error('NFC write error:', error);
    return { 
      success: false, 
      error: error?.message || 'Failed to write to NFC tag' 
    };
  }
}

/**
 * Generate a vCard string from contact data
 */
export function generateVCard(data: {
  name?: string;
  company?: string;
  designation?: string;
  phone?: string;
  email?: string;
  url?: string;
}): string {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
  
  if (data.name) {
    lines.push(`FN:${data.name}`);
    const nameParts = data.name.trim().split(' ');
    const lastName = nameParts.length > 1 ? nameParts.pop() : '';
    const firstName = nameParts.join(' ');
    lines.push(`N:${lastName};${firstName};;;`);
  }
  
  if (data.company) lines.push(`ORG:${data.company}`);
  if (data.designation) lines.push(`TITLE:${data.designation}`);
  if (data.phone) lines.push(`TEL;TYPE=CELL:${data.phone}`);
  if (data.email) lines.push(`EMAIL:${data.email}`);
  if (data.url) lines.push(`URL:${data.url}`);
  
  lines.push('END:VCARD');
  return lines.join('\r\n');
}
