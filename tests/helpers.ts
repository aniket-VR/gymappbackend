import express, { type Express, type RequestHandler } from 'express';
import { errorHandler } from '../src/middlewares/errorHandler.js';
import { requestLogger } from '../src/middlewares/requestLogger.js';

/**
 * Builds a tiny Express app with the real request-id/logging and error-handling middleware,
 * plus whatever routes a test registers. Lets tests exercise middleware in isolation.
 */
export function createTestApp(
  register: (app: Express) => void,
  ...before: RequestHandler[]
): Express {
  const app = express();
  app.use(requestLogger);
  for (const middleware of before) app.use(middleware);
  app.use(express.json({ limit: '1kb' }));
  register(app);
  app.use(errorHandler);
  return app;
}
