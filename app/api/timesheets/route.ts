import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { and, eq, asc, desc, count } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import type { TimesheetStatus } from '@/types/dashboard';
import { timesheets, orgMemberships } from '@/app/database/schema';
import { db } from '@/app/database';

const SORT_COLUMNS = {
  startDate: timesheets.startDate,
  weekNumber: timesheets.weekNumber,
  status: timesheets.status,
} as const;

type SortKey = keyof typeof SORT_COLUMNS;
const isSortKey = (value: string): value is SortKey => value in SORT_COLUMNS;

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const { searchParams } = new URL(request.url);
    const orgSlug = searchParams.get('orgSlug');
    const statusParam = searchParams.get('status') as TimesheetStatus | null;
    const sortParam = searchParams.get('sort') ?? 'startDate';
    const orderParam = searchParams.get('order');

    if (!orgSlug) {
      return NextResponse.json({ error: 'orgSlug is required' }, { status: 400 });
    }

    // 1. Resolve targetOrgId from the JWT session claims (fastest path)
    const sessionOrg = session.user.orgs?.find((org) => org.slug === orgSlug);
    if (!sessionOrg) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const targetOrgId = sessionOrg.orgId;

    // 1b. Defense-in-depth: Single-table check (no unnecessary JOIN)
    const [membership] = await db
      .select({ id: orgMemberships.id })
      .from(orgMemberships)
      .where(and(eq(orgMemberships.orgId, targetOrgId), eq(orgMemberships.userId, userId)))
      .limit(1);

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Pagination & Sorting Parameters
    const sort: SortKey = isSortKey(sortParam) ? sortParam : 'startDate';
    const order = orderParam === 'desc' ? desc : asc;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10));

    // 3. Dynamic Filter Construction
    const filters = [eq(timesheets.orgId, targetOrgId)];
    if (statusParam) {
      filters.push(eq(timesheets.status, statusParam));
    }

    const whereClause = and(...filters);

    // 4. Parallel execution of count & paginated rows
    const [countRows, rows] = await Promise.all([
      db.select({ total: count() }).from(timesheets).where(whereClause),
      db
        .select()
        .from(timesheets)
        .where(whereClause)
        .orderBy(order(SORT_COLUMNS[sort]))
        .limit(limit)
        .offset((page - 1) * limit),
    ]);

    const total = Number(countRows[0]?.total ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return NextResponse.json({
      data: rows,
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
