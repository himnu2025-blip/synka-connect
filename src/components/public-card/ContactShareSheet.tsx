import { useState, useRef } from 'react';
import { Send, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [countryCode, setCountryCode] = useState('+91');
  const [focusedField, setFocusedField] = useState<string | null>(null);
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

  // Blinq-style input with border-floating label
  const BlinqInput = ({ 
    label, 
    value, 
    onChange, 
    type = 'text',
    placeholder = '',
    name,
    className = ''
  }: {
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    placeholder?: string;
    name: string;
    className?: string;
  }) => {
    const isFocused = focusedField === name;
    const hasValue = value.length > 0;
    const showLabel = isFocused || hasValue;

    return (
      <div className={`relative ${className}`}>
        <div className={`relative h-14 rounded-xl border ${isFocused ? 'border-primary' : 'border-border'} transition-colors`}>
          {/* Floating label on border - FIXED: Always show when has value */}
          <div 
            className={`absolute -top-2 left-3 px-1 transition-all duration-200 ${
              showLabel 
                ? 'text-xs text-muted-foreground bg-white' 
                : 'text-transparent'
            }`}
          >
            {label}
          </div>
          
          <input
            type={type}
            value={value}
            onChange={onChange}
            onFocus={() => setFocusedField(name)}
            onBlur={() => setFocusedField(null)}
            placeholder={placeholder}
            className="w-full h-full px-4 text-base bg-transparent outline-none rounded-xl placeholder:text-muted-foreground"
            name={name}
          />
        </div>
      </div>
    );
  };

  const Content = (
    <div className="space-y-4 px-4 pb-8">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* FIRST + LAST NAME */}
      <div className="grid grid-cols-2 gap-3">
        <BlinqInput
          label="First name"
          value={formData.firstName}
          onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
          name="firstName"
          placeholder="Hello"
        />
        <BlinqInput
          label="Last name"
          value={formData.lastName}
          onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
          name="lastName"
          placeholder="Ji"
        />
      </div>

      {/* EMAIL */}
      <BlinqInput
        label="Email"
        value={formData.email}
        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
        type="email"
        name="email"
        placeholder="your@email.com"
      />

      {/* PHONE NUMBER - Clean and simple */}
      <div className="space-y-1">
        <div className={`relative h-14 rounded-xl border ${focusedField === 'phone' ? 'border-primary' : 'border-border'} transition-colors`}>
          {/* Floating label on border for phone */}
          <div 
            className={`absolute -top-2 left-3 px-1 transition-all duration-200 ${
              (focusedField === 'phone' || formData.phone) 
                ? 'text-xs text-muted-foreground bg-white' 
                : 'text-transparent'
            }`}
          >
            Phone number
          </div>
          
          <div className="flex items-center h-full">
            <div className="flex items-center gap-2 px-4 h-full border-r border-border">
              <span className="text-base">🇮🇳</span>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="bg-transparent text-sm font-medium outline-none appearance-none pr-2"
              >
                <option value="+91">+91</option>
                <option value="+1">+1</option>
                <option value="+44">+44</option>
                <option value="+61">+61</option>
              </select>
            </div>
            <input
              ref={phoneInputRef}
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))
              }
              onFocus={() => setFocusedField('phone')}
              onBlur={() => setFocusedField(null)}
              placeholder="87006 97970"
              className="flex-1 h-full px-4 text-base outline-none bg-transparent placeholder:text-muted-foreground"
              inputMode="numeric"
              pattern="[0-9]*"
            />
          </div>
        </div>
      </div>

      {/* JOB + COMPANY PILLS - SMALL LIKE BLINQ */}
      <div className="grid grid-cols-2 gap-2">
        <div className="relative">
          <input
            value={formData.designation}
            onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
            placeholder="+ Job title"
            className="w-full h-10 rounded-full border border-border text-sm px-3 focus:outline-none focus:border-primary placeholder:text-muted-foreground placeholder:text-sm"
            onFocus={() => setFocusedField('designation')}
            onBlur={() => setFocusedField(null)}
          />
        </div>
        <div className="relative">
          <input
            value={formData.company}
            onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
            placeholder="+ Company name"
            className="w-full h-10 rounded-full border border-border text-sm px-3 focus:outline-none focus:border-primary placeholder:text-muted-foreground placeholder:text-sm"
            onFocus={() => setFocusedField('company')}
            onBlur={() => setFocusedField(null)}
          />
        </div>
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
  );

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
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Camera className="w-4 h-4" />
            <span className="font-medium">Scan</span>
          </button>
          
          {/* Skip button at top right with tight spacing */}
          <button
            onClick={handleSkip}
            className="text-sm font-semibold text-gray-900 hover:text-gray-700 transition-colors"
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
                className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-sm"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center border-2 border-white shadow-sm">
                <span className="text-xl font-semibold text-blue-600">
                  {ownerName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            {/* SHARE ICON BADGE - EXACTLY LIKE BLINQ */}
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full shadow-md flex items-center justify-center border border-gray-200">
              <Send className="w-3.5 h-3.5 text-red-500" />
            </div>
          </div>
          
          {/* TITLE TEXT - EXACT FONT AND SPACING AS BLINQ */}
          <div className="flex-1 min-w-0">
            <h2 className="text-[18px] font-bold text-gray-900 leading-tight -mt-0.5 break-words">
              Share your contact information with {ownerName}
            </h2>
          </div>
        </div>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="pb-8">
          {/* Simple Drawer without complex keyboard handling */}
          <div className="max-h-[90vh] overflow-y-auto">
            <DrawerHeader className="p-0 sticky top-0 bg-white z-10">
              <BlinqHeader />
            </DrawerHeader>
            
            <div className="pt-4">
              {Content}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden" hideCloseButton>
        <BlinqHeader />
        
        <div className="overflow-y-auto max-h-[60vh]">
          {Content}
        </div>
      </DialogContent>
    </Dialog>
  );
}
