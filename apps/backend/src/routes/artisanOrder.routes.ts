import { Router } from 'express';
import {
  handleGetArtisanOrders,
  handleGetArtisanOrderDetails,
  handleUpdateOrderStatusByArtisan,
} from '../controllers/order.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);
router.use(requireRole(UserRole.ARTISAN));

router.get('/', handleGetArtisanOrders);
router.get('/:orderId', handleGetArtisanOrderDetails);
router.patch('/:orderId/status', handleUpdateOrderStatusByArtisan);

export default router;
