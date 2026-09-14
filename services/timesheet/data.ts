import 'server-only';

import { and, asc, count, desc, eq, gte, lte } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/app/database';
import {
  orgMemberships,
  projects,
  timeEntries,
  timesheetStatusEnum,
  timesheets,
  workTypes,
  works,
} from '@/app/database/schema';
import { statusValues } from '@/data/dashboard';
import { ISO_DATE_RE } from '@/lib/constants';
import { formatWeekRangeLabel } from '@/lib/helpers/date-time';
import type { TimesheetStatus } from '@/types/timesheets';
import type {
  AddWorkOptions,
  TimeEntryItem,
  TimesheetDetail,
  WorkItem,
} from '@/types/timesheet-details';

/* ==========================================================================
   Tenant resolution
   ========================================================================== */

export interface TenantContext {
  orgId: string;
  userId: string;
}

/**
 * Resolves the authenticated user + DB-verified org membership for a slug.
 * Returns null when the request has no session, the slug is not owned, or the
 * DB membership has been revoked. Server components use this, then notFound().
 */
export async function resolveTenant(orgSlug: string): Promise<TenantContext | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const sessionOrg = session.user.orgs?.find((org) => org.slug === orgSlug);
  if (!sessionOrg) return null;

  const [membership] = await db
    .select({ id: orgMemberships.id })
    .from(orgMemberships)
    .where(and(eq(orgMemberships.orgId, sessionOrg.orgId), eq(orgMemberships.userId, userId)))
    .limit(1);

  if (!membership) return null;

  return { orgId: sessionOrg.orgId, userId };
}

/** Resolves a tenant or throws a 404 (used by server components). */
export async function requireTenant(orgSlug: string): Promise<TenantContext> {
  const tenant = await resolveTenant(orgSlug);
  if (!tenant) notFound();
  return tenant;
}

/* ==========================================================================
   Serializers (single source of truth for the wire shapes)
   ========================================================================== */

export interface WorkRowDTO {
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

export function toWorkItem(work: WorkRowDTO, projectName: string): WorkItem {
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

type TimesheetRowDraft = typeof timesheets.$inferSelect;

export function toTimesheetRow(item: TimesheetRowDraft): {
  id: string;
  weekNum: number;
  date: string;
  status: TimesheetStatus;
} {
  return {
    id: item.id,
    weekNum: item.weekNumber,
    date: formatWeekRangeLabel(item.startDate, item.endDate),
    status: item.status,
  };
}

/* ==========================================================================
   List query
   ========================================================================== */

const SORT_COLUMNS = {
  startDate: timesheets.startDate,
  weekNumber: timesheets.weekNumber,
  status: timesheets.status,
} as const;

export type TimesheetSortKey = keyof typeof SORT_COLUMNS;

const isSortKey = (value: string | null | undefined): value is TimesheetSortKey =>
  Boolean(value && value in SORT_COLUMNS);

export interface TimesheetListParams {
  orgId: string;
  page: number;
  limit: number;
  status?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  from?: string;
  to?: string;
}

export interface TimesheetListResult {
  data: ReturnType<typeof toTimesheetRow>[];
  meta: { total: number; totalPages: number; page: number; pageSize: number };
}

/**
 * Canonical paginated timesheet list query shared by GET /api/timesheets and the
 * list page's server component. Defaults to `weekNumber asc` ordering.
 */
export async function getTimesheetList({
  orgId,
  page,
  limit,
  status,
  sort,
  order,
  from,
  to,
}: TimesheetListParams): Promise<TimesheetListResult> {
  const filters = [eq(timesheets.orgId, orgId)];

  if (status && status !== 'ALL' && status !== 'undefined') {
    const upperStatus = status.toUpperCase();
    // Map UI aliases (e.g. pending -> SUBMITTED)
    const normalizedStatus = upperStatus === 'PENDING' ? 'SUBMITTED' : upperStatus;

    const allowedStatuses = new Set<string>(timesheetStatusEnum.enumValues);
    if (!allowedStatuses.has(normalizedStatus)) {
      return { data: [], meta: { total: 0, totalPages: 1, page, pageSize: limit } };
    }

    filters.push(eq(timesheets.status, normalizedStatus as TimesheetStatus));
  }

  if (from && ISO_DATE_RE.test(from)) filters.push(gte(timesheets.startDate, from));
  if (to && ISO_DATE_RE.test(to)) filters.push(lte(timesheets.endDate, to));

  const sortKey: TimesheetSortKey = isSortKey(sort) ? sort : 'weekNumber';
  const sqlOrder = order === 'desc' ? desc : asc;

  const whereClause = and(...filters);

  const [countRows, rows] = await Promise.all([
    db.select({ total: count() }).from(timesheets).where(whereClause),
    db
      .select()
      .from(timesheets)
      .where(whereClause)
      .orderBy(sqlOrder(SORT_COLUMNS[sortKey]))
      .limit(limit)
      .offset((page - 1) * limit),
  ]);

  const total = Number(countRows[0]?.total ?? 0);
  const totalPages = Math.ceil(total / limit) || 1;

  return {
    data: rows.map(toTimesheetRow),
    meta: { total, totalPages, page, pageSize: limit },
  };
}

/* ==========================================================================
   Detail query
   ========================================================================== */

/**
 * Canonical nested timesheet detail used by GET /api/timesheets/[id] and the
 * details page's server component. Returns null when the timesheet doesn't
 * exist or isn't owned by the user in the resolved org.
 */
export async function getTimesheetDetail(params: {
  orgId: string;
  userId: string;
  timesheetId: string;
}): Promise<TimesheetDetail | null> {
  const { orgId, userId, timesheetId } = params;

  const [targetTimesheet] = await db
    .select()
    .from(timesheets)
    .where(
      and(
        eq(timesheets.id, timesheetId),
        eq(timesheets.orgId, orgId),
        eq(timesheets.userId, userId),
      ),
    )
    .limit(1);

  if (!targetTimesheet) return null;

  // One entry per day in the week range, ordered by the calendar date.
  const dayEntries = await db
    .select()
    .from(timeEntries)
    .where(eq(timeEntries.timesheetId, targetTimesheet.id))
    .orderBy(asc(timeEntries.entryDate));

  const [orgProjects, orgWorkTypes, allWorks] = await Promise.all([
    db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(eq(projects.orgId, orgId)),
    db.select({ name: workTypes.name }).from(workTypes).where(eq(workTypes.orgId, orgId)),
    dayEntries.length
      ? db
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
      : [],
  ]);

  const worksByEntry = new Map<string, typeof allWorks>();
  for (const work of allWorks) {
    const list = worksByEntry.get(work.timeEntryId) ?? [];
    list.push(work);
    worksByEntry.set(work.timeEntryId, list);
  }

  const entries: TimeEntryItem[] = dayEntries.map((entry) => ({
    id: entry.id,
    timesheetId: entry.timesheetId,
    userId: entry.userId,
    entryDate: entry.entryDate,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    works: (worksByEntry.get(entry.id) ?? []).map((w) =>
      toWorkItem(w, w.projectName ?? 'Unknown Project'),
    ),
  }));

  return {
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
    workTypes: orgWorkTypes.map((type) => type.name),
    createdAt: targetTimesheet.createdAt.toISOString(),
    updatedAt: targetTimesheet.updatedAt.toISOString(),
    entries,
  };
}

/* ==========================================================================
   Form options & status values
   ========================================================================== */

/** Projects + work types for the "Add work" form. */
export async function getAddWorkOptions(orgId: string): Promise<AddWorkOptions> {
  const [orgProjects, orgWorkTypes] = await Promise.all([
    db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(eq(projects.orgId, orgId)),
    db.select({ name: workTypes.name }).from(workTypes).where(eq(workTypes.orgId, orgId)),
  ]);

  return {
    projects: orgProjects,
    workTypes: orgWorkTypes.map((type) => type.name),
  };
}

/** Static status filter options shared by the list screen and status-items API. */
export function getStatusItems() {
  return statusValues;
}
