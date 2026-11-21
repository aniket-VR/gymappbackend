import type { RequestHandler } from 'express';
import { NotFoundError } from '../utils/errors.js';

/** Catch-all for requests that matched no route. Mount after all routers. */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.path} not found`, 'ROUTE_NOT_FOUND'));
};
