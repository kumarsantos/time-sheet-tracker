export const MONTHS: string[] = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Matches a calendar date in `YYYY-MM-DD` format (used across the timesheet API). */
export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Pagination bounds for the timesheet list endpoint. */
export const TIMESHEET_LIST_DEFAULT_LIMIT = 10;
export const TIMESHEET_LIST_MAX_LIMIT = 100;

/** Hours bounds enforced by the work schemas and the hours stepper. */
export const TIMESHEET_HOURS_MIN = 0.5;
export const TIMESHEET_HOURS_MAX = 24;

/** Maximum day-span accepted when auto-generating time entries for a new timesheet. */
export const TIMESHEET_CREATE_MAX_DAY_SPAN = 14;
