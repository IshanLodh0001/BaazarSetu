import { z } from 'zod';

export const pricingCalculationSchema = z.object({
  body: z.object({
    productId: z.string().uuid('Invalid Product ID'),
    rawMaterialCost: z.number().min(0, 'Must be non-negative').default(0),
    labourCost: z.number().min(0, 'Must be non-negative').default(0),
    packagingCost: z.number().min(0, 'Must be non-negative').default(0),
    transportCost: z.number().min(0, 'Must be non-negative').default(0),
    otherCost: z.number().min(0, 'Must be non-negative').default(0),
    quantity: z.number().int().min(1, 'Must be at least 1').default(1),
    desiredProfitMargin: z.number().min(0).max(200, 'Margin too high').default(0)
  })
});

export const applyPriceSchema = z.object({
  params: z.object({
    pricingId: z.string().uuid('Invalid Pricing ID')
  })
});

export const explainPriceSchema = z.object({
  params: z.object({
    pricingId: z.string().uuid('Invalid Pricing ID')
  })
});

export const pricingHistorySchema = z.object({
  params: z.object({
    productId: z.string().uuid('Invalid Product ID')
  })
});
