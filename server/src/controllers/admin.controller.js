import prisma from '../db/prisma.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { updateProjectAdminSchema, updateMessageStatusSchema } from '../validators/admin.validator.js';
import { logger } from '../utils/logger.js';

/**
 * GET /api/admin/metrics
 * Returns high-level operational and business statistics for the admin dashboard.
 */
export async function getMetrics(req, res, next) {
  try {
    const [
      totalProjects,
      newProjects,
      inProgressProjects,
      completedProjects,
      statusGroups,
      totalMessages,
      newMessages,
      recentProjects,
      recentMessages,
    ] = await Promise.all([
      prisma.project.count(),
      prisma.project.count({ where: { status: 'NEW' } }),
      prisma.project.count({ where: { status: { in: ['APPROVED', 'IN_PROGRESS'] } } }),
      prisma.project.count({ where: { status: 'COMPLETED' } }),
      prisma.project.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      prisma.contactMessage.count(),
      prisma.contactMessage.count({ where: { status: 'NEW' } }),
      prisma.project.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          referenceNumber: true,
          clientName: true,
          clientEmail: true,
          status: true,
          createdAt: true,
          service: { select: { name: true } },
        },
      }),
      prisma.contactMessage.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          subject: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    const statusCounts = {};
    for (const group of statusGroups) {
      statusCounts[group.status] = group._count.status;
    }

    return sendSuccess(res, {
      totals: {
        projects: totalProjects,
        newProjects,
        inProgressProjects,
        completedProjects,
        totalMessages,
        newMessages,
      },
      statusBreakdown: statusCounts,
      recentProjects,
      recentMessages,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/projects
 * Returns a paginated, searchable list of projects with status filter.
 */
export async function getProjects(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const { status, search } = req.query;

    const where = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { referenceNumber: { contains: term } },
        { clientName: { contains: term } },
        { clientEmail: { contains: term } },
        { companyName: { contains: term } },
      ];
    }

    const [total, projects] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          referenceNumber: true,
          clientName: true,
          clientEmail: true,
          clientPhone: true,
          companyName: true,
          budgetRange: true,
          timeline: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          service: { select: { id: true, name: true, slug: true } },
          _count: {
            select: {
              features: true,
              files: true,
            },
          },
        },
      }),
    ]);

    return sendSuccess(res, {
      projects,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/projects/:id
 * Returns complete project details including internal staff notes, files, and status history.
 */
export async function getProjectById(req, res, next) {
  try {
    const { id } = req.params;

    const project = await prisma.project.findFirst({
      where: {
        OR: [{ id }, { referenceNumber: id.toUpperCase().trim() }],
      },
      include: {
        service: true,
        features: {
          include: {
            feature: true,
          },
        },
        files: {
          orderBy: { createdAt: 'desc' },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          include: {
            changedByUser: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!project) {
      return sendError(res, `Project '${id}' was not found.`, 'PROJECT_NOT_FOUND', 404);
    }

    // Log admin viewed project
    await prisma.auditLog.create({
      data: {
        action: 'PROJECT_VIEWED',
        resourceType: 'PROJECT',
        resourceId: project.id,
        userId: req.user.id,
        ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
      },
    });

    return sendSuccess(res, project);
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/projects/:id
 * Updates project status and/or internal staff notes, recording status history and audit trail.
 */
export async function updateProject(req, res, next) {
  try {
    const { id } = req.params;

    const validationResult = updateProjectAdminSchema.safeParse(req.body);
    if (!validationResult.success) {
      const issues = validationResult.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      return sendError(res, 'Invalid update data.', 'VALIDATION_ERROR', 422, issues);
    }

    const { status, internalNotes, statusNotes } = validationResult.data;

    // Check project exists
    const currentProject = await prisma.project.findUnique({
      where: { id },
    });

    if (!currentProject) {
      return sendError(res, `Project '${id}' was not found.`, 'PROJECT_NOT_FOUND', 404);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updateData = {};

      if (internalNotes !== undefined) {
        updateData.internalNotes = internalNotes;
      }

      const isStatusChange = status && status !== currentProject.status;
      if (isStatusChange) {
        updateData.status = status;

        // Record status history transition
        await tx.projectStatusHistory.create({
          data: {
            projectId: currentProject.id,
            changedByUserId: req.user.id,
            oldStatus: currentProject.status,
            newStatus: status,
            notes: statusNotes?.trim() || `Status updated to ${status} by ${req.user.name}`,
          },
        });

        // Audit status update
        await tx.auditLog.create({
          data: {
            action: 'PROJECT_STATUS_UPDATED',
            resourceType: 'PROJECT',
            resourceId: currentProject.id,
            userId: req.user.id,
            metadata: JSON.stringify({
              referenceNumber: currentProject.referenceNumber,
              oldStatus: currentProject.status,
              newStatus: status,
              notes: statusNotes || null,
            }),
            ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
          },
        });
      }

      if (internalNotes !== undefined && internalNotes !== currentProject.internalNotes) {
        // Audit notes change
        await tx.auditLog.create({
          data: {
            action: 'PROJECT_NOTES_UPDATED',
            resourceType: 'PROJECT',
            resourceId: currentProject.id,
            userId: req.user.id,
            metadata: JSON.stringify({
              referenceNumber: currentProject.referenceNumber,
            }),
            ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
          },
        });
      }

      return tx.project.update({
        where: { id: currentProject.id },
        data: updateData,
        include: {
          service: true,
          statusHistory: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
              changedByUser: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });
    });

    logger.info(`Project ${currentProject.referenceNumber} updated by ${req.user.email} (Status: ${updated.status})`);

    return sendSuccess(res, updated);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/messages
 * Returns a paginated list of contact inquiries with status filtering.
 */
export async function getMessages(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const { status, search } = req.query;

    const where = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { name: { contains: term } },
        { email: { contains: term } },
        { subject: { contains: term } },
      ];
    }

    const [total, messages] = await Promise.all([
      prisma.contactMessage.count({ where }),
      prisma.contactMessage.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return sendSuccess(res, {
      messages,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/messages/:id
 * Updates contact inquiry triage status (NEW, READ, RESPONDED, ARCHIVED).
 */
export async function updateMessage(req, res, next) {
  try {
    const { id } = req.params;

    const validationResult = updateMessageStatusSchema.safeParse(req.body);
    if (!validationResult.success) {
      return sendError(res, 'Invalid message status.', 'VALIDATION_ERROR', 422);
    }

    const { status } = validationResult.data;

    const existingMessage = await prisma.contactMessage.findUnique({
      where: { id },
    });

    if (!existingMessage) {
      return sendError(res, 'Contact message not found.', 'MESSAGE_NOT_FOUND', 404);
    }

    const updated = await prisma.contactMessage.update({
      where: { id },
      data: { status },
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        action: 'MESSAGE_STATUS_UPDATED',
        resourceType: 'MESSAGE',
        resourceId: id,
        userId: req.user.id,
        metadata: JSON.stringify({
          oldStatus: existingMessage.status,
          newStatus: status,
        }),
        ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
      },
    });

    return sendSuccess(res, updated);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/audit-logs
 * Returns chronological security and operational audit trail.
 */
export async function getAuditLogs(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));
    const skip = (page - 1) * limit;

    const { action, resourceType } = req.query;

    const where = {};
    if (action && action !== 'ALL') {
      where.action = action;
    }
    if (resourceType && resourceType !== 'ALL') {
      where.resourceType = resourceType;
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
    ]);

    return sendSuccess(res, {
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}
