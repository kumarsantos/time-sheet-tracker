import type { StatusResponse, TimesheetQueryParams, TimesheetResponse } from '@/types/timesheets';
import { apiClient } from '../api';
import type {
  AddWorkOptionsResponse,
  AddWorkPayload,
  AddWorkResponse,
  DeleteWorkResponse,
  TimesheetDetailsResponse,
} from '@/types/timesheet-details';

export interface CreateTimesheetParams {
  orgSlug: string;
  year: number;
  weekNumber: number;
  startDate: string;
  endDate: string;
  targetHours?: number;
}

export const timesheetService = {
  // GET /api/timesheets?orgId=amz-cmp&page=1&status=completed
  getTimesheets: (params: TimesheetQueryParams) =>
    apiClient.get<TimesheetResponse>('/timesheets', params),

  // POST /api/timesheets — creates the week timesheet and auto-generates one
  // day entry (time_entries row) per day in [startDate, endDate]
  createTimesheet: (payload: CreateTimesheetParams) =>
    apiClient.post<TimesheetDetailsResponse>('/timesheets', payload),

  // GET /api/timesheets/status-items?orgId=amz-cmp
  getTimesheetStatusItems: (orgSlug: string) =>
    apiClient.get<StatusResponse>('/timesheets/status-items', { orgSlug }),

  // GET /api/timesheets/timesheetId?orgId=amz-cmp
  getTimesheetsDetails: (orgSlug: string, id: string) =>
    apiClient.get<TimesheetDetailsResponse>('/timesheets/' + id, { orgSlug }),

  // GET /api/timesheets/options?orgSlug=... — projects + work types for the Add work form
  getAddWorkOptions: (orgSlug: string) =>
    apiClient.get<AddWorkOptionsResponse>('/timesheets/options', { orgSlug }),

  // POST /api/timesheets/:timesheetId/entries/:entryId/works?orgSlug=...
  addWork: (orgSlug: string, timesheetId: string, entryId: string, payload: AddWorkPayload) =>
    apiClient.post<AddWorkResponse>(
      `/timesheets/${timesheetId}/entries/${entryId}/works?orgSlug=${encodeURIComponent(orgSlug)}`,
      payload,
    ),

  // PUT /api/timesheets/:timesheetId/entries/:entryId/works/:workId?orgSlug=...
  updateWork: (
    orgSlug: string,
    timesheetId: string,
    entryId: string,
    workId: string,
    payload: AddWorkPayload,
  ) =>
    apiClient.put<AddWorkResponse>(
      `/timesheets/${timesheetId}/entries/${entryId}/works/${workId}?orgSlug=${encodeURIComponent(orgSlug)}`,
      payload,
    ),

  // DELETE /api/timesheets/:timesheetId/entries/:entryId/works/:workId?orgSlug=...
  deleteWork: (orgSlug: string, timesheetId: string, entryId: string, workId: string) =>
    apiClient.delete<DeleteWorkResponse>(
      `/timesheets/${timesheetId}/entries/${entryId}/works/${workId}?orgSlug=${encodeURIComponent(orgSlug)}`,
    ),
};
