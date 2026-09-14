import TimesheetListContainer from '@/components/timesheets/TimesheetListContainer';
import { timesheetService } from '@/services/timesheet';

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
  const { data, meta } = await timesheetService.getTimesheets({
    orgSlug,
    page,
    status,
    sort,
    order,
    startDate,
    endDate,
  });

  const { data: statusItems } = await timesheetService.getTimesheetStatusItems(orgSlug);

  return (
    <div className="min-h-screen p-6 px-32">
      <TimesheetListContainer
        statusItems={statusItems}
        timesheets={data}
        meta={meta}
        statusValue={status}
      />
    </div>
  );
};

export default TimesheetScreen;
