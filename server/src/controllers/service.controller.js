import prisma from '../db/prisma.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { KNOWN_SERVICES } from '../config/knownServices.js';

/**
 * Build a static fallback services list from KNOWN_SERVICES registry.
 * Used when the DB is unavailable or returns no records.
 */
function buildFallbackServices() {
  return KNOWN_SERVICES.map((svc, idx) => ({
    id: `static-${svc.slug}`,
    name: svc.name,
    slug: svc.slug,
    description: svc.description,
    icon: svc.icon,
    division: svc.division || 'VELANTIS',
    recommendedPrice: svc.recommendedPrice || null,
    displayOrder: svc.displayOrder ?? idx + 1,
    active: true,
    features: (svc.features || []).map((f, fIdx) => ({
      id: `static-${svc.slug}-feat-${fIdx}`,
      name: f.name,
      category: f.category || 'General',
      description: f.description || '',
      active: true,
      displayOrder: fIdx + 1,
    })),
  }));
}

/**
 * GET /api/services
 * Retrieve all active services with their associated features.
 * Falls back to KNOWN_SERVICES static registry if DB is unavailable.
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

    if (services && services.length > 0) {
      return sendSuccess(res, services);
    }

    // DB returned empty — serve static known services
    return sendSuccess(res, buildFallbackServices());
  } catch (error) {
    // DB error — serve static fallback rather than 500
    console.warn('[service.controller] DB unavailable, serving static fallback:', error.message);
    return sendSuccess(res, buildFallbackServices());
  }
}

/**
 * GET /api/services/:id
 * Retrieve a single service by ID or slug with its features.
 * Falls back to KNOWN_SERVICES static registry if DB is unavailable.
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

    if (service) {
      return sendSuccess(res, service);
    }

    // Try static fallback
    const fallback = buildFallbackServices().find(
      (s) => s.id === id || s.slug === id || s.name === id
    );
    if (fallback) {
      return sendSuccess(res, fallback);
    }

    return sendError(res, `Service '${id}' not found.`, 'SERVICE_NOT_FOUND', 404);
  } catch (error) {
    console.warn('[service.controller] DB error on getServiceById, trying fallback:', error.message);
    const fallback = buildFallbackServices().find(
      (s) => s.id === req.params.id || s.slug === req.params.id
    );
    if (fallback) return sendSuccess(res, fallback);
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

    if (service) {
      const features = await prisma.feature.findMany({
        where: { serviceId: service.id, active: true },
        orderBy: { displayOrder: 'asc' },
      });
      return sendSuccess(res, { service, features });
    }

    // Fallback to static registry
    const fallback = buildFallbackServices().find(
      (s) => s.id === id || s.slug === id
    );
    if (fallback) {
      return sendSuccess(res, { service: fallback, features: fallback.features });
    }

    return sendError(res, `Service '${id}' not found.`, 'SERVICE_NOT_FOUND', 404);
  } catch (error) {
    next(error);
  }
}
