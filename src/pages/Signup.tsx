import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FloatingInput, FloatingPhoneInput, FloatingNameInput, combineNames, COUNTRY_CODES } from '@/components/ui/floating-input';
import { Label } from '@/components/ui/label';
import { ArrowRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

import { supabase } from '@/integrations/supabase/client';
import { BrandLogo } from '@/components/BrandLogo';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';

interface LocationState {
  email?: string;
}

type SignupStep = 'details' | 'otp' | 'set_pin';

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  
  const { sendOtp, verifyOtp, setPin, checkPinExists, signInWithGoogle, signInWithLinkedIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobile, setMobile] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [email, setEmail] = useState(state?.email || '');
  const [otp, setOtp] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<SignupStep>('details');

  // Social login handlers
  const handleGoogleLogin = async () => {
    setIsSocialLoading('google');
    const { error } = await signInWithGoogle();
    if (error) {
      setIsSocialLoading(null);
      toast({
        title: 'Error',
        description: error.message || 'Failed to sign up with Google.',
        variant: 'destructive',
      });
    }
  };

  const handleLinkedInLogin = async () => {
    setIsSocialLoading('linkedin');
    const { error } = await signInWithLinkedIn();
    if (error) {
      setIsSocialLoading(null);
      toast({
        title: 'Error',
        description: error.message || 'Failed to sign up with LinkedIn.',
        variant: 'destructive',
      });
    }
  };

  // Check if email exists in profiles table
  const checkEmailExists = async (emailToCheck: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', emailToCheck.toLowerCase().trim())
      .maybeSingle();
    
    return !error && data !== null;
  };

  // Validate email format
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  // Normalize and validate mobile number
  // Returns normalized number with country code, or null if invalid
  const normalizeMobile = (rawMobile: string, selectedCountryCode: string): string | null => {
    // Remove all non-digit characters
    const digitsOnly = rawMobile.trim().replace(/\D/g, '');
    
    if (!digitsOnly) return null;
    
    // Check if at least 6 digits (some countries have shorter numbers)
    if (digitsOnly.length >= 6 && digitsOnly.length <= 15) {
      return `${selectedCountryCode}${digitsOnly}`;
    }
    
    return null;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = combineNames(firstName, lastName);
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedMobile = mobile.trim();
    
    // Validate all mandatory fields
    if (!firstName.trim()) {
      toast({
        title: 'First name required',
        description: 'Please enter your first name.',
        variant: 'destructive',
      });
      return;
    }

    if (!trimmedEmail) {
      toast({
        title: 'Email required',
        description: 'Please enter your email address.',
        variant: 'destructive',
      });
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    if (!trimmedMobile) {
      toast({
        title: 'Mobile required',
        description: 'Please enter your mobile number.',
        variant: 'destructive',
      });
      return;
    }

    const normalizedMobile = normalizeMobile(trimmedMobile, countryCode);
    if (!normalizedMobile) {
      toast({
        title: 'Invalid mobile number',
        description: 'Please enter a valid phone number.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    // Check if user already exists
    const emailExists = await checkEmailExists(trimmedEmail);
    
    if (emailExists) {
      setIsLoading(false);
      toast({
        title: 'Account already exists',
        description: 'This email is already registered. Redirecting to login...',
        variant: 'destructive',
      });
      
      setTimeout(() => {
        navigate('/login', { state: { email: trimmedEmail } });
      }, 1500);
      return;
    }
    
    // Send OTP for email verification
    const { error } = await sendOtp(trimmedEmail);
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send verification code.',
        variant: 'destructive',
      });
    } else {
      setStep('otp');
      toast({
        title: 'Verification code sent!',
        description: 'Check your email for the OTP to verify your account.',
      });
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (otp.length !== 6) {
      toast({
        title: 'Invalid code',
        description: 'Please enter the 6-digit verification code.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    const { error } = await verifyOtp(email, otp);
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Error',
        description: error.message || 'Invalid OTP. Please try again.',
        variant: 'destructive',
      });
    } else {
      // OTP verified - update user metadata, profile, AND card with signup data
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const trimmedName = combineNames(firstName, lastName);
        const normalizedMobile = mobile.trim();
        
        // 1. Update user metadata first
        await supabase.auth.updateUser({
          data: { name: trimmedName, phone: normalizedMobile }
        });
        
        // 2. Update profile with signup data
        await supabase
          .from('profiles')
          .update({ 
            full_name: trimmedName, 
            phone: normalizedMobile 
          })
          .eq('user_id', user.id);

        // 3. CRITICAL: Update the default card directly with signup data
        // The DB trigger creates a card but may have empty fields if metadata wasn't set yet
        const { data: existingCard } = await supabase
          .from('cards')
          .select('id, name')
          .eq('user_id', user.id)
          .eq('is_default', true)
          .maybeSingle();
        
        if (existingCard) {
          // Update existing card with proper data
          await supabase
            .from('cards')
            .update({
              name: 'My Card',
              full_name: trimmedName,
              email: email.trim().toLowerCase(),
              phone: normalizedMobile,
              whatsapp: normalizedMobile,
            })
            .eq('id', existingCard.id);
        } else {
          // Create card if trigger didn't (edge case)
          await supabase.from('cards').insert({
            user_id: user.id,
            name: 'My Card',
            is_default: true,
            layout: 'dark-professional',
            full_name: trimmedName,
            email: email.trim().toLowerCase(),
            phone: normalizedMobile,
            whatsapp: normalizedMobile,
          });
        }

        // 4. Refresh session to update metadata in auth state
        try {
          await supabase.auth.refreshSession();
        } catch {
          // Ignore refresh errors
        }
      }
      
      setStep('set_pin');
      toast({
        title: 'Email verified!',
        description: 'Now set up your 4-digit PIN for quick login.',
      });
    }
  };

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPin.length !== 4 || confirmPin.length !== 4) {
      toast({
        title: 'Invalid PIN',
        description: 'PIN must be exactly 4 digits.',
        variant: 'destructive',
      });
      return;
    }
    
    if (newPin !== confirmPin) {
      toast({
        title: 'PINs do not match',
        description: 'Please make sure both PINs are the same.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    
    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setIsLoading(false);
      toast({
        title: 'Error',
        description: 'Session expired. Please try again.',
        variant: 'destructive',
      });
      setStep('details');
      return;
    }
    
    const { error } = await setPin(user.id, newPin);
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to set PIN. Please try again.',
        variant: 'destructive',
      });
    } else {
      // Send welcome email (fire and forget - don't block signup)
      supabase.functions.invoke('welcome-email', {
        body: { 
          email: email.trim().toLowerCase(), 
          name: combineNames(firstName, lastName)
        }
      }).catch((err) => {
        console.error('Welcome email error:', err);
      });

      toast({
        title: 'Welcome to Synka!',
        description: 'Your account is ready. Enjoy!',
      });
      navigate('/my-card', { replace: true });
    }
  };

  return (
    <div className="min-h-dvh flex">
      {/* Left Panel - Visual */}
      <div className="hidden lg:flex flex-1 gradient-bg items-center justify-center p-12">
        <div className="max-w-md text-center space-y-6">
          <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
            {[0, 1, 2, 3].map((i) => (
              <div 
                key={i}
                className="aspect-[1.6/1] rounded-xl glass animate-float"
                style={{ animationDelay: `${i * 200}ms` }}
              />
            ))}
          </div>
          <h2 className="text-3xl font-bold text-primary-foreground">
            Create your card in seconds
          </h2>
          <p className="text-primary-foreground/80">
            Join thousands of professionals who've elevated their networking game.
          </p>
        </div>
      </div>

      {/* Right Panel - Form - Scrollable on mobile */}
      <div className="flex-1 min-h-dvh overflow-y-auto">
        <div className="min-h-full flex items-center justify-center p-4 py-8 md:p-12 pb-safe">
          <div className="w-full max-w-md space-y-6 animate-fade-up">
            <div className="text-center lg:text-left">
              <div className="mb-6">
                <BrandLogo size="lg" />
            </div>
            
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {step === 'details' && 'Create your account'}
              {step === 'otp' && 'Verify your email'}
              {step === 'set_pin' && 'Set up your PIN'}
            </h1>
            <p className="text-muted-foreground">
              {step === 'details' && 'Start networking smarter today'}
              {step === 'otp' && 'Enter the code sent to your email'}
              {step === 'set_pin' && 'Create a 4-digit PIN for quick login'}
            </p>
          </div>

          {/* Details Step */}
          {step === 'details' && (
            <form onSubmit={handleSignup} className="space-y-5">
              <div className="space-y-4">
                <FloatingNameInput
                  firstName={firstName}
                  lastName={lastName}
                  onFirstNameChange={setFirstName}
                  onLastNameChange={setLastName}
                />

                <FloatingPhoneInput
                  label="Phone Number *"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/[^\d\s]/g, ''))}
                  countryCode={countryCode}
                  onCountryCodeChange={setCountryCode}
                />

                <FloatingInput
                  label="Email *"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  inputMode="email"
                />
              </div>

              <div className="text-sm text-muted-foreground">
                By signing up, you agree to our{' '}
                <Link to="/terms" className="text-primary hover:underline">Terms</Link>
                {' '}and{' '}
                <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
              </div>

              <Button 
                type="submit" 
                variant="gradient" 
                size="xl" 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Sending code...' : 'Continue'}
                <ArrowRight className="h-5 w-5" />
              </Button>

              {/* Social Login Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              {/* Social Login Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={handleGoogleLogin}
                  disabled={isSocialLoading !== null}
                >
                  {isSocialLoading === 'google' ? (
                    <span className="animate-spin mr-2">○</span>
                  ) : (
                    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                  )}
                  Google
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={handleLinkedInLogin}
                  disabled={isSocialLoading !== null}
                >
                  {isSocialLoading === 'linkedin' ? (
                    <span className="animate-spin mr-2">○</span>
                  ) : (
                    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="#0A66C2">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  )}
                  LinkedIn
                </Button>
              </div>
            </form>
          )}

          {/* OTP Step */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">Verification Code</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="h-12 text-center text-2xl tracking-widest"
                    maxLength={6}
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                variant="gradient" 
                size="xl" 
                className="w-full"
                disabled={isLoading || otp.length !== 6}
              >
                {isLoading ? 'Verifying...' : 'Verify & Continue'}
                <ArrowRight className="h-5 w-5" />
              </Button>

              <Button 
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep('details');
                  setOtp('');
                }}
              >
                Back to signup
              </Button>
            </form>
          )}

          {/* Set PIN Step */}
          {step === 'set_pin' && (
            <form onSubmit={handleSetPin} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Create 4-Digit PIN</Label>
                  <div className="flex justify-center">
                    <InputOTP 
                      maxLength={4} 
                      value={newPin} 
                      onChange={setNewPin}
                      inputMode="numeric"
  pattern="[0-9]*"
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Confirm PIN</Label>
                  <div className="flex justify-center">
                    <InputOTP 
                      maxLength={4} 
                      value={confirmPin} 
                      onChange={setConfirmPin}
                      inputMode="numeric"
  pattern="[0-9]*"
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                variant="gradient" 
                size="xl" 
                className="w-full"
                disabled={isLoading || newPin.length !== 4 || confirmPin.length !== 4}
              >
                {isLoading ? 'Setting up...' : 'Complete Setup'}
                <ArrowRight className="h-5 w-5" />
              </Button>
            </form>
          )}

          <p className="text-center text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
    </div>
  );
}
