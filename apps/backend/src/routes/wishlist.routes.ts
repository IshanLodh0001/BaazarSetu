import { Router } from 'express';
import {
  handleAddToWishlist,
  handleRemoveFromWishlist,
  handleGetWishlist,
} from '../controllers/wishlist.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { wishlistParamSchema } from '../schemas/wishlist.schema';
import { UserRole } from '@prisma/client';

const router = Router();

// All wishlist endpoints require authenticated BUYER
router.use(authenticate);
router.use(requireRole(UserRole.BUYER));

router.get('/', handleGetWishlist);
router.post('/:productId', validate(wishlistParamSchema), handleAddToWishlist);
router.delete('/:productId', validate(wishlistParamSchema), handleRemoveFromWishlist);

export default router;
