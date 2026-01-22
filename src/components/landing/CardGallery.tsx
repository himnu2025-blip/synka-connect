import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

const cardDesigns = [
  { id: 1, image: '/images/card/metal-nfc-business-card-gold.jpeg', name: 'Metal Gold' },
  { id: 2, image: '/images/card/metal-nfc-business-card-silver.jpeg', name: 'Metal Silver' },
  { id: 3, image: '/images/card/metal-nfc-business-card-black.jpeg', name: 'Metal Black' },
  { id: 4, image: '/images/card/metal-nfc-business-card-rose-gold.jpg', name: 'Metal Rose Gold' },
  { id: 5, image: '/images/card/metal-nfc-card-gold.jpeg', name: 'Metal Gold Premium' },
  { id: 6, image: '/images/card/metal-nfc-card-silver.jpeg', name: 'Metal Silver Premium' },
  { id: 7, image: '/images/card/metal-nfc-card-black.jpeg', name: 'Metal Black Premium' },
  { id: 8, image: '/images/card/metal-nfc-card-rose-gold.jpeg', name: 'Metal Rose Gold Premium' },
  { id: 9, image: '/images/card/pvc-nfc-card-white-gloss.jpeg', name: 'PVC White Gloss' },
  { id: 10, image: '/images/card/pvc-nfc-card-black-gloss.jpeg', name: 'PVC Black Gloss' },
  { id: 11, image: '/images/card/pvc-nfc-card-black-matt.jpeg', name: 'PVC Black Matte' },
  { id: 12, image: '/images/card/metal-nfc-business-cards.jpeg', name: 'Collection' },
];

type Step = 'form' | 'otp_verify';

export function CardGallery() {
  const navigate = useNavigate();
  const trackRef = useRef<HTMLDivElement>(null);
  const { sendOtp, verifyOtp, loginWithPinOnly } = useAuth();

  // Dialog state
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [step, setStep] = useState<Step>('form');
  const [isLoading, setIsLoading] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    pin: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
  });

  // Auth state
  const [isNewUser, setIsNewUser] = useState(false);
  const [otp, setOtp] = useState('');

  // Carousel state
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const velocity = useRef(0);
  const lastX = useRef(0);
  const raf = useRef<number>();
  const pauseUntil = useRef(0); // Timestamp when auto-scroll should resume

  // Tuned values for auto-scroll
  const AUTO_SPEED = 1.0;
  const FRICTION = 0.94;
  const PAUSE_DURATION = 1000; // 1 second pause after user interaction

  // Auto-scroll loop with pause capability
  const autoScroll = () => {
    if (!trackRef.current || isDown.current) {
      raf.current = requestAnimationFrame(autoScroll);
      return;
    }

    // Check if we should pause auto-scroll
    const now = Date.now();
    if (now < pauseUntil.current) {
      raf.current = requestAnimationFrame(autoScroll);
      return;
    }

    trackRef.current.scrollLeft += AUTO_SPEED;

    // Infinite loop - reset when we reach halfway through the duplicated content
    if (trackRef.current.scrollLeft >= trackRef.current.scrollWidth / 2) {
      trackRef.current.scrollLeft = 0;
    }

    raf.current = requestAnimationFrame(autoScroll);
  };

  // Set pause timer when user interacts
  const pauseAutoScroll = () => {
    pauseUntil.current = Date.now() + PAUSE_DURATION;
  };

  // Momentum after release
  const glide = () => {
    if (!trackRef.current) return;

    velocity.current *= FRICTION;
    trackRef.current.scrollLeft += velocity.current;

    if (Math.abs(velocity.current) > 0.1) {
      requestAnimationFrame(glide);
    }
  };

  // Initialize auto-scroll
  useEffect(() => {
    raf.current = requestAnimationFrame(autoScroll);
    return () => {
      if (raf.current) {
        cancelAnimationFrame(raf.current);
      }
    };
  }, []);

  // Pointer event handlers for drag interaction
  const onPointerDown = (e: React.PointerEvent) => {
    isDown.current = true;
    pauseAutoScroll(); // Pause auto-scroll on interaction
    trackRef.current!.setPointerCapture(e.pointerId);
    startX.current = e.clientX;
    lastX.current = e.clientX;
    scrollLeft.current = trackRef.current!.scrollLeft;
    velocity.current = 0;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDown.current || !trackRef.current) return;

    const x = e.clientX;
    const walk = startX.current - x;
    trackRef.current.scrollLeft = scrollLeft.current + walk;

    velocity.current = lastX.current - x;
    lastX.current = x;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    isDown.current = false;
    trackRef.current!.releasePointerCapture(e.pointerId);
    pauseAutoScroll(); // Pause auto-scroll after release
    glide();
  };

  const resetDialog = () => {
    setStep('form');
    setFormData({ name: '', email: '', pin: '', address: '', city: '', state: '', pincode: '', phone: '' });
    setIsNewUser(false);
    setOtp('');
  };

  const redirectToOrderPage = () => {
    setOrderDialogOpen(false);
    resetDialog();
    navigate('/order-nfc-card');
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.pin || formData.pin.length !== 4) {
      toast({
        title: 'Missing information',
        description: 'Please fill in name, email, and 4-digit PIN.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.address || !formData.city || !formData.state || !formData.pincode || !formData.phone) {
      toast({
        title: 'Missing address',
        description: 'Please fill in complete shipping address.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await supabase.functions.invoke('pin-auth', {
        body: { action: 'CHECK_PIN_EXISTS', email: formData.email },
      });

      if (response.data?.exists) {
        setIsNewUser(false);

        if (response.data.has_pin) {
          const verifyResponse = await supabase.functions.invoke('pin-auth', {
            body: { action: 'VERIFY_PIN', email: formData.email, pin: formData.pin },
          });

          if (verifyResponse.data?.success) {
            await loginWithPinOnly(formData.email, verifyResponse.data.user_id);
            toast({
              title: 'Welcome back!',
              description: 'Select your NFC card type.',
            });
            redirectToOrderPage();
          } else {
            toast({
              title: 'Invalid PIN',
              description: verifyResponse.data?.error || 'The PIN you entered is incorrect.',
              variant: 'destructive',
            });
          }
        } else {
          const { error } = await sendOtp(formData.email);
          if (error) {
            toast({
              title: 'Error',
              description: 'Failed to send verification code.',
              variant: 'destructive',
            });
          } else {
            setStep('otp_verify');
            toast({
              title: 'Verification needed',
              description: 'We sent a code to your email to verify your account.',
            });
          }
        }
      } else {
        setIsNewUser(true);
        const { error } = await sendOtp(formData.email);
        if (error) {
          toast({
            title: 'Error',
            description: 'Failed to send verification code.',
            variant: 'destructive',
          });
        } else {
          setStep('otp_verify');
          toast({
            title: 'Verification code sent',
            description: 'Check your email for the verification code.',
          });
        }
      }
    } catch (err) {
      console.error('Error in form submit:', err);
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpVerify = async () => {
    if (otp.length !== 6) return;

    setIsLoading(true);

    try {
      const { error } = await verifyOtp(formData.email, otp);

      if (error) {
        toast({
          title: 'Invalid code',
          description: 'The verification code is incorrect or expired.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.functions.invoke('pin-auth', {
          body: { action: 'SET_PIN', user_id: session.user.id, pin: formData.pin },
        });

        await supabase
          .from('profiles')
          .update({ full_name: formData.name })
          .eq('user_id', session.user.id);
      }

      toast({
        title: 'Account verified!',
        description: 'Now select your NFC card type.',
      });

      redirectToOrderPage();
    } catch (err) {
      console.error('OTP verification error:', err);
      toast({
        title: 'Error',
        description: 'Verification failed. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="py-16 sm:py-24 px-4 w-full overflow-hidden">
      <div className="container px-4 sm:px-6">

        {/* HEADER */}
<div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
  {/* Introducing Badge */}
<div className="flex justify-center mb-4 animate-fade-up">
  <div className="relative inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium text-orange-600 border border-orange-500/30 bg-orange-500/10 backdrop-blur-sm">

    {/* Glow */}
    <span className="absolute inset-0 rounded-full bg-orange-500/20 blur-md opacity-30"></span>

    {/* Live dot */}
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-75 animate-ping"></span>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-600"></span>
    </span>

    {/* AI icon */}
    <Sparkles className="h-3.5 w-3.5 relative animate-pulse" />

    {/* Text */}
    <span className="relative">Introducing AI-Designed Cards</span>
  </div>
</div>
  <h2 className="text-[22px] sm:text-3xl md:text-4xl font-semibold leading-tight sm:leading-snug text-center px-4 max-w-[22rem] sm:max-w-none mx-auto">
  Get your{' '}
  <span className="gradient-text block sm:inline">
    AI-designed NFC business card
  </span>
  <span className="block mt-2 sm:mt-1 font-medium">
    built to make every introduction unforgettable
  </span>
</h2>

<p className="text-sm sm:text-lg text-muted-foreground leading-relaxed text-center px-6 max-w-md mx-auto mt-4">
  AI designs a card that reflects who you are.
  <br className="hidden sm:block" />
  You tap once — and people remember you forever.
</p>
</div>

        {/* AUTO-SCROLLING CARD GALLERY WITH CAROUSEL EFFECT */}
        <div className="relative select-none">
          {/* Gradient overlays for desktop */}
          <div className="hidden sm:block absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="hidden sm:block absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

          <div
            ref={trackRef}
            className="flex gap-4 sm:gap-6 overflow-x-hidden py-4 cursor-grab active:cursor-grabbing -mx-4 px-4 sm:mx-0 sm:px-0"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            style={{
              userSelect: 'none',
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none',
              touchAction: 'pan-y',
            }}
          >
            {/* Duplicate cards for seamless infinite loop */}
            {[...cardDesigns, ...cardDesigns].map((card, index) => (
              <div
                key={`${card.id}-${index}`}
                className="flex-shrink-0 w-[200px] sm:w-[240px] md:w-[280px] opacity-0 animate-fade-up"
                style={{ 
                  animationDelay: `${(index % cardDesigns.length) * 80}ms`, 
                  animationFillMode: 'forwards' 
                }}
              >
                <div className="aspect-[1.6/1] rounded-2xl overflow-hidden shadow-premium card-hover">
                  <img
                    src={card.image}
                    alt={card.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <p className="text-center text-sm font-medium text-muted-foreground mt-3">
                  {card.name}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* BULLET POINTS */}
<ul className="mt-10 space-y-2 text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
  {[
    'Premium metal & PVC cards that stand out instantly',
    'One-tap sharing via NFC & QR — no app needed',
    'AI-designed to match your role, brand & personality',
    'Update anytime — no reprints, no extra cost',
  ].map((text, i) => (
    <li key={i} className="flex justify-center">
      <span className="text-left flex gap-2">
        <span>•</span>
        <span>{text}</span>
      </span>
    </li>
  ))}
</ul>
        {/* CTA BUTTON */}
        <div className="flex justify-center mt-8">
          <Button size="lg" onClick={() => setOrderDialogOpen(true)}>
            Get your NFC Card
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground text-center mt-4 animate-fade-up">
  Includes complimentary replacement.<br />
  Lifetime NFC card included with <span className="font-medium">Orange (Pro) plan</span>.
</p>
      </div>

      {/* ORDER DIALOG */}
      <Dialog open={orderDialogOpen} onOpenChange={(isOpen) => {
        if (!isOpen) resetDialog();
        setOrderDialogOpen(isOpen);
      }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {step === 'form' && 'Get Your NFC Card'}
              {step === 'otp_verify' && 'Verify Your Email'}
            </DialogTitle>
            <DialogDescription>
              {step === 'form' && 'Fill in your details to order your premium NFC business card.'}
              {step === 'otp_verify' && 'Enter the 6-digit code sent to your email.'}
            </DialogDescription>
          </DialogHeader>

          {/* Step 1: Form */}
          {step === 'form' && (
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pin">4-Digit PIN</Label>
                <p className="text-xs text-muted-foreground">This PIN will be used for quick login</p>
                <InputOTP
                  maxLength={4}
                  value={formData.pin}
                  onChange={(value) => setFormData({ ...formData, pin: value })}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="House/Flat No., Street, Locality"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input
                    id="pincode"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          )}

          {/* Step 2: OTP Verification */}
          {step === 'otp_verify' && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Enter the 6-digit code sent to <strong>{formData.email}</strong>
                </p>
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={setOtp}
                  className="justify-center"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep('form')}
                  className="flex-1"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleOtpVerify}
                  disabled={otp.length !== 6 || isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Verify'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
