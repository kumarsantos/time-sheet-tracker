import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkRateLimit,
  clearRateLimitBuckets,
  DEFAULT_RATE_LIMIT_LIMIT,
  DEFAULT_RATE_LIMIT_WINDOW_MS,
} from '@/lib/rate-limit';

describe('checkRateLimit', () => {
  beforeEach(() => {
    clearRateLimitBuckets();
  });

  afterEach(() => {
    clearRateLimitBuckets();
  });

  it('allows requests up to the configured limit', () => {
    const key = 'user:1';
    for (let i = 1; i <= 5; i++) {
      const result = checkRateLimit(key, { limit: 5, windowMs: 1000 });
      expect(result.ok).toBe(true);
      expect(result.remaining).toBe(5 - i);
    }
    expect(checkRateLimit(key, { limit: 5, windowMs: 1000 }).ok).toBe(false);
  });

  it('reports a positive Retry-After while the window is open', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    try {
      for (let i = 0; i < DEFAULT_RATE_LIMIT_LIMIT; i++) {
        checkRateLimit('user:2');
      }
      const blocked = checkRateLimit('user:2');
      expect(blocked.ok).toBe(false);
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
      expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(DEFAULT_RATE_LIMIT_WINDOW_MS / 1000);
    } finally {
      vi.useRealTimers();
    }
  });

  it('resets the budget after the window elapses', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    try {
      const key = 'user:3';
      checkRateLimit(key, { limit: 1, windowMs: 10_000 });
      expect(checkRateLimit(key, { limit: 1, windowMs: 10_000 }).ok).toBe(false);

      vi.advanceTimersByTime(10_001);
      expect(checkRateLimit(key, { limit: 1, windowMs: 10_000 }).ok).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps keys isolated from each other', () => {
    checkRateLimit('user:a', { limit: 1, windowMs: 1000 });
    expect(checkRateLimit('user:a', { limit: 1, windowMs: 1000 }).ok).toBe(false);
    expect(checkRateLimit('user:b', { limit: 1, windowMs: 1000 }).ok).toBe(true);
  });
});
