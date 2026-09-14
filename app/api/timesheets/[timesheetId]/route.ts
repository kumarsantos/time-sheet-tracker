import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { and, eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { db } from '@/app/database';
import { orgMemberships, projects, works, timeEntries, timesheets } from '@/app/database/schema';
import type { TimesheetDetailsResponse } from '@/types/timesheet-details';

interface RouteParams {
  params: Promise<{ timesheetId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const { timesheetId } = await params;
    const { searchParams } = new URL(request.url);
    const orgSlug = searchParams.get('orgSlug')?.trim();

    if (!orgSlug) {
      return NextResponse.json({ error: 'orgSlug is required' }, { status: 400 });
    }
    if (!timesheetId) {
      return NextResponse.json({ error: 'timesheetId is required' }, { status: 400 });
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

    const [targetTimesheet] = await db
      .select()
      .from(timesheets)
      .where(
        and(
          eq(timesheets.id, timesheetId),
          eq(timesheets.orgId, targetOrgId),
          eq(timesheets.userId, userId),
        ),
      )
      .limit(1);

    if (!targetTimesheet) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
    }

    // Fetch day entries (exactly one per day in the week range)
    const dayEntries = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.timesheetId, targetTimesheet.id));

    // Fetch org projects for the "Add work" form
    const orgProjects = await db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(eq(projects.orgId, targetOrgId));

    // Fetch works joined with project name for every entry
    const allWorks = dayEntries.length
      ? await db
          .select({
            id: works.id,
            timeEntryId: works.timeEntryId,
            userId: works.userId,
            projectId: works.projectId,
            projectName: projects.name,
            typeOfWork: works.typeOfWork,
            description: works.description,
            hours: works.hours,
            createdAt: works.createdAt,
            updatedAt: works.updatedAt,
          })
          .from(works)
          .innerJoin(timeEntries, eq(works.timeEntryId, timeEntries.id))
          .leftJoin(projects, eq(works.projectId, projects.id))
          .where(eq(timeEntries.timesheetId, targetTimesheet.id))
      : [];

    // Group works by timeEntryId
    const worksByEntry = new Map<string, typeof allWorks>();
    for (const work of allWorks) {
      const list = worksByEntry.get(work.timeEntryId) ?? [];
      list.push(work);
      worksByEntry.set(work.timeEntryId, list);
    }

    // Assemble nested structure
    const responsePayload: TimesheetDetailsResponse = {
      data: {
        id: targetTimesheet.id,
        orgId: targetTimesheet.orgId,
        userId: targetTimesheet.userId,
        weekNumber: targetTimesheet.weekNumber,
        year: targetTimesheet.year,
        startDate: targetTimesheet.startDate,
        endDate: targetTimesheet.endDate,
        status: targetTimesheet.status,
        targetHours: targetTimesheet.targetHours,
        totalHoursLogged: targetTimesheet.totalHoursLogged,
        projects: orgProjects,
        createdAt: targetTimesheet.createdAt.toISOString(),
        updatedAt: targetTimesheet.updatedAt.toISOString(),
        entries: dayEntries.map((entry) => ({
          id: entry.id,
          timesheetId: entry.timesheetId,
          userId: entry.userId,
          entryDate: entry.entryDate,
          createdAt: entry.createdAt.toISOString(),
          updatedAt: entry.updatedAt.toISOString(),
          works: (worksByEntry.get(entry.id) ?? []).map((w) => ({
            id: w.id,
            timeEntryId: w.timeEntryId,
            userId: w.userId,
            projectId: w.projectId,
            projectName: w.projectName ?? 'Unknown Project',
            typeOfWork: w.typeOfWork,
            description: w.description,
            hours: w.hours,
            createdAt: w.createdAt.toISOString(),
            updatedAt: w.updatedAt.toISOString(),
          })),
        })),
      },
    };

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (error) {
    logger.error('Error fetching timesheet details:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
