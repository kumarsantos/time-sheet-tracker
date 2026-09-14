import {
  pgTable,
  timestamp,
  varchar,
  index,
  uuid,
  text,
  date,
  integer,
  numeric,
  pgEnum,
  unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/* ==========================================================================
   1. ENUMS
   ========================================================================== */
export const timesheetStatusEnum = pgEnum('timesheet_status', [
  'COMPLETED',
  'INCOMPLETE',
  'MISSING',
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
]);

export const organizationRoleEnum = pgEnum('organization_role', ['OWNER', 'ADMIN', 'MEMBER']);

/* ==========================================================================
   2. CORE AUTH TABLES (Auth.js / NextAuth Compatible)
   ========================================================================== */

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }),
    email: varchar('email', { length: 255 }).notNull().unique(),
    emailVerified: timestamp('email_verified', { mode: 'date', withTimezone: true }),
    image: text('image'),

    password: varchar('password', { length: 255 }), // Nullable for OAuth users
    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),

    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [index('idx_users_email').on(table.email)],
);

/* ==========================================================================
   3. MULTI-TENANCY & DOMAIN TABLES
   ========================================================================== */

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
});

export const orgMemberships = pgTable(
  'org_memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    role: organizationRoleEnum('role').notNull().default('MEMBER'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Prevents duplicate user memberships in the same organization
    unique('uq_org_memberships_user_org').on(table.userId, table.orgId),
  ],
);

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [index('idx_projects_org').on(table.orgId)],
);

export const timesheets = pgTable(
  'timesheets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    weekNumber: integer('week_number').notNull(),
    year: integer('year').notNull(),
    startDate: date('start_date', { mode: 'string' }).notNull(),
    endDate: date('end_date', { mode: 'string' }).notNull(),

    status: timesheetStatusEnum('status').notNull().default('MISSING'),
    targetHours: numeric('target_hours', { precision: 5, scale: 2 }).notNull().default('40.00'),
    totalHoursLogged: numeric('total_hours_logged', { precision: 5, scale: 2 })
      .notNull()
      .default('0.00'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    index('idx_timesheets_org_user').on(table.orgId, table.userId),
    index('idx_timesheets_user_status').on(table.userId, table.status),
    // CRITICAL for GET /api/timesheets performance
    index('idx_timesheets_org_status_start').on(table.orgId, table.status, table.startDate),
  ],
);
export const timeEntries = pgTable(
  'time_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    timesheetId: uuid('timesheet_id')
      .notNull()
      .references(() => timesheets.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'restrict' }),

    typeOfWork: varchar('type_of_work', { length: 100 }).notNull(),
    description: text('description').notNull(),
    hours: numeric('hours', { precision: 5, scale: 2 }).notNull(),
    entryDate: date('entry_date', { mode: 'string' }).notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    index('idx_time_entries_timesheet').on(table.timesheetId),
    index('idx_time_entries_user_date').on(table.userId, table.entryDate),
  ],
);

/* ==========================================================================
   4. RELATIONS
   ========================================================================== */

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(orgMemberships),
  timesheets: many(timesheets),
  timeEntries: many(timeEntries),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  memberships: many(orgMemberships),
  projects: many(projects),
  timesheets: many(timesheets),
}));

export const orgMembershipsRelations = relations(orgMemberships, ({ one }) => ({
  user: one(users, { fields: [orgMemberships.userId], references: [users.id] }),
  organization: one(organizations, {
    fields: [orgMemberships.orgId],
    references: [organizations.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, { fields: [projects.orgId], references: [organizations.id] }),
  timeEntries: many(timeEntries),
}));

export const timesheetsRelations = relations(timesheets, ({ one, many }) => ({
  organization: one(organizations, { fields: [timesheets.orgId], references: [organizations.id] }),
  user: one(users, { fields: [timesheets.userId], references: [users.id] }),
  entries: many(timeEntries),
}));

export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  timesheet: one(timesheets, { fields: [timeEntries.timesheetId], references: [timesheets.id] }),
  user: one(users, { fields: [timeEntries.userId], references: [users.id] }),
  project: one(projects, { fields: [timeEntries.projectId], references: [projects.id] }),
}));
