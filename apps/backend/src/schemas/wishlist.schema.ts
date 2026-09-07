import { z } from 'zod';

export const wishlistParamSchema = z.object({
  params: z.object({
    productId: z.string().uuid('Invalid Product ID'),
  })
});
