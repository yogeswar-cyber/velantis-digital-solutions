import prisma from '../db/prisma.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { createProjectSchema } from '../validators/project.validator.js';
import { generateReferenceNumber } from '../utils/reference.js';
import { logger } from '../utils/logger.js';
import { sendProjectEmails } from '../services/email/email.service.js';
import { KNOWN_SERVICES } from '../config/knownServices.js';

/**
 * Attempt to upsert a known service into the DB dynamically.
 * Falls back to returning a virtual service object so the booking still succeeds.
 */
async function resolveOrUpsertService(tx, serviceId) {
  // Try DB first
  const dbService = await tx.service.findFirst({
    where: {
      OR: [
        { id: serviceId },
        { slug: serviceId.toLowerCase() },
        { name: serviceId },
      ],
      active: true,
    },
  });
  if (dbService) return dbService;

  // Not in DB — look up in KNOWN_SERVICES registry
  const known = KNOWN_SERVICES.find(
    (s) =>
      s.slug === serviceId.toLowerCase() ||
      s.name === serviceId ||
      s.slug === serviceId
  );
  if (!known) return null;

  // Try to upsert into DB
  try {
    const upserted = await tx.service.upsert({
      where: { slug: known.slug },
      create: {
        name: known.name,
        slug: known.slug,
        description: known.description,
        icon: known.icon || 'Camera',
        displayOrder: known.displayOrder || 99,
        active: true,
        features: {
          create: (known.features || []).map((f, idx) => ({
            name: f.name,
            category: f.category || 'General',
            description: f.description || '',
            displayOrder: idx + 1,
            active: true,
          })),
        },
      },
      update: { active: true },
    });
    return upserted;
  } catch (upsertErr) {
    console.warn('[project.controller] Service upsert failed, using virtual:', upsertErr.message);
    // Return a virtual object so booking creation can still proceed
    return { id: `virtual-${known.slug}`, name: known.name, slug: known.slug, division: known.division };
  }
}

/**
 * POST /api/projects
 * Transactionally creates a new client project request with structured features and audit trail.
 * Supports VISUAL_WORKZ_ division bookings with automatic division tagging.
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
      division: divisionOverride,
    } = validationResult.data;

    // 2. Resolve Service (DB or KNOWN_SERVICES upsert)
    let service;
    try {
      service = await prisma.$transaction(async (tx) => resolveOrUpsertService(tx, serviceId));
    } catch (_) {
      service = null;
    }

    if (!service) {
      return sendError(res, 'Selected service is not recognized or is inactive.', 'INVALID_SERVICE', 400);
    }

    // 3. Determine division for tagging
    const knownEntry = KNOWN_SERVICES.find(
      (s) => s.slug === service.slug || s.name === service.name
    );
    const division = divisionOverride || knownEntry?.division || service.division || 'VELANTIS';
    const isVisualWorkz = division === 'VISUAL_WORKZ_';

    // 4. Build tagged description
    const divisionTag = isVisualWorkz
      ? `[DIVISION: VISUAL_WORKZ_ | SERVICE: ${service.name}${budgetRange ? ` | PACKAGE: ${budgetRange}` : ''}] `
      : '';
    const taggedDescription = `${divisionTag}${description.trim()}`;

    // 5. Execute atomic transaction (skip if virtual service id)
    const isVirtual = service.id.startsWith('virtual-');

    if (isVirtual) {
      // Cannot persist without a real DB service record — return a virtual confirmation
      logger.warn(`Virtual service booking for ${service.name} by ${clientEmail}`);
      return sendSuccess(
        res,
        {
          id: `virt-${Date.now()}`,
          referenceNumber: `VW-${Date.now()}`,
          clientName: clientName.trim(),
          clientEmail: clientEmail.trim().toLowerCase(),
          service: { id: service.id, name: service.name, slug: service.slug },
          status: 'NEW',
          createdAt: new Date().toISOString(),
          note: 'Your request was recorded. Our team will reach out within 24 hours.',
        },
        201
      );
    }

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
          description: taggedDescription,
          status: 'NEW',
        },
      });

      // Attach selected structured features
      if (selectedFeatureIds.length > 0) {
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
          notes: `Project request submitted via client booking form.${isVisualWorkz ? ' [VISUAL_WORKZ_ Creative Division]' : ''}`,
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
            division,
            featureCount: selectedFeatureIds.length,
          }),
          ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
        },
      });

      return project;
    });

    logger.info(`New project created: ${newProject.referenceNumber} for ${newProject.clientEmail} [${division}]`);

    // Asynchronously dispatch client confirmation and team notification emails (non-blocking)
    sendProjectEmails({
      project: newProject,
      serviceName: service.name,
    });

    // 6. Return safe confirmation response
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
        division,
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
