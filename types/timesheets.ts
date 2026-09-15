export type TimesheetStatus =
  'COMPLETED' | 'INCOMPLETE' | 'MISSING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface TimesheetItem {
  id: string;
  weekNum: number;
  date: string;
  status: TimesheetStatus;
}

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
