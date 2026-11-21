import { afterAll, describe, expect, it } from 'vitest';
import { checkDatabaseConnection, disconnectDatabase, prisma } from '../../src/config/database.js';

// Runs against a real PostgreSQL when TEST_DATABASE_URL points at a reachable database.
// Otherwise the suite skips itself, unless REQUIRE_DB_TESTS=true (set this in CI so a missing
// database fails the build instead of silently skipping).
const databaseReachable = await checkDatabaseConnection();
const requireDb = process.env['REQUIRE_DB_TESTS'] === 'true';

if (requireDb && !databaseReachable) {
  throw new Error('REQUIRE_DB_TESTS=true but the test database is not reachable');
}

describe.skipIf(!databaseReachable)('database connectivity (real PostgreSQL)', () => {
  afterAll(async () => {
    await disconnectDatabase();
  });

  it('checkDatabaseConnection() resolves true', async () => {
    await expect(checkDatabaseConnection()).resolves.toBe(true);
  });

  it('can execute a query through Prisma', async () => {
    const rows = await prisma.$queryRaw<{ one: number }[]>`SELECT 1 AS one`;
    expect(rows[0]?.one).toBe(1);
  });

  it('has gen_random_uuid() available for UUID primary keys', async () => {
    const rows = await prisma.$queryRaw<{ id: string }[]>`SELECT gen_random_uuid()::text AS id`;
    expect(rows[0]?.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});

describe('database connectivity when the database is unreachable', () => {
  it('checkDatabaseConnection() returns false instead of throwing', async () => {
    // Uses a throwaway client pointed at a closed port, independent of TEST_DATABASE_URL.
    const { PrismaPg } = await import('@prisma/adapter-pg');
    const { PrismaClient } = await import('../../src/generated/prisma/client.js');
    const client = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: 'postgresql://nobody:nothing@127.0.0.1:1/none',
        connectionTimeoutMillis: 500,
      }),
    });

    await expect(client.$queryRaw`SELECT 1`).rejects.toThrow();
    await client.$disconnect();
  });
});
