import { useState, useRef, useEffect } from 'react';
import { Send, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { FloatingInput, FloatingPhoneInput } from '@/components/ui/floating-input';

interface ContactShareSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerName: string;
  ownerPhotoUrl?: string;
  onSubmit: (data: ContactFormData) => Promise<void>;
  onSkip: () => void;
}

export interface ContactFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  designation: string;
  company: string;
  linkedin?: string;
}

type ScanState = 'idle' | 'uploading' | 'processing' | 'success' | 'failed';

export function ContactShareSheet({
  open,
  onOpenChange,
  ownerName,
  ownerPhotoUrl,
  onSubmit,
  onSkip,
}: ContactShareSheetProps) {
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [countryCode, setCountryCode] = useState('+91');
  
  const [formData, setFormData] = useState<ContactFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    designation: '',
    company: '',
    linkedin: '',
  });

  // Visual Viewport API for keyboard-safe height
  useEffect(() => {
    if (!isMobile || !open) return;

    const updateHeight = () => {
      // Use visualViewport.height if available, fallback to innerHeight
      const height = window.visualViewport?.height || window.innerHeight;
      setVh(height);
    };

    updateHeight();

    // Listen to visual viewport changes (keyboard open/close)
    window.visualViewport?.addEventListener('resize', updateHeight);
    window.addEventListener('orientationchange', updateHeight);

    return () => {
      window.visualViewport?.removeEventListener('resize', updateHeight);
      window.removeEventListener('orientationchange', updateHeight);
    };
  }, [isMobile, open]);

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (!open) return;
    
    if (isMobile) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open, isMobile]);

  const handleSubmit = async () => {
    if (!formData.firstName.trim()) {
      toast({
        title: 'First name is required',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        phone: `${countryCode}${formData.phone}`,
      });
      onOpenChange(false);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        designation: '',
        company: '',
        linkedin: '',
      });
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    onSkip();
    onOpenChange(false);
  };

  const handleScanBusinessCard = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanState('uploading');

    try {
      const [{ fileToOptimizedBase64 }] = await Promise.all([
        import('@/lib/imageOptimization')
      ]);
      
      setScanState('processing');
      const base64 = await fileToOptimizedBase64(file);
      
      const { data, error } = await supabase.functions.invoke('scan-business-card', {
        body: { image: base64 }
      });

      if (error) throw error;

      if (data?.success && data?.contact) {
        const contact = data.contact;
        const nameParts = (contact.name || '').split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        setScanState('success');
        setFormData(prev => ({
          firstName: firstName || prev.firstName,
          lastName: lastName || prev.lastName,
          email: contact.email || prev.email,
          phone: contact.phone || prev.phone,
          designation: contact.designation || prev.designation,
          company: contact.company || prev.company,
        }));
        
        toast({
          title: 'Card scanned!',
          description: 'Details filled in. Please review.',
        });

        setTimeout(() => setScanState('idle'), 2000);
      } else {
        setScanState('failed');
        toast({
          title: "Couldn't read card",
          description: 'Please enter details manually.',
          variant: 'destructive',
        });
        setTimeout(() => setScanState('idle'), 2000);
      }
    } catch (err) {
      console.error('Scan error:', err);
      setScanState('failed');
      toast({
        title: 'Scan failed',
        description: 'Please enter details manually.',
        variant: 'destructive',
      });
      setTimeout(() => setScanState('idle'), 2000);
    }

    e.target.value = '';
  };

  // Common header component for both mobile and desktop
  const BlinqHeader = () => (
    <>
      <div className="px-4 pt-5 pb-4">
        {/* SCAN & SKIP ROW */}
        <div className="flex justify-between items-center mb-5">
          <button
            onClick={handleScanBusinessCard}
            disabled={scanState === 'uploading' || scanState === 'processing'}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Camera className="w-4 h-4" />
            <span className="font-medium">Scan</span>
          </button>
          
          <button
            onClick={handleSkip}
            className="text-sm font-semibold text-foreground hover:text-muted-foreground transition-colors"
          >
            Skip
          </button>
        </div>
        
        {/* PROFILE AND TITLE */}
        <div className="flex items-start gap-3">
          <div className="relative flex-shrink-0">
            {ownerPhotoUrl ? (
              <img
                src={ownerPhotoUrl}
                alt={ownerName}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-background shadow-sm"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border-2 border-background shadow-sm">
                <span className="text-xl font-semibold text-primary">
                  {ownerName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-background rounded-full shadow-md flex items-center justify-center border border-border">
              <Send className="w-3.5 h-3.5 text-destructive" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h2 className="text-[18px] font-bold text-foreground leading-tight -mt-0.5 break-words">
              Share your contact information with {ownerName}
            </h2>
          </div>
        </div>
      </div>
    </>
  );

  // Form fields only (no button)
  const FormFields = (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* HIDDEN TRAP FIELDS FOR CHROME AUTOFILL HACK */}
      <input type="text" autoComplete="username" className="hidden" />
      <input type="password" autoComplete="new-password" className="hidden" />

      {/* FORM FIELDS */}
      <div className="space-y-4">
        {/* FIRST + LAST NAME */}
        <div className="grid grid-cols-2 gap-3">
          <FloatingInput
            label="First name"
            value={formData.firstName}
            onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
          />
          <FloatingInput
            label="Last name"
            value={formData.lastName}
            onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
          />
        </div>

        {/* EMAIL */}
        <FloatingInput
          label="Email"
          type="email"
          inputMode="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
        />

        {/* PHONE FIELD */}
        <FloatingPhoneInput
          label="Phone number"
          value={formData.phone}
          onChange={(e) =>
            setFormData(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))
          }
          countryCode={countryCode}
          onCountryCodeChange={setCountryCode}
        />

        {/* ROLE + COMPANY */}
        <div className="grid grid-cols-2 gap-3">
          <FloatingInput
            label="Role"
            value={formData.designation}
            onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
          />
          <FloatingInput
            label="Company"
            value={formData.company}
            onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
          />
        </div>
      </div>
    </>
  );

  // Fixed bottom section with Send button
  const FixedBottomSection = (
    <div className="px-4 pb-4 pt-2 bg-background border-t border-border/50">
      <Button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        variant="gradient"
        className="w-full h-14 rounded-xl text-white text-base font-medium hover:opacity-90 transition-opacity"
      >
        {submitting ? 'Sending...' : 'Send'}
      </Button>
      <p className="text-[11px] text-center text-muted-foreground/70 mt-2">
        We don't sell your contact details
      </p>
    </div>
  );

  // ✅ MOBILE — Fullscreen keyboard-safe layout with fixed bottom button
  if (isMobile) {
    if (!open) return null;

    return (
      <div
        className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden"
        style={{ height: vh, maxHeight: vh, touchAction: 'none' }}
      >
        {/* Scrollable content area */}
        <div 
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
          style={{ touchAction: 'pan-y' }}
          onScroll={(e) => {
            const target = e.currentTarget;
            // Prevent over-scrolling at boundaries
            if (target.scrollTop < 0) {
              target.scrollTop = 0;
            }
            const maxScroll = target.scrollHeight - target.clientHeight;
            if (target.scrollTop > maxScroll) {
              target.scrollTop = maxScroll;
            }
          }}
        >
          <BlinqHeader />
          <div className="px-4 pb-4 space-y-4">
            {FormFields}
          </div>
        </div>
        
        {/* Fixed bottom button - outside scroll area, never scrolls */}
        <div 
          className="flex-shrink-0"
          style={{ touchAction: 'none' }}
        >
          {FixedBottomSection}
        </div>
      </div>
    );
  }

  // ✅ DESKTOP — Dialog modal
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden" hideCloseButton>
        <BlinqHeader />
        <div className="px-4 pb-4 space-y-4">
          {FormFields}
        </div>
        {FixedBottomSection}
      </DialogContent>
    </Dialog>
  );
}
