import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../db/prisma.js';
import { config } from '../config/env.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { loginSchema, changePasswordSchema } from '../validators/auth.validator.js';
import { cookieOptions, clearCookieOptions } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

/**
 * POST /api/auth/login
 * Authenticates admin/staff credentials and issues an HttpOnly JWT cookie.
 */
export async function login(req, res, next) {
  try {
    // 1. Validate payload
    const validationResult = loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      const issues = validationResult.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      return sendError(res, 'Please check your login credentials.', 'VALIDATION_ERROR', 422, issues);
    }

    const { email, password } = validationResult.data;

    // 2. Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      // Use generic message to prevent email enumeration
      await bcrypt.hash('dummy-timing-equalization', 10);
      return sendError(res, 'Invalid email or password.', 'INVALID_CREDENTIALS', 401);
    }

    // 3. Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      logger.warn(`Failed login attempt for: ${email} from IP: ${req.ip}`);

      // Audit failed login
      await prisma.auditLog.create({
        data: {
          action: 'LOGIN_FAILED',
          resourceType: 'USER',
          resourceId: user.id,
          metadata: JSON.stringify({ email }),
          ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
        },
      });

      return sendError(res, 'Invalid email or password.', 'INVALID_CREDENTIALS', 401);
    }

    // 4. Issue JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    // 5. Set HttpOnly cookie
    res.cookie('token', token, cookieOptions());

    // 6. Update last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 7. Audit successful login
    await prisma.auditLog.create({
      data: {
        action: 'LOGIN_SUCCESS',
        resourceType: 'USER',
        resourceId: user.id,
        userId: user.id,
        metadata: JSON.stringify({ email: user.email }),
        ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
      },
    });

    logger.info(`User ${user.email} logged in successfully.`);

    return sendSuccess(res, {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/logout
 * Clears the HttpOnly JWT cookie.
 */
export async function logout(req, res, next) {
  try {
    let userId = req.user?.id;
    let userEmail = req.user?.email;

    // If req.user wasn't set by middleware, check the cookie
    if (!userId && req.cookies?.token) {
      try {
        const decoded = jwt.verify(req.cookies.token, config.jwtSecret);
        if (decoded?.userId) {
          userId = decoded.userId;
          userEmail = decoded.email;
        }
      } catch (err) {
        // Token was invalid or expired, continue to clear cookie
      }
    }

    if (userId) {
      await prisma.auditLog.create({
        data: {
          action: 'LOGOUT',
          resourceType: 'USER',
          resourceId: userId,
          userId: userId,
          ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
        },
      });
      if (userEmail) {
        logger.info(`User ${userEmail} logged out.`);
      }
    }

    res.clearCookie('token', clearCookieOptions());
    return sendSuccess(res, { message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile (requires valid cookie).
 */
export async function getMe(req, res, next) {
  try {
    // req.user is set by requireAuth middleware
    return sendSuccess(res, {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/change-password
 * Allows authenticated users to change their own password.
 */
export async function changePassword(req, res, next) {
  try {
    const validationResult = changePasswordSchema.safeParse(req.body);
    if (!validationResult.success) {
      const issues = validationResult.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      return sendError(res, 'Please check the password requirements.', 'VALIDATION_ERROR', 422, issues);
    }

    const { currentPassword, newPassword } = validationResult.data;

    // Fetch full user with password hash
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return sendError(res, 'User not found.', 'USER_NOT_FOUND', 404);
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return sendError(res, 'Current password is incorrect.', 'INVALID_CURRENT_PASSWORD', 401);
    }

    // Hash new password and update
    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    // Audit password change
    await prisma.auditLog.create({
      data: {
        action: 'PASSWORD_CHANGED',
        resourceType: 'USER',
        resourceId: user.id,
        userId: user.id,
        ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
      },
    });

    logger.info(`User ${user.email} changed their password.`);

    return sendSuccess(res, { message: 'Password changed successfully.' });
  } catch (error) {
    next(error);
  }
}
