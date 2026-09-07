import { Router } from 'express';
import {
  handleGetCart,
  handleAddToCart,
  handleUpdateCartItem,
  handleRemoveFromCart,
  handleClearCart,
} from '../controllers/cart.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  addToCartSchema,
  updateCartItemSchema,
  cartItemParamSchema,
} from '../schemas/cart.schema';
import { UserRole } from '@prisma/client';

const router = Router();

// All cart endpoints require authenticated BUYER
router.use(authenticate);
router.use(requireRole(UserRole.BUYER));

router.get('/', handleGetCart);
router.delete('/', handleClearCart);
router.post('/items', validate(addToCartSchema), handleAddToCart);
router.patch('/items/:productId', validate(updateCartItemSchema), handleUpdateCartItem);
router.delete('/items/:productId', validate(cartItemParamSchema), handleRemoveFromCart);

export default router;
