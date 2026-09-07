import { PaymentStatus } from '@prisma/client';
import { PaymentProvider, ProcessPaymentInput, ProcessPaymentResult, RefundPaymentInput, RefundPaymentResult } from './payment.types';

export class MockPaymentProvider implements PaymentProvider {
  async processPayment(input: ProcessPaymentInput): Promise<ProcessPaymentResult> {
    const timestamp = Date.now();
    
    if (input.paymentMethod === 'COD') {
      return {
        success: true,
        transactionId: `COD-${input.orderId.slice(0, 8)}-${timestamp}`,
        paymentStatus: PaymentStatus.PENDING,
        message: 'Cash on delivery order initialized. Payment pending delivery.'
      };
    }

    if (input.paymentMethod === 'MOCK_ONLINE') {
      return {
        success: true,
        transactionId: `TXN-ONLINE-${input.orderId.slice(0, 8)}-${timestamp}`,
        paymentStatus: PaymentStatus.COMPLETED,
        message: 'Mock online payment completed successfully.'
      };
    }

    throw new Error(`Unsupported payment method: ${input.paymentMethod}`);
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentResult> {
    return {
      success: true,
      refundTransactionId: `REFUND-${input.paymentId.slice(0, 8)}-${Date.now()}`,
      message: 'Mock payment refunded successfully.'
    };
  }
}

export const defaultPaymentProvider = new MockPaymentProvider();
