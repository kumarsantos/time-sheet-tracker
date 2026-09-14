import { Suspense } from 'react';
import TimesheetScreen from '@/screens/TimesheetScreen';

interface PageProps {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
}

export default async function TimesheetsPage({ params, searchParams }: PageProps) {
  const [{ orgSlug }, query] = await Promise.all([params, searchParams]);

  const page = typeof query.page === 'string' ? query.page : undefined;
  const status = typeof query.status === 'string' ? query.status : undefined;
  const sort = typeof query.sort === 'string' ? query.sort : undefined;
  const order = query.order === 'desc' ? 'desc' : 'asc';
  const startDate = typeof query.startDate === 'string' ? query.startDate : undefined;
  const endDate = typeof query.endDate === 'string' ? query.endDate : undefined;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center p-6">
          <div className="mx-auto w-full max-w-2xl rounded-lg bg-white p-6 shadow">
            <p className="animate-pulse text-sm text-gray-500">Loading timesheets…</p>
          </div>
        </div>
      }
    >
      <TimesheetScreen
        orgSlug={orgSlug}
        page={page}
        status={status}
        sort={sort}
        order={order}
        startDate={startDate}
        endDate={endDate}
      />
    </Suspense>
  );
}
