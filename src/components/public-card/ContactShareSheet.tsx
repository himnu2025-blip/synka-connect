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
      await onSubmit(formData);
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
    <div className="space-y-5">
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

      {/* Form Fields */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">First name *</Label>
            <Input
              value={formData.firstName}
              onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
              placeholder="First name"
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Last name</Label>
            <Input
              value={formData.lastName}
              onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
              placeholder="Last name"
              className="h-11"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Email</Label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="your@email.com"
            className="h-11"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Phone</Label>
          <Input
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="+1 234 567 890"
            className="h-11"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
  <Input
    value={formData.designation}
    onChange={(e) =>
      setFormData(prev => ({ ...prev, designation: e.target.value }))
    }
    placeholder="Job title"
    className="h-11"
  />

  <Input
    value={formData.company}
    onChange={(e) =>
      setFormData(prev => ({ ...prev, company: e.target.value }))
    }
    placeholder="Organization / Brand"
    className="h-11"
  />
</div>
      </div>

      {/* Social Links Toggle + Privacy Text */}
      <div className="flex items-center justify-between">
        {/* Left: LinkedIn add */}
        <button
          type="button"
          onClick={() => setShowSocialLinks(!showSocialLinks)}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className={`h-3 w-3 transition-transform ${showSocialLinks ? 'rotate-45' : ''}`} />
          <span>LinkedIn</span>
        </button>

        {/* Right: Privacy */}
        <p className="text-[11px] text-muted-foreground/70">
          We don't sell your contact details
        </p>
      </div>

      {/* Social Links Section */}
      {showSocialLinks && (
        <div className="space-y-2 p-3 rounded-xl bg-muted/10 border border-border/30 transition-all duration-200">
          <label className="text-xs text-muted-foreground">LinkedIn profile</label>
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
            placeholder="linkedin.com/in/yourname"
            className="h-10"
          />
        </div>
      )}

      {/* Send Button */}
      <Button
        onClick={handleSubmit}
        variant="gradient"
        className="w-full h-12 text-base font-medium"
        disabled={submitting}
      >
        {submitting ? (
          <>
            <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
            Sending...
          </>
        ) : (
          <>
            <Send className="h-4 w-4 mr-2" />
            Send
          </>
        )}
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90dvh]">
          <DrawerHeader className="relative px-4 py-3 border-b border-border/30">
  {/* Skip */}
  <button
    onClick={handleSkip}
    className="absolute right-4 top-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
  >
    Skip
  </button>

  {/* Title Row */}
  <div className="flex items-center gap-3 pr-12 min-w-0">
    {ownerPhotoUrl && (
      <img
        src={ownerPhotoUrl}
        alt={ownerName}
        className="w-9 h-9 rounded-full object-cover flex-shrink-0"
      />
    )}

    <p className="text-sm font-medium text-foreground whitespace-nowrap truncate">
      Share your contact with {ownerName}
    </p>
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
