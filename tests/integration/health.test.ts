import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { appInfo } from '../../src/config/app-info.js';
import { checkDatabaseConnection } from '../../src/config/database.js';

// The health endpoint is tested against a mocked database check so these tests are fast and
// deterministic. Real connectivity is covered in database.test.ts.
vi.mock('../../src/config/database.js', () => ({
  checkDatabaseConnection: vi.fn(),
  disconnectDatabase: vi.fn(),
  prisma: {},
}));

const mockedCheck = vi.mocked(checkDatabaseConnection);

describe('GET /api/v1/health', () => {
  const app = createApp();

  beforeEach(() => {
    mockedCheck.mockReset();
  });

  it('returns 200 with status, database, version and timestamp when the database is up', async () => {
    mockedCheck.mockResolvedValue(true);
    const before = Date.now();

    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({
      data: {
        status: 'ok',
        database: 'up',
        version: appInfo.version,
        timestamp: expect.any(String) as string,
      },
    });

    const data = (res.body as { data: { timestamp: string } }).data;
    const timestamp = new Date(data.timestamp);
    expect(data.timestamp).toMatch(/Z$/); // UTC
    expect(timestamp.getTime()).toBeGreaterThanOrEqual(before);
    expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('returns 503 with status "degraded" when the database is down', async () => {
    mockedCheck.mockResolvedValue(false);

    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ data: { status: 'degraded', database: 'down' } });
  });

  it('does not require authentication', async () => {
    mockedCheck.mockResolvedValue(true);
    const res = await request(app).get('/api/v1/health');
    expect(res.status).not.toBe(401);
  });

  it('returns a generated X-Request-Id header', async () => {
    mockedCheck.mockResolvedValue(true);
    const res = await request(app).get('/api/v1/health');
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('reuses a safe client-supplied X-Request-Id and replaces an unsafe one', async () => {
    mockedCheck.mockResolvedValue(true);

    const safe = await request(app).get('/api/v1/health').set('X-Request-Id', 'client-req-12345');
    expect(safe.headers['x-request-id']).toBe('client-req-12345');

    const unsafe = await request(app)
      .get('/api/v1/health')
      .set('X-Request-Id', 'bad id with spaces');
    expect(unsafe.headers['x-request-id']).not.toBe('bad id with spaces');
    expect(unsafe.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });
});
