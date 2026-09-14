import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'drizzle-kit';
import { resolve } from 'node:path';

// drizzle-kit only auto-loads `.env`/`.env.local`, but this project keeps
// DATABASE_URL in `.env.development`. Load it explicitly so `db:generate`,
// `db:push`, and `db:studio` all resolve the URL regardless of cwd/shell.
loadEnv({ path: resolve(process.cwd(), '.env.development'), quiet: true });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('Missing DATABASE_URL environment variable');
}

export default defineConfig({
  schema: './app/database/schema.ts',
  out: './app/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
});
