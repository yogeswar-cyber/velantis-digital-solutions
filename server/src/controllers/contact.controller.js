import prisma from '../db/prisma.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { createContactSchema } from '../validators/contact.validator.js';
import { logger } from '../utils/logger.js';
import { sendContactEmails } from '../services/email/email.service.js';

/**
 * POST /api/contact
 * Validates, checks honeypot spam protection, and persists inquiries in contact_messages table.
 */
export async function sendContactMessage(req, res, next) {
  try {
    // 1. Validate payload
    const validationResult = createContactSchema.safeParse(req.body);
    if (!validationResult.success) {
      const issues = validationResult.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      return sendError(res, 'Please check your submitted message fields.', 'VALIDATION_ERROR', 422, issues);
    }

    const { name, email, subject, projectType, message, hp_website } = validationResult.data;

    // 2. Honeypot check: If the hidden bot trap field is filled, silently discard or reject
    if (hp_website && hp_website.trim().length > 0) {
      logger.warn(`Spam bot trapped by honeypot field from IP: ${req.ip}`);
      // Return a simulated success response so spam bots do not adapt
      return sendSuccess(res, {
        message: 'Thank you for reaching out. Your message has been received.',
      });
    }

    // 3. Persist contact message in database
    const savedMessage = await prisma.contactMessage.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        subject: subject.trim(),
        projectType: projectType?.trim() || null,
        message: message.trim(),
        status: 'NEW',
        ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
      },
    });

    // 4. Record audit log
    await prisma.auditLog.create({
      data: {
        action: 'CONTACT_MESSAGE_RECEIVED',
        resourceType: 'MESSAGE',
        resourceId: savedMessage.id,
        metadata: JSON.stringify({
          senderEmail: savedMessage.email,
          subject: savedMessage.subject,
        }),
        ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
      },
    });

    logger.info(`New contact message received from ${savedMessage.email} (${savedMessage.subject})`);

    // Asynchronously dispatch confirmation to sender and notification to team (non-blocking)
    sendContactEmails({ contactMessage: savedMessage });

    // 5. Return safe response
    return sendSuccess(
      res,
      {
        id: savedMessage.id,
        name: savedMessage.name,
        email: savedMessage.email,
        subject: savedMessage.subject,
        status: savedMessage.status,
        createdAt: savedMessage.createdAt,
      },
      201
    );
  } catch (error) {
    next(error);
  }
}
