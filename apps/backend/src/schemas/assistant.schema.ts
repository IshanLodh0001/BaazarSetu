import { z } from 'zod';

export const businessAssistantSchema = z.object({
  message: z.string().min(2, 'Message must be at least 2 characters').max(1000),
  language: z.string().min(2).max(10).optional().default('en'),
});
