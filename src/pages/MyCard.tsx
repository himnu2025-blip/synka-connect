import { useState, useRef, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { hapticFeedback } from '@/lib/haptics';
import { useNavigate, useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Phone,
  Mail,
  Linkedin,
  Globe,
  Share2,
  Sparkles,
  Upload,
  Check,
  Download,
  Building2,
  Briefcase,
  Palette,
  Star,
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FloatingInput, FloatingPhoneInput, FloatingNameInput, splitFullName, combineNames, COUNTRY_CODES, extractPhoneNumber, getCountryCode } from '@/components/ui/floating-input';
import { formatPhoneByCountry, getWhatsAppNumber } from '@/lib/phoneFormat';
// Native sheet replaces Drawer for mobile keyboard stability
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCards } from '@/hooks/useCards';
import { supabase } from '@/integrations/supabase/client';
import { PremiumLayoutCarousel } from '@/components/card/PremiumLayoutCarousel';
import { CardImageSection, LayoutType } from '@/components/card/CardImageSection';
import { DocumentLinks } from '@/components/card/DocumentLinks';
import { SocialLinkChip } from '@/components/card/SocialLinkChip';
import { SocialLinksEditor } from '@/components/card/SocialLinksEditor';
import ImageCropPopup from '@/components/card/ImageCropPopup';
import ShareableCardImage from '@/components/card/ShareableCardImage';
import { optimizeCroppedImage, optimizeLogo, deleteStorageImage } from '@/lib/imageOptimization';
import { useCardDownload } from '@/hooks/useCardDownload';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { getPublicCardUrl, getPublicBaseUrl } from '@/lib/publicUrls';
import {
  validateContactForm,
  normalizeContactData,
  normalizeSocialData,
  isValidEmail,
  isValidPhone,
  isValidWebsite,
  isValidLinkedIn,
} from '@/lib/inputValidation';
import { SocialPlatform } from '@/lib/socialNormalizer';

interface ContactRowProps {
  icon: any;
  value: string;
  href: string;
  iconClass?: string;
}

function ContactRow({ icon: Icon, value, href, iconClass }: ContactRowProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group block"
    >
      <div className="flex items-center gap-4 px-4 py-3">
        {/* Icon */}
        <div className="w-10 h-10 rounded-full bg-muted/60 backdrop-blur-sm flex items-center justify-center shrink-0">
          <Icon className={cn('h-[18px] w-[18px] text-foreground/90', iconClass)} />
        </div>

        {/* Text */}
        <p className="text-[15px] font-medium text-foreground truncate flex-1">
          {value}
        </p>
      </div>

      {/* Apple-style separator */}
      <div className="ml-[72px] h-px bg-border/40 group-last:hidden" />
    </a>
  );
}

// WhatsApp link helper - uses wa.me for consistency
const getWhatsappLink = (rawNumber: string) => {
  const digits = getWhatsAppNumber(rawNumber);
  // If only 10 digits, assume India (+91)
  const numberWithCountry = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${numberWithCountry}`;
};

export default function MyCard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { profile, refetch } = useProfile();
  const { activeCard, loading: cardsLoading, updateCard, refetch: refetchCards } = useCards();
  const { cardRef, isGenerating, generateCardFile } = useCardDownload();
  const isMobile = useIsMobile();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLayoutOpen, setIsLayoutOpen] = useState(false);
  const [editSheetMounted, setEditSheetMounted] = useState(false);
  const [currentLayout, setCurrentLayout] = useState<LayoutType>('photo-logo');
  const [currentThemeColor, setCurrentThemeColor] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    firstName: '',
    lastName: '',
    designation: '',
    company: '',
    phone: '',
    email: '',
    website: '',
    whatsapp: '',
    linkedin: '',
    about: '',
    photo_url: '',
    logo_url: '',
    instagram: '',
    youtube: '',
    twitter: '',
    facebook: '',
    calendly: '',
  });
  const [isGeneratingAbout, setIsGeneratingAbout] = useState(false);
  
  // Image crop popup state
  const [cropPopupOpen, setCropPopupOpen] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  
  const photoInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // ✅ Track initialization state per session
  const didInitRef = useRef(false);
  
  // ✅ Track loading without returning null
  const isLoading = authLoading || cardsLoading;
  const [cardHydrated, setCardHydrated] = useState(false);

useEffect(() => {
  // Hydrate only when activeCard has real data (not empty placeholder)
  if (
    activeCard &&
    (activeCard.full_name || activeCard.email || activeCard.phone)
  ) {
    setCardHydrated(true);
  }
}, [activeCard]);
  const cardReady = cardHydrated;
  
  // ✅ ISSUE 1 FIX: Track animation state to prevent replay on resume
  const didAnimateRef = useRef(false);
  
  // ✅ FIX: Track previous card's default status to prevent flash
  const lastActiveDefaultRef = useRef<boolean | null>(null);

  // Card creation is handled by AuthProvider - MyCard should NEVER create cards

  // Mark animation as played on first mount
  useEffect(() => {
    didAnimateRef.current = true;
  }, []);

  // Simplified auth check - NO navigation
  useEffect(() => {
    if (!authLoading && !user) {
      // Let the router handle redirects, don't navigate here
      return;
    }
  }, [authLoading, user]);

  // Native sheet mount/unmount with body scroll lock
  useEffect(() => {
    if (isEditOpen) {
      setEditSheetMounted(true);
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      const t = setTimeout(() => setEditSheetMounted(false), 300);
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      return () => clearTimeout(t);
    }
  }, [isEditOpen]);

  // Card initialization removed - AuthProvider handles card creation

  // Track which card ID we've initialized edit data for
  const lastCardIdRef = useRef<string | null>(null);

  // ✅ Initialize edit state only when card ACTUALLY changes
  useEffect(() => {
    if (!activeCard && !profile) return;
    
    const currentCardId = activeCard?.id || 'no-card';
    
    // ✅ FIX: Skip if we've already initialized for this exact card with same default status
    if (
      lastCardIdRef.current === currentCardId &&
      activeCard?.is_default === lastActiveDefaultRef.current
    ) {
      return;
    }

    // Calculate next data with split name
    const fullName = activeCard?.full_name || profile?.full_name || '';
    const { firstName, lastName } = splitFullName(fullName);
    
    const nextData = {
      firstName,
      lastName,
      designation: activeCard?.designation || '',
      company: activeCard?.company || '',
      phone: activeCard?.phone || profile?.phone || '',
      email: activeCard?.email || profile?.email || user?.email || '',
      website: activeCard?.website || '',
      whatsapp: activeCard?.whatsapp || '',
      linkedin: activeCard?.linkedin || '',
      about: activeCard?.about || '',
      photo_url: activeCard?.photo_url || '',
      logo_url: activeCard?.logo_url || '',
      instagram: (activeCard as any)?.instagram || '',
      youtube: (activeCard as any)?.youtube || '',
      twitter: (activeCard as any)?.twitter || '',
      facebook: (activeCard as any)?.facebook || '',
      calendly: (activeCard as any)?.calendly || '',
    };

    // ✅ Only update if data actually changed
    setEditData(prev => {
      // Deep compare to prevent unnecessary re-renders
      const prevStr = JSON.stringify(prev);
      const nextStr = JSON.stringify(nextData);
      return prevStr === nextStr ? prev : nextData;
    });

    // ✅ ISSUE 2 FIX: Guard layout and theme updates - only update if changed
    if (activeCard?.layout && activeCard.layout !== currentLayout) {
      setCurrentLayout(activeCard.layout as LayoutType);
    }
    
    // ✅ ISSUE 2 FIX: Guard theme color updates - handle null properly
    const nextThemeColor = activeCard?.card_design ?? null;
    if (nextThemeColor !== currentThemeColor) {
      setCurrentThemeColor(nextThemeColor);
    }

    // ✅ FIX: Update tracking refs with both ID and default status
    lastCardIdRef.current = currentCardId;
    lastActiveDefaultRef.current = activeCard?.is_default ?? null;
    
  }, [activeCard]); // 👈 ✅ FIX: Changed from [activeCard?.id] to [activeCard]

  // ✅ Open edit dialog when ?edit=true (ONE-TIME trigger)
useEffect(() => {
  const params = new URLSearchParams(location.search);

  if (params.get('edit') === 'true' && !isEditOpen) {
    setIsEditOpen(true);

    // remove ?edit=true immediately so it doesn't block future opens
    params.delete('edit');
    navigate(
      { pathname: location.pathname, search: params.toString() },
      { replace: true }
    );
  }
}, [location.search, isEditOpen, navigate]);

  const publicUrl = profile?.public_slug
    ? getPublicCardUrl(profile.public_slug)
    : '';

  // Phone / WhatsApp display logic - with profile fallback
  const resolvedPhone = activeCard?.phone || profile?.phone || activeCard?.whatsapp || '';
  const resolvedWhatsapp = activeCard?.whatsapp || activeCard?.phone || profile?.phone || '';

  const handleSave = async () => {
    navigator.vibrate?.(10);
    if (!activeCard) return;

    // Validate fields
    const validation = validateContactForm({
      email: editData.email,
      phone: editData.phone,
      website: editData.website,
      linkedin: editData.linkedin,
    });

    if (validation) {
      toast({
        title: validation.message,
        variant: 'destructive',
      });
      return;
    }

    // Normalize all contact fields
    const normalizedFields = normalizeContactData({
      email: editData.email,
      phone: editData.phone,
      whatsapp: editData.whatsapp,
      website: editData.website,
      linkedin: editData.linkedin,
    });

    // Sync phone/whatsapp
    if (!normalizedFields.phone && normalizedFields.whatsapp) {
      normalizedFields.phone = normalizedFields.whatsapp;
    } else if (!normalizedFields.whatsapp && normalizedFields.phone) {
      normalizedFields.whatsapp = normalizedFields.phone;
    }

    const normalized = {
      ...editData,
      ...normalizedFields,
    };

    // Normalize social media fields (extract usernames, clean URLs)
    const normalizedSocial = normalizeSocialData({
      instagram: normalized.instagram,
      twitter: normalized.twitter,
      facebook: normalized.facebook,
      youtube: normalized.youtube,
      calendly: normalized.calendly,
    });

    setEditData({ ...normalized, ...normalizedSocial });

    const { error } = await updateCard(activeCard.id, {
      full_name: combineNames(normalized.firstName, normalized.lastName),
      designation: normalized.designation,
      company: normalized.company,
      phone: normalized.phone,
      email: normalized.email,
      website: normalized.website, // Already normalized with https://
      whatsapp: normalized.whatsapp,
      linkedin: normalized.linkedin, // Now username only
      about: normalized.about,
      photo_url: normalized.photo_url,
      logo_url: normalized.logo_url,
      layout: currentLayout,
      card_design: currentThemeColor ?? null,
      instagram: normalizedSocial.instagram || null, // Username only
      youtube: normalizedSocial.youtube || null, // @handle or channel/ID
      twitter: normalizedSocial.twitter || null, // Username only
      facebook: normalizedSocial.facebook || null, // Page name only
      calendly: normalizedSocial.calendly || null, // Full URL
    } as any);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save changes. Please try again.',
        variant: 'destructive',
      });
    } else {
      setIsEditOpen(false);
      toast({
        title: 'Card updated!',
        description: 'Your changes have been saved.',
      });
      const params = new URLSearchParams(location.search);
      if (params.get('edit') === 'true') {
        params.delete('edit');
        navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
      }
    }
  };

  // PHOTO upload - open crop popup
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !activeCard) return;
    
    // Open crop popup with the selected file
    setPendingImageFile(file);
    setCropPopupOpen(true);
    
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  // Handle cropped image save from popup
  const handleCroppedImageSave = async (croppedBlob: Blob) => {
    if (!user || !activeCard) return;
    
    setIsUploadingPhoto(true);
    setCropPopupOpen(false);
    
    try {
      // Delete old image from storage if exists
      if (activeCard.photo_url) {
        await deleteStorageImage(supabase, activeCard.photo_url, 'profiles');
      }
      
      // Optimize the cropped image to ~200KB JPEG for crawler compatibility
      const optimized = await optimizeCroppedImage(croppedBlob);
      
      // Always use .jpg extension for maximum crawler/preview compatibility
      const filePath = `photos/${user.id}-${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, optimized.blob, { 
          upsert: true,
          contentType: optimized.blob.type
        });

      if (uploadError) {
        console.error('Upload error:', uploadError.message);
        throw uploadError;
      }

      const { data: publicData } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      const publicUrl = publicData.publicUrl;

      setEditData(prev => ({ ...prev, photo_url: publicUrl }));

      await updateCard(activeCard.id, { 
        photo_url: publicUrl,
      });
      
      toast({
        title: 'Photo updated',
        description: `Optimized to ${optimized.sizeKB}KB`,
      });
    } catch (err: any) {
      toast({
        title: 'Upload failed',
        description: err?.message || 'Could not upload photo. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingPhoto(false);
      setPendingImageFile(null);
    }
  };

  // LOGO upload with optimization (600x300 max, maintains transparency)
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !activeCard) return;

    try {
      // Delete old logo from storage if exists
      if (activeCard.logo_url) {
        await deleteStorageImage(supabase, activeCard.logo_url, 'profiles');
      }
      
      // Optimize: resize to 600x300 max, maintain aspect ratio
      const optimized = await optimizeLogo(file);
      
      // Use .png for transparency, otherwise .jpg for compatibility
      const ext = optimized.blob.type === 'image/png' ? 'png' : 'jpg';
      const filePath = `logos/${user.id}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, optimized.blob, { 
          upsert: true,
          contentType: optimized.blob.type
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      const publicUrl = publicData.publicUrl;

      setEditData(prev => ({ ...prev, logo_url: publicUrl }));

      await updateCard(activeCard.id, { logo_url: publicUrl });

      toast({
        title: 'Logo updated',
        description: `Optimized to ${optimized.sizeKB}KB`,
      });
    } catch (err) {
      console.error('Logo upload error:', err);
      toast({
        title: 'Upload failed',
        description: 'Could not upload logo. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const generateAbout = async () => {
    setIsGeneratingAbout(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-about', {
        body: {
          name: combineNames(editData.firstName, editData.lastName),
          company: editData.company,
          designation: editData.designation,
          email: editData.email,
          linkedin: editData.linkedin,
          website: editData.website,
          use_web_search: true,
        },
      });

      if (error) throw error;

      if (data?.about) {
        setEditData(prev => ({ ...prev, about: data.about }));
        toast({
          title: 'About generated!',
          description: 'Your professional summary has been created from live web info.',
        });
      }
    } catch (error) {
      console.error('Error generating about:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate about. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingAbout(false);
    }
  };

  const copyLink = () => {
    navigator.vibrate?.(10);
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    toast({
      title: 'Link copied!',
      description: 'Share it with anyone.',
    });
  };

  const shareCard = async () => {
    await hapticFeedback.light();
    if (!publicUrl) {
      copyLink();
      return;
    }

    // Share ONLY the URL - no text, no title (like Blinq)
    // OG meta tags on the server will provide the preview content

    // 📱 Native platform share (Capacitor)
    if (Capacitor.isNativePlatform()) {
      try {
        await Share.share({
          url: publicUrl, // URL only - OG tags handle the preview
        });
        await hapticFeedback.success();
      } catch (err) {
        console.error('Native share error:', err);
        copyLink();
      }
      return;
    }

    // 🌐 Web Share API
    if (navigator.share) {
      try {
        await navigator.share({
          url: publicUrl, // URL only - OG tags handle the preview
        });
        await hapticFeedback.success();
      } catch (err: any) {
        // User cancelled or share failed
        if (err.name !== 'AbortError') {
          console.error('Web share error:', err);
          copyLink();
        }
      }
      return;
    }

    // Fallback: copy link
    copyLink();
  };

  const getInitials = (name: string) =>
    name
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .join('')
      .toUpperCase() || 'U';

  // Handle layout selection from carousel
  const handleLayoutSelect = async (layout: LayoutType, color: string | null) => {
    setCurrentLayout(layout);
    // Always set current theme color even when it's null
    setCurrentThemeColor(color ?? null);

    // Persist immediately and always save card_design even if null
    if (activeCard) {
      await updateCard(activeCard.id, { 
        layout: layout,
        card_design: color ?? null,
      });
    }
  };

  const handleDownloadAndShare = async () => {
    await hapticFeedback.light();

    // Get display name with profile fallback
    const displayName = activeCard?.full_name || profile?.full_name || '';
    
    if (!displayName) {
      toast({
        title: 'Complete your card',
        description: 'Add your name to share your card image.',
        variant: 'destructive',
      });
      return;
    }

    const file = await generateCardFile({
      name: displayName,
      designation: activeCard?.designation || undefined,
      company: activeCard?.company || undefined,
      photoUrl: activeCard?.photo_url || undefined,
      logoUrl:activeCard?.logo_url || undefined,
      publicUrl,
      slug: profile?.public_slug ? `/u/${profile.public_slug}` : '',
      isPremium: profile?.plan === 'Orange',
    });

    if (!file) {
      toast({
        title: 'Failed',
        description: 'Could not generate card image.',
        variant: 'destructive',
      });
      return;
    }

    // 📱 ANDROID / iOS (Capacitor)
    if (Capacitor.isNativePlatform()) {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () =>
          resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const fileName = `synka-card-${Date.now()}.png`;

      const savedFile = await Filesystem.writeFile({
        path: `Synka-${Date.now()}.png`,
        data: base64,
        directory: Directory.Documents,
        recursive: true,
      });

      await Share.share({
        title: 'My Digital Card',
        text: 'Check out my digital business card',
        files: [savedFile.uri], // ✅ IMPORTANT
      });

      await hapticFeedback.success();
      return;
    }

    // 🌐 WEB SHARE
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: 'My Digital Card',
          files: [file],
        });
        await hapticFeedback.success();
        return;
      } catch {}
    }

    // ⬇️ DOWNLOAD FALLBACK
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);

    await hapticFeedback.success();
  };

  // ✅ REMOVED the early return null - Apple never shows blank screens

  // Get display values with profile fallback for rendering
  const displayName =
  activeCard?.full_name || profile?.full_name || '';
  const displayEmail = activeCard?.email || profile?.email || '';
  const displayPhone = activeCard?.phone || profile?.phone || '';
  const displayWhatsapp = activeCard?.whatsapp || activeCard?.phone || profile?.phone || '';

  return (
    <div
      className={cn(
        "min-h-full py-4 sm:py-6 px-3 sm:px-4 space-y-4 sm:space-y-6 mx-auto max-w-full sm:max-w-md lg:max-w-[460px]",
        // ✅ ISSUE 1 FIX: Only animate on first mount, not on resume
        !didAnimateRef.current && "animate-fade-up"
      )}
    >
      {/* Non-default card notice - only show for non-default cards */}
      {activeCard && !activeCard.is_default && (
        <div className="flex items-center justify-center gap-2 py-2 px-4 bg-muted/50 border border-border/40 rounded-xl">
          <span className="text-sm text-muted-foreground">
            This card is private. Set as default to make it public.
          </span>
        </div>
      )}

      {/* Profile Card View */}
      <div className="bg-card/95 backdrop-blur-xl rounded-3xl border border-border/40 shadow-[0_20px_40px_rgba(0,0,0,0.06)] overflow-hidden">
        <div
  className={cn(
    "relative pt-0 flex flex-col items-center",
    currentLayout !== 'photo-only' && "pb-4"
  )}
>
          {cardReady ? (
  <CardImageSection
    layout={currentLayout}
    photoUrl={activeCard.photo_url}
    logoUrl={activeCard.logo_url}
    name={displayName}
    designation={activeCard.designation || undefined}
    company={activeCard.company || undefined}
    themeColor={currentThemeColor}
    faceX={activeCard.face_x}
    faceY={activeCard.face_y}
    logoX={activeCard.logo_x}
    logoY={activeCard.logo_y}
  />
) : (
  // ✅ Skeleton placeholder – NO initials, NO flicker
  <div className="w-full h-72 rounded-3xl bg-muted/40 animate-pulse" />
)}

          {cardReady && currentLayout !== 'photo-only' ? (
  <div className="text-center mt-4 space-y-1 text-foreground">
    <h2 className="text-[22px] font-semibold tracking-tight text-foreground">
      {displayName}
    </h2>

    {activeCard?.designation && (
      <p className="text-[14.5px] font-normal text-muted-foreground leading-tight">
        {activeCard.designation}
      </p>
    )}

    {activeCard?.company && (
      <p className="text-[13.5px] text-muted-foreground/70 leading-tight">
        {activeCard.company}
      </p>
    )}
  </div>
) : (
  /* ✅ Text skeleton – prevents YN flash */
  <div className="text-center mt-4 space-y-2">
    <div className="h-6 w-40 mx-auto bg-muted/40 rounded animate-pulse" />
    <div className="h-4 w-28 mx-auto bg-muted/30 rounded animate-pulse" />
  </div>
)}
        </div>

        <div className="mx-6 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />

        {/* Contact Section */}
        <div className="p-6 space-y-2">
          {displayPhone && (
            <ContactRow
              icon={Phone}
              value={formatPhoneByCountry(displayPhone)}
              href={`tel:${displayPhone}`}
            />
          )}
          {displayEmail && (
            <ContactRow
              icon={Mail}
              value={displayEmail}
              href={`mailto:${displayEmail}`}
            />
          )}
          {activeCard?.website && (
            <ContactRow
              icon={Globe}
              value="Visit Website"
              href={
  activeCard.website.startsWith('http')
    ? activeCard.website
    : `https://${activeCard.website}`
              }
            />
          )}
          {displayWhatsapp && (
            <ContactRow
              icon={FaWhatsapp}
              value="Connect on WhatsApp"
              href={getWhatsappLink(displayWhatsapp)}
              iconClass="text-foreground/80 group-hover:text-[#25D366]"
            />
          )}
          {/* Document Link - shown in action bar */}
          <DocumentLinks
            documentName={activeCard?.document_name}
            documentUrl={activeCard?.document_url}
          />
          {activeCard?.linkedin && (
            <ContactRow
              icon={Linkedin}
              value="Connect on LinkedIn"
              href={`https://linkedin.com/in/${activeCard.linkedin}`}
              iconClass="text-foreground/80 group-hover:text-blue-600"
            />
          )}
          {/* Social Links */}
          {(activeCard as any)?.instagram && (
            <SocialLinkChip platform="instagram" url={(activeCard as any).instagram} />
          )}
          {(activeCard as any)?.youtube && (
            <SocialLinkChip platform="youtube" url={(activeCard as any).youtube} />
          )}
          {(activeCard as any)?.twitter && (
            <SocialLinkChip platform="twitter" url={(activeCard as any).twitter} />
          )}
          {(activeCard as any)?.facebook && (
            <SocialLinkChip platform="facebook" url={(activeCard as any).facebook} />
          )}
          {(activeCard as any)?.calendly && (
            <SocialLinkChip platform="calendly" url={(activeCard as any).calendly} />
          )}
        </div>
      </div>

      {/* About Section */}
      {activeCard?.about && (
        <div className="p-5 rounded-2xl bg-muted/30 border border-border/40">
          <h3 className="font-semibold text-foreground mb-2">About</h3>
          <p className="text-muted-foreground text-sm whitespace-pre-line">
            {activeCard.about}
          </p>
        </div>
      )}

      {/* QR Code */}
      <div className="p-5 rounded-2xl bg-muted/30 border border-border/40 flex flex-col items-center">
        <div className="p-4 rounded-2xl bg-white shadow-sm">
          {publicUrl ? (
            <QRCodeSVG
              value={publicUrl}
              size={160}
              level="H"
              includeMargin={true}
            />
          ) : (
            <div className="w-[160px] h-[160px] flex items-center justify-center text-muted-foreground text-sm">
              Loading QR...
            </div>
          )}
        </div>
        {publicUrl && (
          <p className="sr-only">
            {publicUrl.replace(getPublicBaseUrl(), '')}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1 min-w-0 active:scale-[0.97] transition-transform" 
            onClick={() => {
              hapticFeedback.light();
              handleDownloadAndShare();
            }}
            disabled={isLoading || !displayName || isGenerating}
          >
            <Download className="h-4 w-4 mr-2 shrink-0" />
            <span className="truncate">{isGenerating ? 'Saving...' : 'Download'}</span>
          </Button>
          <Button 
            variant="outline" 
            className="flex-1 min-w-0 active:scale-[0.97] transition-transform" 
            onClick={() => setIsLayoutOpen(true)}
            disabled={isLoading}
          >
            <Palette className="h-4 w-4 mr-2 shrink-0" />
            <span className="truncate">Layout</span>
          </Button>
        </div>
        <Button 
          variant="gradient" 
          className="w-full font-medium tracking-tight" 
          onClick={shareCard}
          disabled={isLoading}
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </div>

      {/* Hidden Shareable Card Image for download */}
      <ShareableCardImage
        ref={cardRef}
        name={displayName}
        designation={activeCard?.designation || undefined}
        company={activeCard?.company || undefined}
        photoUrl={activeCard?.photo_url || undefined}
        logoUrl={activeCard?.logo_url || undefined}
        publicUrl={publicUrl}
        slug={profile?.public_slug ? `/u/${profile.public_slug}` : ''}
        isPremium={profile?.plan === 'Orange'}
      />

      {/* Edit Dialog/Drawer - Responsive */}
{isMobile && editSheetMounted && (
  <>
    {/* Backdrop */}
    <div
      className={`fixed inset-0 z-[998] transition-opacity duration-300 ${
        isEditOpen ? 'bg-black/30 opacity-100' : 'opacity-0'
      }`}
      onClick={() => setIsEditOpen(false)}
    />

    {/* Bottom Sheet */}
    <div className="fixed inset-x-0 bottom-0 z-[999] flex justify-center pointer-events-none">
      <div
        className={`w-full max-w-md bg-background rounded-t-3xl shadow-2xl pointer-events-auto overflow-hidden
          transform transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
          ${isEditOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
        `}
      >
        <div
  className="overflow-y-auto"
  style={{
    WebkitOverflowScrolling: 'touch',
    maxHeight: '85dvh',
    paddingBottom: 'env(safe-area-inset-bottom)',
  }}
>
          <div className="space-y-6 px-6 pt-6 pb-6">
            {/* Photo & Logo Upload */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="font-semibold">Photo</Label>
                <div
                  className="aspect-square rounded-2xl overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-center"
                  onClick={() => photoInputRef.current?.click()}
                >
                  {editData.photo_url ? (
                    <img
                      src={editData.photo_url}
                      alt="Photo"
                      className="w-full h-full object-cover"
                      style={{
                        objectPosition: `${activeCard?.face_x ?? 50}% ${activeCard?.face_y ?? 50}%`
                      }}
                    />
                  ) : (
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={isLoading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {editData.photo_url ? 'Change Photo' : 'Upload Photo'}
                </Button>
              </div>

              <div className="space-y-3">
                <Label className="font-semibold">Logo</Label>
                <div
                  className="aspect-square rounded-full overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-center"
                  onClick={() => logoInputRef.current?.click()}
                >
                  {editData.logo_url ? (
                    <img
                      src={editData.logo_url}
                      alt="Logo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={isLoading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {editData.logo_url ? 'Change Logo' : 'Upload Logo'}
                </Button>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <FloatingNameInput
                firstName={editData.firstName}
                lastName={editData.lastName}
                onFirstNameChange={(val) =>
                  setEditData(prev => ({ ...prev, firstName: val }))
                }
                onLastNameChange={(val) =>
                  setEditData(prev => ({ ...prev, lastName: val }))
                }
                disabled={isLoading}
              />

              <FloatingInput
                label="Role *"
                value={editData.designation}
                onChange={(e) =>
                  setEditData(prev => ({ ...prev, designation: e.target.value }))
                }
                disabled={isLoading}
              />

              <FloatingInput
                label="Company Name"
                value={editData.company}
                onChange={(e) =>
                  setEditData(prev => ({ ...prev, company: e.target.value }))
                }
                disabled={isLoading}
              />

              <FloatingInput
                label="Email"
                value={editData.email}
                onChange={(e) =>
                  setEditData(prev => ({ ...prev, email: e.target.value }))
                }
                inputMode="email"
                disabled={isLoading}
              />

              <FloatingPhoneInput
                label="Phone"
                value={extractPhoneNumber(editData.phone)}
                onChange={(e) => {
                  const code = getCountryCode(editData.phone);
                  setEditData(prev => ({ ...prev, phone: code + e.target.value }));
                }}
                countryCode={getCountryCode(editData.phone)}
                onCountryCodeChange={(code) => {
                  const number = extractPhoneNumber(editData.phone);
                  setEditData(prev => ({ ...prev, phone: code + number }));
                }}
                disabled={isLoading}
              />

              <FloatingPhoneInput
                label="WhatsApp"
                value={extractPhoneNumber(editData.whatsapp)}
                onChange={(e) => {
                  const code = getCountryCode(editData.whatsapp);
                  setEditData(prev => ({ ...prev, whatsapp: code + e.target.value }));
                }}
                countryCode={getCountryCode(editData.whatsapp)}
                onCountryCodeChange={(code) => {
                  const number = extractPhoneNumber(editData.whatsapp);
                  setEditData(prev => ({ ...prev, whatsapp: code + number }));
                }}
                disabled={isLoading}
              />

              <FloatingInput
                label="Website"
                value={editData.website}
                onChange={(e) =>
                  setEditData(prev => ({ ...prev, website: e.target.value }))
                }
                inputMode="url"
                disabled={isLoading}
              />

              <FloatingInput
                label="LinkedIn Username"
                value={editData.linkedin}
                onChange={(e) =>
                  setEditData(prev => ({ ...prev, linkedin: e.target.value }))
                }
                disabled={isLoading}
              />

              {/* Social Links Editor */}
              <div className="space-y-2">
                <Label>Social Links</Label>
                <SocialLinksEditor
                  values={{
                    instagram: editData.instagram,
                    youtube: editData.youtube,
                    twitter: editData.twitter,
                    facebook: editData.facebook,
                    calendly: editData.calendly,
                  }}
                  onChange={(platform: SocialPlatform, value: string) => {
                    setEditData(prev => ({ ...prev, [platform]: value }));
                  }}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>About Me</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={generateAbout}
                    disabled={isLoading || isGeneratingAbout}
                  >
                    <Sparkles
                      className={cn(
                        'h-4 w-4 mr-1',
                        isGeneratingAbout && 'animate-spin'
                      )}
                    />
                    {isGeneratingAbout ? 'Generating...' : 'Generate with AI'}
                  </Button>
                </div>
                <Textarea
                  placeholder="Tell people about yourself..."
                  value={editData.about}
                  onChange={(e) =>
                    setEditData(prev => ({ ...prev, about: e.target.value }))
                  }
                  rows={3}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Document Uploads */}
            <DocumentLinks
              documentName={activeCard?.document_name || null}
              documentUrl={activeCard?.document_url || null}
              isEditMode={true}
              userId={user?.id}
              cardId={activeCard?.id}
              isPremium={profile?.plan === 'Orange'}
              onUpdate={async (updates) => {
                if (activeCard) {
                  await updateCard(activeCard.id, updates);
                }
              }}
            />

            {/* Save Button */}
            <Button 
              variant="gradient" 
              className="w-full font-medium tracking-tight" 
              onClick={handleSave}
              disabled={isLoading}
            >
              <Check className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  </>
)}

{!isMobile && (
  // 💻 DESKTOP: Centered Dialog
  <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
    <DialogContent className="max-w-lg max-h-[85dvh] rounded-3xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="text-[22px] font-semibold tracking-tight">
          Edit Your Card
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {/* Photo & Logo Upload */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label className="font-semibold">Photo</Label>
            <div
              className="aspect-square rounded-2xl overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-center"
              onClick={() => photoInputRef.current?.click()}
            >
              {editData.photo_url ? (
                <img
                  src={editData.photo_url}
                  alt="Photo"
                  className="w-full h-full object-cover"
                  style={{
                    objectPosition: `${activeCard?.face_x ?? 50}% ${activeCard?.face_y ?? 50}%`
                  }}
                />
              ) : (
                <Upload className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => photoInputRef.current?.click()}
              disabled={isLoading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {editData.photo_url ? 'Change Photo' : 'Upload Photo'}
            </Button>
          </div>

          <div className="space-y-3">
            <Label className="font-semibold">Logo</Label>
            <div
              className="aspect-square rounded-full overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-center"
              onClick={() => logoInputRef.current?.click()}
            >
              {editData.logo_url ? (
                <img
                  src={editData.logo_url}
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Upload className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => logoInputRef.current?.click()}
              disabled={isLoading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {editData.logo_url ? 'Change Logo' : 'Upload Logo'}
            </Button>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <FloatingNameInput
            firstName={editData.firstName}
            lastName={editData.lastName}
            onFirstNameChange={(val) =>
              setEditData(prev => ({ ...prev, firstName: val }))
            }
            onLastNameChange={(val) =>
              setEditData(prev => ({ ...prev, lastName: val }))
            }
            disabled={isLoading}
          />

          <FloatingInput
            label="Role *"
            value={editData.designation}
            onChange={(e) =>
              setEditData(prev => ({ ...prev, designation: e.target.value }))
            }
            disabled={isLoading}
          />

          <FloatingInput
            label="Company Name"
            value={editData.company}
            onChange={(e) =>
              setEditData(prev => ({ ...prev, company: e.target.value }))
            }
            disabled={isLoading}
          />

          <FloatingInput
            label="Email"
            value={editData.email}
            onChange={(e) =>
              setEditData(prev => ({ ...prev, email: e.target.value }))
            }
            inputMode="email"
            disabled={isLoading}
          />

          <FloatingPhoneInput
            label="Phone"
            value={extractPhoneNumber(editData.phone)}
            onChange={(e) => {
              const code = getCountryCode(editData.phone);
              setEditData(prev => ({ ...prev, phone: code + e.target.value }));
            }}
            countryCode={getCountryCode(editData.phone)}
            onCountryCodeChange={(code) => {
              const number = extractPhoneNumber(editData.phone);
              setEditData(prev => ({ ...prev, phone: code + number }));
            }}
            disabled={isLoading}
          />

          <FloatingPhoneInput
            label="WhatsApp"
            value={extractPhoneNumber(editData.whatsapp)}
            onChange={(e) => {
              const code = getCountryCode(editData.whatsapp);
              setEditData(prev => ({ ...prev, whatsapp: code + e.target.value }));
            }}
            countryCode={getCountryCode(editData.whatsapp)}
            onCountryCodeChange={(code) => {
              const number = extractPhoneNumber(editData.whatsapp);
              setEditData(prev => ({ ...prev, whatsapp: code + number }));
            }}
            disabled={isLoading}
          />

          <FloatingInput
            label="Website"
            value={editData.website}
            onChange={(e) =>
              setEditData(prev => ({ ...prev, website: e.target.value }))
            }
            inputMode="url"
            disabled={isLoading}
          />

          <FloatingInput
            label="LinkedIn Username"
            value={editData.linkedin}
            onChange={(e) =>
              setEditData(prev => ({ ...prev, linkedin: e.target.value }))
            }
            disabled={isLoading}
          />

          {/* Social Links Editor */}
          <div className="space-y-2">
            <Label>Social Links</Label>
            <SocialLinksEditor
              values={{
                instagram: editData.instagram,
                youtube: editData.youtube,
                twitter: editData.twitter,
                facebook: editData.facebook,
                calendly: editData.calendly,
              }}
              onChange={(platform: SocialPlatform, value: string) => {
                setEditData(prev => ({ ...prev, [platform]: value }));
              }}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>About Me</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={generateAbout}
                disabled={isLoading || isGeneratingAbout}
              >
                <Sparkles
                  className={cn(
                    'h-4 w-4 mr-1',
                    isGeneratingAbout && 'animate-spin'
                  )}
                />
                {isGeneratingAbout ? 'Generating...' : 'Generate with AI'}
              </Button>
            </div>
            <Textarea
              placeholder="Tell people about yourself..."
              value={editData.about}
              onChange={(e) =>
                setEditData(prev => ({ ...prev, about: e.target.value }))
              }
              rows={3}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Document Uploads */}
        <DocumentLinks
          documentName={activeCard?.document_name || null}
          documentUrl={activeCard?.document_url || null}
          isEditMode={true}
          userId={user?.id}
          cardId={activeCard?.id}
          isPremium={profile?.plan === 'Orange'}
          onUpdate={async (updates) => {
            if (activeCard) {
              await updateCard(activeCard.id, updates);
            }
          }}
        />

        {/* Save Button */}
        <Button 
          variant="gradient" 
          className="w-full font-medium tracking-tight" 
          onClick={handleSave}
          disabled={isLoading}
        >
          <Check className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </DialogContent>
  </Dialog>
)}

      {/* Premium Layout Carousel */}
      <PremiumLayoutCarousel
        open={isLayoutOpen}
        onClose={() => setIsLayoutOpen(false)}
        currentLayout={currentLayout}
        currentColor={currentThemeColor}
        photoUrl={activeCard?.photo_url || undefined}
        logoUrl={activeCard?.logo_url || undefined}
        name={displayName}
        designation={activeCard?.designation || 'Professional'}
        company={activeCard?.company || 'Company'}
        onSelect={handleLayoutSelect}
      />

      {/* Image Crop Popup */}
      {pendingImageFile && (
        <ImageCropPopup
          open={cropPopupOpen}
          onClose={() => {
            setCropPopupOpen(false);
            setPendingImageFile(null);
          }}
          imageFile={pendingImageFile}
          onSave={handleCroppedImageSave}
        />
      )}
    </div>
  );
      }
