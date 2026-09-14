// import { db } from '@/app/database';
import { statusValues } from '@/data/dashboard';
import { logger } from '@/lib/logger';
import { getSession } from 'next-auth/react';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // // Extract parameters
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    // // 1. Verify user membership in org
    // const isMember = await db.orgMemberships.findUnique({
    //   where: { userId_orgId: { userId: session.user.id, orgId } },
    // });

    // if (!isMember) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

    // // 2. Build dynamic filter clause
    // const whereClause: any = {
    //   orgId,
    //   userId: session.user.id,
    // };

    return NextResponse.json({
      data: statusValues,
    });
  } catch (error) {
    logger.error('Error fetching timesheet status items:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
