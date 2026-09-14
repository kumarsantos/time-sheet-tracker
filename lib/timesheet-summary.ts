import { eq, sum } from 'drizzle-orm';
import { db } from '@/app/database';
import { timeEntries, timesheets, works } from '@/app/database/schema';
import type { TimesheetStatus } from '@/types/timesheets';

export interface TimesheetSummary {
  totalHoursLogged: string;
  status: TimesheetStatus;
}

/**
 * Recomputes a timesheet's totals from every work across all its day entries,
 * derives the status (INCOMPLETE when < target hours, COMPLETED otherwise),
 * persists both, and returns them so callers can echo the values back.
 *
 * Used by the add / edit / delete work endpoints so all three stay in sync.
 */
export async function refreshTimesheetSummary(
  timesheetId: string,
  targetHours: string,
): Promise<TimesheetSummary> {
  const [totalRow] = await db
    .select({ total: sum(works.hours) })
    .from(works)
    .innerJoin(timeEntries, eq(works.timeEntryId, timeEntries.id))
    .where(eq(timeEntries.timesheetId, timesheetId));

  const totalHoursLogged = totalRow?.total ?? '0.00';

  const target = Number(targetHours) || 40;
  const status: TimesheetStatus = Number(totalHoursLogged) >= target ? 'COMPLETED' : 'INCOMPLETE';

  await db
    .update(timesheets)
    .set({ totalHoursLogged, status })
    .where(eq(timesheets.id, timesheetId));

  return { totalHoursLogged, status };
}
