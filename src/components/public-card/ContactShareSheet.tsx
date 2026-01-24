import { useState, useRef } from 'react';
import { X, Send, Camera, Check, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
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
  const [showSocialLinks, setShowSocialLinks] = useState(false);
  const [countryCode, setCountryCode] = useState('+91'); // ✅ STEP 1
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
        phone: `${countryCode}${formData.phone}`, // ✅ STEP 4
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
      setShowSocialLinks(false);
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

        // Reset scan state after delay
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

  const getScanButtonContent = () => {
    switch (scanState) {
      case 'uploading':
      case 'processing':
        return (
          <>
            <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">
              {scanState === 'uploading' ? 'Uploading...' : 'Reading...'}
            </span>
          </>
        );
      case 'success':
        return (
          <>
            <Check className="h-4 w-4 text-primary" />
            <span className="text-sm text-primary">Scanned!</span>
          </>
        );
      case 'failed':
        return (
          <>
            <Camera className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">Try again</span>
          </>
        );
      default:
        return (
          <>
            <Camera className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Scan business card</span>
          </>
        );
    }
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

      {/* Scan Business Card Option */}
      <button
        type="button"
        onClick={handleScanBusinessCard}
        disabled={scanState === 'uploading' || scanState === 'processing'}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-muted/30 transition-all disabled:opacity-50"
      >
        {getScanButtonContent()}
      </button>

      {/* ✅ STEP 2 — PASTED FULL PREMIUM VERSION */}
      {/* FIRST + LAST */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">First name</Label>
          <Input
            value={formData.firstName}
            onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
            className="h-14 rounded-2xl border border-border/40 px-4 text-base shadow-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Last name</Label>
          <Input
            value={formData.lastName}
            onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
            className="h-14 rounded-2xl border border-border/40 px-4 text-base shadow-sm"
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
          className="h-14 rounded-2xl border border-border/40 px-4 text-base shadow-sm"
        />
      </div>

      {/* PHONE WITH COUNTRY */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Phone number</Label>
        <div className="flex items-center h-14 rounded-2xl border border-border/40 shadow-sm overflow-hidden">
          <select
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            className="h-full px-3 bg-transparent text-sm font-medium outline-none border-r border-border/40"
          >
            <option value="+91">🇮🇳 +91</option>
            <option value="+1">🇺🇸 +1</option>
            <option value="+44">🇬🇧 +44</option>
            <option value="+61">🇦🇺 +61</option>
          </select>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) =>
              setFormData(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))
            }
            placeholder="87006 97970"
            className="flex-1 h-full px-4 text-lg font-medium outline-none bg-transparent"
          />
        </div>
      </div>

      {/* JOB + COMPANY PILLS */}
      <div className="flex gap-3">
        <Input
          value={formData.designation}
          onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
          placeholder="+ Job title"
          className="h-12 rounded-full border border-border/40 text-sm px-4"
        />
        <Input
          value={formData.company}
          onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
          placeholder="+ Company name"
          className="h-12 rounded-full border border-border/40 text-sm px-4"
        />
      </div>

      {/* Social Links Toggle */}
      <button
        type="button"
        onClick={() => setShowSocialLinks(!showSocialLinks)}
        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <Plus className={`h-3 w-3 transition-transform ${showSocialLinks ? 'rotate-45' : ''}`} />
        <span>LinkedIn</span>
      </button>

      {/* Social Links Section */}
      {showSocialLinks && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">LinkedIn profile</Label>
          <div className="flex items-center h-14 rounded-2xl border border-border/40 px-4 shadow-sm">
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
              placeholder="linkedin.com/in/yourname"
              className="flex-1 h-full outline-none bg-transparent text-base"
            />
          </div>
        </div>
      )}

      {/* SEND BUTTON */}
      <Button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full h-14 rounded-2xl bg-black text-white text-base font-semibold shadow-md"
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
          {/* ✅ STEP 3 — Replace mobile header */}
          <DrawerHeader className="relative px-5 pt-5 pb-3 border-0">
            <button
              onClick={handleSkip}
              className="absolute right-5 top-5 text-sm text-muted-foreground"
            >
              Skip
            </button>

            <div className="flex items-center gap-3 pr-12">
              {ownerPhotoUrl && (
                <img
                  src={ownerPhotoUrl}
                  alt={ownerName}
                  className="w-12 h-12 rounded-full object-cover"
                />
              )}
              <h2 className="text-[18px] font-semibold leading-snug text-foreground">
                Share your contact information with {ownerName}
              </h2>
            </div>
          </DrawerHeader>
          <div className="px-5 pt-4 pb-5 overflow-y-auto">
            {Content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" hideCloseButton>
        <DialogHeader className="relative px-4 py-3 border-b border-border/30">
          <button
            onClick={handleSkip}
            className="absolute right-4 top-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip
          </button>

          <div className="flex items-center gap-3">
            {ownerPhotoUrl && (
              <img
                src={ownerPhotoUrl}
                alt={ownerName}
                className="w-9 h-9 rounded-full object-cover"
              />
            )}
            <div className="leading-tight">
              <DialogTitle className="text-sm font-medium">
                Share your contact
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                with {ownerName}
              </p>
            </div>
          </div>
        </DialogHeader>
        <div className="pt-2">
          {Content}
        </div>
      </DialogContent>
    </Dialog>
  );
}
