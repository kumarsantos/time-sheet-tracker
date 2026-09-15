import { eq, sum } from 'drizzle-orm';
import type { DrizzleDB } from '@/app/database';
import { timeEntries, timesheets, works } from '@/app/database/schema';
import type { TimesheetStatus } from '@/types/timesheets';

export interface TimesheetSummary {
  totalHoursLogged: string;
  status: TimesheetStatus;
}

/**
 * Pure status derivation shared by the summary writer and the seed: MISSING when
 * no hours are logged at all, COMPLETED at/above the target, else INCOMPLETE.
 */
export function deriveTimesheetStatus(
  totalHoursLogged: string | number,
  targetHours: string | number,
): TimesheetStatus {
  const total = Number(totalHoursLogged) || 0;
  if (total === 0) return 'MISSING';
  const target = Number(targetHours) || 40;
  return total >= target ? 'COMPLETED' : 'INCOMPLETE';
}

/**
 * Recomputes a timesheet's totals from every work across all its day entries,
 * derives the status (MISSING when no hours logged, COMPLETED at/above target,
 * INCOMPLETE otherwise), persists both, and returns them so callers can echo
 * the values back.
 *
 * Used by the add / edit / delete work endpoints so all three stay in sync.
 * Accepts an executor (either `db` or a transaction) so the summary write can
 * participate in the same atomic unit as its triggering mutation.
 */
export async function refreshTimesheetSummary(
  executor: DrizzleDB,
  timesheetId: string,
  targetHours: string,
): Promise<TimesheetSummary> {
  const [totalRow] = await executor
    .select({ total: sum(works.hours) })
    .from(works)
    .innerJoin(timeEntries, eq(works.timeEntryId, timeEntries.id))
    .where(eq(timeEntries.timesheetId, timesheetId));

  const totalHoursLogged = totalRow?.total ?? '0.00';
  const status = deriveTimesheetStatus(totalHoursLogged, targetHours);

  await executor
    .update(timesheets)
    .set({ totalHoursLogged, status })
    .where(eq(timesheets.id, timesheetId));

  return { totalHoursLogged, status };
}
