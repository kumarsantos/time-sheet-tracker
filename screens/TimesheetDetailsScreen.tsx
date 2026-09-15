import { notFound } from 'next/navigation';
import TimesheetDetailView from '@/components/timesheets/TimesheetDetailsView';
import { requireTenant } from '@/services/timesheet/data';
import { getTimesheetDetailCached } from '@/services/timesheet/cache';

interface TimesheetDetailsScreenProps {
  orgSlug: string;
  id: string;
}

const TimesheetDetailsScreen = async ({ orgSlug, id }: TimesheetDetailsScreenProps) => {
  const tenant = await requireTenant(orgSlug);
  const data = await getTimesheetDetailCached({
    orgSlug,
    orgId: tenant.orgId,
    userId: tenant.userId,
    timesheetId: id,
  });

  if (!data) {
    notFound();
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-32">
      <TimesheetDetailView orgSlug={orgSlug} data={data} />
    </div>
  );
};

export default TimesheetDetailsScreen;
