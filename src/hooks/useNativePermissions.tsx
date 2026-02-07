/**
 * Hook to request all native permissions upfront at app startup
 * This ensures smooth UX when using features like camera, contacts, biometrics
 */

import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { Contacts } from '@capacitor-community/contacts';
import { NativeBiometric } from 'capacitor-native-biometric';

const PERMISSIONS_REQUESTED_KEY = 'native_permissions_requested';

/**
 * Request all necessary permissions when the app first launches
 * Only runs once per install (persisted via localStorage)
 */
export function useNativePermissions() {
  const hasRequestedRef = useRef(false);

  useEffect(() => {
    // Only run on native platforms
    if (!Capacitor.isNativePlatform()) return;
    
    // Prevent double-runs in StrictMode
    if (hasRequestedRef.current) return;
    
    // Check if already requested
    const alreadyRequested = localStorage.getItem(PERMISSIONS_REQUESTED_KEY);
    if (alreadyRequested) return;

    hasRequestedRef.current = true;

    // Request permissions with a small delay to ensure app is fully loaded
    const timer = setTimeout(async () => {
      await requestAllPermissions();
      localStorage.setItem(PERMISSIONS_REQUESTED_KEY, 'true');
    }, 1500);

    return () => clearTimeout(timer);
  }, []);
}

/**
 * Request all native permissions sequentially
 */
async function requestAllPermissions() {
  console.log('[Permissions] Requesting native permissions...');

  try {
    // 1. Camera permission (for scanning business cards, QR codes, profile photos)
    await requestCameraPermission();
    
    // 2. Contacts permission (for saving and reading contacts)
    await requestContactsPermission();
    
    // 3. Biometric permission (for app lock)
    await checkBiometricAvailability();

    console.log('[Permissions] All permission requests completed');
  } catch (error) {
    console.error('[Permissions] Error requesting permissions:', error);
  }
}

async function requestCameraPermission() {
  try {
    const result = await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
    console.log('[Permissions] Camera:', result.camera, 'Photos:', result.photos);
  } catch (error) {
    console.warn('[Permissions] Camera permission request failed:', error);
  }
}

async function requestContactsPermission() {
  try {
    const result = await Contacts.requestPermissions();
    console.log('[Permissions] Contacts:', result.contacts);
  } catch (error) {
    console.warn('[Permissions] Contacts permission request failed:', error);
  }
}

async function checkBiometricAvailability() {
  try {
    const result = await NativeBiometric.isAvailable();
    console.log('[Permissions] Biometric available:', result.isAvailable, 'Type:', result.biometryType);
  } catch (error) {
    console.warn('[Permissions] Biometric check failed:', error);
  }
}

/**
 * Manually re-request permissions (e.g., from settings page)
 */
export async function requestPermissionsManually() {
  if (!Capacitor.isNativePlatform()) return;
  await requestAllPermissions();
}

/**
 * Reset the permission requested flag (for testing)
 */
export function resetPermissionsFlag() {
  localStorage.removeItem(PERMISSIONS_REQUESTED_KEY);
}
