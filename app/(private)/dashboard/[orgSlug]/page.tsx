import { Suspense } from 'react';
import DashboardScreen from '@/screens/DashboardScreen';

interface PageProps {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

const Dashboard = async ({ params, searchParams }: PageProps) => {
  const { orgSlug } = await params;
  const { page, status, sort, order, startDate, endDate } = await searchParams;
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="mx-auto max-w-2xl rounded-lg bg-white p-6 shadow">
            <p className="text-sm text-gray-500">Loading timesheets…</p>
          </div>
        </div>
      }
    >
      <DashboardScreen
        orgSlug={orgSlug}
        page={page}
        status={status}
        sort={sort}
        order={order as 'asc' | 'desc'}
        startDate={startDate}
        endDate={endDate}
      />
    </Suspense>
  );
};

export default Dashboard;
