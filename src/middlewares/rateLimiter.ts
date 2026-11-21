import { rateLimit, type Options } from 'express-rate-limit';
import { env } from '../config/env.js';
import { TooManyRequestsError } from '../utils/errors.js';

/**
 * Creates a rate limiter that answers with the standard GymConnect error format.
 * Defaults come from RATE_LIMIT_* env vars; pass overrides for stricter per-route limits
 * (for example login attempts in Phase 2).
 *
 * The default in-memory store is per-process. Before running more than one instance, switch to
 * a Redis-backed store (planned for the hardening phase).
 */
export function createRateLimiter(overrides: Partial<Options> = {}) {
  return rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: env.RATE_LIMIT_MAX,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(new TooManyRequestsError());
    },
    ...overrides,
  });
}
