import prisma from '../db/prisma.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

/**
 * GET /api/services
 * Retrieve all active services with their associated features.
 */
export async function getServices(req, res, next) {
  try {
    const services = await prisma.service.findMany({
      where: { active: true },
      orderBy: { displayOrder: 'asc' },
      include: {
        features: {
          where: { active: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    return sendSuccess(res, services);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/services/:id
 * Retrieve a single service by ID or slug with its features.
 */
export async function getServiceById(req, res, next) {
  try {
    const { id } = req.params;

    // Search by ID or slug for friendly URLs
    const service = await prisma.service.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        active: true,
      },
      include: {
        features: {
          where: { active: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!service) {
      return sendError(res, `Service '${id}' not found.`, 'SERVICE_NOT_FOUND', 404);
    }

    return sendSuccess(res, service);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/services/:id/features
 * Retrieve all active features for a given service ID or slug.
 */
export async function getServiceFeatures(req, res, next) {
  try {
    const { id } = req.params;

    const service = await prisma.service.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        active: true,
      },
      select: { id: true, name: true, slug: true },
    });

    if (!service) {
      return sendError(res, `Service '${id}' not found.`, 'SERVICE_NOT_FOUND', 404);
    }

    const features = await prisma.feature.findMany({
      where: {
        serviceId: service.id,
        active: true,
      },
      orderBy: { displayOrder: 'asc' },
    });

    return sendSuccess(res, {
      service,
      features,
    });
  } catch (error) {
    next(error);
  }
}
