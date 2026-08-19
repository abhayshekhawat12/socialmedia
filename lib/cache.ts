/**
 * Lightweight client-side memory cache with TTL (Time To Live)
 * Enables 0ms instantaneous tab switching and optimistic rendering
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // in milliseconds
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();

  set<T>(key: string, data: T, ttlSeconds = 60): void {
    if (typeof window === "undefined") return;
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
    });
  }

  get<T>(key: string): T | null {
    if (typeof window === "undefined") return null;
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Stale-while-revalidate helper:
   * Returns cached data immediately if available, then executes fetcher in background to refresh cache.
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds = 60,
    onBackgroundUpdate?: (freshData: T) => void
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      // Revalidate in background without blocking
      fetcher()
        .then((fresh) => {
          this.set(key, fresh, ttlSeconds);
          if (onBackgroundUpdate) onBackgroundUpdate(fresh);
        })
        .catch(() => {});
      return cached;
    }

    const fresh = await fetcher();
    this.set(key, fresh, ttlSeconds);
    return fresh;
  }

  invalidate(keyPrefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(keyPrefix)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

export const appCache = new MemoryCache();
