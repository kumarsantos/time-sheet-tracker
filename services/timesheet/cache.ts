import 'server-only';

import { revalidateTag, unstable_cache } from 'next/cache';
import {
  getTimesheetDetail as readTimesheetDetail,
  getTimesheetList as readTimesheetList,
  type TimesheetListParams,
  type TimesheetListResult,
} from './data';
import type { TimesheetDetail } from '@/types/timesheet-details';

/**
 * On-demand ISR tags.
 *
 * - `list`: tags the cached list page AND every cached detail page in the org
 *   (details also carry the org tag), so one call covers "admin added a
 *   timesheet" / "user added a work that flipped the status".
 * - `detail`: precision tag for a single timesheet (used by the work CRUD
 *   handlers so a totals/status change refreshes exactly that detail page).
 *
 * Mutations call `revalidateTag(...)` after the DB write; the Data Cache
 * entries are purged immediately.
 */
export const timesheetTags = {
  list: (orgSlug: string) => `timesheets:${orgSlug}`,
  detail: (timesheetId: string) => `timesheet:${timesheetId}`,
};

/** Fallback TTL so data self-heals even if a future mutation misses its revalidateTag (1h). */
const TIMESHEET_DATA_TTL = 60 * 60;

/**
 * On-demand purge helper for mutation handlers. `{ expire: 0 }` invalidates
 * immediately (updateTag semantics from outside a Server Action). When
 * `timesheetId` is provided the single detail page is purged too; the org tag
 * on detail entries makes the list purge revalidate them as well.
 */
export function revalidateTimesheetData(orgSlug: string, timesheetId?: string): void {
  revalidateTag(timesheetTags.list(orgSlug), { expire: 0 });
  if (timesheetId) {
    revalidateTag(timesheetTags.detail(timesheetId), { expire: 0 });
  }
}

type ListCacheArgs = TimesheetListParams & { orgSlug: string };

/** ISR-backed list query used by the list page (cache keyed per org + query). */
export function getTimesheetListCached(args: ListCacheArgs): Promise<TimesheetListResult> {
  return unstable_cache(
    async (params: ListCacheArgs) => readTimesheetList(params),
    ['timesheet-list'],
    { revalidate: TIMESHEET_DATA_TTL, tags: [timesheetTags.list(args.orgSlug)] },
  )(args);
}

type DetailCacheArgs = { orgId: string; userId: string; timesheetId: string; orgSlug: string };

/** ISR-backed detail query used by the details page (cache keyed per user + org). */
export function getTimesheetDetailCached(args: DetailCacheArgs): Promise<TimesheetDetail | null> {
  return unstable_cache(
    async (params: DetailCacheArgs) => readTimesheetDetail(params),
    ['timesheet-detail'],
    {
      revalidate: TIMESHEET_DATA_TTL,
      tags: [timesheetTags.detail(args.timesheetId), timesheetTags.list(args.orgSlug)],
    },
  )(args);
}
