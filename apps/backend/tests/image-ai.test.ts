import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/prisma';
import { redisClient } from '../src/config/redis';
import { UserRole } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import * as aiService from '../src/services/ai.service';

const testArtisanPhone = '+919999999993';
const testBuyerPhone = '+919999999994';
let artisanToken = '';
let buyerToken = '';
let artisanId = '';
let productId = '';
let imageId = '';
const dummyImagePath = 'uploads/products/test-ai-product/dummy.jpg';

beforeAll(async () => {
  // Clean up
  await prisma.product.deleteMany({ where: { name: 'Test AI Product' } });
  await prisma.user.deleteMany({ where: { phone: { in: [testArtisanPhone, testBuyerPhone] } } });

  // Create Artisan
  const artisanUser = await prisma.user.create({
    data: { phone: testArtisanPhone, role: UserRole.ARTISAN },
  });
  const artisanProfile = await prisma.artisan.create({
    data: { userId: artisanUser.id, businessName: 'Test Artisan Co' },
  });
  artisanId = artisanProfile.id;

  // Create Buyer
  const buyerUser = await prisma.user.create({
    data: { phone: testBuyerPhone, role: UserRole.BUYER },
  });
  await prisma.buyer.create({
    data: { userId: buyerUser.id, companyName: 'Test Buyer Co' },
  });

  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-do-not-use-in-prod';
  
  artisanToken = jwt.sign({ id: artisanUser.id, phone: artisanUser.phone, role: artisanUser.role }, JWT_SECRET, { expiresIn: '1h' });
  buyerToken = jwt.sign({ id: buyerUser.id, phone: buyerUser.phone, role: buyerUser.role }, JWT_SECRET, { expiresIn: '1h' });

  // Create Product & Image
  const product = await prisma.product.create({
    data: {
      sellerId: artisanId,
      name: 'Test AI Product',
    }
  });
  productId = product.id;

  const image = await prisma.image.create({
    data: {
      productId: product.id,
      originalPath: dummyImagePath,
    }
  });
  imageId = image.id;
});

afterAll(async () => {
  await prisma.product.deleteMany({ where: { name: 'Test AI Product' } });
  await prisma.user.deleteMany({ where: { phone: { in: [testArtisanPhone, testBuyerPhone] } } });
  await redisClient.quit();
});

describe('AI Image Studio API', () => {
  it('should deny unauthenticated image processing', async () => {
    const res = await request(app).post(`/api/v1/products/${productId}/images/${imageId}/process`);
    expect(res.status).toBe(401);
  });

  it('should deny processing another seller\'s image', async () => {
    const res = await request(app)
      .post(`/api/v1/products/${productId}/images/${imageId}/process`)
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(res.status).toBe(403);
  });

  it('should get image status', async () => {
    const res = await request(app)
      .get(`/api/v1/products/${productId}/images/${imageId}/status`)
      .set('Authorization', `Bearer ${artisanToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.processingStatus).toBe('pending');
  });

  it('should process own image successfully', async () => {
    // Mock AI service to simulate success without needing python container in test runner
    jest.spyOn(aiService, 'processImageWithAI').mockResolvedValueOnce({
      processed_path: 'uploads/products/test-ai-product/enhanced/dummy_enhanced.jpg',
      backgroundRemoved: true,
      lightingImproved: true,
      cropApplied: true
    });

    const res = await request(app)
      .post(`/api/v1/products/${productId}/images/${imageId}/process`)
      .set('Authorization', `Bearer ${artisanToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.processingStatus).toBe('COMPLETED');
    expect(res.body.data.backgroundRemoved).toBe(true);
    expect(res.body.data.processedPath).toBe('uploads/products/test-ai-product/enhanced/dummy_enhanced.jpg');
    
    // Verify DB
    const img = await prisma.image.findUnique({ where: { id: imageId } });
    expect(img?.processingStatus).toBe('COMPLETED');
  });

  it('should fail processing and update status to FAILED', async () => {
    jest.spyOn(aiService, 'processImageWithAI').mockRejectedValueOnce(new Error('AI Server down'));

    const res = await request(app)
      .post(`/api/v1/products/${productId}/images/${imageId}/process`)
      .set('Authorization', `Bearer ${artisanToken}`);
    
    expect(res.status).toBe(500);
    
    // Verify DB
    const img = await prisma.image.findUnique({ where: { id: imageId } });
    expect(img?.processingStatus).toBe('FAILED');
  });

  it('should retry failed processing successfully', async () => {
    jest.spyOn(aiService, 'processImageWithAI').mockResolvedValueOnce({
      processed_path: 'uploads/products/test-ai-product/enhanced/dummy_enhanced_retry.jpg',
      backgroundRemoved: true,
      lightingImproved: true,
      cropApplied: true
    });

    const res = await request(app)
      .post(`/api/v1/products/${productId}/images/${imageId}/retry`)
      .set('Authorization', `Bearer ${artisanToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.data.processingStatus).toBe('COMPLETED');
  });
});
