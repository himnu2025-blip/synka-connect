// Hook to handle biometric login (native only)
// Auto-login ONLY happens when App Lock is enabled
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/hooks/useAuth';
import {
  checkBiometricAvailability,
  authenticateWithBiometrics,
  storeBiometricCredentials,
  type BiometricResult,
} from '@/lib/biometrics';
import { isAppLockEnabled } from '@/lib/appLock';
import { toast } from '@/hooks/use-toast';

// Storage keys
const BIOMETRIC_ENABLED_KEY = 'synka_biometric_enabled';
const BIOMETRIC_CONSENT_ASKED_KEY = 'synka_biometric_consent_asked';

export function useBiometricAutoLogin() {
  const navigate = useNavigate();
  const { user, loading: authLoading, loginWithPinOnly } = useAuth();
  
  const [biometricInfo, setBiometricInfo] = useState<BiometricResult | null>(null);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [isAutoLoginAttempted, setIsAutoLoginAttempted] = useState(false);
  const [pendingCredentials, setPendingCredentials] = useState<{ email: string; userId: string } | null>(null);
  
  const autoLoginTriggered = useRef(false);

  // Check if biometric is enabled by user preference
  const isBiometricEnabled = () => {
    return localStorage.getItem(BIOMETRIC_ENABLED_KEY) === 'true';
  };

  // Check if consent was already asked
  const wasConsentAsked = () => {
    return localStorage.getItem(BIOMETRIC_CONSENT_ASKED_KEY) === 'true';
  };

  // Mark consent as asked
  const markConsentAsked = () => {
    localStorage.setItem(BIOMETRIC_CONSENT_ASKED_KEY, 'true');
  };

  // Enable biometric
  const enableBiometric = () => {
    localStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
  };

  // Disable biometric
  const disableBiometric = () => {
    localStorage.setItem(BIOMETRIC_ENABLED_KEY, 'false');
  };

  // Check biometric availability on mount
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    
    checkBiometricAvailability().then(setBiometricInfo);
  }, []);

  // Auto-login with biometrics on app launch (native only)
  // ONLY triggers when App Lock is enabled - otherwise session persists
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (authLoading) return;
    if (user) return; // Already logged in - no biometric needed
    if (autoLoginTriggered.current) return;
    if (isAutoLoginAttempted) return;
    
    // If App Lock is OFF, don't trigger biometric automatically
    // User stays logged in like WhatsApp/Instagram
    if (!isAppLockEnabled()) {
      setIsAutoLoginAttempted(true);
      return;
    }

    const attemptAutoLogin = async () => {
      autoLoginTriggered.current = true;
      setIsAutoLoginAttempted(true);

      const info = await checkBiometricAvailability();
      setBiometricInfo(info);

      // Check conditions for auto-login (App Lock is ON):
      // 1. Biometric is available
      // 2. User has stored credentials (logged in before)
      // 3. Biometric is enabled in preferences
      if (info.available && info.hasCredentials && isBiometricEnabled()) {
        // Trigger biometric automatically
        await triggerBiometricLogin();
      }
    };

    attemptAutoLogin();
  }, [authLoading, user, isAutoLoginAttempted]);

  // Trigger biometric authentication
  const triggerBiometricLogin = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;
    
    setIsBiometricLoading(true);

    try {
      const result = await authenticateWithBiometrics();

      if (!result.success) {
        setIsBiometricLoading(false);
        
        if (result.error === 'cancelled') {
          // User cancelled - don't show error, let them use login page
          return;
        }

        // Show error but don't block - they can use normal login
        toast({
          title: 'Biometric failed',
          description: 'Please log in with your PIN.',
          variant: 'destructive',
        });
        return;
      }

      // Biometric succeeded - create session
      const { error: loginError } = await loginWithPinOnly(result.email!, result.userId!);

      if (loginError) {
        setIsBiometricLoading(false);
        toast({
          title: 'Login failed',
          description: 'Please log in with your PIN.',
          variant: 'destructive',
        });
        navigate('/login');
        return;
      }

      // Success!
      setIsBiometricLoading(false);
      toast({
        title: 'Welcome back!',
        description: 'Logged in with biometrics.',
      });
      navigate('/my-card');
    } catch (error) {
      setIsBiometricLoading(false);
      console.error('Biometric auto-login error:', error);
    }
  }, [loginWithPinOnly, navigate]);

  // Handle first-time consent after successful login
  const handleLoginSuccess = useCallback(async (email: string, userId: string) => {
    if (!Capacitor.isNativePlatform()) return;
    
    const info = await checkBiometricAvailability();
    setBiometricInfo(info);

    // If biometric is available and we haven't asked for consent yet
    if (info.available && !wasConsentAsked()) {
      setPendingCredentials({ email, userId });
      setShowConsentDialog(true);
    } else if (info.available && isBiometricEnabled()) {
      // Already enabled - store credentials silently
      await storeBiometricCredentials(email, userId);
    }
  }, []);

  // Handle consent dialog - Enable
  const handleConsentEnable = useCallback(async () => {
    if (!pendingCredentials) return;

    markConsentAsked();
    enableBiometric();

    const { success } = await storeBiometricCredentials(
      pendingCredentials.email,
      pendingCredentials.userId
    );

    if (success) {
      toast({
        title: 'Biometric enabled!',
        description: 'You can now log in faster next time.',
      });
    }

    setShowConsentDialog(false);
    setPendingCredentials(null);
  }, [pendingCredentials]);

  // Handle consent dialog - Skip
  const handleConsentSkip = useCallback(() => {
    markConsentAsked();
    disableBiometric();
    setShowConsentDialog(false);
    setPendingCredentials(null);
  }, []);

  return {
    biometricInfo,
    isBiometricLoading,
    showConsentDialog,
    setShowConsentDialog,
    triggerBiometricLogin,
    handleLoginSuccess,
    handleConsentEnable,
    handleConsentSkip,
    isBiometricEnabled: isBiometricEnabled(),
    isNative: Capacitor.isNativePlatform(),
  };
}
