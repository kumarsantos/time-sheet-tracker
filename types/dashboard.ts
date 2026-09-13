export type TimesheetStatus = 'COMPLETED' | 'INCOMPLETE' | 'MISSING';

export interface TimesheetItem {
  id: string;
  weekNum: number;
  date: string;
  status: TimesheetStatus;
}

export interface StatusValue {
  label: string;
  value: string;
}
