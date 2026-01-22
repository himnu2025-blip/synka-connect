// App Lock utilities - controls whether app requires unlock on open
// OFF by default - user must explicitly enable

import { App } from '@capacitor/app';
import { quickBiometricVerify, isBiometricReadyForAppLock } from './biometrics';

const APP_LOCK_ENABLED_KEY = 'synka_app_lock_enabled';
const BIOMETRIC_ENABLED_KEY = 'synka_biometric_enabled';
const CACHED_USER_NAME_KEY = 'synka_cached_user_name';
const CACHED_USER_EMAIL_KEY = 'synka_cached_user_email';

// Track authentication state
let isAuthenticating = false;
let unlockRequiredCallback: (() => void) | null = null;
let unlockSuccessCallback: (() => void) | null = null;
let appStateInitialized = false;

// App Lock is OFF by default
export const isAppLockEnabled = (): boolean => {
  return localStorage.getItem(APP_LOCK_ENABLED_KEY) === 'true';
};

export const setAppLockEnabled = (enabled: boolean): void => {
  localStorage.setItem(APP_LOCK_ENABLED_KEY, enabled ? 'true' : 'false');
  
  // If disabling app lock, clear biometric flag too
  if (!enabled) {
    setBiometricEnabled(false);
  }
};

// Biometric settings
export const isBiometricEnabled = (): boolean => {
  return localStorage.getItem(BIOMETRIC_ENABLED_KEY) === 'true';
};

export const setBiometricEnabled = (enabled: boolean): void => {
  localStorage.setItem(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
};

// Check if biometric is available and ready
export const isBiometricReady = async (): Promise<boolean> => {
  if (!isBiometricEnabled()) return false;
  
  const result = await isBiometricReadyForAppLock();
  return result.ready;
};

// Cache user name for instant display (no email flash)
export const getCachedUserName = (): string | null => {
  return localStorage.getItem(CACHED_USER_NAME_KEY);
};

export const setCachedUserName = (name: string): void => {
  if (name) {
    localStorage.setItem(CACHED_USER_NAME_KEY, name);
  }
};

export const getCachedUserEmail = (): string | null => {
  return localStorage.getItem(CACHED_USER_EMAIL_KEY);
};

export const setCachedUserEmail = (email: string): void => {
  if (email) {
    localStorage.setItem(CACHED_USER_EMAIL_KEY, email);
  }
};

export const clearCachedUser = (): void => {
  localStorage.removeItem(CACHED_USER_NAME_KEY);
  localStorage.removeItem(CACHED_USER_EMAIL_KEY);
};

// Initialize app lock listener for background/foreground transitions
export const initializeAppLock = (
  onUnlockRequired: () => void,
  onUnlockSuccess?: () => void
): void => {
  if (appStateInitialized) return;
  
  unlockRequiredCallback = onUnlockRequired;
  unlockSuccessCallback = onUnlockSuccess || (() => {});
  
  // Listen for app state changes (background/foreground)
  App.addListener('appStateChange', async ({ isActive }) => {
    console.log('App state changed, isActive:', isActive);
    
    if (!isActive) {
      // App going to background - do nothing
      return;
    }
    
    // App coming to foreground
    if (!isAppLockEnabled()) return;
    
    console.log('App resumed, triggering unlock flow');
    await triggerUnlockFlow();
  });
  
  appStateInitialized = true;
};

// Trigger the appropriate unlock flow based on settings
export const triggerUnlockFlow = async (forceShowPin = false): Promise<boolean> => {
  console.log('triggerUnlockFlow called, isAppLockEnabled:', isAppLockEnabled());
  
  if (!isAppLockEnabled()) {
    console.log('App lock not enabled, skipping unlock flow');
    return true; // Already unlocked
  }
  
  if (isAuthenticating) {
    console.log('Already authenticating, skipping');
    return false;
  }
  
  isAuthenticating = true;
  
  try {
    // FIRST: Show the PIN screen in the background immediately
    // This ensures it's ready if biometric fails
    console.log('Showing PIN screen in background');
    if (unlockRequiredCallback) {
      unlockRequiredCallback();
    }
    
    // Check if biometric should be tried
    const biometricReady = await isBiometricReady();
    const shouldTryBiometric = biometricReady && !forceShowPin;
    
    console.log('Biometric ready:', biometricReady, 'Should try:', shouldTryBiometric);
    
    // Small delay to ensure PIN screen is fully mounted
    await new Promise(resolve => setTimeout(resolve, 50));
    
    if (shouldTryBiometric) {
      console.log('Showing biometric popup immediately');
      
      const result = await quickBiometricVerify();
      
      if (result.success) {
        console.log('Biometric authentication successful');
        // Biometric succeeded - unlock the app
        handleUnlockSuccess();
        return true;
      } else {
        console.log('Biometric authentication failed or cancelled:', result.error);
        // Biometric failed or cancelled - PIN screen is already visible behind
        return false;
      }
    } else {
      console.log('Biometric not ready or not enabled, PIN screen visible');
      // PIN screen is already visible, user must enter PIN
      return false;
    }
  } catch (error) {
    console.error('Error in unlock flow:', error);
    // PIN screen is already visible
    return false;
  } finally {
    isAuthenticating = false;
  }
};

// Handle successful unlock
const handleUnlockSuccess = (): void => {
  if (unlockSuccessCallback) {
    unlockSuccessCallback();
  }
};

// Manually trigger biometric (e.g., from PIN screen "Use Biometric" button)
export const manuallyTriggerBiometric = async (): Promise<boolean> => {
  if (!isAppLockEnabled()) return true;
  if (!(await isBiometricReady())) return false;
  
  try {
    const result = await quickBiometricVerify();
    if (result.success) {
      handleUnlockSuccess();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Manual biometric failed:', error);
    return false;
  }
};

// Complete unlock with PIN
export const completeUnlockWithPin = (): void => {
  handleUnlockSuccess();
};

// Reset authentication state
export const resetAppLockState = (): void => {
  isAuthenticating = false;
};

// Check if currently authenticating
export const isCurrentlyAuthenticating = (): boolean => {
  return isAuthenticating;
};

// Clear all app lock settings
export const clearAllAppLockSettings = (): void => {
  localStorage.removeItem(APP_LOCK_ENABLED_KEY);
  localStorage.removeItem(BIOMETRIC_ENABLED_KEY);
  clearCachedUser();
};

// Get app lock status for UI
export const getAppLockStatus = () => {
  return {
    enabled: isAppLockEnabled(),
    biometricEnabled: isBiometricEnabled(),
  };
};

// Trigger unlock on app start
export const triggerUnlockOnStart = async (): Promise<void> => {
  if (!isAppLockEnabled()) {
    console.log('App lock disabled, no unlock needed');
    return;
  }
  
  console.log('App lock enabled, triggering unlock flow on start');
  await triggerUnlockFlow();
};
