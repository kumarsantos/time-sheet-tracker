import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { logger } from '@/lib/logger';
import { checkRateLimit, type RateLimitOptions } from '@/lib/rate-limit';
import { db } from '@/app/database';
import {
  organizations,
  orgMemberships,
  projects,
  timeEntries,
  timesheets,
  works,
} from '@/app/database/schema';

type OrgClaim = { slug: string; orgId: string };
type SessionUser = { id: string; orgs?: OrgClaim[] };

export type GuardResult<T> = T | NextResponse;

export const isError = (result: unknown): result is NextResponse => result instanceof NextResponse;

export function apiError(error: string, status = 500, details?: unknown): NextResponse {
  return NextResponse.json(details === undefined ? { error } : { error, details }, { status });
}

/** Parses an optional positive integer query value with a fallback and upper bound. */
export function parseBoundedInt(val: string | null, fallback: number, max = Infinity): number {
  if (!val) return fallback;
  const parsed = parseInt(val, 10);
  if (Number.isNaN(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

/**
 * Bulletproofing for mutating endpoints: returns a 429 JSON response when the
 * caller has exceeded the window budget, otherwise `true`. Key on the
 * authenticated user id (not the raw IP) so keys can't be trivially rotated.
 */
export function requireRateLimit(key: string, opts?: RateLimitOptions): GuardResult<true> {
  const result = checkRateLimit(key, opts);
  if (!result.ok) {
    const response = NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(result.retryAfterSeconds) } },
    );
    return response;
  }
  return true;
}

/** Shared auth guard: returns the session user id or a 401 JSON response. */
export async function requireUser(): Promise<GuardResult<{ userId: string; user: SessionUser }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError('Unauthorized', 401);
  }
  const { id: userId } = session.user;
  return { userId, user: session.user };
}

/**
 * Resolves a tenant from the session claims plus a hard DB membership check.
 * This is the single authorization boundary shared by every timesheet handler.
 * Also surfaces the org-level default weekly target used when creating timesheets.
 */
export async function requireOrgAccess(
  userId: string,
  user: SessionUser,
  orgSlug?: string,
): Promise<GuardResult<{ orgId: string; defaultTargetHours: string }>> {
  const slug = orgSlug?.trim();
  if (!slug) {
    return apiError('orgSlug is required', 400);
  }

  const sessionOrg = user.orgs?.find((org) => org.slug === slug);
  if (!sessionOrg) {
    return apiError('Forbidden', 403);
  }

  const [membership] = await db
    .select({ id: orgMemberships.id, defaultTargetHours: organizations.defaultTargetHours })
    .from(orgMemberships)
    .innerJoin(organizations, eq(organizations.id, orgMemberships.orgId))
    .where(and(eq(orgMemberships.orgId, sessionOrg.orgId), eq(orgMemberships.userId, userId)))
    .limit(1);

  if (!membership) {
    return apiError('Forbidden', 403);
  }

  return { orgId: sessionOrg.orgId, defaultTargetHours: membership.defaultTargetHours };
}

export interface WorkRow {
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

export interface ResolvedBase {
  orgId: string;
  timesheet: { id: string; targetHours: string };
  entry: { id: string };
}

/**
 * Shared ownership chain resolver for org membership -> owned timesheet -> owned
 * day entry. Returns the resolved targets or a JSON error response.
 */
export async function resolveTimesheetAndEntry(
  user: SessionUser,
  orgSlug: string,
  timesheetId: string,
  entryId: string,
): Promise<GuardResult<ResolvedBase>> {
  const org = await requireOrgAccess(user.id, user, orgSlug);
  if (isError(org)) return org;

  const [targetTimesheet] = await db
    .select({ id: timesheets.id, targetHours: timesheets.targetHours })
    .from(timesheets)
    .where(
      and(
        eq(timesheets.id, timesheetId),
        eq(timesheets.orgId, org.orgId),
        eq(timesheets.userId, user.id),
      ),
    )
    .limit(1);
  if (!targetTimesheet) {
    return apiError('Timesheet not found', 404);
  }

  const [targetEntry] = await db
    .select({ id: timeEntries.id })
    .from(timeEntries)
    .where(and(eq(timeEntries.id, entryId), eq(timeEntries.timesheetId, targetTimesheet.id)))
    .limit(1);
  if (!targetEntry) {
    return apiError('Time entry not found for this timesheet', 404);
  }

  return { orgId: org.orgId, timesheet: targetTimesheet, entry: targetEntry };
}

export interface ResolvedTargets extends ResolvedBase {
  work: WorkRow;
}

/**
 * Full ownership chain resolver (org -> timesheet -> entry -> work). Used by the
 * update / delete work handlers.
 */
export async function resolveTargets(
  user: SessionUser,
  orgSlug: string,
  timesheetId: string,
  entryId: string,
  workId: string,
): Promise<GuardResult<ResolvedTargets>> {
  const base = await resolveTimesheetAndEntry(user, orgSlug, timesheetId, entryId);
  if (isError(base)) return base;

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
    .where(and(eq(works.id, workId), eq(works.timeEntryId, base.entry.id)))
    .limit(1);
  if (!targetWork) {
    return apiError('Work not found', 404);
  }

  return { ...base, work: targetWork };
}

/** Validates that a project belongs to the target org; returns its name or a JSON error. */
export async function resolveOrgProject(
  orgId: string,
  projectId: string,
): Promise<GuardResult<{ id: string; name: string }>> {
  const [project] = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId)))
    .limit(1);
  if (!project) {
    return apiError('Project not found for this organization', 400);
  }
  return project;
}

/** Parses a JSON request body and validates it against the zod schema. */
export async function readJsonBody<T>(
  request: Request | NextRequest,
  schema: z.ZodType<T>,
  errorMessage = 'Invalid work details',
): Promise<GuardResult<T>> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return apiError('Invalid JSON body', 400);
  }

  const parsed = schema.safeParse(rawBody);
  if (!parsed.success) {
    return apiError(errorMessage, 400, parsed.error.flatten().fieldErrors);
  }
  return parsed.data;
}

/**
 * Wraps a route handler body so every handler shares the same logger + 500
 * fallback instead of repeating the identical try/catch block.
 */
export async function handleRoute(
  logMessage: string,
  fn: () => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    return await fn();
  } catch (error) {
    logger.error(logMessage, error);
    return apiError('Internal Server Error', 500);
  }
}
