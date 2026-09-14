import ProgressTooltip from '@/components/shared/ProgressTooltip';
import { formatRangeSubheader } from '@/lib/helpers';

interface TimesheetDetailsHeaderProps {
  totalHours: number;
  targetHours: number;
  startDate: string;
  endDate: string;
  year: number;
}

/** Timesheet page header: title, weekly progress tooltip and date range. */
export function TimesheetDetailsHeader({
  totalHours,
  targetHours,
  startDate,
  endDate,
  year,
}: TimesheetDetailsHeaderProps) {
  return (
    <>
      <div className="flex justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-bold text-gray-900">This week’s timesheet</h1>

        {/* Progress Bar Header Component */}
        <div className="w-52">
          <ProgressTooltip currentHours={totalHours} targetHours={targetHours} />
        </div>
      </div>
      <p className="my-4 text-sm text-gray-500">{formatRangeSubheader(startDate, endDate, year)}</p>
    </>
  );
}
