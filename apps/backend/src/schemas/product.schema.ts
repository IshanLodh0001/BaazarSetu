import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    productName: z.string().min(1, 'Product name is required').max(255),
    category: z.string().optional(),
    subCategory: z.string().optional(),
    description: z.string().optional(),
    material: z.string().optional(),
    colour: z.string().optional(),
    craftType: z.string().optional(),
    tags: z.array(z.string()).optional().default([]),
    stock: z.number().int().min(0, 'Stock cannot be negative').default(0),
    price: z.number().min(0, 'Price cannot be negative').default(0),
  }),
});

export const updateProductSchema = z.object({
  body: z.object({
    productName: z.string().min(1).max(255).optional(),
    category: z.string().optional(),
    subCategory: z.string().optional(),
    description: z.string().optional(),
    material: z.string().optional(),
    colour: z.string().optional(),
    craftType: z.string().optional(),
    tags: z.array(z.string()).optional(),
    price: z.number().min(0).optional(),
  }),
});

export const updateStockSchema = z.object({
  body: z.object({
    stock: z.number().int().min(0, 'Stock cannot be negative'),
  }),
});

export const productIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid product ID'),
  }),
});

export const imageIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid product ID'),
    imageId: z.string().uuid('Invalid image ID'),
  }),
});

export type CreateProductInput = z.infer<typeof createProductSchema>['body'];
export type UpdateProductInput = z.infer<typeof updateProductSchema>['body'];
export type UpdateStockInput = z.infer<typeof updateStockSchema>['body'];
