import { Router } from 'express';
import { config } from '../config/env.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import prisma from '../db/prisma.js';

const router = Router();

router.get('/', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    // Quick probe to verify database connectivity
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (error) {
    dbStatus = 'error';
  }

  const payload = {
    status: dbStatus === 'connected' ? 'ok' : 'degraded',
    service: 'VELANTIS API',
    version: '1.0.0',
    environment: config.env,
    database: dbStatus,
    timestamp: new Date().toISOString(),
  };

  if (dbStatus === 'connected') {
    return sendSuccess(res, payload);
  } else {
    return res.status(503).json({
      success: false,
      data: payload,
      error: {
        code: 'SERVICE_DEGRADED',
        message: 'Database connectivity probe failed.',
      },
    });
  }
});

export default router;
