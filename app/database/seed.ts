import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import {
  organizations,
  orgMemberships,
  users,
  projects,
  workTypes,
  timesheets,
  timeEntries,
  works,
} from './schema';
import { logger } from '@/lib/logger';
import { hashPassword } from '@/lib/auth/password';

const environment = process.env.NODE_ENV || 'development';
dotenv.config({ path: `.env.${environment}`, override: true });
dotenv.config({ path: `.env.${environment}.local`, override: true });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is missing — run db:seed with --env-file for the active env');
}

const pool = new Pool({ connectionString });
const db = drizzle(pool);

/* --------------------------------------------------------------------------
   Demo credentials — hashed at runtime with the same bcrypt utility the
   Credentials provider verifies against, so you can log in right after seeding.
   -------------------------------------------------------------------------- */
export const DEMO_EMAIL = process.env.SEED_DEMO_EMAIL ?? 'demo@timesheet.dev';
export const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? 'Demo#Pass1';
export const DEMO_ORG_SLUG = process.env.SEED_DEMO_ORG_SLUG ?? 'acme-analytics';

const WORK_TYPES = ['Development', 'Meeting', 'Code Review', 'Documentation', 'Testing', 'Support'];
const WORK_TYPE_VALUES = WORK_TYPES;
const PROJECT_NAMES = [
  'Mobile App',
  'Web Dashboard',
  'API Gateway',
  'Data Pipeline',
  'Design System',
  'Infrastructure',
];
const ENTRY_NOTES = [
  'Implemented feature X',
  'Fixed flaky test suite',
  'Reviewed PR #123',
  'Wrote integration tests',
  'Refactored legacy module',
  'Debugged production issue',
];

/* Deterministic PRNG so re-running the seed is reproducible in CI. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(rng: () => number, list: readonly T[]): T =>
  list[Math.floor(rng() * list.length)]!;
const between = (rng: () => number, min: number, max: number) =>
  Math.floor(rng() * (max - min + 1)) + min;

const toISODate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

async function wipe() {
  await db.delete(works);
  await db.delete(timeEntries);
  await db.delete(timesheets);
  await db.delete(projects);
  await db.delete(workTypes);
  await db.delete(orgMemberships);
  await db.delete(organizations);
  await db.delete(users);
}

async function main(): Promise<void> {
  logger.info('Starting database seed...');

  await wipe();

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  /* 1. Demo user */
  const [demoUser] = await db
    .insert(users)
    .values({
      name: 'Demo User',
      firstName: 'Demo',
      lastName: 'User',
      email: DEMO_EMAIL,
      password: passwordHash,
    })
    .returning({ id: users.id });

  if (!demoUser) {
    throw new Error('Failed to insert demo user');
  }

  const rng = mulberry32(20260101);
  const now = new Date();

  /* 2. Organizations */
  const [org1] = await db
    .insert(organizations)
    .values({
      name: DEMO_ORG_SLUG.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      slug: DEMO_ORG_SLUG,
      description: 'Seed organization',
      defaultTargetHours: '40.00',
    })
    .returning({ id: organizations.id });

  const orgIds: string[] = [org1!.id];

  if (process.env.SEED_EXTRA_ORGS === 'true') {
    for (let i = 1; i <= 2; i++) {
      const [org] = await db
        .insert(organizations)
        .values({
          name: `Org ${i}`,
          slug: `org-${i}`,
          description: 'Additional seed organization',
          defaultTargetHours: '40.00',
        })
        .returning({ id: organizations.id });
      if (org) orgIds.push(org.id);
    }
  }

  /* 3. Membership (demo user is OWNER of org1 → login + timesheet access) */
  await db.insert(orgMemberships).values({
    userId: demoUser.id,
    orgId: org1!.id,
    role: 'OWNER',
  });

  /* 4. Projects across orgs */
  const projectIds: { orgId: string; id: string }[] = [];
  for (const orgId of orgIds) {
    const howMany = orgId === org1!.id ? PROJECT_NAMES.length : 3;
    for (let i = 0; i < howMany; i++) {
      const [project] = await db
        .insert(projects)
        .values({
          orgId,
          name: orgId === org1!.id ? PROJECT_NAMES[i]! : `Project ${i + 1}`,
          description: 'Seeded project',
        })
        .returning({ id: projects.id });
      if (project) projectIds.push({ orgId, id: project.id });
    }
  }

  /* 4b. Work types across orgs */
  for (const orgId of orgIds) {
    const names = orgId === org1!.id ? WORK_TYPES : WORK_TYPES.slice(0, 3);
    await db.insert(workTypes).values(names.map((name) => ({ orgId, name })));
  }

  /* 5. Timesheets + time entries for the full current year (Jan → Dec), one
     week at a time from the first Monday on/after Jan 1 through the last Monday
     of the year. Each timesheet holds 5 working-day entries (Mon → Fri). */
  const projectPool = projectIds.filter((p) => p.orgId === org1!.id);
  const entryPool = ENTRY_NOTES;
  const seedYear = now.getFullYear();

  // First Monday on or after Jan 1 of the seed year (getDay(): Mon=1)
  const firstDayOfYear = new Date(seedYear, 0, 1);
  const firstMonday = new Date(firstDayOfYear);
  firstMonday.setDate(firstDayOfYear.getDate() + ((1 - firstDayOfYear.getDay() + 7) % 7));
  firstMonday.setHours(0, 0, 0, 0);

  const weekStart = new Date(firstMonday);
  let weekNumberCounter = 1;
  while (weekStart.getFullYear() === seedYear) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 4); // Friday

    const startDateStr = toISODate(weekStart);
    const endDateStr = toISODate(weekEnd);
    const weekNumber = weekNumberCounter;

    const [ts] = await db
      .insert(timesheets)
      .values({
        orgId: org1!.id,
        userId: demoUser.id,
        weekNumber,
        year: seedYear,
        startDate: startDateStr,
        endDate: endDateStr,
        targetHours: '40.00',
        totalHoursLogged: '0.00',
      })
      .returning({ id: timesheets.id });

    if (!ts) {
      weekStart.setDate(weekStart.getDate() + 7);
      continue;
    }

    let totalLogged = 0;

    // 5 working days Mon → Fri, one day entry + one work per day
    const cursor = new Date(weekStart);
    for (let day = 0; day < 5; day++) {
      const entryDate = toISODate(cursor);
      const hoursLogged = between(rng, 7, 9); // Generates between 7 and 9 hours daily
      const formattedHours = hoursLogged.toFixed(2);

      totalLogged += hoursLogged;

      const [dayEntry] = await db
        .insert(timeEntries)
        .values({
          timesheetId: ts.id,
          userId: demoUser.id,
          entryDate,
        })
        .returning({ id: timeEntries.id });

      if (dayEntry) {
        await db.insert(works).values({
          timeEntryId: dayEntry.id,
          userId: demoUser.id,
          projectId: pick(rng, projectPool)!.id,
          typeOfWork: pick(rng, WORK_TYPE_VALUES),
          description: pick(rng, entryPool),
          hours: formattedHours,
        });
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    // Derive status from the weekly total so it stays consistent with the
    // add/edit/delete logic (< target -> INCOMPLETE, >= target -> COMPLETED)
    const totalHoursLogged = totalLogged.toFixed(2);
    const status = totalLogged >= 40 ? 'COMPLETED' : 'INCOMPLETE';

    await db.update(timesheets).set({ totalHoursLogged, status }).where(eq(timesheets.id, ts.id));

    weekStart.setDate(weekStart.getDate() + 7);
    weekNumberCounter += 1;
  }

  await pool.end();

  logger.info('├ Demo user seeded:', {
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  });
  logger.info('└ Seed completed successfully.');
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    logger.error('Seed failed:', { error: error instanceof Error ? error.message : String(error) });
    process.exit(1);
  });
