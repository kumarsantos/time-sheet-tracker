import TimesheetListContainer from '@/components/dashboard/TimesheetListContainer';
import type { StatusValue, TimesheetItem } from '@/types/dashboard';

const statusValues: StatusValue[] = [
  {
    label: 'All',
    value: 'all',
  },
  {
    label: 'Pending',
    value: 'pending',
  },
  {
    label: 'Completed',
    value: 'completed',
  },
  {
    label: 'Failed',
    value: 'failed',
  },
];

const timesheetsData: TimesheetItem[] = [
  { id: '1', weekNum: 1, date: '1 - 5 January, 2024', status: 'COMPLETED' },
  { id: '2', weekNum: 2, date: '8 - 12 January, 2024', status: 'COMPLETED' },
  { id: '3', weekNum: 3, date: '15 - 19 January, 2024', status: 'INCOMPLETE' },
  { id: '4', weekNum: 4, date: '22 - 26 January, 2024', status: 'COMPLETED' },
  { id: '5', weekNum: 5, date: '28 January - 1 February, 2024', status: 'MISSING' },
  { id: '6', weekNum: 6, date: '5 - 9 February, 2024', status: 'MISSING' },
  { id: '7', weekNum: 7, date: '12 - 16 February, 2024', status: 'MISSING' },
];

const DashboardScreen = () => {
  return (
    <div className="flex min-h-screen flex-col gap-4 p-6 px-32">
      <TimesheetListContainer
        statusItems={statusValues}
        timesheets={timesheetsData}
        meta={{ totalPages: 2, page: 2, pageSize: 5, total: timesheetsData.length }}
      />
      <div className="mx-auto flex w-full items-center justify-center rounded-lg bg-white py-6 shadow">
        <p className="text-sm text-gray-500">© 2024 tentwenty. All rights reserved.</p>
      </div>
    </div>
  );
};

export default DashboardScreen;
