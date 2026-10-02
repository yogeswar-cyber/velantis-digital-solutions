import prisma from '../db/prisma.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { createProjectSchema } from '../validators/project.validator.js';
import { generateReferenceNumber } from '../utils/reference.js';
import { logger } from '../utils/logger.js';
import { sendProjectEmails } from '../services/email/email.service.js';

/**
 * POST /api/projects
 * Transactionally creates a new client project request with structured features and audit trail.
 */
export async function createProject(req, res, next) {
  try {
    // 1. Validate payload against Zod schema
    const validationResult = createProjectSchema.safeParse(req.body);
    if (!validationResult.success) {
      const issues = validationResult.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      return sendError(res, 'Please correct the highlighted form errors.', 'VALIDATION_ERROR', 422, issues);
    }

    const {
      clientName,
      clientEmail,
      clientPhone,
      companyName,
      serviceId,
      budgetRange,
      timeline,
      description,
      selectedFeatureIds = [],
      customRequirements,
    } = validationResult.data;

    // 2. Resolve Service by ID or Slug
    const service = await prisma.service.findFirst({
      where: {
        OR: [{ id: serviceId }, { slug: serviceId }],
        active: true,
      },
    });

    if (!service) {
      return sendError(res, 'Selected service is not recognized or is inactive.', 'INVALID_SERVICE', 400);
    }

    // 3. Execute atomic transaction
    const newProject = await prisma.$transaction(async (tx) => {
      // Authoritative reference number (VL-YYYY-XXXX)
      const referenceNumber = await generateReferenceNumber(tx);

      // Create Project
      const project = await tx.project.create({
        data: {
          referenceNumber,
          clientName: clientName.trim(),
          clientEmail: clientEmail.trim().toLowerCase(),
          clientPhone: clientPhone?.trim() || null,
          companyName: companyName?.trim() || null,
          serviceId: service.id,
          budgetRange: budgetRange || null,
          timeline: timeline || null,
          description: description.trim(),
          status: 'NEW',
        },
      });

      // Attach selected structured features
      if (selectedFeatureIds.length > 0) {
        // Verify features belong to the active service
        const validFeatures = await tx.feature.findMany({
          where: {
            id: { in: selectedFeatureIds },
            serviceId: service.id,
            active: true,
          },
          select: { id: true },
        });

        if (validFeatures.length > 0) {
          await tx.projectFeature.createMany({
            data: validFeatures.map((f) => ({
              projectId: project.id,
              featureId: f.id,
            })),
          });
        }
      }

      // Attach custom natural-language requirements if provided
      if (customRequirements && customRequirements.trim()) {
        await tx.projectFeature.create({
          data: {
            projectId: project.id,
            customFeatureName: customRequirements.trim(),
          },
        });
      }

      // Record initial status history
      await tx.projectStatusHistory.create({
        data: {
          projectId: project.id,
          oldStatus: 'NONE',
          newStatus: 'NEW',
          notes: 'Project request submitted via client booking form.',
        },
      });

      // Record system audit log
      await tx.auditLog.create({
        data: {
          action: 'PROJECT_CREATED',
          resourceType: 'PROJECT',
          resourceId: project.id,
          metadata: JSON.stringify({
            referenceNumber,
            clientEmail: project.clientEmail,
            service: service.name,
            featureCount: selectedFeatureIds.length,
          }),
          ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
        },
      });

      return project;
    });

    logger.info(`New project created: ${newProject.referenceNumber} for ${newProject.clientEmail}`);

    // Asynchronously dispatch client confirmation and team notification emails (non-blocking)
    sendProjectEmails({
      project: newProject,
      serviceName: service.name,
    });

    // 4. Return safe confirmation response
    return sendSuccess(
      res,
      {
        id: newProject.id,
        referenceNumber: newProject.referenceNumber,
        clientName: newProject.clientName,
        clientEmail: newProject.clientEmail,
        service: {
          id: service.id,
          name: service.name,
          slug: service.slug,
        },
        status: newProject.status,
        createdAt: newProject.createdAt,
      },
      201
    );
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/projects/:reference
 * Retrieve public confirmation details for a submitted project by reference number.
 * Note: Never exposes internal staff notes.
 */
export async function getProjectByReference(req, res, next) {
  try {
    const { reference } = req.params;

    const project = await prisma.project.findUnique({
      where: { referenceNumber: reference.toUpperCase().trim() },
      select: {
        referenceNumber: true,
        clientName: true,
        clientEmail: true,
        companyName: true,
        budgetRange: true,
        timeline: true,
        description: true,
        status: true,
        createdAt: true,
        service: {
          select: {
            name: true,
            slug: true,
            icon: true,
          },
        },
        features: {
          select: {
            customFeatureName: true,
            feature: {
              select: {
                name: true,
                category: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      return sendError(res, `Project reference '${reference}' was not found.`, 'PROJECT_NOT_FOUND', 404);
    }

    return sendSuccess(res, project);
  } catch (error) {
    next(error);
  }
}
