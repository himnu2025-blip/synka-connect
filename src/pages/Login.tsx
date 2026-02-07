import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FloatingInput } from '@/components/ui/floating-input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowRight, KeyRound, LogOut, Fingerprint, ScanFace } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { BrandLogo } from '@/components/BrandLogo';
import { BiometricConsentDialog } from '@/components/mobile/BiometricConsentDialog';
import { setCachedUserName, setCachedUserEmail, getCachedUserName, getCachedUserEmail, isBiometricEnabled } from '@/lib/appLock';
import { useAppLockContext } from '@/App';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import {
  checkBiometricAvailability,
  authenticateWithBiometrics,
  storeBiometricCredentials,
  getBiometryTypeName,
  verifyBiometricIdentity,
  type BiometricResult,
} from '@/lib/biometrics';

// Constants for consent storage
const BIOMETRIC_ENABLED_KEY = 'synka_biometric_enabled';
const BIOMETRIC_CONSENT_ASKED_KEY = 'synka_biometric_consent_asked';

interface LocationState {
  email?: string;
  appLockMode?: boolean;
  returnTo?: string;
}

type LoginStep = 'email' | 'pin' | 'otp' | 'set_pin' | 'forgot_pin_otp';

// Device fingerprint for detecting new vs existing device
const getDeviceFingerprint = () => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('fingerprint', 2, 2);
  }
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL(),
  ].join('|');
  
  // Simple hash
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
};

const CACHED_EMAIL_KEY = 'synka_cached_email';
const KNOWN_DEVICES_KEY = 'synka_known_devices';
const REMEMBER_ME_KEY = 'synka_remember_me';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const appLock = useAppLockContext();
  
  // Check if we're in app lock mode (user is logged in but needs to unlock)
  const isAppLockMode = state?.appLockMode === true;
  const returnTo = state?.returnTo || '/my-card';
  
  const { 
    user, 
    sendOtp, 
    verifyOtp, 
    verifyPin, 
    checkPinExists, 
    setPin,
    signInWithGoogle, 
    signInWithLinkedIn,
    loginWithPinOnly,
  } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [pin, setPin_] = useState('');
  const [otp, setOtp] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<LoginStep>('email');
  const [userId, setUserId] = useState<string | null>(null);
  const [cachedEmail, setCachedEmail] = useState<string | null>(null);
  const [userFullName, setUserFullName] = useState<string | null>(() => getCachedUserName());
  const [showEmailOnLogin, setShowEmailOnLogin] = useState(false);
  
  // Biometric state
  const [biometricInfo, setBiometricInfo] = useState<BiometricResult | null>(null);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const [showBiometricConsent, setShowBiometricConsent] = useState(false);
  const [pendingLoginCredentials, setPendingLoginCredentials] = useState<{ email: string; userId: string } | null>(null);
  
  // Ready state - prevents email flash
  const [isReady, setIsReady] = useState(false);
  
  // App lock mode: track if we've auto-triggered biometrics
  const autoTriggerAttempted = useRef(false);
  
  // Remember me state (web only) - default to true, load from storage
  const [rememberMe, setRememberMe] = useState(() => {
    if (Capacitor.isNativePlatform()) return true; // Native always remembers
    const saved = localStorage.getItem(REMEMBER_ME_KEY);
    return saved === null ? true : saved === 'true';
  });

  // Consent dialog handlers
  const handleConsentEnable = async () => {
    if (!pendingLoginCredentials) return;
    localStorage.setItem(BIOMETRIC_CONSENT_ASKED_KEY, 'true');
    localStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
    await storeBiometricCredentials(pendingLoginCredentials.email, pendingLoginCredentials.userId);
    toast({ title: 'Biometric enabled!', description: 'You can now log in faster next time.' });
    setShowBiometricConsent(false);
    navigate('/my-card');
  };

  const handleConsentSkip = () => {
    localStorage.setItem(BIOMETRIC_CONSENT_ASKED_KEY, 'true');
    localStorage.setItem(BIOMETRIC_ENABLED_KEY, 'false');
    setShowBiometricConsent(false);
    navigate('/my-card');
  };

  // Check biometric availability on mount
  useEffect(() => {
    checkBiometricAvailability().then(setBiometricInfo);
  }, []);
  
  // Handle session cleanup on browser close (web only, when remember me is off)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    
    const savedRememberMe = localStorage.getItem(REMEMBER_ME_KEY);
    // If remember me was explicitly set to false and session exists in sessionStorage
    // but not persisted, we handle this via beforeunload
    const handleBeforeUnload = () => {
      if (savedRememberMe === 'false') {
        // Mark that we should check session on next load
        sessionStorage.setItem('synka_session_temp', 'true');
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Check for cached email on mount - also set cached name for instant display
  useEffect(() => {
    const cached = localStorage.getItem(CACHED_EMAIL_KEY);
    const cachedName = getCachedUserName();
    const passedEmail = state?.email;
    
    // Always set cached name first (before render)
    if (cachedName) {
      setUserFullName(cachedName);
    }
    
    // In app lock mode, always go to PIN step with cached data
    if (isAppLockMode) {
      const cachedUserEmail = getCachedUserEmail() || cached;
      if (cachedUserEmail) {
        setCachedEmail(cachedUserEmail);
        setEmail(cachedUserEmail);
        setStep('pin');
        setIsReady(true);
      } else {
        // No cached email in app lock mode - shouldn't happen, but fallback
        setIsReady(true);
      }
      return;
    }
    
    if (passedEmail) {
      setEmail(passedEmail);
      setIsReady(true);
    } else if (cached) {
      setCachedEmail(cached);
      setEmail(cached);
      
      // Auto-advance to PIN step if user has PIN
      checkPinExists(cached).then(({ exists, has_pin, full_name }) => {
        if (exists && has_pin) {
          // Update with fresh name from server, also cache it
          if (full_name) {
            setUserFullName(full_name);
            setCachedUserName(full_name);
          }
          setStep('pin');
        }
        setIsReady(true); // ✅ mark ready ONLY after decision
      });
    } else {
      // No cached user → new login
      setIsReady(true);
    }
  }, [state?.email, isAppLockMode]);

  // Auto-trigger biometric in app lock mode
  useEffect(() => {
  if (!isAppLockMode) return;
  if (!isReady) return;
  if (autoTriggerAttempted.current) return;
  if (step !== 'pin') return;
  if (isBiometricLoading) return; // ✅ ADD THIS

  const biometricIsEnabled = isBiometricEnabled();
  if (!biometricIsEnabled) return;

  autoTriggerAttempted.current = true;

  const timer = setTimeout(() => {
    handleAppLockBiometric();
  }, 300);

  return () => clearTimeout(timer);
}, [isAppLockMode, isReady, step, isBiometricLoading]);

  // Handle biometric unlock for app lock mode
  const handleAppLockBiometric = async () => {
    if (!appLock) return;

    setIsBiometricLoading(true);

    try {
      const result = await verifyBiometricIdentity();

      // ❌ Cancel / fail → allow retry
      if (!result.success) {
        setIsBiometricLoading(false);
        return;
      }

      // ✅ Success → unlock UI
      appLock.unlockWithPin();
      setIsBiometricLoading(false);
      
      // Small delay to ensure state propagates before navigation
      // This prevents AppWithLock from seeing stale isLocked=true
      setTimeout(() => {
        navigate(returnTo, { replace: true });
      }, 50);

    } catch (err) {
      console.error('App lock biometric error:', err);
      setIsBiometricLoading(false);
    }
  };

  // Check if device is known for this email
  const isKnownDevice = (email: string) => {
    const deviceId = getDeviceFingerprint();
    const knownDevices = JSON.parse(localStorage.getItem(KNOWN_DEVICES_KEY) || '{}');
    return knownDevices[email]?.includes(deviceId);
  };

  // Mark device as known for this email
  const markDeviceAsKnown = (email: string) => {
    const deviceId = getDeviceFingerprint();
    const knownDevices = JSON.parse(localStorage.getItem(KNOWN_DEVICES_KEY) || '{}');
    if (!knownDevices[email]) {
      knownDevices[email] = [];
    }
    if (!knownDevices[email].includes(deviceId)) {
      knownDevices[email].push(deviceId);
    }
    localStorage.setItem(KNOWN_DEVICES_KEY, JSON.stringify(knownDevices));
  };

  // Handle switching to different account
  const handleSwitchAccount = () => {
    setCachedEmail(null);
    setEmail('');
    setPin_('');
    setStep('email');
  };

  // Social login handlers
  const handleGoogleLogin = async () => {
    setIsSocialLoading('google');
    const { error } = await signInWithGoogle();
    if (error) {
      setIsSocialLoading(null);
      toast({
        title: 'Error',
        description: error.message || 'Failed to sign in with Google.',
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
        description: error.message || 'Failed to sign in with LinkedIn.',
        variant: 'destructive',
      });
    }
  };

  // Redirect if already logged in (but not in app lock mode)
  useEffect(() => {
    if (user && !isAppLockMode) {
      navigate('/my-card');
    }
  }, [user, navigate, isAppLockMode]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsLoading(true);
    
    // Check if user exists and has PIN
    const { exists, has_pin, user_id, full_name } = await checkPinExists(email);
    
    if (!exists) {
      // New user - redirect to signup
      setIsLoading(false);
      toast({
        title: 'Welcome to Synka!',
        description: "Your journey starts here — let's create something amazing.",
      });
      navigate('/signup', { state: { email: email.trim() } });
      return;
    }
    
    if (user_id) setUserId(user_id);
    if (full_name) setUserFullName(full_name);
    
    if (has_pin) {
      // Existing user with PIN - show PIN input
      setStep('pin');
      setIsLoading(false);
    } else {
      // Existing user without PIN - send OTP to set up PIN
      const { error } = await sendOtp(email);
      setIsLoading(false);
      
      if (error) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to send verification code.',
          variant: 'destructive',
        });
      } else {
        setStep('set_pin');
        toast({
          title: 'Verification code sent!',
          description: 'Enter the code from your email to set up your PIN.',
        });
      }
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) return;
    
    setIsLoading(true);
    
    // In app lock mode, just verify PIN and unlock
    if (isAppLockMode && appLock) {
      const { error, locked } = await verifyPin(email, pin);
      
      if (error) {
        setIsLoading(false);
        if (locked) {
          toast({
            title: 'Account Locked',
            description: error.message,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Invalid PIN',
            description: error.message,
            variant: 'destructive',
          });
          setPin_('');
        }
        return;
      }
      
      // PIN verified - unlock the app
      appLock.unlockWithPin();
      setIsLoading(false);
      navigate(returnTo, { replace: true });
      return;
    }
    
    // Normal login flow
    const { error, locked, needs_pin_setup, user_id } = await verifyPin(email, pin);
    
    if (error) {
      setIsLoading(false);
      
      if (locked) {
        toast({
          title: 'Account Locked',
          description: error.message,
          variant: 'destructive',
        });
      } else if (needs_pin_setup) {
        // User needs to set up PIN - send OTP
        const { error: otpError } = await sendOtp(email);
        if (otpError) {
          toast({
            title: 'Error',
            description: 'Failed to send verification code.',
            variant: 'destructive',
          });
        } else {
          setStep('set_pin');
          toast({
            title: 'Set up your PIN',
            description: 'Enter the verification code to set your PIN.',
          });
        }
      } else {
        toast({
          title: 'Invalid PIN',
          description: error.message,
          variant: 'destructive',
        });
        setPin_('');
      }
      return;
    }
    
    // PIN verified! Login directly without sending any email
    const { error: loginError } = await loginWithPinOnly(email, user_id!);
    
    if (loginError) {
      setIsLoading(false);
      toast({
        title: 'Error',
        description: loginError.message || 'Failed to create session.',
        variant: 'destructive',
      });
      return;
    }
    
    // Mark device as known and save email for next login
    markDeviceAsKnown(email);
    localStorage.setItem(CACHED_EMAIL_KEY, email);
    
    // Cache user name for instant display
    if (userFullName) {
      setCachedUserName(userFullName);
    }
    setCachedUserEmail(email);
    
    // Save remember me preference (web only)
    if (!Capacitor.isNativePlatform()) {
      localStorage.setItem(REMEMBER_ME_KEY, rememberMe ? 'true' : 'false');
    }
    
    // Show biometric consent dialog if available and not asked yet (native only)
    const consentAsked = localStorage.getItem(BIOMETRIC_CONSENT_ASKED_KEY) === 'true';
    const biometricEnabled = localStorage.getItem(BIOMETRIC_ENABLED_KEY) === 'true';
    
    if (Capacitor.isNativePlatform() && biometricInfo?.available && user_id) {
      if (!consentAsked) {
        // First time - show consent dialog
        setPendingLoginCredentials({ email, userId: user_id });
        setIsLoading(false);
        setIsLoading(false);
        setShowBiometricConsent(true);
        return; // Don't navigate yet - wait for consent response
      } else if (biometricEnabled) {
        // Already enabled - store credentials silently
        await storeBiometricCredentials(email, user_id);
      }
    }
    
    setIsLoading(false);
    navigate('/my-card');
  };
  
  // Handle biometric login
  const handleBiometricLogin = async () => {
    setIsBiometricLoading(true);
    
    const result = await authenticateWithBiometrics();
    
    if (!result.success) {
      setIsBiometricLoading(false);
      
      if (result.error === 'cancelled') {
        // User cancelled, don't show error
        return;
      }
      
      toast({
        title: 'Biometric failed',
        description: result.error || 'Please try again or use your PIN.',
        variant: 'destructive',
      });
      return;
    }
    
    // Biometric succeeded, now login with PIN-only flow
    const { error: loginError } = await loginWithPinOnly(result.email!, result.userId!);
    
    if (loginError) {
      setIsBiometricLoading(false);
      toast({
        title: 'Login failed',
        description: 'Please use your PIN to log in.',
        variant: 'destructive',
      });
      return;
    }
    
    // Success!
    localStorage.setItem(CACHED_EMAIL_KEY, result.email!);
    // Cache user name if available
    if (result.userId) {
      setCachedUserEmail(result.email!);
    }
    setIsBiometricLoading(false);
    toast({
      title: 'Welcome back!',
      description: 'Logged in with biometrics.',
    });
    navigate('/my-card');
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    
    setIsLoading(true);
    
    const { error } = await verifyOtp(email, otp);
    setIsLoading(false);
    
    if (error) {
      toast({
        title: 'Error',
        description: error.message || 'Invalid verification code.',
        variant: 'destructive',
      });
    } else {
      // Mark this device as known and cache email
      markDeviceAsKnown(email);
      localStorage.setItem(CACHED_EMAIL_KEY, email);
      setCachedUserEmail(email);
      
      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.',
      });
      navigate('/my-card');
    }
  };

  const handleSetPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (otp.length !== 6) {
      toast({
        title: 'Enter verification code',
        description: 'Please enter the 6-digit code from your email.',
        variant: 'destructive',
      });
      return;
    }
    
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
    
    // First verify OTP to get session
    const { error: otpError } = await verifyOtp(email, otp);
    
    if (otpError) {
      setIsLoading(false);
      toast({
        title: 'Error',
        description: 'Invalid verification code.',
        variant: 'destructive',
      });
      return;
    }
    
    // Now set the PIN - we need to get the user ID
    const { exists, user_id } = await checkPinExists(email);
    
    if (!exists || !user_id) {
      setIsLoading(false);
      toast({
        title: 'Error',
        description: 'Could not find your account.',
        variant: 'destructive',
      });
      return;
    }
    
    const { error: pinError } = await setPin(user_id, newPin);
    setIsLoading(false);
    
    if (pinError) {
      toast({
        title: 'Error',
        description: 'Failed to set PIN. Please try again.',
        variant: 'destructive',
      });
      return;
    }
    
    toast({
      title: 'PIN set successfully!',
      description: 'Welcome to Synka.',
    });
    // Cache user name and email
    if (userFullName) setCachedUserName(userFullName);
    setCachedUserEmail(email);
    navigate('/my-card');
  };

  const handleForgotPin = async () => {
    setIsLoading(true);
    
    const { error } = await sendOtp(email);
    setIsLoading(false);
    
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to send verification code.',
        variant: 'destructive',
      });
    } else {
      setStep('forgot_pin_otp');
      setOtp('');
      setNewPin('');
      setConfirmPin('');
      toast({
        title: 'Verification code sent!',
        description: 'Enter the code to reset your PIN.',
      });
    }
  };

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (otp.length !== 6) {
      toast({
        title: 'Enter verification code',
        description: 'Please enter the 6-digit code from your email.',
        variant: 'destructive',
      });
      return;
    }
    
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
    
    // Verify OTP
    const { error: otpError } = await verifyOtp(email, otp);
    
    if (otpError) {
      setIsLoading(false);
      toast({
        title: 'Error',
        description: 'Invalid verification code.',
        variant: 'destructive',
      });
      return;
    }
    
    // Get user ID and set new PIN
    const { exists, user_id } = await checkPinExists(email);
    
    if (!exists || !user_id) {
      setIsLoading(false);
      toast({
        title: 'Error',
        description: 'Could not find your account.',
        variant: 'destructive',
      });
      return;
    }
    
    const { error: pinError } = await setPin(user_id, newPin);
    setIsLoading(false);
    
    if (pinError) {
      toast({
        title: 'Error',
        description: 'Failed to reset PIN. Please try again.',
        variant: 'destructive',
      });
      return;
    }
    
    toast({
      title: 'PIN reset successfully!',
      description: 'Welcome back to Synka.',
    });
    // Cache user name and email
    if (userFullName) setCachedUserName(userFullName);
    setCachedUserEmail(email);
    navigate('/my-card');
  };

  const getTitle = () => {
    if (isAppLockMode && step === 'pin') return 'Welcome Back';
    switch (step) {
      case 'email': return 'Welcome back';
      case 'pin': return 'Enter your PIN';
      case 'otp': return 'Verify your identity';
      case 'set_pin': return 'Set up your PIN';
      case 'forgot_pin_otp': return 'Reset your PIN';
      default: return 'Welcome back';
    }
  };

  const getSubtitle = () => {
    if (isAppLockMode && step === 'pin') return 'Continue to your Synka';
    switch (step) {
      case 'email': return 'Sign in to your account to continue';
      case 'pin': return '';
      case 'otp': return 'Enter the verification code sent to your email';
      case 'set_pin': return 'Create a 4-digit PIN for quick access';
      case 'forgot_pin_otp': return 'Enter the code and create a new PIN';
      default: return '';
    }
  };

  // Block rendering until ready (prevents email flash)
  if (!isReady) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <BrandLogo />
      </div>
    );
  }

  return (
    <>
    <BiometricConsentDialog
      open={showBiometricConsent}
      onOpenChange={setShowBiometricConsent}
      onEnable={handleConsentEnable}
      onSkip={handleConsentSkip}
      biometricInfo={biometricInfo}
    />
    <div className="min-h-dvh w-full max-w-full overflow-x-hidden flex flex-col lg:flex-row">
      {/* Left Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-12 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <div className="w-full max-w-md space-y-6 sm:space-y-8 animate-fade-up">
          {/* Back to Home – hide in app lock mode */}
          {!isAppLockMode && (
            <div className="mb-4">
              <Link
                to="/index"
                className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                ← Back to Home
              </Link>
            </div>
          )}
          <div className="text-center lg:text-left">
            <div className="mb-8">
              <BrandLogo size="lg" />
            </div>
            
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {getTitle()}
            </h1>
            <p className="text-muted-foreground">
              {getSubtitle()}
            </p>
          </div>

          {/* Email Step */}
          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <FloatingInput
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                inputMode="email"
              />

              <Button 
                type="submit" 
                variant="gradient" 
                size="xl" 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Please wait...' : 'Continue'}
                <ArrowRight className="h-5 w-5" />
              </Button>
            </form>
          )}

          {/* PIN Step */}
          {step === 'pin' && (
            <form onSubmit={handlePinSubmit} className="space-y-6">
              {/* Show user's name instantly - no email flash */}
              {userFullName && (
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <p className="font-medium text-foreground text-lg">{userFullName}</p>
                  {showEmailOnLogin ? (
                    <p className="text-xs text-muted-foreground mt-1">({email || cachedEmail})</p>
                  ) : (
                    <button 
                      type="button"
                      onClick={() => setShowEmailOnLogin(true)}
                      className="text-xs text-primary/70 hover:text-primary mt-1"
                    >
                      view email
                    </button>
                  )}
                </div>
              )}
              
              {/* Biometric button - show in app lock mode with biometric enabled, or normal mode with credentials */}
              {((isAppLockMode && isBiometricEnabled()) || (biometricInfo?.available && biometricInfo.hasCredentials)) && (
                <Button
                  type="button"
                  variant="outline"
                  size="xl"
                  className="w-full gap-3"
                  onClick={isAppLockMode ? handleAppLockBiometric : handleBiometricLogin}
                  disabled={isBiometricLoading}
                >
                  {isBiometricLoading ? (
                    <span className="animate-spin">○</span>
                  ) : biometricInfo?.biometryType === 'face' ? (
                    <ScanFace className="h-6 w-6" />
                  ) : (
                    <Fingerprint className="h-6 w-6" />
                  )}
                  {isBiometricLoading 
                    ? 'Authenticating...' 
                    : isAppLockMode 
                      ? `Unlock with ${getBiometryTypeName(biometricInfo?.biometryType)}`
                      : `Sign in with ${getBiometryTypeName(biometricInfo?.biometryType)}`
                  }
                </Button>
              )}
              
              {/* Divider if biometric available */}
              {((isAppLockMode && isBiometricEnabled()) || (biometricInfo?.available && biometricInfo.hasCredentials)) && (
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or enter PIN
                    </span>
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>4-Digit PIN</Label>
                  <div className="flex justify-center">
                    <InputOTP 
                      maxLength={4} 
                      value={pin} 
                      onChange={setPin_}
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

              {/* Remember me checkbox - only show on web */}
              {!Capacitor.isNativePlatform() && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                  />
                  <Label 
                    htmlFor="remember-me" 
                    className="text-sm text-muted-foreground cursor-pointer"
                  >
                    Remember me
                  </Label>
                </div>
              )}

              <Button 
                type="submit" 
                variant="gradient" 
                size="xl" 
                className="w-full"
                disabled={isLoading || pin.length !== 4}
              >
                {isLoading ? 'Verifying...' : isAppLockMode ? 'Unlock' : 'Sign In'}
                <ArrowRight className="h-5 w-5" />
              </Button>

              {/* Hide these options in app lock mode */}
              {!isAppLockMode && (
                <div className="flex justify-between items-center">
                  <Button 
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleSwitchAccount}
                    className="text-muted-foreground"
                  >
                    <LogOut className="h-4 w-4 mr-1" />
                    Different account
                  </Button>
                  <Button 
                    type="button"
                    variant="link"
                    onClick={handleForgotPin}
                    disabled={isLoading}
                  >
                    Forgot PIN?
                  </Button>
                </div>
              )}
            </form>
          )}

          {/* OTP Step (after PIN verification) */}
          {step === 'otp' && (
            <form onSubmit={handleOtpVerify} className="space-y-6">
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
                {isLoading ? 'Verifying...' : 'Complete Login'}
                <ArrowRight className="h-5 w-5" />
              </Button>

              <Button 
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep('pin');
                  setOtp('');
                }}
              >
                Back
              </Button>
            </form>
          )}

          {/* Set PIN Step */}
          {step === 'set_pin' && (
            <form onSubmit={handleSetPinSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="setup-otp">Verification Code</Label>
                  <Input
                    id="setup-otp"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="h-12 text-center text-2xl tracking-widest"
                    maxLength={6}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Create 4-Digit PIN</Label>
                  <div className="flex justify-center">
                    <InputOTP 
                      maxLength={4} 
                      value={newPin} 
                      onChange={setNewPin}
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
                disabled={isLoading}
              >
                {isLoading ? 'Setting up...' : 'Set PIN & Continue'}
                <ArrowRight className="h-5 w-5" />
              </Button>

              <Button 
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep('email');
                  setOtp('');
                  setNewPin('');
                  setConfirmPin('');
                }}
              >
                Back
              </Button>
            </form>
          )}

          {/* Forgot PIN - Reset Step */}
          {step === 'forgot_pin_otp' && (
            <form onSubmit={handleResetPin} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-otp">Verification Code</Label>
                  <Input
                    id="reset-otp"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="h-12 text-center text-2xl tracking-widest"
                    maxLength={6}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>New 4-Digit PIN</Label>
                  <div className="flex justify-center">
                    <InputOTP 
                      maxLength={4} 
                      value={newPin} 
                      onChange={setNewPin}
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
                  <Label>Confirm New PIN</Label>
                  <div className="flex justify-center">
                    <InputOTP 
                      maxLength={4} 
                      value={confirmPin} 
                      onChange={setConfirmPin}
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
                disabled={isLoading}
              >
                {isLoading ? 'Resetting...' : 'Reset PIN & Sign In'}
                <ArrowRight className="h-5 w-5" />
              </Button>

              <Button 
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep('pin');
                  setOtp('');
                  setNewPin('');
                  setConfirmPin('');
                }}
              >
                Back
              </Button>
            </form>
          )}

          {/* Social Login - Only show on email step */}
          {step === 'email' && (
            <>
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
            </>
          )}

          {/* Hide signup link in app lock mode */}
          {!isAppLockMode && (
            <p className="text-center text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary font-medium hover:underline">
                Sign up
              </Link>
            </p>
          )}
        </div>
      </div>

      {/* Right Panel - Visual */}
      <div className="hidden lg:flex flex-1 gradient-bg items-center justify-center p-12">
        <div className="max-w-md text-center space-y-6">
          <div className="w-32 h-32 mx-auto rounded-3xl glass flex items-center justify-center animate-float">
            {step === 'pin' && biometricInfo?.available ? (
              <Fingerprint className="w-16 h-16 text-primary-foreground/80" />
            ) : (
              <KeyRound className="w-16 h-16 text-primary-foreground/80" />
            )}
          </div>
          <h2 className="text-3xl font-bold text-primary-foreground">
            {step === 'pin' && biometricInfo?.available 
              ? 'Secure Biometric Login' 
              : 'Secure PIN Login'
            }
          </h2>
          <p className="text-primary-foreground/80">
            {step === 'pin' && biometricInfo?.available 
              ? 'Use your fingerprint or face to log in instantly. Or enter your 4-digit PIN.'
              : 'Quick and secure access with your 4-digit PIN. No passwords to remember.'
            }
          </p>
        </div>
      </div>
    </div>
    </>
  );
  }
