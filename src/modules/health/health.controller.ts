import type { RequestHandler } from 'express';
import type { ApiSuccessResponse } from '../../types/api.js';
import * as healthService from './health.service.js';
import type { HealthData } from './health.types.js';

export const getHealth: RequestHandler = async (_req, res) => {
  const health = await healthService.getHealth();
  const body: ApiSuccessResponse<HealthData> = { data: health };

  // 503 lets load balancers and orchestrators stop routing traffic to an unhealthy instance.
  res.status(health.status === 'ok' ? 200 : 503).json(body);
};
