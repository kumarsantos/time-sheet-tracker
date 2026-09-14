'use client';

import { useEffect, useTransition } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error }: DashboardErrorProps) {
  const router = useRouter();
  const params = useParams();
  const [isPending, startTransition] = useTransition();

  const orgSlug = params?.orgSlug as string | undefined;
  const targetDashboardUrl = orgSlug ? `/${orgSlug}/timesheets` : '/timesheets';

  const isAuthOrPermissionError =
    error.message.toLowerCase().includes('unauthorized') ||
    error.message.toLowerCase().includes('forbidden') ||
    error.message.toLowerCase().includes('permission');

  useEffect(() => {
    console.error('[Dashboard Boundary Error Captured]:', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });

    // Auto-redirect to the target dashboard route
    router.replace(targetDashboardUrl);
  }, [error, router, targetDashboardUrl]);

  const handleRedirect = () => {
    startTransition(() => {
      router.replace(targetDashboardUrl);
    });
  };

  return (
    <div
      role="alert"
      className="border-border animate-in fade-in-50 flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center"
    >
      <div className="m-auto flex h-[75vh] max-w-md flex-col items-center justify-center space-y-4">
        {/* Warning Icon Container */}
        <div className="bg-destructive/10 text-destructive flex h-12 w-12 items-center justify-center rounded-full">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="h-6 w-6"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>

        {/* Dynamic Context Header */}
        <div className="space-y-1">
          <h2 className="text-foreground text-xl font-semibold tracking-tight">
            {isAuthOrPermissionError ? 'Dashboard Access Denied' : 'Failed to load dashboard data'}
          </h2>
          <p className="text-muted-foreground text-sm">
            {isAuthOrPermissionError
              ? 'You do not have the required permissions to view this section. Redirecting to your organization dashboard...'
              : 'We ran into a problem fetching your metrics. Redirecting to your organization dashboard...'}
          </p>
        </div>

        {/* Technical Reference Code */}
        {error.digest && (
          <div className="bg-muted/50 text-muted-foreground rounded px-2.5 py-1 font-mono text-xs">
            Ref ID: <span className="font-semibold select-all">{error.digest}</span>
          </div>
        )}

        {/* Dashboard Recovery Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            disabled={isPending}
            onClick={handleRedirect}
            className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex cursor-pointer items-center justify-center rounded-md px-4 py-2 text-sm font-medium shadow transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:opacity-50"
          >
            {isPending ? 'Redirecting...' : 'Return to Dashboard'}
          </button>
        </div>
      </div>
    </div>
  );
}
