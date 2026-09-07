import { prisma } from '../config/prisma';
import { ProductStatus } from '@prisma/client';

export class InventoryIntelligenceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'InventoryIntelligenceError';
    this.statusCode = statusCode;
  }
}

export const getInventoryInsights = async (artisanUserId: string) => {
  const artisan = await prisma.artisan.findUnique({
    where: { userId: artisanUserId },
  });

  if (!artisan) {
    throw new InventoryIntelligenceError('Artisan profile not found', 404);
  }

  const products = await prisma.product.findMany({
    where: { sellerId: artisan.id },
    include: {
      inventory: true,
      images: { where: { isPrimary: true }, select: { processedPath: true, originalPath: true } },
    },
  });

  const lowStock: any[] = [];
  const outOfStock: any[] = [];
  const fastMoving: any[] = [];
  const slowMoving: any[] = [];
  const restockRecommendations: any[] = [];

  let totalSoldQuantity = 0;

  for (const product of products) {
    const inv = product.inventory;
    if (!inv) continue;

    totalSoldQuantity += inv.soldQuantity;

    const baseProduct = {
      id: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      status: product.status,
      availableQuantity: inv.availableQuantity,
      soldQuantity: inv.soldQuantity,
      reorderLevel: inv.reorderLevel,
      stockStatus: inv.stockStatus,
      primaryImage: product.images[0]?.processedPath || product.images[0]?.originalPath || null,
    };

    // 1. Out of stock
    if (inv.availableQuantity === 0 || inv.stockStatus === 'OUT_OF_STOCK') {
      outOfStock.push(baseProduct);
      restockRecommendations.push({
        productId: product.id,
        name: product.name,
        urgency: 'CRITICAL',
        currentStock: 0,
        suggestedRestockQuantity: Math.max(inv.reorderLevel * 2, inv.soldQuantity || 5),
        reason: 'Product is completely out of stock. Buyers cannot purchase this item.',
      });
    }
    // 2. Low stock
    else if (inv.availableQuantity <= inv.reorderLevel) {
      lowStock.push(baseProduct);
      restockRecommendations.push({
        productId: product.id,
        name: product.name,
        urgency: 'HIGH',
        currentStock: inv.availableQuantity,
        suggestedRestockQuantity: Math.max(inv.reorderLevel * 2 - inv.availableQuantity, 5),
        reason: `Available stock (${inv.availableQuantity}) is at or below reorder threshold (${inv.reorderLevel}).`,
      });
    }

    // 3. Fast moving (soldQuantity >= 2 or high ratio)
    if (inv.soldQuantity >= 2) {
      fastMoving.push(baseProduct);
    }

    // 4. Slow moving (published, in stock, but 0 sales)
    if (product.status === ProductStatus.PUBLISHED && inv.availableQuantity > 0 && inv.soldQuantity === 0) {
      slowMoving.push(baseProduct);
    }
  }

  // Sort fast moving by sold quantity descending
  fastMoving.sort((a, b) => b.soldQuantity - a.soldQuantity);

  let explanation: string | null = null;
  if (totalSoldQuantity === 0) {
    explanation = 'Insufficient sales history for reliable demand prediction.';
  }

  return {
    summary: {
      totalProducts: products.length,
      outOfStockCount: outOfStock.length,
      lowStockCount: lowStock.length,
      fastMovingCount: fastMoving.length,
      slowMovingCount: slowMoving.length,
      needsRestockCount: restockRecommendations.length,
    },
    message: explanation,
    lowStock,
    outOfStock,
    fastMoving,
    slowMoving,
    restockRecommendations,
  };
};
