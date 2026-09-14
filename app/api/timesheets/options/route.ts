import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { and, eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { db } from '@/app/database';
import { orgMemberships, projects, workTypes } from '@/app/database/schema';
import type { AddWorkOptionsResponse } from '@/types/timesheet-details';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const { searchParams } = new URL(request.url);
    const orgSlug = searchParams.get('orgSlug')?.trim();

    if (!orgSlug) {
      return NextResponse.json({ error: 'orgSlug is required' }, { status: 400 });
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

    const [orgProjects, orgWorkTypes] = await Promise.all([
      db
        .select({ id: projects.id, name: projects.name })
        .from(projects)
        .where(eq(projects.orgId, targetOrgId)),
      db.select({ name: workTypes.name }).from(workTypes).where(eq(workTypes.orgId, targetOrgId)),
    ]);

    const responsePayload: AddWorkOptionsResponse = {
      data: {
        projects: orgProjects,
        workTypes: orgWorkTypes.map((t) => t.name),
      },
    };

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (error) {
    logger.error('Error fetching add-work options:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
