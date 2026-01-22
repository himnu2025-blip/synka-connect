import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Contact interface
interface ContactData {
  name: string | null;
  company: string | null;
  designation: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  linkedin: string | null;
  instagram: string | null;
  youtube: string | null;
  twitter: string | null;
  website: string | null;
  about: string | null;
  source: "qr" | "ocr" | "ai" | "mixed";
}

// Default empty contact
const emptyContact: ContactData = {
  name: null,
  company: null,
  designation: null,
  email: null,
  phone: null,
  whatsapp: null,
  linkedin: null,
  instagram: null,
  youtube: null,
  twitter: null,
  website: null,
  about: null,
  source: "ai"
};

// Clean base64 and get proper data URL
function getImageDataUrl(base64Image: string): string {
  if (base64Image.startsWith('data:image')) {
    return base64Image;
  }
  // Assume JPEG if no prefix
  return `data:image/jpeg;base64,${base64Image}`;
}

// Smart URL completion - convert usernames to full URLs
function completeUrl(field: string, value: string | null): string | null {
  if (!value) return null;
  
  const trimmed = value.trim();
  if (!trimmed) return null;

  switch (field) {
    case 'linkedin':
      // If already a full URL, clean and return
      if (trimmed.includes('linkedin.com')) {
        // Extract username from URL if needed
        const match = trimmed.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i);
        if (match) return `https://www.linkedin.com/in/${match[1]}`;
        return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
      }
      // Just username - convert to full URL
      const linkedinUsername = trimmed.replace(/^@/, '').replace(/\//g, '');
      return `https://www.linkedin.com/in/${linkedinUsername}`;

    case 'instagram':
      if (trimmed.includes('instagram.com')) {
        const match = trimmed.match(/instagram\.com\/([a-zA-Z0-9_.]+)/i);
        if (match) return `https://www.instagram.com/${match[1]}`;
        return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
      }
      const instaUsername = trimmed.replace(/^@/, '').replace(/\//g, '');
      return `https://www.instagram.com/${instaUsername}`;

    case 'twitter':
      if (trimmed.includes('twitter.com') || trimmed.includes('x.com')) {
        const match = trimmed.match(/(?:twitter|x)\.com\/([a-zA-Z0-9_]+)/i);
        if (match) return `https://x.com/${match[1]}`;
        return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
      }
      const twitterUsername = trimmed.replace(/^@/, '').replace(/\//g, '');
      return `https://x.com/${twitterUsername}`;

    case 'youtube':
      if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be')) {
        return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
      }
      // Could be a channel name/handle
      const ytHandle = trimmed.replace(/^@/, '');
      return `https://www.youtube.com/@${ytHandle}`;

    case 'website':
      if (trimmed.match(/^https?:\/\//i)) {
        return trimmed;
      }
      return `https://${trimmed}`;

    default:
      return trimmed;
  }
}

// Parse vCard format
function parseVCard(vcard: string): Partial<ContactData> {
  const contact: Partial<ContactData> = {};
  
  try {
    const lines = vcard.split(/[\r\n]+/);
    
    for (const line of lines) {
      const upperLine = line.toUpperCase();
      
      if (upperLine.startsWith('FN:') || upperLine.startsWith('FN;')) {
        contact.name = line.substring(line.indexOf(':') + 1).trim();
      } else if (upperLine.startsWith('N:') || upperLine.startsWith('N;')) {
        if (!contact.name) {
          const parts = line.substring(line.indexOf(':') + 1).split(';');
          const lastName = parts[0]?.trim() || '';
          const firstName = parts[1]?.trim() || '';
          contact.name = `${firstName} ${lastName}`.trim();
        }
      } else if (upperLine.startsWith('ORG:') || upperLine.startsWith('ORG;')) {
        contact.company = line.substring(line.indexOf(':') + 1).split(';')[0].trim();
      } else if (upperLine.startsWith('TITLE:') || upperLine.startsWith('TITLE;')) {
        contact.designation = line.substring(line.indexOf(':') + 1).trim();
      } else if (upperLine.startsWith('EMAIL:') || upperLine.startsWith('EMAIL;')) {
        contact.email = line.substring(line.indexOf(':') + 1).trim();
      } else if (upperLine.startsWith('TEL:') || upperLine.startsWith('TEL;')) {
        const phone = line.substring(line.indexOf(':') + 1).trim();
        if (!contact.phone) contact.phone = phone;
        if (!contact.whatsapp) contact.whatsapp = phone;
      } else if (upperLine.startsWith('URL:') || upperLine.startsWith('URL;')) {
        const url = line.substring(line.indexOf(':') + 1).trim();
        if (url.includes('linkedin')) {
          contact.linkedin = completeUrl('linkedin', url);
        } else if (url.includes('instagram')) {
          contact.instagram = completeUrl('instagram', url);
        } else if (url.includes('youtube') || url.includes('youtu.be')) {
          contact.youtube = completeUrl('youtube', url);
        } else if (url.includes('twitter') || url.includes('x.com')) {
          contact.twitter = completeUrl('twitter', url);
        } else if (url.includes('wa.me') || url.includes('whatsapp')) {
          const waMatch = url.match(/wa\.me\/(\+?\d+)/);
          if (waMatch) contact.whatsapp = waMatch[1];
        } else {
          contact.website = completeUrl('website', url);
        }
      } else if (upperLine.startsWith('NOTE:') || upperLine.startsWith('NOTE;')) {
        contact.about = line.substring(line.indexOf(':') + 1).trim();
      }
    }
  } catch (e) {
    console.error('vCard parse error:', e);
  }
  
  return contact;
}

// Parse MECARD format
function parseMECARD(mecard: string): Partial<ContactData> {
  const contact: Partial<ContactData> = {};
  
  try {
    const fields = mecard.replace('MECARD:', '').split(';');
    
    for (const field of fields) {
      const [key, ...valueParts] = field.split(':');
      const value = valueParts.join(':').trim();
      
      if (!key || !value) continue;
      
      switch (key.toUpperCase()) {
        case 'N':
          contact.name = value.replace(/,/g, ' ').trim();
          break;
        case 'ORG':
          contact.company = value;
          break;
        case 'TEL':
          if (!contact.phone) contact.phone = value;
          if (!contact.whatsapp) contact.whatsapp = value;
          break;
        case 'EMAIL':
          contact.email = value;
          break;
        case 'URL':
          if (value.includes('linkedin')) {
            contact.linkedin = completeUrl('linkedin', value);
          } else if (value.includes('instagram')) {
            contact.instagram = completeUrl('instagram', value);
          } else {
            contact.website = completeUrl('website', value);
          }
          break;
        case 'NOTE':
          contact.about = value;
          break;
      }
    }
  } catch (e) {
    console.error('MECARD parse error:', e);
  }
  
  return contact;
}

// Parse QR content of any type
function parseQRContent(content: string): Partial<ContactData> {
  const contact: Partial<ContactData> = {};
  
  if (!content) return contact;
  
  const trimmed = content.trim();
  
  // vCard
  if (trimmed.toUpperCase().startsWith('BEGIN:VCARD')) {
    return parseVCard(trimmed);
  }
  
  // MECARD
  if (trimmed.toUpperCase().startsWith('MECARD:')) {
    return parseMECARD(trimmed);
  }
  
  // WhatsApp link
  const waMatch = trimmed.match(/wa\.me\/(\+?\d+)/i);
  if (waMatch) {
    contact.whatsapp = waMatch[1];
    contact.phone = waMatch[1];
    return contact;
  }
  
  // LinkedIn
  if (trimmed.includes('linkedin.com')) {
    contact.linkedin = completeUrl('linkedin', trimmed);
    return contact;
  }

  // Instagram
  if (trimmed.includes('instagram.com')) {
    contact.instagram = completeUrl('instagram', trimmed);
    return contact;
  }

  // Twitter/X
  if (trimmed.includes('twitter.com') || trimmed.includes('x.com')) {
    contact.twitter = completeUrl('twitter', trimmed);
    return contact;
  }

  // YouTube
  if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be')) {
    contact.youtube = completeUrl('youtube', trimmed);
    return contact;
  }
  
  // Email
  if (trimmed.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    contact.email = trimmed;
    return contact;
  }
  
  // Phone number
  if (trimmed.match(/^[\d\s+\-()]{7,}$/)) {
    const phone = trimmed.replace(/[\s\-()]/g, '');
    contact.phone = phone;
    contact.whatsapp = phone;
    return contact;
  }
  
  // Website URL
  if (trimmed.match(/^https?:\/\//i) || trimmed.match(/^www\./i)) {
    contact.website = completeUrl('website', trimmed);
    return contact;
  }
  
  return contact;
}

// Merge contacts - QR data takes priority
function mergeContacts(qrData: Partial<ContactData>, aiData: Partial<ContactData>): ContactData {
  const result: ContactData = { ...emptyContact };
  
  // AI data first, then QR overwrites
  const fields: (keyof ContactData)[] = ['name', 'company', 'designation', 'email', 'phone', 'whatsapp', 'linkedin', 'instagram', 'youtube', 'twitter', 'website', 'about'];
  
  for (const field of fields) {
    if (aiData[field]) result[field] = aiData[field] as any;
    if (qrData[field]) result[field] = qrData[field] as any;
  }
  
  // Ensure WhatsApp is set if phone exists
  if (result.phone && !result.whatsapp) {
    result.whatsapp = result.phone;
  }
  
  // Determine source
  const hasQR = Object.keys(qrData).length > 0;
  const hasAI = Object.keys(aiData).length > 0;
  
  if (hasQR && hasAI) {
    result.source = "mixed";
  } else if (hasQR) {
    result.source = "qr";
  } else {
    result.source = "ai";
  }
  
  return result;
}

// Main AI processing function
async function processWithAI(imageDataUrl: string): Promise<{ qrContent: string | null; contact: Partial<ContactData>; success: boolean }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    console.error("LOVABLE_API_KEY not configured");
    return { qrContent: null, contact: {}, success: false };
  }

  const systemPrompt = `You are a business card scanner. Analyze the image and extract ALL contact information.

IMPORTANT INSTRUCTIONS:
1. First check if there's a QR code in the image. If yes, try to read its content.
2. Then read ALL text visible on the card using OCR.
3. Extract contact details from both QR and visible text.

You MUST return a valid JSON object with this exact structure:
{
  "qr_content": "raw QR code content if found, or null",
  "contact": {
    "name": "full name of person",
    "company": "company or organization name",
    "designation": "job title or role",
    "email": "email address",
    "phone": "phone number with country code if visible",
    "whatsapp": "whatsapp number (often same as phone)",
    "linkedin": "linkedin username OR full URL",
    "instagram": "instagram username OR full URL",
    "youtube": "youtube channel/handle OR full URL",
    "twitter": "twitter/X username OR full URL",
    "website": "company or personal website",
    "about": "any bio or about text on the card"
  }
}

RULES:
- Return null for any field you cannot find
- For phone/whatsapp, include country code if visible (e.g., +91, +1)
- If only one phone number is visible, use it for both phone and whatsapp
- Clean up formatting: remove extra spaces, fix obvious typos
- For social media (LinkedIn, Instagram, Twitter, YouTube):
  - If you see a full URL, return it as-is
  - If you see just a username/handle (e.g., @johndoe or johndoe), return just the username WITHOUT the @ symbol
  - Examples: "linkedin.com/in/johndoe" → return "johndoe", "@insta_user" → return "insta_user"
- For website, include https:// if not present
- ALWAYS try to extract at least name and one contact method
- Look carefully at ALL text on the card, including small print
- Check for social media icons with usernames next to them`;

  try {
    console.log("Calling Lovable AI for card analysis...");
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: [
              {
                type: "image_url",
                image_url: { url: imageDataUrl }
              },
              {
                type: "text",
                text: "Please analyze this business card image. Extract all contact information including any QR code content and social media handles. Return the JSON response."
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      return { qrContent: null, contact: {}, success: false };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error("No content in AI response");
      return { qrContent: null, contact: {}, success: false };
    }
    
    console.log("AI response received:", content.substring(0, 500));
    
    // Clean and parse JSON
    let jsonStr = content.trim();
    
    // Remove markdown code blocks if present
    jsonStr = jsonStr.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
    
    // Find JSON object
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in response");
      return { qrContent: null, contact: {}, success: false };
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Apply smart URL completion for social fields
    const result = {
      qrContent: parsed.qr_content || null,
      contact: {
        name: parsed.contact?.name || null,
        company: parsed.contact?.company || null,
        designation: parsed.contact?.designation || null,
        email: parsed.contact?.email || null,
        phone: parsed.contact?.phone || null,
        whatsapp: parsed.contact?.whatsapp || parsed.contact?.phone || null,
        linkedin: completeUrl('linkedin', parsed.contact?.linkedin),
        instagram: completeUrl('instagram', parsed.contact?.instagram),
        youtube: completeUrl('youtube', parsed.contact?.youtube),
        twitter: completeUrl('twitter', parsed.contact?.twitter),
        website: completeUrl('website', parsed.contact?.website),
        about: parsed.contact?.about || null,
      },
      success: true
    };
    
    console.log("Parsed AI result:", result);
    return result;
    
  } catch (error) {
    console.error("AI processing error:", error);
    return { qrContent: null, contact: {}, success: false };
  }
}

// Main server
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    console.log('=== Business Card Scan Request ===');
    
    const { image } = await req.json();

    if (!image) {
      console.log('No image provided');
      return new Response(JSON.stringify({ 
        contact: { ...emptyContact },
        success: false,
        error: "Please provide an image",
        processing: { aiUsed: false, qrFound: false, totalTime: 0 }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log('Image received, size:', image.length);
    
    // Get proper data URL
    const imageDataUrl = getImageDataUrl(image);
    
    // Process with AI (handles both QR and OCR)
    const aiResult = await processWithAI(imageDataUrl);
    
    // Parse QR content if found
    let qrData: Partial<ContactData> = {};
    if (aiResult.qrContent) {
      console.log('QR content found:', aiResult.qrContent.substring(0, 100));
      qrData = parseQRContent(aiResult.qrContent);
    }
    
    // Merge QR data with AI OCR data (QR takes priority)
    const finalContact = mergeContacts(qrData, aiResult.contact);
    
    // Check if we got any useful data
    const hasData = Object.entries(finalContact).some(([key, value]) => 
      key !== 'source' && value !== null && value !== ''
    );
    
    const totalTime = Date.now() - startTime;
    
    console.log('=== Scan Complete ===');
    console.log('Success:', hasData);
    console.log('Source:', finalContact.source);
    console.log('Fields found:', Object.entries(finalContact).filter(([k, v]) => k !== 'source' && v).length);
    console.log('Total time:', totalTime, 'ms');

    return new Response(JSON.stringify({
      contact: finalContact,
      success: hasData,
      error: hasData ? null : "Could not extract contact information. Please fill in manually.",
      processing: {
        aiUsed: aiResult.success,
        qrFound: !!aiResult.qrContent,
        totalTime,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Server error:', error);
    
    return new Response(JSON.stringify({ 
      contact: { ...emptyContact },
      success: false,
      error: "Processing failed. Please try again or fill in manually.",
      processing: {
        aiUsed: false,
        qrFound: false,
        totalTime: Date.now() - startTime,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
