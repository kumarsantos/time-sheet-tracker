'use client';

import { DataGrid, type Column, type DataGridMeta } from '@/components/shared/DataGrid';
import StatusSection from '@/components/dashboard/StatusSection';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { SelectOption } from '@/components/shared/Dropdown';
import type { TimesheetItem } from '@/types/dashboard';
import { parseWeekStart } from '@/lib/helpers';

export interface TimesheetListContainerProps {
  timesheets: TimesheetItem[];
  statusItems?: SelectOption[];
  meta?: DataGridMeta;
}

const TimesheetListContainer = ({ timesheets, statusItems, meta }: TimesheetListContainerProps) => {
  const columns: Column<TimesheetItem>[] = [
    {
      key: 'weekNum',
      header: 'WEEK #',
      sortable: true,
      bodyCellColor: 'bg-gray-50',
      headCellColor: 'bg-gray-50',
      width: 'w-32',
      render: (row) => <span className="text-sm text-gray-900">{row.weekNum}</span>,
    },
    {
      key: 'date',
      header: 'DATE',
      sortable: true,
      headCellColor: 'bg-gray-50',
      sortValue: (row) => parseWeekStart(row.date),
      render: (row) => <span className="text-sm text-gray-500">{row.date}</span>,
    },
    {
      key: 'status',
      header: 'STATUS',
      sortable: true,
      headCellColor: 'bg-gray-50',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: 'ACTIONS',
      align: 'right',
      headCellColor: 'bg-gray-50',
      render: (row) => (
        <button
          onClick={() => console.warn('Action for week:', row.weekNum)}
          className="text-base text-[#1C64F2]"
        >
          {row.status === 'MISSING' ? 'Create' : row.status === 'INCOMPLETE' ? 'Update' : 'View'}
        </button>
      ),
    },
  ];

  return (
    <div className="mx-auto w-full space-y-4 rounded-lg bg-white p-6 shadow">
      <h1 className="text-2xl font-bold text-gray-900">Your Timesheets</h1>
      <StatusSection statusItems={statusItems} />
      <DataGrid columns={columns} data={timesheets} mode="server" meta={meta} />
    </div>
  );
};

export default TimesheetListContainer;
