import { useState, useRef } from 'react';
import { useEffect } from 'react';
import { Send, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Blinq-style input with border-floating label - pure CSS, no transitions that cause keyboard jumps
// Uses peer-placeholder-shown for label animation without React state or JS transitions
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
        name={`field-${label.replace(/\s/g, '').toLowerCase()}`}
        type={type}
        inputMode={inputMode}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        data-form-type="other"
        enterKeyHint="next"
        value={value}
        onChange={onChange}
        placeholder=" "
        className="peer absolute inset-0 w-full h-full px-4 pt-4 pb-2 text-base bg-transparent outline-none rounded-xl border border-border focus:border-foreground"
        style={{ fontSize: '16px' }}
      />
      <label
        className="absolute left-4 text-muted-foreground pointer-events-none
          top-0 -translate-y-1/2 text-xs bg-background
          peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:bg-transparent
          peer-focus:top-0 peer-focus:text-xs peer-focus:bg-background"
      >
        {label}
      </label>
    </div>
  );
};

// Pill input with floating label for Job Title and Company - pure CSS, no JS transitions
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
        name={`pill-${label.replace(/\s/g, '').toLowerCase()}`}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        data-form-type="other"
        enterKeyHint="next"
        value={value}
        onChange={onChange}
        placeholder=" "
        className="peer w-full h-full rounded-full border border-border px-4 text-sm outline-none bg-transparent focus:border-foreground"
        style={{ fontSize: '16px' }}
      />
      <label
        className="absolute left-4 text-muted-foreground pointer-events-none
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

// Parse a raw phone string from scan into { code, number }
// Matches against COUNTRY_CODES longest-first so "+971..." matches UAE before "+97..." etc.
function parseScanPhone(raw: string): { code: string; number: string } | null {
  if (!raw) return null;
  // Strip spaces/dashes, keep +
  const cleaned = raw.replace(/[\s\-()]/g, '');
  if (!cleaned) return null;

  // Sort codes longest first so +971 matches before +97
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);

  // Try matching with + prefix
  const withPlus = cleaned.startsWith('+') ? cleaned : '+' + cleaned;
  for (const { code } of sorted) {
    if (withPlus.startsWith(code)) {
      const number = withPlus.slice(code.length).replace(/\D/g, '');
      if (number.length > 0) return { code, number };
    }
  }

  // Nothing matched — return digits only, keep current country code
  return { code: '', number: cleaned.replace(/\D/g, '') };
}

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
  
  // Animation state - keeps sheet mounted during exit animation
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      // Delay unmount to allow exit animation
      const t = setTimeout(() => setMounted(false), 300);
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      return () => clearTimeout(t);
    }

    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [open]);
  
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

        // Parse phone separately so we can update countryCode state too
        if (contact.phone) {
          const parsed = parseScanPhone(contact.phone);
          if (parsed) {
            if (parsed.code) setCountryCode(parsed.code);
            setFormData(prev => ({ ...prev, phone: parsed.number }));
          }
        }

        setFormData(prev => ({
          ...prev,
          firstName: firstName || prev.firstName,
          lastName: lastName || prev.lastName,
          email: contact.email || prev.email,
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
      {/* EXACT BLINQ HEADER with parallax effect */}
      <div 
        className="px-4 pt-5 pb-4"
        style={{ transform: 'translateY(calc(var(--scrollY, 0px) * -0.2))' }}
      >
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
      <div className="space-y-4 px-4 pb-4">
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

        {/* Phone input with floating label */}
<div className="relative h-14 rounded-xl border border-border focus-within:border-foreground flex items-center">

  {/* Country code selector */}
  <div className="flex items-center justify-center pl-3 pr-1 shrink-0 border-r border-border/50 h-full">
    <select
      name="field-country"
      value={countryCode}
      onChange={(e) => setCountryCode(e.target.value)}
      autoComplete="off"
      data-form-type="other"
      className="bg-transparent text-sm font-medium outline-none appearance-none cursor-pointer"
      style={{ fontSize: '14px' }}
    >
      {COUNTRY_CODES.map(({ code }) => (
        <option key={code} value={code} className="bg-background text-foreground">
          {code}
        </option>
      ))}
    </select>
  </div>

  {/* Phone number input */}
  <input
    name="field-phone"
    type="tel"
    inputMode="numeric"
    autoComplete="off"
    autoCorrect="off"
    autoCapitalize="none"
    spellCheck={false}
    data-form-type="other"
    enterKeyHint="done"
    value={formData.phone}
    onChange={(e) =>
      setFormData(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))
    }
    placeholder=" "
    className="peer flex-1 min-w-0 h-full px-3 pt-4 pb-2 text-base bg-transparent outline-none"
    style={{ fontSize: '16px', scrollMarginTop: 16 }}
  />

  {/* Floating label */}
  <label
    className="absolute left-[72px] text-muted-foreground pointer-events-none
      top-0 -translate-y-1/2 text-xs bg-background px-1
      peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:bg-transparent peer-placeholder-shown:px-0
      peer-focus:top-0 peer-focus:text-xs peer-focus:bg-background peer-focus:px-1"
  >
    Phone number
  </label>
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
        </div>
    </>
  );

  if (isMobile && mounted) {
    return (
      <>
        {/* Animated Backdrop - fades in/out */}
        <div
          className={`fixed inset-0 z-40 transition-opacity duration-300 ${
            open ? 'bg-black/30 opacity-100' : 'bg-black/0 opacity-0'
          }`}
          onClick={() => onOpenChange(false)}
        />

        {/* Bottom Sheet Shell */}
        <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center pointer-events-none">
          {/* Animated Sheet - slides up with spring curve */}
          <div
            className={`w-full max-w-md bg-background rounded-t-3xl shadow-2xl pointer-events-auto overflow-hidden
              transform transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
              ${open ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
            `}
          >
            {/* SCROLLABLE CONTENT with staggered fade animation + parallax */}
            <div
              className={`overflow-y-auto transition-all duration-500 delay-100
                ${open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
              `}
              style={{ 
                WebkitOverflowScrolling: 'touch',
                maxHeight: 'calc(85dvh - 120px)',
              }}
              onScroll={(e) => {
                const y = e.currentTarget.scrollTop;
                e.currentTarget.style.setProperty('--scrollY', `${Math.min(y, 20)}px`);
              }}
            >
              <BlinqHeader />
              {FormContent}
            </div>

            {/* FIXED FOOTER */}
            <div
              className="px-4 pt-5 border-t bg-background"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
            >
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                variant="gradient"
                className="w-full h-14 rounded-xl text-white text-base font-medium active:scale-[0.98] transition-transform"
              >
                {submitting ? 'Sending...' : 'Send'}
              </Button>

              <p className="text-[11px] text-center text-muted-foreground/70 mt-3">
                We don't sell your contact details
              </p>
            </div>
          </div>
        </div>
      </>
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
