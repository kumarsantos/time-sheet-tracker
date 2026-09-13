import { Suspense } from 'react';
import DashboardScreen from '@/screens/DashboardScreen';

const Dashboard = () => {
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
      <DashboardScreen />
    </Suspense>
  );
};

export default Dashboard;
