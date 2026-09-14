import { TIMESHEET_HOURS_MAX, TIMESHEET_HOURS_MIN, MONTHS } from '../constants';

export const monthIndex = (month: string) =>
  MONTHS.indexOf(month.charAt(0).toUpperCase() + month.slice(1).toLowerCase());

export const parseWeekStart = (value: string): Date => {
  const lower = value.toLowerCase();
  const year = Number(lower.match(/\b(\d{4})\b/)?.[1] ?? 2000);

  let match = lower.match(/^(\d{1,2})\s*-\s*(\d{1,2})\s+([a-z]+)/);
  if (match) return new Date(year, Math.max(0, monthIndex(match[3])), Number(match[1]));

  match = lower.match(/^(\d{1,2})\s+([a-z]+)\s*-\s*/);
  if (match) return new Date(year, Math.max(0, monthIndex(match[2])), Number(match[1]));

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? new Date(0) : new Date(parsed);
};

// Helpers for Date Formatting
export const formatDateHeader = (isoDateStr: string) => {
  const date = new Date(isoDateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const formatRangeSubheader = (startDateStr: string, endDateStr: string, year: number) => {
  const start = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');

  const startFormatted = start.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  const endFormatted = end.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

  return `${startFormatted} - ${endFormatted}, ${year}`;
};

/**
 * Clamps a raw hour value into the allowed [MIN, MAX] range (in 0.5 steps)
 * and returns it as the string the hours input expects.
 */
export const clampHours = (value: number): string => {
  const rounded = Math.round(value * 2) / 2;
  return String(Math.min(TIMESHEET_HOURS_MAX, Math.max(TIMESHEET_HOURS_MIN, rounded)));
};
