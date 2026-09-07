import { prisma } from '../config/prisma';
import { EnquiryStatus, NotificationType } from '@prisma/client';
import { createNotification } from './notification.service';

export class B2BError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'B2BError';
    this.statusCode = statusCode;
  }
}

export interface CreateEnquiryInput {
  buyerUserId: string;
  sellerId: string;
  productId?: string;
  requiredQuantity: number;
  proposedPrice?: number;
  budget?: number;
  deliveryDate?: string;
  message: string;
}

export const createEnquiry = async (input: CreateEnquiryInput) => {
  const buyer = await prisma.buyer.findUnique({
    where: { userId: input.buyerUserId },
    include: { user: true },
  });

  if (!buyer) {
    throw new B2BError('Buyer profile not found', 404);
  }

  const artisan = await prisma.artisan.findUnique({
    where: { id: input.sellerId },
    include: { user: true },
  });

  if (!artisan) {
    throw new B2BError('Artisan not found', 404);
  }

  let product = null;
  if (input.productId) {
    product = await prisma.product.findFirst({
      where: { id: input.productId, sellerId: artisan.id },
    });
    if (!product) {
      throw new B2BError('Product not found or does not belong to this artisan', 404);
    }
  }

  const enquiry = await prisma.enquiry.create({
    data: {
      buyerId: buyer.id,
      sellerId: artisan.id,
      productId: input.productId || null,
      requiredQuantity: input.requiredQuantity,
      proposedPrice: input.proposedPrice || null,
      budget: input.budget || null,
      deliveryDate: input.deliveryDate ? new Date(input.deliveryDate) : null,
      message: input.message,
      status: EnquiryStatus.PENDING,
    },
    include: {
      buyer: {
        select: {
          id: true,
          companyName: true,
          buyerType: true,
          user: { select: { name: true, phone: true } },
        },
      },
      seller: {
        select: {
          id: true,
          businessName: true,
          craftType: true,
        },
      },
    },
  });

  // Notify artisan
  try {
    await createNotification(
      artisan.userId,
      'New B2B Bulk Enquiry',
      `New bulk enquiry received for ${input.requiredQuantity} units${
        product ? ` of "${product.name}"` : ''
      } from ${buyer.companyName || buyer.user.name || 'a buyer'}.`,
      NotificationType.ENQUIRY,
      enquiry.id
    );
  } catch (err) {
    console.error('Failed to notify artisan of enquiry:', err);
  }

  return enquiry;
};

export const getBuyerEnquiries = async (
  buyerUserId: string,
  options?: { status?: EnquiryStatus; page?: number; limit?: number }
) => {
  const buyer = await prisma.buyer.findUnique({
    where: { userId: buyerUserId },
  });
  if (!buyer) {
    throw new B2BError('Buyer profile not found', 404);
  }

  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const skip = (page - 1) * limit;

  const where: any = { buyerId: buyer.id };
  if (options?.status) {
    where.status = options.status;
  }

  const [total, enquiries] = await Promise.all([
    prisma.enquiry.count({ where }),
    prisma.enquiry.findMany({
      where,
      include: {
        seller: {
          select: {
            id: true,
            businessName: true,
            craftType: true,
            state: true,
            district: true,
            rating: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
  ]);

  return {
    enquiries,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getBuyerEnquiryDetails = async (buyerUserId: string, enquiryId: string) => {
  const buyer = await prisma.buyer.findUnique({
    where: { userId: buyerUserId },
  });
  if (!buyer) {
    throw new B2BError('Buyer profile not found', 404);
  }

  const enquiry = await prisma.enquiry.findFirst({
    where: { id: enquiryId, buyerId: buyer.id },
    include: {
      seller: {
        select: {
          id: true,
          businessName: true,
          craftType: true,
          state: true,
          district: true,
          rating: true,
          user: { select: { name: true, phone: true } },
        },
      },
    },
  });

  if (!enquiry) {
    throw new B2BError('Enquiry not found', 404);
  }

  return enquiry;
};

export const acceptCounterOffer = async (buyerUserId: string, enquiryId: string) => {
  const buyer = await prisma.buyer.findUnique({
    where: { userId: buyerUserId },
    include: { user: true },
  });
  if (!buyer) {
    throw new B2BError('Buyer profile not found', 404);
  }

  const enquiry = await prisma.enquiry.findFirst({
    where: { id: enquiryId, buyerId: buyer.id },
    include: {
      seller: { select: { userId: true, businessName: true } },
    },
  });

  if (!enquiry) {
    throw new B2BError('Enquiry not found', 404);
  }

  if (enquiry.status !== EnquiryStatus.COUNTER_OFFER) {
    throw new B2BError(
      `Cannot accept counter offer. Enquiry is in ${enquiry.status} status, expected COUNTER_OFFER.`,
      400
    );
  }

  const updated = await prisma.enquiry.update({
    where: { id: enquiryId },
    data: { status: EnquiryStatus.BUYER_ACCEPTED },
  });

  // Notify artisan
  if (enquiry.seller?.userId) {
    try {
      await createNotification(
        enquiry.seller.userId,
        'Counter Offer Accepted',
        `Buyer accepted your counter offer quotation of ₹${enquiry.counterOfferPrice} for enquiry #${enquiry.id.slice(0, 8)}.`,
        NotificationType.ENQUIRY,
        enquiry.id
      );
    } catch (err) {
      console.error('Failed to notify artisan:', err);
    }
  }

  return updated;
};

export const getArtisanEnquiries = async (
  artisanUserId: string,
  options?: { status?: EnquiryStatus; page?: number; limit?: number }
) => {
  const artisan = await prisma.artisan.findUnique({
    where: { userId: artisanUserId },
  });
  if (!artisan) {
    throw new B2BError('Artisan profile not found', 404);
  }

  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const skip = (page - 1) * limit;

  const where: any = { sellerId: artisan.id };
  if (options?.status) {
    where.status = options.status;
  }

  const [total, enquiries] = await Promise.all([
    prisma.enquiry.count({ where }),
    prisma.enquiry.findMany({
      where,
      include: {
        buyer: {
          select: {
            id: true,
            companyName: true,
            buyerType: true,
            state: true,
            user: { select: { name: true, phone: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
  ]);

  return {
    enquiries,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getArtisanEnquiryDetails = async (artisanUserId: string, enquiryId: string) => {
  const artisan = await prisma.artisan.findUnique({
    where: { userId: artisanUserId },
  });
  if (!artisan) {
    throw new B2BError('Artisan profile not found', 404);
  }

  const enquiry = await prisma.enquiry.findFirst({
    where: { id: enquiryId, sellerId: artisan.id },
    include: {
      buyer: {
        select: {
          id: true,
          companyName: true,
          buyerType: true,
          gstNumber: true,
          state: true,
          district: true,
          address: true,
          user: { select: { name: true, phone: true } },
        },
      },
    },
  });

  if (!enquiry) {
    throw new B2BError('Enquiry not found', 404);
  }

  return enquiry;
};

export const respondToEnquiry = async (
  artisanUserId: string,
  enquiryId: string,
  input: {
    action: 'ACCEPT' | 'REJECT' | 'COUNTER_OFFER';
    counterOfferPrice?: number;
    counterOfferMessage?: string;
  }
) => {
  const artisan = await prisma.artisan.findUnique({
    where: { userId: artisanUserId },
  });
  if (!artisan) {
    throw new B2BError('Artisan profile not found', 404);
  }

  const enquiry = await prisma.enquiry.findFirst({
    where: { id: enquiryId, sellerId: artisan.id },
    include: {
      buyer: { select: { userId: true } },
    },
  });

  if (!enquiry) {
    throw new B2BError('Enquiry not found', 404);
  }

  if (enquiry.status === EnquiryStatus.BUYER_ACCEPTED || enquiry.status === EnquiryStatus.REJECTED) {
    throw new B2BError(`Cannot update enquiry that is already ${enquiry.status}.`, 400);
  }

  let newStatus: EnquiryStatus;
  if (input.action === 'ACCEPT') {
    newStatus = EnquiryStatus.ACCEPTED;
  } else if (input.action === 'REJECT') {
    newStatus = EnquiryStatus.REJECTED;
  } else {
    newStatus = EnquiryStatus.COUNTER_OFFER;
  }

  const updated = await prisma.enquiry.update({
    where: { id: enquiryId },
    data: {
      status: newStatus,
      counterOfferPrice: input.counterOfferPrice !== undefined ? input.counterOfferPrice : enquiry.counterOfferPrice,
      counterOfferMessage: input.counterOfferMessage || enquiry.counterOfferMessage,
    },
  });

  // Notify buyer
  if (enquiry.buyer?.userId) {
    try {
      const message =
        newStatus === EnquiryStatus.ACCEPTED
          ? `Artisan accepted your bulk purchase enquiry #${enquiry.id.slice(0, 8)}!`
          : newStatus === EnquiryStatus.REJECTED
          ? `Artisan declined bulk purchase enquiry #${enquiry.id.slice(0, 8)}.`
          : `Artisan sent a counter offer of ₹${input.counterOfferPrice} for enquiry #${enquiry.id.slice(0, 8)}.`;

      await createNotification(
        enquiry.buyer.userId,
        `Enquiry ${newStatus}`,
        message,
        NotificationType.ENQUIRY,
        enquiry.id
      );
    } catch (err) {
      console.error('Failed to notify buyer of enquiry update:', err);
    }
  }

  return updated;
};
