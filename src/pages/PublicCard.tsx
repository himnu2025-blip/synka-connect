import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { 
  Phone, 
  Mail, 
  Linkedin,
  Globe,
  Download,
  Sparkles,
  Share2,
  Check,
  UserPlus,
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { Profile, ProfileCompat } from '@/hooks/useProfile';
import { getPublicCardData, Card } from '@/contexts/CardsContext';
import { submitPublicContact } from '@/hooks/useContacts';
import { logScanEvent, logContactSave } from '@/hooks/useAnalytics';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { SmartAppBanner } from '@/components/SmartAppBanner';

import { CardImageSection, LayoutType } from '@/components/card/CardImageSection';
import { DocumentLinks } from '@/components/card/DocumentLinks';
import { SocialLinkChip } from '@/components/card/SocialLinkChip';
import { getPublicCardUrl } from '@/lib/publicUrls';
import { saveContactToPhone } from '@/lib/nativeContacts';
import { ContactShareSheet, ContactFormData } from '@/components/public-card/ContactShareSheet';
import { ExchangeSuccessSheet } from '@/components/public-card/ExchangeSuccessSheet';
import { hapticFeedback } from '@/lib/haptics';
import { formatPhoneByCountry, getWhatsAppNumber } from '@/lib/phoneFormat';

// Helper to generate WhatsApp link
const getWhatsappLink = (number: string) => {
  const cleaned = getWhatsAppNumber(number);
  return `https://wa.me/${cleaned}`
};

// Contact row component for consistent styling
const ContactRow = ({ 
  icon: Icon, 
  label, 
  value, 
  href, 
  iconClass 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string; 
  href: string;
  iconClass?: string;
}) => (
  <a
    href={href}
    target={href.startsWith('http') ? '_blank' : undefined}
    rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
    className="group flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
  >
    <div className={cn(
      "w-10 h-10 rounded-full bg-muted flex items-center justify-center transition-colors",
      iconClass
    )}>
      <Icon className="h-5 w-5 text-foreground/70 group-hover:text-foreground transition-colors" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground truncate">{value}</p>
    </div>
  </a>
);

export default function PublicCard() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  
  const [profile, setProfile] = useState<(Profile & ProfileCompat) | null>(null);
  const [card, setCard] = useState<Card | null>(null);
  const [viewerCard, setViewerCard] = useState<Card | null>(null);
  const [ownerActiveEventId, setOwnerActiveEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanLogged, setScanLogged] = useState(false);
  const [exchangeInProgress, setExchangeInProgress] = useState(false);
  const [sharedBack, setSharedBack] = useState(false);
  const [showExchangeSuccess, setShowExchangeSuccess] = useState(false);
  const [exchangeButtonSaved, setExchangeButtonSaved] = useState(false);
  
  // Contact share sheet state
  const [showContactSheet, setShowContactSheet] = useState(false);
  const [contactShared, setContactShared] = useState(false);
  const [showPostActionCta, setShowPostActionCta] = useState(false);

  // Check if viewer is a Synka user (silently)
  const isViewerSynkaUser = !!user && !authLoading;
  
  // Check if viewer is viewing their own card
  const isOwnCard = user && profile && user.id === profile.user_id;

  useEffect(() => {
    if (slug) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Load viewer's default card (non-blocking, runs in background)
useEffect(() => {
  const loadViewerCard = async () => {
    if (!user) {
      setViewerCard(null);
      return;
    }
    
    try {
      // Fire and forget - doesn't block main render
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .maybeSingle();

      if (error) {
        console.error('Failed to load viewer card:', error);
        return;
      }

      setViewerCard(data as Card | null);
    } catch (err) {
      console.error('Failed to load viewer card:', err);
    }
  };
  
  // Only run if user exists and we don't have viewer card yet
  if (user && !viewerCard) {
    loadViewerCard();
  }
}, [user]);

  // Fetch card owner's active events and log scan event
  useEffect(() => {
    if (!profile || scanLogged) return;

    const logScan = async () => {
      const source = searchParams.get('src') === 'nfc' ? 'nfc' : 'qr';
      const now = new Date();

      // Fetch the card owner's events directly (not the viewer's)
      const { data: ownerEvents } = await supabase
        .from('events')
        .select('id, start_time, end_time')
        .eq('user_id', profile.user_id);

      let activeEventId: string | null = null;
      if (ownerEvents && ownerEvents.length > 0) {
        const activeEvents = ownerEvents.filter(event => {
          const start = new Date(event.start_time);
          const end = event.end_time ? new Date(event.end_time) : start;
          return now >= start && now <= end;
        });
        activeEventId = activeEvents.length > 0 ? activeEvents[0].id : null;
      }

      // Store for potential use elsewhere
      setOwnerActiveEventId(activeEventId);

      // Log the scan event with both card_id and event_id
      logScanEvent(
        profile.user_id,
        card?.id || null,
        source,
        activeEventId
      );

      setScanLogged(true);
    };

    logScan();
  }, [profile, card, scanLogged, searchParams]);

  const loadData = async () => {
    if (!slug) return;
    
    setLoading(true);
    
    // Single optimized query - fetches profile + card together
    const { profile: profileData, card: cardData } = await getPublicCardData(slug);
    setProfile(profileData);
    setCard(cardData);
    
    setLoading(false);
  };

  // Use card data if available, otherwise fall back to profile
  const displayData = card ? {
    name: card.full_name || profile?.name || '',
    designation: card.designation || profile?.designation || '',
    company: card.company || profile?.company || '',
    phone: card.phone || profile?.phone || '',
    email: card.email || profile?.email || '',
    website: card.website || profile?.website || '',
    whatsapp: card.whatsapp || profile?.whatsapp || '',
    linkedin: card?.linkedin || '',
    about: card.about || profile?.about || '',
    photo_url: card.photo_url || profile?.photo_url || '',
    logo_url: card.logo_url || profile?.logo_url || '',
  } : profile ? {
    name: profile.name || '',
    designation: profile.designation || '',
    company: profile.company || '',
    phone: profile.phone || '',
    email: profile.email || '',
    website: profile.website || '',
    whatsapp: profile.whatsapp || '',
    linkedin: profile.linkedin || '',
    about: profile.about || '',
    photo_url: profile.photo_url || '',
    logo_url: profile.logo_url || '',
  } : null;

  // ONE-TAP MUTUAL EXCHANGE - The magic function
  const handleSynkaExchange = async () => {
    if (!user || !profile || !card) {
      toast({
        title: 'Unable to save',
        description: 'Please sign in to save this contact.',
        variant: 'destructive',
      });
      return;
    }
    
    // Prevent self-save
    if (isOwnCard) {
      toast({
        title: "That's your own card!",
        description: 'You cannot exchange with yourself.',
      });
      return;
    }

    // Viewer identity - prioritize default card data, fallback to user metadata
    const viewerIdentity = {
      name: viewerCard?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Synka User',
      email: viewerCard?.email || user.email!, // card email or auth email
      phone: viewerCard?.phone || user.user_metadata?.phone || '',
      whatsapp: viewerCard?.whatsapp || viewerCard?.phone || user.user_metadata?.phone || '',
      company: viewerCard?.company || user.user_metadata?.company || '',
      designation: viewerCard?.designation || user.user_metadata?.designation || '',
      linkedin: viewerCard?.linkedin || '',
      website: viewerCard?.website || '',
      about: viewerCard?.about || '',
      photo_url: viewerCard?.photo_url || '',
      logo_url: viewerCard?.logo_url || '',
    };

    setExchangeInProgress(true);
    navigator.vibrate?.([10, 50, 10]); // Double haptic for emphasis
    
    try {
      // Helper function for tag creation
      const getOrCreateTag = async (userId: string) => {
        const { data: existingTag } = await supabase
          .from('tags')
          .select('id')
          .eq('user_id', userId)
          .eq('name', 'Synka Exchange')
          .maybeSingle();
        
        if (existingTag) return existingTag.id;
        
        const { data: newTag } = await supabase
          .from('tags')
          .insert({ 
            user_id: userId, 
            name: 'Synka Exchange', 
            color: '#10B981' 
          })
          .select('id')
          .single();
        
        return newTag?.id;
      };

      // Get or create tag for viewer's CRM
      const viewerTagId = await getOrCreateTag(user.id);

      // 1. SAVE PUBLIC CARD OWNER → VIEWER CRM
      const { data: existingViewerContact } = await supabase
        .from('contacts')
        .select('id, notes_history')
        .eq('owner_id', user.id)
        .eq('email', card.email)
        .maybeSingle();

      let viewerContactId = existingViewerContact?.id;
      
      if (existingViewerContact) {
        // UPDATE existing contact in viewer's CRM
        const { data: updatedContact } = await supabase
          .from('contacts')
          .update({
            name: card.full_name || displayData?.name || 'Unknown',
            company: card.company,
            designation: card.designation,
            phone: card.phone,
            whatsapp: card.whatsapp,
            linkedin: card.linkedin,
            website: card.website,
            photo_url: card.photo_url || displayData?.photo_url || null,
            about: card.about || displayData?.about || null,
            synka_user_id: profile.user_id,
            shared_card_id: card.id,
            source: 'synka_exchange',
            updated_at: new Date().toISOString(),
            notes_history: [
              ...(existingViewerContact.notes_history || []),
              {
                text: 'Updated via Synka Exchange',
                timestamp: new Date().toISOString(),
              }
            ]
          })
          .eq('id', existingViewerContact.id)
          .select('id')
          .single();
        
        viewerContactId = updatedContact?.id;
      } else {
        // INSERT new contact into viewer's CRM
        const { data: newContact } = await supabase
          .from('contacts')
          .insert({
            owner_id: user.id,
            email: card.email,
            name: card.full_name || displayData?.name || 'Unknown',
            company: card.company,
            designation: card.designation,
            phone: card.phone,
            whatsapp: card.whatsapp,
            linkedin: card.linkedin,
            website: card.website,
            photo_url: card.photo_url || displayData?.photo_url || null,
            about: card.about || displayData?.about || null,
            synka_user_id: profile.user_id,
            shared_card_id: card.id,
            source: 'synka_exchange',
            notes_history: [{
              text: 'Connected via Synka Exchange',
              timestamp: new Date().toISOString(),
            }],
          })
          .select('id')
          .single();
        
        viewerContactId = newContact?.id;
      }

      // Tag viewer's contact with "Synka Exchange"
      if (viewerContactId && viewerTagId) {
        await supabase
          .from('contact_tags')
          .upsert({ 
            contact_id: viewerContactId, 
            tag_id: viewerTagId 
          }, { 
            onConflict: 'contact_id,tag_id' 
          });
      }

      // 2. SAVE VIEWER → OWNER CRM (using SECURITY DEFINER function)
      const { data: exchangeResult, error: exchangeError } = await supabase.rpc('mutual_exchange_contact', {
        p_owner_id: profile.user_id,
        p_viewer_id: user.id,
        p_viewer_email: viewerIdentity.email,
        p_viewer_name: viewerIdentity.name,
        p_viewer_phone: viewerIdentity.phone || null,
        p_viewer_whatsapp: viewerIdentity.whatsapp || null,
        p_viewer_company: viewerIdentity.company || null,
        p_viewer_designation: viewerIdentity.designation || null,
        p_viewer_linkedin: viewerIdentity.linkedin || null,
        p_viewer_website: viewerIdentity.website || null,
        p_viewer_photo_url: viewerIdentity.photo_url || null,
        p_viewer_about: viewerIdentity.about || null,
        p_viewer_synka_user_id: user.id,
        p_viewer_shared_card_id: viewerCard?.id || null,
      });

      if (exchangeError) {
        console.error('Mutual exchange error:', exchangeError);
        throw new Error('Failed to save your contact to owner\'s CRM');
      }

      console.log('Mutual exchange result:', exchangeResult);

      setSharedBack(true);

      // 3. Log analytics
      await logContactSave(profile.user_id, card?.id || null);

      // 4. Success - Show premium confirmation sheet (not full-screen)
      await hapticFeedback.success();
      setExchangeButtonSaved(true);
      setShowExchangeSuccess(true);
      
    } catch (error) {
      console.error('Exchange error:', error);
      toast({
        title: 'Save failed',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setExchangeInProgress(false);
    }
  };

  // Handle contact submit from sheet
  const handleContactSubmit = async (data: ContactFormData) => {
    if (!profile) return;

    const formData = {
      name: `${data.firstName} ${data.lastName}`.trim(),
      company: data.company,
      designation: data.designation,
      email: data.email,
      phone: data.phone,
      whatsapp: data.phone,
      linkedin: data.linkedin || '',
      notes: '',
    };

    const { error } = await submitPublicContact(profile.user_id, formData);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit your contact. Please try again.',
        variant: 'destructive',
      });
      throw error;
    } else {
      setContactShared(true);
      triggerPostActionCta();
      toast({
        title: 'Contact shared!',
        description: `Your contact has been sent to ${displayData?.name}.`,
      });
    }
  };

  // Handle skip from sheet
  const handleContactSkip = () => {
    triggerPostActionCta();
  };

  // Trigger post-action CTA (now permanent)
  const triggerPostActionCta = () => {
    setShowPostActionCta(true);
    // Keep it permanent - no timeout
  };

  // Save contact and open share sheet (for non-Synka users)
const saveContactAndShare = async () => {
  if (!displayData || !profile) return;
  
  // Haptic feedback
  await hapticFeedback.light();

  // Use native contact save - opens "Add to Contacts" dialog on mobile
  // Flow: 1) Try native direct save, 2) Share API vCard, 3) Web vCard download
  const result = await saveContactToPhone({
    name: displayData.name,
    company: displayData.company,
    designation: displayData.designation,
    phone: displayData.phone,
    email: displayData.email,
    website: displayData.website,
    whatsapp: displayData.whatsapp,
    about: displayData.about,
    photo_url: displayData.photo_url,
  });

  // Show appropriate toast based on save method
  if (result.success) {
    // Log the contact save event
    await logContactSave(profile.user_id, card?.id || null);
    
    const firstName = displayData.name.split(' ')[0];
    
    // Show toast ONLY for vCard download after download completes
    if (result.method === 'vcard') {
      // Toast shows AFTER download is triggered (promise resolved)
      toast({
        title: `${firstName}'s contact ready`,
        description: `Open the downloaded file to save to contacts.`,
        duration: 2000,
      });
    } else if (result.method === 'native') {
      // Native save completed silently
      toast({
        title: 'Contact saved',
        description: `${firstName} added to your contacts.`,
        duration: 2000,
      });
    }
    // No toast for 'share' method - Share sheet is self-explanatory

    // Open contact share sheet after save completes
    // Longer delay for vCard to ensure file is processed
    const delay = result.method === 'vcard' ? 800 : 300;
    setTimeout(() => {
      setShowContactSheet(true);
    }, delay);
  } else {
    toast({
      title: 'Could not save contact',
      description: 'Please try again.',
      variant: 'destructive',
    });
  }
};

  const shareCard = async () => {
    navigator.vibrate?.(10);
    
    if (!displayData || !slug) return;

    const shareUrl = getPublicCardUrl(slug);

    // Native platform share (Capacitor)
    if (Capacitor.isNativePlatform()) {
      try {
        await Share.share({
          url: shareUrl,
        });
        return;
      } catch (err) {
        console.error('Native share error:', err);
      }
    }

    // Web Share API
    if (navigator.share) {
      try {
        await navigator.share({
          url: shareUrl,
        });
        return;
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.log('Share failed:', err);
        }
      }
    }

    // Fallback: copy URL to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: 'Link copied!',
        description: 'Card link copied to clipboard.',
      });
    } catch (err) {
      toast({
        title: 'Share this link:',
        description: shareUrl,
        variant: 'default',
      });
    }
  };

  if (loading) {  // ✅ Remove || authLoading
  return (
    <div className="min-h-dvh w-full flex items-center justify-center bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

  if (!displayData || !displayData.name) {
    return (
      <div className="min-h-dvh w-full flex flex-col items-center justify-center bg-background p-4 sm:p-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <h1 className="text-2xl font-bold text-foreground mb-2">Card not found</h1>
        <p className="text-muted-foreground mb-6">This card doesn't exist or has been removed.</p>
        <Link to="/">
          <Button variant="gradient">Go to Synka</Button>
        </Link>
      </div>
    );
  }

  const firstName = displayData.name.split(' ')[0];

  return (
    <div className="min-h-dvh w-full max-w-full overflow-x-hidden bg-background pt-[env(safe-area-inset-top)] pb-[calc(5rem+env(safe-area-inset-bottom))]">
      {/* Smart App Banner */}
      <SmartAppBanner slug={slug} />
      
      {/* Contact Share Sheet */}
      <ContactShareSheet
        open={showContactSheet}
        onOpenChange={setShowContactSheet}
        ownerName={firstName}
        ownerPhotoUrl={displayData.photo_url}
        onSubmit={handleContactSubmit}
        onSkip={handleContactSkip}
      />
      
      {/* Exchange Success Sheet - Premium non-disruptive confirmation */}
      <ExchangeSuccessSheet
        open={showExchangeSuccess}
        onOpenChange={setShowExchangeSuccess}
        ownerName={displayData.name}
        ownerPhotoUrl={displayData.photo_url}
        sharedBack={sharedBack}
      />
      
      <div className="w-full max-w-lg mx-auto py-4 sm:py-6 px-3 sm:px-4 space-y-4 sm:space-y-6 animate-fade-up">
        {/* Card View */}
        <div className="bg-card/95 backdrop-blur-xl rounded-3xl border border-border/40 shadow-[0_20px_40px_rgba(0,0,0,0.06)] overflow-hidden">
          {/* Photo & Logo Section */}
          <div className="relative pb-4 flex flex-col items-center">
            <CardImageSection
              layout={(card?.layout as LayoutType) || 'photo-logo'}
              photoUrl={displayData.photo_url}
              logoUrl={displayData.logo_url}
              name={displayData.name}
              designation={displayData.designation}
              company={displayData.company}
              themeColor={card?.card_design}
              faceX={card?.face_x}
              faceY={card?.face_y}
              logoX={card?.logo_x}
              logoY={card?.logo_y}
            />

            {(card?.layout as LayoutType) !== 'photo-only' && (
  <div className="text-center mt-4 space-y-1">
    <h2 className="text-[22px] font-semibold tracking-tight text-foreground">
      {displayData.name}
    </h2>
    {displayData.designation && (
      <p className="text-[14.5px] font-normal text-muted-foreground leading-tight">
        {displayData.designation}
      </p>
    )}
    {displayData.company && (
      <p className="text-[13.5px] text-muted-foreground/70 leading-tight">
        {displayData.company}
      </p>
    )}
  </div>
)}
          </div>

          <div className="mx-6 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />

          {/* Contact Section */}
          <div className="p-6 space-y-2">
            {displayData.phone && (
              <ContactRow icon={Phone} label="Mobile" value={formatPhoneByCountry(displayData.phone)} href={`tel:${displayData.phone}`} />
            )}
            {displayData.email && (
              <ContactRow icon={Mail} label="Email" value={displayData.email} href={`mailto:${displayData.email}`} />
            )}
            {displayData.website && (
              <ContactRow 
                icon={Globe} 
                label="Website" 
                value="Visit Website" 
                href={displayData.website} 
              />
            )}
            {displayData.whatsapp && (
              <ContactRow
                icon={FaWhatsapp}
                label="WhatsApp"
                value="Connect on WhatsApp"
                href={getWhatsappLink(displayData.whatsapp)}
                iconClass="text-foreground/80 group-hover:text-[#25D366]"
              />
            )}
            {/* Document Link */}
            <DocumentLinks
              documentName={card?.document_name || null}
              documentUrl={card?.document_url || null}
            />
            {displayData.linkedin && (
              <ContactRow 
                icon={Linkedin} 
                label="LinkedIn" 
                value="Connect on LinkedIn" 
                href={displayData.linkedin.startsWith('http') ? displayData.linkedin : `https://www.linkedin.com/in/${displayData.linkedin}`} 
                iconClass="text-foreground/80 group-hover:text-blue-600" 
              />
            )}
            {/* Social Links */}
            {(card as any)?.instagram && (
              <SocialLinkChip platform="instagram" url={(card as any).instagram} />
            )}
            {(card as any)?.youtube && (
              <SocialLinkChip platform="youtube" url={(card as any).youtube} />
            )}
            {(card as any)?.twitter && (
              <SocialLinkChip platform="twitter" url={(card as any).twitter} />
            )}
            {(card as any)?.facebook && (
              <SocialLinkChip platform="facebook" url={(card as any).facebook} />
            )}
            {(card as any)?.calendly && (
              <SocialLinkChip platform="calendly" url={(card as any).calendly} />
            )}
          </div>

          {/* Action Buttons - Apple Style: One Primary + Small Share Icon */}
          <div className="px-6 pb-6">
            <div className="flex items-center gap-2">
              {/* SYNKA USER: Show Save to CRM (ONE-TAP MAGIC) */}
              {isViewerSynkaUser && !isOwnCard ? (
                <Button 
                  variant={exchangeButtonSaved ? "outline" : "gradient"}
                  className={cn(
                    "flex-1 h-12 font-medium tracking-tight transition-all",
                    exchangeButtonSaved && "border-primary/40 bg-primary/5"
                  )}
                  onClick={handleSynkaExchange}
                  disabled={exchangeInProgress || exchangeButtonSaved}
                >
                  {exchangeInProgress ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                      Saving...
                    </>
                  ) : exchangeButtonSaved ? (
                    <>
                      <Check className="h-4 w-4 mr-2 text-primary" />
                      <span className="text-primary">Saved</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Save to My Synka
                    </>
                  )}
                </Button>
              ) : isOwnCard ? (
                // Own card - just Save Contact
                <Button 
                  variant="gradient" 
                  className="flex-1 h-12 font-medium tracking-tight" 
                  onClick={saveContactAndShare}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Save Contact
                </Button>
              ) : (
                // NON-SYNKA USER: Save Contact (downloads VCF + opens sheet)
                <Button 
                  variant="gradient" 
                  className="flex-1 h-12 font-medium tracking-tight" 
                  onClick={saveContactAndShare}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Save Contact
                </Button>
              )}

              {/* Share Icon Button - Circular, subtle */}
              <button
                onClick={shareCard}
                className="h-12 w-12 flex-shrink-0 rounded-full border border-border/60 bg-background hover:bg-muted/50 flex items-center justify-center transition-all active:scale-95"
                aria-label="Share card"
              >
                <Share2 className="h-5 w-5 text-foreground/70" />
              </button>
            </div>

            {/* Subtitle for Synka users */}
            {isViewerSynkaUser && !isOwnCard && !exchangeButtonSaved && (
              <p className="text-[11px] text-muted-foreground text-center mt-2">
                Saves to your CRM and shares your card back
              </p>
            )}
          </div>
        </div>

        {/* About Section */}
        {displayData.about && (
          <div className="p-5 rounded-2xl bg-muted/30 border border-border/40">
            <h3 className="font-semibold text-foreground mb-2">About</h3>
            <p className="text-muted-foreground text-sm whitespace-pre-line">{displayData.about}</p>
          </div>
        )}

        {/* Post-Action Permanent CTA with AI Icon */}
        {showPostActionCta && !isViewerSynkaUser && (
          <div className="text-center py-3">
            <Link 
              to="/signup" 
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Sparkles className="h-4 w-4 animate-pulse text-primary/70" />
              Create your free Synka card
            </Link>
          </div>
        )}

        {/* CTA for Synka users viewing their own card */}
        {isOwnCard && (
          <div className="text-center py-4">
            <Link to="/my-card">
              <Button variant="outline" className="w-full active:scale-[0.97] transition-transform">
                Edit My Card
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
