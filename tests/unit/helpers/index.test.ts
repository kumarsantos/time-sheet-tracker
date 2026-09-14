import { describe, expect, it } from 'vitest';
import {
  clampHours,
  formatDateHeader,
  formatRangeSubheader,
  monthIndex,
  parseWeekStart,
} from '@/lib/helpers';

describe('clampHours', () => {
  it('clamps to the 0.5–24 range', () => {
    expect(clampHours(0)).toBe('0.5');
    expect(clampHours(-3)).toBe('0.5');
    expect(clampHours(25)).toBe('24');
    expect(clampHours(100)).toBe('24');
  });

  it('rounds to half-hour steps', () => {
    expect(clampHours(7.3)).toBe('7.5');
    expect(clampHours(7.1)).toBe('7');
  });

  it('passes through valid in-range values', () => {
    expect(clampHours(8)).toBe('8');
    expect(clampHours(0.5)).toBe('0.5');
  });
});

describe('formatDateHeader', () => {
  it('formats an ISO date as a short header', () => {
    expect(formatDateHeader('2026-09-15')).toBe('Sep 15');
  });
});

describe('formatRangeSubheader', () => {
  it('formats a week range with its year', () => {
    expect(formatRangeSubheader('2026-09-14', '2026-09-18', 2026)).toBe('Sep 14 - Sep 18, 2026');
  });
});

describe('parseWeekStart', () => {
  it('parses a "day - day month" label', () => {
    const date = parseWeekStart('1 - 7 January');
    expect(date.getFullYear()).toBe(2000);
    expect(date.getMonth()).toBe(0);
    expect(date.getDate()).toBe(1);
  });

  it('parses a "day month - day month" label', () => {
    const date = parseWeekStart('5 January - 9 January');
    expect(date.getMonth()).toBe(0);
    expect(date.getDate()).toBe(5);
  });

  it('parses an ISO-ish date', () => {
    const date = parseWeekStart('2026-09-15');
    expect(date.getFullYear()).toBe(2026);
  });

  it('falls back to the epoch for garbage input', () => {
    expect(parseWeekStart('not a date').getTime()).toBe(0);
  });
});

describe('monthIndex', () => {
  it('resolves a full month name case-insensitively', () => {
    expect(monthIndex('january')).toBe(0);
    expect(monthIndex('SEPTEMBER')).toBe(8);
    expect(monthIndex('December')).toBe(11);
  });

  it('returns -1 for unknown months', () => {
    expect(monthIndex('bogus')).toBe(-1);
  });
});
