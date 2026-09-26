import { Router } from 'express';
import healthRoutes from './health.routes.js';
import serviceRoutes from './service.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/services', serviceRoutes);

export default router;
