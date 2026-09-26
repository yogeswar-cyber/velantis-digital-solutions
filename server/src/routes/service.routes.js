import { Router } from 'express';
import { getServices, getServiceById, getServiceFeatures } from '../controllers/service.controller.js';

const router = Router();

// GET /api/services - list all services
router.get('/', getServices);

// GET /api/services/:id - get service by id or slug
router.get('/:id', getServiceById);

// GET /api/services/:id/features - get features for a specific service
router.get('/:id/features', getServiceFeatures);

export default router;
