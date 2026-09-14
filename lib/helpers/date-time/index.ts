import { MONTHS } from '@/lib/constants';

/**
 * Strict Brand and Nominal Types for Safe Date Inputs
 */
export type DateInput = Date | string | number;

export type TimeZone = 'Asia/Kolkata' | 'UTC' | string;
export type SupportedLocale = 'en-IN' | 'en-US' | string;

export const IST_TIMEZONE: TimeZone = 'Asia/Kolkata';
export const IST_LOCALE: SupportedLocale = 'en-IN';

export interface FormatDateOptions extends Intl.DateTimeFormatOptions {
  timeZone?: TimeZone;
}

export interface FormatRelativeOptions {
  locale?: SupportedLocale;
  style?: Intl.RelativeTimeFormatStyle;
  numeric?: Intl.RelativeTimeFormatNumeric;
}

/**
 * Parses and validates any DateInput into a guaranteed valid Date object.
 * Returns null instead of throwing unhandled exceptions if invalid.
 */
export function parseDate(input: DateInput): Date | null {
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }

  if (typeof input === 'number' || typeof input === 'string') {
    const parsed = new Date(input);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

/**
 * Type Guard to verify if an unknown input is a valid Date object or parseable date string.
 */
export function isValidDate(input: unknown): input is DateInput {
  if (input === null || input === undefined) return false;
  if (input instanceof Date) return !isNaN(input.getTime());
  if (typeof input === 'number' || typeof input === 'string') {
    return !isNaN(new Date(input).getTime());
  }
  return false;
}

/* ==========================================================================
   1. TYPE-SAFE INDIAN STANDARD TIME (IST) FORMATTERS
   ========================================================================== */

/**
 * Formats a date string/instance into an IST Date representation.
 * @example formatISTDate('2026-09-12T05:50:00Z') ➔ "12 Sept 2026"
 */
export function formatISTDate(
  dateInput: DateInput,
  options: Readonly<FormatDateOptions> = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  },
): string {
  const date = parseDate(dateInput);
  if (!date) return '';

  return new Intl.DateTimeFormat(IST_LOCALE, {
    ...options,
    timeZone: IST_TIMEZONE,
  }).format(date);
}

/**
 * Formats time strictly in IST 12-hour AM/PM format.
 * @example formatISTTime(new Date()) ➔ "11:24 am"
 */
export function formatISTTime(dateInput: DateInput, includeSeconds: boolean = false): string {
  const date = parseDate(dateInput);
  if (!date) return '';

  return new Intl.DateTimeFormat(IST_LOCALE, {
    hour: 'numeric',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined,
    hour12: true,
    timeZone: IST_TIMEZONE,
  }).format(date);
}

/**
 * Full Indian Standard Timestamp with guaranteed suffix.
 * @example formatISTFull(new Date()) ➔ "12 Sept 2026, 11:24 am IST"
 */
export function formatISTFull(dateInput: DateInput): string {
  const date = parseDate(dateInput);
  if (!date) return '';

  const formatted = new Intl.DateTimeFormat(IST_LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: IST_TIMEZONE,
  }).format(date);

  return `${formatted} IST`;
}

/* ==========================================================================
   2. RELATIVE TIME & AGING ("Time Ago")
   ========================================================================== */

interface CutoffUnit {
  readonly amount: number;
  readonly unit: Intl.RelativeTimeFormatUnit;
}

const CUTOFFS: readonly CutoffUnit[] = [
  { amount: 60, unit: 'second' },
  { amount: 60, unit: 'minute' },
  { amount: 24, unit: 'hour' },
  { amount: 7, unit: 'day' },
  { amount: 4.34524, unit: 'week' },
  { amount: 12, unit: 'month' },
  { amount: Infinity, unit: 'year' },
];

/**
 * Type-safe relative time formatter (e.g., "5 minutes ago", "in 2 days").
 */
export function formatRelativeTime(
  dateInput: DateInput,
  options: Readonly<FormatRelativeOptions> = {},
): string {
  const date = parseDate(dateInput);
  if (!date) return '';

  const { locale = IST_LOCALE, style = 'long', numeric = 'auto' } = options;

  const now = new Date();
  const elapsedSeconds = Math.round((date.getTime() - now.getTime()) / 1000);

  const rtf = new Intl.RelativeTimeFormat(locale, { style, numeric });

  let duration = Math.abs(elapsedSeconds);
  let selectedUnit: Intl.RelativeTimeFormatUnit = 'second';

  for (const cutoff of CUTOFFS) {
    if (duration < cutoff.amount) {
      selectedUnit = cutoff.unit;
      break;
    }
    duration /= cutoff.amount;
  }

  const value = Math.round(duration) * Math.sign(elapsedSeconds);
  return rtf.format(value, selectedUnit);
}

/**
 * Builds the human week-range label used by the timesheet row contract,
 * e.g. `formatWeekRangeLabel('2026-01-01', '2026-01-05')` ➔ "1 - 5 January, 2026".
 *
 * Derived directly from the ISO `YYYY-MM-DD` calendar components (never the
 * formatted label), so range filtering/search keeps working on the real
 * `startDate`/`endDate` columns while this stays display-only.
 *
 * @param startDate - ISO calendar date where the week begins (auto-trimmed to `YYYY-MM-DD`)
 * @param endDate   - ISO calendar date marking the last inclusive day of the week
 */
export function formatWeekRangeLabel(startDate: string, endDate: string): string {
  const start = startDate.trim().slice(0, 10);
  const end = endDate.trim().slice(0, 10);

  const startDay = parseInt(start.slice(8, 10), 10);
  const startMonth = parseInt(start.slice(5, 7), 10) - 1;
  const startYear = start.slice(0, 4);

  const endDay = parseInt(end.slice(8, 10), 10);
  const endMonth = parseInt(end.slice(5, 7), 10) - 1;
  const endYear = end.slice(0, 4);

  if (startMonth === endMonth && startYear === endYear) {
    return `${startDay} - ${endDay} ${MONTHS[startMonth]}, ${startYear}`;
  }

  if (startYear === endYear) {
    return `${startDay} ${MONTHS[startMonth]} - ${endDay} ${MONTHS[endMonth]}, ${startYear}`;
  }

  return `${startDay} ${MONTHS[startMonth]}, ${startYear} - ${endDay} ${MONTHS[endMonth]}, ${endYear}`;
}

/* ==========================================================================
   3. ISO & SYSTEM BOUNDARY UTILITIES
   ========================================================================== */

/**
 * Converts input to a UTC ISO string for DB/API payload validation.
 * Returns null if parsing fails to ensure strict database boundary checks.
 */
export function toISOString(dateInput: DateInput): string | null {
  const date = parseDate(dateInput);
  return date ? date.toISOString() : null;
}

/**
 * Checks if a given timestamp falls on today's calendar date in IST.
 */
export function isTodayIST(dateInput: DateInput): boolean {
  const date = parseDate(dateInput);
  if (!date) return false;

  const todayIST = formatISTDate(new Date());
  const targetIST = formatISTDate(date);
  return todayIST === targetIST && todayIST !== '';
}
