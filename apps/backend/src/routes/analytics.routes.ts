import { Router } from 'express';
import {
  handleGetOverview,
  handleGetSalesAnalytics,
  handleGetProductAnalytics,
  handleGetInventoryAnalytics,
} from '../controllers/analytics.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);
router.use(requireRole(UserRole.ARTISAN));

router.get('/overview', handleGetOverview);
router.get('/sales', handleGetSalesAnalytics);
router.get('/products', handleGetProductAnalytics);
router.get('/inventory', handleGetInventoryAnalytics);

export default router;
