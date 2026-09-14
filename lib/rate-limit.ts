/**
 * Lightweight fixed-window rate limiter.
 *
 * Buckets are held in-process. On serverless platforms each warm instance keeps
 * its own counters, so this is a defense-in-depth layer (stops runaway clients /
 * burst abuse), not a hard quota across a fleet. It keys on the authenticated
 * user id, which callers own, and is deliberately dependency-free.
 */

export interface RateLimitOptions {
  limit?: number;
  windowMs?: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export const DEFAULT_RATE_LIMIT_LIMIT = 60;
export const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;

const buckets = new Map<string, Bucket>();

function sweep(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

// Keep the map bounded even when keys are never hit again.
const CLEANUP_INTERVAL_MS = 60_000;
const cleanupTimer =
  typeof setInterval === 'function'
    ? setInterval(() => sweep(Date.now()), CLEANUP_INTERVAL_MS)
    : undefined;
cleanupTimer?.unref?.();

export function clearRateLimitBuckets(): void {
  buckets.clear();
}

export function checkRateLimit(key: string, opts: RateLimitOptions = {}): RateLimitResult {
  const now = Date.now();
  const limit = opts.limit ?? DEFAULT_RATE_LIMIT_LIMIT;
  const windowMs = opts.windowMs ?? DEFAULT_RATE_LIMIT_WINDOW_MS;

  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    const nextBucket: Bucket = { count: 1, resetAt: now + windowMs };
    buckets.set(key, nextBucket);
    return {
      ok: limit >= 1,
      remaining: Math.max(0, limit - 1),
      retryAfterSeconds: Math.max(1, Math.ceil(windowMs / 1000)),
    };
  }

  bucket.count += 1;
  const remaining = Math.max(0, limit - bucket.count);
  return {
    ok: bucket.count <= limit,
    remaining,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}
