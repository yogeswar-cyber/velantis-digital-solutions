import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // Prevent multiple instances of Prisma Client in development during hot-reloads
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });

    global.__prisma.$on('error', (e) => {
      logger.error(`Prisma Error: ${e.message}`);
    });

    global.__prisma.$on('warn', (e) => {
      logger.warn(`Prisma Warning: ${e.message}`);
    });
  }
  prisma = global.__prisma;
}

export default prisma;
