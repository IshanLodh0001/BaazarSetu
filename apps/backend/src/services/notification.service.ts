import { prisma } from '../config/prisma';
import { NotificationType } from '@prisma/client';

export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: NotificationType = NotificationType.SYSTEM,
  referenceId?: string
) => {
  return prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
      referenceId: referenceId || null,
    },
  });
};

export const getUserNotifications = async (
  userId: string,
  options?: { isRead?: boolean; page?: number; limit?: number }
) => {
  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const skip = (page - 1) * limit;

  const where: any = { userId };
  if (options?.isRead !== undefined) {
    where.isRead = options.isRead;
  }

  const [total, notifications, unreadCount] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({
      where: { userId, isRead: false },
    }),
  ]);

  return {
    notifications,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      unreadCount,
    },
  };
};

export const markNotificationAsRead = async (userId: string, notificationId: string) => {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });

  if (!notification) {
    throw new Error('Notification not found');
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
};

export const markAllNotificationsAsRead = async (userId: string) => {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
};

export const checkAndCreateStockAlerts = async (artisanUserId: string) => {
  const artisan = await prisma.artisan.findUnique({
    where: { userId: artisanUserId },
    include: {
      products: {
        include: { inventory: true },
      },
    },
  });

  if (!artisan) return [];

  const createdAlerts = [];
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  for (const product of artisan.products) {
    const inv = product.inventory;
    if (inv && (inv.availableQuantity === 0 || inv.availableQuantity <= inv.reorderLevel)) {
      // Check if recent unread alert for this product already exists to avoid spam
      const existingAlert = await prisma.notification.findFirst({
        where: {
          userId: artisanUserId,
          type: NotificationType.SYSTEM_ALERT,
          referenceId: product.id,
          createdAt: { gte: oneDayAgo },
        },
      });

      if (!existingAlert) {
        const isOutOfStock = inv.availableQuantity === 0 || inv.stockStatus === 'OUT_OF_STOCK';
        const title = isOutOfStock ? `Out of Stock: ${product.name}` : `Low Stock: ${product.name}`;
        const message = isOutOfStock
          ? `Product "${product.name}" is completely out of stock. Replenish now.`
          : `Only ${inv.availableQuantity} unit(s) left of "${product.name}" (reorder level: ${inv.reorderLevel}).`;

        const alert = await createNotification(
          artisanUserId,
          title,
          message,
          NotificationType.SYSTEM_ALERT,
          product.id
        );
        createdAlerts.push(alert);
      }
    }
  }

  return createdAlerts;
};

