import { prisma } from '../config/prisma';
import { ProductStatus } from '@prisma/client';

export const addToWishlist = async (buyerUserId: string, productId: string) => {
  const buyer = await prisma.buyer.findUnique({
    where: { userId: buyerUserId },
  });

  if (!buyer) {
    throw new Error('Buyer profile not found');
  }

  // Verify product exists and is published
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      status: ProductStatus.PUBLISHED,
    },
  });

  if (!product) {
    throw new Error('Product not found or not available in marketplace');
  }

  // Upsert to prevent duplicate entries
  const wishlistItem = await prisma.wishlistItem.upsert({
    where: {
      buyerId_productId: {
        buyerId: buyer.id,
        productId,
      },
    },
    update: {},
    create: {
      buyerId: buyer.id,
      productId,
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          price: true,
          category: true,
          images: { where: { isPrimary: true }, take: 1 },
        }
      }
    }
  });

  return wishlistItem;
};

export const removeFromWishlist = async (buyerUserId: string, productId: string) => {
  const buyer = await prisma.buyer.findUnique({
    where: { userId: buyerUserId },
  });

  if (!buyer) {
    throw new Error('Buyer profile not found');
  }

  const deleteResult = await prisma.wishlistItem.deleteMany({
    where: {
      buyerId: buyer.id,
      productId,
    },
  });

  return { removed: deleteResult.count > 0 };
};

export const getWishlist = async (buyerUserId: string) => {
  const buyer = await prisma.buyer.findUnique({
    where: { userId: buyerUserId },
  });

  if (!buyer) {
    throw new Error('Buyer profile not found');
  }

  const items = await prisma.wishlistItem.findMany({
    where: { buyerId: buyer.id },
    orderBy: { createdAt: 'desc' },
    include: {
      product: {
        include: {
          images: { orderBy: { isPrimary: 'desc' } },
          inventory: { select: { availableQuantity: true, stockStatus: true } },
          seller: { select: { id: true, businessName: true, state: true } },
        }
      }
    }
  });

  return items.map((item) => {
    const p = item.product;
    const stock = p.inventory?.availableQuantity ?? 0;
    return {
      wishlistId: item.id,
      productId: p.id,
      productName: p.name,
      category: p.category,
      subCategory: p.subcategory,
      price: p.price,
      stock,
      isAvailable: p.status === ProductStatus.PUBLISHED && stock > 0,
      primaryImage: p.images.find(img => img.isPrimary)?.processedPath || p.images[0]?.originalPath || null,
      seller: {
        sellerId: p.seller.id,
        businessName: p.seller.businessName,
        state: p.seller.state,
      },
      addedAt: item.createdAt,
    };
  });
};
