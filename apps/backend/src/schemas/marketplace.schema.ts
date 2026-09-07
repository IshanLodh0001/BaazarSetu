import { z } from 'zod';

export const marketplaceQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)).pipe(z.number().int().min(1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)).pipe(z.number().int().min(1).max(50)),
    search: z.string().optional(),
    category: z.string().optional(),
    subCategory: z.string().optional(),
    craftType: z.string().optional(),
    material: z.string().optional(),
    state: z.string().optional(),
    minPrice: z.string().optional().transform((val) => (val !== undefined ? parseFloat(val) : undefined)).pipe(z.number().min(0).optional()),
    maxPrice: z.string().optional().transform((val) => (val !== undefined ? parseFloat(val) : undefined)).pipe(z.number().min(0).optional()),
    sort: z.enum(['newest', 'price_low_to_high', 'price_high_to_low', 'rating', 'popular']).optional().default('newest'),
    sellerId: z.string().uuid().optional(),
  }).refine((data) => {
    if (data.minPrice !== undefined && data.maxPrice !== undefined) {
      return data.maxPrice >= data.minPrice;
    }
    return true;
  }, {
    message: 'maxPrice must be greater than or equal to minPrice',
    path: ['maxPrice'],
  })
});

export const productIdParamSchema = z.object({
  params: z.object({
    productId: z.string().uuid('Invalid Product ID'),
  })
});

export const artisanIdParamSchema = z.object({
  params: z.object({
    sellerId: z.string().uuid('Invalid Seller ID'),
  })
});

export const artisanProductsQuerySchema = z.object({
  params: z.object({
    sellerId: z.string().uuid('Invalid Seller ID'),
  }),
  query: z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)).pipe(z.number().int().min(1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)).pipe(z.number().int().min(1).max(50)),
  })
});
