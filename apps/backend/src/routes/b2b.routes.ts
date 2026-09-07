import { Router } from 'express';
import {
  handleCreateEnquiry,
  handleGetBuyerEnquiries,
  handleGetBuyerEnquiryDetails,
  handleAcceptCounterOffer,
} from '../controllers/b2b.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);
router.use(requireRole(UserRole.BUYER));

router.post('/', handleCreateEnquiry);
router.get('/', handleGetBuyerEnquiries);
router.get('/:enquiryId', handleGetBuyerEnquiryDetails);
router.post('/:enquiryId/accept-counter', handleAcceptCounterOffer);

export default router;
