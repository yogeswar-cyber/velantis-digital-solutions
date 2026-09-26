import { z } from 'zod';

const VALID_SUBJECTS = [
  'General Inquiry',
  'Website Development',
  'AI & Automation',
  'Cybersecurity',
  'Design Services',
  'Other',
];

export const createContactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters'),
  email: z.string().email('Please provide a valid email address'),
  subject: z.string().min(2, 'Subject must be at least 2 characters').max(150, 'Subject cannot exceed 150 characters'),
  projectType: z.string().max(100, 'Project type cannot exceed 100 characters').optional().or(z.literal('')),
  message: z.string().min(10, 'Message must be at least 10 characters').max(3000, 'Message cannot exceed 3000 characters'),
  // Honeypot field: invisible to human users, filled by automated spam scrapers
  hp_website: z.string().optional().or(z.literal('')),
});

export { VALID_SUBJECTS };
