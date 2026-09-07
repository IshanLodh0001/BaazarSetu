import { Router } from 'express';
import {
  handleGetNotifications,
  handleMarkNotificationAsRead,
  handleMarkAllNotificationsAsRead,
} from '../controllers/notification.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', handleGetNotifications);
router.patch('/read-all', handleMarkAllNotificationsAsRead);
router.patch('/:id/read', handleMarkNotificationAsRead);

export default router;
