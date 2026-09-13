import 'server-only';
import { drizzle as drizzleNode } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { Pool as PgPool } from 'pg';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';
import { logger } from '@/lib/logger';

const isProduction = process.env.NODE_ENV === 'production';

export type DrizzleDB = NodePgDatabase<typeof schema> | NeonHttpDatabase<typeof schema>;

// Correct global augmentation syntax for standard modules
declare global {
  var __pgPool__: PgPool | undefined;
}

function getLocalPool(connectionString: string): PgPool {
  if (!globalThis.__pgPool__) {
    const pool = new PgPool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });

    pool.on('error', (err) => {
      logger.error('Unexpected error on idle database client', { err });
    });

    globalThis.__pgPool__ = pool;
  }

  return globalThis.__pgPool__;
}

function createDbInstance(): DrizzleDB {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is missing from environment variables.');
  }

  // PRODUCTION: Neon via HTTP (Zero cold starts on Vercel)
  if (isProduction) {
    const sql = neon(connectionString);
    return drizzleNeon({ client: sql, schema }); // Fixed API syntax
  }

  // LOCAL: Node-Postgres Singleton Pool across HMR reloads
  const pool = getLocalPool(connectionString);
  return drizzleNode({ client: pool, schema }); // Fixed API syntax
}

export const db = createDbInstance();

export async function testDbConnection(): Promise<boolean> {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    logger.error('DATABASE_URL is missing from environment variables.');
    return false;
  }

  try {
    if (isProduction) {
      const sql = neon(connectionString);
      await sql`SELECT 1`;
    } else {
      const pool = getLocalPool(connectionString);
      // Safer: pool.query handles checkout & auto-release under the hood securely
      await pool.query('SELECT 1');
    }
    return true;
  } catch {
    return false;
  }
}

export async function closeDb(): Promise<void> {
  if (globalThis.__pgPool__) {
    await globalThis.__pgPool__.end();
    globalThis.__pgPool__ = undefined;
  }
}
