import { Router } from 'express';
import { createProject, getProjectByReference } from '../controllers/project.controller.js';
import { submissionLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// POST /api/projects - create new project request (rate-limited)
router.post('/', submissionLimiter, createProject);

// GET /api/projects/:reference - public lookup by reference number
router.get('/:reference', getProjectByReference);

export default router;
