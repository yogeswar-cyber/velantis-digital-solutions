import nodemailer from 'nodemailer';
import { config } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

let transporter = null;
let isConfigured = false;

/**
 * Initializes and returns the Nodemailer transporter.
 * If SMTP credentials are not configured, uses a mock logger fallback so local development and offline environments work seamlessly.
 */
export function getEmailTransporter() {
  if (transporter) {
    return { transporter, isConfigured };
  }

  const { smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass } = config.email;

  const isPlaceholder =
    !smtpUser ||
    !smtpPass ||
    smtpUser === 'your_smtp_username' ||
    smtpPass === 'your_smtp_password';

  if (!isPlaceholder && smtpHost) {
    try {
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
      isConfigured = true;
      logger.info(`SMTP Transporter initialized (${smtpHost}:${smtpPort})`);
    } catch (err) {
      logger.warn(`Failed to initialize SMTP transporter: ${err.message}. Using fallback logger transport.`);
      transporter = createMockTransporter();
      isConfigured = false;
    }
  } else {
    logger.info('SMTP credentials not configured. Using development fallback email logger.');
    transporter = createMockTransporter();
    isConfigured = false;
  }

  return { transporter, isConfigured };
}

/**
 * Creates a mock transporter that records email dispatches to logs without attempting network transmission.
 */
function createMockTransporter() {
  return {
    sendMail: async (mailOptions) => {
      logger.info(
        `[MOCK EMAIL DISPATCH] To: ${mailOptions.to} | Subject: "${mailOptions.subject}" | From: ${mailOptions.from}`
      );
      return {
        messageId: `mock-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        response: '250 Mock email logged successfully',
      };
    },
    verify: async () => true,
  };
}
