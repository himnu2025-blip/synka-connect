/**
 * Premium in-memory cache with TTL support and stale-while-revalidate
 */
class MemoryCache<T> {
  private cache = new Map<string, { data: T; expiry: number; staleExpiry: number }>();
  private defaultTTL: number;
  private staleTTL: number;

  constructor(defaultTTLMs = 5 * 60 * 1000, staleTTLMs = 30 * 60 * 1000) {
    this.defaultTTL = defaultTTLMs;
    this.staleTTL = staleTTLMs;
  }

  set(key: string, data: T, ttlMs = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlMs,
      staleExpiry: Date.now() + this.staleTTL,
    });
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    // Return data if fresh
    if (Date.now() <= item.expiry) {
      return item.data;
    }

    // Return stale data if within stale window
    if (Date.now() <= item.staleExpiry) {
      return item.data;
    }

    // Fully expired
    this.cache.delete(key);
    return null;
  }

  // Check if data is stale but still usable
  isStale(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return true;
    return Date.now() > item.expiry;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

// Shared cache instances with longer stale windows for premium feel
export const apiCache = new MemoryCache<unknown>(5 * 60 * 1000, 60 * 60 * 1000); // 5min fresh, 1hr stale
export const profileCache = new MemoryCache<unknown>(10 * 60 * 1000, 60 * 60 * 1000); // 10min fresh, 1hr stale

/**
 * LocalStorage cache with expiry and stale-while-revalidate
 */
export const localStorageCache = {
  set<T>(key: string, data: T, ttlMs = 30 * 60 * 1000): void {
    try {
      localStorage.setItem(
        `cache_${key}`,
        JSON.stringify({
          data,
          expiry: Date.now() + ttlMs,
          staleExpiry: Date.now() + (ttlMs * 4), // 4x TTL for stale data
        })
      );
    } catch {
      // Storage full or disabled - try to clear old cache entries
      this.cleanup();
    }
  },

  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(`cache_${key}`);
      if (!item) return null;

      const parsed = JSON.parse(item);
      
      // Return data if within stale window (premium feel - show old data instantly)
      if (Date.now() <= (parsed.staleExpiry || parsed.expiry)) {
        return parsed.data as T;
      }

      localStorage.removeItem(`cache_${key}`);
      return null;
    } catch {
      return null;
    }
  },

  isStale(key: string): boolean {
    try {
      const item = localStorage.getItem(`cache_${key}`);
      if (!item) return true;
      const parsed = JSON.parse(item);
      return Date.now() > parsed.expiry;
    } catch {
      return true;
    }
  },

  delete(key: string): void {
    localStorage.removeItem(`cache_${key}`);
  },

  cleanup(): void {
    // Remove old cache entries to free space
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('cache_')) {
          const item = localStorage.getItem(key);
          if (item) {
            try {
              const parsed = JSON.parse(item);
              if (Date.now() > (parsed.staleExpiry || parsed.expiry)) {
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
  },
};

/**
 * Wrapper for fetch with caching and stale-while-revalidate
 */
export async function cachedFetch<T>(
  url: string,
  options?: RequestInit,
  ttlMs = 5 * 60 * 1000
): Promise<T> {
  const cacheKey = `fetch_${url}_${JSON.stringify(options?.body || '')}`;
  
  // Check memory cache first
  const cached = apiCache.get(cacheKey) as T | null;
  if (cached && !apiCache.isStale(cacheKey)) {
    return cached;
  }

  // Check localStorage for stale data
  const localCached = localStorageCache.get<T>(cacheKey);
  
  // If we have stale data, return it immediately and revalidate in background
  if (localCached) {
    if (localStorageCache.isStale(cacheKey)) {
      // Revalidate in background
      revalidate(url, options, cacheKey, ttlMs);
    }
    apiCache.set(cacheKey, localCached, ttlMs);
    return localCached;
  }

  // No cache, fetch fresh data
  const response = await fetch(url, options);
  const data = await response.json();

  // Cache the result
  apiCache.set(cacheKey, data, ttlMs);
  localStorageCache.set(cacheKey, data, ttlMs);

  return data as T;
}

// Background revalidation
async function revalidate(url: string, options: RequestInit | undefined, cacheKey: string, ttlMs: number) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    apiCache.set(cacheKey, data, ttlMs);
    localStorageCache.set(cacheKey, data, ttlMs);
  } catch {
    // Silent fail for background revalidation
  }
}

/**
 * Preload critical data into cache
 */
export function preloadData(userId: string) {
  // This function is called on auth to warm up caches
  // Data will be fetched by the respective hooks
}

/**
 * Get cached user info for returning users (PIN login flow)
 */
export function getCachedUser(): { email: string; name?: string } | null {
  try {
    const cached = localStorage.getItem('synka_cached_user');
    if (!cached) return null;
    return JSON.parse(cached);
  } catch {
    return null;
  }
}

/**
 * Set cached user info for returning users
 */
export function setCachedUser(email: string, name?: string): void {
  try {
    localStorage.setItem('synka_cached_user', JSON.stringify({ email, name }));
  } catch {
    // Storage disabled
  }
}

/**
 * Clear cached user info
 */
export function clearCachedUser(): void {
  try {
    localStorage.removeItem('synka_cached_user');
  } catch {
    // Ignore
  }
}
