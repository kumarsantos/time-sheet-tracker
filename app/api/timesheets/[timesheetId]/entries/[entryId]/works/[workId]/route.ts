import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { and, eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { db } from '@/app/database';
import { orgMemberships, projects, works, timeEntries, timesheets } from '@/app/database/schema';
import { addWorkApiSchema } from '@/lib/validations/timesheet';
import { refreshTimesheetSummary } from '@/lib/timesheet-summary';
import type { AddWorkResponse, DeleteWorkResponse } from '@/types/timesheet-details';

interface RouteParams {
  params: Promise<{ timesheetId: string; entryId: string; workId: string }>;
}

interface WorkRow {
  id: string;
  timeEntryId: string;
  userId: string;
  projectId: string;
  typeOfWork: string;
  description: string;
  hours: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Shared auth + ownership guards; resolves org, timesheet, entry and work. */
async function resolveTargets(
  sessionUser: { id: string; orgs?: { slug: string; orgId: string }[] },
  orgSlug: string,
  timesheetId: string,
  entryId: string,
  workId: string,
): Promise<
  | { error: NextResponse }
  | {
      targetOrgId: string;
      targetTimesheet: { id: string; targetHours: string };
      targetEntry: { id: string };
      targetWork: WorkRow;
    }
> {
  const sessionOrg = sessionUser.orgs?.find((org) => org.slug === orgSlug);
  if (!sessionOrg) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  const targetOrgId = sessionOrg.orgId;

  const [membership] = await db
    .select({ id: orgMemberships.id })
    .from(orgMemberships)
    .where(and(eq(orgMemberships.orgId, targetOrgId), eq(orgMemberships.userId, sessionUser.id)))
    .limit(1);
  if (!membership) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  const [targetTimesheet] = await db
    .select({ id: timesheets.id, targetHours: timesheets.targetHours })
    .from(timesheets)
    .where(
      and(
        eq(timesheets.id, timesheetId),
        eq(timesheets.orgId, targetOrgId),
        eq(timesheets.userId, sessionUser.id),
      ),
    )
    .limit(1);
  if (!targetTimesheet) {
    return { error: NextResponse.json({ error: 'Timesheet not found' }, { status: 404 }) };
  }

  const [targetEntry] = await db
    .select({ id: timeEntries.id })
    .from(timeEntries)
    .where(and(eq(timeEntries.id, entryId), eq(timeEntries.timesheetId, targetTimesheet.id)))
    .limit(1);
  if (!targetEntry) {
    return {
      error: NextResponse.json(
        { error: 'Time entry not found for this timesheet' },
        { status: 404 },
      ),
    };
  }

  const [targetWork] = await db
    .select({
      id: works.id,
      timeEntryId: works.timeEntryId,
      userId: works.userId,
      projectId: works.projectId,
      typeOfWork: works.typeOfWork,
      description: works.description,
      hours: works.hours,
      createdAt: works.createdAt,
      updatedAt: works.updatedAt,
    })
    .from(works)
    .where(and(eq(works.id, workId), eq(works.timeEntryId, targetEntry.id)))
    .limit(1);
  if (!targetWork) {
    return { error: NextResponse.json({ error: 'Work not found' }, { status: 404 }) };
  }

  return { targetOrgId, targetTimesheet, targetEntry, targetWork };
}

function toWorkItem(work: WorkRow, projectName: string) {
  return {
    id: work.id,
    timeEntryId: work.timeEntryId,
    userId: work.userId,
    projectId: work.projectId,
    projectName,
    typeOfWork: work.typeOfWork,
    description: work.description,
    hours: work.hours,
    createdAt: work.createdAt.toISOString(),
    updatedAt: work.updatedAt.toISOString(),
  };
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { timesheetId, entryId, workId } = await params;
    const { searchParams } = new URL(request.url);
    const orgSlug = searchParams.get('orgSlug')?.trim();

    if (!orgSlug) {
      return NextResponse.json({ error: 'orgSlug is required' }, { status: 400 });
    }
    if (!timesheetId || !entryId || !workId) {
      return NextResponse.json(
        { error: 'timesheetId, entryId and workId are required' },
        { status: 400 },
      );
    }

    const targets = await resolveTargets(session.user, orgSlug, timesheetId, entryId, workId);
    if ('error' in targets) return targets.error;

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = addWorkApiSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid work details', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { projectId, typeOfWork, description, hours } = parsed.data;

    const [project] = await db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.orgId, targets.targetOrgId)))
      .limit(1);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found for this organization' },
        { status: 400 },
      );
    }

    const [updatedWork] = await db
      .update(works)
      .set({
        projectId: project.id,
        typeOfWork: typeOfWork.trim(),
        description: description.trim(),
        hours: hours.toFixed(2),
      })
      .where(eq(works.id, targets.targetWork.id))
      .returning();

    if (!updatedWork) {
      return NextResponse.json({ error: 'Failed to update work' }, { status: 500 });
    }

    const { totalHoursLogged, status } = await refreshTimesheetSummary(
      targets.targetTimesheet.id,
      targets.targetTimesheet.targetHours,
    );

    const responsePayload: AddWorkResponse = {
      data: toWorkItem(updatedWork, project.name),
      totalHoursLogged,
      status,
    };

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (error) {
    logger.error('Error updating work:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { timesheetId, entryId, workId } = await params;
    const { searchParams } = new URL(request.url);
    const orgSlug = searchParams.get('orgSlug')?.trim();

    if (!orgSlug) {
      return NextResponse.json({ error: 'orgSlug is required' }, { status: 400 });
    }
    if (!timesheetId || !entryId || !workId) {
      return NextResponse.json(
        { error: 'timesheetId, entryId and workId are required' },
        { status: 400 },
      );
    }

    const targets = await resolveTargets(session.user, orgSlug, timesheetId, entryId, workId);
    if ('error' in targets) return targets.error;

    await db.delete(works).where(eq(works.id, targets.targetWork.id));

    // Deletion changes the totals — recompute totalHoursLogged + derive status
    const { totalHoursLogged, status } = await refreshTimesheetSummary(
      targets.targetTimesheet.id,
      targets.targetTimesheet.targetHours,
    );

    const responsePayload: DeleteWorkResponse = {
      success: true,
      totalHoursLogged,
      status,
    };

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (error) {
    logger.error('Error deleting work:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
