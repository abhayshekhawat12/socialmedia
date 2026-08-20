/**
 * High-performance client-side cache with In-Memory + LocalStorage persistence & TTL.
 * Implements the Stale-While-Revalidate pattern for instantaneous (0ms) app rendering.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // in milliseconds
}

class AdvancedAppCache {
  private memoryCache = new Map<string, CacheEntry<any>>();

  private getStorageKey(key: string): string {
    return `pulse_cache_${key}`;
  }

  set<T>(key: string, data: T, ttlSeconds = 120, persistToLocal = true): void {
    if (typeof window === "undefined") return;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
    };

    this.memoryCache.set(key, entry);

    if (persistToLocal) {
      try {
        localStorage.setItem(this.getStorageKey(key), JSON.stringify(entry));
      } catch (e) {
        // Handle localStorage quota limits gracefully
      }
    }
  }

  get<T>(key: string, allowExpired = false): T | null {
    if (typeof window === "undefined") return null;

    // 1. Check memory cache first
    let entry = this.memoryCache.get(key);

    // 2. Fallback to localStorage
    if (!entry) {
      try {
        const stored = localStorage.getItem(this.getStorageKey(key));
        if (stored) {
          entry = JSON.parse(stored);
          if (entry) {
            this.memoryCache.set(key, entry);
          }
        }
      } catch (e) {
        // Ignore parse error
      }
    }

    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired && !allowExpired) {
      this.memoryCache.delete(key);
      try {
        localStorage.removeItem(this.getStorageKey(key));
      } catch {}
      return null;
    }

    return entry.data as T;
  }

  /**
   * Stale-While-Revalidate helper:
   * Returns cached data immediately (even if slightly stale) for instantaneous UI response,
   * then fetches fresh data in the background and calls onBackgroundUpdate.
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds = 120,
    onBackgroundUpdate?: (freshData: T) => void
  ): Promise<T> {
    const cached = this.get<T>(key, true); // Allow stale for instant render
    if (cached !== null) {
      // Revalidate in background without blocking caller
      fetcher()
        .then((fresh) => {
          if (fresh !== undefined && fresh !== null) {
            this.set(key, fresh, ttlSeconds);
            if (onBackgroundUpdate) onBackgroundUpdate(fresh);
          }
        })
        .catch((err) => {
          console.warn(`Background revalidate failed for ${key}:`, err);
        });
      return cached;
    }

    const fresh = await fetcher();
    if (fresh !== undefined && fresh !== null) {
      this.set(key, fresh, ttlSeconds);
    }
    return fresh;
  }

  invalidate(keyPrefix: string): void {
    if (typeof window === "undefined") return;

    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(keyPrefix)) {
        this.memoryCache.delete(key);
      }
    }

    try {
      const storagePrefix = this.getStorageKey(keyPrefix);
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(storagePrefix)) {
          localStorage.removeItem(k);
        }
      }
    } catch {}
  }

  clear(): void {
    this.memoryCache.clear();
    if (typeof window === "undefined") return;
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith("pulse_cache_")) {
          localStorage.removeItem(k);
        }
      }
    } catch {}
  }
}

export const appCache = new AdvancedAppCache();
