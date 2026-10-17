import { z } from 'zod';

const VALID_STATUSES = ['NEW', 'REVIEWING', 'CONTACTED', 'QUOTED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

const VALID_BUDGET_RANGES = [
  'Under ₹10,000',
  '₹10,000 – ₹25,000',
  '₹25,000 – ₹50,000',
  '₹50,000+',
];

const VALID_TIMELINES = [
  'Less than 1 week',
  '1 – 2 weeks',
  '2 – 4 weeks',
  '1 – 2 months',
  '2+ months',
  'Flexible',
];

export const createProjectSchema = z.object({
  clientName: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  clientEmail: z.email('Invalid email address'),
  clientPhone: z.string().max(20, 'Phone number too long').optional().or(z.literal('')),
  companyName: z.string().max(100, 'Company name too long').optional().or(z.literal('')),
  serviceId: z.string().min(1, 'Service selection is required'),
  budgetRange: z.enum(VALID_BUDGET_RANGES).optional().or(z.literal('')),
  timeline: z.enum(VALID_TIMELINES).optional().or(z.literal('')),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000, 'Description too long'),
  selectedFeatureIds: z.array(z.string()).optional().default([]),
  customRequirements: z.string().max(2000, 'Custom requirements too long').optional().or(z.literal('')),
});

export const updateProjectStatusSchema = z.object({
  status: z.enum(VALID_STATUSES),
  internalNotes: z.string().max(5000, 'Notes too long').optional().or(z.literal('')),
});

export { VALID_STATUSES, VALID_BUDGET_RANGES, VALID_TIMELINES };
