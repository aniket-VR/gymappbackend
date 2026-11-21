import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { ValidationError, type ValidationIssue } from '../utils/errors.js';

interface RequestSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

const LOCATIONS = ['params', 'query', 'body'] as const;

/**
 * Validates and parses request parts with Zod. On success the parsed (typed, coerced, stripped)
 * values replace the raw ones, so handlers never see unvalidated input. On failure it forwards a
 * ValidationError listing every problem.
 *
 * Use `.strict()` object schemas so unknown fields (for example a client-sent gymId or role)
 * are rejected instead of silently ignored.
 */
export function validate(schemas: RequestSchemas): RequestHandler {
  return (req, _res, next) => {
    const issues: ValidationIssue[] = [];

    for (const location of LOCATIONS) {
      const schema = schemas[location];
      if (!schema) continue;

      const result = schema.safeParse(req[location]);
      if (!result.success) {
        for (const issue of result.error.issues) {
          issues.push({
            location,
            path: issue.path.map(String).join('.'),
            message: issue.message,
          });
        }
        continue;
      }

      if (location === 'query') {
        // Express 5 exposes `req.query` as a read-only getter, so shadow it on the instance.
        Object.defineProperty(req, 'query', {
          value: result.data,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      } else {
        req[location] = result.data;
      }
    }

    next(issues.length > 0 ? new ValidationError(issues) : undefined);
  };
}
