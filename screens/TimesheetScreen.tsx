import TimesheetListContainer from '@/components/timesheets/TimesheetListContainer';
import { TIMESHEET_LIST_DEFAULT_LIMIT, TIMESHEET_LIST_MAX_LIMIT } from '@/lib/constants';
import { getStatusItems, requireTenant } from '@/services/timesheet/data';
import { getTimesheetListCached } from '@/services/timesheet/cache';

interface TimesheetScreenProps {
  orgSlug: string;
  page?: string;
  limit?: string;
  status?: string;
  sort?: string;
  startDate?: string;
  endDate?: string;
  order?: 'asc' | 'desc';
}

const TimesheetScreen = async ({
  orgSlug,
  page = '1',
  limit,
  status,
  sort,
  startDate,
  endDate,
  order = 'asc',
}: TimesheetScreenProps) => {
  const tenant = await requireTenant(orgSlug);

  const parsedPage = Math.max(1, Number.parseInt(page, 10) || 1);
  const parsedLimit = Math.min(
    TIMESHEET_LIST_MAX_LIMIT,
    Math.max(1, Number.parseInt(limit ?? '', 10) || TIMESHEET_LIST_DEFAULT_LIMIT),
  );

  const [result, statusItems] = await Promise.all([
    getTimesheetListCached({
      orgSlug,
      orgId: tenant.orgId,
      page: parsedPage,
      limit: parsedLimit,
      status,
      sort,
      order,
      from: startDate,
      to: endDate,
    }),
    Promise.resolve(getStatusItems()),
  ]);

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-32">
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
