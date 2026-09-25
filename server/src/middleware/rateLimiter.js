import rateLimit from 'express-rate-limit';
import { sendError } from '../utils/apiResponse.js';

// General API rate limiter (100 requests per 15 minutes per IP)
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return sendError(res, 'Too many requests. Please try again later.', 'RATE_LIMIT_EXCEEDED', 429);
  },
});

// Stricter rate limiter for form submissions (projects, contact - 20 requests per 15 minutes)
export const submissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return sendError(res, 'Submission rate limit reached. Please wait before submitting again.', 'SUBMISSION_RATE_LIMIT', 429);
  },
});

// Stricter limiter for authentication attempts (10 requests per 15 minutes)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return sendError(res, 'Too many login attempts. Please try again after 15 minutes.', 'AUTH_RATE_LIMIT', 429);
  },
});
