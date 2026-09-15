# Time-Sheet Tracker

A multi-tenant weekly timesheet app built with the Next.js App Router. Users log hours per day entry inside weekly timesheets, and a server-derived status (`INCOMPLETE` / `COMPLETED`) is computed against an org-level default target (default 40 h).

---

## Table of Contents

- [Stack](#stack)
- [Architecture](#architecture)
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
