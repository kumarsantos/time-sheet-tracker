import { MONTHS } from '../constants';

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
