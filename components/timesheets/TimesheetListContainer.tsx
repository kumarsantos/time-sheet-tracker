'use client';

import { DataGrid, type Column, type DataGridMeta } from '@/components/shared/DataGrid';
import StatusSection from '@/components/timesheets/StatusSection';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { SelectOption } from '@/components/shared/Dropdown';
import type { TimesheetItem } from '@/types/timesheets';
import { parseWeekStart } from '@/lib/helpers';
import { useQueryParams } from '@/hooks/useQueryParams';
import { useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';

export interface TimesheetListContainerProps {
  timesheets: TimesheetItem[];
  statusItems?: SelectOption[];
  meta?: DataGridMeta;
  statusValue?: string;
}

const TimesheetListContainer = ({
  timesheets,
  statusItems = [],
  statusValue,
  meta,
}: TimesheetListContainerProps) => {
  const { setQueryParams } = useQueryParams();
  const params = useParams();
  const router = useRouter();

  // Extract orgSlug dynamically from the URL parameters
  const orgSlug = params?.orgSlug as string;

  const allowedStatusSet = useMemo(() => {
    return new Set(statusItems.map((option) => option.value));
  }, [statusItems]);

  useEffect(() => {
    if (!statusValue || allowedStatusSet.size === 0) return;
    const activeStatusTokens = statusValue
      .split(',')
      .map((statusToken) => statusToken.trim())
      .filter(Boolean);
    const containsUnrecognizedStatus = activeStatusTokens.some(
      (statusToken) => !allowedStatusSet.has(statusToken),
    );
    if (containsUnrecognizedStatus) {
      setQueryParams({ status: null });
    }
  }, [statusValue, allowedStatusSet, setQueryParams]);

  // Define columns inside the component or pass dynamic navigation handlers
  const columns: Column<TimesheetItem>[] = useMemo(
    () => [
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
            type="button"
            onClick={() => router.push(`/${orgSlug}/timesheets/${row.id}`)}
            className="cursor-pointer text-base font-medium text-[#1C64F2] hover:underline"
          >
            {row.status === 'MISSING' ? 'Create' : row.status === 'INCOMPLETE' ? 'Update' : 'View'}
          </button>
        ),
      },
    ],
    [orgSlug, router],
  );

  return (
    <div className="mx-auto w-full space-y-4 rounded-lg bg-white p-6 shadow">
      <h1 className="text-2xl font-bold text-gray-900">Your Timesheets</h1>
      <StatusSection statusItems={statusItems} statusValue={statusValue} />
      <DataGrid columns={columns} data={timesheets} mode="server" meta={meta} />
    </div>
  );
};

export default TimesheetListContainer;
