// Native contact save utilities
import { Capacitor } from '@capacitor/core';
import { hapticFeedback } from '@/lib/haptics';

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

  // ⚠️ CRITICAL: FN must come FIRST for iOS to display name at top
  // FN (formatted/display name) - PRIMARY field iOS uses for display
  if (contact.name) {
    lines.push(`FN:${contact.name}`);
  }

  // N (structured name) - Required by spec, must come AFTER FN for iOS
  if (contact.name) {
    // Parse name into components for N field
    const nameParts = contact.name.trim().split(/\s+/);
    const lastName = nameParts.length > 1 ? nameParts.pop() : '';
    const firstName = nameParts.join(' ') || contact.name;
    
    // Format: LastName;FirstName;MiddleName;Prefix;Suffix
    lines.push(`N:${lastName};${firstName};;;`);
  }

  // Organization and title - MUST come AFTER name fields
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
 * Save contact using native Capacitor plugin (direct write to phone contacts)
 * This provides the best UX - silent save without any download/share prompts
 */
async function saveContactNative(contact: ContactData): Promise<boolean> {
  try {
    // Dynamically import to avoid issues on web
    const { Contacts, PhoneType, EmailType } = await import('@capacitor-community/contacts');
    
    // Request permission at runtime
    const permissionStatus = await Contacts.requestPermissions();
    console.log('Contact permission status:', permissionStatus);
    
    if (permissionStatus.contacts !== 'granted') {
      console.log('Contact permission not granted');
      return false;
    }

    // Parse name into first/last
    const nameParts = contact.name.trim().split(/\s+/);
    const familyName = nameParts.length > 1 ? nameParts.pop() : '';
    const givenName = nameParts.join(' ') || contact.name;

    // Build phones array
    const phones = [];
    if (contact.phone) {
      phones.push({ type: PhoneType.Mobile, number: contact.phone });
    }
    if (contact.whatsapp && contact.whatsapp !== contact.phone) {
      phones.push({ type: PhoneType.Mobile, number: contact.whatsapp });
    }

    // Build emails array
    const emails = [];
    if (contact.email) {
      emails.push({ type: EmailType.Work, address: contact.email });
    }

    // Build URLs array
    const urls: string[] = [];
    if (contact.website) {
      urls.push(contact.website.startsWith('http') ? contact.website : `https://${contact.website}`);
    }

    console.log('Creating contact:', { givenName, familyName, company: contact.company });

    // Create contact using v7 API structure
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
        phones: phones.length > 0 ? phones : undefined,
        emails: emails.length > 0 ? emails : undefined,
        urls: urls.length > 0 ? urls : undefined,
        note: contact.about || undefined,
      },
    });

    console.log('Contact created successfully:', result);
    
    // Haptic feedback for success
    await hapticFeedback.success();
    
    return true;
  } catch (error) {
    console.error('Native contact save error:', error);
    return false;
  }
}

/**
 * Save contact using vCard via native Share API (for Capacitor Android fallback)
 */
async function saveContactViaShareAPI(contact: ContactData): Promise<boolean> {
  try {
    const { Share } = await import('@capacitor/share');
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    
    const vCard = generateVCard(contact);
    const fileName = `${contact.name.replace(/[^a-zA-Z0-9]/g, '_')}.vcf`;
    
    // Write vCard to cache directory (base64 encoded)
    const result = await Filesystem.writeFile({
      path: fileName,
      data: btoa(unescape(encodeURIComponent(vCard))),
      directory: Directory.Cache,
    });
    
    console.log('vCard written to:', result.uri);
    
    // Share the file - opens native share sheet with "Add to Contacts" option
    await Share.share({
      title: `${contact.name} Contact`,
      files: [result.uri],
      dialogTitle: 'Save Contact',
    });
    
    await hapticFeedback.light();
    return true;
  } catch (error) {
    console.error('Share API vCard error:', error);
    return false;
  }
}

/**
 * Save contact using vCard download - web fallback
 * Returns a promise that resolves when download is triggered
 */
function saveContactViaVCard(contact: ContactData): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const vCard = generateVCard(contact);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      const fileName = `${contact.name.replace(/[^a-zA-Z0-9]/g, '_')}.vcf`;
      
      // Create blob with proper MIME type
      const blob = new Blob([vCard], { type: 'text/vcard;charset=utf-8' });
      
      if (isIOS) {
        // iOS Safari - use data URL approach which triggers native contact picker
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = fileName;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          
          // Resolve after click (download triggered)
          setTimeout(() => {
            document.body.removeChild(link);
            resolve();
          }, 100);
        };
        reader.onerror = () => reject(new Error('Failed to read vCard'));
        reader.readAsDataURL(blob);
      } else if (isAndroid) {
        // Android - use blob URL
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        
        // Resolve after click (download triggered)
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          resolve();
        }, 100);
      } else {
        // Desktop fallback
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        resolve();
      }
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Main function to save contact - automatically picks best method
 * 
 * Flow:
 * 1️⃣ Try direct contact save (silent, no download) - BEST UX
 * 2️⃣ If permission denied / error → Share API vCard  
 * 3️⃣ If Share fails → Web download vCard
 * 
 * Returns: { success: boolean, method: 'native' | 'share' | 'vcard' }
 */
export async function saveContactToPhone(contact: ContactData): Promise<{ success: boolean; method: string }> {
  console.log('saveContactToPhone called, isNative:', Capacitor.isNativePlatform());
  
  // For native apps, try direct contact write first
  if (Capacitor.isNativePlatform()) {
    // Step 1: Try native direct save (best UX - silent, instant)
    const nativeSuccess = await saveContactNative(contact);
    console.log('Native contact save result:', nativeSuccess);
    
    if (nativeSuccess) {
      return { success: true, method: 'native' };
    }
    
    // Step 2: Native failed, try Share API with vCard
    console.log('Native save failed, trying Share API vCard');
    const shareSuccess = await saveContactViaShareAPI(contact);
    console.log('Share API vCard result:', shareSuccess);
    
    if (shareSuccess) {
      return { success: true, method: 'share' };
    }
    
    // Step 3: Share also failed, use web vCard download as last resort
    console.log('Share API failed, using web vCard download');
    try {
      await saveContactViaVCard(contact);
      return { success: true, method: 'vcard' };
    } catch (error) {
      console.error('vCard download failed:', error);
      return { success: false, method: 'vcard' };
    }
  }
  
  // For mobile web, use vCard method which triggers native contact picker
  try {
    await saveContactViaVCard(contact);
    return { success: true, method: 'vcard' };
  } catch (error) {
    console.error('vCard download failed:', error);
    return { success: false, method: 'vcard' };
  }
}

/**
 * Check if native contact save is available
 */
export function isNativeContactSaveAvailable(): boolean {
  return Capacitor.isNativePlatform();
}
