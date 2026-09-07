import { Router } from 'express';
import {
  handleGetInventoryInsights,
  handleGetBusinessRecommendations,
} from '../controllers/inventory-intelligence.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);
router.use(requireRole(UserRole.ARTISAN));

router.get('/insights', handleGetInventoryInsights);

export default router;
