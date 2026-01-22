// Biometric authentication helper using capacitor-native-biometric
import { Capacitor } from '@capacitor/core';
import { NativeBiometric, BiometryType } from 'capacitor-native-biometric';

const SERVER_ID = 'com.synka.app';

// Local flag to indicate whether we successfully stored credentials on this device.
// We avoid calling NativeBiometric.getCredentials() in availability checks because on some Android
// keystore/device configs it can fail unless the user has just verified identity.
const BIOMETRIC_CREDENTIALS_STORED_KEY = 'synka_biometric_credentials_stored';

function getHasStoredBiometricCredentialsFlag(): boolean {
  try {
    return localStorage.getItem(BIOMETRIC_CREDENTIALS_STORED_KEY) === 'true';
  } catch {
    return false;
  }
}

function setHasStoredBiometricCredentialsFlag(value: boolean) {
  try {
    localStorage.setItem(BIOMETRIC_CREDENTIALS_STORED_KEY, value ? 'true' : 'false');
  } catch {
    // ignore
  }
}

export interface BiometricResult {
  available: boolean;
  biometryType: 'none' | 'fingerprint' | 'face' | 'iris' | 'multiple';
  hasCredentials: boolean;
}

/**
 * Check if biometric authentication is available on the device
 */
export async function checkBiometricAvailability(): Promise<BiometricResult> {
  // Only available on native platforms
  if (!Capacitor.isNativePlatform()) {
    return { available: false, biometryType: 'none', hasCredentials: false };
  }

  try {
    const result = await NativeBiometric.isAvailable();

    let biometryType: BiometricResult['biometryType'] = 'none';
    switch (result.biometryType) {
      case BiometryType.FINGERPRINT:
      case BiometryType.TOUCH_ID:
        biometryType = 'fingerprint';
        break;
      case BiometryType.FACE_ID:
      case BiometryType.FACE_AUTHENTICATION:
        biometryType = 'face';
        break;
      case BiometryType.IRIS_AUTHENTICATION:
        biometryType = 'iris';
        break;
      case BiometryType.MULTIPLE:
        biometryType = 'multiple';
        break;
      default:
        biometryType = 'none';
    }

    // NOTE: Do NOT call NativeBiometric.getCredentials() here.
    // Some Android devices require identity verification before credentials can be retrieved.
    const hasCredentials = result.isAvailable ? getHasStoredBiometricCredentialsFlag() : false;

    return {
      available: result.isAvailable,
      biometryType,
      hasCredentials,
    };
  } catch (error) {
    console.error('Biometric availability check failed:', error);
    return { available: false, biometryType: 'none', hasCredentials: false };
  }
}

/**
 * Store credentials securely with biometric protection
 */
export async function storeBiometricCredentials(
  email: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!Capacitor.isNativePlatform()) {
    return { success: false, error: 'Not on native platform' };
  }

  try {
    // Delete any existing credentials first
    try {
      await NativeBiometric.deleteCredentials({ server: SERVER_ID });
    } catch {
      // Ignore if no credentials exist
    }

    // Store the credentials
    await NativeBiometric.setCredentials({
      username: email,
      password: userId, // Stored for later session creation via pin-auth
      server: SERVER_ID,
    });

    setHasStoredBiometricCredentialsFlag(true);
    return { success: true };
  } catch (error: any) {
    setHasStoredBiometricCredentialsFlag(false);
    console.error('Failed to store biometric credentials:', error);
    return { success: false, error: error?.message || 'Failed to store credentials' };
  }
}

/**
 * Normalize error message for consistent handling across platforms
 */
function normalizeBiometricError(error: any): { success: false; error: string } {
  const errorMessage = String(error?.message || error || '').toLowerCase();
  const errorCode = String(error?.code || '').toLowerCase();

  // Check for cancellation
  if (errorCode.includes('cancel') || errorMessage.includes('cancel') || 
      errorCode.includes('user_cancel') || errorMessage.includes('user cancel')) {
    return { success: false, error: 'cancelled' };
  }

  // Check for lockout
  if (errorCode.includes('lock') || errorMessage.includes('lock') ||
      errorCode.includes('too many') || errorMessage.includes('too many')) {
    return { success: false, error: 'lockout' };
  }

  // Check for authentication failure
  if (errorCode.includes('fail') || errorMessage.includes('fail') ||
      errorCode.includes('not recognized') || errorMessage.includes('not recognized')) {
    return { success: false, error: 'authentication_failed' };
  }

  // Check for biometric not available
  if (errorCode.includes('not_available') || errorMessage.includes('not available') ||
      errorCode.includes('no biometric')) {
    return { success: false, error: 'not_available' };
  }

  // Default generic error
  return { success: false, error: 'authentication_failed' };
}

/**
 * Quick biometric verification for app lock (no credential retrieval needed)
 * This is specifically for the app lock flow - use only this for app lock!
 */
export async function quickBiometricVerify(): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!Capacitor.isNativePlatform()) {
    return { success: false, error: 'Not on native platform' };
  }

  try {
    await NativeBiometric.verifyIdentity({
      reason: 'Unlock Synka',
      title: 'Unlock with Biometrics',
      subtitle: 'Use biometrics to unlock', // Generic text, let Android decide modality
      description: 'Confirm your identity to continue',
      // CRITICAL FIX: Allow fallback for better Face Unlock support on Android
      useFallback: true,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Biometric verification failed:', error);
    return normalizeBiometricError(error);
  }
}

/**
 * Authenticate with biometrics and retrieve stored credentials
 * Use this ONLY for login/session restoration, NOT for app lock
 */
export async function authenticateWithBiometrics(): Promise<{
  success: boolean;
  email?: string;
  userId?: string;
  error?: string;
}> {
  if (!Capacitor.isNativePlatform()) {
    return { success: false, error: 'Not on native platform' };
  }

  try {
    // First verify identity, then get credentials
    await NativeBiometric.verifyIdentity({
      reason: 'Continue in Synka',
      title: 'Access Synka',
      subtitle: 'Use biometrics to continue',
      description: 'Confirm your identity to access your account',
      useFallback: true,
    });

    // After successful verification, get credentials
    const credentials = await NativeBiometric.getCredentials({
      server: SERVER_ID,
    });

    if (credentials?.username && credentials?.password) {
      return {
        success: true,
        email: credentials.username,
        userId: credentials.password,
      };
    }

    // No credentials found - reset the flag
    setHasStoredBiometricCredentialsFlag(false);
    return { success: false, error: 'no_credentials' };
  } catch (error: any) {
    console.error('Biometric authentication failed:', error);
    
    // Normalize the error
    const normalizedError = normalizeBiometricError(error);
    
    // If it's a credential error, reset the flag
    if (normalizedError.error === 'authentication_failed' || normalizedError.error === 'not_available') {
      setHasStoredBiometricCredentialsFlag(false);
    }
    
    return { 
      success: false, 
      error: normalizedError.error 
    };
  }
}

/**
 * Verify biometric identity (standalone verification)
 */
export async function verifyBiometricIdentity(): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!Capacitor.isNativePlatform()) {
    return { success: false, error: 'Not on native platform' };
  }

  try {
    await NativeBiometric.verifyIdentity({
      reason: 'Verify your identity',
      title: 'Biometric Verification',
      subtitle: 'Use biometrics to verify',
      description: 'Confirm your identity',
      useFallback: true, // Allow fallback for better compatibility
    });

    return { success: true };
  } catch (error: any) {
    console.error('Biometric verification failed:', error);
    return normalizeBiometricError(error);
  }
}

/**
 * Delete stored biometric credentials
 */
export async function deleteBiometricCredentials(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await NativeBiometric.deleteCredentials({ server: SERVER_ID });
  } catch {
    // Ignore errors
  } finally {
    setHasStoredBiometricCredentialsFlag(false);
  }
}

/**
 * Get human-readable biometry type name
 */
export function getBiometryTypeName(type: BiometricResult['biometryType']): string {
  switch (type) {
    case 'fingerprint':
      return 'Fingerprint';
    case 'face':
      return 'Face ID';
    case 'iris':
      return 'Iris';
    case 'multiple':
      return 'Biometric';
    default:
      return 'Biometric';
  }
}

/**
 * Check if biometrics are properly configured for app lock
 */
export async function isBiometricReadyForAppLock(): Promise<{
  ready: boolean;
  error?: string;
}> {
  const availability = await checkBiometricAvailability();
  
  if (!availability.available) {
    return { ready: false, error: 'Biometrics not available on this device' };
  }
  
  if (!availability.hasCredentials) {
    return { ready: false, error: 'No biometric credentials stored' };
  }
  
  return { ready: true };
}

/**
 * Reset biometric credentials flag (use when biometric setup fails)
 */
export function resetBiometricCredentialsFlag(): void {
  setHasStoredBiometricCredentialsFlag(false);
}

/**
 * Simple check - is biometric authentication possible on this device?
 */
export async function isBiometricPossible(): Promise<boolean> {
  const result = await checkBiometricAvailability();
  return result.available;
}

/**
 * Get current biometric status
 */
export async function getBiometricStatus(): Promise<{
  isAvailable: boolean;
  hasCredentials: boolean;
  biometryType: string;
  isReadyForAppLock: boolean;
}> {
  const availability = await checkBiometricAvailability();
  const readyForAppLock = await isBiometricReadyForAppLock();
  
  return {
    isAvailable: availability.available,
    hasCredentials: availability.hasCredentials,
    biometryType: availability.biometryType,
    isReadyForAppLock: readyForAppLock.ready,
  };
}
