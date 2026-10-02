import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/env.js';
import { requestLogger } from './middleware/requestLogger.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { sanitizeInputs } from './middleware/sanitizer.js';
import { preventParameterPollution } from './middleware/hpp.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import apiRoutes from './routes/index.js';

const app = express();

// Trust reverse proxy (for accurate IP resolution behind Nginx/Vercel/Cloudflare)
app.set('trust proxy', 1);

// Disable X-Powered-By header to prevent technology fingerprinting
app.disable('x-powered-by');

// Security Headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Managed by client build/hosting
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    frameguard: { action: 'deny' }, // Clickjacking mitigation
    dnsPrefetchControl: { allow: false },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: config.isProduction
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
  })
);

// Explicit CORS configuration (strictly no wildcard in production)
const allowedOrigins = [
  config.clientUrl,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS policy does not allow access from origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie'],
    exposedHeaders: ['Set-Cookie'],
  })
);

// Body parsers with tight 1MB payload limits (prevents JSON body memory exhaustion / DoS)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Input Sanitization (strips XSS script tags and dangerous HTML handlers)
app.use(sanitizeInputs);

// Parameter Pollution Protection (normalizes duplicate query parameters)
app.use(preventParameterPollution());

// Request logging
app.use(requestLogger);

// Rate limiter on /api routes
app.use('/api', generalLimiter);

// API routes
app.use('/api', apiRoutes);

// 404 handler for undefined API routes
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

export default app;
