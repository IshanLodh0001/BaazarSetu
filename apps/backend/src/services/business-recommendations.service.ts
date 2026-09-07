import { prisma } from '../config/prisma';
import { EnquiryStatus, ProductStatus } from '@prisma/client';

export interface BusinessRecommendation {
  type: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  productId: string | null;
  actionUrl?: string;
}

export const getArtisanRecommendations = async (artisanUserId: string) => {
  const artisan = await prisma.artisan.findUnique({
    where: { userId: artisanUserId },
    include: {
      products: {
        include: {
          inventory: true,
          images: true,
        },
      },
      enquiries: {
        where: { status: EnquiryStatus.PENDING },
      },
    },
  });

  if (!artisan) {
    throw new Error('Artisan profile not found');
  }

  const recommendations: BusinessRecommendation[] = [];

  // 1. Pending B2B Enquiries (High Priority)
  if (artisan.enquiries.length > 0) {
    recommendations.push({
      type: 'PENDING_B2B',
      priority: 'high',
      title: `Respond to ${artisan.enquiries.length} Pending B2B Enquiry(ies)`,
      description: `You have ${artisan.enquiries.length} corporate/boutique buyer quotation requests waiting. Prompt responses increase conversion by over 60%.`,
      productId: artisan.enquiries[0]?.productId || null,
      actionUrl: '/artisan/b2b/enquiries',
    });
  }

  // 2. Urgent Restock Alerts (High Priority)
  for (const prod of artisan.products) {
    const inv = prod.inventory;
    if (inv && (inv.availableQuantity === 0 || inv.stockStatus === 'OUT_OF_STOCK')) {
      recommendations.push({
        type: 'RESTOCK_ALERT',
        priority: 'high',
        title: `Restock "${prod.name}"`,
        description: `This product is currently out of stock. Replenish inventory so buyers can continue purchasing.`,
        productId: prod.id,
        actionUrl: `/artisan/products/${prod.id}/inventory`,
      });
    } else if (inv && inv.availableQuantity <= inv.reorderLevel) {
      recommendations.push({
        type: 'RESTOCK_ALERT',
        priority: 'medium',
        title: `Low Stock Alert for "${prod.name}"`,
        description: `Only ${inv.availableQuantity} unit(s) remaining (reorder threshold is ${inv.reorderLevel}). Consider producing more soon.`,
        productId: prod.id,
        actionUrl: `/artisan/products/${prod.id}/inventory`,
      });
    }
  }

  // 3. Pricing Suggestions (Medium Priority)
  for (const prod of artisan.products) {
    if (prod.aiSuggestedPrice && Math.abs(prod.aiSuggestedPrice - prod.price) > 50) {
      const direction = prod.aiSuggestedPrice > prod.price ? 'higher' : 'lower';
      recommendations.push({
        type: 'PRICING_OPTIMIZATION',
        priority: 'medium',
        title: `Review Price for "${prod.name}"`,
        description: `AI market analysis suggests ₹${prod.aiSuggestedPrice} (${direction} than current ₹${prod.price}) for optimal profit margin.`,
        productId: prod.id,
        actionUrl: `/artisan/pricing/${prod.id}`,
      });
    }
  }

  // 4. Catalog Quality & Image Studio (Medium / Low Priority)
  for (const prod of artisan.products) {
    if (prod.images.length <= 1) {
      recommendations.push({
        type: 'IMAGE_STUDIO',
        priority: 'medium',
        title: `Add More Photos for "${prod.name}"`,
        description: `Products with 3 or more studio-quality photos receive up to 3x more buyer views and inquiries.`,
        productId: prod.id,
        actionUrl: `/artisan/products/${prod.id}/images`,
      });
    }
    if (!prod.description || prod.description.length < 50) {
      recommendations.push({
        type: 'DESCRIPTION_IMPROVEMENT',
        priority: 'low',
        title: `Enhance Description for "${prod.name}"`,
        description: `Use Multilingual Voice Input to add traditional craft story and dimensions to your catalog.`,
        productId: prod.id,
        actionUrl: `/artisan/products/${prod.id}/edit`,
      });
    }
  }

  // 5. Growth Opportunity
  if (artisan.products.length < 3) {
    recommendations.push({
      type: 'GROWTH_OPPORTUNITY',
      priority: 'medium',
      title: 'Expand Your Product Catalog',
      description: 'Artisans with at least 5 active listings generate 4x higher sales volume in the marketplace.',
      productId: null,
      actionUrl: '/artisan/products/new',
    });
  }

  // Deduplicate and prioritize (high -> medium -> low)
  const priorityOrder = { high: 1, medium: 2, low: 3 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return {
    artisanId: artisan.id,
    businessName: artisan.businessName,
    totalRecommendations: recommendations.length,
    recommendations,
  };
};
