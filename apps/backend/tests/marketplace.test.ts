import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/prisma';
import { redisClient } from '../src/config/redis';
import jwt from 'jsonwebtoken';
import { UserRole, ProductStatus, StockStatus } from '@prisma/client';

describe('Phase 6 - Marketplace API', () => {
  let artisanUserId: string;
  let artisanId: string;
  let buyerUserId: string;
  let buyerId: string;
  let buyerToken: string;

  let publishedProduct1Id: string;
  let publishedProduct2Id: string;
  let draftProductId: string;

  const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-do-not-use-in-prod';

  beforeAll(async () => {
    // 1. Create Artisan
    const artisanUser = await prisma.user.create({
      data: {
        phone: '+919711001122',
        role: UserRole.ARTISAN,
        name: 'Ramesh Sharma',
        isVerified: true,
      },
    });
    artisanUserId = artisanUser.id;

    const artisan = await prisma.artisan.create({
      data: {
        userId: artisanUser.id,
        businessName: 'Sharma Handicrafts',
        craftType: 'Wood Carving',
        experienceYears: 12,
        state: 'Rajasthan',
        district: 'Jaipur',
        bio: 'Traditional Rajasthani wood carving master.',
        rating: 4.8,
        totalProducts: 2,
      },
    });
    artisanId = artisan.id;

    // 2. Create Buyer
    const buyerUser = await prisma.user.create({
      data: {
        phone: '+919722002233',
        role: UserRole.BUYER,
        name: 'Pooja Verma',
        isVerified: true,
      },
    });
    buyerUserId = buyerUser.id;

    const buyer = await prisma.buyer.create({
      data: {
        userId: buyerUser.id,
        companyName: 'Boutique India',
      },
    });
    buyerId = buyer.id;
    buyerToken = jwt.sign({ id: buyerUser.id, phone: buyerUser.phone, role: buyerUser.role }, JWT_SECRET, { expiresIn: '1h' });

    // 3. Create Published Product 1 (Wood, Rajasthan, ₹1200)
    const p1 = await prisma.product.create({
      data: {
        sellerId: artisan.id,
        name: 'Teak Wood Carved Elephant',
        description: 'Handcrafted royal elephant figurine in teak wood',
        category: 'Handicrafts',
        subcategory: 'Figurines',
        craftType: 'Wood Carving',
        material: 'Teak Wood',
        colour: 'Natural Brown',
        tags: ['elephant', 'wood', 'rajasthan', 'handmade'],
        price: 1200,
        status: ProductStatus.PUBLISHED,
        rating: 5.0,
        reviewCount: 1,
      },
    });
    publishedProduct1Id = p1.id;

    await prisma.inventory.create({
      data: {
        productId: p1.id,
        availableQuantity: 10,
        stockStatus: StockStatus.IN_STOCK,
      },
    });

    await prisma.image.create({
      data: {
        productId: p1.id,
        originalPath: 'uploads/elephant.jpg',
        processedPath: 'uploads/elephant_enhanced.jpg',
        isPrimary: true,
      },
    });

    // Create Review for Product 1
    await prisma.review.create({
      data: {
        buyerId: buyer.id,
        productId: p1.id,
        rating: 5,
        reviewText: 'Exceptional craftsmanship, loved the fine details!',
      },
    });

    // 4. Create Published Product 2 (Pottery, ₹400)
    const p2 = await prisma.product.create({
      data: {
        sellerId: artisan.id,
        name: 'Blue Glazed Terracotta Bowl',
        description: 'Vibrant decorative ceramic bowl',
        category: 'Pottery',
        subcategory: 'Bowls',
        craftType: 'Pottery',
        material: 'Terracotta',
        colour: 'Blue',
        tags: ['bowl', 'ceramic', 'blue'],
        price: 400,
        status: ProductStatus.PUBLISHED,
        rating: 4.5,
        reviewCount: 0,
      },
    });
    publishedProduct2Id = p2.id;

    await prisma.inventory.create({
      data: {
        productId: p2.id,
        availableQuantity: 0, // Out of stock to test availability indicator
        stockStatus: StockStatus.OUT_OF_STOCK,
      },
    });

    // 5. Create Draft Product (Should NEVER appear publicly)
    const draft = await prisma.product.create({
      data: {
        sellerId: artisan.id,
        name: 'Unpublished Secret Prototype',
        description: 'Under construction',
        category: 'Handicrafts',
        price: 9999,
        status: ProductStatus.DRAFT,
      },
    });
    draftProductId = draft.id;

    // Add Product 1 to buyer's wishlist to test isFavorite
    await prisma.wishlistItem.create({
      data: {
        buyerId: buyer.id,
        productId: p1.id,
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.wishlistItem.deleteMany({ where: { buyerId } });
    await prisma.review.deleteMany({ where: { productId: { in: [publishedProduct1Id, publishedProduct2Id, draftProductId] } } });
    await prisma.image.deleteMany({ where: { productId: { in: [publishedProduct1Id, publishedProduct2Id, draftProductId] } } });
    await prisma.inventory.deleteMany({ where: { productId: { in: [publishedProduct1Id, publishedProduct2Id, draftProductId] } } });
    await prisma.product.deleteMany({ where: { id: { in: [publishedProduct1Id, publishedProduct2Id, draftProductId] } } });
    await prisma.artisan.deleteMany({ where: { id: artisanId } });
    await prisma.buyer.deleteMany({ where: { id: buyerId } });
    await prisma.user.deleteMany({ where: { id: { in: [artisanUserId, buyerUserId] } } });
    await redisClient.quit();
  });

  describe('GET /api/v1/marketplace/products', () => {
    it('should list only published products (draft excluded)', async () => {
      const res = await request(app).get('/api/v1/marketplace/products');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const products = res.body.data.products;
      const ids = products.map((p: any) => p.productId);

      expect(ids).toContain(publishedProduct1Id);
      expect(ids).toContain(publishedProduct2Id);
      expect(ids).not.toContain(draftProductId); // DRAFT MUST NOT APPEAR
    });

    it('should support safe pagination and pagination metadata', async () => {
      const res = await request(app).get('/api/v1/marketplace/products?page=1&limit=1');

      expect(res.status).toBe(200);
      expect(res.body.data.products.length).toBe(1);
      expect(res.body.data.pagination.page).toBe(1);
      expect(res.body.data.pagination.limit).toBe(1);
      expect(res.body.data.pagination.totalItems).toBeGreaterThanOrEqual(2);
      expect(res.body.data.pagination.hasNextPage).toBe(true);
    });

    it('should reject invalid pagination (limit > 50 or limit <= 0)', async () => {
      const res = await request(app).get('/api/v1/marketplace/products?limit=100');
      expect(res.status).toBe(400);
    });

    it('should search products by keyword case-insensitively', async () => {
      const res = await request(app).get('/api/v1/marketplace/products?search=elephant');

      expect(res.status).toBe(200);
      const products = res.body.data.products;
      expect(products.some((p: any) => p.productId === publishedProduct1Id)).toBe(true);
      expect(products.some((p: any) => p.productId === publishedProduct2Id)).toBe(false);
    });

    it('should filter products by category', async () => {
      const res = await request(app).get('/api/v1/marketplace/products?category=Handicrafts');

      expect(res.status).toBe(200);
      const products = res.body.data.products;
      expect(products.every((p: any) => p.category.toLowerCase() === 'handicrafts')).toBe(true);
    });

    it('should filter products by state', async () => {
      const res = await request(app).get('/api/v1/marketplace/products?state=Rajasthan');

      expect(res.status).toBe(200);
      const products = res.body.data.products;
      expect(products.every((p: any) => p.artisan.state.toLowerCase() === 'rajasthan')).toBe(true);
    });

    it('should filter products by price range', async () => {
      const res = await request(app).get('/api/v1/marketplace/products?minPrice=1000&maxPrice=1500');

      expect(res.status).toBe(200);
      const products = res.body.data.products;
      expect(products.some((p: any) => p.productId === publishedProduct1Id)).toBe(true);
      expect(products.some((p: any) => p.productId === publishedProduct2Id)).toBe(false);
    });

    it('should sort products by price ascending', async () => {
      const res = await request(app).get('/api/v1/marketplace/products?sort=price_low_to_high');

      expect(res.status).toBe(200);
      const products = res.body.data.products;
      for (let i = 0; i < products.length - 1; i++) {
        expect(products[i].price).toBeLessThanOrEqual(products[i + 1].price);
      }
    });

    it('should return isFavorite = true for authenticated buyer when item is in wishlist', async () => {
      const res = await request(app)
        .get('/api/v1/marketplace/products')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      const p1 = res.body.data.products.find((p: any) => p.productId === publishedProduct1Id);
      const p2 = res.body.data.products.find((p: any) => p.productId === publishedProduct2Id);

      expect(p1.isFavorite).toBe(true);
      expect(p2.isFavorite).toBe(false);
    });

    it('should return isFavorite = false for unauthenticated guests', async () => {
      const res = await request(app).get('/api/v1/marketplace/products');

      expect(res.status).toBe(200);
      const p1 = res.body.data.products.find((p: any) => p.productId === publishedProduct1Id);
      expect(p1.isFavorite).toBe(false);
    });
  });

  describe('GET /api/v1/marketplace/products/:productId', () => {
    it('should return public product details with sanitized artisan profile', async () => {
      const res = await request(app).get(`/api/v1/marketplace/products/${publishedProduct1Id}`);

      expect(res.status).toBe(200);
      const p = res.body.data;
      expect(p.productName).toBe('Teak Wood Carved Elephant');
      expect(p.stock).toBe(10);
      expect(p.isAvailable).toBe(true);
      expect(p.artisan.businessName).toBe('Sharma Handicrafts');
      expect(p.artisan.state).toBe('Rajasthan');

      // Ensure NO sensitive private data leaked
      expect(p.artisan.phone).toBeUndefined();
      expect(p.artisan.userId).toBeUndefined();
    });

    it('should return 404 for draft or non-existent product', async () => {
      const res = await request(app).get(`/api/v1/marketplace/products/${draftProductId}`);
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/marketplace/artisans/:sellerId', () => {
    it('should return public artisan profile and their published products', async () => {
      const res = await request(app).get(`/api/v1/marketplace/artisans/${artisanId}`);

      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data.businessName).toBe('Sharma Handicrafts');
      expect(data.craftType).toBe('Wood Carving');
      expect(data.featuredProducts.length).toBeGreaterThanOrEqual(2);
      expect(data.phone).toBeUndefined(); // Security check
    });

    it('should return 404 for non-existent artisan', async () => {
      const res = await request(app).get('/api/v1/marketplace/artisans/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/marketplace/artisans/:sellerId/products', () => {
    it('should return paginated published products for an artisan', async () => {
      const res = await request(app).get(`/api/v1/marketplace/artisans/${artisanId}/products?page=1&limit=10`);

      expect(res.status).toBe(200);
      expect(res.body.data.products.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data.pagination.page).toBe(1);
    });
  });

  describe('GET /api/v1/marketplace/categories and filters', () => {
    it('should return distinct categories', async () => {
      const res = await request(app).get('/api/v1/marketplace/categories');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toContain('Handicrafts');
      expect(res.body.data).toContain('Pottery');
    });

    it('should return filter values for frontend dropdowns', async () => {
      const res = await request(app).get('/api/v1/marketplace/filters');

      expect(res.status).toBe(200);
      const f = res.body.data;
      expect(f.categories).toContain('Handicrafts');
      expect(f.craftTypes).toContain('Wood Carving');
      expect(f.materials).toContain('Teak Wood');
      expect(f.states).toContain('Rajasthan');
    });
  });

  describe('GET /api/v1/marketplace/products/:productId/reviews', () => {
    it('should return product reviews and rating summary', async () => {
      const res = await request(app).get(`/api/v1/marketplace/products/${publishedProduct1Id}/reviews`);

      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data.reviews.length).toBe(1);
      expect(data.reviews[0].rating).toBe(5);
      expect(data.reviews[0].reviewText).toContain('Exceptional craftsmanship');
    });
  });
});
