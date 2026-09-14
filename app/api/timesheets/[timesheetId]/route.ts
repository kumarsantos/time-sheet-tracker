import { NextResponse } from 'next/server';
import {
  apiError,
  handleRoute,
  isError,
  requireOrgAccess,
  requireUser,
} from '@/lib/api/route-helpers';
import { getTimesheetDetail } from '@/services/timesheet/data';

interface RouteParams {
  params: Promise<{ timesheetId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { timesheetId } = await params;

  return handleRoute('Error fetching timesheet details:', async () => {
    const user = await requireUser();
    if (isError(user)) return user;

    const { searchParams } = new URL(request.url);
    const orgSlug = searchParams.get('orgSlug')?.trim();

    if (!timesheetId) {
      return apiError('timesheetId is required', 400);
    }

    const org = await requireOrgAccess(user.userId, user.user, orgSlug);
    if (isError(org)) return org;

    const data = await getTimesheetDetail({
      orgId: org.orgId,
      userId: user.userId,
      timesheetId,
    });

    if (!data) {
      return apiError('Timesheet not found', 404);
    }

    return NextResponse.json({ data });
  });
}
