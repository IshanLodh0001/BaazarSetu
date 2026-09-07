import { Router } from 'express';
import { handleBusinessAssistantChat } from '../controllers/assistant.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);
router.use(requireRole(UserRole.ARTISAN));

router.post('/business-assistant', handleBusinessAssistantChat);
router.post('/chat', handleBusinessAssistantChat); // alias for /api/v1/assistant/chat

export default router;
