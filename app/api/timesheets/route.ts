import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { and, eq, asc, desc, count } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import type { TimesheetStatus } from '@/types/dashboard';
import { timesheets, orgMemberships } from '@/app/database/schema';
import { db } from '@/app/database';

// Whitelisted sort columns mapped to real DB columns — nothing dynamic is
// ever interpolated into an orderBy/where clause.
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
    const orgIdParam = searchParams.get('orgId');
    const statusParam = searchParams.get('status') as TimesheetStatus | null;
    const sortParam = searchParams.get('sort') ?? 'startDate';
    const orderParam = searchParams.get('order');

    if (!orgIdParam) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    // 1. Verify org membership (user <-> org is many-to-many). The join table
    //    is orgMemberships with a composite (userId, orgId) primary key.
    const membership = await db
      .select({ id: orgMemberships.id })
      .from(orgMemberships)
      .where(and(eq(orgMemberships.orgId, orgIdParam), eq(orgMemberships.userId, userId)))
      .limit(1);

    if (!membership.length) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const sort: SortKey = isSortKey(sortParam) ? sortParam : 'startDate';
    const order = orderParam === 'desc' ? desc : asc;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10));

    // 2. Build filters safely
    const filters = [eq(timesheets.orgId, orgIdParam)];

    if (statusParam) {
      filters.push(eq(timesheets.status, statusParam));
    }

    const sortColumn = SORT_COLUMNS[sort];
    const whereClause = and(...filters);

    // 3. Count + page in parallel
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
