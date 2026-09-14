import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import {
  apiError,
  handleRoute,
  isError,
  readJsonBody,
  requireUser,
  resolveOrgProject,
  resolveTargets,
} from '@/lib/api/route-helpers';
import { refreshTimesheetSummary } from '@/lib/timesheet-summary';
import { addWorkApiSchema } from '@/lib/validations/timesheet';
import { toWorkItem } from '@/services/timesheet/data';
import { revalidateTimesheetData } from '@/services/timesheet/cache';
import { db } from '@/app/database';
import { works } from '@/app/database/schema';
import type { AddWorkResponse, DeleteWorkResponse } from '@/types/timesheet-details';

interface RouteParams {
  params: Promise<{ timesheetId: string; entryId: string; workId: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
  return handleRoute('Error updating work:', async () => {
    const user = await requireUser();
    if (isError(user)) return user;

    const { timesheetId, entryId, workId } = await params;
    if (!timesheetId || !entryId || !workId) {
      return apiError('timesheetId, entryId and workId are required', 400);
    }

    const { searchParams } = new URL(request.url);
    const orgSlug = searchParams.get('orgSlug');

    const targets = await resolveTargets(user.user, orgSlug ?? '', timesheetId, entryId, workId);
    if (isError(targets)) return targets;

    const payload = await readJsonBody(request, addWorkApiSchema);
    if (isError(payload)) return payload;

    const project = await resolveOrgProject(targets.orgId, payload.projectId);
    if (isError(project)) return project;

    const [updatedWork] = await db
      .update(works)
      .set({
        projectId: project.id,
        typeOfWork: payload.typeOfWork.trim(),
        description: payload.description.trim(),
        hours: payload.hours.toFixed(2),
      })
      .where(eq(works.id, targets.work.id))
      .returning();

    if (!updatedWork) {
      return apiError('Failed to update work', 500);
    }

    const { totalHoursLogged, status } = await refreshTimesheetSummary(
      targets.timesheet.id,
      targets.timesheet.targetHours,
    );

    // ISR: totals/status changed → refresh this details page and the org list
    // (orgSlug is non-null here — a missing one already short-circuited in resolveTargets)
    revalidateTimesheetData(orgSlug ?? '', timesheetId);

    const responsePayload: AddWorkResponse = {
      data: toWorkItem(updatedWork, project.name),
      totalHoursLogged,
      status,
    };

    return NextResponse.json(responsePayload, { status: 200 });
  });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  return handleRoute('Error deleting work:', async () => {
    const user = await requireUser();
    if (isError(user)) return user;

    const { timesheetId, entryId, workId } = await params;
    if (!timesheetId || !entryId || !workId) {
      return apiError('timesheetId, entryId and workId are required', 400);
    }

    const { searchParams } = new URL(request.url);
    const orgSlug = searchParams.get('orgSlug');

    const targets = await resolveTargets(user.user, orgSlug ?? '', timesheetId, entryId, workId);
    if (isError(targets)) return targets;

    await db.delete(works).where(eq(works.id, targets.work.id));

    // Deletion changes the totals — recompute totalHoursLogged + derive status
    const { totalHoursLogged, status } = await refreshTimesheetSummary(
      targets.timesheet.id,
      targets.timesheet.targetHours,
    );

    // ISR: totals/status changed → refresh this details page and the org list
    // (orgSlug is non-null here — a missing one already short-circuited in resolveTargets)
    revalidateTimesheetData(orgSlug ?? '', timesheetId);

    const responsePayload: DeleteWorkResponse = {
      success: true,
      totalHoursLogged,
      status,
    };

    return NextResponse.json(responsePayload, { status: 200 });
  });
}
