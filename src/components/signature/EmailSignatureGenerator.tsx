import { useState, useEffect, useMemo, useRef } from 'react';
import DOMPurify from 'dompurify';
import { toPng } from 'html-to-image';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Sparkles, LayoutGrid, Pencil, Copy, Check, Loader2, Image, Download, X, ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/hooks/useCards';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';

// Public site URL - always use production URL for links
const PUBLIC_SITE_URL = import.meta.env.VITE_PUBLIC_SITE_URL || 'https://synka.in';
interface SignatureData {
  name: string;
  designation: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  linkedin: string;
  photo_url: string;
  logo_url: string;
}

interface SignatureSettings {
  showPhoto: boolean;
  showLogo: boolean;
  spacing: 'compact' | 'normal' | 'relaxed';
  alignment: 'left' | 'center' | 'right';
}

interface EmailSignatureGeneratorProps {
  activeCard: Card | null;
  onClose?: () => void;
}

interface SignatureSettings {
  showPhoto: boolean;
  showLogo: boolean;
  spacing: 'compact' | 'normal' | 'relaxed';
  alignment: 'left' | 'center' | 'right';
}

interface EmailSignatureGeneratorProps {
  activeCard: Card | null;
  onClose?: () => void;
}

// Generate a single signature template with specific options
const generateSingleTemplate = (
  data: SignatureData, 
  settings: SignatureSettings, 
  templateStyle: 'executive' | 'modern' | 'minimal' | 'corporate' | 'classic',
  includePhoto: boolean,
  includeLogo: boolean
): { name: string; html: string } => {
  const paddingMap = { compact: '8px', normal: '12px', relaxed: '16px' };
  const padding = paddingMap[settings.spacing];
  const textAlign = settings.alignment;
  
  const photoCell = includePhoto && data.photo_url
    ? `<td style="padding-right: 15px; vertical-align: top;">
        <img src="${data.photo_url}" alt="${data.name}" width="80" height="80" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; display: block;" />
       </td>` 
    : '';

  const logoHtml = includeLogo && data.logo_url
    ? `<img src="${data.logo_url}" alt="${data.company}" height="28" style="height: 28px; max-width: 120px; margin-top: ${padding}; display: block;${textAlign === 'center' ? ' margin-left: auto; margin-right: auto;' : ''}" />` 
    : '';

  const websiteLink = data.website 
    ? `<tr><td style="padding-top: 4px; text-align: ${textAlign};"><a href="${data.website.startsWith('http') ? data.website : 'https://' + data.website}" style="color: #4F46E5; text-decoration: none; font-size: 12px;">${data.website.replace(/^https?:\/\//, '')}</a></td></tr>` 
    : '';

  const linkedinLink = data.linkedin 
    ? `<tr><td style="padding-top: 4px; text-align: ${textAlign};"><a href="${data.linkedin.startsWith('http') ? data.linkedin : 'https://linkedin.com/in/' + data.linkedin}" style="color: #0077B5; text-decoration: none; font-size: 12px;">LinkedIn</a></td></tr>` 
    : '';

  switch (templateStyle) {
    case 'executive':
      return {
        name: includePhoto && includeLogo ? 'Executive Pro' : includePhoto ? 'Executive' : includeLogo ? 'Executive Brand' : 'Executive Minimal',
        html: `<table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #333333;">
  <tr>
    ${photoCell}
    <td style="border-left: 3px solid #4F46E5; padding-left: 15px; vertical-align: top;">
      <table cellpadding="0" cellspacing="0" border="0">
        <tr><td style="font-size: 18px; font-weight: bold; color: #1a1a1a; padding-bottom: 4px; text-align: ${textAlign};">${data.name}</td></tr>
        <tr><td style="font-size: 13px; color: #666666; padding-bottom: ${padding}; text-align: ${textAlign};">${data.designation}${data.company ? ` | ${data.company}` : ''}</td></tr>
        <tr><td style="font-size: 12px; color: #333333; text-align: ${textAlign};">${data.email ? `<a href="mailto:${data.email}" style="color: #4F46E5; text-decoration: none;">${data.email}</a>` : ''}</td></tr>
        <tr><td style="font-size: 12px; color: #333333; padding-top: 2px; text-align: ${textAlign};">${data.phone || ''}</td></tr>
        ${websiteLink}
        ${linkedinLink}
        ${logoHtml ? `<tr><td style="padding-top: ${padding};">${logoHtml}</td></tr>` : ''}
      </table>
    </td>
  </tr>
</table>`
      };
    
    case 'modern':
      return {
        name: includePhoto && includeLogo ? 'Modern Complete' : includePhoto ? 'Modern' : includeLogo ? 'Modern Brand' : 'Modern Clean',
        html: `<table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, Helvetica, sans-serif;">
  <tr>
    <td style="padding: ${padding}; background-color: #f8f9fa; border-radius: 8px;">
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          ${includePhoto && data.photo_url ? `<td style="vertical-align: top; padding-right: 15px;">
            <img src="${data.photo_url}" alt="${data.name}" width="70" height="70" style="width: 70px; height: 70px; border-radius: 12px; object-fit: cover; display: block;" />
          </td>` : ''}
          <td style="vertical-align: top;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr><td style="font-size: 16px; font-weight: bold; color: #1a1a1a;">${data.name}</td></tr>
              <tr><td style="font-size: 12px; color: #6366F1; text-transform: uppercase; letter-spacing: 0.5px; padding-top: 2px;">${data.designation}</td></tr>
              <tr><td style="font-size: 12px; color: #666666; padding-top: 2px;">${data.company}</td></tr>
              <tr><td style="padding-top: ${padding}; font-size: 12px;">
                ${data.email ? `<a href="mailto:${data.email}" style="color: #4F46E5; text-decoration: none;">${data.email}</a>` : ''}
                ${data.phone ? `<span style="color: #999;"> | </span><span style="color: #333;">${data.phone}</span>` : ''}
              </td></tr>
              ${includeLogo && data.logo_url ? `<tr><td style="padding-top: ${padding};">${logoHtml}</td></tr>` : ''}
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`
      };
    
    case 'minimal':
      return {
        name: 'Minimal',
        html: `<table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #333333; border-top: 2px solid #4F46E5; padding-top: ${padding};">
  <tr>
    <td style="padding-top: 10px;">
      <table cellpadding="0" cellspacing="0" border="0">
        <tr><td style="font-size: 15px; font-weight: 600; color: #1a1a1a; text-align: ${textAlign};">${data.name}</td></tr>
        <tr><td style="font-size: 12px; color: #666666; padding-top: 2px; text-align: ${textAlign};">${data.designation}${data.company ? ` &middot; ${data.company}` : ''}</td></tr>
        <tr><td style="padding-top: ${padding}; font-size: 12px; text-align: ${textAlign};">
          ${data.email ? `<a href="mailto:${data.email}" style="color: #4F46E5; text-decoration: none;">${data.email}</a>` : ''}
          ${data.phone ? ` &middot; ${data.phone}` : ''}
        </td></tr>
        ${data.website ? `<tr><td style="font-size: 12px; padding-top: 2px; text-align: ${textAlign};"><a href="${data.website.startsWith('http') ? data.website : 'https://' + data.website}" style="color: #4F46E5; text-decoration: none;">${data.website.replace(/^https?:\/\//, '')}</a></td></tr>` : ''}
      </table>
    </td>
  </tr>
</table>`
      };

    case 'corporate':
      return {
        name: includeLogo ? 'Corporate' : 'Professional',
        html: `<table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #333333;">
  <tr>
    <td style="vertical-align: top;">
      ${includeLogo && data.logo_url ? `<img src="${data.logo_url}" alt="${data.company}" height="40" style="height: 40px; max-width: 150px; display: block; margin-bottom: ${padding};" />` : ''}
      <table cellpadding="0" cellspacing="0" border="0">
        <tr><td style="font-size: 14px; font-weight: bold; color: #1a1a1a; text-align: ${textAlign};">${data.name}</td></tr>
        <tr><td style="font-size: 12px; color: #4F46E5; padding-top: 2px; text-align: ${textAlign};">${data.designation}</td></tr>
        <tr><td style="font-size: 12px; color: #666666; padding-top: 2px; text-align: ${textAlign};">${data.company}</td></tr>
        <tr><td style="border-top: 1px solid #e5e7eb; margin-top: 10px; padding-top: ${padding}; font-size: 12px; text-align: ${textAlign};">
          ${data.email ? `<span style="color: #333;">E: </span><a href="mailto:${data.email}" style="color: #4F46E5; text-decoration: none;">${data.email}</a>` : ''}
          ${data.phone ? `<br/><span style="color: #333;">P: </span>${data.phone}` : ''}
        </td></tr>
      </table>
    </td>
  </tr>
</table>`
      };
    
    case 'classic':
    default:
      return {
        name: 'Classic',
        html: `<table cellpadding="0" cellspacing="0" border="0" style="font-family: Georgia, serif; font-size: 13px; color: #333333;">
  <tr>
    <td>
      <table cellpadding="0" cellspacing="0" border="0">
        <tr><td style="font-size: 16px; font-weight: 400; color: #1a1a1a; letter-spacing: 0.5px; text-align: ${textAlign};">${data.name}</td></tr>
        <tr><td style="font-size: 12px; color: #888888; font-style: italic; padding-top: 4px; text-align: ${textAlign};">${data.designation}</td></tr>
        <tr><td style="font-size: 12px; color: #666666; padding-top: 2px; text-align: ${textAlign};">${data.company}</td></tr>
        <tr><td style="padding-top: ${padding}; border-top: 1px solid #e5e7eb; margin-top: ${padding};">
          <table cellpadding="0" cellspacing="0" border="0" style="margin-top: ${padding};">
            <tr><td style="font-size: 12px; text-align: ${textAlign};">${data.email ? `<a href="mailto:${data.email}" style="color: #666666; text-decoration: none;">${data.email}</a>` : ''}</td></tr>
            <tr><td style="font-size: 12px; text-align: ${textAlign};">${data.phone || ''}</td></tr>
          </table>
        </td></tr>
      </table>
    </td>
  </tr>
</table>`
      };
  }
};

// Generate premium templates based on photo/logo availability (always uses actual availability, not edit settings)
// Rules: 1 without photo/logo, 1 with logo only (if available), 1 with both (if both available)
const generatePremiumTemplates = (data: SignatureData): { name: string; html: string }[] => {
  const hasPhoto = !!data.photo_url;
  const hasLogo = !!data.logo_url;
  const defaultSettings: SignatureSettings = { showPhoto: true, showLogo: true, spacing: 'normal', alignment: 'left' };
  
  const templates: { name: string; html: string }[] = [];

  if (hasPhoto && hasLogo) {
    // 1 without both, 1 with logo only, 1 with both
    templates.push(generateSingleTemplate(data, defaultSettings, 'minimal', false, false));
    templates.push(generateSingleTemplate(data, defaultSettings, 'corporate', false, true));
    templates.push(generateSingleTemplate(data, defaultSettings, 'executive', true, true));
  } else if (hasPhoto) {
    // 2 with photo, 1 without
    templates.push(generateSingleTemplate(data, defaultSettings, 'minimal', false, false));
    templates.push(generateSingleTemplate(data, defaultSettings, 'executive', true, false));
    templates.push(generateSingleTemplate(data, defaultSettings, 'modern', true, false));
  } else if (hasLogo) {
    // 2 with logo, 1 without
    templates.push(generateSingleTemplate(data, defaultSettings, 'minimal', false, false));
    templates.push(generateSingleTemplate(data, defaultSettings, 'corporate', false, true));
    templates.push(generateSingleTemplate(data, defaultSettings, 'modern', false, true));
  } else {
    // Neither - all 3 without
    templates.push(generateSingleTemplate(data, defaultSettings, 'minimal', false, false));
    templates.push(generateSingleTemplate(data, defaultSettings, 'corporate', false, false));
    templates.push(generateSingleTemplate(data, defaultSettings, 'classic', false, false));
  }

  return templates;
};

// Extract plain text from HTML signature
const extractPlainText = (html: string): string => {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || '';
};

export default function EmailSignatureGenerator({ activeCard }: EmailSignatureGeneratorProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [activeTab, setActiveTab] = useState<'ai' | 'select' | 'edit' | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSignatures, setAiSignatures] = useState<{ name: string; html: string }[]>([]);
  const [selectedSignature, setSelectedSignature] = useState<{ name: string; html: string } | null>(null);
  const [copiedType, setCopiedType] = useState<'signature' | 'image' | null>(null);
  const [isCopyingImage, setIsCopyingImage] = useState(false);
  const [showSignaturePopup, setShowSignaturePopup] = useState(false);
  const [showImagePopup, setShowImagePopup] = useState(false);
  const [lastImageDataUrl, setLastImageDataUrl] = useState<string | null>(null);
  const signaturePreviewRef = useRef<HTMLDivElement>(null);
  const [signatureLoaded, setSignatureLoaded] = useState(false);
  
  // For tab-switching within AI/Select tabs
  const [aiActiveIndex, setAiActiveIndex] = useState(0);
  const [selectActiveIndex, setSelectActiveIndex] = useState(0);
  
  const [settings, setSettings] = useState<SignatureSettings>({
    showPhoto: true,
    showLogo: true,
    spacing: 'normal',
    alignment: 'left',
  });

  const signatureData = useMemo((): SignatureData => ({
    name: activeCard?.full_name || 'Your Name',
    designation: activeCard?.designation || '',
    company: activeCard?.company || '',
    email: activeCard?.email || '',
    phone: activeCard?.phone || '',
    website: activeCard?.website || '',
    linkedin: activeCard?.linkedin || '',
    photo_url: activeCard?.photo_url || '',
    logo_url: activeCard?.logo_url || '',
  }), [activeCard]);

  const premiumTemplates = useMemo(() => 
    generatePremiumTemplates(signatureData),
    [signatureData]
  );

  // Load saved signature from Supabase on mount
  useEffect(() => {
    const loadSavedSignature = async () => {
      if (!user || signatureLoaded) return;
      
      const { data, error } = await supabase
        .from('email_signatures')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_selected', true)
        .maybeSingle();
      
      if (!error && data) {
        setSelectedSignature({ name: data.name, html: data.html });
      } else if (premiumTemplates.length > 0) {
        setSelectedSignature(premiumTemplates[0]);
      }
      setSignatureLoaded(true);
    };
    
    loadSavedSignature();
  }, [user, premiumTemplates, signatureLoaded]);

  // Set default signature if none loaded
  useEffect(() => {
    if (signatureLoaded && !selectedSignature && premiumTemplates.length > 0) {
      setSelectedSignature(premiumTemplates[0]);
    }
  }, [signatureLoaded, selectedSignature, premiumTemplates]);

  // Apply edit settings to any selected signature HTML
  const applySettingsToHtml = (html: string, data: SignatureData, settings: SignatureSettings): string => {
    let modifiedHtml = html;
    
    // Hide/show photo - match any img with photo URL or circular/avatar styling
    if (!settings.showPhoto && data.photo_url) {
      // Remove the actual photo URL
      const escapedUrl = data.photo_url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      modifiedHtml = modifiedHtml.replace(
        new RegExp(`<img[^>]*src=["']${escapedUrl}["'][^>]*>`, 'gi'),
        ''
      );
      // Remove circular images (likely profile photos)
      modifiedHtml = modifiedHtml.replace(
        /<img[^>]*border-radius[^>]*50%[^>]*>/gi,
        ''
      );
      // Remove table cells that contained photos (now empty)
      modifiedHtml = modifiedHtml.replace(
        /<td[^>]*>\s*<\/td>/gi,
        ''
      );
    }
    
    // Hide/show logo - match the logo URL directly
    if (!settings.showLogo && data.logo_url) {
      const escapedLogoUrl = data.logo_url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      modifiedHtml = modifiedHtml.replace(
        new RegExp(`<img[^>]*src=["']${escapedLogoUrl}["'][^>]*>`, 'gi'),
        ''
      );
      // Also remove by common logo patterns (height 20-50px, company name in alt)
      modifiedHtml = modifiedHtml.replace(
        /<img[^>]*alt=["'][^"']*logo[^"']*["'][^>]*>/gi,
        ''
      );
      // Remove empty table rows that might be left
      modifiedHtml = modifiedHtml.replace(
        /<tr>\s*<td[^>]*>\s*<\/td>\s*<\/tr>/gi,
        ''
      );
    }
    
    // Apply spacing
    const paddingMap = { compact: '8px', normal: '12px', relaxed: '16px' };
    const newPadding = paddingMap[settings.spacing];
    modifiedHtml = modifiedHtml.replace(
      /padding(-top|-bottom)?:\s*\d+px/gi,
      (match, direction) => `padding${direction || ''}: ${newPadding}`
    );
    
    // Apply alignment - always replace all text-align values
    modifiedHtml = modifiedHtml.replace(
      /text-align:\s*(left|center|right)/gi,
      `text-align: ${settings.alignment}`
    );
    
    return modifiedHtml;
  };

  // Create a live preview of the selected signature with current edit settings applied
  const editPreviewSignature = useMemo(() => {
    if (!selectedSignature) return null;
    
    const modifiedHtml = applySettingsToHtml(selectedSignature.html, signatureData, settings);
    
    return {
      name: selectedSignature.name,
      html: modifiedHtml
    };
  }, [selectedSignature, signatureData, settings]);

  const handleTabClick = (tab: 'ai' | 'select' | 'edit') => {
    if (activeTab === tab) {
      setActiveTab(null);
    } else {
      setActiveTab(tab);
      if (tab === 'ai') setAiActiveIndex(0);
      if (tab === 'select') setSelectActiveIndex(0);
    }
  };

  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) {
      toast({ title: 'Please describe your signature style', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);

    try {
      const { data: result, error } = await supabase.functions.invoke('generate-signatures', {
        body: {
          name: signatureData.name,
          company: signatureData.company,
          designation: signatureData.designation,
          email: signatureData.email,
          phone: signatureData.phone,
          website: signatureData.website,
          linkedin: signatureData.linkedin,
          photo_url: signatureData.photo_url,
          logo_url: signatureData.logo_url,
          prompt: aiPrompt,
        }
      });

      if (error) throw error;

      if (result?.signatures && Array.isArray(result.signatures)) {
        setAiSignatures(result.signatures.slice(0, 3));
        setAiActiveIndex(0);
        toast({ title: 'Signatures generated!', description: 'Select your preferred style.' });
      } else {
        throw new Error('No signatures returned');
      }
    } catch (error) {
      console.error('Error generating signatures:', error);
      toast({ 
        title: 'AI generation unavailable', 
        description: 'Try the Select tab for premium templates.',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectSignature = async (sig: { name: string; html: string }) => {
    setSelectedSignature(sig);
    setActiveTab(null);
    setAiSignatures([]);
    setAiPrompt('');
    
    // Save to Supabase
    if (user) {
      if (user) {
  await supabase
    .from('email_signatures')
    .upsert(
      {
        user_id: user.id,
        name: sig.name,
        html: sig.html,
        is_selected: true,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      }
    );
}
    }
    
    toast({ title: `"${sig.name}" selected` });
  };

  const copyRenderedSignature = async () => {
    if (!selectedSignature) return;
    
    try {
      // Get the raw HTML with all inline styles preserved
      const htmlContent = selectedSignature.html;
      
      // Create a blob with the HTML content
      const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
      const textBlob = new Blob([extractPlainText(htmlContent)], { type: 'text/plain' });
      
      // Use Clipboard API with both HTML and plain text fallback
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': textBlob
        })
      ]);
      
      setCopiedType('signature');
      setShowSignaturePopup(true);
      
      toast({ 
        title: 'Signature copied!', 
        description: 'Paste into Gmail or Outlook.',
        duration: 3000
      });
    } catch (err) {
      // Fallback for browsers that don't support ClipboardItem
      console.error('Clipboard API failed, trying fallback:', err);
      try {
        const selection = window.getSelection();
        const range = document.createRange();
        if (signaturePreviewRef.current) {
          range.selectNodeContents(signaturePreviewRef.current);
          selection?.removeAllRanges();
          selection?.addRange(range);
          document.execCommand('copy');
          selection?.removeAllRanges();
        }
        
        setCopiedType('signature');
        setShowSignaturePopup(true);
        
        toast({ 
          title: 'Signature copied!', 
          description: 'Paste into Gmail or Outlook.',
          duration: 3000
        });
      } catch (fallbackErr) {
        console.error('Failed to copy signature:', fallbackErr);
        toast({ 
          title: 'Copy failed', 
          description: 'Please try again.',
          variant: 'destructive'
        });
      }
    }
    
    setTimeout(() => setCopiedType(null), 2500);
  };

  const copyImageToClipboard = async () => {
    if (!signaturePreviewRef.current) return;
    
    setIsCopyingImage(true);
    
    try {
      // Generate image from the signature preview at 2x resolution for retina
      const dataUrl = await toPng(signaturePreviewRef.current, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        style: {
          maxWidth: '600px'
        }
      });
      
      // Store for download option
      setLastImageDataUrl(dataUrl);
      
      // Detect iOS - clipboard image copy not supported
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      
      // On iOS or native, go directly to share/download flow
      if (isIOS || Capacitor.isNativePlatform()) {
        if (Capacitor.isNativePlatform()) {
          // Native: use Share API
          const base64Data = dataUrl.split(',')[1];
          const fileName = `signature-${profile?.slug || 'email'}-${Date.now()}.png`;
          
          const savedFile = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache,
          });
          
          await Share.share({
            title: 'Email Signature',
            text: 'My Synka email signature',
            files: [savedFile.uri],
            dialogTitle: 'Save or share signature',
          });
          
          toast({ title: 'Signature ready to share!' });
        } else {
          // iOS Safari: trigger download directly
          const link = document.createElement('a');
          link.download = `signature-${profile?.slug || 'email'}.png`;
          link.href = dataUrl;
          link.click();
          
          toast({ 
            title: 'Image downloaded!', 
            description: 'Check your Downloads folder.',
            duration: 3000
          });
        }
        
        setCopiedType('image');
        setShowImagePopup(true);
        return;
      }
      
      // Desktop browsers: use clipboard API
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob
        })
      ]);
      
      setCopiedType('image');
      setShowImagePopup(true);
      
      toast({ 
        title: 'Image copied to clipboard!', 
        description: 'Paste anywhere to use your signature as an image.',
        duration: 3000
      });
    } catch (err) {
      console.error('Failed to copy image:', err);
      // Fallback: try download instead
      if (lastImageDataUrl) {
        const link = document.createElement('a');
        link.download = `signature-${profile?.slug || 'email'}.png`;
        link.href = lastImageDataUrl;
        link.click();
        
        toast({ 
          title: 'Image downloaded!', 
          description: 'Clipboard not supported, image was downloaded instead.',
          duration: 3000
        });
        setCopiedType('image');
        setShowImagePopup(true);
      } else {
        toast({ 
          title: 'Image copy failed', 
          description: 'Your browser may not support image clipboard.',
          variant: 'destructive'
        });
      }
    } finally {
      setIsCopyingImage(false);
      setTimeout(() => setCopiedType(null), 2500);
    }
  };

  // Download image - with native share support for Capacitor
  const downloadImage = async () => {
    if (!lastImageDataUrl) return;
    
    // On native platform, use Share API
    if (Capacitor.isNativePlatform()) {
      try {
        // Convert data URL to base64
        const base64Data = lastImageDataUrl.split(',')[1];
        const fileName = `signature-${profile?.slug || 'email'}-${Date.now()}.png`;
        
        // Save to filesystem first
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache,
        });
        
        // Share the file
        await Share.share({
          title: 'Email Signature',
          text: 'My Synka email signature',
          files: [savedFile.uri],
          dialogTitle: 'Save or share signature',
        });
        
        toast({ title: 'Signature ready to share!' });
      } catch (error: any) {
        console.error('Share error:', error);
        toast({ title: 'Could not share signature', variant: 'destructive' });
      }
      return;
    }
    
    // Web: standard download
    const link = document.createElement('a');
    link.download = `signature-${profile?.slug || 'email'}.png`;
    link.href = lastImageDataUrl;
    link.click();
    
    toast({ title: 'Image downloaded!' });
  };

  const userSlug = profile?.slug || user?.id || 'user';
  // Always use production URL for public card links
  const publicCardUrl = `${PUBLIC_SITE_URL}/u/${userSlug}`;

  const showSelectedSignature = activeTab === null;

  return (
    <div className="space-y-4 relative overflow-visible">
      {/* Tab buttons */}
      <div className="grid w-full grid-cols-3 gap-1 p-1 rounded-lg bg-muted">
        <button
          onClick={() => handleTabClick('ai')}
          className={cn(
            "flex items-center justify-center gap-2 text-xs sm:text-sm py-2 px-3 rounded-md transition-all",
            activeTab === 'ai' 
              ? "bg-background text-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
          )}
        >
          <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
          AI
        </button>
        <button
          onClick={() => handleTabClick('select')}
          className={cn(
            "flex items-center justify-center gap-2 text-xs sm:text-sm py-2 px-3 rounded-md transition-all",
            activeTab === 'select' 
              ? "bg-background text-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
          )}
        >
          <LayoutGrid className="h-3 w-3 sm:h-4 sm:w-4" />
          Select
        </button>
        <button
          onClick={() => handleTabClick('edit')}
          className={cn(
            "flex items-center justify-center gap-2 text-xs sm:text-sm py-2 px-3 rounded-md transition-all",
            activeTab === 'edit' 
              ? "bg-background text-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
          )}
        >
          <Pencil className="h-3 w-3 sm:h-4 sm:w-4" />
          Edit
        </button>
      </div>

      {/* AI Tab Content */}
      {activeTab === 'ai' && (
        <div className="space-y-4 mt-4">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setActiveTab(null)} 
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
              title="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium">AI Signature Generator</span>
          </div>
          
          {aiSignatures.length === 0 ? (
            <>
              <div className="space-y-2">
                <Label className="text-sm">Describe how you want your email signature to look...</Label>
                <Textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g., minimal, bold & premium, with photo, startup style, formal corporate..."
                  rows={2}
                  className="resize-none text-sm"
                />
              </div>

              <Button 
                onClick={handleGenerateAI} 
                className="w-full" 
                size="sm"
                disabled={isGenerating || !aiPrompt.trim()}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate 3 Signatures
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              {/* Mini tabs for switching between AI signatures */}
              <div className="flex gap-1 p-1 rounded-md bg-muted/50">
                {aiSignatures.map((sig, i) => (
                  <button
                    key={i}
                    onClick={() => setAiActiveIndex(i)}
                    className={cn(
                      "flex-1 px-3 py-1.5 text-xs font-medium rounded transition-all",
                      aiActiveIndex === i
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {sig.name}
                  </button>
                ))}
              </div>

              {/* Single preview for active AI signature */}
              <div className="p-4 rounded-lg border border-border bg-white overflow-auto">
                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(aiSignatures[aiActiveIndex]?.html || '') }} />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={() => handleSelectSignature(aiSignatures[aiActiveIndex])}
                  className="flex-1"
                  size="sm"
                >
                  Select This Signature
                </Button>
                <Button 
                  onClick={() => { setAiSignatures([]); setAiPrompt(''); }}
                  variant="outline"
                  size="sm"
                >
                  Regenerate
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Select Tab Content */}
      {activeTab === 'select' && (
        <div className="space-y-4 mt-4">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setActiveTab(null)} 
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
              title="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium">Select Template</span>
          </div>

          {/* Mini tabs for switching between templates */}
          <div className="flex gap-1 p-1 rounded-md bg-muted/50">
            {premiumTemplates.map((sig, i) => (
              <button
                key={i}
                onClick={() => setSelectActiveIndex(i)}
                className={cn(
                  "flex-1 px-3 py-1.5 text-xs font-medium rounded transition-all",
                  selectActiveIndex === i
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {sig.name}
              </button>
            ))}
          </div>

          {/* Single preview for active template */}
          <div className="p-4 rounded-lg border border-border bg-white overflow-auto">
            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(premiumTemplates[selectActiveIndex]?.html || '') }} />
          </div>

          <Button 
            onClick={() => handleSelectSignature(premiumTemplates[selectActiveIndex])}
            className="w-full"
            size="sm"
          >
            Select This Signature
          </Button>
        </div>
      )}

      {/* Edit Tab Content */}
      {activeTab === 'edit' && (
        <div className="space-y-4 mt-4">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setActiveTab(null)} 
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
              title="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium">Edit Settings</span>
          </div>

          <div className="space-y-4 p-3 rounded-lg border border-border bg-muted/30">
            {signatureData.photo_url && (
              <div className="flex items-center justify-between">
                <Label className="text-sm">Show Photo</Label>
                <Switch
                  checked={settings.showPhoto}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, showPhoto: checked }))}
                />
              </div>
            )}
            
            {signatureData.logo_url && (
              <div className="flex items-center justify-between">
                <Label className="text-sm">Show Logo</Label>
                <Switch
                  checked={settings.showLogo}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, showLogo: checked }))}
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label className="text-sm">Spacing</Label>
              <Select 
                value={settings.spacing} 
                onValueChange={(v) => setSettings(s => ({ ...s, spacing: v as any }))}
              >
                <SelectTrigger className="w-28 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  <SelectItem value="compact">Compact</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="relaxed">Relaxed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-sm">Alignment</Label>
              <Select 
                value={settings.alignment} 
                onValueChange={(v) => setSettings(s => ({ ...s, alignment: v as any }))}
              >
                <SelectTrigger className="w-28 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview of selected signature with settings applied */}
          {editPreviewSignature && (
            <div className="p-4 rounded-lg border border-border bg-white overflow-auto">
              <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(editPreviewSignature.html) }} />
            </div>
          )}

          <Button 
            onClick={() => {
              if (editPreviewSignature) {
                handleSelectSignature(editPreviewSignature);
              }
            }}
            className="w-full"
            size="sm"
            disabled={!editPreviewSignature}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </div>
      )}

      {/* Selected Signature Preview */}
      {showSelectedSignature && selectedSignature && (
        <div className="space-y-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Selected: {selectedSignature.name}</span>
          </div>
          
          <div className="rounded-lg border border-border bg-white overflow-auto">
            <div 
              ref={signaturePreviewRef}
              className="p-4"
              style={{ padding: '14px 18px' }}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedSignature.html) }} 
            />
          </div>

          {/* Copy & Download Actions */}
          <div className="flex gap-2">
            <Button 
              onClick={copyRenderedSignature}
              className="flex-1"
              size="sm"
              variant={copiedType === 'signature' ? "secondary" : "default"}
            >
              {copiedType === 'signature' ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </>
              )}
            </Button>

            <Button 
              onClick={copyImageToClipboard}
              className="flex-1"
              size="sm"
              variant={copiedType === 'image' ? "secondary" : "outline"}
              disabled={isCopyingImage}
            >
              {isCopyingImage ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ...
                </>
              ) : copiedType === 'image' ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Image className="h-4 w-4 mr-2" />
                  Image
                </>
              )}
            </Button>

            <Button 
              onClick={async () => {
                if (!signaturePreviewRef.current) return;
                setIsCopyingImage(true);
                try {
                  const dataUrl = await toPng(signaturePreviewRef.current, {
                    pixelRatio: 2,
                    backgroundColor: '#ffffff',
                    style: { maxWidth: '600px' }
                  });
                  
                  // On native platform, use Share API
                  if (Capacitor.isNativePlatform()) {
                    const base64Data = dataUrl.split(',')[1];
                    const fileName = `signature-${profile?.slug || 'email'}-${Date.now()}.png`;
                    
                    const savedFile = await Filesystem.writeFile({
                      path: fileName,
                      data: base64Data,
                      directory: Directory.Cache,
                    });
                    
                    await Share.share({
                      title: 'Email Signature',
                      text: 'My Synka email signature',
                      files: [savedFile.uri],
                      dialogTitle: 'Save or share signature',
                    });
                    
                    toast({ title: 'Signature ready to share!' });
                  } else {
                    // Web: standard download
                    const link = document.createElement('a');
                    link.download = `signature-${profile?.slug || 'email'}.png`;
                    link.href = dataUrl;
                    link.click();
                    
                    toast({ title: 'Image downloaded!' });
                  }
                } catch (err) {
                  console.error('Failed to generate/download image:', err);
                  toast({ title: 'Download failed', variant: 'destructive' });
                } finally {
                  setIsCopyingImage(false);
                }
              }}
              className="flex-1"
              size="sm"
              variant="outline"
              disabled={isCopyingImage}
            >
              <Download className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </div>
      )}

      {/* Signature Instructions Popup */}
      <Dialog open={showSignaturePopup} onOpenChange={setShowSignaturePopup}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Make this signature yours</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">1</span>
                <p className="text-sm text-muted-foreground">Open email settings on desktop <span className="text-xs">(HTML signatures do not work on mobile apps)</span></p>
              </div>
              
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">2</span>
                <div className="text-sm text-muted-foreground">
                  <p><strong>Gmail:</strong> Settings &gt; See all settings &gt; Signature</p>
                  <p><strong>Apple Mail:</strong> Settings &gt; Signatures</p>
                  <p><strong>Outlook:</strong> Settings &gt; Mail &gt; Signatures</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">3</span>
                <p className="text-sm text-muted-foreground">Paste the copied signature</p>
              </div>
              
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">4</span>
                <p className="text-sm text-muted-foreground">Apply and save - you are Synka ready with signatures!</p>
              </div>
            </div>
          </div>
          
          <Button onClick={() => setShowSignaturePopup(false)} className="w-full">
            Got it!
          </Button>
        </DialogContent>
      </Dialog>

      {/* Image Instructions Popup */}
      <Dialog open={showImagePopup} onOpenChange={setShowImagePopup}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Use this image as your email signature</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">1</span>
                <p className="text-sm text-muted-foreground">Open email signature settings in your email client</p>
              </div>
              
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">2</span>
                <p className="text-sm text-muted-foreground">Paste the image into the signature area</p>
              </div>
              
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">3</span>
                <p className="text-sm text-muted-foreground">Works where HTML is not supported</p>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground">
              Image links to: <a href={publicCardUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{publicCardUrl}</a>
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={downloadImage} variant="outline" className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Download Image
            </Button>
            <Button onClick={() => setShowImagePopup(false)} className="flex-1">
              Got it!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
            }
