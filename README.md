# Time-Sheet Tracker

A multi-tenant weekly timesheet app built with the Next.js App Router. Users log hours per day entry inside weekly timesheets, and a server-derived status (`INCOMPLETE` / `COMPLETED`) is computed against an org-level default target (default 40 h).

---

## Table of Contents

- **Stack](#stack)
- [Architecture](#architecture)
- [State Management](#state-management-no-client-state-library-or-context)
- [Assumptions & Conventions](#assumptions--conventions)
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  1. [Install dependencies](#1-install-dependencies)
  2. [Configure environment variables](#2-configure-environment-variables)
  3. [Start the database](#3-start-the-database)
  4. [Run migrations](#4-run-migrations)
  5. [Seed demo data](#5-seed-demo-data)
  6. [Run the app](#6-run-the-app)
- [Demo Credentials](#demo-credentials)
- [Scripts](#scripts)
- [Testing & CI](#testing--ci)

---

## Stack

| Layer      | Choice                                                       |
| ---------- | ------------------------------------------------------------ |
| Framework  | Next.js 16 (App Router, React 19)                            |
| Language   | TypeScript                                                   |
| Styling    | Tailwind CSS v4 + `shadcn/ui`-style components, Lucide icons |
| ORM        | Drizzle ORM (schema + SQL migrations)                        |
| Database   | PostgreSQL 17 (local via Docker, Neon HTTP in production)    |
| Auth       | NextAuth (Auth.js) — JWT sessions, Credentials provider      |
| Validation | Zod (shared client/server schemas)                           |
| Testing    | Vitest + Testing Library (jsdom)                             |
| Tooling    | pnpm, ESLint, Prettier, Husky, Commitlint, GitHub Actions    |

## Architecture

- **Layered & service-oriented**: API route handlers (`app/api/**`) are thin — auth guards, zod validation, and tenant checks live in `lib/api/route-helpers.ts`; reads go through `services/timesheet/*`; the only data layer is `app/database/`.
- **Multi-tenant security**: every handler resolves the org from session claims **and** re-verifies DB membership (`requireOrgAccess`) so a caller can never touch another tenant's rows. Pages are still rendered from server components using the same guards.
- **Caching**: timesheet list/details are statically generated and cached with ISR; `services/timesheet/cache.ts` triggers on-demand revalidation after every mutation.
- **Atomic writes**: timesheet + day-entry creation, and add/edit/delete work plus summary recompute, run inside `db.transaction` (via `withTransaction`) locally; sequential fallback on the Neon HTTP driver.
- **Abuse protection**: unauthenticated `/api/*` calls get a JSON `401`, and mutation endpoints are rate-limited per authenticated user (429 + `Retry-After`).
- **Monorepo-style config**: enum/const-heavy config lives in `lib/constants.ts`; shared types in `types/`.

## State Management (no client state library or Context)

The app **deliberately has no client-side state library (Zustand/Redux/Jotai/…) and no React Context**. The only client-side primitives in use are local `useState`, `useTransition`, `react-hook-form` (field-local form state), and the URL itself. Here is where each kind of state lives:

| Kind of state               | Owned by                                               | Examples                                               |
| --------------------------- | ------------------------------------------------------ | ------------------------------------------------------ |
| Domain / business data      | Server (DB) + ISR cache, rendered by server components | Timesheets, entries, works, totals                     |
| Query / filter / pagination | **URL search params** (`useQueryParams` hook)          | `status`, `sort`, `order`, `page`, `limit`, date range |
| Ephemeral UI state          | Local component state                                  | Open dialogs, pending transitions                      |
| Form values                 | `react-hook-form` (component-scoped)                   | Add/edit work dialog fields                            |
| Optimistic mutations        | Local state echoed from the API response               | Totals/status update right after save                  |

**Why no state library or Context?**

1. **There is no truly shared client state.** Everything mutable (totals, status, entries) is owned by the server; read-only views are server-rendered from the ISR cache. A global store or Context would duplicate server truth in the browser and drift from it.
2. **The URL is the right store for filters.** Status/sort/page/date live in search params, so every view is shareable, bookmarkable, and back-button safe with zero synchronization code.
3. **Server-first keeps the client small.** App Router server components mean global store state would force shared data into client bundles, hurting SSR, TTI, and bundle size for data users never contextually need.
4. **Less boilerplate, fewer failure modes.** No providers to mount, no selectors, no actions/reducers, no desync bugs — and components render in tests the same way they render in production (the Vitest suite mounts them directly with mocked navigation).
5. **Cross-component interactions are few and shallow** (dialog ↔ row ↔ details view), so plain prop-drilling covers them with no propelling cost.

The layering keeps this reversible: if a real need appears (multi-user live editing, cross-page shared caches, optimistic offline writes), a targeted store can be introduced where it earns its keep without ripping anything out.

## Assumptions & Conventions

### Tenancy & roles

- **An organization is the tenant.** Its `slug` is globally unique and is the URL key everywhere (`/{orgSlug}/timesheets`, `/{orgSlug}/timesheets/{id}`).
- **A user can belong to many organizations** through the `org_memberships` join table (unique per `user_id` + `org_id`). Roles: `OWNER`, `ADMIN`, `MEMBER` (default `MEMBER`).
- **The app assumes one primary org per user**: the login/session flow treats `orgs[0]` as the active workspace, and the user is redirected to `/{primaryOrgSlug}/timesheets` after signing in. Authorization is still verified server-side against the DB membership table on every request — the session claim alone is never trusted.
- The seeded demo user is `OWNER` of exactly one org ("Acme Analytics").

### Data model & relations

```
users 1───N org_memberships N───1 organizations   (membership row has the role)
organizations 1───N projects                       (a project always belongs to one org)
organizations 1───N work_types                     (org-scoped picklists: Development, Meeting, …)
organizations 1───N timesheets N───1 users         (one week = one timesheet per user per org)
timesheets 1───N time_entries                      (Mon–Fri day entries, one per weekday)
time_entries 1───N works N───1 users               (hours logged against a project)
works N───1 projects                              (project delete is RESTRICTed while works exist)
```

### Week, hours & status model

- **Weeks are Monday → Friday.** Each timesheet spans `startDate` (Mon) to `endDate` (Fri); week numbers are counted from the first Monday of the year.
- **Day entries are assumed to pre-exist** — seeding populates one `time_entry` per weekday for the whole current year; the API can also auto-generate them via `POST /api/timesheets`.
- **Hours per work item** are numeric, step `0.5`, clamped to `[0.5, 24]` on both the UI and the zod API schema. `totalHoursLogged` on a timesheet is derived by SQL `SUM(hours)` across all its entries' works.
- **Status is derived, not user-set**: `totalHoursLogged >= targetHours` → `COMPLETED`, otherwise `INCOMPLETE`. `MISSING` is only the insert-time default before any totals exist. Global default target is `40.00 h` (org-level `defaultTargetHours`).
- `SUBMITTED` / `APPROVED` / `REJECTED` enum values exist in the schema but are **not yet used** by the current flow.

### The "Create" timesheet flow

- The list's **Create/Update/View action is just navigation** — there is **no create-timesheet form**. Clicking **Create** on a `MISSING` week opens the same timesheet details page.
- On the details page the day rows already exist, and the user **adds task (work) entries per day** via _Add new task_. The timesheet structure itself is never created from the UI; it's seeded or created through `POST /api/timesheets`, which inserts the timesheet and its day entries atomically.
- Totals, progress, and `INCOMPLETE`/`COMPLETED` status update **live** on the details page after every add/edit/delete of a work entry.

## Prerequisites

- [Node.js](https://nodejs.org) 20+ (22 recommended)
- [pnpm](https://pnpm.io) 11 (`corepack enable` works too — package manager is pinned)
- [Docker](https://www.docker.com) with Docker Compose (for the local Postgres)
- Optional: a [Neon](https://neon.tech) project URL if running against remote Postgres

## Project Structure

```
app/
  (private)/[orgSlug]/timesheets/   # ISR-cached list + details pages
  api/                              # route handlers (timesheets, works, auth)
  database/                         # schema.ts, migrations/, seed.ts, migrate.ts
auth.ts                             # NextAuth config + Credentials provider
components/                         # app components (shared/, timesheets/, auth/)
services/timesheet/                 # data access + caching layers
lib/                                # api guards, validations, rate-limit, constants
tests/                              # vitest unit + component tests
```

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Copy the example file into the environment-specific files. Development and production use **separate** env files (the scripts load them explicitly):

```bash
cp .env.example .env.development
# Optionally: cp .env.example .env.production
# Optionally: cp .env.example .env.development.local   # git-ignored secrets overrides
```

Required variables:

| Variable                                              | Purpose                                                                   |
| ----------------------------------------------------- | ------------------------------------------------------------------------- |
| `DATABASE_URL`                                        | PostgreSQL connection string for the local Docker DB (see below)          |
| `AUTH_SECRET`                                         | Secret used to sign Auth.js JWTs. Generate with `openssl rand -base64 32` |
| `NEXT_PUBLIC_VERCEL_URL`                              | Public base URL (e.g. `http://localhost:3000`)                            |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Only for the Docker Compose database                                      |

Local Docker database URL (matches `docker-compose.yml` defaults):

```text
DATABASE_URL=postgres://postgres:postgres@localhost:5432/timesheet-tracker
```

### 3. Start the database

```bash
pnpm db:up          # starts Postgres 17 on localhost:5432 (docker compose up -d)
# stop later with:  pnpm db:down
```

### 4. Run migrations

```bash
pnpm db:migrate:dev # applies tracked SQL migrations in app/database/migrations
```

> Schema changes? Edit `app/database/schema.ts`, then `pnpm db:generate` to write a new migration, then re-run `pnpm db:migrate:dev`.

### 5. Seed demo data

```bash
pnpm db:seed
```

This wipes and re-creates the database with: one demo user, one organization ("Acme Analytics"), 6 projects, 6 work types, and **empty** weekly timesheets (Mon–Fri entries, `0.00` h logged, `INCOMPLETE`) for the entire current year.

### 6. Run the app

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in.

## Demo Credentials

| Field    | Value                                             |
| -------- | ------------------------------------------------- |
| Email    | `demo@timesheet.dev`                              |
| Password | `Demo#Pass1`                                      |
| Org      | **Acme Analytics** (`/acme-analytics/timesheets`) |

The seed derives these from env vars — override per environment if needed:

```bash
SEED_DEMO_EMAIL=you@example.com SEED_DEMO_PASSWORD='Your#Pass1' SEED_DEMO_ORG_SLUG=my-org pnpm db:seed
```

`SEED_EXTRA_ORGS=true` seeds two additional empty organizations for multi-tenant demos.

## Scripts

| Script                 | Description                                           |
| ---------------------- | ----------------------------------------------------- |
| `pnpm dev`             | Start the dev server (`http://localhost:3000`)        |
| `pnpm dev:prod`        | Run dev with `NODE_ENV=production` (Neon HTTP driver) |
| `pnpm build`           | Production build (`next build`)                       |
| `pnpm start`           | Serve the production build                            |
| `pnpm type-check`      | `tsc --noEmit`                                        |
| `pnpm lint`            | ESLint                                                |
| `pnpm format`          | Prettier write                                        |
| `pnpm test`            | Vitest (unit + component)                             |
| `pnpm test:watch`      | Vitest watch mode                                     |
| `pnpm test:coverage`   | Vitest with coverage                                  |
| `pnpm check`           | Lint + format + types in one shot                     |
| `pnpm db:up`/`db:down` | Start/stop the Docker Postgres                        |
| `pnpm db:generate`     | Write a new Drizzle migration from `schema.ts`        |
| `pnpm db:migrate:dev`  | Apply migrations to the development database          |
| `pnpm db:migrate:prod` | Apply migrations to the production database           |
| `pnpm db:seed`         | Wipe + seed demo data (development)                   |
| `pnpm db:studio`       | Open Drizzle Studio (database browser)                |

## Testing & CI

- **Unit/component tests** live in `tests/` and run with Vitest (`pnpm test`). The DB and Auth.js are mocked so no database is required to test.
- **CI** (`.github/workflows/ci.yml`) runs `type-check → lint → format:check → test` on every pull request and push to `main`.
- **Git hygiene**: Husky runs the same checks pre-commit; Commitlint enforces [Conventional Commits](https://www.conventionalcommits.org) (lowercase subject, ≤ 100 chars, type in `feat|fix|refactor|chore|test|perf|ci|docs|style|build|revert`).
