import { useState, useRef } from 'react';
import { Send, Camera, Linkedin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    
    // Remove protocol
    v = v.replace(/^https?:\/\//, '');
    
    // If user pasted full LinkedIn URL
    if (v.includes('linkedin.com')) {
      return `https://${v}`;
    }
    
    // If user typed only username
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
      // Reset form
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

  const Content = (
    <div className="space-y-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* FIRST + LAST - SIMPLIFIED LIKE BLINQ */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">First name</Label>
          <Input
            value={formData.firstName}
            onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
            className="h-12 rounded-xl border border-border px-3 text-base"
            placeholder="Hello"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Last name</Label>
          <Input
            value={formData.lastName}
            onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
            className="h-12 rounded-xl border border-border px-3 text-base"
            placeholder="Ji"
          />
        </div>
      </div>

      {/* EMAIL */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Email</Label>
        <Input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          className="h-12 rounded-xl border border-border px-3 text-base"
          placeholder="your@email.com"
        />
      </div>

      {/* PHONE WITH COUNTRY - EXACTLY LIKE BLINQ */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Phone number</Label>
        <div className="flex items-center h-12 rounded-xl border border-border overflow-hidden">
          <div className="flex items-center gap-2 px-3 h-full">
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
            placeholder="87006 97970"
            className="flex-1 px-3 text-base outline-none bg-transparent"
          />
        </div>
      </div>

      {/* JOB + COMPANY + LINKEDIN PILLS - EXACTLY LIKE BLINQ */}
      <div className="grid grid-cols-3 gap-2">
        <Input
          value={formData.designation}
          onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
          placeholder="+ Job title"
          className="h-12 rounded-full border border-border text-sm px-3"
        />
        <Input
          value={formData.company}
          onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
          placeholder="+ Company name"
          className="h-12 rounded-full border border-border text-sm px-3"
        />
        <div className="relative">
          <Input
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
            className="h-12 rounded-full border border-border text-sm pl-10 pr-3"
          />
          <Linkedin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      {/* SEND BUTTON - EXACTLY LIKE BLINQ */}
      <Button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full h-14 rounded-xl bg-black text-white text-base font-medium shadow-sm"
      >
        {submitting ? 'Sending...' : 'Send'}
      </Button>

      <p className="text-[11px] text-center text-muted-foreground/70">
        We don't sell your contact details
      </p>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90dvh]">
          {/* HEADER WITH SCAN BUTTON - EXACTLY LIKE BLINQ */}
          <DrawerHeader className="relative px-5 pt-5 pb-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {ownerPhotoUrl && (
                  <img
                    src={ownerPhotoUrl}
                    alt={ownerName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                )}
                <h2 className="text-[16px] font-semibold text-foreground">
                  Share your contact information with {ownerName}
                </h2>
              </div>
              
              <div className="flex items-center gap-3">
                {/* SCAN BUTTON - Small at top */}
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
        {/* DESKTOP HEADER */}
        <div className="relative px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {ownerPhotoUrl && (
                <img
                  src={ownerPhotoUrl}
                  alt={ownerName}
                  className="w-10 h-10 rounded-full object-cover"
                />
              )}
              <div>
                <h2 className="text-[16px] font-semibold text-foreground">
                  Share your contact with {ownerName}
                </h2>
              </div>
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
