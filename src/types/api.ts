import type { ErrorDetail } from '../utils/errors.js';

/** Shape of every successful JSON response. */
export interface ApiSuccessResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

/** Shape of every error JSON response. */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: ErrorDetail[];
    requestId: string;
  };
}
