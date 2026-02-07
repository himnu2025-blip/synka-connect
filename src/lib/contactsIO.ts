/**
 * CSV Import/Export utilities for CRM contacts
 */

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Contact } from '@/hooks/useContacts';

// Fields to export/import
const EXPORT_FIELDS = [
  'name',
  'company',
  'designation',
  'email',
  'phone',
  'whatsapp',
  'linkedin',
  'website',
  'about',
  'source',
  'created_at',
] as const;

const IMPORT_FIELDS = [
  'name',
  'company',
  'designation',
  'email',
  'phone',
  'whatsapp',
  'linkedin',
  'website',
] as const;

/**
 * Export contacts to CSV format
 */
export function exportContactsToCSV(contacts: Contact[]): string {
  // Header row
  const headers = EXPORT_FIELDS.join(',');
  
  // Data rows
  const rows = contacts.map(contact => {
    return EXPORT_FIELDS.map(field => {
      const value = contact[field as keyof Contact];
      if (value === null || value === undefined) return '';
      // Escape quotes and wrap in quotes if contains comma or quote
      const strValue = String(value);
      if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
        return `"${strValue.replace(/"/g, '""')}"`;
      }
      return strValue;
    }).join(',');
  });
  
  return [headers, ...rows].join('\n');
}

/**
 * Download contacts as CSV file - handles both web and native platforms
 */
export async function downloadContactsCSV(
  contacts: Contact[],
  filename = 'contacts.csv'
): Promise<boolean> {
  try {
    const csv = exportContactsToCSV(contacts);

    // Native app: Use Capacitor Filesystem + Share
    if (Capacitor.isNativePlatform()) {
      return await downloadCSVNative(csv, filename);
    }

    // Web: Use standard blob download
    return downloadCSVWeb(csv, filename);
  } catch (error) {
    console.error('CSV download failed:', error);
    return false;
  }
}

/**
 * Native platform CSV download using Filesystem + Share
 */
async function downloadCSVNative(csv: string, filename: string): Promise<boolean> {
  try {
    // Write file to cache directory
    const result = await Filesystem.writeFile({
      path: filename,
      data: csv,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });

    // Share the file
    await Share.share({
      title: 'Export Contacts',
      text: 'Synka CRM Contacts',
      url: result.uri,
      dialogTitle: 'Save or Share Contacts',
    });

    return true;
  } catch (error) {
    console.error('Native CSV export failed:', error);
    // Fallback to web method if share fails
    return downloadCSVWeb(csv, filename);
  }
}

/**
 * Web platform CSV download using blob URL
 */
function downloadCSVWeb(csv: string, filename: string): boolean {
  try {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('Web CSV download failed:', error);
    return false;
  }
}

/**
 * Parse CSV string into contact objects
 */
export function parseCSV(csvText: string): Partial<Contact>[] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return [];
  
  // Parse header to get column indices
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().trim());
  
  // Map header names to our field names
  const fieldMap: Record<string, string> = {
    'name': 'name',
    'full name': 'name',
    'fullname': 'name',
    'contact name': 'name',
    'company': 'company',
    'company name': 'company',
    'organization': 'company',
    'designation': 'designation',
    'title': 'designation',
    'job title': 'designation',
    'role': 'designation',
    'position': 'designation',
    'email': 'email',
    'email address': 'email',
    'e-mail': 'email',
    'phone': 'phone',
    'phone number': 'phone',
    'mobile': 'phone',
    'mobile number': 'phone',
    'telephone': 'phone',
    'whatsapp': 'whatsapp',
    'whatsapp number': 'whatsapp',
    'linkedin': 'linkedin',
    'linkedin url': 'linkedin',
    'website': 'website',
    'web': 'website',
    'url': 'website',
  };
  
  const columnMapping: { index: number; field: string }[] = [];
  headers.forEach((header, index) => {
    const mappedField = fieldMap[header];
    if (mappedField) {
      columnMapping.push({ index, field: mappedField });
    }
  });
  
  // Parse data rows
  const contacts: Partial<Contact>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const contact: Record<string, string> = {};
    
    columnMapping.forEach(({ index, field }) => {
      if (values[index]) {
        contact[field] = values[index].trim();
      }
    });
    
    // Only add if we have at least a name
    if (contact.name) {
      contacts.push(contact as Partial<Contact>);
    }
  }
  
  return contacts;
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        // End of quoted value
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  
  result.push(current);
  return result;
}

/**
 * Read file as text
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Generate sample CSV template
 */
export function downloadSampleCSV() {
  const headers = 'name,company,designation,email,phone,whatsapp,linkedin,website';
  const sample = 'John Doe,Acme Inc,CEO,john@acme.com,+919876543210,+919876543210,johndoe,www.acme.com';
  const csv = `${headers}\n${sample}`;
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = 'contacts_template.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
