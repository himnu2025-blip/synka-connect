import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Upload, RotateCcw, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { FloatingInput, FloatingPhoneInput, extractPhoneNumber, getCountryCode } from '@/components/ui/floating-input';
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
export interface ScannedContact {
  name?: string | null;
  company?: string | null;
  designation?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  linkedin?: string | null;
  instagram?: string | null;
  youtube?: string | null;
  twitter?: string | null;
  website?: string | null;
  about?: string | null;
}

interface BusinessCardScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (contact: ScannedContact) => Promise<void>;
  title?: string;
}

export function BusinessCardScanDialog({
  open,
  onOpenChange,
  onSave,
  title = "Scan Business Card"
}: BusinessCardScanDialogProps) {
  const isMobile = useIsMobile();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedContact, setScannedContact] = useState<ScannedContact | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Start camera
  const startCamera = useCallback(async () => {
    const { shouldUseNativeCamera, captureOrPickImage } = await import('@/lib/nativeCamera');
    
    if (shouldUseNativeCamera()) {
      const result = await captureOrPickImage();
      
      if (result.error === 'cancelled') return;
      
      if (!result.success) {
        toast({ 
          title: 'Camera error', 
          description: result.error || 'Could not capture image.', 
          variant: 'destructive' 
        });
        return;
      }
      
      if (result.base64) {
        setCapturedImage(`data:image/jpeg;base64,${result.base64}`);
      }
      return;
    }
    
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast({ title: 'Camera not supported', variant: 'destructive' });
        return;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      setIsCameraActive(true);
      
      await new Promise<void>((resolve) => {
        const checkVideo = () => {
          if (videoRef.current) resolve();
          else requestAnimationFrame(checkVideo);
        };
        checkVideo();
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setIsCameraActive(false);
      toast({ 
        title: 'Camera error', 
        description: err.message || 'Could not access camera.', 
        variant: 'destructive' 
      });
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  const captureImage = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        setCapturedImage(canvas.toDataURL('image/jpeg', 0.8));
        stopCamera();
      }
    }
  }, [stopCamera]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedImage(event.target?.result as string);
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };

  const processWithAI = async () => {
    if (!capturedImage) return;

    setIsScanning(true);
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Call AI edge function
      const { data, error } = await supabase.functions.invoke('scan-business-card', {
        body: { image: capturedImage }
      });
      
      if (error) {
        console.error('AI scan error:', error);
        throw error;
      }

      if (data?.success && data?.contact) {
        const contact = data.contact;
        const hasData = Object.entries(contact)
          .filter(([key]) => key !== 'source')
          .some(([, value]) => value !== null && value !== undefined && value !== '');
        
        if (hasData) {
          setScannedContact(contact);
          const sourceMsg = contact.source === 'qr' ? ' (from QR)' : 
                           contact.source === 'mixed' ? ' (QR + text)' : '';
          toast({ 
            title: 'Card scanned!' + sourceMsg, 
            description: 'Review the extracted info.' 
          });
        } else {
          setScannedContact({ name: '', company: '', designation: '', email: '', phone: '', whatsapp: '', linkedin: '', website: '' });
          toast({ 
            title: "Couldn't read this card clearly", 
            description: 'Please fill in the details manually.',
            variant: 'destructive'
          });
        }
      } else {
        setScannedContact({ name: '', company: '', designation: '', email: '', phone: '', whatsapp: '', linkedin: '', website: '' });
        toast({ 
          title: "Couldn't read this card", 
          description: 'Please fill in manually.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Scan error:', error);
      setScannedContact({ name: '', company: '', designation: '', email: '', phone: '', whatsapp: '', linkedin: '', website: '' });
      toast({ 
        title: "Couldn't read this card", 
        description: 'Please fill in manually.',
        variant: 'destructive'
      });
    } finally {
      setIsScanning(false);
    }
  };

  const resetScan = () => {
    setCapturedImage(null);
    setScannedContact(null);
    setIsScanning(false);
  };

  const handleSave = async () => {
    if (!scannedContact?.name) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      await onSave(scannedContact);
      onOpenChange(false);
      resetScan();
    } catch (error) {
      toast({ title: 'Error saving contact', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      stopCamera();
      resetScan();
    }
  }, [open, stopCamera]);

  const content = (
    <div className="space-y-4">
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {!capturedImage && !scannedContact && (
        <>
          {isCameraActive ? (
            <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-40 border-2 border-white/50 rounded-lg" />
              </div>
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                <Button size="lg" onClick={captureImage} className="rounded-full w-16 h-16">
                  <Camera className="h-8 w-8" />
                </Button>
                <Button variant="secondary" size="lg" onClick={stopCamera} className="rounded-full">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Button onClick={startCamera} className="w-full py-6">
                <Camera className="h-5 w-5 mr-2" />
                Open Camera
              </Button>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full py-6">
                <Upload className="h-5 w-5 mr-2" />
                Upload Image
              </Button>
            </div>
          )}
        </>
      )}

      {capturedImage && !scannedContact && (
        <div className="space-y-4">
          <div className="relative aspect-[4/3] bg-muted rounded-lg overflow-hidden">
            <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
            {isScanning && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <p className="text-sm text-muted-foreground">Extracting info...</p>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetScan} className="flex-1" disabled={isScanning}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Retake
            </Button>
            <Button onClick={processWithAI} className="flex-1" disabled={isScanning}>
              {isScanning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Extract Info
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {scannedContact && (
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-800 dark:text-green-300 flex items-center">
              <Check className="h-4 w-4 mr-2" />
              Details extracted - please review
            </p>
          </div>

          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            <FloatingInput
              label="Name *"
              value={scannedContact.name || ''}
              onChange={(e) => setScannedContact(prev => ({ ...prev, name: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <FloatingInput
                label="Company Name"
                value={scannedContact.company || ''}
                onChange={(e) => setScannedContact(prev => ({ ...prev, company: e.target.value }))}
              />
              <FloatingInput
                label="Role"
                value={scannedContact.designation || ''}
                onChange={(e) => setScannedContact(prev => ({ ...prev, designation: e.target.value }))}
              />
            </div>
            <FloatingInput
              label="Email"
              type="email"
              inputMode="email"
              value={scannedContact.email || ''}
              onChange={(e) => setScannedContact(prev => ({ ...prev, email: e.target.value }))}
            />
            <FloatingPhoneInput
              label="Phone Number"
              value={extractPhoneNumber(scannedContact.phone)}
              onChange={(e) => {
                const code = getCountryCode(scannedContact.phone);
                setScannedContact(prev => ({ ...prev, phone: code + e.target.value }));
              }}
              countryCode={getCountryCode(scannedContact.phone)}
              onCountryCodeChange={(code) => {
                const number = extractPhoneNumber(scannedContact.phone);
                setScannedContact(prev => ({ ...prev, phone: code + number }));
              }}
            />
            <FloatingPhoneInput
              label="WhatsApp"
              value={extractPhoneNumber(scannedContact.whatsapp)}
              onChange={(e) => {
                const code = getCountryCode(scannedContact.whatsapp);
                setScannedContact(prev => ({ ...prev, whatsapp: code + e.target.value }));
              }}
              countryCode={getCountryCode(scannedContact.whatsapp)}
              onCountryCodeChange={(code) => {
                const number = extractPhoneNumber(scannedContact.whatsapp);
                setScannedContact(prev => ({ ...prev, whatsapp: code + number }));
              }}
            />
            <FloatingInput
              label="LinkedIn"
              value={scannedContact.linkedin || ''}
              onChange={(e) => setScannedContact(prev => ({ ...prev, linkedin: e.target.value }))}
            />
            <FloatingInput
              label="Website"
              inputMode="url"
              value={scannedContact.website || ''}
              onChange={(e) => setScannedContact(prev => ({ ...prev, website: e.target.value }))}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={resetScan} className="flex-1">
              Scan Again
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="flex-1">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Contact'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
