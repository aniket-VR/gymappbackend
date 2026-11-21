import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import type { ApiErrorResponse } from '../types/api.js';
import { AppError, type ErrorDetail } from '../utils/errors.js';

interface NormalizedError {
  statusCode: number;
  code: string;
  message: string;
  details?: ErrorDetail[];
}

/** Errors raised by body-parser / express.json() carry a `type` string and an HTTP status. */
function isBodyParserError(error: unknown): error is { type: string; status: number } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    typeof error.type === 'string' &&
    'status' in error &&
    typeof error.status === 'number'
  );
}

function normalize(error: unknown): NormalizedError {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    };
  }

  if (error instanceof ZodError) {
    return {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: error.issues.map((issue) => ({
        path: issue.path.map(String).join('.'),
        message: issue.message,
      })),
    };
  }

  if (isBodyParserError(error)) {
    switch (error.type) {
      case 'entity.parse.failed':
        return { statusCode: 400, code: 'INVALID_JSON', message: 'Request body is not valid JSON' };
      case 'entity.too.large':
        return { statusCode: 413, code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' };
      case 'charset.unsupported':
      case 'encoding.unsupported':
        return { statusCode: 415, code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Unsupported encoding' };
    }
  }

  return { statusCode: 500, code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' };
}

/**
 * Single place where every error becomes an HTTP response. Must be the LAST middleware.
 * Internal details (messages, stack traces) are logged but never sent to clients.
 */
export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const normalized = normalize(error);
  // requestLogger always assigns a string id (see genReqId).
  const requestId = typeof req.id === 'string' ? req.id : 'unknown';

  if (normalized.statusCode >= 500) {
    // `req.log` is provided by requestLogger, which is always mounted first.
    req.log.error({ err: error, requestId }, 'Unhandled error while processing request');
  }

  const body: ApiErrorResponse = {
    error: {
      code: normalized.code,
      message: normalized.message,
      ...(normalized.details ? { details: normalized.details } : {}),
      requestId,
    },
  };

  res.status(normalized.statusCode).json(body);
};
