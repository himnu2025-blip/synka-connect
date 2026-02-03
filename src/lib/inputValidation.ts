/**
 * Input validation and normalization utilities for contact forms
 */

// ==================== HELPER ====================
/**
 * Clean common artifacts and extract username from URL or handle
 */
const cleanInput = (input: string): string => {
  if (!input) return '';
  return input
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width chars
    .replace(/\s+/g, '') // Remove all whitespace
    .replace(/^@/, '') // Remove leading @
    .replace(/\/+$/, ''); // Remove trailing slashes
};

// ==================== NAME/TEXT CASE NORMALIZATION ====================
/**
 * Common acronyms/abbreviations that should stay UPPERCASE
 */
const UPPERCASE_WORDS = [
  // Executive titles
  'CEO', 'CFO', 'CTO', 'COO', 'CMO', 'CIO', 'CHRO', 'CLO', 'CPO', 'CSO',
  'VP', 'SVP', 'EVP', 'AVP', 'MD', 'GM', 'ED',
  // Business/Tech terms
  'HR', 'IT', 'AI', 'ML', 'UI', 'UX', 'QA', 'PR', 'IR', 'BD',
  'B2B', 'B2C', 'D2C', 'SaaS', 'PaaS', 'IaaS',
  'USA', 'UK', 'UAE', 'EU', 'APAC', 'EMEA', 'LATAM',
  'MBA', 'PhD', 'CPA', 'CFA', 'PMP',
  'LLC', 'LLP', 'PLC', 'INC', 'LTD', 'PVT', 'CORP',
  'R&D', 'M&A', 'P&L',
  'SEO', 'SEM', 'SMM', 'CRM', 'ERP', 'HRM',
  'API', 'SDK', 'SLA', 'KPI', 'ROI', 'OKR',
  'AWS', 'GCP', 'IBM', 'SAP', 'HP', 'HCL', 'TCS', 'KPMG', 'PWC', 'EY',
];

/**
 * Convert text to proper title case (First Letter Capital, rest lowercase)
 * Handles: "JOHN SMITH" → "John Smith", "john doe" → "John Doe"
 * Preserves: Acronyms (CEO, CTO), name particles (van, de, von)
 */
export const toProperCase = (text: string): string => {
  if (!text || !text.trim()) return '';
  
  const cleaned = text.trim().replace(/\s+/g, ' '); // Normalize whitespace
  
  // Common lowercase particles in names
  const particles = ['van', 'de', 'der', 'von', 'la', 'le', 'du', 'da', 'di', 'del', 'dos', 'das'];
  
  return cleaned
    .split(' ')
    .map((word, index) => {
      const upperWord = word.toUpperCase();
      
      // Check if it's a known acronym - preserve uppercase
      if (UPPERCASE_WORDS.includes(upperWord)) {
        return upperWord;
      }
      
      // Check for compound acronyms like "Co-Founder" or "VP-Sales"
      if (word.includes('-')) {
        return word.split('-').map((part, partIndex) => {
          const upperPart = part.toUpperCase();
          if (UPPERCASE_WORDS.includes(upperPart)) return upperPart;
          if (partIndex > 0 && particles.includes(part.toLowerCase())) return part.toLowerCase();
          return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        }).join('-');
      }
      
      // Keep particles lowercase unless first word
      if (index > 0 && particles.includes(word.toLowerCase())) {
        return word.toLowerCase();
      }
      
      // Capitalize first letter, lowercase rest
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

/**
 * Normalize a name field (full name, first name, last name)
 */
export const normalizeName = (name: string): string => {
  return toProperCase(name);
};

/**
 * Normalize company name - Title Case
 */
export const normalizeCompany = (company: string): string => {
  return toProperCase(company);
};

/**
 * Normalize designation/role - Title Case
 */
export const normalizeDesignation = (designation: string): string => {
  return toProperCase(designation);
};

// ==================== EMAIL ====================
export const isValidEmail = (email: string): boolean => {
  if (!email || !email.trim()) return true; // Empty is valid (optional field)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

export const normalizeEmail = (email: string): string => {
  return email?.trim().toLowerCase() || '';
};

// ==================== PHONE / MOBILE ====================
/**
 * Normalize phone number:
 * - Keeps only digits and leading +
 * - If 10 digits without country code, adds +91 (India)
 * - If starts with 91 and has 12 digits, adds +
 */
export const normalizePhone = (phone: string): string => {
  if (!phone) return '';
  
  // Remove all non-digit characters except leading +
  let cleaned = phone.trim();
  const hasPlus = cleaned.startsWith('+');
  cleaned = cleaned.replace(/\D/g, '');
  
  if (!cleaned) return '';
  
  // If exactly 10 digits, assume India (+91)
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  
  // If starts with 91 and is 12 digits, add +
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return `+${cleaned}`;
  }
  
  // If starts with 0, remove it and assume India
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return `+91${cleaned.slice(1)}`;
  }
  
  // If already has country code (11+ digits), ensure + prefix
  if (cleaned.length >= 11) {
    return hasPlus || cleaned.startsWith('91') ? `+${cleaned.replace(/^\+/, '')}` : `+${cleaned}`;
  }
  
  // Return as-is with + if it had one
  return hasPlus ? `+${cleaned}` : cleaned;
};

export const isValidPhone = (phone: string): boolean => {
  if (!phone || !phone.trim()) return true; // Empty is valid
  const digits = phone.replace(/\D/g, '');
  // Valid if 10 digits (local) or 11-15 digits (international)
  return digits.length >= 10 && digits.length <= 15;
};

// ==================== WEBSITE ====================
/**
 * Normalize website URL:
 * - Adds https:// if missing protocol
 * - Removes trailing slashes
 * - Handles common typos
 */
export const normalizeWebsite = (url: string): string => {
  if (!url || !url.trim()) return '';
  
  let cleaned = url.trim();
  
  // Remove common copy-paste artifacts
  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, ''); // Zero-width chars
  cleaned = cleaned.replace(/\s+/g, ''); // Remove all whitespace
  
  // If it's just a domain without protocol
  if (!cleaned.match(/^https?:\/\//i)) {
    // Don't add protocol to email addresses
    if (cleaned.includes('@')) return cleaned;
    cleaned = `https://${cleaned}`;
  }
  
  // Fix common typos
  cleaned = cleaned.replace(/^https?:\/+/i, (match) => {
    return match.toLowerCase().includes('https') ? 'https://' : 'http://';
  });
  
  // Remove trailing slash
  cleaned = cleaned.replace(/\/+$/, '');
  
  return cleaned;
};

export const isValidWebsite = (url: string): boolean => {
  if (!url || !url.trim()) return true; // Empty is valid
  try {
    const normalized = normalizeWebsite(url);
    new URL(normalized);
    return true;
  } catch {
    return false;
  }
};

// ==================== LINKEDIN ====================
type LinkedInType = 'personal' | 'company' | 'unknown';

interface LinkedInResult {
  type: LinkedInType;
  username: string;
  fullUrl: string;
}

/**
 * Parse and normalize LinkedIn input:
 * - Extracts username from full URLs
 * - Detects personal vs company profiles
 * - Returns clean URL for storage
 * 
 * Handles:
 * - nitesh-vohra
 * - linkedin.com/in/nitesh-vohra
 * - https://www.linkedin.com/in/nitesh-vohra/
 * - www.linkedin.com/company/synka
 */
export const parseLinkedIn = (input: string): LinkedInResult => {
  if (!input || !input.trim()) {
    return { type: 'unknown', username: '', fullUrl: '' };
  }
  
  let cleaned = input.trim();
  
  // Remove common artifacts
  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');
  cleaned = cleaned.replace(/\s+/g, '');
  
  // Remove trailing slashes
  cleaned = cleaned.replace(/\/+$/, '');
  
  // Check if it's a full URL
  const urlMatch = cleaned.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(in|company)\/([^\/\?#]+)/i);
  
  if (urlMatch) {
    const type: LinkedInType = urlMatch[1].toLowerCase() === 'company' ? 'company' : 'personal';
    const username = urlMatch[2];
    const prefix = type === 'company' ? 'company' : 'in';
    return {
      type,
      username,
      fullUrl: `https://www.linkedin.com/${prefix}/${username}`,
    };
  }
  
  // Check for just path like "in/username" or "company/name"
  const pathMatch = cleaned.match(/^(in|company)\/([^\/\?#]+)/i);
  if (pathMatch) {
    const type: LinkedInType = pathMatch[1].toLowerCase() === 'company' ? 'company' : 'personal';
    const username = pathMatch[2];
    const prefix = type === 'company' ? 'company' : 'in';
    return {
      type,
      username,
      fullUrl: `https://www.linkedin.com/${prefix}/${username}`,
    };
  }
  
  // Assume it's just a username (personal profile)
  // Remove any remaining URL parts
  const username = cleaned.replace(/^.*linkedin\.com\/?(in|company)?\/?/i, '').replace(/[\/\?#].*$/, '');
  
  if (!username) {
    return { type: 'unknown', username: '', fullUrl: '' };
  }
  
  return {
    type: 'personal',
    username,
    fullUrl: `https://www.linkedin.com/in/${username}`,
  };
};

/**
 * Normalize LinkedIn to username only (for clean DB storage)
 * PublicCard will construct the full URL
 */
export const normalizeLinkedIn = (input: string): string => {
  const result = parseLinkedIn(input);
  return result.username; // Return username only, not full URL
};

/**
 * Get LinkedIn type (personal vs company) for proper URL construction
 */
export const getLinkedInType = (input: string): LinkedInType => {
  return parseLinkedIn(input).type;
};

export const isValidLinkedIn = (input: string): boolean => {
  if (!input || !input.trim()) return true; // Empty is valid
  const result = parseLinkedIn(input);
  return result.username.length > 0;
};

// ==================== SOCIAL MEDIA NORMALIZATION ====================
/**
 * Normalize Instagram input to username only
 * Handles: @synka.in | synka.in | instagram.com/synka.in | https://www.instagram.com/synka.in
 * Returns: synka.in (username only)
 */
export const normalizeInstagram = (input: string): string => {
  const cleaned = cleanInput(input);
  if (!cleaned) return '';

  // Extract username from full URL if present
  const urlMatch = cleaned.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^\/\?#]+)/i);
  if (urlMatch) return urlMatch[1];

  // Return as username
  return cleaned;
};

/**
 * Normalize Twitter/X input to username only
 * Handles: @synka | twitter.com/synka | x.com/synka | https://x.com/synka
 * Returns: synka (username only)
 */
export const normalizeTwitter = (input: string): string => {
  const cleaned = cleanInput(input);
  if (!cleaned) return '';

  // Extract username from full URL if present
  const urlMatch = cleaned.match(/(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/([^\/\?#]+)/i);
  if (urlMatch) return urlMatch[1];

  // Return as username
  return cleaned;
};

/**
 * Normalize Facebook input to page/username only
 * Handles: synka | facebook.com/synka | fb.com/synka | https://www.facebook.com/synka
 * Returns: synka (page name only)
 */
export const normalizeFacebook = (input: string): string => {
  const cleaned = cleanInput(input);
  if (!cleaned) return '';

  // Extract page from full URL if present
  const urlMatch = cleaned.match(/(?:https?:\/\/)?(?:www\.)?(?:facebook\.com|fb\.com)\/([^\/\?#]+)/i);
  if (urlMatch) return urlMatch[1];

  // Return as page name
  return cleaned;
};

/**
 * Normalize YouTube input to handle/channel only
 * Handles: @handle | youtube.com/@handle | youtube.com/channel/ID
 * Returns: @handle or channel/ID (for URL construction)
 */
export const normalizeYouTube = (input: string): string => {
  const cleaned = cleanInput(input);
  if (!cleaned) return '';

  // Extract from full URL
  const handleMatch = cleaned.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/(@[^\/\?#]+)/i);
  if (handleMatch) return handleMatch[1];

  const channelMatch = cleaned.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/channel\/([^\/\?#]+)/i);
  if (channelMatch) return `channel/${channelMatch[1]}`;

  // If starts with @, keep it
  if (cleaned.startsWith('@') || input.trim().startsWith('@')) {
    return cleaned.startsWith('@') ? cleaned : `@${cleaned}`;
  }

  // Assume it's a handle without @
  return `@${cleaned}`;
};

/**
 * Normalize Calendly input to full URL
 * Handles: nitesh | calendly.com/nitesh | https://calendly.com/nitesh
 * Returns: https://calendly.com/nitesh (full URL for direct use)
 */
export const normalizeCalendly = (input: string): string => {
  const cleaned = cleanInput(input);
  if (!cleaned) return '';

  // If already a full URL, normalize it
  const urlMatch = cleaned.match(/(?:https?:\/\/)?(?:www\.)?calendly\.com\/([^#]+)/i);
  if (urlMatch) {
    return `https://calendly.com/${urlMatch[1]}`;
  }

  // Assume it's just a username/path
  return `https://calendly.com/${cleaned}`;
};

// ==================== VALIDATION HELPER ====================
export interface ValidationResult {
  isValid: boolean;
  field: string;
  message: string;
}

export const validateContactForm = (data: {
  email?: string;
  phone?: string;
  website?: string;
  linkedin?: string;
}): ValidationResult | null => {
  if (data.email && !isValidEmail(data.email)) {
    return { isValid: false, field: 'email', message: 'Invalid email address' };
  }
  
  if (data.phone && !isValidPhone(data.phone)) {
    return { isValid: false, field: 'phone', message: 'Invalid phone number' };
  }
  
  if (data.website && !isValidWebsite(data.website)) {
    return { isValid: false, field: 'website', message: 'Invalid website URL' };
  }
  
  if (data.linkedin && !isValidLinkedIn(data.linkedin)) {
    return { isValid: false, field: 'linkedin', message: 'Invalid LinkedIn profile' };
  }
  
  return null;
};

// ==================== NORMALIZE ALL ====================
export const normalizeContactData = (data: {
  email?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  linkedin?: string;
}): typeof data => {
  return {
    ...data,
    email: data.email ? normalizeEmail(data.email) : data.email,
    phone: data.phone ? normalizePhone(data.phone) : data.phone,
    whatsapp: data.whatsapp ? normalizePhone(data.whatsapp) : data.whatsapp,
    website: data.website ? normalizeWebsite(data.website) : data.website,
    linkedin: data.linkedin ? normalizeLinkedIn(data.linkedin) : data.linkedin,
  };
};

/**
 * Normalize all social media fields for clean DB storage
 */
export const normalizeSocialData = (data: {
  instagram?: string;
  twitter?: string;
  facebook?: string;
  youtube?: string;
  calendly?: string;
}): typeof data => {
  return {
    instagram: data.instagram ? normalizeInstagram(data.instagram) : '',
    twitter: data.twitter ? normalizeTwitter(data.twitter) : '',
    facebook: data.facebook ? normalizeFacebook(data.facebook) : '',
    youtube: data.youtube ? normalizeYouTube(data.youtube) : '',
    calendly: data.calendly ? normalizeCalendly(data.calendly) : '',
  };
};

/**
 * Normalize CRM contact fields (name, company, designation + contact info)
 * Applies proper case to text fields and standard normalization to contact fields
 */
export const normalizeCRMContact = (data: {
  name?: string;
  company?: string;
  designation?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  linkedin?: string;
}): typeof data => {
  return {
    ...data,
    name: data.name ? normalizeName(data.name) : data.name,
    company: data.company ? normalizeCompany(data.company) : data.company,
    designation: data.designation ? normalizeDesignation(data.designation) : data.designation,
    email: data.email ? normalizeEmail(data.email) : data.email,
    phone: data.phone ? normalizePhone(data.phone) : data.phone,
    whatsapp: data.whatsapp ? normalizePhone(data.whatsapp) : data.whatsapp,
    website: data.website ? normalizeWebsite(data.website) : data.website,
    linkedin: data.linkedin ? normalizeLinkedIn(data.linkedin) : data.linkedin,
  };
};
