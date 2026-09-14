import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { and, eq, asc, desc, count, gte, lte } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { formatWeekRangeLabel } from '@/lib/helpers/date-time';
import { timesheets, orgMemberships, timesheetStatusEnum } from '@/app/database/schema';
import { db } from '@/app/database';
import type { TimesheetStatus } from '@/types/dashboard';

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
