import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/prisma';
import { redisClient } from '../src/config/redis';
import jwt from 'jsonwebtoken';
import { UserRole, ProductStatus } from '@prisma/client';

describe('Phase 6 - Wishlist API', () => {
  let buyer1UserId: string;
  let buyer1Id: string;
  let buyer1Token: string;

  let buyer2UserId: string;
  let buyer2Id: string;
  let buyer2Token: string;

  let artisanUserId: string;
  let artisanId: string;
  let artisanToken: string;

  let publishedProductId: string;
  let draftProductId: string;

  const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-do-not-use-in-prod';

  beforeAll(async () => {
    // 1. Create Artisan
    const artisanUser = await prisma.user.create({
      data: {
        phone: '+919733001122',
        role: UserRole.ARTISAN,
        name: 'Artisan Dev',
        isVerified: true,
      },
    });
    artisanUserId = artisanUser.id;

    const artisan = await prisma.artisan.create({
      data: {
        userId: artisanUser.id,
        businessName: 'Craft Studio',
      },
    });
    artisanId = artisan.id;
    artisanToken = jwt.sign({ id: artisanUser.id, phone: artisanUser.phone, role: artisanUser.role }, JWT_SECRET, { expiresIn: '1h' });

    // 2. Create Buyer 1
    const user1 = await prisma.user.create({
      data: {
        phone: '+919744001122',
        role: UserRole.BUYER,
        name: 'Buyer Alpha',
        isVerified: true,
      },
    });
    buyer1UserId = user1.id;

    const buyer1 = await prisma.buyer.create({
      data: { userId: user1.id },
    });
    buyer1Id = buyer1.id;
    buyer1Token = jwt.sign({ id: user1.id, phone: user1.phone, role: user1.role }, JWT_SECRET, { expiresIn: '1h' });

    // 3. Create Buyer 2
    const user2 = await prisma.user.create({
      data: {
        phone: '+919755001122',
        role: UserRole.BUYER,
        name: 'Buyer Beta',
        isVerified: true,
      },
    });
    buyer2UserId = user2.id;

    const buyer2 = await prisma.buyer.create({
      data: { userId: user2.id },
    });
    buyer2Id = buyer2.id;
    buyer2Token = jwt.sign({ id: user2.id, phone: user2.phone, role: user2.role }, JWT_SECRET, { expiresIn: '1h' });

    // 4. Create Published Product
    const p1 = await prisma.product.create({
      data: {
        sellerId: artisan.id,
        name: 'Kalamkari Hand-painted Shawl',
        price: 1800,
        category: 'Textiles',
        status: ProductStatus.PUBLISHED,
      },
    });
    publishedProductId = p1.id;

    // 5. Create Draft Product
    const p2 = await prisma.product.create({
      data: {
        sellerId: artisan.id,
        name: 'Draft Silk Scarf',
        price: 800,
        status: ProductStatus.DRAFT,
      },
    });
    draftProductId = p2.id;
  });

  afterAll(async () => {
    await prisma.wishlistItem.deleteMany({ where: { buyerId: { in: [buyer1Id, buyer2Id] } } });
    await prisma.product.deleteMany({ where: { id: { in: [publishedProductId, draftProductId] } } });
    await prisma.artisan.deleteMany({ where: { id: artisanId } });
    await prisma.buyer.deleteMany({ where: { id: { in: [buyer1Id, buyer2Id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [buyer1UserId, buyer2UserId, artisanUserId] } } });
    await redisClient.quit();
  });

  it('should reject unauthenticated request', async () => {
    const res = await request(app).get('/api/v1/wishlist');
    expect(res.status).toBe(401);
  });

  it('should reject non-BUYER role (e.g. ARTISAN) from accessing wishlist', async () => {
    const res = await request(app)
      .get('/api/v1/wishlist')
      .set('Authorization', `Bearer ${artisanToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Requires BUYER role');
  });

  it('should reject adding unpublished product to wishlist', async () => {
    const res = await request(app)
      .post(`/api/v1/wishlist/${draftProductId}`)
      .set('Authorization', `Bearer ${buyer1Token}`);
    expect(res.status).toBe(404);
  });

  it('should add published product to wishlist', async () => {
    const res = await request(app)
      .post(`/api/v1/wishlist/${publishedProductId}`)
      .set('Authorization', `Bearer ${buyer1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.productId).toBe(publishedProductId);
  });

  it('should prevent duplicate wishlist entries (idempotent)', async () => {
    const res = await request(app)
      .post(`/api/v1/wishlist/${publishedProductId}`)
      .set('Authorization', `Bearer ${buyer1Token}`);

    expect(res.status).toBe(200);

    const count = await prisma.wishlistItem.count({
      where: { buyerId: buyer1Id, productId: publishedProductId },
    });
    expect(count).toBe(1);
  });

  it('should get buyer wishlist items with product details', async () => {
    const res = await request(app)
      .get('/api/v1/wishlist')
      .set('Authorization', `Bearer ${buyer1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].productId).toBe(publishedProductId);
    expect(res.body.data[0].productName).toBe('Kalamkari Hand-painted Shawl');
  });

  it('should isolate wishlist across buyers (Buyer B cannot see Buyer A items)', async () => {
    const res = await request(app)
      .get('/api/v1/wishlist')
      .set('Authorization', `Bearer ${buyer2Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0); // Buyer 2 has empty wishlist
  });

  it('should remove product from wishlist', async () => {
    const res = await request(app)
      .delete(`/api/v1/wishlist/${publishedProductId}`)
      .set('Authorization', `Bearer ${buyer1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.removed).toBe(true);

    const listRes = await request(app)
      .get('/api/v1/wishlist')
      .set('Authorization', `Bearer ${buyer1Token}`);

    expect(listRes.body.data.length).toBe(0);
  });
});
