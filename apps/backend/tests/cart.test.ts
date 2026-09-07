import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/prisma';
import { redisClient } from '../src/config/redis';
import jwt from 'jsonwebtoken';
import { UserRole, ProductStatus, StockStatus } from '@prisma/client';

describe('Phase 6 - Cart API', () => {
  let buyer1UserId: string;
  let buyer1Id: string;
  let buyer1Token: string;

  let buyer2UserId: string;
  let buyer2Id: string;
  let buyer2Token: string;

  let artisan1UserId: string;
  let artisan1Id: string;
  let artisan1Token: string;

  let artisan2UserId: string;
  let artisan2Id: string;

  let product1Id: string; // Artisan 1, Price ₹500, Stock 5
  let product2Id: string; // Artisan 2, Price ₹800, Stock 10
  let draftProductId: string; // Draft, Price ₹1000

  const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-do-not-use-in-prod';

  beforeAll(async () => {
    // 1. Artisan 1
    const artUser1 = await prisma.user.create({
      data: { phone: '+919766001122', role: UserRole.ARTISAN, isVerified: true },
    });
    artisan1UserId = artUser1.id;
    const art1 = await prisma.artisan.create({
      data: { userId: artUser1.id, businessName: 'Artisan Pottery Hub' },
    });
    artisan1Id = art1.id;
    artisan1Token = jwt.sign({ id: artUser1.id, phone: artUser1.phone, role: artUser1.role }, JWT_SECRET, { expiresIn: '1h' });

    // 2. Artisan 2
    const artUser2 = await prisma.user.create({
      data: { phone: '+919777001122', role: UserRole.ARTISAN, isVerified: true },
    });
    artisan2UserId = artUser2.id;
    const art2 = await prisma.artisan.create({
      data: { userId: artUser2.id, businessName: 'Weavers Collective' },
    });
    artisan2Id = art2.id;

    // 3. Buyer 1
    const bUser1 = await prisma.user.create({
      data: { phone: '+919788001122', role: UserRole.BUYER, isVerified: true },
    });
    buyer1UserId = bUser1.id;
    const b1 = await prisma.buyer.create({
      data: { userId: bUser1.id, companyName: 'Retailer One' },
    });
    buyer1Id = b1.id;
    buyer1Token = jwt.sign({ id: bUser1.id, phone: bUser1.phone, role: bUser1.role }, JWT_SECRET, { expiresIn: '1h' });

    // 4. Buyer 2
    const bUser2 = await prisma.user.create({
      data: { phone: '+919799001122', role: UserRole.BUYER, isVerified: true },
    });
    buyer2UserId = bUser2.id;
    const b2 = await prisma.buyer.create({
      data: { userId: bUser2.id, companyName: 'Retailer Two' },
    });
    buyer2Id = b2.id;
    buyer2Token = jwt.sign({ id: bUser2.id, phone: bUser2.phone, role: bUser2.role }, JWT_SECRET, { expiresIn: '1h' });

    // 5. Products
    const p1 = await prisma.product.create({
      data: {
        sellerId: art1.id,
        name: 'Clay Tea Cup Set',
        price: 500,
        status: ProductStatus.PUBLISHED,
      },
    });
    product1Id = p1.id;
    await prisma.inventory.create({
      data: { productId: p1.id, availableQuantity: 5, stockStatus: StockStatus.IN_STOCK },
    });

    const p2 = await prisma.product.create({
      data: {
        sellerId: art2.id,
        name: 'Khadi Cotton Stole',
        price: 800,
        status: ProductStatus.PUBLISHED,
      },
    });
    product2Id = p2.id;
    await prisma.inventory.create({
      data: { productId: p2.id, availableQuantity: 10, stockStatus: StockStatus.IN_STOCK },
    });

    const pDraft = await prisma.product.create({
      data: {
        sellerId: art1.id,
        name: 'Draft Product',
        price: 1000,
        status: ProductStatus.DRAFT,
      },
    });
    draftProductId = pDraft.id;
  });

  afterAll(async () => {
    // Clean up
    const buyerIds = [buyer1Id, buyer2Id];
    const carts = await prisma.cart.findMany({ where: { buyerId: { in: buyerIds } } });
    const cartIds = carts.map(c => c.id);
    await prisma.cartItem.deleteMany({ where: { cartId: { in: cartIds } } });
    await prisma.cart.deleteMany({ where: { id: { in: cartIds } } });
    await prisma.inventory.deleteMany({ where: { productId: { in: [product1Id, product2Id, draftProductId] } } });
    await prisma.product.deleteMany({ where: { id: { in: [product1Id, product2Id, draftProductId] } } });
    await prisma.artisan.deleteMany({ where: { id: { in: [artisan1Id, artisan2Id] } } });
    await prisma.buyer.deleteMany({ where: { id: { in: buyerIds } } });
    await prisma.user.deleteMany({ where: { id: { in: [buyer1UserId, buyer2UserId, artisan1UserId, artisan2UserId] } } });
    await redisClient.quit();
  });

  it('should reject unauthenticated request', async () => {
    const res = await request(app).get('/api/v1/cart');
    expect(res.status).toBe(401);
  });

  it('should reject non-BUYER role (e.g. ARTISAN) from cart', async () => {
    const res = await request(app)
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${artisan1Token}`);
    expect(res.status).toBe(403);
  });

  it('should reject adding invalid quantity (<= 0)', async () => {
    const res = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ productId: product1Id, quantity: 0 });
    expect(res.status).toBe(400);
  });

  it('should reject adding draft product to cart', async () => {
    const res = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ productId: draftProductId, quantity: 1 });
    expect(res.status).toBe(400);
  });

  it('should reject quantity exceeding available stock with 400 Bad Request', async () => {
    // product1 has availableQuantity: 5, attempt to add 10
    const res = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ productId: product1Id, quantity: 10 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Requested quantity exceeds available stock.');
  });

  it('should add product to cart and calculate price authoritatively from database', async () => {
    // Attempting to send a spoofed unitPrice: 10, should be completely ignored
    const res = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ productId: product1Id, quantity: 2, unitPrice: 10 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const cart = res.body.data;
    expect(cart.totalItems).toBe(2);
    // Real DB price is ₹500, 2 * 500 = ₹1000
    expect(cart.subtotal).toBe(1000);
    expect(cart.totalAmount).toBe(1000);
    expect(cart.items.length).toBe(1);
    expect(cart.items[0].unitPrice).toBe(500);
    expect(cart.items[0].totalPrice).toBe(1000);
  });

  it('should update cart item quantity and recalculate subtotal', async () => {
    // Update quantity from 2 to 3
    const res = await request(app)
      .patch(`/api/v1/cart/items/${product1Id}`)
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ quantity: 3 });

    expect(res.status).toBe(200);
    const cart = res.body.data;
    expect(cart.totalItems).toBe(3);
    expect(cart.subtotal).toBe(1500); // 3 * 500
  });

  it('should reject updating quantity to exceed available stock', async () => {
    // Available quantity is 5, attempt to update to 8
    const res = await request(app)
      .patch(`/api/v1/cart/items/${product1Id}`)
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ quantity: 8 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Requested quantity exceeds available stock.');
  });

  it('should support multi-seller cart and group by artisan', async () => {
    // Add product 2 from Artisan 2 (price ₹800, qty: 1)
    const res = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ productId: product2Id, quantity: 1 });

    expect(res.status).toBe(200);
    const cart = res.body.data;
    expect(cart.items.length).toBe(2);
    // Subtotal = 3 * 500 (₹1500) + 1 * 800 (₹800) = ₹2300
    expect(cart.subtotal).toBe(2300);
    expect(cart.sellers.length).toBe(2);
    expect(cart.sellers.some((s: any) => s.sellerId === artisan1Id)).toBe(true);
    expect(cart.sellers.some((s: any) => s.sellerId === artisan2Id)).toBe(true);
  });

  it('should isolate cart across buyers (Buyer B cannot see Buyer A cart)', async () => {
    const res = await request(app)
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${buyer2Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.totalItems).toBe(0);
    expect(res.body.data.items.length).toBe(0);
    expect(res.body.data.subtotal).toBe(0);
  });

  it('should remove a single item from cart and recalculate subtotal', async () => {
    const res = await request(app)
      .delete(`/api/v1/cart/items/${product1Id}`)
      .set('Authorization', `Bearer ${buyer1Token}`);

    expect(res.status).toBe(200);
    const cart = res.body.data;
    expect(cart.items.length).toBe(1);
    expect(cart.items[0].productId).toBe(product2Id);
    expect(cart.subtotal).toBe(800);
    expect(cart.totalItems).toBe(1);
  });

  it('should clear entire cart', async () => {
    const res = await request(app)
      .delete('/api/v1/cart')
      .set('Authorization', `Bearer ${buyer1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBe(0);
    expect(res.body.data.subtotal).toBe(0);
    expect(res.body.data.totalItems).toBe(0);
  });
});
