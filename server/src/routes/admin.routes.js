import { Router } from 'express';
import {
  getMetrics,
  getProjects,
  getProjectById,
  updateProject,
  getMessages,
  updateMessage,
  getAuditLogs,
} from '../controllers/admin.controller.js';
import { downloadProjectFile } from '../controllers/file.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// Protect all admin endpoints: must have valid session cookie and role ADMIN or STAFF
router.use(requireAuth);
router.use(requireRole('ADMIN', 'STAFF'));

// Metrics
router.get('/metrics', getMetrics);

// Projects
router.get('/projects', getProjects);
router.get('/projects/:id', getProjectById);
router.patch('/projects/:id', updateProject);
router.get('/projects/:id/files/:fileId', downloadProjectFile);

// Contact Inquiries
router.get('/messages', getMessages);
router.patch('/messages/:id', updateMessage);

// Audit Logs
router.get('/audit-logs', getAuditLogs);

export default router;
