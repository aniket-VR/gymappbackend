import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';

describe('unknown routes', () => {
  const app = createApp();

  it('returns a 404 in the standard error format', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: 'Route GET /api/v1/does-not-exist not found',
        requestId: res.headers['x-request-id'],
      },
    });
  });

  it('returns 404 for unknown methods on known paths and for the root path', async () => {
    const post = await request(app).post('/api/v1/health');
    expect(post.status).toBe(404);
    expect((post.body as { error: { code: string } }).error.code).toBe('ROUTE_NOT_FOUND');

    const root = await request(app).get('/');
    expect(root.status).toBe(404);
  });
});
