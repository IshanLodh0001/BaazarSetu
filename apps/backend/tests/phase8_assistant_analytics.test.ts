import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/prisma';
import jwt from 'jsonwebtoken';
import { UserRole, ProductStatus, StockStatus, OrderStatus, PaymentStatus, EnquiryStatus } from '@prisma/client';

describe('Phase 8 - AI Business Assistant, Analytics & Production Readiness', () => {
  let artisan1UserId: string;
  let artisan1Id: string;
  let artisan1Token: string;

  let artisan2UserId: string;
  let artisan2Id: string;
  let artisan2Token: string;

  let buyer1UserId: string;
  let buyer1Id: string;
  let buyer1Token: string;

  let product1Id: string; // Fast moving, Price ₹500, Available 2, Sold 10, ReorderLevel 5 (Low Stock)
  let product2Id: string; // Out of stock, Price ₹1200, Available 0, Sold 4 (Out of Stock)
  let product3Id: string; // Slow moving, Price ₹800, Available 15, Sold 0
  let order1Id: string;
  let order2Id: string;
  let cancelledOrderId: string;
  let enquiry1Id: string;

  const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-do-not-use-in-prod';

  beforeAll(async () => {
    // 1. Setup Artisan 1
    const artUser1 = await prisma.user.create({
      data: { phone: '+919988771101', role: UserRole.ARTISAN, isVerified: true, name: 'Ramesh Sharma' },
    });
    artisan1UserId = artUser1.id;
    const art1 = await prisma.artisan.create({
      data: {
        userId: artUser1.id,
        businessName: 'Sharma Heritage Crafts',
        craftType: 'Wood Carving',
        rating: 4.8,
      },
    });
    artisan1Id = art1.id;
    artisan1Token = jwt.sign(
      { id: artUser1.id, phone: artUser1.phone, role: artUser1.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 2. Setup Artisan 2 (Fresh artisan with 0 orders)
    const artUser2 = await prisma.user.create({
      data: { phone: '+919988771102', role: UserRole.ARTISAN, isVerified: true, name: 'Deepa Verma' },
    });
    artisan2UserId = artUser2.id;
    const art2 = await prisma.artisan.create({
      data: {
        userId: artUser2.id,
        businessName: 'Verma Handlooms',
        craftType: 'Textiles',
      },
    });
    artisan2Id = art2.id;
    artisan2Token = jwt.sign(
      { id: artUser2.id, phone: artUser2.phone, role: artUser2.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 3. Setup Buyer 1
    const bUser1 = await prisma.user.create({
      data: { phone: '+919988771103', role: UserRole.BUYER, isVerified: true, name: 'Ananya Roy' },
    });
    buyer1UserId = bUser1.id;
    const b1 = await prisma.buyer.create({
      data: { userId: bUser1.id, companyName: 'Roy Handicraft Boutiques' },
    });
    buyer1Id = b1.id;
    buyer1Token = jwt.sign(
      { id: bUser1.id, phone: bUser1.phone, role: bUser1.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 4. Products for Artisan 1
    const p1 = await prisma.product.create({
      data: {
        sellerId: artisan1Id,
        name: 'Carved Sheesham Wood Box',
        category: 'Home Decor',
        price: 500,
        status: ProductStatus.PUBLISHED,
        aiSuggestedPrice: 550,
        inventory: {
          create: {
            availableQuantity: 2, // <= reorderLevel 5 -> LOW STOCK
            soldQuantity: 10,     // Fast moving
            reorderLevel: 5,
            stockStatus: StockStatus.LOW_STOCK,
          },
        },
      },
    });
    product1Id = p1.id;

    const p2 = await prisma.product.create({
      data: {
        sellerId: artisan1Id,
        name: 'Handcrafted Sandalwood Elephant',
        category: 'Sculptures',
        price: 1200,
        status: ProductStatus.PUBLISHED,
        inventory: {
          create: {
            availableQuantity: 0, // OUT OF STOCK
            soldQuantity: 4,
            reorderLevel: 3,
            stockStatus: StockStatus.OUT_OF_STOCK,
          },
        },
      },
    });
    product2Id = p2.id;

    const p3 = await prisma.product.create({
      data: {
        sellerId: artisan1Id,
        name: 'Vintage Wooden Mirror Frame',
        category: 'Home Decor',
        price: 800,
        status: ProductStatus.PUBLISHED,
        inventory: {
          create: {
            availableQuantity: 15,
            soldQuantity: 0, // SLOW MOVING
            reorderLevel: 5,
            stockStatus: StockStatus.IN_STOCK,
          },
        },
      },
    });
    product3Id = p3.id;

    // 5. Orders for Artisan 1
    // Order 1: Completed COD order, total ₹1000
    const o1 = await prisma.order.create({
      data: {
        buyerId: buyer1Id,
        sellerId: artisan1Id,
        totalQuantity: 2,
        subtotal: 1000,
        totalAmount: 1000,
        paymentMethod: 'COD',
        paymentStatus: PaymentStatus.COMPLETED,
        orderStatus: OrderStatus.DELIVERED,
        shippingAddress: '45 Lake View Road, Udaipur',
        items: {
          create: [
            { productId: product1Id, quantity: 2, unitPrice: 500, totalPrice: 1000 },
          ],
        },
      },
    });
    order1Id = o1.id;

    // Order 2: Processing MOCK_ONLINE order, total ₹2400
    const o2 = await prisma.order.create({
      data: {
        buyerId: buyer1Id,
        sellerId: artisan1Id,
        totalQuantity: 2,
        subtotal: 2400,
        totalAmount: 2400,
        paymentMethod: 'MOCK_ONLINE',
        paymentStatus: PaymentStatus.COMPLETED,
        orderStatus: OrderStatus.PROCESSING,
        shippingAddress: '45 Lake View Road, Udaipur',
        items: {
          create: [
            { productId: product2Id, quantity: 2, unitPrice: 1200, totalPrice: 2400 },
          ],
        },
      },
    });
    order2Id = o2.id;

    // Order 3: Cancelled order, total ₹800 (MUST NOT be counted in revenue!)
    const o3 = await prisma.order.create({
      data: {
        buyerId: buyer1Id,
        sellerId: artisan1Id,
        totalQuantity: 1,
        subtotal: 800,
        totalAmount: 800,
        paymentMethod: 'COD',
        paymentStatus: PaymentStatus.PENDING,
        orderStatus: OrderStatus.CANCELLED,
        shippingAddress: '45 Lake View Road, Udaipur',
        items: {
          create: [
            { productId: product3Id, quantity: 1, unitPrice: 800, totalPrice: 800 },
          ],
        },
      },
    });
    cancelledOrderId = o3.id;

    // 6. Pending B2B Enquiry for Artisan 1
    const enq = await prisma.enquiry.create({
      data: {
        buyerId: buyer1Id,
        sellerId: artisan1Id,
        productId: product1Id,
        requiredQuantity: 50,
        proposedPrice: 450,
        budget: 22500,
        message: 'Need 50 carved wood boxes for Diwali gifts.',
        status: EnquiryStatus.PENDING,
      },
    });
    enquiry1Id = enq.id;
  });

  afterAll(async () => {
    // Clean up
    await prisma.notification.deleteMany({
      where: { userId: { in: [artisan1UserId, artisan2UserId, buyer1UserId] } },
    });
    await prisma.enquiry.deleteMany({
      where: { id: enquiry1Id },
    });
    await prisma.orderItem.deleteMany({
      where: { orderId: { in: [order1Id, order2Id, cancelledOrderId] } },
    });
    await prisma.order.deleteMany({
      where: { id: { in: [order1Id, order2Id, cancelledOrderId] } },
    });
    await prisma.inventory.deleteMany({
      where: { productId: { in: [product1Id, product2Id, product3Id] } },
    });
    await prisma.product.deleteMany({
      where: { id: { in: [product1Id, product2Id, product3Id] } },
    });
    await prisma.buyer.deleteMany({ where: { id: buyer1Id } });
    await prisma.artisan.deleteMany({ where: { id: { in: [artisan1Id, artisan2Id] } } });
    await prisma.user.deleteMany({
      where: { id: { in: [artisan1UserId, artisan2UserId, buyer1UserId] } },
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Production Readiness & Security Tests
  // ─────────────────────────────────────────────────────────────────────────────
  describe('1. Production Readiness & Security', () => {
    it('should include Helmet security headers in HTTP responses', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-dns-prefetch-control']).toBeDefined();
    });

    it('should reject unauthenticated requests to protected analytics endpoints with 401', async () => {
      const res = await request(app).get('/api/v1/artisan/analytics/overview');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject non-artisan (BUYER) access to seller analytics with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/artisan/analytics/overview')
        .set('Authorization', `Bearer ${buyer1Token}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject non-artisan (BUYER) access to AI Business Assistant with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/ai/business-assistant')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .send({ message: 'How are my sales?' });
      expect(res.status).toBe(403);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Seller Analytics & Dashboard
  // ─────────────────────────────────────────────────────────────────────────────
  describe('2. Seller Analytics & Business Dashboard', () => {
    it('should return comprehensive overview dashboard with authoritative revenue (excluding cancelled orders)', async () => {
      const res = await request(app)
        .get('/api/v1/artisan/analytics/overview')
        .set('Authorization', `Bearer ${artisan1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;

      // Revenue: Order 1 (1000) + Order 2 (2400) = 3400. Cancelled order 3 (800) must NOT be included!
      expect(data.sales.totalRevenue).toBe(3400);
      expect(data.sales.totalOrders).toBe(3);
      expect(data.sales.activeOrders).toBe(2);
      expect(data.sales.cancelledOrders).toBe(1);
      // Average Order Value = 3400 / 2 active orders = 1700
      expect(data.sales.averageOrderValue).toBe(1700);

      // Order status counts
      expect(data.sales.ordersByStatus.delivered).toBe(1);
      expect(data.sales.ordersByStatus.processing).toBe(1);
      expect(data.sales.ordersByStatus.cancelled).toBe(1);

      // Inventory summary
      expect(data.inventory.totalProducts).toBe(3);
      expect(data.inventory.lowStockProducts).toBe(1); // product 1 (2 left <= 5)
      expect(data.inventory.outOfStockProducts).toBe(1); // product 2 (0 left)

      // Top selling products
      expect(data.topSellingProducts.length).toBeGreaterThanOrEqual(1);
      expect(data.topSellingProducts[0].name).toBeDefined();

      // B2B enquiries summary
      expect(data.b2bEnquiries.total).toBe(1);
      expect(data.b2bEnquiries.pending).toBe(1);
    });

    it('should filter analytics with date range parameters (from, to)', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const res = await request(app)
        .get(`/api/v1/artisan/analytics/overview?from=${today}&to=${today}`)
        .set('Authorization', `Bearer ${artisan1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sales.totalRevenue).toBe(3400);
    });

    it('should reject invalid date formats with 400 Bad Request', async () => {
      const res = await request(app)
        .get('/api/v1/artisan/analytics/overview?from=not-a-date')
        .set('Authorization', `Bearer ${artisan1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid date parameters');
    });

    it('should return clean empty metrics for a new artisan with zero orders', async () => {
      const res = await request(app)
        .get('/api/v1/artisan/analytics/overview')
        .set('Authorization', `Bearer ${artisan2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.sales.totalRevenue).toBe(0);
      expect(res.body.data.sales.totalOrders).toBe(0);
      expect(res.body.data.sales.activeOrders).toBe(0);
      expect(res.body.data.sales.averageOrderValue).toBe(0);
      expect(res.body.data.topSellingProducts.length).toBe(0);
    });

    it('should get detailed sales analytics with payment method breakdown (COD vs ONLINE)', async () => {
      const res = await request(app)
        .get('/api/v1/artisan/analytics/sales')
        .set('Authorization', `Bearer ${artisan1Token}`);

      expect(res.status).toBe(200);
      const sales = res.body.data;
      expect(sales.totalRevenue).toBe(3400);
      expect(sales.paymentMethodSplit.COD.orders).toBe(1);
      expect(sales.paymentMethodSplit.COD.revenue).toBe(1000);
      expect(sales.paymentMethodSplit.MOCK_ONLINE.orders).toBe(1);
      expect(sales.paymentMethodSplit.MOCK_ONLINE.revenue).toBe(2400);
    });

    it('should get product-by-product performance analytics', async () => {
      const res = await request(app)
        .get('/api/v1/artisan/analytics/products')
        .set('Authorization', `Bearer ${artisan1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalProducts).toBe(3);
      expect(res.body.data.publishedProducts).toBe(3);
      expect(res.body.data.products.length).toBe(3);
    });

    it('should get inventory analytics and capital tied in stock', async () => {
      const res = await request(app)
        .get('/api/v1/artisan/analytics/inventory')
        .set('Authorization', `Bearer ${artisan1Token}`);

      expect(res.status).toBe(200);
      const inv = res.body.data;
      expect(inv.totalProducts).toBe(3);
      // Capital tied: p1 (2 * 500 = 1000) + p2 (0 * 1200 = 0) + p3 (15 * 800 = 12000) = 13000
      expect(inv.totalCapitalTied).toBe(13000);
      expect(inv.stockHealth.lowStockCount).toBe(1);
      expect(inv.stockHealth.outOfStockCount).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Inventory Intelligence
  // ─────────────────────────────────────────────────────────────────────────────
  describe('3. Inventory Intelligence', () => {
    it('should identify low stock, out of stock, fast-moving and restock recommendations', async () => {
      const res = await request(app)
        .get('/api/v1/artisan/inventory/insights')
        .set('Authorization', `Bearer ${artisan1Token}`);

      expect(res.status).toBe(200);
      const data = res.body.data;

      // Check classifications
      expect(data.lowStock.length).toBe(1);
      expect(data.lowStock[0].name).toBe('Carved Sheesham Wood Box');

      expect(data.outOfStock.length).toBe(1);
      expect(data.outOfStock[0].name).toBe('Handcrafted Sandalwood Elephant');

      expect(data.fastMoving.length).toBeGreaterThanOrEqual(1);
      expect(data.slowMoving.length).toBe(1);
      expect(data.slowMoving[0].name).toBe('Vintage Wooden Mirror Frame');

      // Restock recommendations
      expect(data.restockRecommendations.length).toBe(2);
      const criticalRec = data.restockRecommendations.find((r: any) => r.urgency === 'CRITICAL');
      expect(criticalRec).toBeDefined();
      expect(criticalRec.name).toBe('Handcrafted Sandalwood Elephant');
    });

    it('should return clear explanation when historical sales are insufficient', async () => {
      const res = await request(app)
        .get('/api/v1/artisan/inventory/insights')
        .set('Authorization', `Bearer ${artisan2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe('Insufficient sales history for reliable demand prediction.');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. AI Business Recommendations
  // ─────────────────────────────────────────────────────────────────────────────
  describe('4. AI Business Recommendations', () => {
    it('should generate prioritized recommendations for restock, pending B2B, and catalog quality', async () => {
      const res = await request(app)
        .get('/api/v1/artisan/recommendations')
        .set('Authorization', `Bearer ${artisan1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;
      expect(data.recommendations.length).toBeGreaterThanOrEqual(2);

      // Verify pending B2B recommendation
      const b2bRec = data.recommendations.find((r: any) => r.type === 'PENDING_B2B');
      expect(b2bRec).toBeDefined();
      expect(b2bRec.priority).toBe('high');

      // Verify restock recommendation
      const restockRec = data.recommendations.find((r: any) => r.type === 'RESTOCK_ALERT');
      expect(restockRec).toBeDefined();
      expect(restockRec.priority).toBe('high');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. AI Business Assistant
  // ─────────────────────────────────────────────────────────────────────────────
  describe('5. AI Business Assistant', () => {
    it('should answer sales questions grounded in authoritative database numbers', async () => {
      const res = await request(app)
        .post('/api/v1/ai/business-assistant')
        .set('Authorization', `Bearer ${artisan1Token}`)
        .send({
          message: 'How much did I earn and how are my sales?',
          language: 'en',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const assistant = res.body.data;

      expect(assistant.message).toBeDefined();
      expect(assistant.insights.length).toBeGreaterThan(0);
      expect(assistant.data.totalRevenue).toBe(3400);
      expect(assistant.data.totalOrders).toBe(3);
      expect(assistant.data.activeOrders).toBe(2);
      expect(assistant.data.cancelledOrders).toBe(1);
      expect(assistant.data.pendingEnquiriesCount).toBe(1);
    });

    it('should answer stock and inventory queries with real product status', async () => {
      const res = await request(app)
        .post('/api/v1/ai/business-assistant')
        .set('Authorization', `Bearer ${artisan1Token}`)
        .send({
          message: 'Which products have low stock or need restocking?',
          language: 'en',
        });

      expect(res.status).toBe(200);
      const assistant = res.body.data;
      expect(assistant.data.lowStockCount).toBe(1);
      expect(assistant.data.outOfStockCount).toBe(1);
      expect(assistant.recommendations.length).toBeGreaterThan(0);
    });

    it('should support multilingual assistance in Hindi (hi)', async () => {
      const res = await request(app)
        .post('/api/v1/ai/business-assistant')
        .set('Authorization', `Bearer ${artisan1Token}`)
        .send({
          message: 'मुझे इस हफ्ते किस चीज़ पर ध्यान देना चाहिए?',
          language: 'hi',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.language).toBe('hi');
      expect(res.body.data.message).toBeDefined();
      expect(typeof res.body.data.message).toBe('string');
      expect(res.body.data.message.length).toBeGreaterThan(10);
    });

    it('should work via the alias endpoint /api/v1/assistant/chat', async () => {
      const res = await request(app)
        .post('/api/v1/assistant/chat')
        .set('Authorization', `Bearer ${artisan1Token}`)
        .send({
          message: 'Show my sales summary.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.data.totalRevenue).toBe(3400);
    });

    it('should reject queries with invalid message length', async () => {
      const res = await request(app)
        .post('/api/v1/ai/business-assistant')
        .set('Authorization', `Bearer ${artisan1Token}`)
        .send({ message: 'a' }); // < 2 chars

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });
  });
});
