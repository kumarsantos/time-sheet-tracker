import { auth } from '@/auth';
import { statusValues } from '@/data/dashboard';
import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orgSlug = searchParams.get('orgSlug');
    if (!orgSlug) {
      return NextResponse.json({ error: 'OrgSlug is required' }, { status: 400 });
    }

    // 1. Check membership directly from session claims
    const isMember = session.user.orgs?.some((org) => org.slug === orgSlug);
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      data: statusValues,
    });
  } catch (error) {
    logger.error('Error fetching timesheet status items:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
