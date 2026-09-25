import { logger } from '../utils/logger.js';

export function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs: duration,
      ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    };
    if (res.statusCode >= 500) {
      logger.error(`HTTP ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`, logData);
    } else if (res.statusCode >= 400) {
      logger.warn(`HTTP ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`, logData);
    } else {
      logger.info(`HTTP ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`, logData);
    }
  });
  next();
}
