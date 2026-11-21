import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { registerHealthDocs } from '../modules/health/health.docs.js';
import { z } from '../utils/zod.js';
import { appInfo } from './app-info.js';

const errorResponseSchema = z
  .object({
    error: z.object({
      code: z.string().openapi({ example: 'VALIDATION_ERROR' }),
      message: z.string().openapi({ example: 'Request validation failed' }),
      details: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .openapi({ description: 'Present on validation errors.' }),
      requestId: z.string().openapi({ example: '4f0c1f0e-6c3a-4a56-9a7b-0d5f6f3d2f11' }),
    }),
  })
  .openapi('ErrorResponse');

/** Builds the OpenAPI document served by Swagger UI. Each module registers its own paths here. */
export function buildOpenApiDocument() {
  const registry = new OpenAPIRegistry();

  registry.register('ErrorResponse', errorResponseSchema);
  registerHealthDocs(registry);

  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'GymConnect API',
      version: appInfo.version,
      description: 'REST API for the GymConnect multi-tenant gym management platform.',
    },
    servers: [{ url: '/' }],
  });
}
