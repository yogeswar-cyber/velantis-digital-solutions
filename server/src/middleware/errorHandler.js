import { logger } from '../utils/logger.js';
import { sendError } from '../utils/apiResponse.js';

export function notFoundHandler(req, res, next) {
  return sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, 'NOT_FOUND', 404);
}

export function errorHandler(err, req, res, next) {
  // Log technical error details on the server
  logger.error(`Unhandled error: ${err.message}`, {
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  const statusCode = err.statusCode || (err.status && typeof err.status === 'number' ? err.status : 500);
  const code = err.code || 'INTERNAL_SERVER_ERROR';

  // Do not leak stack traces or internal implementation details in production
  const userMessage = statusCode === 500 && process.env.NODE_ENV === 'production'
    ? 'Unable to process your request.'
    : err.message || 'Unable to process your request.';

  const details = process.env.NODE_ENV !== 'production' ? { stack: err.stack } : null;

  return sendError(res, userMessage, code, statusCode, details);
}
