import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { healthResponseSchema } from './health.types.js';

export function registerHealthDocs(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: 'get',
    path: '/api/v1/health',
    tags: ['Health'],
    summary: 'Service health check',
    description:
      'Reports application status, database connectivity, version and the current UTC time. ' +
      'Responds 503 when the database is unreachable.',
    responses: {
      200: {
        description: 'The application and its database are healthy.',
        content: { 'application/json': { schema: healthResponseSchema } },
      },
      503: {
        description: 'The application is running but the database is unreachable.',
        content: { 'application/json': { schema: healthResponseSchema } },
      },
    },
  });
}
