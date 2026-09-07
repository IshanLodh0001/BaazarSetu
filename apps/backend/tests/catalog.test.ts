import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/prisma';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';

// Mock services
jest.mock('../src/services/ai.service', () => ({
  transcribeAudio: jest.fn().mockResolvedValue({
    success: true,
    data: { transcript: 'Handwoven cotton saree', language: 'en' }
  }),
  translateText: jest.fn().mockResolvedValue({
    originalText: 'Handwoven cotton saree',
    sourceLanguage: 'en',
    translatedText: 'Handwoven cotton saree in english',
    targetLanguage: 'en'
  })
}));

jest.mock('../src/services/gemini.service', () => ({
  generateCatalog: jest.fn().mockResolvedValue({
    title: 'Handwoven Cotton Saree',
    description: 'Beautiful handmade product',
    category: 'Clothing',
    subCategory: 'Sarees',
    material: 'Cotton',
    colour: 'Red',
    craftType: 'Handloom',
    tags: ['saree', 'cotton'],
    seoKeywords: ['handmade saree']
  })
}));

describe('Catalog API', () => {
  let token: string;
  let userId: string;
  let productId: string;
  const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-do-not-use-in-prod';

  beforeAll(async () => {
    // Setup user
    const user = await prisma.user.create({
      data: {
        phone: '+919999999988',
        role: UserRole.ARTISAN,
        isVerified: true
      }
    });
    userId = user.id;

    const artisan = await prisma.artisan.create({
      data: {
        userId: user.id,
        businessName: 'Test Artisan'
      }
    });

    token = jwt.sign({ id: user.id, phone: user.phone, role: user.role }, JWT_SECRET, { expiresIn: '1h' });

    // Setup product
    const product = await prisma.product.create({
      data: {
        sellerId: artisan.id,
        name: 'Initial Product Name'
      }
    });
    productId = product.id;
  });

  afterAll(async () => {
    if (productId) {
      await prisma.product.deleteMany({ where: { id: productId } });
    }
    await prisma.artisan.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  it('should reject unauthenticated request', async () => {
    const res = await request(app)
      .post('/api/v1/catalog/generate-from-text')
      .send({ text: 'test', language: 'hi', targetLanguage: 'en' });
    expect(res.status).toBe(401);
  });

  it('should generate catalog from text', async () => {
    const res = await request(app)
      .post('/api/v1/catalog/generate-from-text')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'Handwoven cotton saree', language: 'en', targetLanguage: 'en' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.catalog.title).toBe('Handwoven Cotton Saree');
  });

  it('should apply catalog to product', async () => {
    const res = await request(app)
      .post(`/api/v1/catalog/apply/${productId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'New Applied Name',
        description: 'New Description',
        category: 'Clothing'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    
    const updatedProduct = await prisma.product.findUnique({ where: { id: productId } });
    expect(updatedProduct?.name).toBe('New Applied Name');
  });

  it('should fetch catalog history', async () => {
    const res = await request(app)
      .get('/api/v1/catalog/history')
      .set('Authorization', `Bearer ${token}`);
      
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
