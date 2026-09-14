import type { TimesheetStatus } from '@/types/dashboard';
import { apiClient } from '../api';

export interface TimesheetQueryParams {
  orgSlug: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  page?: string;
  limit?: number;
}

export interface TimesheetResponse {
  data: Array<{
    id: string;
    date: string;
    hours: number;
    status: TimesheetStatus;
    weekNum: number;
  }>;
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}
export interface StatusResponse {
  data: Array<{
    id: string;
    label: string;
    value: string;
  }>;
}

export const timesheetService = {
  // GET /api/timesheets?orgId=amz-cmp&page=1&status=completed
  getTimesheets: (params: TimesheetQueryParams) =>
    apiClient.get<TimesheetResponse>('/timesheets', params),

  // GET /api/timesheets/status-items?orgId=amz-cmp
  getTimesheetStatusItems: (orgSlug: string) =>
    apiClient.get<StatusResponse>('/timesheets/status-items', { orgSlug }),
};
