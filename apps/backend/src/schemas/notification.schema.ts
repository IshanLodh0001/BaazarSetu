import { z } from 'zod';

export const getNotificationsQuerySchema = z.object({
  isRead: z.enum(['true', 'false']).optional().transform(val => val !== undefined ? val === 'true' : undefined),
  page: z.string().optional().transform(val => (val ? Math.max(1, parseInt(val, 10) || 1) : 1)),
  limit: z.string().optional().transform(val => (val ? Math.min(50, Math.max(1, parseInt(val, 10) || 20)) : 20)),
});

export const notificationIdParamSchema = z.object({
  id: z.string().uuid(),
});
