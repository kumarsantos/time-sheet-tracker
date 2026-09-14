import { NextResponse } from 'next/server';
import { handleRoute, isError, requireOrgAccess, requireUser } from '@/lib/api/route-helpers';
import { getStatusItems } from '@/services/timesheet/data';

export async function GET(request: Request) {
  return handleRoute('Error fetching timesheet status items:', async () => {
    const user = await requireUser();
    if (isError(user)) return user;

    const { searchParams } = new URL(request.url);
    const orgSlug = searchParams.get('orgSlug');

    // Consistent with every other timesheet handler: DB-verified membership.
    const org = await requireOrgAccess(user.userId, user.user, orgSlug ?? undefined);
    if (isError(org)) return org;

    return NextResponse.json({ data: getStatusItems() });
  });
}
