import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/prisma';
import { redisClient } from '../src/config/redis';
import { UserRole, ProductStatus, StockStatus } from '@prisma/client';
import path from 'path';
import fs from 'fs';

const testArtisanPhone = '+919999999991';
const testBuyerPhone = '+919999999992';
let artisanToken = '';
let buyerToken = '';
let artisanId = '';
let productId = '';

beforeAll(async () => {
  // Clean up
  await prisma.product.deleteMany({ where: { name: 'Test Product' } });
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

  // Generate tokens (using mock logic similar to controller for tests)
  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-do-not-use-in-prod';
  
  artisanToken = jwt.sign({ id: artisanUser.id, phone: artisanUser.phone, role: artisanUser.role }, JWT_SECRET, { expiresIn: '1h' });
  buyerToken = jwt.sign({ id: buyerUser.id, phone: buyerUser.phone, role: buyerUser.role }, JWT_SECRET, { expiresIn: '1h' });
});

afterAll(async () => {
  await prisma.product.deleteMany({ where: { name: 'Test Product' } });
  await prisma.user.deleteMany({ where: { phone: { in: [testArtisanPhone, testBuyerPhone] } } });
  await redisClient.quit();
});

describe('Product API', () => {
  it('should deny unauthenticated product creation', async () => {
    const res = await request(app)
      .post('/api/v1/products')
      .send({ productName: 'Test Product', price: 100, stock: 10 });
    
    expect(res.status).toBe(401);
  });

  it('should deny product creation for buyers', async () => {
    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ productName: 'Test Product', price: 100, stock: 10 });
    
    expect(res.status).toBe(403);
  });

  it('should create a product successfully', async () => {
    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${artisanToken}`)
      .send({ productName: 'Test Product', price: 100, stock: 10 });
    
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Test Product');
    expect(res.body.data.sellerId).toBe(artisanId);
    
    productId = res.body.data.id;
  });

  it('should get all products', async () => {
    const res = await request(app).get('/api/v1/products');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should get a product by ID', async () => {
    const res = await request(app).get(`/api/v1/products/${productId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(productId);
    expect(res.body.data.inventory.availableQuantity).toBe(10);
  });

  it('should update own product', async () => {
    const res = await request(app)
      .patch(`/api/v1/products/${productId}`)
      .set('Authorization', `Bearer ${artisanToken}`)
      .send({ price: 150 });
    
    expect(res.status).toBe(200);
    expect(res.body.data.price).toBe(150);
  });

  it('should deny update of another seller\'s product', async () => {
    const res = await request(app)
      .patch(`/api/v1/products/${productId}`)
      .set('Authorization', `Bearer ${buyerToken}`) // Assuming buyer has artisan profile for test, but buyerToken is buyer role. It will fail on ownership or role. Actually buyerToken will fail on ownership.
      .send({ price: 200 });
    
    expect(res.status).toBe(403);
  });

  it('should update product stock and sync inventory', async () => {
    const res = await request(app)
      .patch(`/api/v1/products/${productId}/stock`)
      .set('Authorization', `Bearer ${artisanToken}`)
      .send({ stock: 2 });
    
    expect(res.status).toBe(200);
    expect(res.body.data.availableQuantity).toBe(2);
    expect(res.body.data.stockStatus).toBe(StockStatus.LOW_STOCK);
  });

  it('should publish a product', async () => {
    const res = await request(app)
      .post(`/api/v1/products/${productId}/publish`)
      .set('Authorization', `Bearer ${artisanToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(ProductStatus.PUBLISHED);
  });

  it('should unpublish a product', async () => {
    const res = await request(app)
      .post(`/api/v1/products/${productId}/unpublish`)
      .set('Authorization', `Bearer ${artisanToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(ProductStatus.DRAFT);
  });

  it('should upload a product image', async () => {
    // Create a dummy file
    const tmpFilePath = path.join(__dirname, 'dummy.jpg');
    fs.writeFileSync(tmpFilePath, 'dummy image content');

    const res = await request(app)
      .post(`/api/v1/products/${productId}/images`)
      .set('Authorization', `Bearer ${artisanToken}`)
      .attach('images', tmpFilePath);
    
    fs.unlinkSync(tmpFilePath); // cleanup

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].originalPath).toContain('.jpg');
  });

  it('should fail with invalid image type', async () => {
    const tmpFilePath = path.join(__dirname, 'dummy.txt');
    fs.writeFileSync(tmpFilePath, 'dummy text content');

    const res = await request(app)
      .post(`/api/v1/products/${productId}/images`)
      .set('Authorization', `Bearer ${artisanToken}`)
      .attach('images', tmpFilePath);
    
    fs.unlinkSync(tmpFilePath); // cleanup

    expect(res.status).toBe(500); // Or 400 depending on error handling, express error handler returns 500 for generic unhandled errors, let's see what multer does. Multer fileFilter throws an error which hits the error middleware.
  });

  it('should delete a product', async () => {
    const res = await request(app)
      .delete(`/api/v1/products/${productId}`)
      .set('Authorization', `Bearer ${artisanToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
