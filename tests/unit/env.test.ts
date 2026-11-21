import { describe, expect, it } from 'vitest';
import { parseEnv } from '../../src/config/env.js';

const valid = {
  NODE_ENV: 'development',
  DATABASE_URL: 'postgresql://user:pw@localhost:5432/db',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  FRONTEND_ORIGINS: 'http://localhost:3000, https://dashboard.example.com/',
};

describe('parseEnv', () => {
  it('accepts a valid environment and applies defaults', () => {
    const env = parseEnv(valid);

    expect(env.PORT).toBe(4000);
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.TRUST_PROXY).toBe(0);
    expect(env.apiDocsEnabled).toBe(true);
    expect(env.FRONTEND_ORIGINS).toEqual([
      'http://localhost:3000',
      'https://dashboard.example.com',
    ]);
  });

  it('rejects missing required variables', () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
  });

  it('rejects JWT secrets shorter than 32 characters', () => {
    expect(() => parseEnv({ ...valid, JWT_ACCESS_SECRET: 'too-short' })).toThrow(
      /JWT_ACCESS_SECRET/,
    );
  });

  it('rejects identical access and refresh secrets', () => {
    expect(() => parseEnv({ ...valid, JWT_REFRESH_SECRET: valid.JWT_ACCESS_SECRET })).toThrow(
      /must differ/,
    );
  });

  it('rejects a non-PostgreSQL DATABASE_URL', () => {
    expect(() => parseEnv({ ...valid, DATABASE_URL: 'mysql://localhost/db' })).toThrow(
      /DATABASE_URL/,
    );
  });

  it.each(['*', 'localhost:3000', 'http://localhost:3000/some/path', 'ftp://example.com'])(
    'rejects invalid FRONTEND_ORIGINS entry %s',
    (origin) => {
      expect(() => parseEnv({ ...valid, FRONTEND_ORIGINS: origin })).toThrow(/FRONTEND_ORIGINS/);
    },
  );

  it('rejects placeholder secrets in production', () => {
    expect(() =>
      parseEnv({
        ...valid,
        NODE_ENV: 'production',
        JWT_ACCESS_SECRET: 'change-me-' + 'x'.repeat(30),
      }),
    ).toThrow(/placeholder/);
  });

  it('does not print secret values in error messages', () => {
    try {
      parseEnv({ ...valid, JWT_ACCESS_SECRET: 'short-secret-value' });
      expect.unreachable();
    } catch (error) {
      expect((error as Error).message).not.toContain('short-secret-value');
    }
  });

  it('disables Swagger UI by default in production unless explicitly enabled', () => {
    expect(parseEnv({ ...valid, NODE_ENV: 'production' }).apiDocsEnabled).toBe(false);
    expect(
      parseEnv({ ...valid, NODE_ENV: 'production', API_DOCS_ENABLED: 'true' }).apiDocsEnabled,
    ).toBe(true);
  });
});
