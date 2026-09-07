import { Request, Response } from 'express';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services/notification.service';
import { getNotificationsQuerySchema, notificationIdParamSchema } from '../schemas/notification.schema';

export const handleGetNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const queryValidation = getNotificationsQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: queryValidation.error.format(),
      });
    }

    const result = await getUserNotifications(userId, queryValidation.data);
    return res.status(200).json({
      success: true,
      data: result.notifications,
      pagination: result.pagination,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};

export const handleMarkNotificationAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const paramValidation = notificationIdParamSchema.safeParse(req.params);
    if (!paramValidation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid notification ID',
      });
    }

    const updated = await markNotificationAsRead(userId, paramValidation.data.id);
    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};

export const handleMarkAllNotificationsAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const result = await markAllNotificationsAsRead(userId);
    return res.status(200).json({
      success: true,
      data: {
        updatedCount: result.count,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};
