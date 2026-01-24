import { useState, useRef } from 'react';
import { Send, Camera, Linkedin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
            // FIXED: Show placeholder always (not just when focused)
            placeholder={placeholder}
            className="w-full h-full px-4 text-base bg-transparent outline-none rounded-xl placeholder:text-muted-foreground"
          />
        </div>
      </div>
    );
  };

  const Content = (
    <div className="space-y-4">
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
          placeholder="Hello"  // Shows always
        />
        <BlinqInput
          label="Last name"
          value={formData.lastName}
          onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
          name="lastName"
          placeholder="Ji"  // Shows always
        />
      </div>

      {/* EMAIL */}
      <BlinqInput
        label="Email"
        value={formData.email}
        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
        type="email"
        name="email"
        placeholder="your@email.com"  // Shows always
      />

      {/* PHONE NUMBER */}
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
              <span>🇮🇳</span>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="bg-transparent text-sm font-medium outline-none"
              >
                <option value="+91">+91</option>
                <option value="+1">+1</option>
                <option value="+44">+44</option>
                <option value="+61">+61</option>
              </select>
            </div>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))
              }
              onFocus={() => setFocusedField('phone')}
              onBlur={() => setFocusedField(null)}
              placeholder="87006 97970"  // Shows always
              className="flex-1 h-full px-4 text-base outline-none bg-transparent placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </div>

      {/* JOB + COMPANY + LINKEDIN PILLS */}
      <div className="grid grid-cols-3 gap-2">
        <div className="relative">
          <input
            value={formData.designation}
            onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
            placeholder="+ Job title"
            className="w-full h-12 rounded-full border border-border text-sm px-4 focus:outline-none focus:border-primary placeholder:text-muted-foreground"
          />
        </div>
        <div className="relative">
          <input
            value={formData.company}
            onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
            placeholder="+ Company name"
            className="w-full h-12 rounded-full border border-border text-sm px-4 focus:outline-none focus:border-primary placeholder:text-muted-foreground"
          />
        </div>
        <div className="relative">
          <input
            value={formData.linkedin || ''}
            onChange={(e) =>
              setFormData(prev => ({
                ...prev,
                linkedin: e.target.value
              }))
            }
            onBlur={(e) =>
              setFormData(prev => ({
                ...prev,
                linkedin: normalizeLinkedInUrl(e.target.value)
              }))
            }
            placeholder="+ LinkedIn"
            className="w-full h-12 rounded-full border border-border text-sm px-10 focus:outline-none focus:border-primary placeholder:text-muted-foreground"
          />
          <Linkedin className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      {/* SEND BUTTON */}
      <Button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full h-14 rounded-xl bg-black text-white text-base font-medium mt-6 hover:bg-black/90"
      >
        {submitting ? 'Sending...' : 'Send'}
      </Button>

      <p className="text-[11px] text-center text-muted-foreground/70 mt-4">
        We don't sell your contact details
      </p>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90dvh]">
          {/* HEADER WITH SCAN BUTTON - FIXED: Better layout */}
          <DrawerHeader className="relative px-5 pt-5 pb-4 border-b">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                {ownerPhotoUrl ? (
                  <img
                    src={ownerPhotoUrl}
                    alt={ownerName}
                    className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-semibold text-blue-600">
                      {ownerName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="text-[16px] font-semibold text-foreground leading-tight">
                    Share your contact information
                  </h2>
                  <p className="text-sm text-muted-foreground truncate">
                    with {ownerName}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                Fill in your details below
              </div>
              
              <div className="flex items-center gap-3">
                {/* SCAN BUTTON */}
                <button
                  onClick={handleScanBusinessCard}
                  disabled={scanState === 'uploading' || scanState === 'processing'}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  <span>Scan</span>
                </button>
                
                {/* SKIP BUTTON */}
                <button
                  onClick={handleSkip}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip
                </button>
              </div>
            </div>
          </DrawerHeader>
          
          <div className="px-5 pt-4 pb-6 overflow-y-auto">
            {Content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" hideCloseButton>
        {/* DESKTOP HEADER - FIXED: Better layout */}
        <div className="relative px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {ownerPhotoUrl ? (
                <img
                  src={ownerPhotoUrl}
                  alt={ownerName}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                  <span className="text-lg font-semibold text-blue-600">
                    {ownerName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <h2 className="text-[16px] font-semibold text-foreground">
                  Share your contact information
                </h2>
                <p className="text-sm text-muted-foreground">
                  with {ownerName}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Fill in your details below
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleScanBusinessCard}
                disabled={scanState === 'uploading' || scanState === 'processing'}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Camera className="w-4 h-4" />
                <span>Scan</span>
              </button>
              
              <button
                onClick={handleSkip}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
        
        <div className="pt-4 pb-6 px-6">
          {Content}
        </div>
      </DialogContent>
    </Dialog>
  );
}
