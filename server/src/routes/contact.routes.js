import { Router } from 'express';
import { sendContactMessage } from '../controllers/contact.controller.js';
import { submissionLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// POST /api/contact - submit contact inquiry (rate-limited)
router.post('/', submissionLimiter, sendContactMessage);

export default router;
