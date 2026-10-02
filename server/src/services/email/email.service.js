import prisma from '../../db/prisma.js';
import { config } from '../../config/env.js';
import { getEmailTransporter } from './transporter.js';
import {
  renderProjectConfirmationClient,
  renderProjectNotificationTeam,
  renderContactConfirmationClient,
  renderContactNotificationTeam,
} from './templates.js';
import { logger } from '../../utils/logger.js';

/**
 * Asynchronously dispatches project creation emails (both to the client and to the engineering team).
 * Guaranteed non-blocking: Never throws or interrupts the HTTP request.
 */
export async function sendProjectEmails({ project, serviceName = 'Digital Solution', featureNames = [] }) {
  // Fire and forget asynchronously
  setImmediate(async () => {
    try {
      const { transporter } = getEmailTransporter();
      const adminUrl = `${config.clientUrl}/admin`;

      // 1. Send confirmation to client
      const clientEmailContent = renderProjectConfirmationClient({
        project,
        serviceName,
        featureNames,
      });

      await transporter.sendMail({
        from: config.email.from,
        to: project.clientEmail,
        subject: clientEmailContent.subject,
        html: clientEmailContent.html,
        text: clientEmailContent.text,
      });

      // 2. Send notification to internal team
      const teamEmailContent = renderProjectNotificationTeam({
        project,
        serviceName,
        featureNames,
        adminUrl,
      });

      await transporter.sendMail({
        from: config.email.from,
        to: config.email.teamNotificationEmail,
        subject: teamEmailContent.subject,
        html: teamEmailContent.html,
        text: teamEmailContent.text,
      });

      // Record audit log entry
      await prisma.auditLog.create({
        data: {
          action: 'EMAIL_SENT',
          resourceType: 'PROJECT',
          resourceId: project.id,
          metadata: JSON.stringify({
            referenceNumber: project.referenceNumber,
            clientEmail: project.clientEmail,
            teamEmail: config.email.teamNotificationEmail,
          }),
        },
      });

      logger.info(`Transactional emails dispatched for project ${project.referenceNumber}`);
    } catch (err) {
      logger.error(`Failed to send project emails for ${project.referenceNumber}: ${err.message}`);
    }
  });
}

/**
 * Asynchronously dispatches contact inquiry emails (both to client and to team).
 * Guaranteed non-blocking: Never throws or interrupts the HTTP request.
 */
export async function sendContactEmails({ contactMessage }) {
  setImmediate(async () => {
    try {
      const { transporter } = getEmailTransporter();
      const adminUrl = `${config.clientUrl}/admin`;

      // 1. Send confirmation to sender
      const clientEmailContent = renderContactConfirmationClient({ contactMessage });
      await transporter.sendMail({
        from: config.email.from,
        to: contactMessage.email,
        subject: clientEmailContent.subject,
        html: clientEmailContent.html,
        text: clientEmailContent.text,
      });

      // 2. Send notification to team
      const teamEmailContent = renderContactNotificationTeam({ contactMessage, adminUrl });
      await transporter.sendMail({
        from: config.email.from,
        to: config.email.teamNotificationEmail,
        subject: teamEmailContent.subject,
        html: teamEmailContent.html,
        text: teamEmailContent.text,
      });

      // Record audit log entry
      await prisma.auditLog.create({
        data: {
          action: 'EMAIL_SENT',
          resourceType: 'MESSAGE',
          resourceId: contactMessage.id,
          metadata: JSON.stringify({
            senderEmail: contactMessage.email,
            subject: contactMessage.subject,
          }),
        },
      });

      logger.info(`Contact notification emails dispatched for inquiry from ${contactMessage.email}`);
    } catch (err) {
      logger.error(`Failed to send contact inquiry emails for ${contactMessage.email}: ${err.message}`);
    }
  });
}
