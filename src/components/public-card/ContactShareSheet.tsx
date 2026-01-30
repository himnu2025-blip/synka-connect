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

// Blinq-style input with border-floating label
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
  inputMode?: 'text' | 'email' | 'tel' | 'numeric' | 'decimal';
  autoComplete?: string;
}) => {
  return (
    <div className="relative min-h-[56px]">
      <input
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        placeholder=" "
        className="peer w-full h-full px-4 pt-5 pb-2 text-base bg-transparent outline-none rounded-xl border border-border focus:border-foreground transition-colors"
        style={{ 
          fontSize: '16px',
          lineHeight: '1.5',
          paddingTop: '1.25rem',
          paddingBottom: '0.5rem'
        }}
      />
      <label
        className="absolute left-4 text-muted-foreground pointer-events-none transition-all duration-200
          top-0 -translate-y-1/2 text-xs bg-background px-1
          peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:bg-transparent peer-placeholder-shown:px-0
          peer-focus:top-0 peer-focus:text-xs peer-focus:bg-background peer-focus:px-1"
      >
        {label}
      </label>
    </div>
  );
};

// Pill input with floating label
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
    <div className="relative min-h-[40px]">
      <input
        value={value}
        onChange={onChange}
        placeholder=" "
        className="peer w-full h-full rounded-full border border-border px-4 outline-none bg-transparent focus:border-foreground"
        style={{ 
          fontSize: '16px',
          lineHeight: '1.5',
          paddingTop: '0.5rem',
          paddingBottom: '0.5rem'
        }}
      />
      <label
        className="absolute left-4 text-muted-foreground pointer-events-none transition-all duration-200
          top-0 -translate-y-1/2 text-[10px] bg-background px-1
          peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:bg-transparent peer-placeholder-shown:px-0
          peer-focus:top-0 peer-focus:text-[10px] peer-focus:bg-background peer-focus:px-1"
      >
        {label}
      </label>
    </div>
  );
};

// ... rest of the interface definitions remain the same

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

  // ... other functions remain the same

  // Common header component for both mobile and desktop
  const BlinqHeader = () => (
    <>
      <div className="px-4 pt-5 pb-4">
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

  // Form content rendered inline
  const FormContent = (
    <>
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

        {/* EMAIL */}
        <div className="grid grid-cols-1">
          <BlinqInput
            label="Email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            inputMode="email"
            autoComplete="email"
          />
        </div>

        {/* FIXED PHONE INPUT SECTION */}
        <div className="min-h-[56px] rounded-xl border border-border focus-within:border-foreground transition-colors flex items-center">
          {/* Country code selector */}
          <div className="flex items-center px-3 h-full border-r border-border shrink-0">
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="bg-transparent text-base outline-none appearance-none cursor-pointer"
              style={{ fontSize: '16px' }}
            >
              {COUNTRY_CODES.map(({ code }) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </div>
          {/* Phone number input - FIXED */}
          <input
            type="tel"
            inputMode="tel" // Changed from 'numeric' to 'tel' for proper keyboard
            autoComplete="tel"
            value={formData.phone}
            onChange={(e) =>
              setFormData(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))
            }
            placeholder="Phone number"
            className="flex-1 h-full px-4 outline-none bg-transparent"
            style={{ 
              fontSize: '16px',
              lineHeight: '1.5',
              minHeight: '56px'
            }}
          />
        </div>

        {/* JOB + COMPANY PILLS */}
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

        {/* SEND BUTTON */}
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          variant="gradient"
          className="w-full min-h-[56px] rounded-xl text-white text-base font-medium mt-6 hover:opacity-90 transition-opacity"
          style={{ fontSize: '16px' }}
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
        {/* CHANGED: Use h-dvh instead of max-h-safe for drawer */}
        <DrawerContent className="flex flex-col h-dvh" hideHandle>
          {/* CHANGED: Removed scroll-keyboard-safe, let browser handle it */}
          <div className="flex-1 overflow-y-auto touch-pan-y">
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
        <BlinqHeader />
        {FormContent}
      </DialogContent>
    </Dialog>
  );
}
