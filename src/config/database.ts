import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { env } from './env.js';
import { logger } from './logger.js';

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
  // Fail fast instead of hanging when the database is unreachable.
  connectionTimeoutMillis: 5_000,
});

/** The single PrismaClient for the process. Connections are opened lazily on first query. */
export const prisma = new PrismaClient({ adapter });

const HEALTH_CHECK_TIMEOUT_MS = 2_000;

/** Returns true when the database answers a trivial query within the timeout. Never throws. */
export async function checkDatabaseConnection(): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`database health check timed out after ${HEALTH_CHECK_TIMEOUT_MS}ms`));
      }, HEALTH_CHECK_TIMEOUT_MS);
    });
    await Promise.race([prisma.$queryRaw`SELECT 1`, timeout]);
    return true;
  } catch (error) {
    logger.warn({ err: error }, 'Database health check failed');
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
