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

/** Stepping used by the work hours input and its stepper controls. */
export const TIMESHEET_HOURS_STEP = 0.5;

/** Default hours value pre-filled when adding a new work entry. */
export const INITIAL_WORK_HOURS_DEFAULT = '12';

/** Empty values used to seed the Add/Edit work form. */
export const INITIAL_WORK_FORM_VALUES = {
  projectId: '',
  typeOfWork: '',
  description: '',
  hours: '',
} as const;

/** Maximum day-span accepted when auto-generating time entries for a new timesheet. */
export const TIMESHEET_CREATE_MAX_DAY_SPAN = 14;
