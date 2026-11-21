import { z } from '../../utils/zod.js';

export const healthDataSchema = z
  .object({
    status: z.enum(['ok', 'degraded']).openapi({
      description: '"ok" when every dependency is healthy, "degraded" otherwise.',
      example: 'ok',
    }),
    database: z.enum(['up', 'down']).openapi({
      description: 'Result of a live connectivity check against PostgreSQL.',
      example: 'up',
    }),
    version: z.string().openapi({ description: 'Application version.', example: '0.1.0' }),
    timestamp: z.iso.datetime().openapi({
      description: 'Current server time in UTC (ISO-8601).',
      example: '2026-11-17T05:30:00.000Z',
    }),
  })
  .openapi('HealthData');

export const healthResponseSchema = z.object({ data: healthDataSchema }).openapi('HealthResponse');

export type HealthData = z.infer<typeof healthDataSchema>;
