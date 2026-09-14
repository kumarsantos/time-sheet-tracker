import { NextResponse } from 'next/server';
import { handleRoute, isError, requireOrgAccess, requireUser } from '@/lib/api/route-helpers';
import { getAddWorkOptions } from '@/services/timesheet/data';
import type { AddWorkOptionsResponse } from '@/types/timesheet-details';

export async function GET(request: Request) {
  return handleRoute('Error fetching add-work options:', async () => {
    const user = await requireUser();
    if (isError(user)) return user;

    const { searchParams } = new URL(request.url);
    const orgSlug = searchParams.get('orgSlug');

    const org = await requireOrgAccess(user.userId, user.user, orgSlug ?? undefined);
    if (isError(org)) return org;

    const responsePayload: AddWorkOptionsResponse = {
      data: await getAddWorkOptions(org.orgId),
    };

    return NextResponse.json(responsePayload, { status: 200 });
  });
}
