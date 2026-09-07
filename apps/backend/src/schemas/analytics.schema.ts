import { z } from 'zod';

export const analyticsDateRangeSchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/, 'from must be YYYY-MM-DD or ISO 8601 date')
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/, 'to must be YYYY-MM-DD or ISO 8601 date')
    .optional(),
});
