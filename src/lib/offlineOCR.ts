import { createWorker, Worker } from 'tesseract.js';
import jsQR from 'jsqr';
import { supabase } from '@/integrations/supabase/client';

// Singleton worker instance for reuse
let ocrWorker: Worker | null = null;

// Contact type
export interface ScannedContact {
  name?: string | null;
  company?: string | null;
  designation?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  linkedin?: string | null;
  website?: string | null;
}

/**
 * Initialize and return the Tesseract worker (singleton pattern)
 */
async function getOCRWorker(): Promise<Worker> {
  if (!ocrWorker) {
    ocrWorker = await createWorker('eng', 1, {
      logger: (m) => console.log('[OCR]', m.status, Math.round((m.progress || 0) * 100) + '%'),
    });
  }
  return ocrWorker;
}

/**
 * Extract text from image using Tesseract.js (offline)
 */
export async function extractTextFromImage(imageData: ImageData | HTMLCanvasElement | string): Promise<string> {
  const worker = await getOCRWorker();
  const { data } = await worker.recognize(imageData);
  return data.text;
}

/**
 * Scan QR code from image using jsQR (offline)
 */
export function scanQRCode(imageData: ImageData): string | null {
  const code = jsQR(imageData.data, imageData.width, imageData.height);
  return code?.data || null;
}

/**
 * Get ImageData from a base64 image string
 */
export async function getImageDataFromBase64(base64: string): Promise<{ imageData: ImageData; canvas: HTMLCanvasElement }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      resolve({ imageData, canvas });
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = base64;
  });
}

/**
 * Parse vCard data from QR code content
 */
export function parseVCard(vcardText: string): ScannedContact {
  const result: ScannedContact = {};
  
  // Check if it's a vCard
  if (!vcardText.toUpperCase().includes('BEGIN:VCARD')) {
    // Check for WhatsApp link
    const waMatch = vcardText.match(/wa\.me\/(\+?\d+)/i);
    if (waMatch) {
      result.whatsapp = waMatch[1];
      result.phone = waMatch[1];
      return result;
    }
    
    // Check for URL patterns (LinkedIn, website, etc.)
    if (vcardText.match(/^https?:\/\//)) {
      if (vcardText.includes('linkedin.com')) {
        result.linkedin = vcardText;
      } else {
        result.website = vcardText.replace(/^https?:\/\//, '');
      }
    }
    
    // Check for MECARD format
    if (vcardText.toUpperCase().startsWith('MECARD:')) {
      return parseMECARD(vcardText);
    }
    
    return result;
  }

  // Parse vCard fields
  const lines = vcardText.split(/\r?\n/);
  for (const line of lines) {
    const upperLine = line.toUpperCase();
    
    if (upperLine.startsWith('FN:') || upperLine.startsWith('FN;')) {
      result.name = line.split(':').slice(1).join(':').trim();
    } else if (upperLine.startsWith('ORG:') || upperLine.startsWith('ORG;')) {
      result.company = line.split(':').slice(1).join(':').trim().split(';')[0];
    } else if (upperLine.startsWith('TITLE:') || upperLine.startsWith('TITLE;')) {
      result.designation = line.split(':').slice(1).join(':').trim();
    } else if (upperLine.startsWith('TEL') || upperLine.startsWith('PHONE')) {
      const phone = line.split(':').slice(1).join(':').trim().replace(/\s/g, '');
      if (phone) {
        result.phone = result.phone || phone;
        result.whatsapp = result.whatsapp || phone;
      }
    } else if (upperLine.startsWith('EMAIL')) {
      result.email = line.split(':').slice(1).join(':').trim();
    } else if (upperLine.startsWith('URL')) {
      const url = line.split(':').slice(1).join(':').trim();
      if (url.includes('linkedin.com')) {
        result.linkedin = url;
      } else if (url.includes('wa.me') || url.includes('whatsapp')) {
        const waMatch = url.match(/wa\.me\/(\+?\d+)/);
        if (waMatch) result.whatsapp = waMatch[1];
      } else {
        result.website = url.replace(/^https?:\/\//, '');
      }
    }
  }

  return result;
}

/**
 * Parse MECARD format
 */
function parseMECARD(mecard: string): ScannedContact {
  const result: ScannedContact = {};
  
  const fields = mecard.replace('MECARD:', '').split(';');
  for (const field of fields) {
    const [key, ...valueParts] = field.split(':');
    const value = valueParts.join(':').trim();
    
    if (!key || !value) continue;
    
    switch (key.toUpperCase()) {
      case 'N':
        result.name = value.replace(/,/g, ' ').trim();
        break;
      case 'ORG':
        result.company = value;
        break;
      case 'TEL':
        if (!result.phone) result.phone = value;
        if (!result.whatsapp) result.whatsapp = value;
        break;
      case 'EMAIL':
        result.email = value;
        break;
      case 'URL':
        if (value.includes('linkedin')) {
          result.linkedin = value;
        } else {
          result.website = value;
        }
        break;
    }
  }
  
  return result;
}

/**
 * Parse contact information from OCR text
 */
export function parseContactFromText(text: string): ScannedContact {
  const result: ScannedContact = {};
  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);

  // Email pattern
  const emailMatch = text.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i);
  if (emailMatch) result.email = emailMatch[0].toLowerCase();

  // Phone pattern (Indian and international)
  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{2,4}[-.\s]?\d{2,4}[-.\s]?\d{0,4}/g);
  if (phoneMatch) {
    const phone = phoneMatch[0].replace(/[^\d+]/g, '');
    if (phone.length >= 10) {
      result.phone = phone;
      result.whatsapp = phone;
    }
  }

  // LinkedIn pattern
  const linkedinMatch = text.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i);
  if (linkedinMatch) result.linkedin = `https://linkedin.com/in/${linkedinMatch[1]}`;

  // Website pattern
  const websiteMatch = text.match(/(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?)/i);
  if (websiteMatch && !websiteMatch[0].includes('linkedin') && !websiteMatch[0].includes('gmail') && !websiteMatch[0].includes('yahoo')) {
    result.website = websiteMatch[0].replace(/^www\./, '');
  }

  // Try to extract name and designation from first lines
  if (lines.length > 0) {
    // First non-email, non-phone, non-url line is likely the name
    for (const line of lines.slice(0, 3)) {
      if (!line.match(/@/) && !line.match(/\d{5,}/) && !line.match(/www\./i) && line.length > 2 && line.length < 50) {
        if (!result.name) {
          result.name = line.replace(/[^a-zA-Z\s.]/g, '').trim();
        } else if (!result.designation && !result.company) {
          // Second suitable line could be designation or company
          const cleaned = line.replace(/[^a-zA-Z\s&,.-]/g, '').trim();
          if (cleaned.length > 2) {
            result.designation = cleaned;
          }
        }
      }
    }
  }

  return result;
}

/**
 * Count non-empty fields in contact
 */
function countFields(contact: ScannedContact): number {
  return Object.values(contact).filter(v => v !== null && v !== undefined && v !== '').length;
}

/**
 * Use AI (edge function) to scan business card
 */
async function scanWithAI(base64Image: string): Promise<{
  contact: ScannedContact;
  source: 'qr' | 'ocr' | 'ai' | 'mixed';
  success: boolean;
}> {
  try {
    console.log('[AI] Calling edge function for card scan...');
    
    const { data, error } = await supabase.functions.invoke('scan-business-card', {
      body: { image: base64Image }
    });
    
    if (error) {
      console.error('[AI] Edge function error:', error);
      return { contact: {}, source: 'ai', success: false };
    }
    
    console.log('[AI] Response:', data);
    
    if (data?.success && data?.contact) {
      return {
        contact: data.contact,
        source: data.contact.source || 'ai',
        success: true
      };
    }
    
    return { contact: data?.contact || {}, source: 'ai', success: false };
    
  } catch (err) {
    console.error('[AI] Error:', err);
    return { contact: {}, source: 'ai', success: false };
  }
}

/**
 * Main function to scan a business card image
 * Tries local QR + OCR first, then falls back to AI
 */
export async function scanBusinessCardOffline(base64Image: string): Promise<{
  contact: ScannedContact;
  source: 'qr' | 'ocr' | 'ai' | 'mixed';
}> {
  let contact: ScannedContact = {};
  let source: 'qr' | 'ocr' | 'ai' | 'mixed' = 'ocr';

  try {
    const { imageData, canvas } = await getImageDataFromBase64(base64Image);
    
    // Try QR code first (fast)
    const qrData = scanQRCode(imageData);
    if (qrData) {
      console.log('[Local] QR found:', qrData.substring(0, 100));
      const qrContact = parseVCard(qrData);
      if (countFields(qrContact) > 0) {
        contact = { ...contact, ...qrContact };
        source = 'qr';
      }
    }

    // Try local OCR to fill in gaps
    try {
      const ocrText = await extractTextFromImage(canvas);
      console.log('[Local] OCR text:', ocrText.substring(0, 200));
      
      const ocrContact = parseContactFromText(ocrText);
      
      // Merge OCR results (don't overwrite QR data)
      for (const [key, value] of Object.entries(ocrContact)) {
        if (!contact[key as keyof ScannedContact] && value) {
          (contact as any)[key] = value;
        }
      }

      if (source === 'qr' && countFields(ocrContact) > 0) {
        source = 'mixed';
      }
    } catch (err) {
      console.error('[Local] OCR error:', err);
    }
    
    console.log('[Local] Fields found:', countFields(contact));
    
    // If we have at least 2 useful fields (name + something), return local results
    const hasName = contact.name && contact.name.length > 1;
    const hasContact = contact.email || contact.phone || contact.whatsapp;
    
    if (hasName && hasContact) {
      console.log('[Local] Sufficient data found, skipping AI');
      return { contact, source };
    }
    
  } catch (localErr) {
    console.error('[Local] Processing error:', localErr);
  }

  // Fallback to AI if local processing didn't get enough data
  console.log('[AI] Local processing insufficient, trying AI...');
  const aiResult = await scanWithAI(base64Image);
  
  if (aiResult.success && countFields(aiResult.contact) > 0) {
    // Merge AI results with any local data (local data takes priority)
    for (const [key, value] of Object.entries(aiResult.contact)) {
      if (!contact[key as keyof ScannedContact] && value) {
        (contact as any)[key] = value;
      }
    }
    
    // Update source
    if (countFields(contact) > 0) {
      if (source === 'qr' || source === 'ocr' || source === 'mixed') {
        source = 'mixed';
      } else {
        source = aiResult.source;
      }
    }
  }

  // Ensure whatsapp is set if phone exists
  if (contact.phone && !contact.whatsapp) {
    contact.whatsapp = contact.phone;
  }

  return { contact, source };
}

/**
 * Cleanup the OCR worker when done
 */
export async function terminateOCRWorker(): Promise<void> {
  if (ocrWorker) {
    await ocrWorker.terminate();
    ocrWorker = null;
  }
}
