import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { and, eq, asc, desc, count, gte, lte } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { formatWeekRangeLabel } from '@/lib/helpers/date-time';
import {
  timesheets,
  timeEntries,
  orgMemberships,
  timesheetStatusEnum,
} from '@/app/database/schema';
import { db } from '@/app/database';
import type { TimesheetStatus } from '@/types/timesheets';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 10;

// Valid enum values from your DB schema: ['COMPLETED', 'INCOMPLETE', 'MISSING', 'SUBMITTED', 'APPROVED', 'REJECTED']
const ALLOWED_STATUSES = new Set(timesheetStatusEnum.enumValues);

const SORT_COLUMNS = {
  startDate: timesheets.startDate,
  weekNumber: timesheets.weekNumber,
  status: timesheets.status,
} as const;

type SortKey = keyof typeof SORT_COLUMNS;
const isSortKey = (value: string | null): value is SortKey =>
  Boolean(value && value in SORT_COLUMNS);

function parseBoundedInt(val: string | null, fallback: number, max = Infinity): number {
  if (!val) return fallback;
  const parsed = parseInt(val, 10);
  if (Number.isNaN(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

export async function GET(request: Request) {
  try {
    // 1. Session Authorization
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    // 2. Query Params Extraction
    const { searchParams } = new URL(request.url);
    const orgSlug = searchParams.get('orgSlug')?.trim();
    const rawStatus = searchParams.get('status')?.trim();
    const sortParam = searchParams.get('sort');
    const orderParam = searchParams.get('order');
    const from = searchParams.get('startDate')?.trim();
    const to = searchParams.get('endDate')?.trim();

    if (!orgSlug) {
      return NextResponse.json({ error: 'orgSlug is required' }, { status: 400 });
    }

    // 3. Session Org Resolution
    const sessionOrg = session.user.orgs?.find((org) => org.slug === orgSlug);
    if (!sessionOrg) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const targetOrgId = sessionOrg.orgId;

    // 4. DB Tenant Membership Safeguard
    const [membership] = await db
      .select({ id: orgMemberships.id })
      .from(orgMemberships)
      .where(and(eq(orgMemberships.orgId, targetOrgId), eq(orgMemberships.userId, userId)))
      .limit(1);

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 5. Pagination & Sorting Setup
    const page = parseBoundedInt(searchParams.get('page'), 1);
    const limit = parseBoundedInt(searchParams.get('limit'), DEFAULT_LIMIT, MAX_LIMIT);
    const sort: SortKey = isSortKey(sortParam) ? sortParam : 'startDate';
    const order = orderParam === 'desc' ? desc : asc;
    const sortColumn = SORT_COLUMNS[sort];

    // 6. Base Filter Construction
    const filters = [eq(timesheets.orgId, targetOrgId)];

    // Enum Validation & Normalization
    if (rawStatus && rawStatus !== 'ALL' && rawStatus !== 'undefined') {
      const upperStatus = rawStatus.toUpperCase();

      // Map UI aliases if applicable (e.g. pending -> SUBMITTED)
      const normalizedStatus = upperStatus === 'PENDING' ? 'SUBMITTED' : upperStatus;

      const isValidStatus = ALLOWED_STATUSES.has(normalizedStatus as any);

      if (!isValidStatus) {
        // Return empty payload cleanly without throwing a PostgreSQL 500 error
        return NextResponse.json({
          data: [],
          meta: { total: 0, totalPages: 1, page, pageSize: limit },
        });
      }

      filters.push(eq(timesheets.status, normalizedStatus as TimesheetStatus));
    }

    // Date Range Filters
    if (from) {
      if (!ISO_DATE_RE.test(from)) {
        return NextResponse.json(
          { error: 'Invalid startDate format (expected YYYY-MM-DD)' },
          { status: 400 },
        );
      }
      filters.push(gte(timesheets.startDate, from));
    }

    if (to) {
      if (!ISO_DATE_RE.test(to)) {
        return NextResponse.json(
          { error: 'Invalid endDate format (expected YYYY-MM-DD)' },
          { status: 400 },
        );
      }
      filters.push(lte(timesheets.endDate, to));
    }

    if (from && to && from > to) {
      return NextResponse.json({ error: 'startDate must not be after endDate' }, { status: 400 });
    }

    const whereClause = and(...filters);

    // 7. Execution (Count & Rows in Parallel)
    const [countRows, rows] = await Promise.all([
      db.select({ total: count() }).from(timesheets).where(whereClause),
      db
        .select()
        .from(timesheets)
        .where(whereClause)
        .orderBy(order(sortColumn))
        .limit(limit)
        .offset((page - 1) * limit),
    ]);

    const total = Number(countRows[0]?.total ?? 0);
    const totalPages = Math.ceil(total / limit) || 1;

    // 8. Format Output
    return NextResponse.json({
      data: rows.map((item) => ({
        ...item,
        weekNum: item.weekNumber,
        date: formatWeekRangeLabel(item.startDate, item.endDate),
      })),
      meta: {
        total,
        totalPages,
        page,
        pageSize: limit,
      },
    });
  } catch (error) {
    logger.error('Error fetching timesheets:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
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
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    let body: CreateTimesheetsBody;
    try {
      body = (await request.json()) as CreateTimesheetsBody;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { orgSlug, year, weekNumber, startDate, endDate, targetHours } = body;

    if (!orgSlug) {
      return NextResponse.json({ error: 'orgSlug is required' }, { status: 400 });
    }
    if (
      !Number.isInteger(year) ||
      !Number.isInteger(weekNumber) ||
      weekNumber < 1 ||
      weekNumber > 53
    ) {
      return NextResponse.json({ error: 'Invalid year or weekNumber' }, { status: 400 });
    }
    if (!ISO_DATE_RE.test(startDate) || !ISO_DATE_RE.test(endDate)) {
      return NextResponse.json(
        { error: 'startDate and endDate must be formatted as YYYY-MM-DD' },
        { status: 400 },
      );
    }
    if (startDate > endDate) {
      return NextResponse.json({ error: 'startDate must not be after endDate' }, { status: 400 });
    }

    const sessionOrg = session.user.orgs?.find((org) => org.slug === orgSlug);
    if (!sessionOrg) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const targetOrgId = sessionOrg.orgId;

    const [membership] = await db
      .select({ id: orgMemberships.id })
      .from(orgMemberships)
      .where(and(eq(orgMemberships.orgId, targetOrgId), eq(orgMemberships.userId, userId)))
      .limit(1);
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const targetHoursValue = targetHours ? targetHours.toFixed(2) : '40.00';

    const [created] = await db
      .insert(timesheets)
      .values({
        orgId: targetOrgId,
        userId,
        weekNumber,
        year,
        startDate,
        endDate,
        targetHours: targetHoursValue,
        status: 'MISSING',
      })
      .returning();

    if (!created) {
      return NextResponse.json({ error: 'Failed to create timesheet' }, { status: 500 });
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

    const dayEntries = await db
      .insert(timeEntries)
      .values(
        entryDates.map((entryDate) => ({
          timesheetId: created.id,
          userId,
          entryDate,
        })),
      )
      .returning();

    return NextResponse.json(
      {
        data: {
          ...created,
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
  } catch (error) {
    logger.error('Error creating timesheet:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
