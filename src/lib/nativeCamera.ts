/**
 * Native Camera for Capacitor Android
 * 
 * IMPORTANT: Web camera API (getUserMedia) and file inputs with capture
 * are unreliable in Capacitor Android WebView.
 * This module uses @capacitor/camera for reliable native camera access.
 */

import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource, CameraPermissionState } from '@capacitor/camera';

export interface CameraResult {
  success: boolean;
  base64?: string;
  webPath?: string;
  error?: string;
}

/**
 * Check camera permissions
 */
export async function checkCameraPermissions(): Promise<{
  camera: CameraPermissionState;
  photos: CameraPermissionState;
}> {
  if (!Capacitor.isNativePlatform()) {
    // On web, permissions are handled by browser
    return { camera: 'granted', photos: 'granted' };
  }

  try {
    const permissions = await Camera.checkPermissions();
    return {
      camera: permissions.camera,
      photos: permissions.photos,
    };
  } catch (error) {
    console.error('Camera permission check failed:', error);
    return { camera: 'denied', photos: 'denied' };
  }
}

/**
 * Request camera permissions
 */
export async function requestCameraPermissions(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return true; // Web handles permissions via browser
  }

  try {
    const result = await Camera.requestPermissions({
      permissions: ['camera', 'photos'],
    });
    return result.camera === 'granted';
  } catch (error) {
    console.error('Camera permission request failed:', error);
    return false;
  }
}

/**
 * Take a photo using the native camera
 * Returns base64 image data suitable for OCR processing
 */
export async function takePhoto(): Promise<CameraResult> {
  try {
    // Check and request permissions on native
    if (Capacitor.isNativePlatform()) {
      const perms = await checkCameraPermissions();
      if (perms.camera !== 'granted') {
        const granted = await requestCameraPermissions();
        if (!granted) {
          return { success: false, error: 'Camera permission denied. Please allow camera access in your device settings.' };
        }
      }
    }

    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera,
      correctOrientation: true,
      width: 1920, // Limit width for OCR performance
      height: 1920,
    });

    if (!image.base64String) {
      return { success: false, error: 'No image captured' };
    }

    return {
      success: true,
      base64: image.base64String,
      webPath: image.webPath,
    };
  } catch (error: any) {
    console.error('Camera capture failed:', error);
    
    // User cancelled
    if (error?.message?.includes('cancelled') || error?.message?.includes('cancel')) {
      return { success: false, error: 'cancelled' };
    }
    
    return {
      success: false,
      error: error?.message || 'Failed to capture photo. Please try again.',
    };
  }
}

/**
 * Pick a photo from the gallery
 * Returns base64 image data
 */
export async function pickFromGallery(): Promise<CameraResult> {
  try {
    // Check photos permission on native
    if (Capacitor.isNativePlatform()) {
      const perms = await checkCameraPermissions();
      if (perms.photos !== 'granted') {
        const granted = await requestCameraPermissions();
        if (!granted) {
          return { success: false, error: 'Photo library permission denied. Please allow access in your device settings.' };
        }
      }
    }

    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Photos,
      correctOrientation: true,
      width: 1920,
      height: 1920,
    });

    if (!image.base64String) {
      return { success: false, error: 'No image selected' };
    }

    return {
      success: true,
      base64: image.base64String,
      webPath: image.webPath,
    };
  } catch (error: any) {
    console.error('Photo selection failed:', error);
    
    if (error?.message?.includes('cancelled') || error?.message?.includes('cancel')) {
      return { success: false, error: 'cancelled' };
    }
    
    return {
      success: false,
      error: error?.message || 'Failed to select photo. Please try again.',
    };
  }
}

/**
 * Prompt user to take photo or pick from gallery
 * Returns base64 image data
 */
export async function captureOrPickImage(): Promise<CameraResult> {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Prompt, // Shows action sheet to choose camera or gallery
      correctOrientation: true,
      width: 1920,
      height: 1920,
      promptLabelHeader: 'Scan Business Card',
      promptLabelCancel: 'Cancel',
      promptLabelPhoto: 'Take Photo',
      promptLabelPicture: 'Choose from Gallery',
    });

    if (!image.base64String) {
      return { success: false, error: 'No image captured' };
    }

    return {
      success: true,
      base64: image.base64String,
      webPath: image.webPath,
    };
  } catch (error: any) {
    console.error('Image capture failed:', error);
    
    if (error?.message?.includes('cancelled') || error?.message?.includes('cancel')) {
      return { success: false, error: 'cancelled' };
    }
    
    return {
      success: false,
      error: error?.message || 'Failed to capture image. Please try again.',
    };
  }
}

/**
 * Check if we're on a native platform where camera native plugin should be used
 */
export function shouldUseNativeCamera(): boolean {
  return Capacitor.isNativePlatform();
}
