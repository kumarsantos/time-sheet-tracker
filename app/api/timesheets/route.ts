import { NextResponse } from 'next/server';
import {
  apiError,
  handleRoute,
  isError,
  parseBoundedInt,
  requireOrgAccess,
  requireRateLimit,
  requireUser,
} from '@/lib/api/route-helpers';
import { getTimesheetList, type TimesheetListResult } from '@/services/timesheet/data';
import { revalidateTimesheetData } from '@/services/timesheet/cache';
import {
  ISO_DATE_RE,
  TIMESHEET_LIST_DEFAULT_LIMIT,
  TIMESHEET_LIST_MAX_LIMIT,
} from '@/lib/constants';
import { withTransaction } from '@/app/database';
import { timeEntries, timesheets } from '@/app/database/schema';

interface TimesheetListQuery {
  orgSlug?: string;
  page: number;
  limit: number;
  status?: string;
  sort?: string;
  order: 'asc' | 'desc';
  from?: string;
  to?: string;
}

async function parseListQuery(request: Request): Promise<NextResponse | TimesheetListQuery> {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('startDate')?.trim();
  const to = searchParams.get('endDate')?.trim();

  if (from && !ISO_DATE_RE.test(from)) {
    return apiError('Invalid startDate format (expected YYYY-MM-DD)', 400);
  }
  if (to && !ISO_DATE_RE.test(to)) {
    return apiError('Invalid endDate format (expected YYYY-MM-DD)', 400);
  }
  if (from && to && from > to) {
    return apiError('startDate must not be after endDate', 400);
  }

  return {
    orgSlug: searchParams.get('orgSlug')?.trim() || undefined,
    page: parseBoundedInt(searchParams.get('page'), 1),
    limit: parseBoundedInt(
      searchParams.get('limit'),
      TIMESHEET_LIST_DEFAULT_LIMIT,
      TIMESHEET_LIST_MAX_LIMIT,
    ),
    status: searchParams.get('status')?.trim() || undefined,
    sort: searchParams.get('sort') || undefined,
    order: searchParams.get('order') === 'desc' ? 'desc' : 'asc',
    from: from || undefined,
    to: to || undefined,
  };
}

export async function GET(request: Request) {
  return handleRoute('Error fetching timesheets:', async () => {
    const user = await requireUser();
    if (isError(user)) return user;

    const parsed = await parseListQuery(request);
    if (isError(parsed)) return parsed;

    const org = await requireOrgAccess(user.userId, user.user, parsed.orgSlug);
    if (isError(org)) return org;

    const result: TimesheetListResult = await getTimesheetList({
      orgId: org.orgId,
      page: parsed.page,
      limit: parsed.limit,
      status: parsed.status,
      sort: parsed.sort,
      order: parsed.order,
      from: parsed.from,
      to: parsed.to,
    });

    return NextResponse.json(result);
  });
}

/* ==========================================================================
   POST /api/timesheets  —  Create a week timesheet
   Day entries (time_entries) are auto-generated server-side, one per day in
   [startDate, endDate], so the UI never has to create date rows itself.
   ========================================================================== */

interface CreateTimesheetsBody {
  orgSlug: string;
  year: number;
  weekNumber: number;
  startDate: string;
  endDate: string;
  targetHours?: number;
}

export async function POST(request: Request) {
  return handleRoute('Error creating timesheet:', async () => {
    const user = await requireUser();
    if (isError(user)) return user;

    const rateLimited = requireRateLimit(`mutations:${user.userId}`);
    if (isError(rateLimited)) return rateLimited;

    let body: CreateTimesheetsBody;
    try {
      body = (await request.json()) as CreateTimesheetsBody;
    } catch {
      return apiError('Invalid JSON body', 400);
    }

    const { orgSlug, year, weekNumber, startDate, endDate, targetHours } = body;

    if (
      !Number.isInteger(year) ||
      !Number.isInteger(weekNumber) ||
      weekNumber < 1 ||
      weekNumber > 53
    ) {
      return apiError('Invalid year or weekNumber', 400);
    }
    if (!ISO_DATE_RE.test(startDate) || !ISO_DATE_RE.test(endDate)) {
      return apiError('startDate and endDate must be formatted as YYYY-MM-DD', 400);
    }
    if (startDate > endDate) {
      return apiError('startDate must not be after endDate', 400);
    }

    const org = await requireOrgAccess(user.userId, user.user, orgSlug);
    if (isError(org)) return org;

    // Default targetHours comes from the org-level setting when the caller
    // does not override it (org.defaultTargetHours is DB-backed).
    const targetHoursValue = targetHours ? targetHours.toFixed(2) : org.defaultTargetHours;

    // Create the timesheet and all its day entries in one atomic unit so the
    // entry rows can never be orphaned by a partial failure.
    const { timesheet, dayEntries } = await withTransaction(async (tx) => {
      const [created] = await tx
        .insert(timesheets)
        .values({
          orgId: org.orgId,
          userId: user.userId,
          weekNumber,
          year,
          startDate,
          endDate,
          targetHours: targetHoursValue,
          status: 'MISSING',
        })
        .returning();

      if (!created) {
        throw new Error('Failed to create timesheet');
      }

      // Auto-generate one day entry per day in the week range (inclusive)
      const entryDates: string[] = [];
      const DAY_MS = 86400000;
      // Parse dates at UTC noon to avoid DST day-boundary drift
      const sweepStartMs = new Date(`${startDate}T12:00:00.000Z`).getTime();
      const sweepEndMs = new Date(`${endDate}T12:00:00.000Z`).getTime();
      for (let dayMs = sweepStartMs; dayMs <= sweepEndMs; dayMs += DAY_MS) {
        entryDates.push(new Date(dayMs).toISOString().slice(0, 10));
      }

      const dayEntries = await tx
        .insert(timeEntries)
        .values(
          entryDates.map((entryDate) => ({
            timesheetId: created.id,
            userId: user.userId,
            entryDate,
          })),
        )
        .returning();

      return { timesheet: created, dayEntries };
    });

    // ISR: new timesheet changes the list immediately
    revalidateTimesheetData(orgSlug);

    return NextResponse.json(
      {
        data: {
          ...timesheet,
          entries: dayEntries.map((entry) => ({
            ...entry,
            works: [],
            createdAt: entry.createdAt.toISOString(),
            updatedAt: entry.updatedAt.toISOString(),
          })),
        },
      },
      { status: 201 },
    );
  });
}
