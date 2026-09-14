import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { and, eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { db } from '@/app/database';
import { orgMemberships, projects, works, timeEntries, timesheets } from '@/app/database/schema';
import { addWorkApiSchema } from '@/lib/validations/timesheet';
import { refreshTimesheetSummary } from '@/lib/timesheet-summary';
import type { AddWorkResponse } from '@/types/timesheet-details';

interface RouteParams {
  params: Promise<{ timesheetId: string; entryId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const { timesheetId, entryId } = await params;
    const { searchParams } = new URL(request.url);
    const orgSlug = searchParams.get('orgSlug')?.trim();

    if (!orgSlug) {
      return NextResponse.json({ error: 'orgSlug is required' }, { status: 400 });
    }
    if (!timesheetId || !entryId) {
      return NextResponse.json({ error: 'timesheetId and entryId are required' }, { status: 400 });
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

    // Verify the timesheet belongs to the session user + org
    const [targetTimesheet] = await db
      .select({ id: timesheets.id, targetHours: timesheets.targetHours })
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

    // Verify the day entry belongs to this timesheet
    const [targetEntry] = await db
      .select({ id: timeEntries.id })
      .from(timeEntries)
      .where(and(eq(timeEntries.id, entryId), eq(timeEntries.timesheetId, targetTimesheet.id)))
      .limit(1);
    if (!targetEntry) {
      return NextResponse.json(
        { error: 'Time entry not found for this timesheet' },
        { status: 404 },
      );
    }

    // Validate + normalize the payload
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

    // Project must belong to the same organization
    const [project] = await db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.orgId, targetOrgId)))
      .limit(1);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found for this organization' },
        { status: 400 },
      );
    }

    // Insert the work
    const [createdWork] = await db
      .insert(works)
      .values({
        timeEntryId: targetEntry.id,
        userId,
        projectId: project.id,
        typeOfWork: typeOfWork.trim(),
        description: description.trim(),
        hours: hours.toFixed(2),
      })
      .returning();

    if (!createdWork) {
      return NextResponse.json({ error: 'Failed to add work' }, { status: 500 });
    }

    const { totalHoursLogged, status: nextStatus } = await refreshTimesheetSummary(
      targetTimesheet.id,
      targetTimesheet.targetHours,
    );

    const responsePayload: AddWorkResponse = {
      data: {
        id: createdWork.id,
        timeEntryId: createdWork.timeEntryId,
        userId: createdWork.userId,
        projectId: createdWork.projectId,
        projectName: project.name,
        typeOfWork: createdWork.typeOfWork,
        description: createdWork.description,
        hours: createdWork.hours,
        createdAt: createdWork.createdAt.toISOString(),
        updatedAt: createdWork.updatedAt.toISOString(),
      },
      totalHoursLogged,
      status: nextStatus,
    };

    return NextResponse.json(responsePayload, { status: 201 });
  } catch (error) {
    logger.error('Error adding work:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
