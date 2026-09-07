import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/prisma';
import jwt from 'jsonwebtoken';
import { UserRole, ProductStatus, StockStatus, OrderStatus, PaymentStatus, EnquiryStatus } from '@prisma/client';

describe('Phase 7 - Orders, Payments & B2B Market Linkage', () => {
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
  let artisan2Token: string;

  let product1Id: string; // Artisan 1, Price ₹600, Stock 10
  let product2Id: string; // Artisan 2, Price ₹900, Stock 10
  let singleStockProductId: string; // Artisan 1, Price ₹1500, Stock 1

  let order1Id: string;
  let order2Id: string;
  let onlineOrderId: string;
  let enquiryId: string;

  const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-do-not-use-in-prod';

  beforeAll(async () => {
    // 1. Setup Artisan 1
    const artUser1 = await prisma.user.create({
      data: { phone: '+919811002233', role: UserRole.ARTISAN, isVerified: true },
    });
    artisan1UserId = artUser1.id;
    const art1 = await prisma.artisan.create({
      data: { userId: artUser1.id, businessName: 'Jaipur Blue Pottery Studio', craftType: 'Pottery' },
    });
    artisan1Id = art1.id;
    artisan1Token = jwt.sign(
      { id: artUser1.id, phone: artUser1.phone, role: artUser1.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 2. Setup Artisan 2
    const artUser2 = await prisma.user.create({
      data: { phone: '+919822002233', role: UserRole.ARTISAN, isVerified: true },
    });
    artisan2UserId = artUser2.id;
    const art2 = await prisma.artisan.create({
      data: { userId: artUser2.id, businessName: 'Kutch Shawl Emporium', craftType: 'Textiles' },
    });
    artisan2Id = art2.id;
    artisan2Token = jwt.sign(
      { id: artUser2.id, phone: artUser2.phone, role: artUser2.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 3. Setup Buyer 1
    const bUser1 = await prisma.user.create({
      data: { phone: '+919833002233', role: UserRole.BUYER, isVerified: true, name: 'Aarav Patel' },
    });
    buyer1UserId = bUser1.id;
    const b1 = await prisma.buyer.create({
      data: { userId: bUser1.id, companyName: 'Heritage Decor Boutique' },
    });
    buyer1Id = b1.id;
    buyer1Token = jwt.sign(
      { id: bUser1.id, phone: bUser1.phone, role: bUser1.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 4. Setup Buyer 2
    const bUser2 = await prisma.user.create({
      data: { phone: '+919844002233', role: UserRole.BUYER, isVerified: true, name: 'Priya Sharma' },
    });
    buyer2UserId = bUser2.id;
    const b2 = await prisma.buyer.create({
      data: { userId: bUser2.id, companyName: 'Urban Craft Store' },
    });
    buyer2Id = b2.id;
    buyer2Token = jwt.sign(
      { id: bUser2.id, phone: bUser2.phone, role: bUser2.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 5. Setup Products
    const p1 = await prisma.product.create({
      data: {
        sellerId: artisan1Id,
        name: 'Handcrafted Ceramic Vase',
        price: 600,
        status: ProductStatus.PUBLISHED,
        category: 'Home & Living',
        inventory: {
          create: {
            availableQuantity: 10,
            soldQuantity: 0,
            stockStatus: StockStatus.IN_STOCK,
          },
        },
      },
    });
    product1Id = p1.id;

    const p2 = await prisma.product.create({
      data: {
        sellerId: artisan2Id,
        name: 'Pure Pashmina Shawl',
        price: 900,
        status: ProductStatus.PUBLISHED,
        category: 'Clothing',
        inventory: {
          create: {
            availableQuantity: 10,
            soldQuantity: 0,
            stockStatus: StockStatus.IN_STOCK,
          },
        },
      },
    });
    product2Id = p2.id;

    const p3 = await prisma.product.create({
      data: {
        sellerId: artisan1Id,
        name: 'Single Piece Terracotta Lamp',
        price: 1500,
        status: ProductStatus.PUBLISHED,
        category: 'Lighting',
        inventory: {
          create: {
            availableQuantity: 1,
            soldQuantity: 0,
            stockStatus: StockStatus.IN_STOCK,
          },
        },
      },
    });
    singleStockProductId = p3.id;
  });

  afterAll(async () => {
    // Cleanup created test records
    await prisma.notification.deleteMany({
      where: { userId: { in: [buyer1UserId, buyer2UserId, artisan1UserId, artisan2UserId] } },
    });
    await prisma.review.deleteMany({
      where: { buyerId: { in: [buyer1Id, buyer2Id] } },
    });
    await prisma.enquiry.deleteMany({
      where: { buyerId: { in: [buyer1Id, buyer2Id] } },
    });
    await prisma.orderItem.deleteMany({
      where: { productId: { in: [product1Id, product2Id, singleStockProductId] } },
    });
    await prisma.payment.deleteMany({});
    await prisma.order.deleteMany({
      where: { buyerId: { in: [buyer1Id, buyer2Id] } },
    });
    await prisma.cartItem.deleteMany({
      where: { productId: { in: [product1Id, product2Id, singleStockProductId] } },
    });
    await prisma.cart.deleteMany({
      where: { buyerId: { in: [buyer1Id, buyer2Id] } },
    });
    await prisma.inventory.deleteMany({
      where: { productId: { in: [product1Id, product2Id, singleStockProductId] } },
    });
    await prisma.product.deleteMany({
      where: { id: { in: [product1Id, product2Id, singleStockProductId] } },
    });
    await prisma.artisan.deleteMany({
      where: { id: { in: [artisan1Id, artisan2Id] } },
    });
    await prisma.buyer.deleteMany({
      where: { id: { in: [buyer1Id, buyer2Id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [buyer1UserId, buyer2UserId, artisan1UserId, artisan2UserId] } },
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Checkout & Multi-Seller Order Splitting
  // ─────────────────────────────────────────────────────────────────────────────
  describe('1. Checkout & Order Creation', () => {
    it('should reject checkout when cart is empty', async () => {
      const res = await request(app)
        .post('/api/v1/orders/checkout')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .send({
          shippingAddress: '123 Test Street, New Delhi 110001',
          paymentMethod: 'COD',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Cart is empty');
    });

    it('should reject checkout with missing or invalid shipping address', async () => {
      const res = await request(app)
        .post('/api/v1/orders/checkout')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .send({
          shippingAddress: 'abc', // < 5 chars
          paymentMethod: 'COD',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('should reject checkout with invalid payment method', async () => {
      const res = await request(app)
        .post('/api/v1/orders/checkout')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .send({
          shippingAddress: '123 Test Street, New Delhi 110001',
          paymentMethod: 'CRYPTO',
        });

      expect(res.status).toBe(400);
    });

    it('should execute multi-seller checkout with COD, split orders, decrement inventory, and clear cart', async () => {
      // Add Product 1 (Artisan 1, qty: 2, unitPrice: 600)
      await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .send({ productId: product1Id, quantity: 2 });

      // Add Product 2 (Artisan 2, qty: 1, unitPrice: 900)
      await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .send({ productId: product2Id, quantity: 1 });

      const res = await request(app)
        .post('/api/v1/orders/checkout')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .send({
          shippingAddress: '45 Heritage Colony, Jaipur, Rajasthan 302001',
          paymentMethod: 'COD',
          notes: 'Deliver during afternoon hours',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const data = res.body.data;
      expect(data.checkoutReference).toMatch(/^CHK-/);
      expect(data.orders.length).toBe(2);
      expect(data.summary.totalOrders).toBe(2);
      // Total: (2 * 600) + (1 * 900) = 1200 + 900 = 2100
      expect(data.summary.grandTotal).toBe(2100);
      expect(data.summary.paymentMethod).toBe('COD');
      expect(data.summary.paymentStatus).toBe(PaymentStatus.PENDING);

      // Verify orders belong to respective sellers
      const art1Order = data.orders.find((o: any) => o.sellerId === artisan1Id);
      const art2Order = data.orders.find((o: any) => o.sellerId === artisan2Id);
      expect(art1Order).toBeDefined();
      expect(art2Order).toBeDefined();
      expect(art1Order.totalAmount).toBe(1200);
      expect(art2Order.totalAmount).toBe(900);
      expect(art1Order.orderStatus).toBe(OrderStatus.CONFIRMED);
      expect(art1Order.payments[0].paymentMethod).toBe('COD');

      order1Id = art1Order.id;
      order2Id = art2Order.id;

      // Verify inventory was decremented
      const inv1 = await prisma.inventory.findUnique({ where: { productId: product1Id } });
      expect(inv1?.availableQuantity).toBe(8); // 10 - 2
      expect(inv1?.soldQuantity).toBe(2);

      const inv2 = await prisma.inventory.findUnique({ where: { productId: product2Id } });
      expect(inv2?.availableQuantity).toBe(9); // 10 - 1
      expect(inv2?.soldQuantity).toBe(1);

      // Verify buyer's cart was cleared
      const cartRes = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${buyer1Token}`);
      expect(cartRes.body.data.items.length).toBe(0);
      expect(cartRes.body.data.subtotal).toBe(0);
    });

    it('should complete mock online payment with status COMPLETED and transactionId', async () => {
      // Add Product 1 to Buyer 2 cart
      await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${buyer2Token}`)
        .send({ productId: product1Id, quantity: 1 });

      const res = await request(app)
        .post('/api/v1/orders/checkout')
        .set('Authorization', `Bearer ${buyer2Token}`)
        .send({
          shippingAddress: '88 Cyber Hub, Gurugram, Haryana 122002',
          paymentMethod: 'MOCK_ONLINE',
        });

      expect(res.status).toBe(201);
      const data = res.body.data;
      expect(data.summary.paymentStatus).toBe(PaymentStatus.COMPLETED);
      expect(data.orders[0].paymentStatus).toBe(PaymentStatus.COMPLETED);
      expect(data.orders[0].payments[0].transactionId).toMatch(/^TXN-ONLINE-/);

      onlineOrderId = data.orders[0].id;
    });

    it('should prevent checkout when quantity exceeds inventory and update stockStatus to OUT_OF_STOCK', async () => {
      // Single stock item has qty 1
      await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .send({ productId: singleStockProductId, quantity: 1 });

      // Buy it to exhaust stock
      const buyRes = await request(app)
        .post('/api/v1/orders/checkout')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .send({
          shippingAddress: '45 Heritage Colony, Jaipur',
          paymentMethod: 'COD',
        });
      expect(buyRes.status).toBe(201);

      const inv = await prisma.inventory.findUnique({ where: { productId: singleStockProductId } });
      expect(inv?.availableQuantity).toBe(0);
      expect(inv?.stockStatus).toBe(StockStatus.OUT_OF_STOCK);

      // Buyer 2 attempts to add exhausted stock
      const failCartRes = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${buyer2Token}`)
        .send({ productId: singleStockProductId, quantity: 1 });
      expect(failCartRes.status).toBe(400);
      expect(failCartRes.body.error).toContain('exceeds available stock');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Buyer and Artisan Order Retrieval
  // ─────────────────────────────────────────────────────────────────────────────
  describe('2. Order Viewing & Permissions', () => {
    it('should list orders for buyer with pagination and items', async () => {
      const res = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${buyer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.pagination).toBeDefined();
    });

    it('should get single order details for buyer', async () => {
      const res = await request(app)
        .get(`/api/v1/orders/${order1Id}`)
        .set('Authorization', `Bearer ${buyer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(order1Id);
      expect(res.body.data.seller.businessName).toBe('Jaipur Blue Pottery Studio');
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.items[0].product.name).toBe('Handcrafted Ceramic Vase');
    });

    it('should isolate orders between buyers (Buyer 2 cannot view Buyer 1 order)', async () => {
      const res = await request(app)
        .get(`/api/v1/orders/${order1Id}`)
        .set('Authorization', `Bearer ${buyer2Token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Order not found');
    });

    it('should list artisan orders for Artisan 1', async () => {
      const res = await request(app)
        .get('/api/v1/artisan/orders')
        .set('Authorization', `Bearer ${artisan1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.some((o: any) => o.id === order1Id)).toBe(true);
      expect(res.body.data.every((o: any) => o.sellerId === artisan1Id)).toBe(true);
    });

    it('should prevent Artisan 2 from accessing Artisan 1 order details', async () => {
      const res = await request(app)
        .get(`/api/v1/artisan/orders/${order1Id}`)
        .set('Authorization', `Bearer ${artisan2Token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Order not found');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Order Lifecycle & Status Transitions
  // ─────────────────────────────────────────────────────────────────────────────
  describe('3. Order Lifecycle & Status Transitions', () => {
    it('should reject invalid transition skipping states (CONFIRMED -> DELIVERED directly)', async () => {
      const res = await request(app)
        .patch(`/api/v1/artisan/orders/${order1Id}/status`)
        .set('Authorization', `Bearer ${artisan1Token}`)
        .send({ status: 'DELIVERED' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid order status transition');
    });

    it('should allow artisan to transition CONFIRMED -> PROCESSING', async () => {
      const res = await request(app)
        .patch(`/api/v1/artisan/orders/${order1Id}/status`)
        .set('Authorization', `Bearer ${artisan1Token}`)
        .send({ status: 'PROCESSING', notes: 'Pottery being packaged with protective foam' });

      expect(res.status).toBe(200);
      expect(res.body.data.orderStatus).toBe(OrderStatus.PROCESSING);
    });

    it('should allow artisan to transition PROCESSING -> SHIPPED with tracking number', async () => {
      const res = await request(app)
        .patch(`/api/v1/artisan/orders/${order1Id}/status`)
        .set('Authorization', `Bearer ${artisan1Token}`)
        .send({ status: 'SHIPPED', trackingNumber: 'IND-POST-998877' });

      expect(res.status).toBe(200);
      expect(res.body.data.orderStatus).toBe(OrderStatus.SHIPPED);
      expect(res.body.data.trackingNumber).toBe('IND-POST-998877');
    });

    it('should prevent buyer from cancelling order once SHIPPED', async () => {
      const res = await request(app)
        .post(`/api/v1/orders/${order1Id}/cancel`)
        .set('Authorization', `Bearer ${buyer1Token}`)
        .send({ reason: 'Changed mind' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Cannot cancel order in SHIPPED status');
    });

    it('should allow artisan to transition SHIPPED -> DELIVERED and complete COD payment', async () => {
      const res = await request(app)
        .patch(`/api/v1/artisan/orders/${order1Id}/status`)
        .set('Authorization', `Bearer ${artisan1Token}`)
        .send({ status: 'DELIVERED' });

      expect(res.status).toBe(200);
      expect(res.body.data.orderStatus).toBe(OrderStatus.DELIVERED);
      expect(res.body.data.paymentStatus).toBe(PaymentStatus.COMPLETED);

      // Verify payment record in DB
      const payment = await prisma.payment.findFirst({ where: { orderId: order1Id } });
      expect(payment?.paymentStatus).toBe(PaymentStatus.COMPLETED);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Order Cancellation & Inventory Restoration
  // ─────────────────────────────────────────────────────────────────────────────
  describe('4. Buyer Order Cancellation & Inventory Restoration', () => {
    it('should allow buyer to cancel CONFIRMED order and restore inventory', async () => {
      // Check inventory of product2 before cancellation
      const invBefore = await prisma.inventory.findUnique({ where: { productId: product2Id } });
      const availBefore = invBefore?.availableQuantity || 0; // Was 9

      const res = await request(app)
        .post(`/api/v1/orders/${order2Id}/cancel`)
        .set('Authorization', `Bearer ${buyer1Token}`)
        .send({ reason: 'Order placed by error' });

      expect(res.status).toBe(200);
      expect(res.body.data.orderStatus).toBe(OrderStatus.CANCELLED);

      // Verify inventory was restored
      const invAfter = await prisma.inventory.findUnique({ where: { productId: product2Id } });
      expect(invAfter?.availableQuantity).toBe(availBefore + 1); // 9 + 1 = 10
      expect(invAfter?.soldQuantity).toBe(0);
    });

    it('should refund mock online payment when cancelling online order', async () => {
      const res = await request(app)
        .post(`/api/v1/orders/${onlineOrderId}/cancel`)
        .set('Authorization', `Bearer ${buyer2Token}`)
        .send({ reason: 'Item no longer needed' });

      expect(res.status).toBe(200);
      expect(res.body.data.orderStatus).toBe(OrderStatus.CANCELLED);
      expect(res.body.data.paymentStatus).toBe(PaymentStatus.REFUNDED);

      const payment = await prisma.payment.findFirst({ where: { orderId: onlineOrderId } });
      expect(payment?.paymentStatus).toBe(PaymentStatus.REFUNDED);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Verified-Purchase Reviews
  // ─────────────────────────────────────────────────────────────────────────────
  describe('5. Verified-Purchase Reviews', () => {
    it('should reject review from buyer who does NOT have a DELIVERED order for the product', async () => {
      // Buyer 2 never had a DELIVERED order for product 1 (only cancelled order)
      const res = await request(app)
        .post(`/api/v1/marketplace/products/${product1Id}/reviews`)
        .set('Authorization', `Bearer ${buyer2Token}`)
        .send({
          rating: 5,
          reviewText: 'Great product even though I did not receive it!',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Only verified buyers with a delivered order can review');
    });

    it('should allow review from buyer who has a DELIVERED order for the product and update product rating', async () => {
      // Buyer 1 has DELIVERED order1 containing product 1
      const res = await request(app)
        .post(`/api/v1/marketplace/products/${product1Id}/reviews`)
        .set('Authorization', `Bearer ${buyer1Token}`)
        .send({
          rating: 5,
          reviewText: 'Stunning craftsmanship! The blue glaze is truly royal.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rating).toBe(5);
      expect(res.body.data.productId).toBe(product1Id);

      // Verify product rating and review count updated in DB
      const updatedProduct = await prisma.product.findUnique({ where: { id: product1Id } });
      expect(updatedProduct?.rating).toBe(5);
      expect(updatedProduct?.reviewCount).toBe(1);

      // Verify artisan rating updated
      const updatedArtisan = await prisma.artisan.findUnique({ where: { id: artisan1Id } });
      expect(updatedArtisan?.rating).toBe(5);
    });

    it('should reject duplicate review for the same purchase order', async () => {
      const res = await request(app)
        .post(`/api/v1/marketplace/products/${product1Id}/reviews`)
        .set('Authorization', `Bearer ${buyer1Token}`)
        .send({
          rating: 4,
          reviewText: 'Trying to review again',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('already reviewed this product');
    });

    it('should retrieve verified reviews on the public product reviews endpoint', async () => {
      const res = await request(app)
        .get(`/api/v1/marketplace/products/${product1Id}/reviews`);

      expect(res.status).toBe(200);
      expect(res.body.data.reviews.length).toBe(1);
      expect(res.body.data.reviews[0].rating).toBe(5);
      expect(res.body.data.reviews[0].author).toBe('Aarav Patel');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. B2B Market Linkage (Enquiries & Quotations)
  // ─────────────────────────────────────────────────────────────────────────────
  describe('6. B2B Bulk Enquiries & Quotations', () => {
    it('should allow buyer to submit bulk enquiry with required quantity and proposed budget', async () => {
      const res = await request(app)
        .post('/api/v1/b2b/enquiries')
        .set('Authorization', `Bearer ${buyer1Token}`)
        .send({
          sellerId: artisan1Id,
          productId: product1Id,
          requiredQuantity: 100,
          proposedPrice: 400,
          budget: 40000,
          deliveryDate: '2026-11-20',
          message: 'Looking to purchase 100 handcrafted ceramic vases for Diwali corporate gifts.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.requiredQuantity).toBe(100);
      expect(res.body.data.status).toBe(EnquiryStatus.PENDING);

      enquiryId = res.body.data.id;
    });

    it('should allow artisan to view received enquiry details', async () => {
      const res = await request(app)
        .get(`/api/v1/artisan/b2b/enquiries/${enquiryId}`)
        .set('Authorization', `Bearer ${artisan1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(enquiryId);
      expect(res.body.data.buyer.companyName).toBe('Heritage Decor Boutique');
      expect(res.body.data.requiredQuantity).toBe(100);
    });

    it('should allow artisan to send counter-offer quotation', async () => {
      const res = await request(app)
        .patch(`/api/v1/artisan/b2b/enquiries/${enquiryId}/respond`)
        .set('Authorization', `Bearer ${artisan1Token}`)
        .send({
          action: 'COUNTER_OFFER',
          counterOfferPrice: 450,
          counterOfferMessage: 'We can supply 100 units at ₹450 each with specialized thermocol packaging included.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(EnquiryStatus.COUNTER_OFFER);
      expect(res.body.data.counterOfferPrice).toBe(450);
    });

    it('should allow buyer to accept artisan counter offer', async () => {
      const res = await request(app)
        .post(`/api/v1/b2b/enquiries/${enquiryId}/accept-counter`)
        .set('Authorization', `Bearer ${buyer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(EnquiryStatus.BUYER_ACCEPTED);
    });

    it('should reject modifying an enquiry that is already BUYER_ACCEPTED', async () => {
      const res = await request(app)
        .patch(`/api/v1/artisan/b2b/enquiries/${enquiryId}/respond`)
        .set('Authorization', `Bearer ${artisan1Token}`)
        .send({
          action: 'REJECT',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Cannot update enquiry');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. In-App Notifications
  // ─────────────────────────────────────────────────────────────────────────────
  describe('7. In-App Notifications', () => {
    it('should retrieve notifications generated during order and enquiry workflows', async () => {
      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${artisan1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const notif = res.body.data[0];
      expect(notif.userId).toBe(artisan1UserId);
      expect(notif.isRead).toBe(false);
    });

    it('should mark a single notification as read', async () => {
      const listRes = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${artisan1Token}`);

      const firstNotifId = listRes.body.data[0].id;

      const res = await request(app)
        .patch(`/api/v1/notifications/${firstNotifId}/read`)
        .set('Authorization', `Bearer ${artisan1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isRead).toBe(true);
    });

    it('should mark all user notifications as read', async () => {
      const res = await request(app)
        .patch('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${artisan1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.updatedCount).toBeGreaterThanOrEqual(0);

      // Verify unread count is 0
      const listRes = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${artisan1Token}`);
      expect(listRes.body.pagination.unreadCount).toBe(0);
    });
  });
});
