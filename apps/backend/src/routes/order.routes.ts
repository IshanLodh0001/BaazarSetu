import { Router } from 'express';
import {
  handleCheckout,
  handleGetBuyerOrders,
  handleGetBuyerOrderDetails,
  handleCancelBuyerOrder,
} from '../controllers/order.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);
router.use(requireRole(UserRole.BUYER));

router.post('/checkout', handleCheckout);
router.get('/', handleGetBuyerOrders);
router.get('/:orderId', handleGetBuyerOrderDetails);
router.post('/:orderId/cancel', handleCancelBuyerOrder);

export default router;
