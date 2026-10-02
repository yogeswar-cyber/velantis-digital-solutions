import jwt from 'jsonwebtoken';
import prisma from '../db/prisma.js';
import { config } from '../config/env.js';
import { sendError } from '../utils/apiResponse.js';

/**
 * Returns consistent cookie options for setting the auth cookie.
 */
export function cookieOptions() {
  return {
    httpOnly: true,                             // JavaScript cannot read this cookie
    secure: config.isProduction,                // HTTPS only in production
    sameSite: config.isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,           // 7 days in milliseconds
    path: '/',
  };
}

/**
 * Returns options for clearing cookies (omits maxAge to satisfy Express 5+ conventions).
 */
export function clearCookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: config.isProduction ? 'strict' : 'lax',
    path: '/',
  };
}

/**
 * Extracts and verifies JWT from the `token` HttpOnly cookie.
 * Attaches `req.user` (id, email, role, name) on success.
 */
export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return sendError(res, 'Authentication required. Please log in.', 'AUTH_REQUIRED', 401);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch (err) {
      // Clear the expired/invalid cookie
      res.clearCookie('token', clearCookieOptions());
      if (err.name === 'TokenExpiredError') {
        return sendError(res, 'Your session has expired. Please log in again.', 'TOKEN_EXPIRED', 401);
      }
      return sendError(res, 'Invalid authentication token.', 'INVALID_TOKEN', 401);
    }

    // Verify user still exists and hasn't been deactivated
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      res.clearCookie('token', clearCookieOptions());
      return sendError(res, 'User account not found.', 'USER_NOT_FOUND', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Factory: Creates middleware that restricts access to specific roles.
 * Usage: requireRole('ADMIN') or requireRole('ADMIN', 'STAFF')
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Authentication required.', 'AUTH_REQUIRED', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        'You do not have permission to access this resource.',
        'FORBIDDEN',
        403
      );
    }

    next();
  };
}
