import { NextResponse } from 'next/server';
import {
  apiError,
  handleRoute,
  isError,
  readJsonBody,
  requireUser,
  resolveOrgProject,
  resolveTimesheetAndEntry,
} from '@/lib/api/route-helpers';
import { refreshTimesheetSummary } from '@/lib/timesheet-summary';
import { addWorkApiSchema } from '@/lib/validations/timesheet';
import { toWorkItem } from '@/services/timesheet/data';
import { revalidateTimesheetData } from '@/services/timesheet/cache';
import { db } from '@/app/database';
import { works } from '@/app/database/schema';
import type { AddWorkResponse } from '@/types/timesheet-details';

interface RouteParams {
  params: Promise<{ timesheetId: string; entryId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  return handleRoute('Error adding work:', async () => {
    const user = await requireUser();
    if (isError(user)) return user;

    const { timesheetId, entryId } = await params;
    if (!timesheetId || !entryId) {
      return apiError('timesheetId and entryId are required', 400);
    }

    const { searchParams } = new URL(request.url);
    const orgSlug = searchParams.get('orgSlug');

    const targets = await resolveTimesheetAndEntry(user.user, orgSlug ?? '', timesheetId, entryId);
    if (isError(targets)) return targets;

    const payload = await readJsonBody(request, addWorkApiSchema);
    if (isError(payload)) return payload;

    const project = await resolveOrgProject(targets.orgId, payload.projectId);
    if (isError(project)) return project;

    const [createdWork] = await db
      .insert(works)
      .values({
        timeEntryId: targets.entry.id,
        userId: user.userId,
        projectId: project.id,
        typeOfWork: payload.typeOfWork.trim(),
        description: payload.description.trim(),
        hours: payload.hours.toFixed(2),
      })
      .returning();

    if (!createdWork) {
      return apiError('Failed to add work', 500);
    }

    const { totalHoursLogged, status: nextStatus } = await refreshTimesheetSummary(
      targets.timesheet.id,
      targets.timesheet.targetHours,
    );

    // ISR: totals/status changed → refresh this details page and the org list
    // (orgSlug is non-null here — a missing one already short-circuited in resolveTimesheetAndEntry)
    revalidateTimesheetData(orgSlug ?? '', timesheetId);

    const responsePayload: AddWorkResponse = {
      data: toWorkItem(createdWork, project.name),
      totalHoursLogged,
      status: nextStatus,
    };

    return NextResponse.json(responsePayload, { status: 201 });
  });
}
