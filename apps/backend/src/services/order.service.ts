import { prisma } from '../config/prisma';
import { OrderStatus, PaymentStatus, ProductStatus, StockStatus, NotificationType } from '@prisma/client';
import { defaultPaymentProvider } from './payment/mockPayment.provider';
import { createNotification } from './notification.service';

export class OrderError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'OrderError';
    this.statusCode = statusCode;
  }
}

export interface CheckoutInput {
  buyerUserId: string;
  shippingAddress: string;
  paymentMethod: 'COD' | 'MOCK_ONLINE';
  notes?: string;
}

export const checkoutCart = async (input: CheckoutInput) => {
  const buyer = await prisma.buyer.findUnique({
    where: { userId: input.buyerUserId },
    include: {
      user: true,
      cart: {
        include: {
          items: {
            include: {
              product: {
                include: {
                  inventory: true,
                  seller: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!buyer) {
    throw new OrderError('Buyer profile not found', 404);
  }

  const cart = buyer.cart;
  if (!cart || cart.items.length === 0) {
    throw new OrderError('Cart is empty. Add products before checkout.', 400);
  }

  // Pre-validate stock and product status
  for (const item of cart.items) {
    const product = item.product;
    if (!product || product.status !== ProductStatus.PUBLISHED) {
      throw new OrderError(`Product "${product?.name || item.productId}" is no longer available.`, 400);
    }
    const inventory = product.inventory;
    if (!inventory || inventory.availableQuantity < item.quantity) {
      throw new OrderError(
        `Insufficient stock for "${product.name}". Available: ${inventory?.availableQuantity ?? 0}, Requested: ${item.quantity}`,
        400
      );
    }
  }

  // Group cart items by sellerId (multi-seller order splitting)
  const itemsBySeller: Record<string, typeof cart.items> = {};
  for (const item of cart.items) {
    const sellerId = item.product.sellerId;
    if (!itemsBySeller[sellerId]) {
      itemsBySeller[sellerId] = [];
    }
    itemsBySeller[sellerId].push(item);
  }

  const checkoutReference = `CHK-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  // Execute checkout in single atomic transaction
  const result = await prisma.$transaction(async (tx) => {
    const createdOrders = [];
    let grandTotal = 0;

    for (const [sellerId, sellerItems] of Object.entries(itemsBySeller)) {
      let subtotal = 0;
      let totalQuantity = 0;

      // Authoritative pricing: strictly using product.price from DB
      for (const item of sellerItems) {
        subtotal += item.product.price * item.quantity;
        totalQuantity += item.quantity;
      }

      const shippingCharge = 0.0;
      const totalAmount = subtotal + shippingCharge;
      grandTotal += totalAmount;

      const order = await tx.order.create({
        data: {
          checkoutReference,
          buyerId: buyer.id,
          sellerId,
          totalQuantity,
          subtotal,
          shippingCharge,
          totalAmount,
          paymentMethod: input.paymentMethod,
          paymentStatus: input.paymentMethod === 'MOCK_ONLINE' ? PaymentStatus.COMPLETED : PaymentStatus.PENDING,
          orderStatus: OrderStatus.CONFIRMED,
          shippingAddress: input.shippingAddress,
          notes: input.notes || null,
          items: {
            create: sellerItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.product.price,
              totalPrice: item.product.price * item.quantity,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  images: {
                    select: {
                      id: true,
                      processedPath: true,
                      originalPath: true,
                      isPrimary: true,
                    },
                  },
                },
              },
            },
          },
          seller: {
            select: {
              id: true,
              userId: true,
              businessName: true,
              craftType: true,
            },
          },
        },
      });

      // Process payment through payment provider
      const paymentResult = await defaultPaymentProvider.processPayment({
        orderId: order.id,
        amount: totalAmount,
        paymentMethod: input.paymentMethod,
      });

      // Create Payment record
      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          amount: totalAmount,
          paymentMethod: input.paymentMethod,
          paymentStatus: paymentResult.paymentStatus,
          transactionId: paymentResult.transactionId,
        },
      });

      // Decrement inventory atomically for each item
      for (const item of sellerItems) {
        const inv = item.product.inventory!;
        const newAvailable = inv.availableQuantity - item.quantity;
        const newSold = inv.soldQuantity + item.quantity;
        let newStockStatus: StockStatus = StockStatus.IN_STOCK;
        if (newAvailable <= 0) {
          newStockStatus = StockStatus.OUT_OF_STOCK;
        } else if (newAvailable <= inv.reorderLevel) {
          newStockStatus = StockStatus.LOW_STOCK;
        }

        await tx.inventory.update({
          where: { productId: item.productId },
          data: {
            availableQuantity: newAvailable,
            soldQuantity: newSold,
            stockStatus: newStockStatus,
          },
        });
      }

      // Update artisan total orders
      await tx.artisan.update({
        where: { id: sellerId },
        data: {
          totalOrders: { increment: 1 },
        },
      });

      createdOrders.push({
        ...order,
        payments: [payment],
      });
    }

    // Update buyer stats
    await tx.buyer.update({
      where: { id: buyer.id },
      data: {
        totalOrders: { increment: createdOrders.length },
        totalSpent: { increment: grandTotal },
      },
    });

    // Clear buyer's cart
    await tx.cartItem.deleteMany({
      where: { cartId: cart.id },
    });
    await tx.cart.update({
      where: { id: cart.id },
      data: {
        totalItems: 0,
        subtotal: 0.0,
      },
    });

    return {
      checkoutReference,
      orders: createdOrders,
      summary: {
        totalOrders: createdOrders.length,
        grandTotal,
        paymentMethod: input.paymentMethod,
        paymentStatus: input.paymentMethod === 'MOCK_ONLINE' ? PaymentStatus.COMPLETED : PaymentStatus.PENDING,
      },
    };
  });

  // Post-transaction notifications
  try {
    // Notify buyer
    await createNotification(
      buyer.userId,
      'Order Confirmed',
      `Your order (Ref: ${checkoutReference}) comprising ${result.orders.length} package(s) has been placed successfully!`,
      NotificationType.ORDER,
      result.orders[0]?.id
    );

    // Notify each artisan
    for (const order of result.orders) {
      if (order.seller?.userId) {
        await createNotification(
          order.seller.userId,
          'New Order Received',
          `You have received a new order #${order.id.slice(0, 8)} with ${order.totalQuantity} item(s). Total: ₹${order.totalAmount}`,
          NotificationType.ORDER,
          order.id
        );
      }
    }
  } catch (notifErr) {
    // Non-blocking notification failure
    console.error('Failed to send order notifications:', notifErr);
  }

  return result;
};

export const getBuyerOrders = async (
  buyerUserId: string,
  options?: { status?: OrderStatus; page?: number; limit?: number }
) => {
  const buyer = await prisma.buyer.findUnique({
    where: { userId: buyerUserId },
  });
  if (!buyer) {
    throw new OrderError('Buyer profile not found', 404);
  }

  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const skip = (page - 1) * limit;

  const where: any = { buyerId: buyer.id };
  if (options?.status) {
    where.orderStatus = options.status;
  }

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: {
        seller: {
          select: {
            id: true,
            businessName: true,
            craftType: true,
            rating: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                category: true,
                images: {
                  select: {
                    id: true,
                    processedPath: true,
                    originalPath: true,
                    isPrimary: true,
                  },
                },
              },
            },
          },
        },
        payments: true,
        reviews: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
  ]);

  return {
    orders,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getBuyerOrderDetails = async (buyerUserId: string, orderId: string) => {
  const buyer = await prisma.buyer.findUnique({
    where: { userId: buyerUserId },
  });
  if (!buyer) {
    throw new OrderError('Buyer profile not found', 404);
  }

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      buyerId: buyer.id,
    },
    include: {
      seller: {
        select: {
          id: true,
          businessName: true,
          craftType: true,
          rating: true,
          district: true,
          state: true,
        },
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              category: true,
              description: true,
              images: {
                select: {
                  id: true,
                  processedPath: true,
                  originalPath: true,
                  isPrimary: true,
                },
              },
            },
          },
        },
      },
      payments: true,
      reviews: true,
    },
  });

  if (!order) {
    throw new OrderError('Order not found', 404);
  }

  return order;
};

export const cancelBuyerOrder = async (buyerUserId: string, orderId: string, reason?: string) => {
  const buyer = await prisma.buyer.findUnique({
    where: { userId: buyerUserId },
  });
  if (!buyer) {
    throw new OrderError('Buyer profile not found', 404);
  }

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      buyerId: buyer.id,
    },
    include: {
      items: true,
      payments: true,
      seller: {
        select: {
          id: true,
          userId: true,
        },
      },
    },
  });

  if (!order) {
    throw new OrderError('Order not found', 404);
  }

  if (order.orderStatus !== OrderStatus.CONFIRMED && order.orderStatus !== OrderStatus.PROCESSING) {
    throw new OrderError(
      `Cannot cancel order in ${order.orderStatus} status. Only CONFIRMED or PROCESSING orders can be cancelled.`,
      400
    );
  }

  const updatedOrder = await prisma.$transaction(async (tx) => {
    // If online payment was completed, mock refund
    let paymentStatus = order.paymentStatus;
    if (order.paymentStatus === PaymentStatus.COMPLETED) {
      paymentStatus = PaymentStatus.REFUNDED;
      for (const p of order.payments) {
        if (p.paymentStatus === PaymentStatus.COMPLETED) {
          await tx.payment.update({
            where: { id: p.id },
            data: { paymentStatus: PaymentStatus.REFUNDED },
          });
          await defaultPaymentProvider.refundPayment({
            paymentId: p.id,
            amount: p.amount,
            reason: reason || 'Customer cancelled order',
          });
        }
      }
    }

    // Restore inventory
    for (const item of order.items) {
      const inv = await tx.inventory.findUnique({
        where: { productId: item.productId },
      });
      if (inv) {
        const newAvailable = inv.availableQuantity + item.quantity;
        const newSold = Math.max(0, inv.soldQuantity - item.quantity);
        let newStockStatus: StockStatus = StockStatus.IN_STOCK;
        if (newAvailable <= 0) {
          newStockStatus = StockStatus.OUT_OF_STOCK;
        } else if (newAvailable <= inv.reorderLevel) {
          newStockStatus = StockStatus.LOW_STOCK;
        }

        await tx.inventory.update({
          where: { productId: item.productId },
          data: {
            availableQuantity: newAvailable,
            soldQuantity: newSold,
            stockStatus: newStockStatus,
          },
        });
      }
    }

    // Update order status
    return tx.order.update({
      where: { id: orderId },
      data: {
        orderStatus: OrderStatus.CANCELLED,
        paymentStatus,
        notes: reason ? `${order.notes ? order.notes + ' | ' : ''}Cancellation reason: ${reason}` : order.notes,
      },
      include: {
        items: true,
        payments: true,
      },
    });
  });

  // Notify artisan
  if (order.seller?.userId) {
    try {
      await createNotification(
        order.seller.userId,
        'Order Cancelled by Buyer',
        `Order #${order.id.slice(0, 8)} was cancelled by buyer.${reason ? ` Reason: ${reason}` : ''}`,
        NotificationType.ORDER,
        order.id
      );
    } catch (err) {
      console.error('Failed to notify artisan of cancellation:', err);
    }
  }

  return updatedOrder;
};

export const getArtisanOrders = async (
  artisanUserId: string,
  options?: { status?: OrderStatus; page?: number; limit?: number }
) => {
  const artisan = await prisma.artisan.findUnique({
    where: { userId: artisanUserId },
  });
  if (!artisan) {
    throw new OrderError('Artisan profile not found', 404);
  }

  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const skip = (page - 1) * limit;

  const where: any = { sellerId: artisan.id };
  if (options?.status) {
    where.orderStatus = options.status;
  }

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: {
        buyer: {
          select: {
            id: true,
            companyName: true,
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                category: true,
                images: {
                  select: {
                    id: true,
                    processedPath: true,
                    originalPath: true,
                    isPrimary: true,
                  },
                },
              },
            },
          },
        },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
  ]);

  return {
    orders,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getArtisanOrderDetails = async (artisanUserId: string, orderId: string) => {
  const artisan = await prisma.artisan.findUnique({
    where: { userId: artisanUserId },
  });
  if (!artisan) {
    throw new OrderError('Artisan profile not found', 404);
  }

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      sellerId: artisan.id,
    },
    include: {
      buyer: {
        select: {
          id: true,
          companyName: true,
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              category: true,
              images: {
                select: {
                  id: true,
                  processedPath: true,
                  originalPath: true,
                  isPrimary: true,
                },
              },
            },
          },
        },
      },
      payments: true,
      reviews: true,
    },
  });

  if (!order) {
    throw new OrderError('Order not found or does not belong to your shop', 404);
  }

  return order;
};

export const updateOrderStatusByArtisan = async (
  artisanUserId: string,
  orderId: string,
  input: {
    status: 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
    trackingNumber?: string;
    notes?: string;
  }
) => {
  const artisan = await prisma.artisan.findUnique({
    where: { userId: artisanUserId },
  });
  if (!artisan) {
    throw new OrderError('Artisan profile not found', 404);
  }

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      sellerId: artisan.id,
    },
    include: {
      buyer: {
        select: {
          id: true,
          userId: true,
        },
      },
      items: true,
      payments: true,
    },
  });

  if (!order) {
    throw new OrderError('Order not found or does not belong to your shop', 404);
  }

  // Validate state transitions
  const currentStatus = order.orderStatus;
  const targetStatus = input.status as OrderStatus;

  const validTransitions: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
    [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
    [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
    [OrderStatus.DELIVERED]: [],
    [OrderStatus.CANCELLED]: [],
    [OrderStatus.RETURNED]: [],
  };

  const allowedNext = validTransitions[currentStatus] || [];
  if (!allowedNext.includes(targetStatus)) {
    throw new OrderError(
      `Invalid order status transition from ${currentStatus} to ${targetStatus}.`,
      400
    );
  }

  const updatedOrder = await prisma.$transaction(async (tx) => {
    let paymentStatus = order.paymentStatus;

    // If delivered and paymentMethod was COD, mark payment as COMPLETED
    if (targetStatus === OrderStatus.DELIVERED && order.paymentMethod === 'COD') {
      paymentStatus = PaymentStatus.COMPLETED;
      await tx.payment.updateMany({
        where: { orderId: order.id },
        data: { paymentStatus: PaymentStatus.COMPLETED },
      });
    }

    // If artisan cancelled, restore inventory
    if (targetStatus === OrderStatus.CANCELLED) {
      if (order.paymentStatus === PaymentStatus.COMPLETED) {
        paymentStatus = PaymentStatus.REFUNDED;
        await tx.payment.updateMany({
          where: { orderId: order.id },
          data: { paymentStatus: PaymentStatus.REFUNDED },
        });
      }
      for (const item of order.items) {
        const inv = await tx.inventory.findUnique({
          where: { productId: item.productId },
        });
        if (inv) {
          const newAvailable = inv.availableQuantity + item.quantity;
          const newSold = Math.max(0, inv.soldQuantity - item.quantity);
          let newStockStatus: StockStatus = StockStatus.IN_STOCK;
          if (newAvailable <= 0) {
            newStockStatus = StockStatus.OUT_OF_STOCK;
          } else if (newAvailable <= inv.reorderLevel) {
            newStockStatus = StockStatus.LOW_STOCK;
          }

          await tx.inventory.update({
            where: { productId: item.productId },
            data: {
              availableQuantity: newAvailable,
              soldQuantity: newSold,
              stockStatus: newStockStatus,
            },
          });
        }
      }
    }

    return tx.order.update({
      where: { id: orderId },
      data: {
        orderStatus: targetStatus,
        paymentStatus,
        trackingNumber: input.trackingNumber || order.trackingNumber,
        notes: input.notes ? `${order.notes ? order.notes + ' | ' : ''}${input.notes}` : order.notes,
      },
      include: {
        items: true,
        payments: true,
      },
    });
  });

  // Notify buyer of status update
  if (order.buyer?.userId) {
    try {
      await createNotification(
        order.buyer.userId,
        `Order ${targetStatus}`,
        `Your order #${order.id.slice(0, 8)} status has been updated to ${targetStatus}.${
          input.trackingNumber ? ` Tracking Number: ${input.trackingNumber}` : ''
        }`,
        NotificationType.ORDER,
        order.id
      );
    } catch (err) {
      console.error('Failed to notify buyer of order update:', err);
    }
  }

  return updatedOrder;
};
