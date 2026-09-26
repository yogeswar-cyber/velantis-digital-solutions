import { Router } from 'express';
import healthRoutes from './health.routes.js';
import serviceRoutes from './service.routes.js';
import projectRoutes from './project.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/services', serviceRoutes);
router.use('/projects', projectRoutes);

export default router;
