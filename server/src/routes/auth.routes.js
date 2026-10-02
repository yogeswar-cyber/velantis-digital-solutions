import { Router } from 'express';
import { login, logout, getMe, changePassword } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// POST /api/auth/login - authenticate and receive HttpOnly JWT cookie (rate-limited)
router.post('/login', authLimiter, login);

// POST /api/auth/logout - clear auth cookie
router.post('/logout', logout);

// GET /api/auth/me - get current user profile (requires authentication)
router.get('/me', requireAuth, getMe);

// POST /api/auth/change-password - change own password (requires authentication)
router.post('/change-password', requireAuth, changePassword);

export default router;
