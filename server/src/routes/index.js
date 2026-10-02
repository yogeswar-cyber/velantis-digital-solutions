import { Router } from 'express';
import healthRoutes from './health.routes.js';
import serviceRoutes from './service.routes.js';
import projectRoutes from './project.routes.js';
import contactRoutes from './contact.routes.js';
import authRoutes from './auth.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/services', serviceRoutes);
router.use('/projects', projectRoutes);
router.use('/contact', contactRoutes);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);

export default router;
