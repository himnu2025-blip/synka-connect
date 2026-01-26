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
    console.log('Contact permission status:', permissionStatus);
    
    if (permissionStatus.contacts !== 'granted') {
      console.log('Contact permission not granted, falling back to vCard');
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

    console.log('Creating contact with:', { givenName, familyName, company: contact.company });

    // Create contact object for Capacitor
    const result = await Contacts.createContact({
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

    console.log('Contact created successfully:', result);
    return true;
  } catch (error) {
    console.error('Native contact save error:', error);
    return false;
  }
}

/**
 * Save contact using vCard via native Share API (for Capacitor Android)
 */
async function saveContactViaShareAPI(contact: ContactData): Promise<boolean> {
  try {
    const { Share } = await import('@capacitor/share');
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    
    const vCard = generateVCard(contact);
    const fileName = `${contact.name.replace(/[^a-zA-Z0-9]/g, '_')}.vcf`;
    
    // Write vCard to cache directory
    const result = await Filesystem.writeFile({
      path: fileName,
      data: btoa(unescape(encodeURIComponent(vCard))), // Base64 encode
      directory: Directory.Cache,
    });
    
    console.log('vCard written to:', result.uri);
    
    // Share the file - this opens the native share sheet with "Add to Contacts" option
    await Share.share({
      title: `${contact.name} Contact`,
      files: [result.uri],
      dialogTitle: 'Save Contact',
    });
    
    return true;
  } catch (error) {
    console.error('Share API vCard error:', error);
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
 * Returns true only after native save is confirmed, or after triggering vCard download
 */
export async function saveContactToPhone(contact: ContactData): Promise<boolean> {
  console.log('saveContactToPhone called, isNative:', Capacitor.isNativePlatform());
  
  // For native apps, try Capacitor Contacts plugin first
  if (Capacitor.isNativePlatform()) {
    const success = await saveContactNative(contact);
    console.log('Native contact save result:', success);
    
    // If native save failed (permission denied or error), fall back to Share API with vCard
    if (!success) {
      console.log('Native save failed, falling back to Share API vCard');
      const shareSuccess = await saveContactViaShareAPI(contact);
      console.log('Share API vCard result:', shareSuccess);
      
      // If Share API also failed, try web vCard as last resort
      if (!shareSuccess) {
        console.log('Share API failed, falling back to web vCard');
        saveContactViaVCard(contact);
      }
      return true; // vCard flow triggered
    }
    
    return success;
  }
  
  // For mobile web, use vCard method which triggers native contact picker
  saveContactViaVCard(contact);
  // vCard method always triggers download, return true
  return true;
}

/**
 * Check if native contact save is available
 */
export function isNativeContactSaveAvailable(): boolean {
  return Capacitor.isNativePlatform();
}
