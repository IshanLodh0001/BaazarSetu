import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/prisma';
import { redisClient } from '../src/config/redis';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';

// Mock AI and Gemini services
jest.mock('../src/services/ai.service', () => ({
  predictPrice: jest.fn().mockImplementation(async (features: any) => {
    return {
      predictedMarketPrice: Math.max((features.totalCost || 1000) * 1.4, 1400),
      confidenceLevel: 'medium',
      modelVersion: 'xgboost-v1-demo'
    };
  })
}));

jest.mock('../src/services/gemini.service', () => ({
  generatePricingExplanation: jest.fn().mockImplementation(async (pricingData: any) => {
    return `Based on your total production cost of ₹${pricingData.totalCost} and estimated market value of ₹${pricingData.predictedMarketPrice}, a suggested selling price of ₹${pricingData.suggestedPrice} gives you an expected profit of ₹${pricingData.expectedProfit} (${pricingData.profitMargin}% margin). This is competitive in your category.`;
  })
}));

describe('Phase 5 - Dynamic Pricing Assistant API', () => {
  let artisanToken: string;
  let artisanUserId: string;
  let artisanId: string;
  let otherArtisanToken: string;
  let otherArtisanUserId: string;
  let otherArtisanId: string;
  let productId: string;
  let pricingId: string;

  const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-do-not-use-in-prod';

  beforeAll(async () => {
    // 1. Primary Artisan
    const user1 = await prisma.user.create({
      data: {
        phone: '+919811112233',
        role: UserRole.ARTISAN,
        isVerified: true,
      }
    });
    artisanUserId = user1.id;

    const artisan1 = await prisma.artisan.create({
      data: {
        userId: user1.id,
        businessName: 'Master Potter',
        craftType: 'Pottery',
        state: 'Rajasthan',
      }
    });
    artisanId = artisan1.id;
    artisanToken = jwt.sign({ id: user1.id, phone: user1.phone, role: user1.role }, JWT_SECRET, { expiresIn: '1h' });

    // 2. Secondary Artisan (for ownership security tests)
    const user2 = await prisma.user.create({
      data: {
        phone: '+919822223344',
        role: UserRole.ARTISAN,
        isVerified: true,
      }
    });
    otherArtisanUserId = user2.id;

    const artisan2 = await prisma.artisan.create({
      data: {
        userId: user2.id,
        businessName: 'Silk Weaver',
        craftType: 'Weaving',
        state: 'Assam',
      }
    });
    otherArtisanId = artisan2.id;
    otherArtisanToken = jwt.sign({ id: user2.id, phone: user2.phone, role: user2.role }, JWT_SECRET, { expiresIn: '1h' });

    // 3. Test Product owned by Primary Artisan
    const product = await prisma.product.create({
      data: {
        sellerId: artisan1.id,
        name: 'Terracotta Vase',
        category: 'Pottery',
        subcategory: 'Vase',
        craftType: 'Clay Molding',
        material: 'Terracotta',
        price: 0,
      }
    });
    productId = product.id;
  });

  afterAll(async () => {
    // Clean up
    if (productId) {
      await prisma.pricingRecommendation.deleteMany({ where: { productId } });
      await prisma.product.deleteMany({ where: { id: productId } });
    }
    await prisma.artisan.deleteMany({ where: { id: { in: [artisanId, otherArtisanId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [artisanUserId, otherArtisanUserId] } } });
    await redisClient.quit();
  });

  describe('POST /api/v1/pricing/calculate', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/v1/pricing/calculate')
        .send({
          productId,
          rawMaterialCost: 200,
          labourCost: 300,
        });
      expect(res.status).toBe(401);
    });

    it('should reject invalid validation payload (e.g. negative cost)', async () => {
      const res = await request(app)
        .post('/api/v1/pricing/calculate')
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          productId,
          rawMaterialCost: -50,
          labourCost: 100,
        });
      expect(res.status).toBe(400);
    });

    it('should reject calculation when requested by non-owner (ownership security)', async () => {
      const res = await request(app)
        .post('/api/v1/pricing/calculate')
        .set('Authorization', `Bearer ${otherArtisanToken}`)
        .send({
          productId,
          rawMaterialCost: 200,
          labourCost: 300,
          packagingCost: 50,
          transportCost: 50,
          otherCost: 20,
          quantity: 1,
          desiredProfitMargin: 25,
        });
      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Unauthorized');
    });

    it('should calculate pricing with deterministic costs, AI prediction, and profit margin', async () => {
      const res = await request(app)
        .post('/api/v1/pricing/calculate')
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          productId,
          rawMaterialCost: 250,
          labourCost: 300,
          packagingCost: 50,
          transportCost: 100,
          otherCost: 50,
          quantity: 2,
          desiredProfitMargin: 20,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.pricingId).toBeDefined();
      pricingId = data.pricingId;

      // Deterministic total cost = 250 + 300 + 50 + 100 + 50 = 750
      expect(data.costBreakdown.totalCost).toBe(750);
      // Unit cost = 750 / 2 = 375
      expect(data.costBreakdown.unitCost).toBe(375);

      // Recommendation checks
      expect(data.recommendation.suggestedPrice).toBeGreaterThan(data.costBreakdown.unitCost);
      expect(data.recommendation.expectedProfit).toBeGreaterThan(0);
      expect(data.recommendation.profitMargin).toBeGreaterThan(0);
      expect(data.model.name).toBe('XGBoost');

      // Verify Prisma DB persistence
      const saved = await prisma.pricingRecommendation.findUnique({
        where: { id: pricingId },
      });
      expect(saved).not.toBeNull();
      expect(saved?.totalCost).toBe(750);
      expect(saved?.suggestedPrice).toBe(data.recommendation.suggestedPrice);
    });
  });

  describe('POST /api/v1/pricing/explain/:pricingId', () => {
    it('should reject explain request from non-owner (ownership security)', async () => {
      const res = await request(app)
        .post(`/api/v1/pricing/explain/${pricingId}`)
        .set('Authorization', `Bearer ${otherArtisanToken}`);

      expect(res.status).toBe(403);
    });

    it('should generate pricing explanation without altering numerical price', async () => {
      const res = await request(app)
        .post(`/api/v1/pricing/explain/${pricingId}`)
        .set('Authorization', `Bearer ${artisanToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.explanation).toBeDefined();
      expect(typeof res.body.data.explanation).toBe('string');
      expect(res.body.data.explanation).toContain('₹750');

      // Check that DB cached the explanation
      const updated = await prisma.pricingRecommendation.findUnique({
        where: { id: pricingId },
      });
      expect(updated?.pricingReason).toBe(res.body.data.explanation);
    });
  });

  describe('POST /api/v1/pricing/apply/:pricingId', () => {
    it('should reject apply price from non-owner (ownership security)', async () => {
      const res = await request(app)
        .post(`/api/v1/pricing/apply/${pricingId}`)
        .set('Authorization', `Bearer ${otherArtisanToken}`);

      expect(res.status).toBe(403);
    });

    it('should apply suggested price to product', async () => {
      const res = await request(app)
        .post(`/api/v1/pricing/apply/${pricingId}`)
        .set('Authorization', `Bearer ${artisanToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.price).toBeGreaterThan(0);
      expect(res.body.data.aiSuggestedPrice).toBe(res.body.data.price);

      // Verify product updated in database
      const productInDb = await prisma.product.findUnique({
        where: { id: productId },
      });
      expect(productInDb?.price).toBe(res.body.data.price);
      expect(productInDb?.aiSuggestedPrice).toBe(res.body.data.price);
    });
  });

  describe('GET /api/v1/pricing/product/:productId/history', () => {
    it('should reject history request from non-owner (ownership security)', async () => {
      const res = await request(app)
        .get(`/api/v1/pricing/product/${productId}/history`)
        .set('Authorization', `Bearer ${otherArtisanToken}`);

      expect(res.status).toBe(403);
    });

    it('should retrieve pricing recommendation history for owner', async () => {
      const res = await request(app)
        .get(`/api/v1/pricing/product/${productId}/history`)
        .set('Authorization', `Bearer ${artisanToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].id).toBe(pricingId);
      expect(res.body.data[0].totalCost).toBe(750);
    });
  });
});
