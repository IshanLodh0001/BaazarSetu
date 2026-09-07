import { Router } from 'express';
import { handleGetBusinessRecommendations } from '../controllers/inventory-intelligence.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);
router.use(requireRole(UserRole.ARTISAN));

router.get('/', handleGetBusinessRecommendations);

export default router;
