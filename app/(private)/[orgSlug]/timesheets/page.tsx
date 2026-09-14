import { Suspense } from 'react';
import TimesheetScreen from '@/screens/TimesheetScreen';
import TimesheetListSkeleton from '@/components/timesheets/TimesheetListSkeleton';
import { constructMetadata } from '@/lib/seo';

export const metadata = constructMetadata({
  title: 'Your Timesheets',
  description: 'View, filter and manage your weekly timesheets.',
  noIndex: true,
});

interface PageProps {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
}

export default async function TimesheetsPage({ params, searchParams }: PageProps) {
  const [{ orgSlug }, query] = await Promise.all([params, searchParams]);

  const page = typeof query.page === 'string' ? query.page : undefined;
  const limit = typeof query.limit === 'string' ? query.limit : undefined;
  const status = typeof query.status === 'string' ? query.status : undefined;
  const sort = typeof query.sort === 'string' ? query.sort : undefined;
  const order = query.order === 'desc' ? 'desc' : 'asc';
  const startDate = typeof query.startDate === 'string' ? query.startDate : undefined;
  const endDate = typeof query.endDate === 'string' ? query.endDate : undefined;

  return (
    <Suspense fallback={<TimesheetListSkeleton />}>
      <TimesheetScreen
        orgSlug={orgSlug}
        page={page}
        limit={limit}
        status={status}
        sort={sort}
        order={order}
        startDate={startDate}
        endDate={endDate}
      />
    </Suspense>
  );
}
