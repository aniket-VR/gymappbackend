import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

// Load `.env` into process.env. Variables that are already set (CI, Docker, Vitest) win.
loadDotenv({ quiet: true });

const PLACEHOLDER_MARKER = 'change-me';

const originSchema = z.string().transform((value, ctx) => {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== value.replace(/\/$/, '')) {
      throw new Error('not a bare origin');
    }
    return url.origin;
  } catch {
    ctx.addIssue({
      code: 'custom',
      message: `"${value}" is not a valid origin (expected e.g. https://app.example.com)`,
    });
    return z.NEVER;
  }
});

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    DATABASE_URL: z
      .string()
      .min(1)
      .refine((v) => /^postgres(ql)?:\/\//.test(v), 'must be a PostgreSQL connection string'),
    JWT_ACCESS_SECRET: z.string().min(32, 'must be at least 32 characters'),
    JWT_REFRESH_SECRET: z.string().min(32, 'must be at least 32 characters'),
    FRONTEND_ORIGINS: z
      .string()
      .default('')
      .transform((value) =>
        value
          .split(',')
          .map((origin) => origin.trim())
          .filter((origin) => origin.length > 0),
      )
      .pipe(z.array(originSchema)),
    LOG_LEVEL: z
      .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'])
      .default('info'),
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    RATE_LIMIT_WINDOW_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(15 * 60 * 1000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
    API_DOCS_ENABLED: z.enum(['true', 'false']).optional(),
  })
  .superRefine((env, ctx) => {
    if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_REFRESH_SECRET'],
        message: 'must differ from JWT_ACCESS_SECRET',
      });
    }
    if (env.NODE_ENV === 'production') {
      for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_URL'] as const) {
        if (env[key].includes(PLACEHOLDER_MARKER)) {
          ctx.addIssue({
            code: 'custom',
            path: [key],
            message: `still contains the "${PLACEHOLDER_MARKER}" placeholder from .env.example`,
          });
        }
      }
    }
  })
  .transform((env) => ({
    ...env,
    isProduction: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
    // Swagger UI is on by default, but off in production unless explicitly enabled.
    apiDocsEnabled: env.API_DOCS_ENABLED
      ? env.API_DOCS_ENABLED === 'true'
      : env.NODE_ENV !== 'production',
  }));

export type Env = z.infer<typeof envSchema>;

/** Validates a raw environment object. Throws a readable error when it is invalid. */
export function parseEnv(source: NodeJS.ProcessEnv): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  return result.data;
}

function loadEnv(): Env {
  try {
    return parseEnv(process.env);
  } catch (error) {
    // Fail fast with a clear message. Never print the values themselves (they may be secrets).
    // eslint-disable-next-line no-console
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

export const env: Env = loadEnv();
