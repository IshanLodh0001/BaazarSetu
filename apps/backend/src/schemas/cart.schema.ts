import { z } from 'zod';

export const addToCartSchema = z.object({
  body: z.object({
    productId: z.string().uuid('Invalid Product ID'),
    quantity: z.number().int('Quantity must be an integer').min(1, 'Quantity must be at least 1'),
  })
});

export const updateCartItemSchema = z.object({
  params: z.object({
    productId: z.string().uuid('Invalid Product ID'),
  }),
  body: z.object({
    quantity: z.number().int('Quantity must be an integer').min(1, 'Quantity must be at least 1'),
  })
});

export const cartItemParamSchema = z.object({
  params: z.object({
    productId: z.string().uuid('Invalid Product ID'),
  })
});
