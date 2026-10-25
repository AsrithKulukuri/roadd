/**
 * ROAD Enterprise-Grade Resilient Redis Caching Layer
 * 
 * Supports:
 * 1. Standard Direct TCP Redis / Docker / Self-Hosted via REDIS_URL or REDIS_HOST, REDIS_PORT, REDIS_PASSWORD (IORedis)
 * 2. Bounded In-Memory LRU Cache Fallback with TTL enforcement
 * 3. Single-Flight Request Coalescing (Prevents database stampedes on cache misses)
 * 4. Tag & Versioned Cache Invalidation (O(1) zero-blocking invalidation)
 * 5. Non-blocking cursor-based SCAN / UNLINK for explicit prefix pruning
 * 6. TTL Jitter to prevent synchronized cache avalanches
 */

import IORedis from "ioredis";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

export type CacheTag = 
  | "projects"
  | "properties"
  | "locations"
  | "home_sections"
  | "site_features";

export interface CacheOptions {
  ttlSeconds?: number;
  tag?: CacheTag;
  enableJitter?: boolean;
}

interface MemoryCacheItem<T> {
  value: T;
  expiresAt: number;
}

export interface RedisTelemetry {
  provider: "ioredis" | "memory";
  status: "connected" | "fallback" | "unconfigured";
  hits: number;
  misses: number;
  hitRatio: string;
  memoryEntries: number;
  activeInFlightRequests: number;
  lastError: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL STATE PRESERVATION (Next.js Hot-Reload & Serverless Reusability)
// ─────────────────────────────────────────────────────────────────────────────

interface GlobalRedisState {
  ioredis: IORedis | null;
  activeProvider: "ioredis" | "memory";
  connectionStatus: "connected" | "fallback" | "unconfigured";
  initialized: boolean;
  memoryStore: Map<string, MemoryCacheItem<unknown>>;
  inFlightPromises: Map<string, Promise<unknown>>;
  tagVersions: Map<string, number>;
  hits: number;
  misses: number;
  lastError: string | null;
}

const g = globalThis as unknown as { __roadRedisState?: GlobalRedisState };

if (!g.__roadRedisState) {
  g.__roadRedisState = {
    ioredis: null,
    activeProvider: "memory",
    connectionStatus: "unconfigured",
    initialized: false,
    memoryStore: new Map(),
    inFlightPromises: new Map(),
    tagVersions: new Map(),
    hits: 0,
    misses: 0,
    lastError: null,
  };
}

const state = g.__roadRedisState;
const MAX_MEMORY_ENTRIES = 500;

// ─────────────────────────────────────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────────────────────────────────────

function initializeClients(): void {
  if (state.initialized) return;
  state.initialized = true;

  // Direct TCP Redis (IORedis)
  const redisUrl = process.env.REDIS_URL || process.env.REDIS_TLS_URL || (process.env.NODE_ENV !== "production" ? "redis://127.0.0.1:6379" : undefined);
  const redisHost = process.env.REDIS_HOST;
  if (redisUrl || redisHost) {
    try {
      const port = Number(process.env.REDIS_PORT || 6379);
      const password = process.env.REDIS_PASSWORD || undefined;

      const client = redisUrl
        ? new IORedis(redisUrl.trim(), {
            connectTimeout: 2000,
            maxRetriesPerRequest: 1,
            lazyConnect: true,
            retryStrategy: (times) => (times > 3 ? null : Math.min(times * 100, 1000)),
          })
        : new IORedis({
            host: redisHost?.trim(),
            port,
            password,
            connectTimeout: 2000,
            maxRetriesPerRequest: 1,
            lazyConnect: true,
            retryStrategy: (times) => (times > 3 ? null : Math.min(times * 100, 1000)),
          });

      client.on("error", (err: any) => {
        state.lastError = err?.message || String(err);
        state.connectionStatus = "fallback";
        state.activeProvider = "memory";
        console.warn("⚠️ [Redis] IORedis socket error. Operating on Memory Cache fallback:", state.lastError);
      });

      client.on("connect", () => {
        state.activeProvider = "ioredis";
        state.connectionStatus = "connected";
        state.lastError = null;
        console.log("⚡ [Redis] Connected to standard Redis instance via IORedis.");
      });

      client.on("ready", () => {
        state.activeProvider = "ioredis";
        state.connectionStatus = "connected";
        state.lastError = null;
      });

      // Non-blocking background connect
      client.connect().catch((err: any) => {
        state.lastError = err?.message || String(err);
        state.connectionStatus = "fallback";
        state.activeProvider = "memory";
      });

      state.ioredis = client;
      return;
    } catch (err: any) {
      state.lastError = err?.message || String(err);
      console.warn("⚠️ [Redis] IORedis creation failed, operating on Memory Cache:", state.lastError);
    }
  }

  // Fallback to Local In-Memory Cache
  state.activeProvider = "memory";
  state.connectionStatus = "unconfigured";
}

// Eagerly initiate connection on server-side
if (typeof window === "undefined") {
  initializeClients();
}

// ─────────────────────────────────────────────────────────────────────────────
// BOUNDED IN-MEMORY LRU CACHE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getFromMemory<T>(key: string): T | null {
  const item = state.memoryStore.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    state.memoryStore.delete(key);
    return null;
  }
  return item.value as T;
}

function setToMemory<T>(key: string, value: T, ttlSeconds: number): void {
  // Evict expired or oldest entries if over capacity
  if (state.memoryStore.size >= MAX_MEMORY_ENTRIES) {
    const now = Date.now();
    let cleaned = 0;
    for (const [k, v] of state.memoryStore.entries()) {
      if (now > v.expiresAt) {
        state.memoryStore.delete(k);
        cleaned++;
      }
    }
    // If still full, drop oldest 10%
    if (state.memoryStore.size >= MAX_MEMORY_ENTRIES) {
      const keysToDelete = Array.from(state.memoryStore.keys()).slice(0, 50);
      for (const k of keysToDelete) state.memoryStore.delete(k);
    }
  }

  state.memoryStore.set(key, {
    value,
    expiresAt: Date.now() + Math.max(1, ttlSeconds) * 1000,
  });
}

function deleteFromMemory(patternOrPrefix: string): void {
  const isPrefix = patternOrPrefix.endsWith("*");
  const prefix = isPrefix ? patternOrPrefix.slice(0, -1) : patternOrPrefix;
  for (const k of state.memoryStore.keys()) {
    if (isPrefix ? k.startsWith(prefix) : k === patternOrPrefix) {
      state.memoryStore.delete(k);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TTL & JITTER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Adds +/- 8% random jitter to TTL to prevent thundering herds on key expiry
 */
export function applyTtlJitter(ttlSeconds: number, enableJitter = true): number {
  if (!enableJitter || ttlSeconds <= 5) return ttlSeconds;
  const variance = Math.floor(ttlSeconds * 0.08);
  const randomShift = Math.floor(Math.random() * (variance * 2 + 1)) - variance;
  return Math.max(1, ttlSeconds + randomShift);
}

// ─────────────────────────────────────────────────────────────────────────────
// VERSIONED TAG INVALIDATION (O(1) Instant Invalidation)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retrieves the current version number for a tag.
 * In production multi-instance environments (Vercel Serverless), queries remote Redis
 * to ensure all distributed instances share the exact same tag version.
 */
export async function getTagVersion(tag: CacheTag): Promise<number> {
  initializeClients();
  const versionKey = `tag_version:${tag}`;

  // 1. Try Direct IORedis
  if (state.ioredis && state.ioredis.status === "ready") {
    try {
      const v = await state.ioredis.get(versionKey);
      if (v) {
        const num = parseInt(v, 10);
        if (!isNaN(num) && num > 0) {
          state.tagVersions.set(tag, num);
          return num;
        }
      }
      await state.ioredis.set(versionKey, "1");
      state.tagVersions.set(tag, 1);
      return 1;
    } catch (err: any) {
      state.lastError = err?.message || String(err);
      // Fall through to memory fallback
    }
  }

  // 2. Fallback to Local In-Memory version
  const localVer = state.tagVersions.get(tag);
  if (localVer !== undefined && localVer > 0) return localVer;

  state.tagVersions.set(tag, 1);
  return 1;
}

/**
 * Atomically increments the version of a tag.
 * All cached items referencing this tag's version become immediately invalid in O(1) time.
 */
export async function bumpTagVersion(tag: CacheTag): Promise<number> {
  initializeClients();
  const versionKey = `tag_version:${tag}`;

  // Always purge local memory entries tagged with this tag
  deleteFromMemory(`t:${tag}:*`);

  // 1. Try Direct IORedis
  if (state.ioredis && state.ioredis.status === "ready") {
    try {
      const bumped = await state.ioredis.incr(versionKey);
      state.tagVersions.set(tag, bumped);
      return bumped;
    } catch (err: any) {
      state.lastError = err?.message || String(err);
      console.warn(`⚠️ [Redis] IORedis bumpTagVersion(${tag}) failed:`, state.lastError);
      // Fall through to memory fallback
    }
  }

  // 2. Memory fallback
  const currentLocal = state.tagVersions.get(tag) || 1;
  const newVer = currentLocal + 1;
  state.tagVersions.set(tag, newVer);
  return newVer;
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE CACHING PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get an item from Redis or In-Memory Cache
 */
export async function getCache<T>(key: string): Promise<T | null> {
  initializeClients();

  // 1. Try Direct IORedis
  if (state.ioredis && state.ioredis.status === "ready") {
    try {
      const raw = await state.ioredis.get(key);
      if (raw !== null) {
        state.hits++;
        return JSON.parse(raw) as T;
      }
      state.misses++;
      return null;
    } catch (err: any) {
      state.lastError = err?.message || String(err);
    }
  }

  // 2. Fallback to In-Memory Cache
  const mem = getFromMemory<T>(key);
  if (mem !== null) {
    state.hits++;
    return mem;
  }
  state.misses++;
  return null;
}

/**
 * Set an item in Redis and In-Memory Fallback Cache with a TTL
 */
export async function setCache<T>(
  key: string,
  value: T,
  ttlSeconds = 300,
  enableJitter = true
): Promise<void> {
  if (value === null || value === undefined) return;
  initializeClients();

  const effectiveTtl = applyTtlJitter(ttlSeconds, enableJitter);

  // Write to memory cache immediately for zero-latency local fast path
  setToMemory(key, value, effectiveTtl);

  // Direct IORedis
  if (state.ioredis && state.ioredis.status === "ready") {
    try {
      await state.ioredis.set(key, JSON.stringify(value), "EX", effectiveTtl);
      return;
    } catch (err: any) {
      state.lastError = err?.message || String(err);
      console.warn(`⚠️ [IORedis Set Error for ${key}]:`, state.lastError);
    }
  }
}

/**
 * Non-blocking cursor-based invalidation for prefixes or explicit keys
 */
export async function invalidateCache(patternOrPrefix: string): Promise<void> {
  initializeClients();

  // Purge memory cache
  deleteFromMemory(patternOrPrefix);

  const isPattern = patternOrPrefix.includes("*");

  // Direct IORedis (Safe Non-blocking SCAN + UNLINK)
  if (state.ioredis && state.ioredis.status === "ready") {
    try {
      if (isPattern) {
        const stream = state.ioredis.scanStream({
          match: patternOrPrefix,
          count: 100,
        });

        stream.on("data", (keys: string[]) => {
          if (keys.length > 0 && state.ioredis) {
            // unlink is non-blocking async deletion in Redis
            state.ioredis.unlink(...keys).catch(() => {});
          }
        });
      } else {
        await state.ioredis.unlink(patternOrPrefix);
      }
    } catch (err: any) {
      state.lastError = err?.message || String(err);
      console.warn(`⚠️ [IORedis Invalidation Error for ${patternOrPrefix}]:`, state.lastError);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE-FLIGHT REQUEST COALESCING (Prevents Thundering Herds)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Executes fetcher with Redis cache-aside and in-flight request deduplication.
 * If 10 requests for the same key arrive simultaneously while cache is empty,
 * only 1 database query executes; all 10 await and receive the same result.
 */
export async function fetchWithCache<T>(
  rawKey: string,
  fetcher: () => Promise<T>,
  options: CacheOptions | number = 300
): Promise<T> {
  const opts: CacheOptions = typeof options === "number" ? { ttlSeconds: options } : options;
  const baseTtl = opts.ttlSeconds ?? 300;
  const enableJitter = opts.enableJitter !== false;

  // If a tag is specified, incorporate tag version into key for O(1) invalidation
  let key = rawKey;
  if (opts.tag) {
    const version = await getTagVersion(opts.tag);
    key = `t:${opts.tag}:v${version}:${rawKey}`;
  }

  // 1. Check Cache
  const cached = await getCache<T>(key);
  if (cached !== null && cached !== undefined) {
    return cached;
  }

  // 2. Check in-flight promise to coalesce simultaneous requests
  const existingPromise = state.inFlightPromises.get(key);
  if (existingPromise) {
    return existingPromise as Promise<T>;
  }

  // 3. Initiate single-flight fetch
  const fetchPromise = (async () => {
    try {
      const freshData = await fetcher();

      // Guard: Never cache null, undefined, or empty error payloads
      if (freshData !== null && freshData !== undefined) {
        // Fire-and-forget async set to avoid blocking response
        setCache(key, freshData, baseTtl, enableJitter).catch(() => {});
      }
      return freshData;
    } finally {
      // Clean up in-flight tracker
      state.inFlightPromises.delete(key);
    }
  })();

  state.inFlightPromises.set(key, fetchPromise);
  return fetchPromise;
}

// ─────────────────────────────────────────────────────────────────────────────
// QUERY NORMALIZATION HELPER
// ─────────────────────────────────────────────────────────────────────────────

const IGNORED_QUERY_PARAMS = new Set(["_t", "timestamp", "cb", "cachebust", "ref", "utm_source", "utm_medium", "utm_campaign"]);

/**
 * Normalizes URL query parameters to produce deterministic, collision-proof cache keys.
 * Filters out tracking / noise parameters and supports whitelisting applicable query keys.
 */
export function normalizeQueryKey(
  basePrefix: string,
  params: URLSearchParams | Record<string, unknown>,
  allowedKeys?: string[] | Set<string>
): string {
  const normalizedParams: string[] = [];
  const allowedSet = allowedKeys ? (allowedKeys instanceof Set ? allowedKeys : new Set(allowedKeys.map(k => k.toLowerCase()))) : null;

  if (params instanceof URLSearchParams) {
    const sortedKeys = Array.from(new Set(params.keys())).sort();
    for (const rawK of sortedKeys) {
      const k = rawK.toLowerCase().trim();
      if (IGNORED_QUERY_PARAMS.has(k)) continue;
      if (allowedSet && !allowedSet.has(k)) continue;

      const val = params.getAll(rawK).map(v => v.trim()).filter(Boolean).sort().join(",");
      if (val) {
        normalizedParams.push(`${k}=${val.toLowerCase()}`);
      }
    }
  } else {
    const sortedKeys = Object.keys(params).sort();
    for (const rawK of sortedKeys) {
      const k = rawK.toLowerCase().trim();
      if (IGNORED_QUERY_PARAMS.has(k)) continue;
      if (allowedSet && !allowedSet.has(k)) continue;

      const v = params[rawK];
      if (v !== undefined && v !== null && v !== "") {
        normalizedParams.push(`${k}=${String(v).trim().toLowerCase()}`);
      }
    }
  }

  return normalizedParams.length > 0
    ? `${basePrefix}:${normalizedParams.join("&")}`
    : basePrefix;
}

// ─────────────────────────────────────────────────────────────────────────────
// TELEMETRY
// ─────────────────────────────────────────────────────────────────────────────

export function getRedisTelemetry(): RedisTelemetry {
  initializeClients();
  const total = state.hits + state.misses;
  const ratio = total > 0 ? (state.hits / total).toFixed(3) : "0.000";

  // Sanitize lastError to redact passwords, tokens, and authorization headers
  const sanitizedError = state.lastError
    ? state.lastError
        .replace(/:\/\/([^:@]+):([^@]+)@/g, "://$1:***@")
        .replace(/token=([a-zA-Z0-9_\-.]+)/gi, "token=***")
    : null;

  return {
    provider: state.activeProvider,
    status: state.connectionStatus,
    hits: state.hits,
    misses: state.misses,
    hitRatio: ratio,
    memoryEntries: state.memoryStore.size,
    activeInFlightRequests: state.inFlightPromises.size,
    lastError: sanitizedError,
  };
}
