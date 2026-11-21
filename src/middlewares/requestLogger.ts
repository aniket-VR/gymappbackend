import { randomUUID } from 'node:crypto';
import { pinoHttp } from 'pino-http';
import { logger } from '../config/logger.js';

// Only accept a client-supplied request id when it looks harmless (prevents log injection).
const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{8,64}$/;

/**
 * Assigns every request an id (exposed as `req.id` and the `X-Request-Id` response header) and
 * logs one line per completed request.
 */
export const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const incoming = req.headers['x-request-id'];
    const id =
      typeof incoming === 'string' && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },
  // Log only what is useful for debugging. Headers (which can carry credentials) and query
  // strings (which can carry tokens) are deliberately left out.
  serializers: {
    req: (req: { id: unknown; method: string; url: string; remoteAddress?: string }) => ({
      id: req.id,
      method: req.method,
      path: req.url.split('?')[0],
      remoteAddress: req.remoteAddress,
    }),
    res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
  },
  customLogLevel: (_req, res, error) => {
    if (error || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  // Successful health probes run every few seconds and are not logged. Failed ones (5xx) still are.
  autoLogging: { ignore: (req) => req.url === '/api/v1/health' },
});
