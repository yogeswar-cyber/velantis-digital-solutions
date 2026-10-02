import { z } from 'zod';
import { VALID_STATUSES } from './project.validator.js';

export const updateProjectAdminSchema = z.object({
  status: z.enum(VALID_STATUSES).optional(),
  internalNotes: z.string().max(10000, 'Internal notes cannot exceed 10000 characters').optional(),
  statusNotes: z.string().max(1000, 'Status change notes cannot exceed 1000 characters').optional(),
});

export const updateMessageStatusSchema = z.object({
  status: z.enum(['NEW', 'READ', 'RESPONDED', 'ARCHIVED']),
});
