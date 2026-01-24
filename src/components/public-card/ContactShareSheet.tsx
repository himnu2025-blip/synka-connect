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
    <div className="space-y-6 px-1">
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
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border border-dashed border-border/60 hover:border-primary/50 hover:bg-muted/20 transition-all disabled:opacity-50 bg-white/50 backdrop-blur-sm"
      >
        {getScanButtonContent()}
      </button>

      {/* FIRST + LAST */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">First name</Label>
          <Input
            value={formData.firstName}
            onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
            className="h-16 rounded-3xl border border-gray-200 bg-white px-5 text-base shadow-[0_2px_6px_rgba(0,0,0,0.05)] focus:border-primary/50 focus:shadow-[0_2px_12px_rgba(59,130,246,0.15)] transition-all"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Last name</Label>
          <Input
            value={formData.lastName}
            onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
            className="h-16 rounded-3xl border border-gray-200 bg-white px-5 text-base shadow-[0_2px_6px_rgba(0,0,0,0.05)] focus:border-primary/50 focus:shadow-[0_2px_12px_rgba(59,130,246,0.15)] transition-all"
          />
        </div>
      </div>

      {/* EMAIL */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Email</Label>
        <Input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          className="h-16 rounded-3xl border border-gray-200 bg-white px-5 text-base shadow-[0_2px_6px_rgba(0,0,0,0.05)] focus:border-primary/50 focus:shadow-[0_2px_12px_rgba(59,130,246,0.15)] transition-all"
        />
      </div>

      {/* PHONE WITH COUNTRY */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Phone number</Label>
        <div className="flex items-center h-16 rounded-3xl border border-gray-200 bg-white shadow-[0_2px_6px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="flex items-center gap-2 px-4 border-r border-gray-200 h-full">
            <span className="text-lg">🇮🇳</span>
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
            className="flex-1 px-5 text-lg font-medium outline-none bg-transparent"
          />
        </div>
      </div>

      {/* JOB + COMPANY PILLS */}
      <div className="flex gap-3">
        <Input
          value={formData.designation}
          onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
          placeholder="+ Job title"
          className="h-14 rounded-full border border-gray-200 bg-white text-sm px-5 shadow-[0_2px_6px_rgba(0,0,0,0.05)]"
        />
        <Input
          value={formData.company}
          onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
          placeholder="+ Company name"
          className="h-14 rounded-full border border-gray-200 bg-white text-sm px-5 shadow-[0_2px_6px_rgba(0,0,0,0.05)]"
        />
      </div>

      {/* Social Links Toggle */}
      <button
        type="button"
        onClick={() => setShowSocialLinks(!showSocialLinks)}
        className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors pl-1"
      >
        <Plus className={`h-3 w-3 transition-transform ${showSocialLinks ? 'rotate-45' : ''}`} />
        <span>LinkedIn</span>
      </button>

      {/* Social Links Section */}
      {showSocialLinks && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">LinkedIn profile</Label>
          <div className="flex items-center h-16 rounded-3xl border border-gray-200 bg-white shadow-[0_2px_6px_rgba(0,0,0,0.05)] overflow-hidden">
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
              className="flex-1 px-5 text-base outline-none bg-transparent"
            />
          </div>
        </div>
      )}

      {/* SEND BUTTON */}
      <Button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full h-16 rounded-3xl bg-black text-white text-lg font-semibold shadow-[0_6px_16px_rgba(0,0,0,0.25)] active:scale-[0.98] transition-all hover:shadow-[0_8px_20px_rgba(0,0,0,0.3)]"
      >
        {submitting ? 'Sending...' : 'Send'}
      </Button>

      <p className="text-[12px] text-center text-muted-foreground/70 pt-2">
        We don't sell your contact details
      </p>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92dvh] rounded-t-[32px] bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.15)]">
          {/* Premium Blinq-Style Header */}
          <DrawerHeader className="relative px-6 pt-6 pb-4 border-0">
            <button
              onClick={handleSkip}
              className="absolute right-6 top-6 text-[15px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip
            </button>

            <div className="flex items-center gap-4 pr-12">
              <div className="relative">
                {ownerPhotoUrl ? (
                  <img
                    src={ownerPhotoUrl}
                    alt={ownerName}
                    className="w-14 h-14 rounded-full object-cover shadow-sm"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 shadow-sm flex items-center justify-center">
                    <span className="text-lg font-semibold text-blue-600">
                      {ownerName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full shadow flex items-center justify-center border border-gray-100">
                  <Send className="w-4 h-4 text-red-500" />
                </div>
              </div>

              <h2 className="text-[20px] font-semibold leading-snug text-foreground">
                Share your contact information with {ownerName}
              </h2>
            </div>
          </DrawerHeader>
          <div className="px-6 pt-4 pb-8 overflow-y-auto">
            {Content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.15)] border-0 p-0" hideCloseButton>
        {/* Desktop Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-gray-100">
          <button
            onClick={handleSkip}
            className="absolute right-6 top-6 text-[15px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip
          </button>

          <div className="flex items-center gap-4 pr-12">
            <div className="relative">
              {ownerPhotoUrl ? (
                <img
                  src={ownerPhotoUrl}
                  alt={ownerName}
                  className="w-14 h-14 rounded-full object-cover shadow-sm"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 shadow-sm flex items-center justify-center">
                  <span className="text-lg font-semibold text-blue-600">
                    {ownerName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full shadow flex items-center justify-center border border-gray-100">
                <Send className="w-4 h-4 text-red-500" />
              </div>
            </div>

            <div>
              <h2 className="text-[20px] font-semibold leading-snug text-foreground">
                Share your contact
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                with {ownerName}
              </p>
            </div>
          </div>
        </div>
        
        <div className="pt-6 pb-8 px-6">
          {Content}
        </div>
      </DialogContent>
    </Dialog>
  );
}
