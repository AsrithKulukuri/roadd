/**
 * Location Cache Interface
 * NOTE: Default implementation is in-memory and per-process.
 * If running under PM2 cluster mode or multi-instance serverless,
 * implement this interface using Redis or Supabase.
 */
export interface ILocationCache<T> {
  get(key: string): Promise<T | null>;
  set(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class InMemoryLocationCache<T> implements ILocationCache<T> {
  private cache = new Map<string, CacheEntry<T>>();

  async get(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: T, ttlSeconds = 86400): Promise<void> {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}

// Global singleton instance for 24h location caching
export const locationCache = new InMemoryLocationCache<any>();

