import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const INSECURE_DEFAULTS = [
  'dev-session-secret-change-in-production',
  'dev-jwt-secret-change-in-production',
  'changeme_prod_session_secret_64chars_minimum_length_required',
  'changeme_prod_jwt_secret_64chars_minimum_length_required',
];

const isProduction = process.env.NODE_ENV === 'production';

// Fail-fast: refuse to start in production with missing or default secrets
if (isProduction) {
  const sessionSecret = process.env.SESSION_SECRET || '';
  const jwtSecret = process.env.JWT_SECRET || '';

  if (!sessionSecret || INSECURE_DEFAULTS.includes(sessionSecret)) {
    console.error('FATAL: SESSION_SECRET is missing or uses an insecure default. Set a unique 64+ character secret in your production .env file.');
    process.exit(1);
  }
  if (!jwtSecret || INSECURE_DEFAULTS.includes(jwtSecret)) {
    console.error('FATAL: JWT_SECRET is missing or uses an insecure default. Set a unique 64+ character secret in your production .env file.');
    process.exit(1);
  }
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction,
  isTest: process.env.NODE_ENV === 'test',
  port: parseInt(process.env.PORT, 10) || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  sessionSecret: process.env.SESSION_SECRET || 'dev-session-secret-change-in-production',
  jwtSecret: process.env.JWT_SECRET || process.env.SESSION_SECRET || 'dev-jwt-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/velantis_db?schema=public',
  uploads: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10,
  },
  email: {
    smtpHost: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    smtpPort: parseInt(process.env.SMTP_PORT, 10) || 2525,
    smtpSecure: process.env.SMTP_SECURE === 'true',
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || 'VELANTIS Digital Solutions <hello@velantis.in>',
    teamNotificationEmail: process.env.TEAM_NOTIFICATION_EMAIL || 'team@velantis.in',
  },
};
