import { prisma } from '../config/prisma';
import { predictPrice } from './ai.service';
import { generatePricingExplanation } from './gemini.service';

interface PricingInput {
  productId: string;
  sellerId: string;
  rawMaterialCost: number;
  labourCost: number;
  packagingCost: number;
  transportCost: number;
  otherCost: number;
  quantity: number;
  desiredProfitMargin: number;
}

export const calculatePricing = async (input: PricingInput) => {
  // 1. Fetch product & verify ownership
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    include: { seller: { select: { id: true, userId: true } } },
  });

  if (!product) {
    throw new Error('Product not found');
  }
  if (product.seller.userId !== input.sellerId) {
    throw new Error('Unauthorized: You do not own this product');
  }

  // 2. Deterministic Cost Calculation
  const totalCost = 
    input.rawMaterialCost + 
    input.labourCost + 
    input.packagingCost + 
    input.transportCost + 
    input.otherCost;
    
  const unitCost = totalCost / input.quantity;

  // 3. Minimum viable price from cost + margin
  let minViablePrice = unitCost;
  if (input.desiredProfitMargin > 0 && input.desiredProfitMargin < 100) {
    minViablePrice = unitCost / (1 - (input.desiredProfitMargin / 100));
  } else if (input.desiredProfitMargin >= 100) {
     minViablePrice = unitCost * (1 + (input.desiredProfitMargin / 100)); // simple markup if >= 100
  }

  // 4. XGBoost AI Prediction
  const features = {
    category: product.category,
    subCategory: product.subcategory,
    craftType: product.craftType,
    material: product.material,
    quantity: input.quantity,
    rawMaterialCost: input.rawMaterialCost,
    labourCost: input.labourCost,
    packagingCost: input.packagingCost,
    transportCost: input.transportCost,
    otherCost: input.otherCost,
    totalCost: totalCost,
  };

  const aiResult = await predictPrice(features);
  
  const predictedMarketPrice = aiResult.predictedMarketPrice;

  // 5. Calculate Final Suggested Price
  // We balance the minViablePrice (cost + desired margin) and the predicted market price
  let suggestedPrice = Math.max(minViablePrice, predictedMarketPrice);
  
  // Ensure we don't sell below unit cost
  suggestedPrice = Math.max(suggestedPrice, unitCost * 1.05); 
  
  // Round to nearest integer for currency safety
  suggestedPrice = Math.round(suggestedPrice);

  // 6. Expected Profit & Margin
  const expectedProfit = suggestedPrice - unitCost;
  const profitMargin = suggestedPrice > 0 ? (expectedProfit / suggestedPrice) * 100 : 0;

  // 7. Save to database
  const recommendation = await prisma.pricingRecommendation.create({
    data: {
      productId: input.productId,
      sellerId: product.seller.id,
      rawMaterialCost: input.rawMaterialCost,
      labourCost: input.labourCost,
      packagingCost: input.packagingCost,
      transportCost: input.transportCost,
      otherCost: input.otherCost,
      totalCost,
      quantity: input.quantity,
      predictedMarketPrice,
      suggestedPrice,
      expectedProfit,
      profitMargin,
      modelVersion: aiResult.modelVersion,
    }
  });

  return {
    pricingId: recommendation.id,
    productId: product.id,
    costBreakdown: {
      rawMaterialCost: input.rawMaterialCost,
      labourCost: input.labourCost,
      packagingCost: input.packagingCost,
      transportCost: input.transportCost,
      otherCost: input.otherCost,
      totalCost,
      unitCost,
    },
    marketAnalysis: {
      predictedMarketPrice,
    },
    recommendation: {
      suggestedPrice,
      expectedProfit,
      profitMargin: Number(profitMargin.toFixed(2)),
    },
    model: {
      name: 'XGBoost',
      version: aiResult.modelVersion,
    }
  };
};

export const applyPrice = async (pricingId: string, sellerId: string) => {
  const recommendation = await prisma.pricingRecommendation.findUnique({
    where: { id: pricingId },
    include: { product: { include: { seller: true } } },
  });

  if (!recommendation) {
    throw new Error('Pricing recommendation not found');
  }

  if (recommendation.product.seller.userId !== sellerId) {
    throw new Error('Unauthorized: You do not own this product');
  }

  const updatedProduct = await prisma.product.update({
    where: { id: recommendation.productId },
    data: {
      price: recommendation.suggestedPrice,
      aiSuggestedPrice: recommendation.suggestedPrice,
      aiConfidence: 0.8, // Approximation based on XGBoost availability
    },
  });

  return updatedProduct;
};

export const explainPrice = async (pricingId: string, sellerId: string) => {
  const recommendation = await prisma.pricingRecommendation.findUnique({
    where: { id: pricingId },
    include: { product: { include: { seller: true } } },
  });

  if (!recommendation) {
    throw new Error('Pricing recommendation not found');
  }

  if (recommendation.product.seller.userId !== sellerId) {
    throw new Error('Unauthorized: You do not own this product');
  }

  if (recommendation.pricingReason) {
    return recommendation.pricingReason; // return cached explanation
  }

  const explanation = await generatePricingExplanation({
    productName: recommendation.product.name,
    category: recommendation.product.category,
    totalCost: recommendation.totalCost,
    unitCost: recommendation.totalCost / recommendation.quantity,
    predictedMarketPrice: recommendation.predictedMarketPrice,
    suggestedPrice: recommendation.suggestedPrice,
    expectedProfit: recommendation.expectedProfit,
    profitMargin: recommendation.profitMargin.toFixed(2),
  });

  await prisma.pricingRecommendation.update({
    where: { id: pricingId },
    data: { pricingReason: explanation }
  });

  return explanation;
};

export const getPricingHistory = async (productId: string, sellerId: string) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { seller: true }
  });

  if (!product) {
    throw new Error('Product not found');
  }

  if (product.seller.userId !== sellerId) {
    throw new Error('Unauthorized: You do not own this product');
  }

  return prisma.pricingRecommendation.findMany({
    where: { productId },
    orderBy: { createdAt: 'desc' }
  });
};
