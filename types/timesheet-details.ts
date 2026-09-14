import type { TimesheetStatus } from './timesheets';

/** Minimal project summary used to populate the "Add work" form */
export interface TimesheetProject {
  id: string;
  name: string;
}

/** Options for the "Add work" form: org projects + org work types */
export interface AddWorkOptions {
  projects: TimesheetProject[];
  workTypes: string[];
}

/** API Endpoint Payload for GET /api/timesheets/options */
export interface AddWorkOptionsResponse {
  data: AddWorkOptions;
}

/**
 * Individual Work item attached to a daily time entry.
 * Every work belongs to exactly one `TimeEntryItem` via its `timeEntryId`.
 */
export interface WorkItem {
  id: string;
  timeEntryId: string;
  userId: string;
  projectId: string;
  projectName: string;
  typeOfWork: string;
  description: string;
  /** Decimal values from Drizzle numeric columns are returned as strings (e.g., "7.50") */
  hours: string;
  createdAt: string;
  updatedAt: string;
}

/** Payload sent to POST /api/timesheets/[id]/entries/[entryId]/works */
export interface AddWorkPayload {
  projectId: string;
  typeOfWork: string;
  description: string;
  hours: number;
}

/** Response for POST work endpoint: created work + refreshed timesheet values */
export interface AddWorkResponse {
  data: WorkItem;
  totalHoursLogged: string;
  status: TimesheetStatus;
}

/** Response for DELETE work endpoint: refreshed timesheet values */
export interface DeleteWorkResponse {
  success: boolean;
  totalHoursLogged: string;
  status: TimesheetStatus;
}

/**
 * Daily Time Entry matching DB schema & relations.
 * One entry is auto-created per day in the week range when the timesheet is
 * created (e.g. 1-5 March -> 5 entries), so fetching by timesheet id returns
 * exactly one entry per day, each holding its own works.
 */
export interface TimeEntryItem {
  id: string;
  timesheetId: string;
  userId: string;
  /** Format: 'YYYY-MM-DD' */
  entryDate: string;
  works: WorkItem[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Parent Timesheet Record with embedded daily entries & works
 */
export interface TimesheetDetail {
  id: string;
  orgId: string;
  userId: string;
  weekNumber: number;
  year: number;
  startDate: string; // 'YYYY-MM-DD'
  endDate: string; // 'YYYY-MM-DD'
  status: TimesheetStatus;
  targetHours: string; // e.g., "40.00"
  totalHoursLogged: string; // e.g., "38.50"
  entries: TimeEntryItem[]; // One entry per day in the week range
  projects: TimesheetProject[]; // Org projects for the "Add work" form
  createdAt: string;
  updatedAt: string;
}

/**
 * API Endpoint Payload for GET /api/timesheets/[id]
 */
export interface TimesheetDetailsResponse {
  data: TimesheetDetail;
}
