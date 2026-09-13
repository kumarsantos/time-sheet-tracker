import path from 'node:path';
import { drizzle as drizzleNode } from 'drizzle-orm/node-postgres';
import { migrate as migrateNode } from 'drizzle-orm/node-postgres/migrator';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { migrate as migrateNeon } from 'drizzle-orm/neon-http/migrator';
import { Pool } from 'pg';
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import { logger } from '@/lib/logger';

const environment = process.env.NODE_ENV || 'development';
dotenv.config({ path: `.env.${environment}`, override: true });
dotenv.config({ path: `.env.${environment}.local`, override: true });

const migrationsFolder = path.join(process.cwd(), 'app/database/migrations');

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    logger.error(`DATABASE_URL is missing in .env.${environment}`);
    process.exit(1);
  }

  logger.info(`Running migrations in [${environment.toUpperCase()}] mode...`);

  try {
    if (environment === 'production') {
      const sql = neon(connectionString);
      const db = drizzleNeon(sql);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await migrateNeon(db as any, { migrationsFolder });
    } else {
      const pool = new Pool({ connectionString });
      const db = drizzleNode(pool);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await migrateNode(db as any, { migrationsFolder });
      await pool.end();
    }

    logger.info('Migrations completed successfully!');
  } catch (error) {
    logger.error('Migration failed', { error });
    process.exit(1);
  }
}

runMigrations();
