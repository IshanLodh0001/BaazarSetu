import { z } from 'zod';
import { OrderStatus, PaymentStatus } from '@prisma/client';

export const checkoutSchema = z.object({
  shippingAddress: z.string().min(5, 'Shipping address is required and must be at least 5 characters'),
  paymentMethod: z.enum(['COD', 'MOCK_ONLINE'], {
    errorMap: () => ({ message: "paymentMethod must be 'COD' or 'MOCK_ONLINE'" }),
  }),
  notes: z.string().max(500).optional(),
});

export const getOrdersQuerySchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  page: z.string().optional().transform(val => (val ? Math.max(1, parseInt(val, 10) || 1) : 1)),
  limit: z.string().optional().transform(val => (val ? Math.min(50, Math.max(1, parseInt(val, 10) || 20)) : 20)),
});

export const orderIdParamSchema = z.object({
  orderId: z.string().uuid(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'], {
    errorMap: () => ({ message: "status must be one of 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'" }),
  }),
  trackingNumber: z.string().optional(),
  notes: z.string().optional(),
});

export const cancelOrderSchema = z.object({
  reason: z.string().max(300).optional(),
});
