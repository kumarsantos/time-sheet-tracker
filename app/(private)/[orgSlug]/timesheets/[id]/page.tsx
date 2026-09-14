import { Suspense } from 'react';
import TimesheetDetailsScreen from '@/screens/TimesheetDetailsScreen';

interface PageProps {
  params: Promise<{ orgSlug: string; id: string }>;
}

export default async function TimesheetsDetailsPage({ params }: PageProps) {
  const [{ orgSlug, id }] = await Promise.all([params]);

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
      <TimesheetDetailsScreen orgSlug={orgSlug} id={id} />
    </Suspense>
  );
}
