// Native contact save utilities
import { Capacitor } from '@capacitor/core';

interface ContactData {
  name: string;
  company?: string;
  designation?: string;
  phone?: string;
  email?: string;
  website?: string;
  whatsapp?: string;
  about?: string;
  photo_url?: string;
}

/**
 * Generate a properly formatted vCard string
 */
function generateVCard(contact: ContactData): string {
  const lines: string[] = [
    'BEGIN:VCARD',
    'VERSION:3.0',
  ];

  // Full name (required)
  if (contact.name) {
    lines.push(`FN:${contact.name}`);
    // Parse name into components for N field
    const nameParts = contact.name.trim().split(/\s+/);
    const lastName = nameParts.length > 1 ? nameParts.pop() : '';
    const firstName = nameParts.join(' ');
    lines.push(`N:${lastName};${firstName};;;`);
  }

  // Organization and title
  if (contact.company) {
    lines.push(`ORG:${contact.company}`);
  }
  if (contact.designation) {
    lines.push(`TITLE:${contact.designation}`);
  }

  // Phone numbers
  if (contact.phone) {
    lines.push(`TEL;TYPE=CELL,VOICE:${contact.phone}`);
  }
  if (contact.whatsapp && contact.whatsapp !== contact.phone) {
    lines.push(`TEL;TYPE=CELL:${contact.whatsapp}`);
  }

  // Email
  if (contact.email) {
    lines.push(`EMAIL;TYPE=INTERNET,WORK:${contact.email}`);
  }

  // Website
  if (contact.website) {
    const url = contact.website.startsWith('http') 
      ? contact.website 
      : `https://${contact.website}`;
    lines.push(`URL:${url}`);
  }

  // Note/About
  if (contact.about) {
    // Escape special characters in notes
    const escapedNote = contact.about
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
    lines.push(`NOTE:${escapedNote}`);
  }

  // Photo URL (if available, as a URL reference)
  if (contact.photo_url) {
    lines.push(`PHOTO;VALUE=URI:${contact.photo_url}`);
  }

  lines.push('END:VCARD');
  
  return lines.join('\r\n');
}

/**
 * Save contact using native Capacitor plugin (for native apps)
 */
async function saveContactNative(contact: ContactData): Promise<boolean> {
  try {
    // Dynamically import to avoid issues on web
    const { Contacts, PhoneType, EmailType } = await import('@capacitor-community/contacts');
    
    // Request permission first
    const permissionStatus = await Contacts.requestPermissions();
    if (permissionStatus.contacts !== 'granted') {
      console.log('Contact permission not granted');
      return false;
    }

    // Parse name
    const nameParts = contact.name.trim().split(/\s+/);
    const familyName = nameParts.length > 1 ? nameParts.pop() : undefined;
    const givenName = nameParts.join(' ') || contact.name;

    // Build URLs array
    const urls: string[] = [];
    if (contact.website) {
      urls.push(contact.website.startsWith('http') ? contact.website : `https://${contact.website}`);
    }

    // Create contact object for Capacitor
    await Contacts.createContact({
      contact: {
        name: {
          given: givenName,
          family: familyName || '',
        },
        organization: contact.company ? {
          company: contact.company,
          jobTitle: contact.designation || undefined,
        } : undefined,
        phones: contact.phone ? [{
          type: PhoneType.Mobile,
          number: contact.phone,
        }] : undefined,
        emails: contact.email ? [{
          type: EmailType.Work,
          address: contact.email,
        }] : undefined,
        urls: urls.length > 0 ? urls : undefined,
        note: contact.about || undefined,
      },
    });

    return true;
  } catch (error) {
    console.error('Native contact save error:', error);
    return false;
  }
}

/**
 * Save contact using vCard - improved for mobile web
 */
function saveContactViaVCard(contact: ContactData): void {
  const vCard = generateVCard(contact);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const fileName = `${contact.name.replace(/[^a-zA-Z0-9]/g, '_')}.vcf`;
  
  // Create blob
  const blob = new Blob([vCard], { type: 'text/vcard;charset=utf-8' });
  
  if (isIOS) {
    // iOS Safari - use data URL approach which triggers native contact picker
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Create hidden link and click it
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      // Small delay before cleanup
      setTimeout(() => document.body.removeChild(link), 100);
    };
    reader.readAsDataURL(blob);
  } else if (isAndroid) {
    // Android - use blob URL for better handling
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    // Cleanup after a delay
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  } else {
    // Desktop fallback
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }
}

/**
 * Main function to save contact - automatically picks best method
 */
export async function saveContactToPhone(contact: ContactData): Promise<boolean> {
  // Try native Capacitor method first for native apps
  if (Capacitor.isNativePlatform()) {
    const success = await saveContactNative(contact);
    if (success) return true;
    // Fall through to vCard method if native fails
  }
  
  // Use vCard method for web or as fallback
  saveContactViaVCard(contact);
  return true;
}

/**
 * Check if native contact save is available
 */
export function isNativeContactSaveAvailable(): boolean {
  return Capacitor.isNativePlatform();
}
