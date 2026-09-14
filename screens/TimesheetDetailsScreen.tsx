import TimesheetDetailView from '@/components/timesheets/TimesheetDetailsView';
import { timesheetService } from '@/services/timesheet';

interface TimesheetDetailsScreenProps {
  orgSlug: string;
  id: string;
}

const TimesheetDetailsScreen = async ({ orgSlug, id }: TimesheetDetailsScreenProps) => {
  const { data: timesheetData } = await timesheetService.getTimesheetsDetails(orgSlug, id);

  return (
    <div className="min-h-screen p-6 px-32">
      <TimesheetDetailView data={timesheetData} />
    </div>
  );
};

export default TimesheetDetailsScreen;
