import { useState, useRef, useEffect } from 'react';
import { Send, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Blinq-style input with border-floating label - defined outside component to prevent re-render focus loss
// IMPORTANT: Default state is "has value" (label at top), CSS overrides when empty via peer-placeholder-shown
// This eliminates race conditions between React state and CSS on first interaction
const BlinqInput = ({
  label,
  value,
  onChange,
  type = 'text',
  inputMode,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  inputMode?: 'text' | 'email' | 'tel' | 'numeric';
  autoComplete?: string;
}) => {
  return (
    <div className="relative h-14">
      <input
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        placeholder=" "
        className="peer absolute inset-0 w-full h-full px-4 pt-5 pb-2 text-base bg-transparent outline-none rounded-xl border border-border focus:border-foreground transition-colors"
        style={{ fontSize: '16px' }}
      />
      <label
        className="absolute left-4 text-muted-foreground pointer-events-none transition-all duration-200
          top-0 -translate-y-1/2 text-xs bg-background
          peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:bg-transparent
          peer-focus:top-0 peer-focus:text-xs peer-focus:bg-background"
      >
        {label}
      </label>
    </div>
  );
};

// Pill input with floating label for Job Title and Company - same CSS-first pattern
const PillInput = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => {
  return (
    <div className="relative h-10">
      <input
        value={value}
        onChange={onChange}
        placeholder=" "
        className="peer w-full h-full rounded-full border border-border px-4 text-sm outline-none bg-transparent focus:border-foreground"
        style={{ fontSize: '16px' }}
      />
      <label
        className="absolute left-4 text-muted-foreground pointer-events-none transition-all duration-200
          top-0 -translate-y-1/2 text-[10px] bg-background
          peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:bg-transparent
          peer-focus:top-0 peer-focus:text-[10px] peer-focus:bg-background"
      >
        {label}
      </label>
    </div>
  );
};

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

// Comprehensive country codes list
const COUNTRY_CODES = [
  { code: '+91', country: 'India' },
  { code: '+1', country: 'United States' },
  { code: '+44', country: 'United Kingdom' },
  { code: '+61', country: 'Australia' },
  { code: '+971', country: 'UAE' },
  { code: '+966', country: 'Saudi Arabia' },
  { code: '+65', country: 'Singapore' },
  { code: '+81', country: 'Japan' },
  { code: '+86', country: 'China' },
  { code: '+82', country: 'South Korea' },
  { code: '+49', country: 'Germany' },
  { code: '+33', country: 'France' },
  { code: '+39', country: 'Italy' },
  { code: '+34', country: 'Spain' },
  { code: '+31', country: 'Netherlands' },
  { code: '+41', country: 'Switzerland' },
  { code: '+46', country: 'Sweden' },
  { code: '+47', country: 'Norway' },
  { code: '+45', country: 'Denmark' },
  { code: '+358', country: 'Finland' },
  { code: '+43', country: 'Austria' },
  { code: '+32', country: 'Belgium' },
  { code: '+48', country: 'Poland' },
  { code: '+420', country: 'Czech Republic' },
  { code: '+36', country: 'Hungary' },
  { code: '+351', country: 'Portugal' },
  { code: '+30', country: 'Greece' },
  { code: '+353', country: 'Ireland' },
  { code: '+7', country: 'Russia' },
  { code: '+380', country: 'Ukraine' },
  { code: '+90', country: 'Turkey' },
  { code: '+972', country: 'Israel' },
  { code: '+20', country: 'Egypt' },
  { code: '+27', country: 'South Africa' },
  { code: '+234', country: 'Nigeria' },
  { code: '+254', country: 'Kenya' },
  { code: '+55', country: 'Brazil' },
  { code: '+52', country: 'Mexico' },
  { code: '+54', country: 'Argentina' },
  { code: '+57', country: 'Colombia' },
  { code: '+56', country: 'Chile' },
  { code: '+51', country: 'Peru' },
  { code: '+58', country: 'Venezuela' },
  { code: '+60', country: 'Malaysia' },
  { code: '+62', country: 'Indonesia' },
  { code: '+63', country: 'Philippines' },
  { code: '+66', country: 'Thailand' },
  { code: '+84', country: 'Vietnam' },
  { code: '+92', country: 'Pakistan' },
  { code: '+880', country: 'Bangladesh' },
  { code: '+94', country: 'Sri Lanka' },
  { code: '+977', country: 'Nepal' },
  { code: '+64', country: 'New Zealand' },
  { code: '+974', country: 'Qatar' },
  { code: '+968', country: 'Oman' },
  { code: '+973', country: 'Bahrain' },
  { code: '+965', country: 'Kuwait' },
];

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

  const normalizeLinkedInUrl = (value: string) => {
    let v = value.trim();
    if (!v) return '';
    
    v = v.replace(/^https?:\/\//, '');
    
    if (v.includes('linkedin.com')) {
      return `https://${v}`;
    }
    
    return `https://linkedin.com/in/${v}`;
  };

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
      // Only include country code if phone number is not empty
      const phoneValue = formData.phone.trim() ? `${countryCode}${formData.phone.trim()}` : '';
      
      await onSubmit({
        ...formData,
        phone: phoneValue,
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
      {/* EXACT BLINQ HEADER - NO BORDER AT BOTTOM */}
      <div className="px-4 pt-5 pb-4">
        {/* SCAN & SKIP ROW - EXACTLY LIKE BLINQ */}
        <div className="flex justify-between items-center mb-5">
          {/* Scan button aligned left like Blinq */}
          <button
            onClick={handleScanBusinessCard}
            disabled={scanState === 'uploading' || scanState === 'processing'}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Camera className="w-4 h-4" />
            <span className="font-medium">Scan</span>
          </button>
          
          {/* Skip button at top right with tight spacing */}
          <button
            onClick={handleSkip}
            className="text-sm font-semibold text-foreground hover:text-muted-foreground transition-colors"
          >
            Skip
          </button>
        </div>
        
        {/* PROFILE AND TITLE - EXACTLY LIKE BLINQ */}
        <div className="flex items-start gap-3">
          {/* LARGE PROFILE PHOTO - EXACT SIZE AS BLINQ */}
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
            {/* SHARE ICON BADGE - EXACTLY LIKE BLINQ */}
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-background rounded-full shadow-md flex items-center justify-center border border-border">
              <Send className="w-3.5 h-3.5 text-destructive" />
            </div>
          </div>
          
          {/* TITLE TEXT - EXACT FONT AND SPACING AS BLINQ */}
          <div className="flex-1 min-w-0">
            <h2 className="text-[18px] font-bold text-foreground leading-tight -mt-0.5 break-words">
              Share your contact information with {ownerName}
            </h2>
          </div>
        </div>
      </div>
    </>
  );

  // Form content rendered inline to prevent re-mount issues
  const FormContent = (
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

      {/* FORM FIELDS CONTAINER */}
      <div className="space-y-4 px-4 pb-6">
        {/* FIRST + LAST NAME */}
        <div className="grid grid-cols-2 gap-3">
          <BlinqInput
            label="First name"
            value={formData.firstName}
            onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
          />
          <BlinqInput
            label="Last name"
            value={formData.lastName}
            onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
          />
        </div>

        {/* EMAIL - Wrapped in grid like name fields for layout stability */}
        <div className="grid grid-cols-1">
          <BlinqInput
            label="Email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          />
        </div>

        <div className="h-14 rounded-xl border border-border focus-within:border-foreground transition-colors flex items-center overflow-hidden">
          {/* Country code selector */}
          <div className="flex items-center px-3 h-full border-r border-border shrink-0">
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="bg-transparent text-sm font-medium outline-none appearance-none cursor-pointer"
            >
              {COUNTRY_CODES.map(({ code }) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </div>
          {/* Phone number input */}
          <input
  type="tel"
  inputMode="numeric"
  autoComplete="off"
  enterKeyHint="done"
  value={formData.phone}
  onChange={(e) =>
    setFormData(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))
  }
  placeholder="Phone number"
  className="flex-1 h-full px-4 text-base outline-none bg-transparent"
  style={{ fontSize: '16px' }}
/>
        </div>

        {/* JOB + COMPANY PILLS - NOW WITH FLOATING LABELS */}
        <div className="grid grid-cols-2 gap-2">
          <PillInput
            label="Role"
            value={formData.designation}
            onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
          />
          <PillInput
            label="Company Name"
            value={formData.company}
            onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
          />
        </div>

        {/* SEND BUTTON WITH GRADIENT */}
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          variant="gradient"
          className="w-full h-14 rounded-xl text-white text-base font-medium mt-6 hover:opacity-90 transition-opacity"
        >
          {submitting ? 'Sending...' : 'Send'}
        </Button>

        <p className="text-[11px] text-center text-muted-foreground/70 mt-4">
          We don't sell your contact details
        </p>
      </div>
    </>
  );

  if (isMobile) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} handleOnly>
      <DrawerContent className="flex flex-col h-full" hideHandle>
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <BlinqHeader />
          {FormContent}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden" hideCloseButton>
        {/* Desktop layout remains unchanged */}
        <BlinqHeader />
        {FormContent}
      </DialogContent>
    </Dialog>
  );
}
