import { Router } from 'express';
import {
  handleGetArtisanEnquiries,
  handleGetArtisanEnquiryDetails,
  handleRespondToEnquiry,
} from '../controllers/b2b.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);
router.use(requireRole(UserRole.ARTISAN));

router.get('/', handleGetArtisanEnquiries);
router.get('/:enquiryId', handleGetArtisanEnquiryDetails);
router.patch('/:enquiryId/respond', handleRespondToEnquiry);

export default router;
