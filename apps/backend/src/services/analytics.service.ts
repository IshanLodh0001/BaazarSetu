import { prisma } from '../config/prisma';
import { OrderStatus, EnquiryStatus, ProductStatus } from '@prisma/client';

export class AnalyticsError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'AnalyticsError';
    this.statusCode = statusCode;
  }
}

interface DateRangeFilter {
  from?: string;
  to?: string;
}

const buildDateFilter = (dateRange?: DateRangeFilter) => {
  const dateFilter: any = {};
  if (dateRange?.from) {
    dateFilter.gte = new Date(dateRange.from);
  }
  if (dateRange?.to) {
    const toDate = new Date(dateRange.to);
    if (dateRange.to.length === 10) {
      toDate.setHours(23, 59, 59, 999);
    }
    dateFilter.lte = toDate;
  }
  return dateFilter;
};

export const getArtisanOverview = async (artisanUserId: string, dateRange?: DateRangeFilter) => {
  const artisan = await prisma.artisan.findUnique({
    where: { userId: artisanUserId },
  });

  if (!artisan) {
    throw new AnalyticsError('Artisan profile not found', 404);
  }

  const dateFilter = buildDateFilter(dateRange);
  const orderWhere: any = { sellerId: artisan.id };
  if (Object.keys(dateFilter).length > 0) {
    orderWhere.createdAt = dateFilter;
  }

  // 1. Fetch Orders for this artisan
  const orders = await prisma.order.findMany({
    where: orderWhere,
    include: {
      items: {
        include: {
          product: {
            select: { id: true, name: true, category: true, price: true },
          },
        },
      },
      payments: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // 2. Order metrics & Authoritative Revenue (strictly excluding CANCELLED and RETURNED)
  const totalOrders = orders.length;
  let confirmedOrders = 0;
  let processingOrders = 0;
  let shippedOrders = 0;
  let deliveredOrders = 0;
  let cancelledOrders = 0;
  let totalRevenue = 0;
  let activeOrdersCount = 0;

  const productSalesMap: Record<string, { id: string; name: string; category: string; price: number; unitsSold: number; revenue: number }> = {};
  const categorySalesMap: Record<string, { category: string; unitsSold: number; revenue: number }> = {};
  const dailyRevenueMap: Record<string, { date: string; revenue: number; ordersCount: number }> = {};

  for (const order of orders) {
    switch (order.orderStatus) {
      case OrderStatus.CONFIRMED:
        confirmedOrders++;
        break;
      case OrderStatus.PROCESSING:
        processingOrders++;
        break;
      case OrderStatus.SHIPPED:
        shippedOrders++;
        break;
      case OrderStatus.DELIVERED:
        deliveredOrders++;
        break;
      case OrderStatus.CANCELLED:
        cancelledOrders++;
        break;
      default:
        break;
    }

    // Authoritative revenue: count only non-cancelled orders
    if (order.orderStatus !== OrderStatus.CANCELLED && order.orderStatus !== OrderStatus.RETURNED) {
      totalRevenue += order.totalAmount;
      activeOrdersCount++;

      // Date trend
      const dateKey = order.createdAt.toISOString().slice(0, 10);
      if (!dailyRevenueMap[dateKey]) {
        dailyRevenueMap[dateKey] = { date: dateKey, revenue: 0, ordersCount: 0 };
      }
      dailyRevenueMap[dateKey].revenue += order.totalAmount;
      dailyRevenueMap[dateKey].ordersCount += 1;

      // Item breakdowns
      for (const item of order.items) {
        const pId = item.productId;
        const pName = item.product?.name || 'Unknown';
        const pCategory = item.product?.category || 'General';
        const pPrice = item.unitPrice;

        if (!productSalesMap[pId]) {
          productSalesMap[pId] = { id: pId, name: pName, category: pCategory, price: pPrice, unitsSold: 0, revenue: 0 };
        }
        productSalesMap[pId].unitsSold += item.quantity;
        productSalesMap[pId].revenue += item.totalPrice;

        if (!categorySalesMap[pCategory]) {
          categorySalesMap[pCategory] = { category: pCategory, unitsSold: 0, revenue: 0 };
        }
        categorySalesMap[pCategory].unitsSold += item.quantity;
        categorySalesMap[pCategory].revenue += item.totalPrice;
      }
    }
  }

  totalRevenue = Math.round(totalRevenue * 100) / 100;
  const averageOrderValue = activeOrdersCount > 0 ? Math.round((totalRevenue / activeOrdersCount) * 100) / 100 : 0;

  // 3. Products & Inventory stats
  const products = await prisma.product.findMany({
    where: { sellerId: artisan.id },
    include: { inventory: true },
  });

  const totalProducts = products.length;
  let totalQuantitySold = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let totalInventoryValue = 0;

  for (const prod of products) {
    if (prod.inventory) {
      totalQuantitySold += prod.inventory.soldQuantity;
      totalInventoryValue += prod.inventory.availableQuantity * prod.price;
      if (prod.inventory.availableQuantity === 0 || prod.inventory.stockStatus === 'OUT_OF_STOCK') {
        outOfStockCount++;
      } else if (prod.inventory.availableQuantity <= prod.inventory.reorderLevel) {
        lowStockCount++;
      }
    }
  }

  // 4. B2B Enquiries breakdown
  const enquiryWhere: any = { sellerId: artisan.id };
  if (Object.keys(dateFilter).length > 0) {
    enquiryWhere.createdAt = dateFilter;
  }
  const enquiries = await prisma.enquiry.findMany({ where: enquiryWhere });

  const enquirySummary = {
    total: enquiries.length,
    pending: enquiries.filter((e) => e.status === EnquiryStatus.PENDING).length,
    accepted: enquiries.filter((e) => e.status === EnquiryStatus.ACCEPTED).length,
    rejected: enquiries.filter((e) => e.status === EnquiryStatus.REJECTED).length,
    counterOffer: enquiries.filter((e) => e.status === EnquiryStatus.COUNTER_OFFER).length,
    buyerAccepted: enquiries.filter((e) => e.status === EnquiryStatus.BUYER_ACCEPTED).length,
  };

  // 5. Sorted rankings
  const topSellingProducts = Object.values(productSalesMap)
    .sort((a, b) => b.unitsSold - a.unitsSold || b.revenue - a.revenue)
    .slice(0, 5);

  const bestPerformingCategories = Object.values(categorySalesMap)
    .sort((a, b) => b.revenue - a.revenue || b.unitsSold - a.unitsSold);

  const revenueTrends = Object.values(dailyRevenueMap).sort((a, b) => a.date.localeCompare(b.date));

  // 6. Ratings
  const reviewsCount = await prisma.review.count({
    where: {
      productId: { in: products.map((p) => p.id) },
    },
  });

  return {
    artisan: {
      id: artisan.id,
      businessName: artisan.businessName,
      craftType: artisan.craftType,
      rating: artisan.rating,
      reviewsCount,
    },
    sales: {
      totalRevenue,
      totalOrders,
      activeOrders: activeOrdersCount,
      cancelledOrders,
      averageOrderValue,
      totalQuantitySold,
      ordersByStatus: {
        confirmed: confirmedOrders,
        processing: processingOrders,
        shipped: shippedOrders,
        delivered: deliveredOrders,
        cancelled: cancelledOrders,
      },
    },
    inventory: {
      totalProducts,
      lowStockProducts: lowStockCount,
      outOfStockProducts: outOfStockCount,
      totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
    },
    topSellingProducts,
    bestPerformingCategories,
    b2bEnquiries: enquirySummary,
    revenueTrends,
  };
};

export const getArtisanSalesAnalytics = async (artisanUserId: string, dateRange?: DateRangeFilter) => {
  const overview = await getArtisanOverview(artisanUserId, dateRange);

  const artisan = await prisma.artisan.findUnique({
    where: { userId: artisanUserId },
  });

  const dateFilter = buildDateFilter(dateRange);
  const orderWhere: any = { sellerId: artisan!.id };
  if (Object.keys(dateFilter).length > 0) {
    orderWhere.createdAt = dateFilter;
  }

  const orders = await prisma.order.findMany({
    where: orderWhere,
    include: { payments: true },
  });

  const paymentMethodSplit = {
    COD: { orders: 0, revenue: 0 },
    MOCK_ONLINE: { orders: 0, revenue: 0 },
  };

  for (const order of orders) {
    if (order.orderStatus !== OrderStatus.CANCELLED && order.orderStatus !== OrderStatus.RETURNED) {
      if (order.paymentMethod === 'COD') {
        paymentMethodSplit.COD.orders++;
        paymentMethodSplit.COD.revenue += order.totalAmount;
      } else if (order.paymentMethod === 'MOCK_ONLINE') {
        paymentMethodSplit.MOCK_ONLINE.orders++;
        paymentMethodSplit.MOCK_ONLINE.revenue += order.totalAmount;
      }
    }
  }

  paymentMethodSplit.COD.revenue = Math.round(paymentMethodSplit.COD.revenue * 100) / 100;
  paymentMethodSplit.MOCK_ONLINE.revenue = Math.round(paymentMethodSplit.MOCK_ONLINE.revenue * 100) / 100;

  return {
    ...overview.sales,
    paymentMethodSplit,
    revenueTrends: overview.revenueTrends,
  };
};

export const getArtisanProductAnalytics = async (artisanUserId: string) => {
  const artisan = await prisma.artisan.findUnique({
    where: { userId: artisanUserId },
  });

  if (!artisan) {
    throw new AnalyticsError('Artisan profile not found', 404);
  }

  const products = await prisma.product.findMany({
    where: { sellerId: artisan.id },
    include: {
      inventory: true,
      images: { where: { isPrimary: true }, select: { processedPath: true, originalPath: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const productAnalytics = products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    price: p.price,
    status: p.status,
    rating: p.rating,
    reviewCount: p.reviewCount,
    availableStock: p.inventory?.availableQuantity ?? 0,
    soldQuantity: p.inventory?.soldQuantity ?? 0,
    revenue: Math.round(((p.inventory?.soldQuantity ?? 0) * p.price) * 100) / 100,
    stockStatus: p.inventory?.stockStatus ?? 'IN_STOCK',
    primaryImage: p.images[0]?.processedPath || p.images[0]?.originalPath || null,
  }));

  return {
    totalProducts: products.length,
    publishedProducts: products.filter((p) => p.status === ProductStatus.PUBLISHED).length,
    draftProducts: products.filter((p) => p.status === ProductStatus.DRAFT).length,
    products: productAnalytics,
  };
};

export const getArtisanInventoryAnalytics = async (artisanUserId: string) => {
  const artisan = await prisma.artisan.findUnique({
    where: { userId: artisanUserId },
  });

  if (!artisan) {
    throw new AnalyticsError('Artisan profile not found', 404);
  }

  const products = await prisma.product.findMany({
    where: { sellerId: artisan.id },
    include: { inventory: true },
  });

  let totalAvailableQuantity = 0;
  let totalSoldQuantity = 0;
  let totalCapitalTied = 0;
  const lowStockItems = [];
  const outOfStockItems = [];
  const healthyStockItems = [];

  for (const prod of products) {
    const inv = prod.inventory;
    if (inv) {
      totalAvailableQuantity += inv.availableQuantity;
      totalSoldQuantity += inv.soldQuantity;
      const itemCapital = inv.availableQuantity * prod.price;
      totalCapitalTied += itemCapital;

      const itemSummary = {
        productId: prod.id,
        name: prod.name,
        category: prod.category,
        price: prod.price,
        availableQuantity: inv.availableQuantity,
        reorderLevel: inv.reorderLevel,
        soldQuantity: inv.soldQuantity,
        stockStatus: inv.stockStatus,
        capitalTied: Math.round(itemCapital * 100) / 100,
      };

      if (inv.availableQuantity === 0 || inv.stockStatus === 'OUT_OF_STOCK') {
        outOfStockItems.push(itemSummary);
      } else if (inv.availableQuantity <= inv.reorderLevel) {
        lowStockItems.push(itemSummary);
      } else {
        healthyStockItems.push(itemSummary);
      }
    }
  }

  return {
    totalProducts: products.length,
    totalAvailableQuantity,
    totalSoldQuantity,
    totalCapitalTied: Math.round(totalCapitalTied * 100) / 100,
    stockHealth: {
      healthyCount: healthyStockItems.length,
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
    },
    lowStockItems,
    outOfStockItems,
  };
};
