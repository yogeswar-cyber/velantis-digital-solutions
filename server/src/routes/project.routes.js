import { Router } from 'express';
import { createProject, getProjectByReference } from '../controllers/project.controller.js';
import { uploadProjectFiles, downloadProjectFile } from '../controllers/file.controller.js';
import { projectFilesUpload } from '../middleware/upload.js';
import { submissionLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// POST /api/projects - create new project request (rate-limited)
router.post('/', submissionLimiter, createProject);

// GET /api/projects/:reference - public lookup by reference number
router.get('/:reference', getProjectByReference);

// POST /api/projects/:id/files - upload reference files to a project
router.post('/:id/files', submissionLimiter, projectFilesUpload, uploadProjectFiles);

// GET /api/projects/:id/files/:fileId - controlled secure download endpoint
router.get('/:id/files/:fileId', downloadProjectFile);

export default router;
