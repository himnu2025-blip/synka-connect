import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App, AppState } from '@capacitor/app';
import { isAppLockEnabled, isBiometricEnabled } from '@/lib/appLock';
import {
  checkBiometricAvailability,
  type BiometricResult,
} from '@/lib/biometrics';

/**
 * Lock only if app stayed in background long enough
 * (behaves like WhatsApp / banking apps)
 */
const BACKGROUND_LOCK_THRESHOLD = 30_000; // 30 seconds

interface UseAppLockReturn {
  isLocked: boolean;
  isAuthenticating: boolean;
  biometricInfo: BiometricResult | null;
  biometricEnabled: boolean;
  unlock: () => Promise<boolean>;
  unlockWithPin: () => void;
  lockNow: () => void;
}

export function useAppLock(): UseAppLockReturn {
  const [isLocked, setIsLocked] = useState(false);
  const [biometricInfo, setBiometricInfo] =
    useState<BiometricResult | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const backgroundAt = useRef<number | null>(null);
  const hasInitialized = useRef(false);

  /* ------------------------------------------------------------
   * Initial biometric info (UI hints only)
   * ------------------------------------------------------------ */
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    checkBiometricAvailability().then(setBiometricInfo);
    setBiometricEnabled(isBiometricEnabled());
  }, []);

  /* ------------------------------------------------------------
   * Cold start → lock immediately if enabled
   * ------------------------------------------------------------ */
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (hasInitialized.current) return;

    hasInitialized.current = true;

    if (isAppLockEnabled()) {
      setIsLocked(true);
    }
  }, []);

  /* ------------------------------------------------------------
   * App lifecycle (background / foreground)
   * ------------------------------------------------------------ */
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleAppStateChange = (state: AppState) => {
      if (!isAppLockEnabled()) {
        setIsLocked(false);
        return;
      }

      // App sent to background
      if (!state.isActive) {
        backgroundAt.current = Date.now();
        return;
      }

      // App resumed
      if (backgroundAt.current) {
        const timeInBackground = Date.now() - backgroundAt.current;
        backgroundAt.current = null;

        if (timeInBackground >= BACKGROUND_LOCK_THRESHOLD) {
          setIsLocked(true);
          setBiometricEnabled(isBiometricEnabled());
        }
      }
    };

    const sub = App.addListener('appStateChange', handleAppStateChange);

    return () => {
      sub.then(l => l.remove());
    };
  }, []);

  /* ------------------------------------------------------------
   * Unlock APIs (called ONLY after successful auth)
   * ------------------------------------------------------------ */
  const unlock = useCallback(async (): Promise<boolean> => {
    setIsLocked(false);
    backgroundAt.current = null;
    return true;
  }, []);

  const unlockWithPin = useCallback(() => {
    setIsLocked(false);
    backgroundAt.current = null;
  }, []);

  const lockNow = useCallback(() => {
    if (isAppLockEnabled()) {
      setIsLocked(true);
    }
  }, []);

  return {
    isLocked,
    isAuthenticating: false,
    biometricInfo,
    biometricEnabled,
    unlock,
    unlockWithPin,
    lockNow,
  };
}
