import { PaymentStatus } from '@prisma/client';

export interface ProcessPaymentInput {
  orderId: string;
  amount: number;
  paymentMethod: 'COD' | 'MOCK_ONLINE';
  metadata?: Record<string, any>;
}

export interface ProcessPaymentResult {
  success: boolean;
  transactionId: string;
  paymentStatus: PaymentStatus;
  message?: string;
}

export interface RefundPaymentInput {
  paymentId: string;
  amount: number;
  reason?: string;
}

export interface RefundPaymentResult {
  success: boolean;
  refundTransactionId: string;
  message?: string;
}

export interface PaymentProvider {
  processPayment(input: ProcessPaymentInput): Promise<ProcessPaymentResult>;
  refundPayment(input: RefundPaymentInput): Promise<RefundPaymentResult>;
}
