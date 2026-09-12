'use client';

import { useEffect, startTransition } from 'react';
import { useRouter } from 'next/navigation';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  const router = useRouter();

  useEffect(() => {
    // Log to telemetry (Sentry, LogRocket, Datadog)
    console.error('[Route Error Boundary Caught]:', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  const handleReset = () => {
    startTransition(() => {
      // 1. Refresh server data cache
      router.refresh();
      // 2. Re-render the client boundary segment
      reset();
    });
  };

  return (
    <div className="flex min-h-100 w-full flex-col items-center justify-center text-center">
      <div className="mx-auto max-w-md space-y-4 px-4">
        <h2 className="text-foreground text-2xl font-bold tracking-tight">Something went wrong!</h2>

        <p className="text-muted-foreground text-sm">
          {process.env.NODE_ENV === 'development'
            ? error.message || 'An unexpected error occurred while loading this route.'
            : 'An unexpected error occurred while loading this page. Our team has been notified.'}
        </p>

        {error.digest && (
          <p className="text-muted-foreground/60 font-mono text-xs">Error ID: {error.digest}</p>
        )}

        <div className="pt-2">
          <button
            onClick={handleReset}
            type="button"
            className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium shadow transition-colors focus-visible:ring-1 focus-visible:outline-none"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
