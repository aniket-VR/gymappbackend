import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';

describe('security headers and CORS', () => {
  const app = createApp();

  it('sets Helmet headers and hides the Express fingerprint', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['strict-transport-security']).toBeDefined();
  });

  it('allows an origin listed in FRONTEND_ORIGINS', async () => {
    const res = await request(app).get('/api/v1/health').set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('does not send CORS headers to an unlisted origin', async () => {
    const res = await request(app).get('/api/v1/health').set('Origin', 'https://evil.example.com');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('answers preflight requests from an allowed origin', async () => {
    const res = await request(app)
      .options('/api/v1/health')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'GET');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });
});

describe('Swagger / OpenAPI', () => {
  const app = createApp();

  it('serves Swagger UI at /api-docs', async () => {
    const res = await request(app).get('/api-docs/').redirects(1);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('swagger-ui');
  });

  it('serves an OpenAPI 3.1 document that describes the health endpoint', async () => {
    const res = await request(app).get('/api-docs.json');
    const doc = res.body as {
      openapi: string;
      paths: Record<string, { get: { responses: Record<string, unknown> } }>;
      components: { schemas: Record<string, unknown> };
    };

    expect(res.status).toBe(200);
    expect(doc.openapi).toBe('3.1.0');
    expect(Object.keys(doc.paths['/api/v1/health']?.get.responses ?? {})).toEqual(['200', '503']);
    expect(doc.components.schemas).toHaveProperty('ErrorResponse');
  });
});
