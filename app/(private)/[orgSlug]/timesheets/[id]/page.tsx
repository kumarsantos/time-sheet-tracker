import { Suspense } from 'react';
import TimesheetDetailsScreen from '@/screens/TimesheetDetailsScreen';
import TimesheetDetailsSkeleton from '@/components/timesheets/TimesheetDetailsSkeleton';
import { constructMetadata } from '@/lib/seo';

export const metadata = constructMetadata({
  title: 'Timesheet Details',
  description: 'Review and manage the work logged for a weekly timesheet.',
});

interface PageProps {
  params: Promise<{ orgSlug: string; id: string }>;
}

export default async function TimesheetsDetailsPage({ params }: PageProps) {
  const [{ orgSlug, id }] = await Promise.all([params]);

  return (
    <Suspense fallback={<TimesheetDetailsSkeleton />}>
      <TimesheetDetailsScreen orgSlug={orgSlug} id={id} />
    </Suspense>
  );
}
