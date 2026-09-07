import { z } from 'zod';
import { EnquiryStatus } from '@prisma/client';

export const createEnquirySchema = z.object({
  sellerId: z.string().uuid('sellerId must be a valid UUID'),
  productId: z.string().uuid('productId must be a valid UUID').optional(),
  requiredQuantity: z.number().int().min(1, 'requiredQuantity must be at least 1'),
  proposedPrice: z.number().min(0).optional(),
  budget: z.number().min(0).optional(),
  deliveryDate: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  message: z.string().min(5, 'Message must be at least 5 characters').max(1000),
});

export const enquiryIdParamSchema = z.object({
  enquiryId: z.string().uuid('enquiryId must be a valid UUID'),
});

export const getEnquiriesQuerySchema = z.object({
  status: z.nativeEnum(EnquiryStatus).optional(),
  page: z.string().optional().transform(val => (val ? Math.max(1, parseInt(val, 10) || 1) : 1)),
  limit: z.string().optional().transform(val => (val ? Math.min(50, Math.max(1, parseInt(val, 10) || 20)) : 20)),
});

export const respondEnquirySchema = z.object({
  action: z.enum(['ACCEPT', 'REJECT', 'COUNTER_OFFER'], {
    errorMap: () => ({ message: "action must be 'ACCEPT', 'REJECT', or 'COUNTER_OFFER'" }),
  }),
  counterOfferPrice: z.number().min(0.01).optional(),
  counterOfferMessage: z.string().max(1000).optional(),
}).refine(
  data => {
    if (data.action === 'COUNTER_OFFER') {
      return data.counterOfferPrice !== undefined && data.counterOfferPrice > 0;
    }
    return true;
  },
  {
    message: 'counterOfferPrice is required and must be greater than 0 when making a counter offer',
    path: ['counterOfferPrice'],
  }
);
