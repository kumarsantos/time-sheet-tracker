import {
  boolean,
  pgTable,
  timestamp,
  varchar,
  index,
  uuid,
  text,
  date,
  integer,
  pgEnum,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { AdapterAccountType } from '@auth/core/adapters';

/* ==========================================================================
   1. ENUMS
   ========================================================================== */
export const timesheetStatusEnum = pgEnum('timesheet_status', [
  'COMPLETED',
  'INCOMPLETE',
  'MISSING',
  'SUBMITTED',
  'APPROVED',
]);

/* ==========================================================================
   2. AUTH.JS REQUIRED TABLES
   ========================================================================== */

// 2.1 USERS TABLE
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }),
    email: varchar('email', { length: 255 }).notNull().unique(),
    emailVerified: timestamp('email_verified', { mode: 'date', withTimezone: true }),
    image: text('image'),

    // Custom app fields
    password: varchar('password', { length: 255 }), // Nullable to support OAuth providers (Google, GitHub, etc.)
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

// 2.2 ACCOUNTS TABLE (OAuth Providers like Google, GitHub, etc.)
export const accounts = pgTable(
  'accounts',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 255 }).$type<AdapterAccountType>().notNull(),
    provider: varchar('provider', { length: 255 }).notNull(),
    providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: varchar('token_type', { length: 255 }),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.providerAccountId] }),
    index('idx_accounts_user').on(table.userId),
  ],
);

// 2.3 SESSIONS TABLE (For database-backed Auth.js sessions)
export const sessions = pgTable(
  'sessions',
  {
    sessionToken: varchar('session_token', { length: 255 }).primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expires: timestamp('expires', { mode: 'date', withTimezone: true }).notNull(),
  },
  (table) => [index('idx_sessions_user').on(table.userId)],
);

// 2.4 VERIFICATION TOKENS TABLE (For magic links or password resets)
export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: varchar('identifier', { length: 255 }).notNull(),
    token: varchar('token', { length: 255 }).notNull(),
    expires: timestamp('expires', { mode: 'date', withTimezone: true }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })],
);

// 2.5 AUTHENTICATORS TABLE (For WebAuthn / Passkeys)
export const authenticators = pgTable(
  'authenticators',
  {
    credentialID: text('credential_id').notNull().unique(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    providerAccountId: text('provider_account_id').notNull(),
    credentialPublicKey: text('credential_public_key').notNull(),
    counter: integer('counter').notNull(),
    credentialDeviceType: text('credential_device_type').notNull(),
    credentialBackedUp: boolean('credential_backed_up').notNull(),
    transports: text('transports'),
  },
  (table) => [primaryKey({ columns: [table.userId, table.credentialID] })],
);

/* ==========================================================================
   3. APPLICATION DOMAIN TABLES
   ========================================================================== */

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
});

export const timesheets = pgTable(
  'timesheets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    weekNumber: integer('week_number').notNull(),
    year: integer('year').notNull(),
    startDate: date('start_date', { mode: 'string' }).notNull(),
    endDate: date('end_date', { mode: 'string' }).notNull(),

    status: timesheetStatusEnum('status').notNull().default('MISSING'),
    targetHours: integer('target_hours').notNull().default(40),
    totalHoursLogged: integer('total_hours_logged').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    index('idx_timesheets_user_dates').on(table.userId, table.startDate, table.endDate),
    index('idx_timesheets_user_status').on(table.userId, table.status),
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
    hours: integer('hours').notNull(),
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
  accounts: many(accounts),
  sessions: many(sessions),
  authenticators: many(authenticators),
  timesheets: many(timesheets),
  timeEntries: many(timeEntries),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const authenticatorsRelations = relations(authenticators, ({ one }) => ({
  user: one(users, {
    fields: [authenticators.userId],
    references: [users.id],
  }),
}));

export const projectsRelations = relations(projects, ({ many }) => ({
  timeEntries: many(timeEntries),
}));

export const timesheetsRelations = relations(timesheets, ({ one, many }) => ({
  user: one(users, {
    fields: [timesheets.userId],
    references: [users.id],
  }),
  entries: many(timeEntries),
}));

export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  timesheet: one(timesheets, {
    fields: [timeEntries.timesheetId],
    references: [timesheets.id],
  }),
  user: one(users, {
    fields: [timeEntries.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [timeEntries.projectId],
    references: [projects.id],
  }),
}));

/* ==========================================================================
   5. TYPE INFERENCES
   ========================================================================== */
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type VerificationToken = typeof verificationTokens.$inferSelect;
export type NewVerificationToken = typeof verificationTokens.$inferInsert;

export type Authenticator = typeof authenticators.$inferSelect;
export type NewAuthenticator = typeof authenticators.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type Timesheet = typeof timesheets.$inferSelect;
export type NewTimesheet = typeof timesheets.$inferInsert;

export type TimeEntry = typeof timeEntries.$inferSelect;
export type NewTimeEntry = typeof timeEntries.$inferInsert;
