import { Suspense } from 'react';
import TimesheetDetailsScreen from '@/screens/TimesheetDetailsScreen';
import TimesheetDetailsSkeleton from '@/components/timesheets/TimesheetDetailsSkeleton';

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
