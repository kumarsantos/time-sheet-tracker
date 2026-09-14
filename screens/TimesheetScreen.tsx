import TimesheetListContainer from '@/components/timesheets/TimesheetListContainer';
import { TIMESHEET_LIST_DEFAULT_LIMIT } from '@/lib/constants';
import { getStatusItems, requireTenant } from '@/services/timesheet/data';
import { getTimesheetListCached } from '@/services/timesheet/cache';

interface TimesheetScreenProps {
  orgSlug: string;
  page?: string;
  status?: string;
  sort?: string;
  startDate?: string;
  endDate?: string;
  order?: 'asc' | 'desc';
}

const TimesheetScreen = async ({
  orgSlug,
  page = '1',
  status,
  sort,
  startDate,
  endDate,
  order = 'asc',
}: TimesheetScreenProps) => {
  const tenant = await requireTenant(orgSlug);

  const parsedPage = Math.max(1, Number.parseInt(page, 10) || 1);

  const [result, statusItems] = await Promise.all([
    getTimesheetListCached({
      orgSlug,
      orgId: tenant.orgId,
      page: parsedPage,
      limit: TIMESHEET_LIST_DEFAULT_LIMIT,
      status,
      sort,
      order,
      from: startDate,
      to: endDate,
    }),
    Promise.resolve(getStatusItems()),
  ]);

  return (
    <div className="min-h-screen p-6 px-32">
      <TimesheetListContainer
        statusItems={statusItems}
        timesheets={result.data}
        meta={result.meta}
        statusValue={status}
      />
    </div>
  );
};

export default TimesheetScreen;
