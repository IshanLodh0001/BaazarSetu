import { prisma } from '../config/prisma';
import { ProductStatus } from '@prisma/client';

export class StockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StockError';
  }
}

export const getOrCreateCart = async (buyerId: string) => {
  let cart = await prisma.cart.findUnique({
    where: { buyerId },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: {
        buyerId,
        totalItems: 0,
        subtotal: 0,
      },
    });
  }

  return cart;
};

export const recalculateCartTotals = async (cartId: string) => {
  const items = await prisma.cartItem.findMany({
    where: { cartId },
    select: { quantity: true, totalPrice: true },
  });

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);

  return prisma.cart.update({
    where: { id: cartId },
    data: { totalItems, subtotal },
  });
};

export const getCart = async (buyerUserId: string) => {
  const buyer = await prisma.buyer.findUnique({
    where: { userId: buyerUserId },
  });

  if (!buyer) {
    throw new Error('Buyer profile not found');
  }

  const cart = await getOrCreateCart(buyer.id);

  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    include: {
      product: {
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          inventory: { select: { availableQuantity: true, stockStatus: true } },
          seller: { select: { id: true, businessName: true, state: true } },
        }
      }
    },
    orderBy: { createdAt: 'asc' },
  });

  const formattedItems = items.map((item) => {
    const p = item.product;
    const availableStock = p.inventory?.availableQuantity ?? 0;
    return {
      itemId: item.id,
      productId: p.id,
      productName: p.name,
      category: p.category,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      totalPrice: item.totalPrice,
      availableStock,
      isAvailable: p.status === ProductStatus.PUBLISHED && availableStock >= item.quantity,
      primaryImage: p.images[0]?.processedPath || p.images[0]?.originalPath || null,
      seller: {
        sellerId: p.seller.id,
        businessName: p.seller.businessName,
        state: p.seller.state,
      }
    };
  });

  const totalItems = formattedItems.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = formattedItems.reduce((sum, i) => sum + i.totalPrice, 0);
  const shippingCharge = 0;
  const totalAmount = subtotal + shippingCharge;

  // Group items by seller for multi-seller clarity
  const sellersMap = new Map<string, { sellerId: string; businessName: string; items: any[] }>();
  for (const item of formattedItems) {
    const sId = item.seller.sellerId;
    if (!sellersMap.has(sId)) {
      sellersMap.set(sId, {
        sellerId: sId,
        businessName: item.seller.businessName || 'Artisan',
        items: [],
      });
    }
    sellersMap.get(sId)!.items.push(item);
  }

  return {
    cartId: cart.id,
    items: formattedItems,
    sellers: Array.from(sellersMap.values()),
    totalItems,
    subtotal: Number(subtotal.toFixed(2)),
    shippingCharge,
    totalAmount: Number(totalAmount.toFixed(2)),
  };
};

export const addToCart = async (buyerUserId: string, productId: string, requestedQuantity: number) => {
  const buyer = await prisma.buyer.findUnique({
    where: { userId: buyerUserId },
  });

  if (!buyer) {
    throw new Error('Buyer profile not found');
  }

  // 1. Fetch product and inventory
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { inventory: true },
  });

  if (!product) {
    throw new Error('Product not found');
  }

  if (product.status !== ProductStatus.PUBLISHED) {
    throw new Error('Product is not available for purchase');
  }

  const availableQuantity = product.inventory?.availableQuantity ?? 0;
  const cart = await getOrCreateCart(buyer.id);

  // Check if product is already in cart
  const existingCartItem = await prisma.cartItem.findFirst({
    where: {
      cartId: cart.id,
      productId: product.id,
    },
  });

  const newTotalQuantity = (existingCartItem?.quantity ?? 0) + requestedQuantity;

  // Stock check
  if (newTotalQuantity > availableQuantity) {
    throw new StockError('Requested quantity exceeds available stock.');
  }

  // Secure authoritative unit price strictly from database
  const authoritativePrice = product.price;

  if (existingCartItem) {
    await prisma.cartItem.update({
      where: { id: existingCartItem.id },
      data: {
        quantity: newTotalQuantity,
        unitPrice: authoritativePrice,
        totalPrice: authoritativePrice * newTotalQuantity,
      },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: product.id,
        quantity: requestedQuantity,
        unitPrice: authoritativePrice,
        totalPrice: authoritativePrice * requestedQuantity,
      },
    });
  }

  await recalculateCartTotals(cart.id);

  return getCart(buyerUserId);
};

export const updateCartItemQuantity = async (buyerUserId: string, productId: string, quantity: number) => {
  const buyer = await prisma.buyer.findUnique({
    where: { userId: buyerUserId },
  });

  if (!buyer) {
    throw new Error('Buyer profile not found');
  }

  const cart = await getOrCreateCart(buyer.id);

  const cartItem = await prisma.cartItem.findFirst({
    where: {
      cartId: cart.id,
      productId,
    },
    include: {
      product: { include: { inventory: true } },
    }
  });

  if (!cartItem) {
    throw new Error('Product not found in cart');
  }

  if (cartItem.product.status !== ProductStatus.PUBLISHED) {
    throw new Error('Product is no longer available');
  }

  const availableQuantity = cartItem.product.inventory?.availableQuantity ?? 0;

  if (quantity > availableQuantity) {
    throw new StockError('Requested quantity exceeds available stock.');
  }

  const authoritativePrice = cartItem.product.price;

  await prisma.cartItem.update({
    where: { id: cartItem.id },
    data: {
      quantity,
      unitPrice: authoritativePrice,
      totalPrice: authoritativePrice * quantity,
    },
  });

  await recalculateCartTotals(cart.id);

  return getCart(buyerUserId);
};

export const removeFromCart = async (buyerUserId: string, productId: string) => {
  const buyer = await prisma.buyer.findUnique({
    where: { userId: buyerUserId },
  });

  if (!buyer) {
    throw new Error('Buyer profile not found');
  }

  const cart = await getOrCreateCart(buyer.id);

  await prisma.cartItem.deleteMany({
    where: {
      cartId: cart.id,
      productId,
    },
  });

  await recalculateCartTotals(cart.id);

  return getCart(buyerUserId);
};

export const clearCart = async (buyerUserId: string) => {
  const buyer = await prisma.buyer.findUnique({
    where: { userId: buyerUserId },
  });

  if (!buyer) {
    throw new Error('Buyer profile not found');
  }

  const cart = await getOrCreateCart(buyer.id);

  await prisma.cartItem.deleteMany({
    where: { cartId: cart.id },
  });

  await prisma.cart.update({
    where: { id: cart.id },
    data: { totalItems: 0, subtotal: 0 },
  });

  return {
    cartId: cart.id,
    items: [],
    sellers: [],
    totalItems: 0,
    subtotal: 0,
    shippingCharge: 0,
    totalAmount: 0,
  };
};
