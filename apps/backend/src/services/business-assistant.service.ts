import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../config/prisma';
import { OrderStatus, EnquiryStatus } from '@prisma/client';
import { translateText } from './ai.service';

const API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

export interface BusinessAssistantResponse {
  message: string;
  language: string;
  insights: string[];
  recommendations: Array<{
    title: string;
    priority: 'high' | 'medium' | 'low';
    action: string;
  }>;
  data: {
    businessName: string | null;
    craftType: string | null;
    totalProducts: number;
    totalRevenue: number;
    totalOrders: number;
    deliveredOrders: number;
    activeOrders: number;
    cancelledOrders: number;
    topSellingProduct: string | null;
    lowStockCount: number;
    outOfStockCount: number;
    pendingEnquiriesCount: number;
  };
}

export const processBusinessAssistantQuery = async (
  artisanUserId: string,
  userMessage: string,
  language: string = 'en'
): Promise<BusinessAssistantResponse> => {
  const artisan = await prisma.artisan.findUnique({
    where: { userId: artisanUserId },
    include: {
      products: {
        include: { inventory: true },
      },
      orders: {
        include: { items: { include: { product: true } } },
      },
      enquiries: true,
    },
  });

  if (!artisan) {
    throw new Error('Artisan profile not found');
  }

  // 1. Authoritative metrics calculation
  let totalRevenue = 0;
  let activeOrders = 0;
  let deliveredOrders = 0;
  let cancelledOrders = 0;

  for (const order of artisan.orders) {
    if (order.orderStatus === OrderStatus.CANCELLED) {
      cancelledOrders++;
    } else {
      totalRevenue += order.totalAmount;
      activeOrders++;
      if (order.orderStatus === OrderStatus.DELIVERED) {
        deliveredOrders++;
      }
    }
  }
  totalRevenue = Math.round(totalRevenue * 100) / 100;

  const lowStockItems: string[] = [];
  const outOfStockItems: string[] = [];
  let topProduct: { name: string; sold: number } | null = null;

  for (const prod of artisan.products) {
    const inv = prod.inventory;
    if (inv) {
      if (inv.availableQuantity === 0 || inv.stockStatus === 'OUT_OF_STOCK') {
        outOfStockItems.push(prod.name);
      } else if (inv.availableQuantity <= inv.reorderLevel) {
        lowStockItems.push(`${prod.name} (${inv.availableQuantity} left)`);
      }

      if (!topProduct || inv.soldQuantity > topProduct.sold) {
        topProduct = { name: prod.name, sold: inv.soldQuantity };
      }
    }
  }

  const pendingEnquiries = artisan.enquiries.filter((e) => e.status === EnquiryStatus.PENDING);

  // 2. Deterministic Insights & Recommendations
  const insights: string[] = [];
  const recommendations: Array<{ title: string; priority: 'high' | 'medium' | 'low'; action: string }> = [];

  if (artisan.orders.length > 0) {
    insights.push(`You have earned a total of ₹${totalRevenue} across ${artisan.orders.length - cancelledOrders} fulfilled/active order(s).`);
  } else {
    insights.push('You have not received any store orders yet.');
  }

  if (topProduct && topProduct.sold > 0) {
    insights.push(`"${topProduct.name}" is your best seller with ${topProduct.sold} units sold.`);
  }

  if (outOfStockItems.length > 0) {
    insights.push(`${outOfStockItems.length} product(s) are completely out of stock: ${outOfStockItems.join(', ')}.`);
    recommendations.push({
      title: 'Restock Out-of-Stock Items',
      priority: 'high',
      action: `Replenish stock for ${outOfStockItems[0]} immediately to avoid missed sales.`,
    });
  }

  if (lowStockItems.length > 0) {
    insights.push(`${lowStockItems.length} product(s) are running low: ${lowStockItems.join(', ')}.`);
    recommendations.push({
      title: 'Prepare Batch for Low Stock Items',
      priority: 'medium',
      action: `Stock is approaching reorder level for ${lowStockItems[0]}.`,
    });
  }

  if (pendingEnquiries.length > 0) {
    insights.push(`You have ${pendingEnquiries.length} pending B2B bulk quotation request(s) awaiting your response.`);
    recommendations.push({
      title: 'Respond to B2B Quotations',
      priority: 'high',
      action: 'Open your B2B dashboard and provide quotes or counter-offers to corporate buyers.',
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      title: 'Promote Your Shop & Catalog',
      priority: 'medium',
      action: 'Share your BaazarSetu product links on WhatsApp or add new craft listings to increase buyer traffic.',
    });
  }

  // 3. Natural Language Explanation via Gemini (with robust fallback)
  let assistantMessage = '';
  const isHindi = language.toLowerCase().startsWith('hi');

  if (API_KEY) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `
        You are "Setu Sahayak", an empathetic, intelligent AI business advisor for Indian artisans using BaazarSetu.
        The artisan asks: "${userMessage}"

        Here is the artisan's actual business data from the database:
        - Business Name: ${artisan.businessName || 'Artisan Shop'}
        - Craft: ${artisan.craftType || 'Handicrafts'}
        - Total Products: ${artisan.products.length}
        - Total Revenue: ₹${totalRevenue}
        - Total Orders: ${artisan.orders.length} (Active: ${activeOrders}, Delivered: ${deliveredOrders}, Cancelled: ${cancelledOrders})
        - Top Selling Product: ${topProduct?.name || 'None yet'} (${topProduct?.sold || 0} units sold)
        - Low Stock Items: ${lowStockItems.length > 0 ? lowStockItems.join(', ') : 'None'}
        - Out of Stock Items: ${outOfStockItems.length > 0 ? outOfStockItems.join(', ') : 'None'}
        - Pending B2B Enquiries: ${pendingEnquiries.length}

        RULES:
        1. Answer directly and concisely based ONLY on the data above. Never fabricate revenue, orders, or stock.
        2. Give clear, encouraging, actionable guidance.
        3. Respond in ${isHindi ? 'Hindi (Devanagari script)' : 'English'}.
        4. Keep response under 150 words.
      `;

      const result = await model.generateContent(prompt);
      assistantMessage = result.response.text().trim();
    } catch (err: any) {
      console.warn('Gemini Assistant Error, using deterministic response fallback:', err.message);
    }
  }

  // Fallback natural language message if Gemini was not used or failed
  if (!assistantMessage) {
    if (isHindi) {
      assistantMessage = `नमस्ते! आपके व्यवसाय में कुल ₹${totalRevenue} की कमाई हुई है और ${artisan.orders.length} ऑर्डर मिले हैं। ${
        topProduct && topProduct.sold > 0 ? `आपका सबसे लोकप्रिय उत्पाद "${topProduct.name}" है। ` : ''
      }${outOfStockItems.length > 0 ? `कृपया ध्यान दें: ${outOfStockItems[0]} का स्टॉक समाप्त हो गया है। ` : ''}${
        pendingEnquiries.length > 0 ? `आपके पास ${pendingEnquiries.length} B2B पूछताछ लंबित हैं।` : 'अपने उत्पादों को बढ़ावा देकर बिक्री बढ़ाएं।'
      }`;
    } else {
      assistantMessage = `Hello! Your store has earned a total revenue of ₹${totalRevenue} across ${
        artisan.orders.length
      } order(s). ${
        topProduct && topProduct.sold > 0 ? `Your top-selling product is "${topProduct.name}" with ${topProduct.sold} units sold. ` : ''
      }${outOfStockItems.length > 0 ? `Action required: ${outOfStockItems[0]} is out of stock. ` : ''}${
        pendingEnquiries.length > 0
          ? `You also have ${pendingEnquiries.length} pending B2B enquiry(ies) to respond to.`
          : 'Keep your catalog updated with high-quality photos and competitive pricing to drive more sales!'
      }`;
    }
  }

  return {
    message: assistantMessage,
    language,
    insights,
    recommendations,
    data: {
      businessName: artisan.businessName,
      craftType: artisan.craftType,
      totalProducts: artisan.products.length,
      totalRevenue,
      totalOrders: artisan.orders.length,
      deliveredOrders,
      activeOrders,
      cancelledOrders,
      topSellingProduct: topProduct?.name || null,
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
      pendingEnquiriesCount: pendingEnquiries.length,
    },
  };
};
