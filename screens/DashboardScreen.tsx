import TimesheetListContainer from '@/components/dashboard/TimesheetListContainer';
import { timesheetService } from '@/services/timesheet';

const DashboardScreen = async ({
  orgId,
  page = '1',
  status,
  sort,
  startDate,
  endDate,
  order = 'asc',
}: {
  orgId: string;
  page?: string;
  status?: string;
  sort?: string;
  startDate?: string;
  endDate?: string;
  order?: 'asc' | 'desc';
}) => {
  const { data, meta } = await timesheetService.getTimesheets({
    orgId,
    page,
    status,
    sort,
    order,
    startDate,
    endDate,
  });

  const { data: statusItems } = await timesheetService.getTimesheetStatusItems(orgId);

  return (
    <div className="flex min-h-screen flex-col gap-4 p-6 px-32">
      <TimesheetListContainer statusItems={statusItems} timesheets={data} meta={meta} />
      <div className="mx-auto flex w-full items-center justify-center rounded-lg bg-white py-6 shadow">
        <p className="text-sm text-gray-500">© 2024 tentwenty. All rights reserved.</p>
      </div>
    </div>
  );
};

export default DashboardScreen;
