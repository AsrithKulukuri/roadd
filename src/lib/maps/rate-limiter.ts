/**
 * Rate Limiter Interface
 * NOTE: Default implementation is in-memory and per-process.
 * If running in PM2 cluster mode or multi-server deployments,
 * this interface can be backed by Redis token bucket.
 */
export interface IRateLimiter {
  check(identifier: string, maxRequests: number, windowSeconds: number): Promise<{
    allowed: boolean;
    remaining: number;
    resetSeconds: number;
  }>;
}

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export class InMemoryRateLimiter implements IRateLimiter {
  private records = new Map<string, RateLimitRecord>();

  async check(
    identifier: string,
    maxRequests: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetSeconds: number }> {
    const now = Date.now();
    const record = this.records.get(identifier);

    if (!record || now > record.resetAt) {
      const resetAt = now + windowSeconds * 1000;
      this.records.set(identifier, { count: 1, resetAt });
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetSeconds: windowSeconds,
      };
    }

    if (record.count >= maxRequests) {
      const resetSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
      return {
        allowed: false,
        remaining: 0,
        resetSeconds,
      };
    }

    record.count++;
    const resetSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    return {
      allowed: true,
      remaining: maxRequests - record.count,
      resetSeconds,
    };
  }
}

// Global rate limiter instance: 60 requests per minute per admin
export const mapsApiRateLimiter = new InMemoryRateLimiter();

