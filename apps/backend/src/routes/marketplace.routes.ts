import { Router } from 'express';
import {
  handleListProducts,
  handleGetProductDetails,
  handleGetArtisanProfile,
  handleGetArtisanProducts,
  handleGetCategories,
  handleGetFilters,
  handleGetProductReviews,
} from '../controllers/marketplace.controller';
import { optionalAuthenticate, authenticate, requireRole } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  marketplaceQuerySchema,
  productIdParamSchema,
  artisanIdParamSchema,
  artisanProductsQuerySchema,
} from '../schemas/marketplace.schema';
import { handleCreateProductReview } from '../controllers/review.controller';
import { UserRole } from '@prisma/client';

const router = Router();

// Public endpoints with optional authentication for personalized isFavorite
router.use(optionalAuthenticate);

router.get('/products', validate(marketplaceQuerySchema), handleListProducts);
router.get('/categories', handleGetCategories);
router.get('/filters', handleGetFilters);
router.get('/products/:productId', validate(productIdParamSchema), handleGetProductDetails);
router.get('/products/:productId/reviews', validate(productIdParamSchema), handleGetProductReviews);
router.post(
  '/products/:productId/reviews',
  authenticate,
  requireRole(UserRole.BUYER),
  handleCreateProductReview
);
router.get('/artisans/:sellerId', validate(artisanIdParamSchema), handleGetArtisanProfile);
router.get('/artisans/:sellerId/products', validate(artisanProductsQuerySchema), handleGetArtisanProducts);

export default router;
