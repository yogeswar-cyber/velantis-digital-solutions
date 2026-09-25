import { Router } from 'express';
import { config } from '../config/env.js';
import { sendSuccess } from '../utils/apiResponse.js';

const router = Router();

router.get('/', (req, res) => {
  return sendSuccess(res, {
    status: 'ok',
    service: 'VELANTIS API',
    version: '1.0.0',
    environment: config.env,
    timestamp: new Date().toISOString(),
  });
});

export default router;
