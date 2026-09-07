import { z } from 'zod';

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  reviewText: z.string().max(1000).optional(),
  orderId: z.string().uuid().optional(),
});

export const productIdParamSchema = z.object({
  productId: z.string().uuid(),
});
