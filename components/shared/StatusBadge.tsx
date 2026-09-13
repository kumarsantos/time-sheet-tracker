import { cn } from '@/lib/utils';

export type StatusType = 'COMPLETED' | 'INCOMPLETE' | 'MISSING' | string;

export function StatusBadge({ status }: { status: StatusType }) {
  const styles: Record<string, string> = {
    COMPLETED: 'bg-green-100 text-green-800',
    INCOMPLETE: 'bg-yellow-100 text-yellow-800 ',
    MISSING: 'bg-pink-100 text-pink-800',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-semibold tracking-wider uppercase',
        styles[status] || 'bg-gray-100 text-gray-600',
      )}
    >
      {status}
    </span>
  );
}
