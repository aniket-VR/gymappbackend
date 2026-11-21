import type { CorsOptions } from 'cors';
import { env } from './env.js';

const allowedOrigins = new Set(env.FRONTEND_ORIGINS);

// Browser apps (the two React dashboards) must be on the allow-list. Requests without an
// Origin header (the Flutter app, curl, server-to-server) are not browser cross-origin
// requests, so CORS does not apply to them; they are protected by authentication instead.
// A disallowed origin simply receives no CORS headers, and the browser blocks the response.
export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    callback(null, origin === undefined || allowedOrigins.has(origin));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id', 'RateLimit', 'RateLimit-Policy', 'Retry-After'],
  maxAge: 600,
};
