import { Router } from 'express';
import { healthRouter } from './health/health.routes.js';

/** All business-module routers, mounted under /api/v1 by app.ts. */
export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
