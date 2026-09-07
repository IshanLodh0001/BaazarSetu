import { prisma } from '../config/prisma';
import { ProductStatus } from '@prisma/client';

export interface MarketplaceQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  subCategory?: string;
  craftType?: string;
  material?: string;
  state?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'newest' | 'price_low_to_high' | 'price_high_to_low' | 'rating' | 'popular';
  sellerId?: string;
}

export const listMarketplaceProducts = async (query: MarketplaceQueryParams, buyerUserId?: string) => {
  const pageNum = query.page ? Number(query.page) : 1;
  const limitNum = query.limit ? Number(query.limit) : 20;
  const page = Number.isInteger(pageNum) && pageNum > 0 ? pageNum : 1;
  const limit = Number.isInteger(limitNum) && limitNum > 0 && limitNum <= 50 ? limitNum : 20;
  const skip = (page - 1) * limit;

  // Build where conditions: STRICTLY PUBLISHED
  const where: any = {
    status: ProductStatus.PUBLISHED,
  };

  if (query.category) {
    where.category = { equals: query.category, mode: 'insensitive' };
  }

  if (query.subCategory) {
    where.subcategory = { equals: query.subCategory, mode: 'insensitive' };
  }

  if (query.craftType) {
    where.craftType = { equals: query.craftType, mode: 'insensitive' };
  }

  if (query.material) {
    where.material = { equals: query.material, mode: 'insensitive' };
  }

  if (query.sellerId) {
    where.sellerId = query.sellerId;
  }

  if (query.state) {
    where.seller = {
      state: { equals: query.state, mode: 'insensitive' }
    };
  }

  const minPrice = query.minPrice !== undefined && query.minPrice !== null && (query.minPrice as any) !== '' ? Number(query.minPrice) : undefined;
  const maxPrice = query.maxPrice !== undefined && query.maxPrice !== null && (query.maxPrice as any) !== '' ? Number(query.maxPrice) : undefined;

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {};
    if (minPrice !== undefined && !isNaN(minPrice)) {
      where.price.gte = minPrice;
    }
    if (maxPrice !== undefined && !isNaN(maxPrice)) {
      where.price.lte = maxPrice;
    }
  }

  if (query.search && query.search.trim() !== '') {
    const term = query.search.trim();
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { description: { contains: term, mode: 'insensitive' } },
      { category: { contains: term, mode: 'insensitive' } },
      { subcategory: { contains: term, mode: 'insensitive' } },
      { craftType: { contains: term, mode: 'insensitive' } },
      { material: { contains: term, mode: 'insensitive' } },
      { tags: { has: term } },
    ];
  }

  // Sorting
  let orderBy: any = { createdAt: 'desc' };
  if (query.sort === 'price_low_to_high') {
    orderBy = { price: 'asc' };
  } else if (query.sort === 'price_high_to_low') {
    orderBy = { price: 'desc' };
  } else if (query.sort === 'rating') {
    orderBy = { rating: 'desc' };
  } else if (query.sort === 'popular') {
    orderBy = { reviewCount: 'desc' };
  }

  // Fetch products and total count concurrently
  const [products, totalItems] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        images: { orderBy: { isPrimary: 'desc' } },
        inventory: { select: { availableQuantity: true, stockStatus: true } },
        seller: {
          select: {
            id: true,
            businessName: true,
            craftType: true,
            state: true,
            district: true,
            rating: true,
            verificationStatus: true,
          }
        }
      }
    }),
    prisma.product.count({ where })
  ]);

  // If buyerUserId is present, check favorite status
  let favoriteProductIds = new Set<string>();
  if (buyerUserId) {
    const buyer = await prisma.buyer.findUnique({ where: { userId: buyerUserId } });
    if (buyer) {
      const items = await prisma.wishlistItem.findMany({
        where: {
          buyerId: buyer.id,
          productId: { in: products.map(p => p.id) }
        },
        select: { productId: true }
      });
      favoriteProductIds = new Set(items.map(i => i.productId));
    }
  }

  const formattedProducts = products.map((product) => {
    const stock = product.inventory?.availableQuantity ?? 0;
    const enhancedImage = product.images.find(img => img.processedPath)?.processedPath || null;
    return {
      productId: product.id,
      productName: product.name,
      description: product.description,
      category: product.category,
      subCategory: product.subcategory,
      craftType: product.craftType,
      material: product.material,
      colour: product.colour,
      tags: product.tags,
      price: product.price,
      stock,
      isAvailable: stock > 0,
      rating: product.rating,
      reviewCount: product.reviewCount,
      isFavorite: favoriteProductIds.has(product.id),
      images: product.images.map(img => ({
        id: img.id,
        originalPath: img.originalPath,
        processedPath: img.processedPath,
        thumbnailPath: img.thumbnailPath,
        isPrimary: img.isPrimary,
      })),
      enhancedImage,
      artisan: {
        sellerId: product.seller.id,
        businessName: product.seller.businessName,
        craftType: product.seller.craftType,
        state: product.seller.state,
        district: product.seller.district,
        rating: product.seller.rating,
        isVerified: product.seller.verificationStatus === 'VERIFIED',
      }
    };
  });

  const totalPages = Math.ceil(totalItems / limit);

  return {
    products: formattedProducts,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    }
  };
};

export const getProductDetails = async (productId: string, buyerUserId?: string) => {
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      status: ProductStatus.PUBLISHED,
    },
    include: {
      images: { orderBy: { isPrimary: 'desc' } },
      inventory: { select: { availableQuantity: true, stockStatus: true } },
      seller: {
        select: {
          id: true,
          businessName: true,
          craftType: true,
          experienceYears: true,
          state: true,
          district: true,
          bio: true,
          rating: true,
          totalProducts: true,
          verificationStatus: true,
        }
      }
    }
  });

  if (!product) {
    throw new Error('Product not found');
  }

  let isFavorite = false;
  if (buyerUserId) {
    const buyer = await prisma.buyer.findUnique({ where: { userId: buyerUserId } });
    if (buyer) {
      const fav = await prisma.wishlistItem.findUnique({
        where: {
          buyerId_productId: {
            buyerId: buyer.id,
            productId: product.id,
          }
        }
      });
      isFavorite = !!fav;
    }
  }

  const stock = product.inventory?.availableQuantity ?? 0;
  const enhancedImage = product.images.find(img => img.processedPath)?.processedPath || null;

  return {
    productId: product.id,
    productName: product.name,
    description: product.description,
    category: product.category,
    subCategory: product.subcategory,
    craftType: product.craftType,
    material: product.material,
    colour: product.colour,
    tags: product.tags,
    price: product.price,
    stock,
    isAvailable: stock > 0,
    rating: product.rating,
    reviewCount: product.reviewCount,
    isFavorite,
    images: product.images.map(img => ({
      id: img.id,
      originalPath: img.originalPath,
      processedPath: img.processedPath,
      thumbnailPath: img.thumbnailPath,
      isPrimary: img.isPrimary,
    })),
    enhancedImage,
    artisan: {
      sellerId: product.seller.id,
      businessName: product.seller.businessName,
      craftType: product.seller.craftType,
      experienceYears: product.seller.experienceYears,
      state: product.seller.state,
      district: product.seller.district,
      bio: product.seller.bio,
      rating: product.seller.rating,
      totalProducts: product.seller.totalProducts,
      isVerified: product.seller.verificationStatus === 'VERIFIED',
    }
  };
};

export const getArtisanPublicProfile = async (sellerId: string) => {
  const artisan = await prisma.artisan.findUnique({
    where: { id: sellerId },
    select: {
      id: true,
      businessName: true,
      craftType: true,
      experienceYears: true,
      state: true,
      district: true,
      bio: true,
      rating: true,
      totalProducts: true,
      verificationStatus: true,
      products: {
        where: { status: ProductStatus.PUBLISHED },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          images: { where: { isPrimary: true } },
          inventory: { select: { availableQuantity: true } }
        }
      }
    }
  });

  if (!artisan) {
    throw new Error('Artisan not found');
  }

  return {
    sellerId: artisan.id,
    businessName: artisan.businessName,
    craftType: artisan.craftType,
    experienceYears: artisan.experienceYears,
    state: artisan.state,
    district: artisan.district,
    bio: artisan.bio,
    rating: artisan.rating,
    totalProducts: artisan.totalProducts,
    isVerified: artisan.verificationStatus === 'VERIFIED',
    featuredProducts: artisan.products.map(p => ({
      productId: p.id,
      productName: p.name,
      category: p.category,
      price: p.price,
      stock: p.inventory?.availableQuantity ?? 0,
      primaryImage: p.images[0]?.processedPath || p.images[0]?.originalPath || null,
      rating: p.rating,
    }))
  };
};

export const getArtisanProducts = async (sellerId: string, page = 1, limit = 20) => {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const safePage = Math.max(page, 1);
  const skip = (safePage - 1) * safeLimit;

  const artisan = await prisma.artisan.findUnique({
    where: { id: sellerId },
    select: { id: true, businessName: true, state: true }
  });

  if (!artisan) {
    throw new Error('Artisan not found');
  }

  const where = {
    sellerId,
    status: ProductStatus.PUBLISHED,
  };

  const [products, totalItems] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: safeLimit,
      include: {
        images: { orderBy: { isPrimary: 'desc' } },
        inventory: { select: { availableQuantity: true } }
      }
    }),
    prisma.product.count({ where })
  ]);

  const totalPages = Math.ceil(totalItems / safeLimit);

  return {
    artisan: {
      sellerId: artisan.id,
      businessName: artisan.businessName,
      state: artisan.state,
    },
    products: products.map(p => ({
      productId: p.id,
      productName: p.name,
      category: p.category,
      subCategory: p.subcategory,
      craftType: p.craftType,
      material: p.material,
      price: p.price,
      stock: p.inventory?.availableQuantity ?? 0,
      isAvailable: (p.inventory?.availableQuantity ?? 0) > 0,
      rating: p.rating,
      reviewCount: p.reviewCount,
      primaryImage: p.images.find(img => img.isPrimary)?.processedPath || p.images[0]?.originalPath || null,
    })),
    pagination: {
      page: safePage,
      limit: safeLimit,
      totalItems,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPreviousPage: safePage > 1,
    }
  };
};

export const getCategories = async () => {
  const products = await prisma.product.findMany({
    where: {
      status: ProductStatus.PUBLISHED,
      category: { not: null }
    },
    select: { category: true },
    distinct: ['category'],
  });

  return products
    .map(p => p.category)
    .filter((c): c is string => Boolean(c))
    .sort();
};

export const getFilters = async () => {
  const [categories, subcategories, craftTypes, materials, states] = await Promise.all([
    prisma.product.findMany({
      where: { status: ProductStatus.PUBLISHED, category: { not: null } },
      select: { category: true },
      distinct: ['category']
    }),
    prisma.product.findMany({
      where: { status: ProductStatus.PUBLISHED, subcategory: { not: null } },
      select: { subcategory: true },
      distinct: ['subcategory']
    }),
    prisma.product.findMany({
      where: { status: ProductStatus.PUBLISHED, craftType: { not: null } },
      select: { craftType: true },
      distinct: ['craftType']
    }),
    prisma.product.findMany({
      where: { status: ProductStatus.PUBLISHED, material: { not: null } },
      select: { material: true },
      distinct: ['material']
    }),
    prisma.artisan.findMany({
      where: {
        state: { not: null },
        products: { some: { status: ProductStatus.PUBLISHED } }
      },
      select: { state: true },
      distinct: ['state']
    })
  ]);

  return {
    categories: categories.map(c => c.category).filter((c): c is string => Boolean(c)).sort(),
    subcategories: subcategories.map(s => s.subcategory).filter((s): s is string => Boolean(s)).sort(),
    craftTypes: craftTypes.map(ct => ct.craftType).filter((ct): ct is string => Boolean(ct)).sort(),
    materials: materials.map(m => m.material).filter((m): m is string => Boolean(m)).sort(),
    states: states.map(st => st.state).filter((st): st is string => Boolean(st)).sort(),
  };
};

export const getProductReviews = async (productId: string, page = 1, limit = 20) => {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const safePage = Math.max(page, 1);
  const skip = (safePage - 1) * safeLimit;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, rating: true, reviewCount: true }
  });

  if (!product) {
    throw new Error('Product not found');
  }

  const [reviews, totalItems] = await Promise.all([
    prisma.review.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: safeLimit,
      include: {
        buyer: {
          select: {
            companyName: true,
            user: { select: { name: true } }
          }
        }
      }
    }),
    prisma.review.count({ where: { productId } })
  ]);

  const totalPages = Math.ceil(totalItems / safeLimit);

  return {
    rating: product.rating,
    reviewCount: product.reviewCount,
    reviews: reviews.map(r => ({
      id: r.id,
      rating: r.rating,
      reviewText: r.reviewText,
      createdAt: r.createdAt,
      author: r.buyer.user.name || r.buyer.companyName || 'Verified Buyer',
    })),
    pagination: {
      page: safePage,
      limit: safeLimit,
      totalItems,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPreviousPage: safePage > 1,
    }
  };
};
