import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createApp } from '../../src/app.js';
import { createRateLimiter } from '../../src/middlewares/rateLimiter.js';
import { validate } from '../../src/middlewares/validate.js';
import { ConflictError, ForbiddenError } from '../../src/utils/errors.js';
import { createTestApp } from '../helpers.js';

describe('centralized error handling', () => {
  it('maps AppError subclasses to their status code, code and message', async () => {
    const app = createTestApp((a) => {
      a.get('/conflict', () => {
        throw new ConflictError('Email already in use', 'EMAIL_TAKEN');
      });
      a.get('/forbidden', () => {
        throw new ForbiddenError();
      });
    });

    const conflict = await request(app).get('/conflict');
    expect(conflict.status).toBe(409);
    expect(conflict.body).toEqual({
      error: {
        code: 'EMAIL_TAKEN',
        message: 'Email already in use',
        requestId: conflict.headers['x-request-id'],
      },
    });

    const forbidden = await request(app).get('/forbidden');
    expect(forbidden.status).toBe(403);
    expect((forbidden.body as { error: { code: string } }).error.code).toBe('FORBIDDEN');
  });

  it('handles errors thrown from async handlers (Express 5)', async () => {
    const app = createTestApp((a) => {
      a.get('/async', async () => {
        await Promise.resolve();
        throw new ConflictError('async failure');
      });
    });

    const res = await request(app).get('/async');
    expect(res.status).toBe(409);
  });

  it('returns a generic 500 and never leaks internal error messages', async () => {
    const app = createTestApp((a) => {
      a.get('/boom', () => {
        throw new Error('SECRET: connection string postgres://user:pass@db/prod');
      });
    });

    const res = await request(app).get('/boom');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        requestId: res.headers['x-request-id'],
      },
    });
    expect(JSON.stringify(res.body)).not.toContain('SECRET');
  });

  it('returns 400 INVALID_JSON for a malformed JSON body', async () => {
    const res = await request(createApp())
      .post('/api/v1/health')
      .set('Content-Type', 'application/json')
      .send('{"broken": ');

    expect(res.status).toBe(400);
    expect((res.body as { error: { code: string } }).error.code).toBe('INVALID_JSON');
  });

  it('returns 413 PAYLOAD_TOO_LARGE when the body exceeds the limit', async () => {
    const res = await request(createApp())
      .post('/api/v1/health')
      .send({ blob: 'x'.repeat(2 * 1024 * 1024) });

    expect(res.status).toBe(413);
    expect((res.body as { error: { code: string } }).error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});

describe('validate middleware', () => {
  const app = createTestApp((a) => {
    a.post(
      '/items/:id',
      validate({
        params: z.object({ id: z.uuid() }),
        query: z.object({ page: z.coerce.number().int().min(1).default(1) }).strict(),
        body: z.object({ name: z.string().min(2) }).strict(),
      }),
      (req, res) => {
        res.json({ params: req.params, query: req.query, body: req.body as unknown });
      },
    );
  });
  const id = '3f8d9a3c-1c52-4b8e-9d0b-7a9a2b1c5e6f';

  it('passes parsed and coerced values to the handler', async () => {
    const res = await request(app).post(`/items/${id}?page=3`).send({ name: 'Yoga' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ params: { id }, query: { page: 3 }, body: { name: 'Yoga' } });
  });

  it('applies schema defaults', async () => {
    const res = await request(app).post(`/items/${id}`).send({ name: 'Yoga' });
    expect((res.body as { query: unknown }).query).toEqual({ page: 1 });
  });

  it('reports every invalid part with its location and path', async () => {
    const res = await request(app).post('/items/not-a-uuid?page=0').send({ name: 'A' });

    expect(res.status).toBe(400);
    const error = (
      res.body as { error: { code: string; details: { location: string; path: string }[] } }
    ).error;
    expect(error.code).toBe('VALIDATION_ERROR');
    const where = error.details.map((d) => `${d.location}:${d.path}`).sort();
    expect(where).toEqual(['body:name', 'params:id', 'query:page']);
  });

  it('rejects unknown fields on strict schemas (mass-assignment protection)', async () => {
    const res = await request(app)
      .post(`/items/${id}`)
      .send({ name: 'Yoga', gymId: 'some-other-gym', role: 'OWNER' });

    expect(res.status).toBe(400);
    expect((res.body as { error: { code: string } }).error.code).toBe('VALIDATION_ERROR');
  });
});

describe('rate limiting', () => {
  it('returns 429 in the standard error format once the limit is exceeded', async () => {
    const app = createTestApp(
      (a) => {
        a.get('/limited', (_req, res) => {
          res.json({ ok: true });
        });
      },
      createRateLimiter({ limit: 2, windowMs: 60_000 }),
    );

    expect((await request(app).get('/limited')).status).toBe(200);
    expect((await request(app).get('/limited')).status).toBe(200);

    const blocked = await request(app).get('/limited');
    expect(blocked.status).toBe(429);
    expect((blocked.body as { error: { code: string } }).error.code).toBe('TOO_MANY_REQUESTS');
    expect(blocked.headers['ratelimit']).toBeDefined();
  });
});
