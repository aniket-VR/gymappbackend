import type { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { buildOpenApiDocument } from './openapi.js';

/** Serves Swagger UI at /api-docs and the raw OpenAPI JSON at /api-docs.json. */
export function mountApiDocs(app: Express): void {
  const document = buildOpenApiDocument();

  app.get('/api-docs.json', (_req, res) => {
    res.json(document);
  });
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(document, { customSiteTitle: 'GymConnect API' }),
  );
}
