import path from 'path';
import fs from 'fs';
import prisma from '../db/prisma.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { validateMagicBytes } from '../utils/magicBytes.js';
import { UPLOAD_BASE_DIR } from '../middleware/upload.js';
import { logger } from '../utils/logger.js';

/**
 * POST /api/projects/:id/files
 * Attaches uploaded files to an existing project after magic-bytes inspection.
 */
export async function uploadProjectFiles(req, res, next) {
  const files = req.files || [];

  if (files.length === 0) {
    return sendError(res, 'No files were attached for upload.', 'NO_FILES', 400);
  }

  try {
    const { id } = req.params;

    // Verify project exists
    const project = await prisma.project.findFirst({
      where: {
        OR: [{ id }, { referenceNumber: id.toUpperCase().trim() }],
      },
    });

    if (!project) {
      // Clean up orphaned uploaded files
      for (const file of files) {
        fs.unlink(file.path, () => {});
      }
      return sendError(res, `Project '${id}' was not found.`, 'PROJECT_NOT_FOUND', 404);
    }

    const savedFiles = [];

    for (const file of files) {
      const ext = path.extname(file.originalname).toLowerCase();

      // Inspect file magic bytes / signature
      const isValidSignature = await validateMagicBytes(file.path, ext);
      if (!isValidSignature) {
        // Delete suspect file immediately
        fs.unlink(file.path, () => {});
        logger.warn(`Security alert: Magic bytes signature mismatch for file: ${file.originalname}`);
        return sendError(
          res,
          `File '${file.originalname}' contents do not match its declared extension. Upload rejected.`,
          'INVALID_FILE_SIGNATURE',
          422
        );
      }

      // Persist metadata to project_files table
      const fileRecord = await prisma.projectFile.create({
        data: {
          projectId: project.id,
          originalFilename: path.basename(file.originalname).slice(0, 255),
          storedFilename: file.filename,
          mimeType: file.mimetype,
          size: file.size,
          storageKey: file.filename,
        },
      });

      savedFiles.push({
        id: fileRecord.id,
        originalFilename: fileRecord.originalFilename,
        size: fileRecord.size,
        mimeType: fileRecord.mimeType,
        createdAt: fileRecord.createdAt,
      });

      // Audit log entry
      await prisma.auditLog.create({
        data: {
          action: 'FILE_UPLOADED',
          resourceType: 'FILE',
          resourceId: fileRecord.id,
          metadata: JSON.stringify({
            projectId: project.id,
            referenceNumber: project.referenceNumber,
            filename: fileRecord.originalFilename,
            size: fileRecord.size,
          }),
          ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
        },
      });
    }

    logger.info(`Attached ${savedFiles.length} file(s) to project ${project.referenceNumber}`);

    return sendSuccess(
      res,
      {
        projectId: project.id,
        referenceNumber: project.referenceNumber,
        count: savedFiles.length,
        files: savedFiles,
      },
      201
    );
  } catch (error) {
    // Clean up temporary files on exception
    for (const file of files) {
      fs.unlink(file.path, () => {});
    }
    next(error);
  }
}

/**
 * GET /api/projects/:id/files/:fileId
 * Controlled secure download endpoint for attached project files.
 */
export async function downloadProjectFile(req, res, next) {
  try {
    const { id, fileId } = req.params;

    // Verify project and file exist in database
    const fileRecord = await prisma.projectFile.findFirst({
      where: {
        id: fileId,
        project: {
          OR: [{ id }, { referenceNumber: id.toUpperCase().trim() }],
        },
      },
    });

    if (!fileRecord) {
      return sendError(res, 'Requested file was not found.', 'FILE_NOT_FOUND', 404);
    }

    const filePath = path.resolve(UPLOAD_BASE_DIR, fileRecord.storedFilename);

    // Prevent directory traversal attacks
    if (!filePath.startsWith(UPLOAD_BASE_DIR)) {
      return sendError(res, 'Access denied.', 'SECURITY_VIOLATION', 403);
    }

    if (!fs.existsSync(filePath)) {
      return sendError(res, 'File storage object is missing.', 'FILE_STORAGE_MISSING', 404);
    }

    // Set secure download headers
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileRecord.originalFilename)}"`);
    res.setHeader('Content-Type', fileRecord.mimeType || 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Audit log download
    await prisma.auditLog.create({
      data: {
        action: 'FILE_DOWNLOADED',
        resourceType: 'FILE',
        resourceId: fileRecord.id,
        userId: req.user?.id || null,
        metadata: JSON.stringify({
          filename: fileRecord.originalFilename,
        }),
        ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
      },
    });

    // Stream file
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
}
