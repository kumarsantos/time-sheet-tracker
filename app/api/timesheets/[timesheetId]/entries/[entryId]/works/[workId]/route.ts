import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import {
  apiError,
  handleRoute,
  isError,
  readJsonBody,
  requireRateLimit,
  requireUser,
  resolveOrgProject,
  resolveTargets,
} from '@/lib/api/route-helpers';
import { refreshTimesheetSummary } from '@/lib/timesheet-summary';
import { addWorkApiSchema } from '@/lib/validations/timesheet';
import { toWorkItem } from '@/services/timesheet/data';
import { revalidateTimesheetData } from '@/services/timesheet/cache';
import { withTransaction } from '@/app/database';
import { works } from '@/app/database/schema';
import type { AddWorkResponse, DeleteWorkResponse } from '@/types/timesheet-details';

interface RouteParams {
  params: Promise<{ timesheetId: string; entryId: string; workId: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
  return handleRoute('Error updating work:', async () => {
    const user = await requireUser();
    if (isError(user)) return user;

    const rateLimited = requireRateLimit(`mutations:${user.userId}`);
    if (isError(rateLimited)) return rateLimited;

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

    // Update the work row and the recomputed summary in one atomic unit.
    const { work, totalHoursLogged, status } = await withTransaction(async (tx) => {
      const [updatedWork] = await tx
        .update(works)
        .set({
          projectId: project.id,
          typeOfWork: payload.typeOfWork.trim(),
          description: payload.description.trim(),
          hours: payload.hours.toFixed(2),
        })
        .where(eq(works.id, targets.work.id))
        .returning();

      const summary = await refreshTimesheetSummary(
        tx,
        targets.timesheet.id,
        targets.timesheet.targetHours,
      );

      return { work: updatedWork, ...summary };
    });

    if (!work) {
      return apiError('Failed to update work', 500);
    }

    // ISR: totals/status changed → refresh this details page and the org list
    // (orgSlug is non-null here — a missing one already short-circuited in resolveTargets)
    revalidateTimesheetData(orgSlug ?? '', timesheetId);

    const responsePayload: AddWorkResponse = {
      data: toWorkItem(work, project.name),
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

    const rateLimited = requireRateLimit(`mutations:${user.userId}`);
    if (isError(rateLimited)) return rateLimited;

    const { timesheetId, entryId, workId } = await params;
    if (!timesheetId || !entryId || !workId) {
      return apiError('timesheetId, entryId and workId are required', 400);
    }

    const { searchParams } = new URL(request.url);
    const orgSlug = searchParams.get('orgSlug');

    const targets = await resolveTargets(user.user, orgSlug ?? '', timesheetId, entryId, workId);
    if (isError(targets)) return targets;

    // Delete the work row and recompute the summary in one atomic unit so a
    // failure can't leave totals/status describing a work that still exists.
    const { totalHoursLogged, status } = await withTransaction(async (tx) => {
      await tx.delete(works).where(eq(works.id, targets.work.id));

      return refreshTimesheetSummary(tx, targets.timesheet.id, targets.timesheet.targetHours);
    });

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
