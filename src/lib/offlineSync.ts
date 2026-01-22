/**
 * Offline sync manager for PWA
 * Handles background sync and offline data persistence
 */

// Extended cache TTL for offline - 7 days
const OFFLINE_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

// Check if online
export const isOnline = () => navigator.onLine;

// Register service worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.log('[SW] Service workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    console.log('[SW] Service worker registered');
    return registration;
  } catch (error) {
    console.error('[SW] Registration failed:', error);
    return null;
  }
}

// Listen for online/offline events
export function setupNetworkListeners(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

// Persist data for offline use (extended TTL)
export function persistForOffline<T>(key: string, data: T): void {
  try {
    localStorage.setItem(
      `offline_${key}`,
      JSON.stringify({
        data,
        timestamp: Date.now(),
        expiry: Date.now() + OFFLINE_CACHE_TTL
      })
    );
  } catch (error) {
    console.warn('[Offline] Failed to persist data:', error);
    // Try to free up space
    cleanupOldOfflineData();
  }
}

// Get offline persisted data
export function getOfflineData<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(`offline_${key}`);
    if (!item) return null;

    const parsed = JSON.parse(item);
    // Return data even if expired when offline
    if (!isOnline() || Date.now() <= parsed.expiry) {
      return parsed.data as T;
    }

    // Online and expired - clean up
    localStorage.removeItem(`offline_${key}`);
    return null;
  } catch {
    return null;
  }
}

// Clean up old offline data
export function cleanupOldOfflineData(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('offline_')) {
        const item = localStorage.getItem(key);
        if (item) {
          try {
            const parsed = JSON.parse(item);
            if (Date.now() > parsed.expiry) {
              keysToRemove.push(key);
            }
          } catch {
            keysToRemove.push(key);
          }
        }
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch {
    // Ignore cleanup errors
  }
}

// Queue offline changes for sync
export function queueOfflineChange(
  type: 'update' | 'create' | 'delete',
  table: string,
  data: unknown
): void {
  try {
    const queue = JSON.parse(localStorage.getItem('offline_sync_queue') || '[]');
    queue.push({
      type,
      table,
      data,
      timestamp: Date.now()
    });
    localStorage.setItem('offline_sync_queue', JSON.stringify(queue));
  } catch {
    console.warn('[Offline] Failed to queue change');
  }
}

// Process offline queue when back online
export async function processOfflineQueue(): Promise<void> {
  if (!isOnline()) return;

  try {
    const queue = JSON.parse(localStorage.getItem('offline_sync_queue') || '[]');
    if (queue.length === 0) return;

    console.log(`[Offline] Processing ${queue.length} queued changes`);
    
    // Clear queue after processing (in real app, process each item)
    localStorage.removeItem('offline_sync_queue');
    
    // Trigger refetch to get latest data
    window.dispatchEvent(new CustomEvent('synka:data-sync'));
  } catch (error) {
    console.error('[Offline] Failed to process queue:', error);
  }
}

// Request background sync
export async function requestBackgroundSync(): Promise<void> {
  if (!('serviceWorker' in navigator) || !('sync' in ServiceWorkerRegistration.prototype)) {
    // Fallback for browsers without background sync
    await processOfflineQueue();
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await (registration as any).sync.register('sync-data');
  } catch (error) {
    console.warn('[Offline] Background sync not available:', error);
    await processOfflineQueue();
  }
}
