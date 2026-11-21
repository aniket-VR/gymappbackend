import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { corsOptions } from './config/cors.js';
import { env } from './config/env.js';
import { mountApiDocs } from './config/swagger.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFoundHandler } from './middlewares/notFound.js';
import { createRateLimiter } from './middlewares/rateLimiter.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { apiRouter } from './modules/index.js';

/** Builds the Express app without starting a server, so tests can use it with Supertest. */
export function createApp(): Express {
  const app = express();

  app.set('trust proxy', env.TRUST_PROXY);

  // 1. Request id + logging come first so every later middleware and error carries the id.
  app.use(requestLogger);

  // 2. Security headers. `upgrade-insecure-requests` is dropped outside production because
  //    Safari would otherwise try to load Swagger UI assets over https://localhost.
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: env.isProduction ? {} : { 'upgrade-insecure-requests': null },
      },
    }),
  );

  // 3. CORS (also answers preflight requests).
  app.use(cors(corsOptions));

  // 4. API documentation.
  if (env.apiDocsEnabled) {
    mountApiDocs(app);
  }

  // 5. Rate limit BEFORE parsing bodies, so abusive requests are cheap to reject.
  app.use('/api', createRateLimiter({ skip: (req) => req.path === '/v1/health' }));

  // 6. Body parsing. Strict mode accepts only objects and arrays; the limit caps memory use.
  app.use(express.json({ limit: '1mb' }));

  // 7. Business routes.
  app.use('/api/v1', apiRouter);

  // 8. Unknown routes, then the central error handler (must be last).
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
