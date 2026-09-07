import { prisma } from '../config/prisma';
import { OrderStatus, NotificationType } from '@prisma/client';
import { createNotification } from './notification.service';

export class ReviewError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'ReviewError';
    this.statusCode = statusCode;
  }
}

export interface CreateReviewInput {
  buyerUserId: string;
  productId: string;
  rating: number;
  reviewText?: string;
  orderId?: string;
}

export const createVerifiedReview = async (input: CreateReviewInput) => {
  const buyer = await prisma.buyer.findUnique({
    where: { userId: input.buyerUserId },
  });

  if (!buyer) {
    throw new ReviewError('Buyer profile not found', 404);
  }

  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    include: {
      seller: true,
    },
  });

  if (!product) {
    throw new ReviewError('Product not found', 404);
  }

  // Find eligible delivered order
  let eligibleOrder: any = null;

  if (input.orderId) {
    eligibleOrder = await prisma.order.findFirst({
      where: {
        id: input.orderId,
        buyerId: buyer.id,
        orderStatus: OrderStatus.DELIVERED,
        items: {
          some: { productId: input.productId },
        },
      },
    });

    if (!eligibleOrder) {
      throw new ReviewError(
        'The specified order does not qualify for review. The order must be DELIVERED and contain this product.',
        403
      );
    }
  } else {
    // Find any delivered order containing this product
    const deliveredOrders = await prisma.order.findMany({
      where: {
        buyerId: buyer.id,
        orderStatus: OrderStatus.DELIVERED,
        items: {
          some: { productId: input.productId },
        },
      },
      include: {
        reviews: {
          where: { productId: input.productId },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (deliveredOrders.length === 0) {
      throw new ReviewError(
        'Only verified buyers with a delivered order can review this product.',
        403
      );
    }

    // Find the first delivered order that hasn't been reviewed yet
    eligibleOrder = deliveredOrders.find((o) => o.reviews.length === 0);
    if (!eligibleOrder) {
      throw new ReviewError(
        'You have already reviewed this product for all your delivered purchases.',
        400
      );
    }
  }

  // Check if review already exists for this specific order
  const existingReview = await prisma.review.findUnique({
    where: {
      buyerId_productId_orderId: {
        buyerId: buyer.id,
        productId: input.productId,
        orderId: eligibleOrder.id,
      },
    },
  });

  if (existingReview) {
    throw new ReviewError('You have already reviewed this product for this order.', 400);
  }

  // Execute review creation and rating recalculation in transaction
  const review = await prisma.$transaction(async (tx) => {
    const newReview = await tx.review.create({
      data: {
        buyerId: buyer.id,
        productId: input.productId,
        orderId: eligibleOrder.id,
        rating: input.rating,
        reviewText: input.reviewText || null,
      },
      include: {
        buyer: {
          select: {
            id: true,
            companyName: true,
            user: { select: { name: true } },
          },
        },
      },
    });

    // Recalculate Product rating & review count
    const agg = await tx.review.aggregate({
      where: { productId: input.productId },
      _avg: { rating: true },
      _count: { _all: true },
    });

    const newRating = agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : 0;
    const newCount = agg._count._all;

    await tx.product.update({
      where: { id: input.productId },
      data: {
        rating: newRating,
        reviewCount: newCount,
      },
    });

    // Recalculate Artisan rating across all their products
    const artisanProducts = await tx.product.findMany({
      where: { sellerId: product.sellerId },
      select: { id: true },
    });

    const artisanAgg = await tx.review.aggregate({
      where: {
        productId: { in: artisanProducts.map((p) => p.id) },
      },
      _avg: { rating: true },
    });

    if (artisanAgg._avg.rating !== null) {
      await tx.artisan.update({
        where: { id: product.sellerId },
        data: {
          rating: Math.round(artisanAgg._avg.rating * 10) / 10,
        },
      });
    }

    return newReview;
  });

  // Notify artisan
  if (product.seller?.userId) {
    try {
      await createNotification(
        product.seller.userId,
        'New Product Review',
        `A customer left a ${input.rating}-star review on "${product.name}".`,
        NotificationType.REVIEW,
        review.id
      );
    } catch (err) {
      console.error('Failed to notify artisan of review:', err);
    }
  }

  return review;
};
